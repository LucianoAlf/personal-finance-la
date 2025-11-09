// SPRINT 5.1: Edge Function para enviar notificação de snapshot do portfólio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PortfolioSnapshot {
  snapshot_date: string;
  total_invested: number;
  current_value: number;
  return_amount: number;
  return_percentage: number;
  dividends_ytd: number;
  dividend_yield: number;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@mypersonalfinance.com.br';
    const uazapiServerUrl = Deno.env.get('UAZAPI_SERVER_URL');
    const uazapiToken = Deno.env.get('UAZAPI_INSTANCE_TOKEN');
    const uazapiPhone = Deno.env.get('UAZAPI_PHONE_NUMBER');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Buscar snapshot mais recente de cada usuário
    const { data: snapshots, error: snapshotError } = await supabase
      .from('portfolio_snapshots')
      .select('user_id, snapshot_date, total_invested, current_value, return_amount, return_percentage, dividends_ytd, dividend_yield')
      .order('snapshot_date', { ascending: false })
      .limit(100);

    if (snapshotError) {
      console.error('Erro ao buscar snapshots:', snapshotError);
      throw snapshotError;
    }

    if (!snapshots || snapshots.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum snapshot encontrado' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Agrupar por usuário (pegar apenas o mais recente)
    const latestSnapshots = new Map<string, PortfolioSnapshot & { user_id: string }>();
    for (const snap of snapshots) {
      if (!latestSnapshots.has(snap.user_id)) {
        latestSnapshots.set(snap.user_id, snap as any);
      }
    }

    const results = [];

    // Processar cada usuário
    for (const [userId, snapshot] of latestSnapshots) {
      try {
        // Buscar dados do usuário
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email, full_name, phone')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          console.error(`Usuário ${userId} não encontrado`);
          continue;
        }

        const userName = user.full_name || 'Investidor';
        const returnColor = snapshot.return_percentage >= 0 ? '🟢' : '🔴';
        const returnSign = snapshot.return_percentage >= 0 ? '+' : '';

        // Formatar mensagem
        const message = `
📊 *Snapshot do Portfólio - ${new Date(snapshot.snapshot_date).toLocaleDateString('pt-BR')}*

Olá ${userName}! 👋

Aqui está o resumo do seu portfólio:

💰 *Total Investido:* R$ ${snapshot.total_invested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
📈 *Valor Atual:* R$ ${snapshot.current_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${returnColor} *Retorno:* ${returnSign}R$ ${Math.abs(snapshot.return_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${returnSign}${snapshot.return_percentage.toFixed(2)}%)

💵 *Dividendos YTD:* R$ ${snapshot.dividends_ytd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
📊 *Dividend Yield:* ${snapshot.dividend_yield.toFixed(2)}%

Continue acompanhando seus investimentos! 🚀
        `.trim();

        let emailSent = false;
        let whatsappSent = false;

        // Enviar Email via Resend
        if (resendApiKey && user.email) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: resendFromEmail,
                to: user.email,
                subject: `📊 Snapshot do Portfólio - ${new Date(snapshot.snapshot_date).toLocaleDateString('pt-BR')}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>📊 Snapshot do Portfólio</h2>
                    <p>Olá <strong>${userName}</strong>! 👋</p>
                    <p>Aqui está o resumo do seu portfólio de <strong>${new Date(snapshot.snapshot_date).toLocaleDateString('pt-BR')}</strong>:</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p><strong>💰 Total Investido:</strong> R$ ${snapshot.total_invested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p><strong>📈 Valor Atual:</strong> R$ ${snapshot.current_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p style="color: ${snapshot.return_percentage >= 0 ? '#22c55e' : '#ef4444'};">
                        <strong>${returnColor} Retorno:</strong> ${returnSign}R$ ${Math.abs(snapshot.return_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${returnSign}${snapshot.return_percentage.toFixed(2)}%)
                      </p>
                      <p><strong>💵 Dividendos YTD:</strong> R$ ${snapshot.dividends_ytd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p><strong>📊 Dividend Yield:</strong> ${snapshot.dividend_yield.toFixed(2)}%</p>
                    </div>
                    
                    <p>Continue acompanhando seus investimentos! 🚀</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                      Esta é uma notificação automática do Finance LA.
                    </p>
                  </div>
                `,
              }),
            });

            if (emailResponse.ok) {
              emailSent = true;
              console.log(`Email enviado para ${user.email}`);
            } else {
              const errorText = await emailResponse.text();
              console.error(`Erro ao enviar email: ${errorText}`);
            }
          } catch (emailError) {
            console.error('Erro no envio de email:', emailError);
          }
        }

        // Enviar WhatsApp via UAZAPI
        if (uazapiServerUrl && uazapiToken && user.phone) {
          try {
            const phoneNumber = user.phone.replace(/\D/g, '');
            const whatsappResponse = await fetch(`${uazapiServerUrl}/v1/messages/text`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${uazapiToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: phoneNumber,
                message: message,
              }),
            });

            if (whatsappResponse.ok) {
              whatsappSent = true;
              console.log(`WhatsApp enviado para ${phoneNumber}`);
            } else {
              const errorText = await whatsappResponse.text();
              console.error(`Erro ao enviar WhatsApp: ${errorText}`);
            }
          } catch (whatsappError) {
            console.error('Erro no envio de WhatsApp:', whatsappError);
          }
        }

        results.push({
          user_id: userId,
          email: user.email,
          phone: user.phone,
          email_sent: emailSent,
          whatsapp_sent: whatsappSent,
        });
      } catch (error) {
        console.error(`Erro ao processar usuário ${userId}:`, error);
        results.push({
          user_id: userId,
          error: String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Notificações enviadas para ${results.length} usuários`,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
