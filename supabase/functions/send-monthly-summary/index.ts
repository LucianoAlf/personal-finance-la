/**
 * EDGE FUNCTION: send-monthly-summary
 * Envia resumo mensal de transações
 * Respeita: monthly_summary_enabled, monthly_summary_time, monthly_summary_days_of_month
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
    console.log('[send-monthly-summary] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const now = new Date();
    const currentDay = now.getDay();
    const dayOfMonth = now.getDate();
    const currentTime = now.toTimeString().slice(0, 5);

    // Buscar usuários com resumo mensal ativado
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, monthly_summary_time, monthly_summary_days_of_month, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('monthly_summary_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-monthly-summary] ⚠️ Nenhum usuário com resumo mensal ativo');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-monthly-summary] 📱 ${users.length} usuários com resumo mensal ativo`);

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
            console.log(`[send-monthly-summary] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const summaryDays = user.monthly_summary_days_of_month || [1]; // Dia 1 padrão
      const summaryTime = user.monthly_summary_time || '10:00';

      // Verificar se hoje é dia de enviar
      if (!summaryDays.includes(dayOfMonth)) {
        continue;
      }

      if (currentTime < summaryTime) {
        continue;
      }

      // Mês atual (completado no mês anterior)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      // Transações do mês
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', user.user_id)
        .gte('date', firstDay.toISOString())
        .lte('date', lastDay.toISOString());

      if (!transactions || transactions.length === 0) {
        console.log(`[send-monthly-summary] ⏸️ Sem transações no mês para ${user.user_id}`);
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

      // Top 5 categorias
      const categoryTotals = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const cat = t.category || 'Outros';
          acc[cat] = (acc[cat] || 0) + Math.abs(parseFloat(t.amount));
          return acc;
        }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      // Mês anterior para comparação
      const prevMonth = new Date(firstDay);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevFirstDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
      const prevLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);

      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.user_id)
        .gte('date', prevFirstDay.toISOString())
        .lte('date', prevLastDay.toISOString());

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
      const monthName = lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const message = formatMonthlySummary(
        userdata.full_name,
        monthName,
        transactions.length,
        income,
        expenses,
        balance,
        topCategories,
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

    console.log(`[send-monthly-summary] ✅ Total enviado: ${totalSent} resumos`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-monthly-summary] ❌ Erro:', error);
    
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

function formatMonthlySummary(
  fullName: string,
  monthName: string,
  txCount: number,
  income: number,
  expenses: number,
  balance: number,
  topCategories: [string, number][],
  variation: number
): string {
  const emoji = balance >= 0 ? '💰' : '📉';
  const varEmoji = variation < 0 ? '📈' : variation > 0 ? '📉' : '⚖️';
  
  let message = `📊 *RESUMO MENSAL - ${monthName.toUpperCase()}*\n\n`;
  message += `Olá ${fullName}! 👋\n\n`;
  message += `Fechamento do mês:\n\n`;
  
  message += `💵 *Receitas:* R$ ${income.toFixed(2)}\n`;
  message += `💸 *Despesas:* R$ ${expenses.toFixed(2)}\n`;
  message += `${emoji} *Saldo:* R$ ${balance.toFixed(2)}\n\n`;
  
  message += `📋 *Transações:* ${txCount}\n\n`;
  
  if (topCategories.length > 0) {
    message += `📈 *Top ${topCategories.length} Categorias:*\n`;
    topCategories.forEach(([cat, value], i) => {
      message += `${i + 1}. ${cat}: R$ ${value.toFixed(2)}\n`;
    });
    message += `\n`;
  }
  
  if (variation !== 0) {
    message += `📊 *vs Mês anterior:*\n`;
    const varText = variation < 0 ? 'menos' : 'mais';
    message += `Você gastou ${Math.abs(variation).toFixed(1)}% ${varText} ${varEmoji}\n\n`;
  }
  
  if (balance < 0) {
    message += `⚠️ _Revise seus gastos para o próximo mês._\n`;
  } else {
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
