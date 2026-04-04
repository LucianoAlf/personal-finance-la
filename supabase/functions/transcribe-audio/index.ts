/**
 * EDGE FUNCTION: transcribe-audio
 * Responsabilidade: Transcrever áudio para texto usando OpenAI Whisper API
 * 
 * Fluxo:
 * 1. Recebe URL do áudio
 * 2. Faz download do áudio
 * 3. Converte para MP3 se necessário
 * 4. Envia para Whisper API
 * 5. Retorna texto transcrito
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDefaultAIConfig } from '../_shared/ai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TranscribeRequest {
  audio_url: string;
  audio_format?: string;
  language?: string;
  user_id?: string;
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
    const { audio_url, audio_format, language, user_id }: TranscribeRequest = await req.json();
    
    console.log('🎙️ Transcrevendo áudio:', audio_url);
    
    // Download do áudio
    const audioResponse = await fetch(audio_url);
    
    if (!audioResponse.ok) {
      throw new Error('Falha ao baixar áudio');
    }
    
    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    
    // Determinar formato
    const format = audio_format || detectAudioFormat(audio_url);
    const filename = `audio.${format}`;
    
    // Resolver API Key: usar config do usuário se for OpenAI, senão fallback env
    let apiKeyToUse: string | undefined;
    if (user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const aiConfig = await getDefaultAIConfig(supabase, user_id);
        if (aiConfig && aiConfig.provider === 'openai' && aiConfig.apiKey) {
          apiKeyToUse = aiConfig.apiKey;
        }
      } catch (_) {}
    }
    if (!apiKeyToUse) {
      apiKeyToUse = Deno.env.get('OPENAI_API_KEY') || '';
    }

    if (!apiKeyToUse) {
      throw new Error('Nenhuma API Key disponível para OpenAI Whisper');
    }

    // Criar FormData para Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), filename);
    formData.append('model', 'whisper-1');
    formData.append('language', language || 'pt');
    formData.append('response_format', 'json');
    
    // Chamar Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyToUse}`,
      },
      body: formData,
    });
    
    if (!whisperResponse.ok) {
      const error = await whisperResponse.json();
      throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const result = await whisperResponse.json();
    
    console.log('✅ Áudio transcrito com sucesso');
    console.log('📝 Texto:', result.text);
    
    return new Response(
      JSON.stringify({
        success: true,
        text: result.text,
        language: result.language || language || 'pt',
        duration: result.duration,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao transcrever áudio:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Detecta formato do áudio pela URL
 */
function detectAudioFormat(url: string): string {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('.mp3')) return 'mp3';
  if (lowerUrl.includes('.ogg')) return 'ogg';
  if (lowerUrl.includes('.wav')) return 'wav';
  if (lowerUrl.includes('.m4a')) return 'm4a';
  if (lowerUrl.includes('.webm')) return 'webm';
  
  // Default para formato comum do WhatsApp
  return 'ogg';
}
