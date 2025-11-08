import { Resend } from 'resend';

// Inicializar Resend com a API Key
const resendApiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('⚠️ RESEND_API_KEY não configurada');
}

export const resend = new Resend(resendApiKey);

// Email padrão de envio
export const FROM_EMAIL = 'noreply@mypersonalfinance.com.br';

/**
 * Envia um email de teste
 */
export async function sendTestEmail(to: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Personal Finance LA <${FROM_EMAIL}>`,
      to: [to],
      subject: '🎉 Teste de Email - Personal Finance LA',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                    🎉 Personal Finance LA
                  </h1>
                  <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">
                    Sistema de Gestão Financeira Pessoal
                  </p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 700;">
                    ✅ Email Configurado com Sucesso!
                  </h2>
                  
                  <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Olá! 👋
                  </p>
                  
                  <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Este é um <strong>email de teste</strong> para confirmar que o sistema de envio de emails está funcionando perfeitamente!
                  </p>
                  
                  <div style="background: #f3f4f6; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #374151; font-size: 14px;">
                      <strong>📧 Configuração:</strong><br>
                      Domínio: mypersonalfinance.com.br<br>
                      Email: ${FROM_EMAIL}<br>
                      Região: São Paulo (sa-east-1)
                    </p>
                  </div>
                  
                  <p style="margin: 24px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    A partir de agora você receberá:
                  </p>
                  
                  <ul style="margin: 16px 0; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
                    <li>🔔 Lembretes de contas a pagar</li>
                    <li>📊 Relatórios financeiros mensais</li>
                    <li>🎯 Alertas de metas</li>
                    <li>💰 Notificações de investimentos</li>
                  </ul>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://personal-finance-la.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Acessar o App
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>Personal Finance LA</strong> - Gestão Financeira Inteligente<br>
                    Desenvolvido com ❤️ por LA Music Team
                  </p>
                  <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">
                    Este é um email automático. Por favor, não responda.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      return { success: false, error };
    }

    console.log('✅ Email enviado com sucesso!', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error };
  }
}
