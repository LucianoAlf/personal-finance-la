/**
 * EDGE FUNCTION: webhook-uazapi
 * Responsabilidade: Receber webhooks da UAZAPI (eventos de conexão e mensagens)
 * 
 * Eventos suportados:
 * - qr_scanned: QR Code escaneado com sucesso
 * - connection_update: Status da conexão mudou
 * - message_received: Nova mensagem recebida
 * - connection_closed: Conexão desconectada
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UAZAPI_INSTANCE_ID = Deno.env.get('UAZAPI_INSTANCE_ID')!;

interface WebhookPayload {
  event: string;
  instance_id?: string;
  data?: any;
  phone?: string;
  status?: string;
  message?: any;
  from?: string;
  timestamp?: number;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-UAZAPI-Signature',
      },
    });
  }

  try {
    console.log('[webhook-uazapi] 🎯 Webhook recebido');
    console.log('[webhook-uazapi] Method:', req.method);
    console.log('[webhook-uazapi] Headers:', Object.fromEntries(req.headers.entries()));
    
    const payload: WebhookPayload = await req.json();
    console.log('[webhook-uazapi] Event:', payload.event);
    console.log('[webhook-uazapi] Payload:', JSON.stringify(payload).substring(0, 200));

    // Validar instance_id
    if (payload.instance_id && payload.instance_id !== UAZAPI_INSTANCE_ID) {
      console.warn('[webhook-uazapi] Instance ID inválido');
      return new Response(
        JSON.stringify({ error: 'Invalid instance ID' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Processar evento baseado no tipo
    switch (payload.event) {
      case 'qr_scanned':
      case 'connection_update':
        await handleConnectionUpdate(supabase, payload);
        break;

      case 'message_received':
      case 'messages.upsert':
        await handleMessageReceived(supabase, payload);
        break;

      case 'connection_closed':
      case 'connection_lost':
        await handleConnectionClosed(supabase, payload);
        break;

      default:
        console.log(`[webhook-uazapi] Evento não tratado: ${payload.event}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: payload.event }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('[webhook-uazapi] ❌ Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Atualizar status de conexão
 */
async function handleConnectionUpdate(supabase: any, payload: WebhookPayload) {
  console.log('[webhook-uazapi] Atualizando conexão...');

  const isConnected = payload.status === 'open' || payload.event === 'qr_scanned';
  const phoneNumber = payload.phone || payload.data?.phone || null;

  // Buscar qual usuário tem essa instância
  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('instance_id', UAZAPI_INSTANCE_ID)
    .single();

  if (!connection) {
    console.warn('[webhook-uazapi] Nenhuma conexão encontrada para esta instância');
    return;
  }

  const updateData: any = {
    is_connected: isConnected,
    updated_at: new Date().toISOString(),
  };

  if (isConnected) {
    updateData.connected_at = new Date().toISOString();
    updateData.phone_number = phoneNumber;
  } else {
    updateData.disconnected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('whatsapp_connections')
    .update(updateData)
    .eq('user_id', connection.user_id);

  if (error) {
    console.error('[webhook-uazapi] Erro ao atualizar conexão:', error);
    throw error;
  }

  console.log(`[webhook-uazapi] ✅ Conexão atualizada - Connected: ${isConnected}`);
}

/**
 * Processar mensagem recebida
 */
async function handleMessageReceived(supabase: any, payload: WebhookPayload) {
  console.log('[webhook-uazapi] Processando mensagem recebida...');

  const message = payload.message || payload.data;
  
  if (!message) {
    console.warn('[webhook-uazapi] Mensagem vazia');
    return;
  }

  // Buscar user_id pela instância
  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('instance_id', UAZAPI_INSTANCE_ID)
    .single();

  if (!connection) {
    console.warn('[webhook-uazapi] Usuário não encontrado');
    return;
  }

  // Preparar dados da mensagem
  const messageData = {
    user_id: connection.user_id,
    whatsapp_message_id: message.id || message.key?.id,
    phone_number: message.from || payload.from,
    message_type: message.type || 'text',
    direction: 'inbound' as const,
    content: message.body || message.text || message.caption || '',
    media_url: message.media_url || message.mediaUrl || null,
    media_mime_type: message.mime_type || message.mimetype || null,
    processing_status: 'pending' as const,
    received_at: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
    metadata: message,
  };

  // Salvar mensagem
  const { data: savedMessage, error: saveError } = await supabase
    .from('whatsapp_messages')
    .insert(messageData)
    .select()
    .single();

  if (saveError) {
    console.error('[webhook-uazapi] Erro ao salvar mensagem:', saveError);
    throw saveError;
  }

  console.log(`[webhook-uazapi] ✅ Mensagem salva: ${savedMessage.id}`);

  // Processar mensagem de forma assíncrona
  try {
    const { error: invokeError } = await supabase.functions.invoke('process-whatsapp-message', {
      body: {
        message_id: savedMessage.id,
        user_id: connection.user_id,
      },
    });

    if (invokeError) {
      console.error('[webhook-uazapi] Erro ao processar mensagem:', invokeError);
    } else {
      console.log('[webhook-uazapi] ✅ Mensagem enviada para processamento');
    }
  } catch (error) {
    console.error('[webhook-uazapi] Erro ao invocar process-whatsapp-message:', error);
  }
}

/**
 * Tratar desconexão
 */
async function handleConnectionClosed(supabase: any, payload: WebhookPayload) {
  console.log('[webhook-uazapi] Conexão fechada');

  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('instance_id', UAZAPI_INSTANCE_ID)
    .single();

  if (!connection) {
    console.warn('[webhook-uazapi] Conexão não encontrada');
    return;
  }

  const { error } = await supabase
    .from('whatsapp_connections')
    .update({
      is_connected: false,
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id);

  if (error) {
    console.error('[webhook-uazapi] Erro ao atualizar desconexão:', error);
    throw error;
  }

  console.log('[webhook-uazapi] ✅ Desconexão registrada');
}
