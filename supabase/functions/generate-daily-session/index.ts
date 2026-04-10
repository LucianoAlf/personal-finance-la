/**
 * EDGE FUNCTION: generate-daily-session
 * Generates end-of-day financial snapshots and session reflections.
 * Equivalent to OpenClaw's daily session files (memory/sessions/YYYY-MM-DD.md).
 *
 * Triggered via pg_cron at 21:00 BRT (after user's workday).
 * Summarizes: transactions, decisions made, highlights, pending items.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
      },
    });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    if (expectedSecret && cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split('T')[0];

    console.log(`[daily-session] Generating sessions for ${today}...`);

    // Get all active users
    const { data: users } = await supabase
      .from('whatsapp_connections')
      .select('user_id')
      .eq('connected', true)
      .eq('status', 'connected');

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active users', generated: 0 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    let generated = 0;
    for (const u of users) {
      try {
        // Skip if session already exists for today
        const { data: existing } = await supabase
          .from('agent_daily_sessions')
          .select('id')
          .eq('user_id', u.user_id)
          .eq('session_date', today)
          .maybeSingle();

        if (existing) continue;

        const session = await buildDailySession(supabase, u.user_id, today);
        if (!session) continue;

        await supabase.from('agent_daily_sessions').insert(session);
        generated++;
        console.log(`[daily-session] Generated for user ${u.user_id}`);
      } catch (userErr) {
        console.error(`[daily-session] Failed for ${u.user_id}:`, userErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sessions generated: ${generated}/${users.length}`,
        generated,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[daily-session] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

async function buildDailySession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  dateStr: string,
): Promise<Record<string, unknown> | null> {
  // 1. Today's transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, category, description, account_id')
    .eq('user_id', userId)
    .gte('date', `${dateStr}T00:00:00`)
    .lt('date', `${dateStr}T23:59:59`);

  // 2. Today's agent actions
  const { data: actions } = await supabase
    .from('agent_action_log')
    .select('action_type, details, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${dateStr}T00:00:00`)
    .lt('created_at', `${dateStr}T23:59:59`)
    .order('created_at');

  // 3. Bills paid today
  const { data: paidBills } = await supabase
    .from('payable_bills')
    .select('name, amount, paid_amount')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('paid_at', `${dateStr}T00:00:00`)
    .lt('paid_at', `${dateStr}T23:59:59`);

  // 4. Current account balances
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Build summary
  const expenses = (transactions || []).filter(
    (t: { type: string }) => t.type === 'expense',
  );
  const income = (transactions || []).filter(
    (t: { type: string }) => t.type === 'income',
  );
  const totalExpenses = expenses.reduce(
    (s: number, t: { amount: number }) => s + Number(t.amount),
    0,
  );
  const totalIncome = income.reduce(
    (s: number, t: { amount: number }) => s + Number(t.amount),
    0,
  );

  const highlights: string[] = [];
  if (totalExpenses > 0)
    highlights.push(
      `Gastou R$ ${totalExpenses.toFixed(2)} em ${expenses.length} transações`,
    );
  if (totalIncome > 0)
    highlights.push(
      `Recebeu R$ ${totalIncome.toFixed(2)} em ${income.length} transações`,
    );
  if (paidBills && paidBills.length > 0)
    highlights.push(`Pagou ${paidBills.length} contas`);

  // Extract decisions from agent action logs
  const decisions = (actions || [])
    .filter(
      (a: { action_type: string }) =>
        a.action_type === 'autonomy_evaluation' ||
        a.action_type === 'challenge_issued',
    )
    .map((a: { action_type: string; details: Record<string, unknown> }) => ({
      type: a.action_type,
      ...a.details,
    }));

  // Pending: bills due tomorrow
  const tomorrow = new Date(dateStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: tomorrowBills } = await supabase
    .from('payable_bills')
    .select('name, amount')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .eq('due_date', tomorrowStr);

  const pending = (tomorrowBills || []).map(
    (b: { name: string; amount: number }) =>
      `Pagar: ${b.name} (R$ ${Number(b.amount).toFixed(2)})`,
  );

  const totalBalance = (accounts || []).reduce(
    (s: number, a: { balance: number }) => s + Number(a.balance),
    0,
  );

  const summary =
    highlights.length > 0
      ? highlights.join('. ') + '.'
      : 'Dia tranquilo — sem movimentações registradas.';

  // Category breakdown for expenses
  const categoryBreakdown: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = (exp as { category?: string }).category || 'sem_categoria';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number((exp as { amount: number }).amount);
  }

  return {
    user_id: userId,
    session_date: dateStr,
    summary,
    highlights,
    decisions_made: decisions,
    pending_items: pending,
    financial_snapshot: {
      total_expenses: totalExpenses,
      total_income: totalIncome,
      net: totalIncome - totalExpenses,
      total_balance: totalBalance,
      transactions_count: (transactions || []).length,
      bills_paid: (paidBills || []).length,
      category_breakdown: categoryBreakdown,
    },
  };
}
