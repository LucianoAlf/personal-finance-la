/**
 * Challenge Engine — decides when Ana Clara should "push back" on spending.
 * Like Alfredo: "Can and should disagree. An assistant that agrees with everything is useless."
 *
 * Triggers when:
 * - A spending goal is at 80%+ and user registers expense in that category
 * - Bill payment would overdraft an account
 * - Recurring pattern of overspending in a category
 *
 * Limits: one challenge per conversation session to avoid annoyance.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface ChallengeResult {
  shouldChallenge: boolean;
  type?: 'goal_at_risk' | 'overdraft_risk' | 'pattern_alert';
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export async function evaluateChallenge(
  supabase: SupabaseClient,
  userId: string,
  intent: string,
  amount?: number,
  category?: string,
): Promise<ChallengeResult> {
  const noChallenge: ChallengeResult = { shouldChallenge: false };

  // Only challenge spending-related intents
  const spendingIntents = [
    'REGISTRAR_DESPESA',
    'COMPRA_CARTAO',
    'MARCAR_CONTA_PAGA',
  ];
  if (!spendingIntents.includes(intent)) return noChallenge;
  if (!amount || amount <= 0) return noChallenge;

  // Check if already challenged this session (limit: 1 per session)
  try {
    const thirtyMinAgo = new Date();
    thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);

    const { data: recentChallenges } = await supabase
      .from('agent_action_log')
      .select('id')
      .eq('user_id', userId)
      .eq('action_type', 'challenge_issued')
      .gte('created_at', thirtyMinAgo.toISOString())
      .limit(1);

    if (recentChallenges && recentChallenges.length > 0) {
      return noChallenge;
    }
  } catch {
    return noChallenge;
  }

  // Check 1: Spending goal at risk
  if (category) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: goals } = await supabase
        .from('spending_goals')
        .select('id, name, category, limit_amount, current_amount')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('category', category);

      if (goals && goals.length > 0) {
        for (const goal of goals) {
          const currentSpent = Number(goal.current_amount) || 0;
          const limit = Number(goal.limit_amount) || 0;
          if (limit <= 0) continue;

          const afterSpend = currentSpent + amount;
          const pctAfter = (afterSpend / limit) * 100;

          if (pctAfter >= 100) {
            return {
              shouldChallenge: true,
              type: 'goal_at_risk',
              severity: 'critical',
              message: `Ei, espera — com esse gasto de R$ ${amount.toFixed(2).replace('.', ',')} em ${category}, você vai *estourar* a meta "${goal.name}" (${Math.round(pctAfter)}% do limite). Quer registrar mesmo assim?`,
            };
          }

          if (pctAfter >= 80) {
            return {
              shouldChallenge: true,
              type: 'goal_at_risk',
              severity: 'warning',
              message: `Atenção: esse gasto vai te colocar em ${Math.round(pctAfter)}% da meta "${goal.name}" pra ${category}. Ainda dentro, mas tá apertando. Confirma?`,
            };
          }
        }
      }
    } catch {
      // non-critical
    }
  }

  // Check 2: Account overdraft risk (for non-card expenses)
  if (intent === 'REGISTRAR_DESPESA') {
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('name, balance')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_default', true)
        .limit(1);

      if (accounts && accounts.length > 0) {
        const balance = Number(accounts[0].balance) || 0;
        if (balance - amount < 0) {
          return {
            shouldChallenge: true,
            type: 'overdraft_risk',
            severity: 'critical',
            message: `Esse gasto de R$ ${amount.toFixed(2).replace('.', ',')} vai deixar ${accounts[0].name} no negativo (saldo atual: R$ ${balance.toFixed(2).replace('.', ',')}). Quer registrar mesmo assim?`,
          };
        }
      }
    } catch {
      // non-critical
    }
  }

  return noChallenge;
}

export async function logChallengeIssued(
  supabase: SupabaseClient,
  userId: string,
  challenge: ChallengeResult,
  intent: string,
): Promise<void> {
  try {
    await supabase.from('agent_action_log').insert({
      user_id: userId,
      action_type: 'challenge_issued',
      details: {
        type: challenge.type,
        severity: challenge.severity,
        intent,
        message_preview: challenge.message?.slice(0, 100),
      },
    });
  } catch {
    // never block
  }
}
