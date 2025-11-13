/**
 * EDGE FUNCTION: send-overdue-bill-alerts
 * Envia alertas de contas vencidas em 1, 3, 7, 15 dias
 * Respeita preferências: overdue_bill_alert_days array
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface OverdueBill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  user_id: string;
  phone: string;
  full_name: string;
}

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
    console.log('[send-overdue-bill-alerts] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Buscar usuários com alertas de vencidos ativados
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, overdue_bill_alert_days, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('overdue_bill_alerts_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-overdue-bill-alerts] ⚠️ Nenhum usuário com alertas ativos');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-overdue-bill-alerts] 📱 ${users.length} usuários com alertas ativos`);

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

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
            console.log(`[send-overdue-bill-alerts] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const alertDays = user.overdue_bill_alert_days || [1, 3, 7];
      
      // Buscar contas vencidas nos dias especificados
      const { data: bills, error: billsError } = await supabase
        .from('payable_bills')
        .select(`
          id,
          description,
          amount,
          due_date,
          users!inner(phone, full_name)
        `)
        .eq('user_id', user.user_id)
        .eq('status', 'overdue');

      if (billsError || !bills || bills.length === 0) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrar contas vencidas exatamente nos dias configurados
      const billsToAlert = bills.filter((bill: any) => {
        const dueDate = new Date(bill.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return alertDays.includes(daysOverdue);
      });

      if (billsToAlert.length === 0) continue;

      // Agrupar e enviar
      const message = formatOverdueMessage(billsToAlert, user.user_id);
      
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        bills[0].users.phone,
        message
      );

      if (sent) totalSent++;
    }

    console.log(`[send-overdue-bill-alerts] ✅ Total enviado: ${totalSent} alertas`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-overdue-bill-alerts] ❌ Erro:', error);
    
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

function formatOverdueMessage(bills: any[], userId: string): string {
  const totalAmount = bills.reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);
  
  let message = `🚨 *CONTAS VENCIDAS*\n\n`;
  message += `Você tem *${bills.length} conta(s)* atrasada(s):\n\n`;
  
  bills.forEach((bill: any) => {
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    message += `• ${bill.description}\n`;
    message += `  💰 R$ ${parseFloat(bill.amount).toFixed(2)}\n`;
    message += `  ⏰ Atrasada há ${daysOverdue} dia(s)\n\n`;
  });

  message += `💸 *Total em atraso:* R$ ${totalAmount.toFixed(2)}\n\n`;
  message += `⚠️ _Regularize para evitar juros e multas!_`;

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
