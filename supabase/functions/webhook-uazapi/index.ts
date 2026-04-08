/**
 * EDGE FUNCTION: webhook-uazapi
 * v9 - Corrigido para formato real da UAZAPI
 * 
 * Formato do Payload UAZAPI:
 * {
 *   EventType: string,
 *   token: string,
 *   message: { chatid, messageid, type, fromMe, sender, text?, content },
 *   chat: { phone, wa_chatid, wa_name }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildConnectedUpdate,
  buildDisconnectedUpdate,
} from '../_shared/whatsapp-connection-state.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UAZAPI_INSTANCE_TOKEN = Deno.env.get('UAZAPI_INSTANCE_TOKEN') || Deno.env.get('UAZAPI_TOKEN')!;

// Interface correta para UAZAPI
interface UazapiPayload {
  EventType?: string;
  event?: string;
  token?: string;
  owner?: string;
  message?: {
    chatid?: string;
    messageid?: string;
    type?: string;
    fromMe?: boolean;
    sender?: string;
    senderName?: string;
    messageTimestamp?: number;
    text?: string;
    content?: string | { text?: string; body?: string; selectedID?: string };
  };
  chat?: {
    phone?: string;
    wa_chatid?: string;
    wa_name?: string;
  };
  // Fallbacks para outros formatos
  data?: any;
  phone?: string;
  status?: string;
}

interface WhatsAppConnectionRow {
  user_id: string;
  instance_token?: string | null;
}

interface UazapiEnvConfig {
  UAZAPI_INSTANCE_TOKEN?: string;
  UAZAPI_TOKEN?: string;
  UAZAPI_API_KEY?: string;
}

export function getConnectionLookupToken(
  payload: Pick<UazapiPayload, 'token'>,
  fallbackToken?: string | null,
): string | null {
  return payload.token || fallbackToken || null;
}

export function getTranscriptionToken(
  connection: Pick<WhatsAppConnectionRow, 'instance_token'> | null | undefined,
  env: UazapiEnvConfig,
): string | null {
  return connection?.instance_token ||
    env.UAZAPI_INSTANCE_TOKEN ||
    env.UAZAPI_TOKEN ||
    env.UAZAPI_API_KEY ||
    null;
}

async function findConnectionForPayload(
  supabase: any,
  payload: UazapiPayload,
): Promise<WhatsAppConnectionRow | null> {
  const primaryToken = getConnectionLookupToken(payload, null);
  const fallbackToken = UAZAPI_INSTANCE_TOKEN || null;
  const candidateTokens = [primaryToken, fallbackToken]
    .filter((value, index, array): value is string =>
      Boolean(value) && array.indexOf(value) === index
    );

  for (const token of candidateTokens) {
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('user_id, instance_token')
      .eq('instance_token', token)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  return null;
}

// Função robusta para extrair texto (do Copiloto)
function extrairTextoMensagem(payload: UazapiPayload): string {
  const message = payload.message;
  if (!message) return "";

  const candidatos = [
    typeof message.content === 'string' ? message.content : null,
    message.text,
    (message as any).body,
    typeof message.content === 'object' ? message.content?.selectedID : null,
    typeof message.content === 'object' ? message.content?.text : null,
    typeof message.content === 'object' ? message.content?.body : null,
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === "string" && candidato.trim().length > 0) {
      return candidato.trim();
    }
  }

  return "";
}

export async function handleRequest(req: Request) {
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
    
    const payload: UazapiPayload = await req.json();
    
    // EventType (UAZAPI) ou event (fallback)
    const eventType = payload.EventType || payload.event || 'unknown';
    console.log('[webhook-uazapi] EventType:', eventType);
    console.log('[webhook-uazapi] Payload:', JSON.stringify(payload).substring(0, 500));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Processar evento baseado no tipo
    switch (eventType) {
      case 'connection':
      case 'qr_scanned':
      case 'connection_update':
        await handleConnectionUpdate(supabase, payload);
        break;

      case 'messages':
      case 'messages_update':
      case 'message_received':
      case 'messages.upsert':
        await handleMessageReceived(supabase, payload);
        break;

      case 'connection_closed':
      case 'connection_lost':
        await handleConnectionClosed(supabase, payload);
        break;

      default:
        console.log(`[webhook-uazapi] Evento não tratado: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: eventType }),
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
}

if (import.meta.main) {
  serve(handleRequest);
}

/**
 * Atualizar status de conexão
 */
