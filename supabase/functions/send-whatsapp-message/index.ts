/**
 * EDGE FUNCTION: send-whatsapp-message
 * v7 - Corrigido: Token via variável de ambiente (não hardcoded)
 */ 
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuração UAZAPI via variáveis de ambiente (SEGURO)
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || Deno.env.get('UAZAPI_SERVER_URL') || 'https://lamusic.uazapi.com';
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') || Deno.env.get('UAZAPI_INSTANCE_TOKEN');

serve(async (req)=>{
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  try {
    // Validar configuração UAZAPI
    if (!UAZAPI_TOKEN) {
      console.error('❌ UAZAPI_TOKEN não configurado nas variáveis de ambiente');
      return new Response(JSON.stringify({
        success: false,
        error: 'UAZAPI_TOKEN não configurado. Configure via: supabase secrets set UAZAPI_TOKEN=seu_token'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = await req.json();
    console.log('📤 Enviando mensagem WhatsApp');
    console.log('📱 Destino:', request.phone_number);
    console.log('💬 Tipo:', request.message_type);
    console.log('📝 Preview:', request.content?.substring(0, 50) + '...');
    const phoneNumber = request.phone_number;
    const content = request.content;
    // Validação
    if (!phoneNumber || !content) {
      throw new Error('phone_number e content são obrigatórios');
    }
    // Formata número (remove caracteres não numéricos)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    console.log('🔄 Chamando UAZAPI...');
    console.log('📍 URL:', `${UAZAPI_BASE_URL}/send/text`);
    console.log('📞 Número limpo:', cleanPhone);
    // Envia via UAZAPI (especificação oficial)
    const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN // ✅ Header correto (não Bearer)
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: content // ✅ Campo 'text' (não 'message')
      })
    });
    const statusCode = response.status;
    console.log('📡 Status UAZAPI:', statusCode);
    // Processa resposta
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro UAZAPI:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch  {
        errorData = {
          message: errorText
        };
      }
      throw new Error(`UAZAPI ${statusCode}: ${errorData.message || errorData.error || errorText}`);
    }
    const result = await response.json();
    console.log('✅ Resposta UAZAPI:', JSON.stringify(result, null, 2));
    // Extrai ID da mensagem (estrutura pode variar)
    const messageId = result.key?.id || result.messageId || result.id || 'sent';
    console.log('✨ Mensagem enviada com sucesso! ID:', messageId);
    return new Response(JSON.stringify({
      success: true,
      message_id: messageId,
      phone: cleanPhone,
      uazapi_response: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    console.error('📚 Stack:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
