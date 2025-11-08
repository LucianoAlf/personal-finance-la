import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface BillReminder {
  id: string;
  bill_id: string;
  user_id: string;
  reminder_date: string;
  reminder_time: string;
  days_before: number;
  channel: string;
  retry_count: number;
  description: string;
  amount: number;
  due_date: string;
  provider_name: string | null;
  phone: string;
  email: string;
  full_name: string;
  nickname: string | null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Tentar ler body (pode conter overrides de teste)
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }
    // 1. VALIDAR CRON_SECRET (se definido). Quando não definido, exigir Authorization header (uso de teste/manual)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);
    if (expectedSecret && !hasJwtAuth && (!cronSecret || cronSecret !== expectedSecret)) {
      console.error('❌ Autorização inválida: forneça Authorization (JWT) ou x-cron-secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expectedSecret && !hasJwtAuth) {
      console.error('❌ Authorization ausente em ambiente sem CRON_SECRET');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. INICIALIZAR SUPABASE CLIENT (Service Role se disponível, senão ANON + RPC SECURITY DEFINER)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || undefined;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || undefined;
    const incomingKey = hasJwtAuth ? (authHeader as string).replace(/^Bearer\s+/i, '') : undefined;
    const apiKey = serviceKey || anonKey || incomingKey;
    if (!apiKey) {
      console.error('❌ Nenhuma SUPABASE key disponível (SERVICE_ROLE ou ANON)');
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, apiKey, {
      global: {
        headers: {
          Authorization: authHeader || `Bearer ${apiKey}`,
          apikey: apiKey,
        },
      },
    });

    // 3. BUSCAR LEMBRETES PENDENTES
    const { data: reminders, error: fetchError } = await supabase.rpc('get_pending_reminders');

    if (fetchError) {
      console.error('❌ Erro ao buscar lembretes:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log('✅ Nenhum lembrete pendente no momento');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Nenhum lembrete pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${reminders.length} lembrete(s) pendente(s) encontrado(s)`);

    // 4. CONFIGURAR CREDENCIAIS
    const uazapiBaseUrl = (payload?.uazapi?.baseUrl || (globalThis as any).Deno?.env.get('UAZAPI_BASE_URL') || (globalThis as any).Deno?.env.get('UAZAPI_SERVER_URL') || 'https://api.uazapi.com').replace(/\/$/, '');
    const uazapiApiKey = payload?.uazapi?.apiKey || (globalThis as any).Deno?.env.get('UAZAPI_API_KEY') || (globalThis as any).Deno?.env.get('UAZAPI_INSTANCE_TOKEN');
    const resendApiKey = (globalThis as any).Deno?.env.get('RESEND_API_KEY');

    // 5. PROCESSAR CADA LEMBRETE
    let successCount = 0;
    let failCount = 0;

    for (const reminder of reminders as BillReminder[]) {
      try {
        console.log(`📤 Processando lembrete ${reminder.id} (${reminder.channel}) para ${reminder.full_name}`);

        let sendSuccess = false;

        // SWITCH POR CANAL
        switch (reminder.channel) {
          case 'whatsapp':
            if (!uazapiApiKey) {
              throw new Error('UAZAPI_API_KEY não configurada');
            }
            const whatsappMessage = formatWhatsAppMessage(reminder);
            const phone = cleanPhone(reminder.phone);
            const uazapiUrl = `${uazapiBaseUrl}/send/text`;
            
            const whatsappResponse = await fetch(uazapiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': uazapiApiKey,
              },
              body: JSON.stringify({
                number: phone,
                text: whatsappMessage,
              }),
            });

            const whatsappResult = await whatsappResponse.json().catch(() => ({ success: whatsappResponse.ok }));
            console.log(`📊 WhatsApp Response: status=${whatsappResponse.status}, result=`, JSON.stringify(whatsappResult));
            
            if (!whatsappResponse.ok) {
              throw new Error(whatsappResult.error || 'Erro ao enviar WhatsApp');
            }
            sendSuccess = true;
            break;

          case 'email':
            if (!resendApiKey) {
              throw new Error('RESEND_API_KEY não configurada');
            }
            
            const emailHtml = formatEmailHtml(reminder);
            const emailSubject = `🔔 Lembrete: ${reminder.description} vence ${reminder.days_before === 0 ? 'hoje' : `em ${reminder.days_before} dia${reminder.days_before > 1 ? 's' : ''}`}`;
            
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: 'Ana Clara <onboarding@resend.dev>',
                to: [reminder.email],
                subject: emailSubject,
                html: emailHtml,
              }),
            });

            const emailResult = await emailResponse.json();
            console.log(`📊 Email Response: status=${emailResponse.status}, result=`, JSON.stringify(emailResult));
            
            if (!emailResponse.ok) {
              throw new Error(emailResult.message || 'Erro ao enviar email');
            }
            sendSuccess = true;
            break;

          case 'push':
            console.log(`📲 Enviando push notification para ${reminder.email}...`);
            
            // Buscar token de push do usuário
            const { data: pushTokenData, error: tokenError } = await supabase
              .from('push_tokens')
              .select('endpoint, p256dh, auth')
              .eq('user_id', reminder.user_id)
              .single();

            if (tokenError || !pushTokenData) {
              throw new Error('Token de push não encontrado para este usuário');
            }

            // Preparar payload da notificação
            const displayName = reminder.nickname || reminder.full_name;
            // Personalizar título e corpo baseado na urgência
            let notificationTitle = '';
            let notificationBody = '';
            const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reminder.amount);
            
            if (reminder.days_before === 0) {
              notificationTitle = '🚨 URGENTE - Vence HOJE!';
              notificationBody = `${displayName}, não esqueça: ${reminder.description} - ${formattedAmount}`;
            } else if (reminder.days_before === 1) {
              notificationTitle = '⏰ Vence AMANHÃ!';
              notificationBody = `${displayName}, prepare-se: ${reminder.description} - ${formattedAmount}`;
            } else if (reminder.days_before <= 3) {
              notificationTitle = '📅 Vence em breve';
              notificationBody = `${displayName}, em ${reminder.days_before} dias: ${reminder.description} - ${formattedAmount}`;
            } else if (reminder.days_before <= 7) {
              notificationTitle = '🔔 Lembrete Ana Clara';
              notificationBody = `${displayName}, em ${reminder.days_before} dias você tem: ${reminder.description} - ${formattedAmount}`;
            } else {
              notificationTitle = '📝 Planejamento Financeiro';
              notificationBody = `${displayName}, daqui ${reminder.days_before} dias: ${reminder.description} - ${formattedAmount}`;
            }

            const pushPayload = {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon-512.png',
              badge: '/icon-192.png',
              image: '/icon-512.png', // Imagem grande
              tag: `bill-${reminder.bill_id}`,
              requireInteraction: true,
              vibrate: [500, 200, 500, 200, 500, 200, 500], // Vibração mais longa
              silent: false,
              renotify: true,
              // Força prioridade alta no Android
              priority: 'high',
              urgency: 'high',
              data: {
                bill_id: reminder.bill_id,
                reminder_id: reminder.id,
                url: '/contas-pagar',
                priority: 'high', // Força prioridade
              },
              actions: [
                {
                  action: 'view',
                  title: '👁️ Ver Conta',
                  icon: '/icon-192.png'
                },
                {
                  action: 'dismiss',
                  title: '✖️ Dispensar',
                  icon: '/icon-192.png'
                }
              ]
            };

            // Enviar push notification via Web Push API
            const webPushResponse = await sendWebPush(
              pushTokenData.endpoint,
              pushTokenData.p256dh,
              pushTokenData.auth,
              pushPayload
            );

            if (!webPushResponse.success) {
              throw new Error(webPushResponse.error || 'Falha ao enviar push notification');
            }

            console.log(`✅ Push notification enviado com sucesso`);
            sendSuccess = true;
            break;

          default:
            throw new Error(`Canal desconhecido: ${reminder.channel}`);
        }

        if (sendSuccess) {
          // ATUALIZAR STATUS: SENT
          const { error: sentErr } = await supabase.rpc('mark_reminder_sent', {
            p_reminder_id: reminder.id,
          });
          if (sentErr) {
            throw new Error(`Falha ao atualizar status (sent): ${sentErr.message}`);
          }

          console.log(`✅ Lembrete ${reminder.id} (${reminder.channel}) enviado com sucesso`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`❌ Erro ao enviar lembrete ${reminder.id} (${reminder.channel}):`, error.message);

        // ATUALIZAR STATUS: FAILED
        await supabase.rpc('mark_reminder_failed', {
          p_reminder_id: reminder.id,
          p_error_message: String(error.message || 'Erro desconhecido'),
        });

        failCount++;
      }
    }

    // 6. RETORNAR RESULTADO
    console.log(`✅ Processamento concluído: ${successCount} enviados, ${failCount} falhas`);
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: reminders.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro geral:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ==================== HELPERS ====================

