import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();
    
    if (!to) {
      throw new Error('Email de destino não informado');
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = 'noreply@mypersonalfinance.com.br';

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    // Enviar email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Personal Finance LA <${FROM_EMAIL}>`,
        to: [to],
        subject: '🎉 Teste de Email - Personal Finance LA',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🎉 Personal Finance LA</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937;">✅ Email Configurado com Sucesso!</h2>
                    <p style="color: #4b5563;">Este é um email de teste do Resend!</p>
                    <p style="color: #4b5563;"><strong>Domínio:</strong> mypersonalfinance.com.br</p>
                    <p style="color: #4b5563;"><strong>Email:</strong> ${FROM_EMAIL}</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Erro ao enviar email');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
