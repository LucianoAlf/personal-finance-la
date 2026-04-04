/**
 * EDGE FUNCTION: send-investment-summary
 * Envia resumo de investimentos semanal ou mensal
 * Respeita preferências: investment_summary_frequency, day_of_week, time
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
          
          let isInDNDTime = false;
          if (dndStart < dndEnd) {
            isInDNDTime = currentTime >= dndStart || currentTime < dndEnd;
          } else {
            isInDNDTime = currentTime >= dndStart && currentTime < dndEnd;
          }

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

      // Buscar dados do portfólio
      const { data: portfolio } = await supabase
        .rpc('calculate_portfolio_metrics', { p_user_id: user.user_id });

      if (!portfolio) {
        console.log(`[send-investment-summary] ⚠️ Portfolio vazio para ${user.user_id}`);
        continue;
      }

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      // Enviar resumo
      const message = formatInvestmentSummary(portfolio, frequency, userdata.full_name);
      
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        userdata.phone,
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

function formatInvestmentSummary(
  portfolio: any,
  frequency: string,
  fullName: string
): string {
  const period = frequency === 'weekly' ? 'Semanal' : 'Mensal';
  
  let message = `📊 *RESUMO DE INVESTIMENTOS ${period.toUpperCase()}*\n\n`;
  message += `Olá ${fullName}! 👋\n\n`;
  
  message += `💼 *Portfólio Atual:*\n`;
  message += `• Total Investido: R$ ${parseFloat(portfolio.total_invested || 0).toFixed(2)}\n`;
  message += `• Valor Atual: R$ ${parseFloat(portfolio.current_value || 0).toFixed(2)}\n`;
  message += `• Retorno: R$ ${parseFloat(portfolio.total_return || 0).toFixed(2)}\n`;
  message += `• Performance: ${parseFloat(portfolio.return_percentage || 0).toFixed(2)}%\n\n`;

  if (portfolio.top_performers && portfolio.top_performers.length > 0) {
    message += `📈 *Melhores Performances:*\n`;
    portfolio.top_performers.slice(0, 3).forEach((asset: any) => {
      message += `• ${asset.ticker}: +${asset.return_percentage.toFixed(2)}%\n`;
    });
    message += `\n`;
  }

  if (portfolio.upcoming_dividends && portfolio.upcoming_dividends.length > 0) {
    message += `💰 *Próximos Dividendos:*\n`;
    const total = portfolio.upcoming_dividends.reduce((sum: number, div: any) => 
      sum + parseFloat(div.amount), 0
    );
    message += `Total esperado: R$ ${total.toFixed(2)}\n\n`;
  }

  message += `🎯 *Diversificação:* ${portfolio.diversification_score || 0}/100\n\n`;
  message += `_Continue acompanhando seus investimentos!_ 📈`;

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
