/**
 * EDGE FUNCTION: send-monthly-summary
 * Envia resumo mensal de transações
 * Respeita: monthly_summary_enabled, monthly_summary_time, monthly_summary_days_of_month
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildReportIntelligenceContext } from '../_shared/report-intelligence.ts';
import {
  hasDeterministicReportFacts,
  renderReportSummaryMessage,
} from '../_shared/report-renderers.ts';

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

      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      const startDate = toDateOnly(firstDay);
      const endDate = toDateOnly(lastDay);
      const context = await buildReportIntelligenceContext({
        supabase,
        userId: user.user_id,
        startDate,
        endDate,
        supabaseUrl: SUPABASE_URL,
      });

      if (!hasDeterministicReportFacts(context)) {
        console.log(`[send-monthly-summary] ⏸️ Sem fatos determinísticos para ${user.user_id}`);
        continue;
      }

      const message = renderReportSummaryMessage({
        mode: 'monthly',
        userName: userdata.full_name,
        periodLabel: formatMonthLabel(firstDay),
        context,
      });
      
      const sent = await sendWhatsAppNotification(
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

async function sendWhatsAppNotification(
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

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
