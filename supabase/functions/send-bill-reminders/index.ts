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
  full_name: string;
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

    // 4. CONFIGURAR UAZAPI (compatibilidade com nomes antigos)
    const uazapiBaseUrl = (payload?.uazapi?.baseUrl || (globalThis as any).Deno?.env.get('UAZAPI_BASE_URL') || (globalThis as any).Deno?.env.get('UAZAPI_SERVER_URL') || 'https://api.uazapi.com').replace(/\/$/, '');
    const uazapiInstanceId = payload?.uazapi?.instanceId || (globalThis as any).Deno?.env.get('UAZAPI_INSTANCE_ID') || (globalThis as any).Deno?.env.get('UAZAPI_INSTANCE_TOKEN');
    const uazapiApiKey = payload?.uazapi?.apiKey || (globalThis as any).Deno?.env.get('UAZAPI_API_KEY') || (globalThis as any).Deno?.env.get('UAZAPI_INSTANCE_TOKEN');

    if (!uazapiInstanceId || !uazapiApiKey) {
      console.error('❌ Credenciais UAZAPI não configuradas');
      return new Response(
        JSON.stringify({ error: 'UAZAPI credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. PROCESSAR CADA LEMBRETE
    let successCount = 0;
    let failCount = 0;

    for (const reminder of reminders as BillReminder[]) {
      try {
        console.log(`📤 Processando lembrete ${reminder.id} para ${reminder.full_name}`);

        // 5.1. FORMATAR MENSAGEM
        const message = formatWhatsAppMessage(reminder);

        // 5.2. ENVIAR VIA UAZAPI
        const phone = cleanPhone(reminder.phone);
        
        // Endpoint correto conforme documentação UAZAPI
        const uazapiUrl = `${uazapiBaseUrl}/send/text`;
        
        const response = await fetch(uazapiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': uazapiApiKey,  // Header correto da documentação
          },
          body: JSON.stringify({
            number: phone,  // Campo 'number' conforme documentação
            text: message,  // Campo 'text' conforme documentação
          }),
        });

        const result = await response.json().catch(() => ({ success: response.ok }));
        
        console.log(`📊 UAZAPI Response: status=${response.status}, ok=${response.ok}, result=`, JSON.stringify(result));

        if (response.ok) {
          // 5.3. ATUALIZAR STATUS: SENT via RPC SECURITY DEFINER
          const { error: sentErr } = await supabase.rpc('mark_reminder_sent', {
            p_reminder_id: reminder.id,
          });
          if (sentErr) {
            throw new Error(`Falha ao atualizar status (sent): ${sentErr.message}`);
          }

          console.log(`✅ Lembrete ${reminder.id} enviado com sucesso`);
          successCount++;
        } else {
          throw new Error(result.error || 'Erro desconhecido do UAZAPI');
        }
      } catch (error: any) {
        console.error(`❌ Erro ao enviar lembrete ${reminder.id}:`, error.message);

        // 5.4. ATUALIZAR STATUS: FAILED via RPC SECURITY DEFINER (incrementa retry_count)
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
  const { full_name, days_before, description, amount, due_date, provider_name } = reminder;

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

Olá ${full_name}! 👋

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
