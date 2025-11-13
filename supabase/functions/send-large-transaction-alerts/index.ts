/**
 * EDGE FUNCTION: send-large-transaction-alerts
 * Envia alertas imediatamente quando transação > threshold
 * Triggered por database trigger ou via POST
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TransactionPayload {
  transaction_id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    console.log('[send-large-transaction-alerts] 🚀 Iniciando...');
    
    const payload: TransactionPayload = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verificar se usuário tem alertas ativados
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('large_transaction_threshold, large_transaction_alerts_enabled, whatsapp_enabled')
      .eq('user_id', payload.user_id)
      .single();

    if (prefError || !preferences) {
      console.log('[send-large-transaction-alerts] ⚠️ Preferências não encontradas');
      return new Response(
        JSON.stringify({ message: 'Preferências não encontradas' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!preferences.large_transaction_alerts_enabled || !preferences.whatsapp_enabled) {
      console.log('[send-large-transaction-alerts] ⏸️ Alertas desabilitados');
      return new Response(
        JSON.stringify({ message: 'Alertas desabilitados' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const threshold = preferences.large_transaction_threshold || 1000;
    const amount = Math.abs(payload.amount);

    // Verificar se transação excede threshold
    if (amount < threshold) {
      console.log(`[send-large-transaction-alerts] ⏸️ Valor R$ ${amount} < R$ ${threshold}`);
      return new Response(
        JSON.stringify({ message: 'Valor abaixo do threshold' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar telefone do usuário
    const { data: user } = await supabase
      .from('users')
      .select('phone, full_name')
      .eq('id', payload.user_id)
      .single();

    if (!user?.phone) {
      console.log('[send-large-transaction-alerts] ⚠️ Telefone não encontrado');
      return new Response(
        JSON.stringify({ message: 'Telefone não configurado' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enviar alerta
    const message = formatLargeTransactionMessage(payload, threshold, user.full_name);
    
    const sent = await sendWhatsAppNotification(
      supabase,
      payload.user_id,
      user.phone,
      message
    );

    if (sent) {
      console.log(`[send-large-transaction-alerts] ✅ Alerta enviado para ${user.phone}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Alerta enviado',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Falha ao enviar notificação');
    }

  } catch (error) {
    console.error('[send-large-transaction-alerts] ❌ Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function formatLargeTransactionMessage(
  transaction: TransactionPayload,
  threshold: number,
  fullName: string
): string {
  const amount = Math.abs(transaction.amount);
  
  let message = `⚠️ *TRANSAÇÃO GRANDE DETECTADA*\n\n`;
  message += `Olá ${fullName}! 👋\n\n`;
  message += `Uma transação acima do limite foi registrada:\n\n`;
  message += `💸 *Valor:* R$ ${amount.toFixed(2)}\n`;
  message += `📝 *Descrição:* ${transaction.description}\n`;
  message += `🏷️ *Categoria:* ${transaction.category}\n`;
  message += `📅 *Data:* ${new Date(transaction.date).toLocaleDateString('pt-BR')}\n\n`;
  message += `⚡ *Seu limite configurado:* R$ ${threshold.toFixed(2)}\n\n`;
  message += `🔍 _Verifique se esta transação está correta!_`;

  return message;
}

async function sendWhatsAppNotification(
  supabase: any,
  userId: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://api.uazapi.com';
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_INSTANCE_TOKEN');

    const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN!,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!response.ok) {
      console.error('[sendWhatsAppNotification] Erro UAZAPI:', response.status);
      return false;
    }

    console.log(`[sendWhatsAppNotification] ✅ Enviado para ${phone}`);
    return true;
  } catch (error) {
    console.error('[sendWhatsAppNotification] ❌ Falha:', error);
    return false;
  }
}
