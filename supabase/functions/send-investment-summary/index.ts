/**
 * EDGE FUNCTION: send-investment-summary
 * Envia resumo de investimentos semanal ou mensal
 * Respeita preferências: investment_summary_frequency, day_of_week, time
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildInvestmentIntelligenceContext } from '../_shared/investment-intelligence.ts';

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
    console.log('[send-investment-summary] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Buscar usuários com resumo de investimentos ativado
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, investment_summary_frequency, investment_summary_day_of_week, investment_summary_time, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('investment_summary_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-investment-summary] ⚠️ Nenhum usuário com resumo ativo');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-investment-summary] 📱 ${users.length} usuários com resumo ativo`);

    let totalSent = 0;

    for (const user of users) {
      // Verificar DND
      if (user.do_not_disturb_enabled) {
        const dndDays = user.do_not_disturb_days_of_week || [];
        const isDNDDay = dndDays.length === 0 || dndDays.includes(currentDay);
        
        if (isDNDDay) {
          const dndStart = user.do_not_disturb_start_time || '22:00';
          const dndEnd = user.do_not_disturb_end_time || '08:00';
          
          const isInDNDTime = isTimeWithinWindow(currentTime, dndStart, dndEnd);

          if (isInDNDTime) {
            console.log(`[send-investment-summary] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const frequency = user.investment_summary_frequency || 'weekly';
      const scheduledDay = user.investment_summary_day_of_week || 1; // Segunda padrão
      const scheduledTime = user.investment_summary_time || '18:00';

      // Verificar se é o dia/hora correto
      let shouldSend = false;

      if (frequency === 'weekly') {
        // Semanal: verificar dia da semana
        if (currentDay === scheduledDay && currentTime >= scheduledTime) {
          shouldSend = true;
        }
      } else if (frequency === 'monthly') {
        // Mensal: primeiro dia útil do mês
        const isFirstDay = now.getDate() === 1;
        if (isFirstDay && currentTime >= scheduledTime) {
          shouldSend = true;
        }
      }

      if (!shouldSend) {
        console.log(`[send-investment-summary] ⏸️ Não é hora para ${user.user_id}`);
        continue;
      }

      const [{ data: recentDividends, error: dividendsError }] = await Promise.all([
        supabase
          .from('investment_transactions')
          .select('total_value')
          .eq('user_id', user.user_id)
          .in('transaction_type', ['dividend', 'interest'])
          .gte('transaction_date', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (dividendsError) throw dividendsError;

      const context = await buildInvestmentIntelligenceContext({
        supabase,
        userId: user.user_id,
        supabaseUrl: SUPABASE_URL,
      });

      if (context.portfolio.investmentCount === 0) {
        console.log(`[send-investment-summary] ⚠️ Portfolio vazio para ${user.user_id}`);
        continue;
      }

      const totalDividends = (recentDividends || []).reduce((sum, item)=>sum + Number(item.total_value || 0), 0);

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      const { data: whatsappConnection } = await supabase
        .from('whatsapp_connections')
        .select('phone_number, instance_token, connected, status')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (
        !whatsappConnection?.connected ||
        whatsappConnection.status !== 'connected' ||
        !whatsappConnection.phone_number
      ) {
        continue;
      }

      const destinationPhone = whatsappConnection.phone_number;

      // Enviar resumo
      const message = formatInvestmentSummary(
        context,
        frequency,
        userdata?.full_name ?? '',
        totalDividends,
      );
      
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        destinationPhone,
        message
      );

      if (sent) totalSent++;
    }

    console.log(`[send-investment-summary] ✅ Total enviado: ${totalSent} resumos`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-investment-summary] ❌ Erro:', error);
    
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

function isTimeWithinWindow(currentTime: string, startTime: string, endTime: string) {
  if (startTime === endTime) {
    return true;
  }

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  }

  return currentTime >= startTime || currentTime < endTime;
}

function formatInvestmentSummary(
  context: Awaited<ReturnType<typeof buildInvestmentIntelligenceContext>>,
  frequency: string,
  fullName: string,
  recentDividendsTotal: number,
): string {
  const period = frequency === 'weekly' ? 'Semanal' : 'Mensal';
  
  let message = `📊 *RESUMO DE INVESTIMENTOS ${period.toUpperCase()}*\n\n`;
  message += `Olá ${fullName}! 👋\n\n`;
  
  message += `💼 *Resumo determinístico:*\n`;
  message += `• Total investido: R$ ${context.portfolio.totalInvested.toFixed(2)}\n`;
  message += `• Valor atual: R$ ${context.portfolio.currentValue.toFixed(2)}\n`;
  message += `• Retorno: R$ ${context.portfolio.totalReturn.toFixed(2)}\n`;
  message += `• Performance: ${context.portfolio.returnPercentage.toFixed(2)}%\n`;
  message += `• Concentração máxima: ${context.portfolio.concentrationPercentage.toFixed(1)}%\n\n`;

  if (context.portfolio.topPerformers.length > 0) {
    message += `📈 *Melhores Performances:*\n`;
    context.portfolio.topPerformers.forEach((asset) => {
      message += `• ${asset.ticker}: ${asset.returnPercentage >= 0 ? '+' : ''}${asset.returnPercentage.toFixed(2)}%\n`;
    });
    message += `\n`;
  }

  if (recentDividendsTotal > 0) {
    message += `💰 *Proventos recentes (30 dias):*\n`;
    message += `Total recebido: R$ ${recentDividendsTotal.toFixed(2)}\n\n`;
  }

  if (context.planning.selectedGoal) {
    message += `🎯 *Meta principal:*\n`;
    message += `• ${context.planning.selectedGoal.name}\n`;
    message += `• Gap atual: R$ ${context.planning.selectedGoal.projectedGap.toFixed(2)}\n\n`;
  }

  message += `💜 *Leitura da Ana Clara:*\n`;
  message += `${context.ana.insight || 'Sem narrativa adicional disponível no momento. Este resumo foi enviado com base nos fatos da sua carteira.'}\n\n`;
  message += `_Continue acompanhando seus investimentos com contexto completo no app._`;

  return message;
}

async function sendWhatsAppNotification(
  supabase: any,
  userId: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('phone_number, instance_token')
      .eq('user_id', userId)
      .maybeSingle();

    const UAZAPI_BASE_URL = (
      Deno.env.get('UAZAPI_BASE_URL') ||
      Deno.env.get('UAZAPI_SERVER_URL') ||
      'https://api.uazapi.com'
    ).replace(/\/$/, '');
    const UAZAPI_TOKEN =
      connection?.instance_token ||
      Deno.env.get('UAZAPI_INSTANCE_TOKEN') ||
      Deno.env.get('UAZAPI_TOKEN') ||
      Deno.env.get('UAZAPI_API_KEY');
    if (!UAZAPI_TOKEN?.trim()) {
      console.error('[sendWhatsAppNotification] UAZAPI token ausente');
      return false;
    }
    const destinationPhone = connection?.phone_number || phone;

    const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        number: destinationPhone,
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
