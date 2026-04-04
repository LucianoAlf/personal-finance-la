/**
 * EDGE FUNCTION: generate-qr-code
 * Responsabilidade: Gerar QR Code real via UAZAPI para conectar WhatsApp
 * 
 * Fluxo:
 * 1. Recebe user_id
 * 2. Chama UAZAPI para gerar QR Code
 * 3. Salva no banco com expiração
 * 4. Retorna QR Code para o frontend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UAZAPI_SERVER_URL = Deno.env.get('UAZAPI_SERVER_URL')!;
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL');
// Tentar múltiplos nomes de token (compatibilidade)
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') || Deno.env.get('UAZAPI_INSTANCE_TOKEN') || Deno.env.get('UAZAPI_API_KEY');
const UAZAPI_INSTANCE_ID = Deno.env.get('UAZAPI_INSTANCE_ID')!;

interface GenerateQRRequest {
  user_id: string;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, x-client-info',
      },
    });
  }

  try {
    console.log('[generate-qr-code] Iniciando...');
    console.log('[generate-qr-code] UAZAPI_SERVER_URL:', UAZAPI_SERVER_URL);
    console.log('[generate-qr-code] UAZAPI_BASE_URL:', UAZAPI_BASE_URL);
    console.log('[generate-qr-code] UAZAPI_INSTANCE_ID:', UAZAPI_INSTANCE_ID);
    console.log('[generate-qr-code] UAZAPI_TOKEN present:', !!UAZAPI_TOKEN);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: GenerateQRRequest = await req.json();
    
    if (!request.user_id) {
      throw new Error('user_id é obrigatório');
    }
    
    if (!UAZAPI_TOKEN) {
      throw new Error('UAZAPI_TOKEN não configurado');
    }

    console.log(`[generate-qr-code] Gerando QR Code para usuário: ${request.user_id}`);

    // 1. Buscar ou criar registro de conexão
    let { data: connection, error: fetchError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', request.user_id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Criar se não existir
      const { data: newConnection, error: createError } = await supabase
        .from('whatsapp_connections')
        .insert({
          user_id: request.user_id,
          instance_id: UAZAPI_INSTANCE_ID,
          instance_token: UAZAPI_TOKEN,
          connected: false,
          status: 'disconnected',
        })
        .select()
        .single();

      if (createError) throw createError;
      connection = newConnection;
    } else if (fetchError) {
      throw fetchError;
    }

    console.log('[generate-qr-code] Registro de conexão obtido');

    // 2. Chamar UAZAPI para gerar QR Code
    console.log('[generate-qr-code] Chamando UAZAPI...');

    const base = (UAZAPI_BASE_URL || UAZAPI_SERVER_URL || 'https://api.uazapi.com').replace(/\/$/, '');

    interface HeaderVariant {
      label: string;
      headers: Record<string, string>;
    }

    const headerVariants: HeaderVariant[] = [
      {
        label: 'token',
        headers: {
          token: String(UAZAPI_TOKEN),
          'Content-Type': 'application/json',
        },
      },
    ];

    const attempts: Array<{ url: string; method: string; status?: number; error?: string; variant: string }> = [];

    const connectPayloads = [{}, { phone: '' }];

    async function tryFetch(
      method: 'GET' | 'POST',
      path: string,
      variant: HeaderVariant,
      body?: Record<string, unknown>,
    ): Promise<{ data: unknown | null; status: number; raw: string | null }> {
      const url = `${base}${path}`;
      console.log(`[generate-qr-code] Tentando ${method} ${url} com headers ${variant.label}`);
      const response = await fetch(url, {
        method,
        headers: variant.headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      });
      const status = response.status;
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text ?? null;
      }
      if (!response.ok) {
        attempts.push({ url, method, status, error: text.slice(0, 300), variant: variant.label });
        return { data: null, status, raw: text };
      }
      return { data: parsed, status, raw: text };
    }

    function extractQrCandidate(payload: unknown): string | null {
      if (!payload) return null;
      if (typeof payload === 'string') {
        return payload.trim() ? payload : null;
      }
      if (typeof payload !== 'object') return null;
      const obj = payload as Record<string, unknown>;

      const fields = [
        obj.qrCode,
        obj.qr_code,
        obj.qrcode,
        obj.qr,
        obj.base64,
        obj.image,
        obj.image_base64,
        obj.qr_base64,
        obj.qrImage,
        obj.qr_image,
      ];

      for (const field of fields) {
        if (typeof field === 'string' && field.trim()) {
          return field;
        }
      }

      if (typeof obj.data === 'object' && obj.data) {
        const nested = extractQrCandidate(obj.data);
        if (nested) return nested;
      }

      if (typeof obj.instance === 'object' && obj.instance) {
        const nested = extractQrCandidate(obj.instance);
        if (nested) return nested;
      }

      if (typeof obj.status === 'object' && obj.status) {
        const nested = extractQrCandidate(obj.status);
        if (nested) return nested;
      }

      return null;
    }

    let qrPayload: string | null = null;
    let lastData: unknown = null;

    for (const variant of headerVariants) {
      for (const payloadVariant of connectPayloads) {
        const result = await tryFetch('POST', '/instance/connect', variant, payloadVariant);
        if (result.data) {
          lastData = result.data;
          const candidate = extractQrCandidate(result.data);
          if (candidate) {
            qrPayload = candidate;
            console.log(`[generate-qr-code] ✅ QR obtido diretamente do /instance/connect (${variant.label})`);
            break;
          }
        }
      }
      if (qrPayload) break;
    }

    if (!qrPayload) {
      console.log('[generate-qr-code] Nenhum QR direto. Consultando /instance/status...');
      for (const variant of headerVariants) {
        const statusPaths = [
          '/instance/status',
          `/instance/status?instance_id=${encodeURIComponent(UAZAPI_INSTANCE_ID)}`,
        ];

        for (const path of statusPaths) {
          const result = await tryFetch('GET', path, variant);
          if (result.data) {
            lastData = result.data;
            const candidate = extractQrCandidate(result.data);
            if (candidate) {
              qrPayload = candidate;
              console.log(`[generate-qr-code] ✅ QR obtido via ${path} (${variant.label})`);
              break;
            }
          }
          // Se status retornou 200 mas sem QR, aguardar um pouco e tentar novamente
          if (!qrPayload && result.status === 200) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        if (qrPayload) break;
      }
    }

    if (!qrPayload) {
      console.error('[generate-qr-code] Falha em obter QR. Última resposta:', lastData);
      throw new Error(`Não foi possível obter o QR da UAZAPI. Tentativas: ${JSON.stringify(attempts).slice(0, 1800)}`);
    }

    // QR Code expira em 2 minutos (padrão WhatsApp)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // 3. Salvar QR Code no banco
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({
        qr_code: qrPayload,
        qr_code_expires_at: expiresAt.toISOString(),
        instance_id: UAZAPI_INSTANCE_ID,
        status: 'connecting',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', request.user_id);

    if (updateError) {
      console.error('[generate-qr-code] Erro ao salvar QR Code:', updateError);
      throw updateError;
    }

    console.log('[generate-qr-code] ✅ QR Code salvo com sucesso');

    // 4. Retornar para o frontend
    return new Response(
      JSON.stringify({
        success: true,
        qrCode: qrPayload,
        expiresAt: expiresAt.toISOString(),
        message: 'QR Code gerado com sucesso',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, x-client-info',
        },
      }
    );

  } catch (error) {
    console.error('[generate-qr-code] ❌ Erro:', error);
    
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, x-client-info',
        },
      }
    );
  }
});
