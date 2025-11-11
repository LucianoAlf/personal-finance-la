/**
 * EDGE FUNCTION: send-whatsapp-message
 * Responsabilidade: Enviar mensagem via WhatsApp usando UAZAPI
 * 
 * Suporta:
 * - Texto
 * - Imagem
 * - Áudio
 * - Documento
 * - Localização
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN')!;
const UAZAPI_INSTANCE_ID = Deno.env.get('UAZAPI_INSTANCE_ID')!;
const UAZAPI_BASE_URL = 'https://api.uazapi.com/v1';

interface SendMessageRequest {
  user_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'audio' | 'document' | 'location';
  media_url?: string;
  caption?: string;
  filename?: string;
  latitude?: number;
  longitude?: number;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: SendMessageRequest = await req.json();
    
    console.log(`📤 Enviando mensagem WhatsApp para usuário ${request.user_id}`);
    
    // Buscar número do usuário
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connection_status')
      .select('phone_number, is_connected')
      .eq('user_id', request.user_id)
      .single();
    
    if (connError || !connection) {
      throw new Error('Conexão WhatsApp não encontrada');
    }
    
    if (!connection.is_connected) {
      throw new Error('WhatsApp desconectado');
    }
    
    const phoneNumber = `${connection.phone_number}@s.whatsapp.net`;
    const messageType = request.message_type || 'text';
    
    // Enviar mensagem conforme tipo
    let uazapiResponse;
    
    switch (messageType) {
      case 'text':
        uazapiResponse = await sendTextMessage(phoneNumber, request.content);
        break;
      
      case 'image':
        uazapiResponse = await sendImageMessage(
          phoneNumber,
          request.media_url!,
          request.caption || request.content
        );
        break;
      
      case 'audio':
        uazapiResponse = await sendAudioMessage(phoneNumber, request.media_url!);
        break;
      
      case 'document':
        uazapiResponse = await sendDocumentMessage(
          phoneNumber,
          request.media_url!,
          request.filename || 'documento.pdf'
        );
        break;
      
      case 'location':
        uazapiResponse = await sendLocationMessage(
          phoneNumber,
          request.latitude!,
          request.longitude!
        );
        break;
      
      default:
        throw new Error(`Tipo de mensagem não suportado: ${messageType}`);
    }
    
    if (!uazapiResponse.success) {
      throw new Error(uazapiResponse.error || 'Falha ao enviar mensagem');
    }
    
    console.log('✅ Mensagem enviada com sucesso');
    
    // Salvar mensagem enviada no histórico
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: request.user_id,
        phone_number: connection.phone_number,
        message_type: messageType,
        direction: 'outbound',
        content: request.content,
        media_url: request.media_url,
        processing_status: 'completed',
        response_sent_at: new Date().toISOString(),
        metadata: {
          uazapi_message_id: uazapiResponse.message_id,
        },
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('⚠️ Erro ao salvar mensagem no histórico:', saveError);
    }
    
    // Atualizar estatísticas
    await supabase
      .from('whatsapp_connection_status')
      .update({
        total_messages_sent: supabase.raw('total_messages_sent + 1'),
        last_message_at: new Date().toISOString(),
      })
      .eq('user_id', request.user_id);
    
    return new Response(
      JSON.stringify({
        success: true,
        message_id: savedMessage?.id,
        uazapi_message_id: uazapiResponse.message_id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Envia mensagem de texto
 */
async function sendTextMessage(to: string, text: string) {
  const response = await fetch(
    `${UAZAPI_BASE_URL}/instances/${UAZAPI_INSTANCE_ID}/messages/text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({ to, text }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.message || 'UAZAPI error' };
  }
  
  const result = await response.json();
  return { success: true, message_id: result.message_id };
}

/**
 * Envia imagem
 */
async function sendImageMessage(to: string, imageUrl: string, caption?: string) {
  const response = await fetch(
    `${UAZAPI_BASE_URL}/instances/${UAZAPI_INSTANCE_ID}/messages/image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        image: { url: imageUrl },
        caption,
      }),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: 'Falha ao enviar imagem' };
  }
  
  const result = await response.json();
  return { success: true, message_id: result.message_id };
}

/**
 * Envia áudio
 */
async function sendAudioMessage(to: string, audioUrl: string) {
  const response = await fetch(
    `${UAZAPI_BASE_URL}/instances/${UAZAPI_INSTANCE_ID}/messages/audio`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        audio: { url: audioUrl },
      }),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: 'Falha ao enviar áudio' };
  }
  
  const result = await response.json();
  return { success: true, message_id: result.message_id };
}

/**
 * Envia documento
 */
async function sendDocumentMessage(to: string, documentUrl: string, filename: string) {
  const response = await fetch(
    `${UAZAPI_BASE_URL}/instances/${UAZAPI_INSTANCE_ID}/messages/document`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        document: { url: documentUrl },
        filename,
      }),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: 'Falha ao enviar documento' };
  }
  
  const result = await response.json();
  return { success: true, message_id: result.message_id };
}

/**
 * Envia localização
 */
async function sendLocationMessage(to: string, latitude: number, longitude: number) {
  const response = await fetch(
    `${UAZAPI_BASE_URL}/instances/${UAZAPI_INSTANCE_ID}/messages/location`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        location: { latitude, longitude },
      }),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: 'Falha ao enviar localização' };
  }
  
  const result = await response.json();
  return { success: true, message_id: result.message_id };
}
