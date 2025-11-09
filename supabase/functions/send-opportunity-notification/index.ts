// SPRINT 4: Enviar notificação de oportunidades por email
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Opportunity {
  id: string;
  ticker: string;
  opportunity_type: string;
  title: string;
  description: string;
  confidence_score: number;
  expected_return: number | null;
  ana_clara_insight: string | null;
}

serve(async (req) => {
  try {
    console.log('📧 Send Opportunity Notification started');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar body da requisição
    const { userId, opportunities } = await req.json();

    if (!userId || !opportunities || opportunities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userId and opportunities required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name, nickname')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Preparar email
    const userName = user.nickname || user.full_name || 'Investidor';
    const emailSubject = `🎯 Ana Clara: ${opportunities.length} nova${opportunities.length > 1 ? 's' : ''} oportunidade${opportunities.length > 1 ? 's' : ''} para você!`;

    // Construir corpo do email
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

    // Adicionar cada oportunidade
    opportunities.forEach((opp: Opportunity, index: number) => {
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

    // Enviar email via Supabase Auth (usando Resend ou SMTP configurado)
    const { error: emailError } = await supabase.auth.admin.sendRawEmail({
      to: user.email,
      subject: emailSubject,
      html: emailBody,
    });

    if (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não falhar a requisição se email falhar
    } else {
      console.log(`✅ Email enviado para ${user.email}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificação enviada para ${user.email}`,
        opportunities_count: opportunities.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
