/**
 * EDGE FUNCTION: process-whatsapp-message
 * Responsabilidade: Processar mensagens recebidas do WhatsApp via webhook UAZAPI
 * 
 * Fluxo:
 * 1. Recebe webhook do UAZAPI
 * 2. Identifica usuário pelo número de telefone
 * 3. Detecta intenção da mensagem (LLM)
 * 4. Processa conforme intenção (transaction, command, conversation)
 * 5. Gera resposta apropriada
 * 6. Envia resposta via WhatsApp
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN')!;
const UAZAPI_INSTANCE_ID = Deno.env.get('UAZAPI_INSTANCE_ID')!;

interface UazapiWebhookPayload {
  event: string;
  instance_id: string;
  data: {
    from: string;
    to: string;
    message: {
      type: string;
      text?: string;
      media?: {
        url: string;
        mimetype: string;
      };
    };
  };
}

serve(async (req) => {
  // CORS headers
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
    
    // Parse webhook payload
    const payload: UazapiWebhookPayload = await req.json();
    
    console.log('📱 Webhook recebido:', payload.event);
    
    // Validar evento
    if (payload.event !== 'message') {
      return new Response(
        JSON.stringify({ success: true, message: 'Evento ignorado' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { from, message } = payload.data;
    const phoneNumber = from.replace('@s.whatsapp.net', '');
    
    // Buscar usuário pelo número de telefone
    const { data: connectionData, error: connectionError } = await supabase
      .from('whatsapp_connection_status')
      .select('user_id')
      .eq('phone_number', phoneNumber)
      .eq('is_connected', true)
      .single();
    
    if (connectionError || !connectionData) {
      console.error('❌ Usuário não encontrado para número:', phoneNumber);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = connectionData.user_id;
    
    // Salvar mensagem recebida
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        message_type: message.type,
        direction: 'inbound',
        content: message.text,
        media_url: message.media?.url,
        media_mime_type: message.media?.mimetype,
        processing_status: 'pending',
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Erro ao salvar mensagem:', saveError);
      throw saveError;
    }
    
    console.log('✅ Mensagem salva:', savedMessage.id);
    
    // Processar mensagem de forma assíncrona
    // (não bloquear resposta do webhook)
    processMessageAsync(supabase, savedMessage.id, userId, message);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: savedMessage.id,
        status: 'processing'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Processa mensagem de forma assíncrona
 */
async function processMessageAsync(
  supabase: any,
  messageId: string,
  userId: string,
  message: any
) {
  try {
    // Atualizar status para "processing"
    await supabase
      .from('whatsapp_messages')
      .update({ processing_status: 'processing' })
      .eq('id', messageId);
    
    let content = message.text;
    let intent = 'unknown';
    let responseText = '';
    
    // Se for áudio, transcrever primeiro
    if (message.type === 'audio' && message.media?.url) {
      const transcription = await transcribeAudio(message.media.url);
      if (transcription.success) {
        content = transcription.text;
      } else {
        throw new Error('Falha ao transcrever áudio');
      }
    }
    
    // Se for imagem, extrair dados
    if (message.type === 'image' && message.media?.url) {
      const extraction = await extractReceiptData(message.media.url);
      if (extraction.success) {
        intent = 'transaction';
        // Processar como lançamento
        const result = await processTransaction(supabase, userId, extraction.data);
        responseText = result.message;
      } else {
        throw new Error('Falha ao extrair dados da imagem');
      }
    }
    
    // Se for texto, detectar intenção
    if (message.type === 'text' && content) {
      const intentResult = await detectIntent(supabase, userId, content);
      intent = intentResult.intent;
      
      // Processar conforme intenção
      if (intent === 'quick_command') {
        const commandResult = await executeQuickCommand(supabase, userId, content);
        responseText = commandResult.message;
      } else if (intent === 'transaction') {
        const transactionResult = await processTransaction(supabase, userId, intentResult.extracted_data);
        responseText = transactionResult.message;
      } else if (intent === 'conversation') {
        const conversationResult = await chatWithAna(supabase, userId, content);
        responseText = conversationResult.message;
      } else {
        responseText = 'Desculpe, não entendi. Digite "ajuda" para ver os comandos disponíveis.';
      }
    }
    
    // Enviar resposta via WhatsApp
    await sendWhatsAppMessage(supabase, userId, responseText);
    
    // Atualizar mensagem como concluída
    await supabase
      .from('whatsapp_messages')
      .update({
        processing_status: 'completed',
        intent,
        response_text: responseText,
        response_sent_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      })
      .eq('id', messageId);
    
    console.log('✅ Mensagem processada com sucesso:', messageId);
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    
    // Atualizar como falha
    await supabase
      .from('whatsapp_messages')
      .update({
        processing_status: 'failed',
        error_message: error.message,
        retry_count: supabase.from('whatsapp_messages').select('retry_count').eq('id', messageId).single().data.retry_count + 1,
      })
      .eq('id', messageId);
  }
}

