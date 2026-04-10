/**
 * EDGE FUNCTION: send-morning-briefing
 * Sends personalized morning briefings via WhatsApp.
 * Combines: agenda, bills due, account balances, goal progress, and recent memories.
 * Triggered via pg_cron daily at 08:00 BRT.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildDayContext } from '../_shared/day-context-builder.ts';

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
    console.log('[morning-briefing] Starting morning briefing...');

    const { data: users, error: usersError } = await supabase
      .from('whatsapp_connections')
      .select('user_id, phone_number, instance_token')
      .eq('connected', true)
      .eq('status', 'connected');

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active users', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    for (const conn of users) {
      try {
        // Check if user has morning briefing enabled
        const { data: identity } = await supabase
          .from('agent_identity')
          .select('notification_preferences')
          .eq('user_id', conn.user_id)
          .maybeSingle();

        const prefs = identity?.notification_preferences;
        if (prefs && prefs.morning_briefing === 'off') {
          console.log(`[morning-briefing] Skipping ${conn.user_id} (disabled)`);
          continue;
        }

        const briefing = await buildBriefingMessage(supabase, conn.user_id);
        if (!briefing) continue;

        await sendWhatsAppMessage(conn, briefing);
        sent++;
        console.log(`[morning-briefing] Sent to ${conn.phone_number}`);
      } catch (userErr) {
        console.error(
          `[morning-briefing] Failed for ${conn.user_id}:`,
          userErr,
        );
      }
    }

    return new Response(
      JSON.stringify({ message: `Briefings sent: ${sent}/${users.length}`, sent }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[morning-briefing] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

async function buildBriefingMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const today = new Date();
  const dayContext = await buildDayContext(supabase, userId, today);

  // Account balances
  let saldoSection = '';
  try {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('name, balance, type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');

    if (accounts && accounts.length > 0) {
      const totalBalance = accounts.reduce(
        (sum: number, a: { balance: number }) => sum + Number(a.balance),
        0,
      );
      const accountLines = accounts
        .map(
          (a: { name: string; balance: number }) =>
            `  - ${a.name}: R$ ${Number(a.balance).toFixed(2).replace('.', ',')}`,
        )
        .join('\n');
      saldoSection = `\n\n💰 *Saldos*\n${accountLines}\n  *Total: R$ ${totalBalance.toFixed(2).replace('.', ',')}*`;
    }
  } catch {
    // non-critical
  }

  // Pending goals
  let goalsSection = '';
  try {
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(3);

    if (goals && goals.length > 0) {
      const goalLines = goals
        .map((g: { name: string; target_amount: number; current_amount: number }) => {
          const pct = Math.round(
            (Number(g.current_amount) / Number(g.target_amount)) * 100,
          );
          return `  - ${g.name}: ${pct}%`;
        })
        .join('\n');
      goalsSection = `\n\n🎯 *Metas*\n${goalLines}`;
    }
  } catch {
    // non-critical
  }

  // Yesterday's spending
  let yesterdaySection = '';
  try {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('date', yStr)
      .lt('date', today.toISOString().split('T')[0]);

    if (txns && txns.length > 0) {
      const spent = txns
        .filter((t: { type: string }) => t.type === 'expense')
        .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
      if (spent > 0) {
        yesterdaySection = `\n\n📊 *Ontem*: R$ ${spent.toFixed(2).replace('.', ',')} em gastos (${txns.filter((t: { type: string }) => t.type === 'expense').length} transações)`;
      }
    }
  } catch {
    // non-critical
  }

  // Assemble
  const dayName = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  let message = `☀️ *Bom dia!* Hoje é ${dayName}.\n\n_Seu briefing financeiro:_`;

  if (dayContext.items.length > 0) {
    const bills = dayContext.items.filter((i) => i.type === 'bill');
    const events = dayContext.items.filter((i) => i.type === 'event');

    if (bills.length > 0) {
      const totalBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
      message += `\n\n📋 *Contas pendentes: ${bills.length}* (R$ ${totalBills.toFixed(2).replace('.', ',')})`;
      for (const bill of bills.slice(0, 5)) {
        message += `\n  - ${bill.label}${bill.amount ? ` — R$ ${bill.amount.toFixed(2).replace('.', ',')}` : ''}`;
      }
      if (bills.length > 5) message += `\n  _...e mais ${bills.length - 5}_`;
    }

    if (events.length > 0) {
      message += `\n\n📅 *Eventos: ${events.length}*`;
      for (const ev of events.slice(0, 3)) {
        message += `\n  - ${ev.time ? `${ev.time} — ` : ''}${ev.label}`;
      }
    }
  } else {
    message += '\n\n✅ Nenhuma pendência para hoje!';
  }

  message += saldoSection;
  message += goalsSection;
  message += yesterdaySection;
  message += '\n\n_Ana Clara 🙋🏻‍♀️ • Seu copiloto financeiro_';

  return message;
}

async function sendWhatsAppMessage(
  conn: { phone_number: string; instance_token?: string },
  message: string,
): Promise<void> {
  const UAZAPI_BASE_URL = (
    Deno.env.get('UAZAPI_BASE_URL') ||
    Deno.env.get('UAZAPI_SERVER_URL') ||
    'https://api.uazapi.com'
  ).replace(/\/$/, '');

  const UAZAPI_TOKEN =
    conn.instance_token ||
    Deno.env.get('UAZAPI_INSTANCE_TOKEN') ||
    Deno.env.get('UAZAPI_TOKEN') ||
    Deno.env.get('UAZAPI_API_KEY');

  if (!UAZAPI_TOKEN?.trim()) {
    throw new Error('UAZAPI token not available');
  }

  const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: UAZAPI_TOKEN,
    },
    body: JSON.stringify({
      number: conn.phone_number,
      text: message,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`UAZAPI error ${response.status}: ${errText}`);
  }
}
