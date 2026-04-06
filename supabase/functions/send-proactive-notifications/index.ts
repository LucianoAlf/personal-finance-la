/**
 * EDGE FUNCTION: send-proactive-notifications
 * Responsabilidade: Enviar notificações proativas via WhatsApp
 * 
 * Tipos de notificações:
 * 1. Contas vencendo em 3 dias
 * 2. Metas de gasto em 80%, 90%, 100%
 * 3. Início de ciclos financeiros
 * 4. Metas alcançadas
 * 5. Dividendos recebidos
 * 
 * Executado via Cron Job diariamente às 9h
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret'
      }
    });
  }
  try {
    // Validar cron secret (TEMPORARIAMENTE DESABILITADO PARA DEBUG)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    console.log('[send-proactive-notifications] 🔐 Secret recebido:', cronSecret ? 'presente' : 'ausente');
    console.log('[send-proactive-notifications] 🔐 Secret esperado:', expectedSecret ? 'presente' : 'ausente');
    // TEMPORARIAMENTE COMENTADO PARA DEBUG
    // if (cronSecret !== expectedSecret) {
    //   console.error('[send-proactive-notifications] ❌ Cron secret inválido');
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    // }
    console.log('[send-proactive-notifications] 🚀 Iniciando envio de notificações...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = [];
    // 1. Buscar usuários com WhatsApp conectado e notificações ativas
    const { data: users, error: usersError } = await supabase.from('whatsapp_connections').select('user_id, phone_number').eq('connected', true);
    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      console.log('[send-proactive-notifications] ⚠️ Nenhum usuário com WhatsApp conectado');
      return new Response(JSON.stringify({
        message: 'Nenhum usuário ativo',
        results: []
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[send-proactive-notifications] 📱 ${users.length} usuários ativos`);
    // 2. Processar cada usuário
    for (const user of users){
      try {
        const notifications = await processUserNotifications(supabase, user.user_id);
        results.push({
          user_id: user.user_id,
          notifications_sent: notifications.length,
          types: notifications.map((n)=>n.type),
          success: true
        });
      } catch (error) {
        console.error(`[send-proactive-notifications] ❌ Erro usuário ${user.user_id}:`, error);
        results.push({
          user_id: user.user_id,
          notifications_sent: 0,
          types: [],
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    const totalSent = results.reduce((sum, r)=>sum + r.notifications_sent, 0);
    console.log(`[send-proactive-notifications] ✅ Total enviado: ${totalSent} notificações`);
    return new Response(JSON.stringify({
      success: true,
      total_users: users.length,
      total_notifications: totalSent,
      results
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('[send-proactive-notifications] ❌ Erro geral:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
/**
 * Processar notificações de um usuário
 */ async function processUserNotifications(supabase, userId) {
  const notifications = [];
  // 0. Verificar DND (Do Not Disturb)
  const { data: preferences } = await supabase.from('notification_preferences').select('do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week').eq('user_id', userId).single();
  if (preferences?.do_not_disturb_enabled) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay(); // 0-6 (Domingo-Sábado)
    const dndStart = preferences.do_not_disturb_start_time || '22:00';
    const dndEnd = preferences.do_not_disturb_end_time || '08:00';
    const dndDays = preferences.do_not_disturb_days_of_week || [];
    // Verificar se hoje é um dia de DND
    const isDNDDay = dndDays.length === 0 || dndDays.includes(currentDay);
    // Verificar se está no horário de DND
    let isInDNDTime = false;
    if (dndStart < dndEnd) {
      // Período normal (ex: 22:00 - 08:00 do dia seguinte)
      isInDNDTime = currentTime >= dndStart || currentTime < dndEnd;
    } else {
      // Período que cruza meia-noite (ex: 08:00 - 22:00)
      isInDNDTime = currentTime >= dndStart && currentTime < dndEnd;
    }
    if (isDNDDay && isInDNDTime) {
      console.log(`[processUserNotifications] ⏸️ Usuário ${userId} em DND (${dndStart}-${dndEnd}, dias: ${dndDays})`);
      return [];
    }
  }
  // 1. Verificar contas vencendo em 3 dias
  const billsNotif = await checkUpcomingBills(supabase, userId);
  if (billsNotif) notifications.push(billsNotif);
  // 2. Verificar metas de gasto
  const budgetNotif = await checkBudgetStatus(supabase, userId);
  if (budgetNotif) notifications.push(budgetNotif);
  // 3. Verificar ciclos financeiros próximos
  const cyclesNotif = await checkFinancialCycles(supabase, userId);
  if (cyclesNotif) notifications.push(cyclesNotif);
  // 4. Verificar metas alcançadas
  const goalsNotif = await checkAchievedGoals(supabase, userId);
  if (goalsNotif) notifications.push(goalsNotif);
  // 5. Verificar dividendos recebidos
  const dividendsNotif = await checkDividends(supabase, userId);
  if (dividendsNotif) notifications.push(dividendsNotif);
  // 5. Enviar notificações via WhatsApp
  for (const notif of notifications){
    await sendWhatsAppNotification(supabase, userId, notif.message);
  }
  return notifications;
}
/**
 * 1. Verificar contas vencendo em 3 dias
 */ async function checkUpcomingBills(supabase, userId) {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: bills, error } = await supabase.from('payable_bills').select('description, amount, due_date, provider').eq('user_id', userId).eq('status', 'pending').gte('due_date', today.toISOString()).lte('due_date', threeDaysFromNow.toISOString()).order('due_date', {
    ascending: true
  });
  if (error) {
    console.error('[checkUpcomingBills] Erro:', error);
    return null;
  }
  if (!bills || bills.length === 0) return null;
  const totalAmount = bills.reduce((sum, bill)=>sum + parseFloat(bill.amount), 0);
  let message = `🔔 *Lembrete de Contas*\n\n`;
  message += `Você tem *${bills.length} conta(s)* vencendo nos próximos 3 dias:\n\n`;
  bills.slice(0, 5).forEach((bill)=>{
    const dueDate = new Date(bill.due_date);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    message += `• ${bill.description} - R$ ${parseFloat(bill.amount).toFixed(2)}\n`;
    message += `  📅 Vence em ${daysUntil} dia(s)\n\n`;
  });
  if (bills.length > 5) {
    message += `... e mais ${bills.length - 5} conta(s)\n\n`;
  }
  message += `💰 *Total:* R$ ${totalAmount.toFixed(2)}\n\n`;
  message += `_Não esqueça de pagar para evitar juros!_ 😊`;
  console.log(`[checkUpcomingBills] ✅ ${bills.length} contas vencendo`);
  return {
    type: 'upcoming_bills',
    message
  };
}
/**
 * 2. Verificar status das metas de gasto do mês
 */ async function checkBudgetStatus(supabase, userId) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('budget_alert_thresholds, budget_alert_threshold_percentage, budget_alert_cooldown_hours')
    .eq('user_id', userId)
    .single();

  const thresholds = (preferences?.budget_alert_thresholds?.length
    ? preferences.budget_alert_thresholds
    : preferences?.budget_alert_threshold_percentage
      ? [
          preferences.budget_alert_threshold_percentage,
          100,
        ]
      : [
          80,
          100,
        ])
    .filter((value)=>value >= 50 && value <= 100);
  const cooldownHours = preferences?.budget_alert_cooldown_hours || 24;

  const { data: lastNotif } = await supabase.from('notifications_log').select('created_at').eq('user_id', userId).eq('type', 'budget_alert').order('created_at', {
    ascending: false
  }).limit(1).single();
  if (lastNotif) {
    const hoursSince = (now.getTime() - new Date(lastNotif.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < cooldownHours) {
      console.log(`[checkBudgetStatus] ⏳ Cooldown ativo (${hoursSince.toFixed(1)}h/${cooldownHours}h)`);
      return null;
    }
  }

  const { data: spendingGoals, error: goalsError } = await supabase
    .from('financial_goals')
    .select('target_amount,current_amount,period_start,period_end,status')
    .eq('user_id', userId)
    .eq('goal_type', 'spending_limit')
    .in('status', ['active', 'exceeded'])
    .lte('period_start', lastDay.toISOString().split('T')[0])
    .gte('period_end', firstDay.toISOString().split('T')[0]);

  if (goalsError) {
    console.error('[checkBudgetStatus] Erro metas de gasto:', goalsError);
    return null;
  }

  const spendingLimit = spendingGoals?.reduce((sum, goal)=>sum + Math.abs(parseFloat(goal.target_amount)), 0) || 0;
  const totalSpent = spendingGoals?.reduce((sum, goal)=>sum + Math.abs(parseFloat(goal.current_amount)), 0) || 0;

  if (spendingLimit <= 0) return null;

  const percentage = totalSpent / spendingLimit * 100;
  const reachedThreshold = thresholds.sort((a, b)=>b - a).find((t)=>percentage >= t);
  if (!reachedThreshold) return null;
  let emoji = '';
  if (reachedThreshold >= 100) {
    emoji = '🚨';
  } else if (reachedThreshold >= 90) {
    emoji = '⚠️';
  } else {
    emoji = '⚡';
  }

  const remaining = spendingLimit - totalSpent;
  let message = `${emoji} *Alerta de Meta de Gasto*\n\n`;
  message += `Você já consumiu *${percentage.toFixed(1)}%* dos seus limites mensais por categoria.\n\n`;
  message += `💸 Gasto acumulado: R$ ${totalSpent.toFixed(2)}\n`;
  message += `🎯 Limites do mês: R$ ${spendingLimit.toFixed(2)}\n`;
  if (remaining > 0) {
    message += `💰 Restante: R$ ${remaining.toFixed(2)}\n\n`;
    message += `_Acompanhe as categorias em risco para não estourar o planejamento._`;
  } else {
    message += `❌ Você excedeu em R$ ${Math.abs(remaining).toFixed(2)}\n\n`;
    message += `_Hora de revisar as categorias que passaram do limite._`;
  }

  await supabase.from('notifications_log').insert({
    user_id: userId,
    type: 'budget_alert',
    channel: 'whatsapp',
    status: 'sent',
    metadata: {
      threshold: reachedThreshold,
      percentage: percentage.toFixed(1)
    }
  });
  console.log(`[checkBudgetStatus] ✅ Metas de gasto em ${percentage.toFixed(1)}% (threshold: ${reachedThreshold}%)`);
  return {
    type: 'budget_alert',
    message
  };
}

