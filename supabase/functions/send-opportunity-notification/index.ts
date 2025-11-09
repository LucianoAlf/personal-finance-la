// SPRINT 4: Enviar notificações de oportunidades via WhatsApp + Email
// Usa mesma infraestrutura de send-bill-reminders (UAZAPI + Resend)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Opportunity {
  ticker: string;
  opportunity_type: string;
  title: string;
  description: string;
  confidence_score: number;
  expected_return: number | null;
  ana_clara_insight: string | null;
}

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
    const { userId, opportunities } = await req.json();

    if (!userId || !opportunities || opportunities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userId and opportunities required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${opportunities.length} opportunities for user ${userId}`);

    // 3. BUSCAR DADOS DO USUÁRIO
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name, nickname, phone')
      .eq('id', userId)
      .single();

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

    // 4. ENVIAR WHATSAPP (se phone configurado)
    if (user.phone) {
      try {
        // Usar mesmos nomes de variáveis que send-bill-reminders
        const uazapiBaseUrl = (Deno.env.get('UAZAPI_BASE_URL') || Deno.env.get('UAZAPI_SERVER_URL') || 'https://api.uazapi.com').replace(/\/$/, '');
        const uazapiInstanceId = Deno.env.get('UAZAPI_INSTANCE_ID') || Deno.env.get('UAZAPI_INSTANCE_TOKEN');
        const uazapiApiKey = Deno.env.get('UAZAPI_API_KEY') || Deno.env.get('UAZAPI_INSTANCE_TOKEN');

        if (uazapiInstanceId && uazapiApiKey) {
          const message = formatWhatsAppMessage(userName, opportunities);
          const phone = cleanPhone(user.phone);
          
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
          } else {
            const error = await response.text();
            console.error(`❌ Erro WhatsApp:`, error);
            failCount++;
          }
        } else {
          console.log('⚠️ UAZAPI não configurado, pulando WhatsApp');
        }
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
        failCount++;
      }
    }

    // 5. ENVIAR EMAIL (se email configurado)
    if (user.email) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Ana Clara <noreply@mypersonalfinance.com.br>';

        if (resendApiKey) {
          const emailSubject = `🎯 Ana Clara: ${opportunities.length} nova${opportunities.length > 1 ? 's' : ''} oportunidade${opportunities.length > 1 ? 's' : ''} para você!`;
          const emailHtml = formatEmailHtml(userName, opportunities, supabaseUrl);

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
          } else {
            const error = await response.text();
            console.error(`❌ Erro Email:`, error);
            failCount++;
          }
        } else {
          console.log('⚠️ Resend não configurado, pulando Email');
        }
      } catch (error) {
        console.error('❌ Erro ao enviar Email:', error);
        failCount++;
      }
    }

    // 6. RETORNAR RESULTADO
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificações enviadas: ${successCount} sucesso, ${failCount} falhas`,
        sent: successCount,
        failed: failCount,
        opportunities_count: opportunities.length,
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

function formatWhatsAppMessage(userName: string, opportunities: Opportunity[]): string {
  let message = `
━━━━━━━━━━━━━━━━━━━
💜 *Ana Clara - Investment Radar*

Olá ${userName}! 👋

Analisei seu portfólio e encontrei *${opportunities.length} oportunidade${opportunities.length > 1 ? 's' : ''}* para você:

`;

  opportunities.forEach((opp, index) => {
    const emoji = opp.opportunity_type === 'buy_opportunity' ? '🎯' : 
                  opp.opportunity_type === 'sell_signal' ? '⚠️' : 
                  opp.opportunity_type === 'dividend_alert' ? '💰' : '📊';
    
    message += `
${emoji} *${opp.title}*
📝 ${opp.description}
${opp.expected_return ? `📈 Retorno: ${opp.expected_return}%` : ''}
💡 ${opp.ana_clara_insight || 'Análise em andamento...'}
✅ Confiança: ${opp.confidence_score}%
`;

    if (index < opportunities.length - 1) {
      message += '\n---\n';
    }
  });

  message += `
━━━━━━━━━━━━━━━━━━━
💡 _Acesse o app para ver detalhes_
━━━━━━━━━━━━━━━━━━━
`;

  return message.trim();
}

function formatEmailHtml(userName: string, opportunities: Opportunity[], supabaseUrl: string): string {
  let emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">💜 Ana Clara</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">Sua Assistente de Investimentos</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #333;">Olá, <strong>${userName}</strong>! 👋</p>
        
        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          Analisei seu portfólio e encontrei <strong>${opportunities.length} oportunidade${opportunities.length > 1 ? 's' : ''}</strong> 
          que podem melhorar seus investimentos:
        </p>

        <div style="margin: 20px 0;">
  `;

  opportunities.forEach((opp) => {
    const typeEmoji = opp.opportunity_type === 'buy_opportunity' ? '🎯' : 
                     opp.opportunity_type === 'sell_signal' ? '⚠️' : 
                     opp.opportunity_type === 'dividend_alert' ? '💰' : '📊';
    
    const returnText = opp.expected_return 
      ? `<p style="margin: 5px 0; color: #10b981; font-weight: 600;">📈 Retorno esperado: ${opp.expected_return}%</p>`
      : '';

    emailBody += `
      <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
          ${typeEmoji} ${opp.title}
        </h3>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">${opp.description}</p>
        ${returnText}
        <p style="margin: 5px 0; color: #8b5cf6; font-size: 13px;">
          <strong>💡 Insight:</strong> ${opp.ana_clara_insight || 'Análise em andamento...'}
        </p>
        <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">
          ✅ Confiança: ${opp.confidence_score}%
        </p>
      </div>
    `;
  });

  emailBody += `
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>⚡ Ação recomendada:</strong> Acesse sua conta para ver detalhes completos e tomar decisões informadas.
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
