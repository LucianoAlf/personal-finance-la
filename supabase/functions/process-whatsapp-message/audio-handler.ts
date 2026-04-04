// ============================================
// AUDIO HANDLER - Transcrição de Áudio via UAZAPI + Whisper
// ============================================
// 
// Fluxo:
// 1. Usuário envia áudio PTT no WhatsApp
// 2. UAZAPI recebe e envia webhook
// 3. index.ts detecta: messageType="media" && mediaType="ptt"
// 4. Chama POST /message/download com transcribe: true
// 5. UAZAPI baixa áudio + envia para Whisper (OpenAI)
// 6. Recebe texto transcrito
// 7. Retorna texto para processamento normal
// 
// ============================================

// ============================================
// TIPOS
// ============================================

export interface AudioPayload {
  message?: {
    type?: string;
    messageType?: string;
    mediaType?: string;
    messageid?: string;
    id?: string;
    key?: { id?: string };
    content?: {
      URL?: string;
      mimetype?: string;
      PTT?: boolean;
      seconds?: number;
      fileLength?: number;
    };
  };
  chat?: {
    phone?: string;
  };
  data?: {
    message?: {
      type?: string;
      mediaType?: string;
      id?: string;
    };
  };
}

export interface TranscricaoResult {
  success: boolean;
  texto?: string;
  duracao?: number;
  erro?: string;
}

// ============================================
// DETECTAR SE É ÁUDIO PTT
// ============================================

/**
 * Detecta se a mensagem é um áudio PTT (Push-to-Talk)
 */
export function isAudioPTT(payload: AudioPayload, messageType: string, messageData: Record<string, unknown>): boolean {
  // Verificar via messageType normalizado
  if (messageType === 'audio' || messageType === 'ptt') {
    return true;
  }
  
  // Verificar via payload.message
  const msgType = payload.message?.type || payload.message?.messageType;
  const mediaType = payload.message?.mediaType;
  
  if (msgType === 'ptt' || msgType === 'audio') {
    return true;
  }
  
  if ((msgType === 'media' || msgType === 'document') && (mediaType === 'ptt' || mediaType === 'audio')) {
    return true;
  }
  
  // Verificar via messageData
  const dataType = messageData.type as string | undefined;
  const dataMediaType = messageData.mediaType as string | undefined;
  
  if (dataType === 'ptt' || dataType === 'audio') {
    return true;
  }
  
  if (dataMediaType === 'ptt' || dataMediaType === 'audio') {
    return true;
  }
  
  // Verificar via payload.data (formato alternativo UAZAPI)
  const dataMsg = payload.data?.message;
  if (dataMsg?.type === 'ptt' || dataMsg?.type === 'audio' || dataMsg?.mediaType === 'ptt') {
    return true;
  }
  
  return false;
}

// ============================================
// EXTRAIR MESSAGE ID DO PAYLOAD
// ============================================

/**
 * Extrai o ID da mensagem do payload (necessário para download)
 */
export function extrairMessageId(payload: AudioPayload, messageData: Record<string, unknown>): string | null {
  // Tentar várias fontes
  return (
    payload.message?.messageid ||
    payload.message?.id ||
    payload.message?.key?.id ||
    payload.data?.message?.id ||
    (messageData.messageid as string) ||
    (messageData.id as string) ||
    (messageData.key as { id?: string })?.id ||
    null
  );
}

// ============================================
// PROCESSAR ÁUDIO PTT
// ============================================

/**
 * Processa mensagem de áudio PTT via UAZAPI + Whisper
 * 
 * @param payload - Payload do webhook UAZAPI
 * @param messageId - ID da mensagem WhatsApp
 * @returns Texto transcrito ou null se falhar
 */
export async function processarAudioPTT(
  payload: AudioPayload,
  messageId: string
): Promise<TranscricaoResult> {
  
  const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL');
  const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') || Deno.env.get('UAZAPI_INSTANCE_TOKEN');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  const duracao = payload.message?.content?.seconds || 0;
  const tamanho = payload.message?.content?.fileLength || 0;
  
  console.log('🎤 ========== PROCESSANDO ÁUDIO ==========');
  console.log('🎤 MessageId:', messageId);
  console.log('🎤 Duração:', duracao, 'segundos');
  console.log('🎤 Tamanho:', tamanho, 'bytes');
  
  // Validar configuração
  if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
    console.error('❌ UAZAPI não configurada');
    return { success: false, erro: 'UAZAPI não configurada' };
  }
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada (necessária para Whisper)');
    return { success: false, erro: 'OpenAI API Key não configurada' };
  }
  
  try {
    console.log('📥 Solicitando transcrição via UAZAPI + Whisper...');
    console.log('📥 Endpoint:', `${UAZAPI_BASE_URL}/message/download`);
    
    // ============================================================
    // ✨ PONTO CHAVE: UAZAPI faz download + transcrição via Whisper
    // ============================================================
    const response = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        id: messageId,              // ID da mensagem (não URL!)
        transcribe: true,           // ← Ativa transcrição Whisper
        openai_apikey: OPENAI_API_KEY,  // ← Chave OpenAI
        return_base64: false,
        return_link: false,
      })
    });
    
    console.log('📥 Status HTTP:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ UAZAPI error:', response.status, errorText);
      return { success: false, erro: `UAZAPI error: ${response.status} - ${errorText}` };
    }
    
    const result = await response.json();
    console.log('📥 Resposta UAZAPI:', JSON.stringify(result));
    
    const texto = result.transcription || result.text || '';
    
    if (!texto || texto.trim() === '') {
      console.warn('⚠️ Transcrição vazia retornada pela UAZAPI');
      return { success: false, erro: 'Transcrição vazia' };
    }
    
    console.log('✅ Transcrição concluída!');
    console.log('📝 Texto:', texto);
    console.log('🎤 ========== FIM PROCESSAMENTO ÁUDIO ==========');
    
    return {
      success: true,
      texto: texto.trim(),
      duracao: duracao
    };
    
  } catch (error) {
    console.error('💥 Erro ao processar áudio:', error);
    return { success: false, erro: (error as Error).message };
  }
}

// ============================================
// EXTRAIR INFORMAÇÕES DO ÁUDIO
// ============================================

export function extrairInfoAudio(payload: AudioPayload): { duracao: number; tamanho: number; mimetype: string } {
  return {
    duracao: payload.message?.content?.seconds || 0,
    tamanho: payload.message?.content?.fileLength || 0,
    mimetype: payload.message?.content?.mimetype || 'audio/ogg'
  };
}
