// Script de teste: Enviar email via Resend API
const RESEND_API_KEY = 're_2LWckZTk_2G9b8Fk8xai5JPapXZ8qvtHQ';
const EMAIL_TO = 'lucianoalf.la@gmail.com';

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Conta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔔 Lembrete Ana Clara</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Olá <strong>Alf</strong>! 👋
              </p>
              <div style="background-color: #fef3c7; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">
                  🔴 HOJE você tem uma conta a pagar
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">📄 Descrição:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">🧪 TESTE - Lembrete Email</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">💰 Valor:</td>
                        <td style="color: #111827; font-size: 18px; font-weight: 700; text-align: right;">R$ 99,90</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">📅 Vencimento:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">08 de novembro de 2025</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                ⏰ <strong>Não esqueça!</strong> Evite juros e multas pagando em dia.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Este é um lembrete automático do <strong>Personal Finance LA</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendTestEmail() {
  console.log('📧 Enviando email de teste via Resend API...\n');
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Ana Clara <onboarding@resend.dev>',
        to: [EMAIL_TO],
        subject: '🔔 Lembrete: 🧪 TESTE - Lembrete Email vence hoje',
        html: emailHtml
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email enviado com sucesso!');
      console.log('📊 Resultado:', JSON.stringify(result, null, 2));
      console.log(`\n📬 Verifique sua caixa de entrada: ${EMAIL_TO}`);
    } else {
      console.error('❌ Erro ao enviar email:');
      console.error('Status:', response.status);
      console.error('Resposta:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

sendTestEmail();