function formatWhatsAppMessage(reminder: BillReminder): string {
  const { full_name, nickname, days_before, description, amount, due_date, provider_name } = reminder;
  const displayName = nickname || full_name;

  // Determinar texto do lembrete
  let reminderText = '';
  if (days_before === 0) {
    reminderText = '🔴 HOJE';
  } else if (days_before === 1) {
    reminderText = '🟡 Amanhã';
  } else {
    reminderText = `🟢 Daqui ${days_before} dias`;
  }

  // Formatar valor
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  // Formatar data
  const formattedDate = new Date(due_date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Montar mensagem
  return `
━━━━━━━━━━━━━━━━━━━
🔔 *Lembrete Ana Clara*

Olá ${displayName}! 👋

${reminderText} você tem uma conta a pagar:

📄 *${description}*
💰 Valor: *${formattedAmount}*
📅 Vencimento: *${formattedDate}*
${provider_name ? `🏢 Fornecedor: ${provider_name}` : ''}

⏰ *Não esqueça!*
━━━━━━━━━━━━━━━━━━━
💡 _Responda "pago" para marcar como paga_
━━━━━━━━━━━━━━━━━━━
`.trim();
}

function formatEmailHtml(reminder: BillReminder): string {
  const { full_name, nickname, days_before, description, amount, due_date, provider_name } = reminder;
  const displayName = nickname || full_name;

  // Determinar texto do lembrete
  let reminderText = '';
  let reminderColor = '';
  if (days_before === 0) {
    reminderText = '🔴 HOJE';
    reminderColor = '#ef4444';
  } else if (days_before === 1) {
    reminderText = '🟡 Amanhã';
    reminderColor = '#f59e0b';
  } else {
    reminderText = `🟢 Daqui ${days_before} dias`;
    reminderColor = '#22c55e';
  }

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  const formattedDate = new Date(due_date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Conta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                Lembrete Ana Clara
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Olá <strong>${displayName}</strong>! 👋
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid ${reminderColor}; padding: 16px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">
                  ${reminderText} você tem uma conta a pagar
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>Descrição:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${description}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Valor:</td>
                        <td style="color: #111827; font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Vencimento:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                      </tr>
                      ${provider_name ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Fornecedor:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${provider_name}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://personalfinance.la/contas-pagar" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ver Conta no App
                </a>
              </div>
              
              <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><strong>Não esqueça!</strong> Evite juros e multas pagando em dia.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Este é um lembrete automático do <strong>Personal Finance LA</strong><br>
                Você está recebendo porque configurou lembretes para suas contas
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function cleanPhone(phone: string): string {
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, '');
  
  // Se tem 13 dígitos (55 + DDD + número), retorna
  if (cleaned.length === 13) {
    return cleaned;
  }
  
  // Se tem 11 dígitos (DDD + número), adiciona 55
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  // Se tem 12 dígitos (começa com 0), remove o 0 e adiciona 55
  if (cleaned.length === 12 && cleaned.startsWith('0')) {
    return '55' + cleaned.substring(1);
  }
  
  // Caso contrário, retorna como está
  return cleaned;
}

/**
 * Envia push notification via Web Push API
 */
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPrivateKey || !vapidSubject) {
      return { success: false, error: 'VAPID keys não configuradas' };
    }

    // Importar biblioteca web-push
    const webpush = await import('npm:web-push@3.6.6');
    
    // Configurar VAPID
    const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || '';
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Criar subscription object
    const pushSubscription = {
      endpoint: endpoint,
      keys: {
        p256dh: p256dh,
        auth: auth,
      },
    };

    // Enviar notificação
    const result = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24 horas
        contentEncoding: 'aes128gcm'
      }
    );

    console.log('✅ Push enviado:', result.statusCode);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao enviar push:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Converte base64 URL-safe para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
