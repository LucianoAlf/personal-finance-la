/**
 * EDGE FUNCTION: detect-spending-anomalies
 * Detects unusual spending patterns by comparing new transactions against historical averages.
 * Can be triggered after transaction registration or via pg_cron.
 *
 * Algorithm: if a transaction exceeds mean + 2*stdDev for its category (last 90 days),
 * send a WhatsApp alert.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logAgentAction } from '../_shared/agent-memory.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AnomalyCheckRequest {
  user_id: string;
  transaction_id?: string;
  amount?: number;
  category?: string;
}

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: AnomalyCheckRequest = await req.json();

    if (!body.user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Check if anomaly alerts are enabled
    const { data: identity } = await supabase
      .from('agent_identity')
      .select('notification_preferences')
      .eq('user_id', body.user_id)
      .maybeSingle();

    if (identity?.notification_preferences?.anomaly_alerts === false) {
      return new Response(
        JSON.stringify({ message: 'Anomaly alerts disabled', anomaly: null }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    let transactionToCheck: { amount: number; category: string } | null = null;

    if (body.transaction_id) {
      const { data: txn } = await supabase
        .from('transactions')
        .select('amount, category, type')
        .eq('id', body.transaction_id)
        .eq('user_id', body.user_id)
        .single();

      if (txn && txn.type === 'expense') {
        transactionToCheck = {
          amount: Number(txn.amount),
          category: txn.category || 'sem_categoria',
        };
      }
    } else if (body.amount && body.category) {
      transactionToCheck = {
        amount: body.amount,
        category: body.category,
      };
    }

    if (!transactionToCheck) {
      return new Response(
        JSON.stringify({ message: 'No expense to check', anomaly: null }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const anomaly = await checkSpendingAnomaly(
      supabase,
      body.user_id,
      transactionToCheck.category,
      transactionToCheck.amount,
    );

    if (anomaly) {
      await logAgentAction(supabase, body.user_id, 'spending_anomaly_detected', {
        category: transactionToCheck.category,
        amount: transactionToCheck.amount,
        mean: anomaly.mean,
        stdDev: anomaly.stdDev,
        threshold: anomaly.threshold,
      });

      try {
        await sendAnomalyAlert(supabase, body.user_id, anomaly);
      } catch (sendErr) {
        console.error('[anomaly] Failed to send WhatsApp alert:', sendErr);
      }
    }

    return new Response(
      JSON.stringify({ anomaly }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[anomaly] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

interface AnomalyResult {
  category: string;
  amount: number;
  mean: number;
  stdDev: number;
  threshold: number;
  percentAbove: number;
}

async function checkSpendingAnomaly(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  category: string,
  amount: number,
): Promise<AnomalyResult | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const sinceStr = ninetyDaysAgo.toISOString().split('T')[0];

  const { data: history } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category', category)
    .gte('date', sinceStr);

  if (!history || history.length < 5) return null;

  const amounts = history.map((t: { amount: number }) => Number(t.amount));
  const mean = amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length;
  const variance =
    amounts.reduce((s: number, a: number) => s + (a - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return null;

  const threshold = mean + 2 * stdDev;

  if (amount > threshold) {
    const percentAbove = Math.round(((amount - mean) / mean) * 100);
    return {
      category,
      amount,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      threshold: Math.round(threshold * 100) / 100,
      percentAbove,
    };
  }

  return null;
}

async function sendAnomalyAlert(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  anomaly: AnomalyResult,
): Promise<void> {
  const { data: conn } = await supabase
    .from('whatsapp_connections')
    .select('phone_number, instance_token')
    .eq('user_id', userId)
    .eq('connected', true)
    .single();

  if (!conn) return;

  const message = `⚠️ *Alerta de gasto fora do padrão*

Categoria: *${anomaly.category}*
Valor: R$ ${anomaly.amount.toFixed(2).replace('.', ',')}
Média (90 dias): R$ ${anomaly.mean.toFixed(2).replace('.', ',')}
*${anomaly.percentAbove}% acima da média*

Quer revisar seus gastos nessa categoria?

_Ana Clara 🙋🏻‍♀️_`;

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

  if (!UAZAPI_TOKEN?.trim()) return;

  await fetch(`${UAZAPI_BASE_URL}/send/text`, {
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
}