async function handleConnectionUpdate(supabase: any, payload: UazapiPayload) {
  console.log('[webhook-uazapi] Atualizando conexão...');

  const eventType = payload.EventType || payload.event;
  const isConnected = payload.status === 'open' || eventType === 'qr_scanned' || eventType === 'connection';
  const phoneNumber = payload.chat?.phone || payload.phone || null;

  // Buscar qual usuário tem essa instância
  const connection = await findConnectionForPayload(supabase, payload);

  if (!connection) {
    console.warn('[webhook-uazapi] Nenhuma conexão encontrada para esta instância');
    return;
  }

  const now = new Date();
  const disconnectReason = String(
    payload.status || eventType || 'connection_update',
  );
  const updateData: Record<string, unknown> = isConnected
    ? (() => {
        const fragment = buildConnectedUpdate(phoneNumber ?? '', now);
        const out: Record<string, unknown> = { ...fragment };
        if (!phoneNumber) {
          delete out.phone_number;
        }
        return out;
      })()
    : { ...buildDisconnectedUpdate(disconnectReason, now) };

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
 * Processar mensagem recebida (formato UAZAPI)
 */
async function handleMessageReceived(supabase: any, payload: UazapiPayload) {
  console.log('[webhook-uazapi] Processando mensagem recebida...');
  console.log('[webhook-uazapi] 🔍 PAYLOAD COMPLETO:', JSON.stringify(payload).substring(0, 1000));

  const message = payload.message;
  
  if (!message) {
    console.warn('[webhook-uazapi] Mensagem vazia');
    return;
  }

  // Log detalhado do message
  console.log('[webhook-uazapi] 🔍 message.type:', message.type);
  console.log('[webhook-uazapi] 🔍 message.mediaType:', (message as any).mediaType);
  console.log('[webhook-uazapi] 🔍 message.messageType:', (message as any).messageType);

  // Ignorar mensagens enviadas por nós (fromMe)
  if (message.fromMe === true) {
    console.log('[webhook-uazapi] fromMe=true - ignorando');
    return;
  }

  // Extrair texto usando função robusta
  const messageBody = extrairTextoMensagem(payload) || '';
  console.log('[webhook-uazapi] Texto extraído:', messageBody ? messageBody.substring(0, 100) : '(vazio)');

  // Detectar tipo de mensagem (áudio, imagem, etc)
  const rawType = message.type || (message as any).messageType || 'text';
  const mediaType = (message as any).mediaType || '';
  const isAudio = rawType === 'ptt' || rawType === 'audio' || mediaType === 'ptt' || mediaType === 'audio';
  const isMedia = rawType === 'image' || rawType === 'video' || rawType === 'document' || rawType === 'media';
  
  // Mapear tipo para valores aceitos pelo ENUM (text, audio, image, video, document, contact, location)
  let msgType = rawType;
  if (rawType === 'media' || rawType === 'ptt') {
    if (mediaType === 'ptt' || mediaType === 'audio' || isAudio) {
      msgType = 'audio';
    } else if (mediaType === 'image') {
      msgType = 'image';
    } else if (mediaType === 'video') {
      msgType = 'video';
    } else if (mediaType === 'document') {
      msgType = 'document';
    } else {
      msgType = 'audio'; // fallback para mídia desconhecida
    }
  }
  
  console.log('[webhook-uazapi] rawType:', rawType, '| mediaType:', mediaType, '| msgType:', msgType, '| isAudio:', isAudio);

  // Permitir áudio mesmo sem texto (será transcrito depois)
  if (!messageBody && !isAudio && !isMedia) {
    console.log('[webhook-uazapi] Sem texto e não é mídia - ignorando');
    return;
  }

  // Extrair telefone (formato UAZAPI)
  const fromNumber = (
    payload.chat?.phone ||
    message.sender?.replace('@s.whatsapp.net', '').replace('@c.us', '') ||
    ''
  ).replace(/\D/g, '');

  console.log('[webhook-uazapi] Telefone:', fromNumber);

  if (!fromNumber) {
    console.warn('[webhook-uazapi] Telefone não encontrado');
    return;
  }

  // Buscar user_id pela instance_token
  const connection = await findConnectionForPayload(supabase, payload);

  if (!connection) {
    console.warn('[webhook-uazapi] Usuário não encontrado para token:', getConnectionLookupToken(payload, UAZAPI_INSTANCE_TOKEN));
    return;
  }

  console.log('[webhook-uazapi] User ID:', connection.user_id);

  // Verificar duplicata
  const messageId = message.messageid || message.chatid || `msg_${Date.now()}`;
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('whatsapp_message_id', messageId)
    .single();

  if (existing) {
    console.log('[webhook-uazapi] Duplicata - ignorando');
    return;
  }

  // ============================================================
  // 🎤 TRANSCREVER ÁUDIO VIA UAZAPI + WHISPER
  // ============================================================
  let finalContent = messageBody;
  
  if (isAudio && !messageBody) {
    console.log('🎤 Áudio detectado, iniciando transcrição...');
    console.log('🔑 messageId para transcrição:', messageId);
    
    const UAZAPI_BASE_URL = (
      Deno.env.get('UAZAPI_BASE_URL') ||
      Deno.env.get('UAZAPI_SERVER_URL') ||
      'https://api.uazapi.com'
    ).replace(/\/$/, '');
    const UAZAPI_TOKEN = getTranscriptionToken(connection, {
      UAZAPI_INSTANCE_TOKEN: Deno.env.get('UAZAPI_INSTANCE_TOKEN') || undefined,
      UAZAPI_TOKEN: Deno.env.get('UAZAPI_TOKEN') || undefined,
      UAZAPI_API_KEY: Deno.env.get('UAZAPI_API_KEY') || undefined,
    });
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔧 Env vars:', { 
      hasUrl: !!UAZAPI_BASE_URL, 
      hasToken: !!UAZAPI_TOKEN, 
      hasOpenAI: !!OPENAI_API_KEY 
    });
    
    if (UAZAPI_BASE_URL && UAZAPI_TOKEN && OPENAI_API_KEY) {
      try {
        console.log('📤 Chamando UAZAPI /message/download...');
        
        const transcribeResponse = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': UAZAPI_TOKEN,
          },
          body: JSON.stringify({
            id: messageId,
            transcribe: true,
            openai_apikey: OPENAI_API_KEY,
            return_base64: false,
            return_link: false,
          })
        });
        
        console.log('📡 UAZAPI status:', transcribeResponse.status);
        
        if (transcribeResponse.ok) {
          const result = await transcribeResponse.json();
          console.log('📝 Transcrição resultado:', JSON.stringify(result).substring(0, 500));
          
          if (result.transcription && result.transcription.trim()) {
            finalContent = result.transcription.trim();
            console.log('✅ Texto transcrito:', finalContent);
          } else {
            console.warn('⚠️ Transcrição vazia, usando placeholder');
            finalContent = '[ÁUDIO - transcrição vazia]';
          }
        } else {
          const errorText = await transcribeResponse.text();
          console.error('❌ UAZAPI erro:', transcribeResponse.status, errorText);
          finalContent = '[ÁUDIO - erro na transcrição]';
        }
      } catch (error) {
        console.error('❌ Erro ao transcrever:', error);
        finalContent = '[ÁUDIO - erro]';
      }
    } else {
      console.error('❌ Variáveis de ambiente faltando para transcrição');
      finalContent = '[ÁUDIO - config faltando]';
    }
  }

  // Preparar dados da mensagem
  const msgData = {
    user_id: connection.user_id,
    whatsapp_message_id: messageId,
    phone_number: fromNumber,
    message_type: msgType,
    direction: 'inbound' as const,
    content: finalContent || '[MÍDIA]',
    processing_status: 'pending' as const,
    received_at: message.messageTimestamp 
      ? new Date(
          // Se timestamp > 10 bilhões, já está em ms; senão, converter de segundos
          message.messageTimestamp > 10000000000 
            ? message.messageTimestamp 
            : message.messageTimestamp * 1000
        ).toISOString() 
      : new Date().toISOString(),
    metadata: { 
      senderName: message.senderName,
      chatid: message.chatid,
      raw: payload 
    },
  };

  // Salvar mensagem
  const { data: savedMessage, error: saveError } = await supabase
    .from('whatsapp_messages')
    .insert(msgData)
    .select()
    .single();

  if (saveError) {
    console.error('[webhook-uazapi] Erro ao salvar mensagem:', saveError);
    throw saveError;
  }

  console.log(`[webhook-uazapi] ✅ Mensagem salva: ${savedMessage.id}`);

  // Chamar process-whatsapp-message via fetch (mais confiável que invoke)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        message_id: savedMessage.id,
        user_id: connection.user_id,
        content: finalContent, // Texto transcrito se for áudio
        from_number: fromNumber,
        // Passar dados extras para áudio/mídia
        message_type: msgType,
        is_audio: isAudio,
        whatsapp_message_id: message.messageid,
      }),
    });

    if (response.ok) {
      console.log('[webhook-uazapi] ✅ Processada com sucesso');
    } else {
      const errorText = await response.text();
      console.error('[webhook-uazapi] Erro process:', response.status, errorText);
    }
  } catch (error) {
    console.error('[webhook-uazapi] Erro ao chamar process-whatsapp-message:', error);
  }
}

/**
 * Tratar desconexão
 */
async function handleConnectionClosed(supabase: any, payload: UazapiPayload) {
  console.log('[webhook-uazapi] Conexão fechada');

  const connection = await findConnectionForPayload(supabase, payload);

  if (!connection) {
    console.warn('[webhook-uazapi] Conexão não encontrada');
    return;
  }

  const { error } = await supabase
    .from('whatsapp_connections')
    .update({
      ...buildDisconnectedUpdate(
        String(payload.status || payload.EventType || payload.event || 'connection_closed'),
        new Date(),
      ),
    })
    .eq('user_id', connection.user_id);

  if (error) {
    console.error('[webhook-uazapi] Erro ao atualizar desconexão:', error);
    throw error;
  }

  console.log('[webhook-uazapi] ✅ Desconexão registrada');
}
