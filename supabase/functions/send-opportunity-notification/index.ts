// SPRINT 4: Enviar notificações de oportunidades via WhatsApp + Email
// Usa mesma infraestrutura de send-bill-reminders (UAZAPI + Resend)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildInvestmentIntelligenceContext } from '../_shared/investment-intelligence.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 Send Opportunity Notification started');

    // 1. INICIALIZAR SUPABASE
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. BUSCAR DADOS DA REQUISIÇÃO
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const context = await buildInvestmentIntelligenceContext({
      supabase,
      userId,
      supabaseUrl,
    });
    const opportunities = context.opportunities.items.slice(0, 3);

    if (opportunities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Sem oportunidades canônicas para enviar', sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${opportunities.length} opportunities for user ${userId}`);

    // 3. BUSCAR DADOS DO USUÁRIO
    const [{ data: user, error: userError }, { data: whatsappConnection }] = await Promise.all([
      supabase
        .from('users')
        .select('email, full_name, nickname, phone')
        .eq('id', userId)
        .single(),
      supabase
        .from('whatsapp_connections')
        .select('phone_number, instance_token')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (userError || !user) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = user.nickname || user.full_name || 'Investidor';
    let successCount = 0;
    let failCount = 0;
    const delivery = {
      whatsapp: {
        attempted: false,
        success: false,
        skipped: false,
        detail: '' as string | null,
      },
      email: {
        attempted: false,
        success: false,
        skipped: false,
        detail: '' as string | null,
      },
    };

    // 4. ENVIAR WHATSAPP (se phone configurado)
    const whatsappPhone = whatsappConnection?.phone_number || user.phone;
    const whatsappToken = whatsappConnection?.instance_token || Deno.env.get('UAZAPI_INSTANCE_TOKEN') || Deno.env.get('UAZAPI_API_KEY');

    if (whatsappPhone) {
      try {
        // Usar mesmos nomes de variáveis que send-bill-reminders
        const uazapiBaseUrl = (Deno.env.get('UAZAPI_BASE_URL') || Deno.env.get('UAZAPI_SERVER_URL') || 'https://api.uazapi.com').replace(/\/$/, '');
        const uazapiApiKey = whatsappToken;

        if (uazapiApiKey) {
          delivery.whatsapp.attempted = true;
          const message = formatWhatsAppMessage(userName, context);
          const phone = cleanPhone(whatsappPhone);
          
          const response = await fetch(`${uazapiBaseUrl}/send/text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': uazapiApiKey,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          });

          if (response.ok) {
            console.log(`✅ WhatsApp enviado para ${phone}`);
            successCount++;
            delivery.whatsapp.success = true;
            delivery.whatsapp.detail = 'sent';
          } else {
            const error = await response.text();
            console.error(`❌ Erro WhatsApp:`, error);
            failCount++;
            delivery.whatsapp.detail = error;
          }
        } else {
          console.log('⚠️ UAZAPI não configurado, pulando WhatsApp');
          delivery.whatsapp.skipped = true;
          delivery.whatsapp.detail = 'provider_not_configured';
        }
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
        failCount++;
        delivery.whatsapp.detail = error instanceof Error ? error.message : 'unknown_error';
      }
    } else {
      delivery.whatsapp.skipped = true;
      delivery.whatsapp.detail = 'user_without_phone';
    }

    // 5. ENVIAR EMAIL (se email configurado)
    if (user.email) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Ana Clara <noreply@mypersonalfinance.com.br>';

        if (resendApiKey) {
          delivery.email.attempted = true;
          const emailSubject = `Ana Clara: ${opportunities.length} oportunidade${opportunities.length > 1 ? 's' : ''} para sua carteira`;
          const emailHtml = formatEmailHtml(userName, context, supabaseUrl);

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: user.email,
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          if (response.ok) {
            console.log(`✅ Email enviado para ${user.email}`);
            successCount++;
            delivery.email.success = true;
            delivery.email.detail = 'sent';
          } else {
            const error = await response.text();
            console.error(`❌ Erro Email:`, error);
            failCount++;
            delivery.email.detail = error;
          }
        } else {
          console.log('⚠️ Resend não configurado, pulando Email');
          delivery.email.skipped = true;
          delivery.email.detail = 'provider_not_configured';
        }
      } catch (error) {
        console.error('❌ Erro ao enviar Email:', error);
        failCount++;
        delivery.email.detail = error instanceof Error ? error.message : 'unknown_error';
      }
    } else {
      delivery.email.skipped = true;
      delivery.email.detail = 'user_without_email';
    }

    // 6. RETORNAR RESULTADO
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificações enviadas: ${successCount} sucesso, ${failCount} falhas`,
        sent: successCount,
        failed: failCount,
        opportunities_count: opportunities.length,
        delivery,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ==================== HELPERS ====================

function formatWhatsAppMessage(userName: string, context: Awaited<ReturnType<typeof buildInvestmentIntelligenceContext>>): string {
  const opportunities = context.opportunities.items.slice(0, 3);
  const allocationLine = context.portfolio.allocation
    .map((item) => `${item.label}: ${item.percentage.toFixed(1)}%`)
    .join(' | ');

  let message = `
━━━━━━━━━━━━━━━━━━━
*Ana Clara | Radar Premium*

Olá ${userName}! 👋

*Resumo determinístico da carteira*
- Valor atual: R$ ${context.portfolio.currentValue.toFixed(2)}
- Retorno: ${context.portfolio.returnPercentage.toFixed(2)}%
- Concentração máxima: ${context.portfolio.concentrationPercentage.toFixed(1)}%
- Alocação: ${allocationLine}

*Oportunidades identificadas*

`;

  opportunities.forEach((opp, index) => {
    const emoji = opp.type === 'buy_opportunity' ? '🎯' : 
                  opp.type === 'sell_signal' ? '⚠️' : 
                  opp.type === 'dividend_alert' ? '💰' : '📊';
    
    message += `
${emoji} *${opp.title}*
📝 ${opp.description}
${opp.expectedReturn ? `📈 Referência: ${opp.expectedReturn}%` : ''}
✅ Confiança: ${opp.confidenceScore}%
`;

    if (index < opportunities.length - 1) {
      message += '\n---\n';
    }
  });

  message += `
━━━━━━━━━━━━━━━━━━━
*Leitura da Ana Clara*
${context.ana.insight || 'Sem narrativa adicional disponível no momento. Os fatos acima são totalmente determinísticos.'}

_Abra o app para ver detalhes e contexto completo._
━━━━━━━━━━━━━━━━━━━
`;

  return message.trim();
}

function formatEmailHtml(
  userName: string,
  context: Awaited<ReturnType<typeof buildInvestmentIntelligenceContext>>,
  supabaseUrl: string
) {
  const opportunities = context.opportunities.items.slice(0, 3);
  let emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Ana Clara</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">Radar premium com fatos determinísticos primeiro</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #333;">Olá, <strong>${userName}</strong>! 👋</p>
        
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #111827; font-weight: 700;">Resumo determinístico</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px;">Valor atual: R$ ${context.portfolio.currentValue.toFixed(2)}</p>
          <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 14px;">Retorno: ${context.portfolio.returnPercentage.toFixed(2)}%</p>
          <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 14px;">Concentração máxima: ${context.portfolio.concentrationPercentage.toFixed(1)}%</p>
        </div>

        <div style="margin: 20px 0;">
  `;

  opportunities.forEach((opp) => {
    const typeEmoji = opp.type === 'buy_opportunity' ? '🎯' : 
                     opp.type === 'sell_signal' ? '⚠️' : 
                     opp.type === 'dividend_alert' ? '💰' : '📊';
    
    const returnText = opp.expectedReturn 
      ? `<p style="margin: 5px 0; color: #10b981; font-weight: 600;">Referência: ${opp.expectedReturn}%</p>`
      : '';

    emailBody += `
      <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
          ${typeEmoji} ${opp.title}
        </h3>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">${opp.description}</p>
        ${returnText}
        <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">
          ✅ Confiança: ${opp.confidenceScore}%
        </p>
      </div>
    `;
  });

  emailBody += `
        </div>

        <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 8px 0; color: #6b21a8; font-size: 13px; font-weight: 700;">
            Interpretação da Ana Clara
          </p>
          <p style="margin: 0; color: #5b21b6; font-size: 13px; line-height: 1.6;">
            ${context.ana.insight || 'Sem narrativa adicional disponível. As informações acima são enviadas apenas com base nos fatos da carteira.'}
          </p>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>Ação recomendada:</strong> Abra sua área de investimentos para ver o contexto completo antes de decidir.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${supabaseUrl.replace('https://', 'https://app.')}/investimentos" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600;
                    display: inline-block;">
            Ver Oportunidades 🚀
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          Você está recebendo este email porque ativou notificações de oportunidades.<br>
          Personal Finance LA • Powered by Ana Clara AI
        </p>
      </div>
    </div>
  `;

  return emailBody;
}

function cleanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13) {
    return cleaned;
  }
  
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('0')) {
    return '55' + cleaned.substring(1);
  }
  
  return cleaned;
}