/**
 * 3. Verificar ciclos financeiros próximos
 */ async function checkFinancialCycles(supabase, userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const { data: cycles, error } = await supabase
    .from('financial_cycles')
    .select('id, name, type, day, notify_days_before')
    .eq('user_id', userId)
    .eq('active', true)
    .eq('notify_start', true)
    .order('day', { ascending: true });

  if (error) {
    console.error('[checkFinancialCycles] Erro:', error);
    return null;
  }

  if (!cycles || cycles.length === 0) return null;

  const cycleAlerts = cycles
    .map((cycle) => {
      let nextDate = new Date(currentYear, currentMonth, cycle.day);

      if (nextDate < today) {
        nextDate = new Date(currentYear, currentMonth + 1, cycle.day);
      }

      const diffMs = nextDate.getTime() - today.getTime();
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const notifyDaysBefore = Math.max(0, Number(cycle.notify_days_before || 0));

      if (daysUntil < 0 || daysUntil > notifyDaysBefore) {
        return null;
      }

      return {
        id: cycle.id,
        name: cycle.name,
        type: cycle.type,
        day: cycle.day,
        daysUntil,
      };
    })
    .filter(Boolean);

  if (cycleAlerts.length === 0) return null;

  const { data: lastNotif } = await supabase
    .from('notifications_log')
    .select('created_at, metadata')
    .eq('user_id', userId)
    .eq('type', 'financial_cycle_reminder')
    .order('created_at', { ascending: false })
    .limit(5);

  const alreadyNotifiedKeys = new Set(
    (lastNotif || [])
      .map((item)=>item.metadata?.cycle_key)
      .filter(Boolean)
  );

  const pendingAlerts = cycleAlerts.filter((cycle) => {
    const cycleKey = `${cycle.id}:${today.toISOString().slice(0, 10)}`;
    return !alreadyNotifiedKeys.has(cycleKey);
  });

  if (pendingAlerts.length === 0) return null;

  let message = `🗓️ *Lembrete de Ciclo Financeiro*\n\n`;
  pendingAlerts.slice(0, 3).forEach((cycle)=>{
    const timingText = cycle.daysUntil === 0
      ? 'começa hoje'
      : cycle.daysUntil === 1
        ? 'começa amanhã'
        : `começa em ${cycle.daysUntil} dias`;

    message += `• ${cycle.name} (${timingText})\n`;
    message += `  Dia de referência: ${cycle.day}\n\n`;
  });

  message += `_Use esse marco para revisar limites, aportes e decisões do próximo período._`;

  await Promise.all(
    pendingAlerts.map((cycle) =>
      supabase.from('notifications_log').insert({
        user_id: userId,
        type: 'financial_cycle_reminder',
        title: `Ciclo ${cycle.name}`,
        message,
        sent_via: 'whatsapp',
        metadata: {
          cycle_id: cycle.id,
          cycle_key: `${cycle.id}:${today.toISOString().slice(0, 10)}`,
          days_until: cycle.daysUntil,
          reference_day: cycle.day,
        },
      })
    )
  );

  return {
    type: 'financial_cycle_reminder',
    message,
  };
}
/**
 * 3. Verificar metas alcançadas
 */ async function checkAchievedGoals(supabase, userId) {
  // Buscar metas que foram alcançadas nas últimas 24h
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: goals, error } = await supabase.from('financial_goals').select('name, target_amount, current_amount, goal_type').eq('user_id', userId).eq('goal_type', 'savings').eq('status', 'completed').gte('updated_at', yesterday.toISOString());
  if (error) {
    console.error('[checkAchievedGoals] Erro:', error);
    return null;
  }
  if (!goals || goals.length === 0) return null;
  let message = `🎉 *Parabéns!*\n\n`;
  message += `Você alcançou ${goals.length} meta(s):\n\n`;
  goals.forEach((goal)=>{
    message += `✅ *${goal.name}*\n`;
    message += `   R$ ${parseFloat(goal.target_amount).toFixed(2)}\n\n`;
  });
  message += `_Continue assim! Você está no caminho certo!_ 🚀`;
  console.log(`[checkAchievedGoals] ✅ ${goals.length} metas alcançadas`);
  return {
    type: 'goals_achieved',
    message
  };
}
/**
 * 4. Verificar dividendos recebidos
 */ async function checkDividends(supabase, userId) {
  // Buscar dividendos recebidos nas últimas 24h
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: dividends, error } = await supabase
    .from('investment_transactions')
    .select('investment_id, total_value, transaction_type, investments(ticker)')
    .eq('user_id', userId)
    .in('transaction_type', [
      'dividend',
      'interest'
    ])
    .gte('transaction_date', yesterday.toISOString());
  if (error) {
    console.error('[checkDividends] Erro:', error);
    return null;
  }
  if (!dividends || dividends.length === 0) return null;
  const totalDividends = dividends.reduce((sum, div)=>sum + parseFloat(div.total_value), 0);
  let message = `💰 *Dividendos Recebidos!*\n\n`;
  message += `Você recebeu proventos:\n\n`;
  dividends.forEach((div)=>{
    const label = div.transaction_type === 'interest' ? 'juros' : 'dividendos';
    message += `• ${div.investments.ticker}: R$ ${parseFloat(div.total_value).toFixed(2)} (${label})\n`;
  });
  message += `\n💵 *Total:* R$ ${totalDividends.toFixed(2)}\n\n`;
  message += `_Seu dinheiro trabalhando por você!_ 📈`;
  console.log(`[checkDividends] ✅ ${dividends.length} dividendos recebidos`);
  return {
    type: 'dividends_received',
    message
  };
}
/**
 * Enviar notificação via WhatsApp
 */ async function sendWhatsAppNotification(supabase, userId, message) {
  try {
    // Buscar dados do usuário
    const { data: connection } = await supabase.from('whatsapp_connections').select('phone_number, instance_token').eq('user_id', userId).single();
    if (!connection || !connection.phone_number) {
      console.error('[sendWhatsAppNotification] Usuário sem telefone configurado');
      return;
    }
    // Enviar via UAZAPI
    const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || Deno.env.get('UAZAPI_SERVER_URL') || 'https://lamusic.uazapi.com';
    const UAZAPI_TOKEN = connection.instance_token || Deno.env.get('UAZAPI_INSTANCE_TOKEN');
    const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN
      },
      body: JSON.stringify({
        number: connection.phone_number,
        text: message
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendWhatsAppNotification] Erro UAZAPI:', errorText);
      throw new Error(`UAZAPI error: ${response.status}`);
    }
    console.log(`[sendWhatsAppNotification] ✅ Notificação enviada para ${connection.phone_number}`);
  } catch (error) {
    console.error('[sendWhatsAppNotification] ❌ Falha ao enviar:', error);
    throw error;
  }
}