/**
 * Detecta intenção da mensagem usando LLM
 */
async function detectIntent(supabase: any, userId: string, content: string) {
  // Buscar configuração de IA do usuário
  const { data: aiConfig } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_validated', true)
    .single();
  
  if (!aiConfig) {
    // Fallback: usar comando rápido se começar com palavra-chave
    const commands = ['saldo', 'resumo', 'contas', 'meta', 'investimentos', 'cartões', 'ajuda', 'relatório'];
    const firstWord = content.toLowerCase().split(' ')[0];
    
    if (commands.includes(firstWord)) {
      return { intent: 'quick_command', extracted_data: null };
    }
    
    return { intent: 'conversation', extracted_data: null };
  }
  
  // TODO: Chamar LLM para detectar intenção
  // Por ora, retornar lógica simples
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('gastei') || lowerContent.includes('paguei') || lowerContent.includes('recebi')) {
    return { intent: 'transaction', extracted_data: null };
  }
  
  const commands = ['saldo', 'resumo', 'contas', 'meta', 'investimentos', 'cartões', 'ajuda', 'relatório'];
  if (commands.some(cmd => lowerContent.startsWith(cmd))) {
    return { intent: 'quick_command', extracted_data: null };
  }
  
  return { intent: 'conversation', extracted_data: null };
}

/**
 * Executa comando rápido
 */
async function executeQuickCommand(supabase: any, userId: string, content: string) {
  // Chamar Edge Function execute-quick-command
  const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-quick-command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ user_id: userId, command: content }),
  });
  
  return await response.json();
}

/**
 * Processa lançamento de transação
 */
async function processTransaction(supabase: any, userId: string, extractedData: any) {
  // Chamar Edge Function categorize-transaction
  const response = await fetch(`${SUPABASE_URL}/functions/v1/categorize-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ user_id: userId, data: extractedData }),
  });
  
  return await response.json();
}

/**
 * Chat com Ana Clara
 */
async function chatWithAna(supabase: any, userId: string, content: string) {
  // TODO: Implementar chat com Ana Clara
  return {
    success: true,
    message: 'Olá! Sou a Ana Clara, sua assistente financeira. Como posso ajudar?',
  };
}

/**
 * Transcreve áudio usando Whisper API
 */
async function transcribeAudio(audioUrl: string) {
  // Chamar Edge Function transcribe-audio
  const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  });
  
  return await response.json();
}

/**
 * Extrai dados de nota fiscal usando Vision API
 */
async function extractReceiptData(imageUrl: string) {
  // Chamar Edge Function extract-receipt-data
  const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-receipt-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  
  return await response.json();
}

/**
 * Envia mensagem via WhatsApp
 */
async function sendWhatsAppMessage(supabase: any, userId: string, content: string) {
  // Buscar número do usuário
  const { data: connection } = await supabase
    .from('whatsapp_connection_status')
    .select('phone_number')
    .eq('user_id', userId)
    .single();
  
  if (!connection) {
    throw new Error('Conexão WhatsApp não encontrada');
  }
  
  // Enviar via UAZAPI
  const response = await fetch(`https://api.uazapi.com/v1/instances/${UAZAPI_INSTANCE_ID}/messages/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${UAZAPI_TOKEN}`,
    },
    body: JSON.stringify({
      to: `${connection.phone_number}@s.whatsapp.net`,
      text: content,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Falha ao enviar mensagem WhatsApp');
  }
  
  // Atualizar estatísticas
  await supabase
    .from('whatsapp_connection_status')
    .update({
      total_messages_sent: supabase.raw('total_messages_sent + 1'),
      last_message_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  
  return await response.json();
}
