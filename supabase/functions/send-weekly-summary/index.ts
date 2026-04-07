/**
 * EDGE FUNCTION: send-weekly-summary
 * Envia resumo semanal de transações (últimos 7 dias)
 * Respeita: weekly_summary_enabled, weekly_summary_time, weekly_summary_days_of_week
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

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      const weekEnd = startOfDay(new Date());
      const weekStart = addDays(weekEnd, -6);
      const startDate = toDateOnly(weekStart);
      const endDate = toDateOnly(weekEnd);
      const context = await buildReportIntelligenceContext({
        supabase,
        userId: user.user_id,
        startDate,
        endDate,
        supabaseUrl: SUPABASE_URL,
      });

      if (!hasDeterministicReportFacts(context)) {
        console.log(`[send-weekly-summary] ⏸️ Sem fatos determinísticos para ${user.user_id}`);
        continue;
      }

      const message = renderReportSummaryMessage({
        mode: 'weekly',
        userName: userdata.full_name,
        periodLabel: formatDateRangeLabel(startDate, endDate),
        context,
      });
      
      const sent = await sendWhatsAppNotification(
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

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateRangeLabel(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${formatter.format(new Date(`${startDate}T12:00:00`))} a ${formatter.format(
    new Date(`${endDate}T12:00:00`),
  )}`;
}
