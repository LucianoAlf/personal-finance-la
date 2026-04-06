import { getSupabase } from './utils.ts';

interface GoalContributionResult {
  handled: boolean;
  success: boolean;
  message: string;
}

interface GoalRow {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  target_date?: string | null;
  deadline?: string | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBrazilianAmount(text: string): number | null {
  const match = text.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)/i);
  if (!match) return null;

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractGoalName(text: string): string | null {
  const patterns = [
    /(?:pra|para|na|no)\s+meta(?:\s+de|\s+da|\s+do)?\s+(.+)$/i,
    /meta(?:\s+de|\s+da|\s+do)?\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const cleaned = match[1]
      .replace(/\b(hoje|agora|aqui|mesmo|tal|etc)\b/gi, '')
      .replace(/\be\s+tal\b/gi, '')
      .replace(/[.!?]+$/g, '')
      .trim();

    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  return null;
}

function findMatchingGoal(goals: GoalRow[], requestedName: string | null): GoalRow | null {
  if (goals.length === 0) return null;
  if (!requestedName) return goals.length === 1 ? goals[0] : null;

  const requested = normalizeText(requestedName);
  if (!requested) return goals.length === 1 ? goals[0] : null;

  const ranked = goals
    .map((goal) => {
      const normalizedName = normalizeText(goal.name);
      const exact = normalizedName === requested;
      const contains = normalizedName.includes(requested) || requested.includes(normalizedName);
      const score = exact ? 3 : contains ? 2 : requested.split(' ').filter((token) => normalizedName.includes(token)).length;
      return { goal, score, normalizedName };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.normalizedName.length - b.normalizedName.length);

  return ranked[0]?.goal || null;
}

export function shouldHandleGoalContributionMessage(text: string, suggestedAmount?: number): boolean {
  const normalized = normalizeText(text);
  const hasGoalWord = /\bmeta\b/.test(normalized);
  const hasContributionVerb = /\b(transferi|transfiri|aportei|adicionei|coloquei|guardei|depositei|reservei|separei|juntei)\b/.test(normalized);
  const amount = suggestedAmount && suggestedAmount > 0 ? suggestedAmount : parseBrazilianAmount(text);

  return hasGoalWord && hasContributionVerb && Boolean(amount);
}

export async function processarAporteMetaViaMensagem(
  userId: string,
  text: string,
  suggestedAmount?: number
): Promise<GoalContributionResult> {
  const amount = suggestedAmount && suggestedAmount > 0 ? suggestedAmount : parseBrazilianAmount(text);

  if (!amount) {
    return {
      handled: false,
      success: false,
      message: '',
    };
  }

  const supabase = getSupabase();
  const { data: goals, error: goalsError } = await supabase
    .from('financial_goals')
    .select('id, name, current_amount, target_amount, target_date, deadline')
    .eq('user_id', userId)
    .eq('goal_type', 'savings')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (goalsError) {
    console.error('[GOAL-CONTRIBUTION] Erro ao buscar metas:', goalsError);
    return {
      handled: true,
      success: false,
      message: 'Tive um problema para localizar suas metas agora. Tenta de novo em instantes.',
    };
  }

  const activeGoals = (goals || []) as GoalRow[];
  if (activeGoals.length === 0) {
    return {
      handled: true,
      success: false,
      message: 'Você ainda não tem metas de economia ativas no app.',
    };
  }

  const goalName = extractGoalName(text);
  const matchedGoal = findMatchingGoal(activeGoals, goalName);

  if (!matchedGoal) {
    return {
      handled: true,
      success: false,
      message: goalName
        ? `Não encontrei uma meta de economia chamada "${goalName}". Me fala o nome certinho da meta para eu registrar o aporte.`
        : 'Entendi o aporte, mas preciso saber em qual meta registrar. Me diz algo como "adicione 500 na meta viagem europa".',
    };
  }

  const contributionDate = new Date().toISOString().split('T')[0];
  const { error: insertError } = await supabase
    .from('financial_goal_contributions')
    .insert({
      user_id: userId,
      goal_id: matchedGoal.id,
      amount,
      date: contributionDate,
      note: 'Aporte registrado via WhatsApp',
    });

  if (insertError) {
    console.error('[GOAL-CONTRIBUTION] Erro ao inserir aporte:', insertError);
    return {
      handled: true,
      success: false,
      message: 'Não consegui registrar esse aporte agora. Tenta novamente em instantes.',
    };
  }

  const { data: refreshedGoal, error: refreshedGoalError } = await supabase
    .from('financial_goals')
    .select('name, current_amount, target_amount, target_date, deadline')
    .eq('id', matchedGoal.id)
    .single();

  if (refreshedGoalError || !refreshedGoal) {
    console.error('[GOAL-CONTRIBUTION] Erro ao recarregar meta:', refreshedGoalError);
    return {
      handled: true,
      success: true,
      message: `Aporte de R$ ${amount.toFixed(2)} registrado na meta ${matchedGoal.name}.`,
    };
  }

  const currentAmount = Number(refreshedGoal.current_amount || 0);
  const targetAmount = Number(refreshedGoal.target_amount || 0);
  const percentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  const remaining = Math.max(0, targetAmount - currentAmount);
  const deadline = refreshedGoal.target_date || refreshedGoal.deadline;

  const deadlineText = deadline
    ? `\n📅 Prazo: ${new Date(`${deadline}T12:00:00`).toLocaleDateString('pt-BR')}`
    : '';

  return {
    handled: true,
    success: true,
    message:
      `Perfeito! Registrei um aporte de R$ ${amount.toFixed(2)} na meta *${refreshedGoal.name}*.\n\n` +
      `💰 Acumulado: R$ ${currentAmount.toFixed(2)}\n` +
      `🎯 Objetivo: R$ ${targetAmount.toFixed(2)}\n` +
      `📈 Progresso: ${percentage.toFixed(1)}%\n` +
      `🧩 Falta: R$ ${remaining.toFixed(2)}` +
      deadlineText,
  };
}
