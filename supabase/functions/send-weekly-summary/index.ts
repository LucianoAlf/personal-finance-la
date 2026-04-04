/**
 * EDGE FUNCTION: send-weekly-summary
 * Envia resumo semanal de transações (últimos 7 dias)
 * Respeita: weekly_summary_enabled, weekly_summary_time, weekly_summary_days_of_week
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret',
      },
    });
  }

  try {
    console.log('[send-weekly-summary] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Buscar usuários com resumo semanal ativado
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, weekly_summary_time, weekly_summary_days_of_week, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('weekly_summary_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-weekly-summary] ⚠️ Nenhum usuário com resumo semanal ativo');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-weekly-summary] 📱 ${users.length} usuários com resumo semanal ativo`);

    let totalSent = 0;

    for (const user of users) {
      // Verificar DND
      if (user.do_not_disturb_enabled) {
        const dndDays = user.do_not_disturb_days_of_week || [];
        const isDNDDay = dndDays.length === 0 || dndDays.includes(currentDay);
        
        if (isDNDDay) {
          const dndStart = user.do_not_disturb_start_time || '22:00';
          const dndEnd = user.do_not_disturb_end_time || '08:00';
          
          let isInDNDTime = false;
          if (dndStart < dndEnd) {
            isInDNDTime = currentTime >= dndStart || currentTime < dndEnd;
          } else {
            isInDNDTime = currentTime >= dndStart && currentTime < dndEnd;
          }

          if (isInDNDTime) {
            console.log(`[send-weekly-summary] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const summaryDays = user.weekly_summary_days_of_week || [0]; // Domingo padrão
      const summaryTime = user.weekly_summary_time || '18:00';

      // Verificar se hoje é dia de enviar
      if (!summaryDays.includes(currentDay)) {
        console.log(`[send-weekly-summary] ⏸️ Hoje (${currentDay}) não está nos dias configurados`);
        continue;
      }

      if (currentTime < summaryTime) {
        console.log(`[send-weekly-summary] ⏸️ Ainda não é hora (${currentTime} < ${summaryTime})`);
        continue;
      }

      // Últimos 7 dias
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date();
      weekEnd.setHours(23, 59, 59, 999);

      // Transações da semana
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', user.user_id)
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString());

      if (!transactions || transactions.length === 0) {
        console.log(`[send-weekly-summary] ⏸️ Sem transações na semana para ${user.user_id}`);
        continue;
      }

      // Calcular totais
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      const balance = income - expenses;

      // Semana anterior para comparação
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setMilliseconds(-1);

      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.user_id)
        .gte('date', prevWeekStart.toISOString())
        .lte('date', prevWeekEnd.toISOString());

      const prevExpenses = prevTransactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;

      const variation = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      // Enviar resumo
      const message = formatWeeklySummary(
        userdata.full_name,
        transactions.length,
        income,
        expenses,
        balance,
        variation
      );
      
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        userdata.phone,
        message
      );

      if (sent) totalSent++;
    }

    console.log(`[send-weekly-summary] ✅ Total enviado: ${totalSent} resumos`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-weekly-summary] ❌ Erro:', error);
    
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

function formatWeeklySummary(
  fullName: string,
  txCount: number,
  income: number,
  expenses: number,
  balance: number,
  variation: number
): string {
  const emoji = balance >= 0 ? '💰' : '📉';
  const varEmoji = variation < 0 ? '📈' : variation > 0 ? '📉' : '⚖️';
  const varText = variation < 0 ? 'menos' : variation > 0 ? 'mais' : 'igual';
  
  let message = `📊 *RESUMO SEMANAL*\n\n`;
  message += `Olá ${fullName}! 👋\n\n`;
  message += `Resumo dos últimos 7 dias:\n\n`;
  
  message += `💵 *Receitas:* R$ ${income.toFixed(2)}\n`;
  message += `💸 *Despesas:* R$ ${expenses.toFixed(2)}\n`;
  message += `${emoji} *Saldo:* R$ ${balance.toFixed(2)}\n\n`;
  
  message += `📋 *Transações:* ${txCount}\n\n`;
  
  if (variation !== 0) {
    message += `📊 *vs Semana passada:*\n`;
    message += `Você gastou ${Math.abs(variation).toFixed(1)}% ${varText} ${varEmoji}\n\n`;
  }
  
  if (balance < 0) {
    message += `⚠️ _Atenção aos gastos na próxima semana._\n`;
  } else if (balance > 0) {
    message += `✅ _Ótimo controle financeiro!_\n`;
  }
  
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
