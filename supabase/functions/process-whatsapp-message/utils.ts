// ============================================
// UTILS.TS - Funções Utilitárias
// Modularização v1.0 - Dezembro 2025
// ============================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { BotaoInterativo } from './types.ts';

// ============================================
// CONFIGURAÇÃO
// ============================================

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://lamusic.uazapi.com';
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') || Deno.env.get('UAZAPI_INSTANCE_TOKEN');

// ============================================
// SUPABASE
// ============================================

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔑 Inicializando Supabase com service_role key');
    
    supabaseInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseInstance;
}

// ============================================
// TELEFONE
// ============================================

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const clean = sanitizePhone(phone);
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

// ============================================
// FORMATAÇÃO
// ============================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============================================
// EMOJI POR BANCO (CENTRALIZADO)
// ============================================

export function getEmojiBanco(nome: string): string {
  const nomeNorm = nome.toLowerCase();
  if (nomeNorm.includes('nubank') || nomeNorm.includes('nu ')) return '💜';
  if (nomeNorm.includes('itau') || nomeNorm.includes('itaú')) return '🧡';
  if (nomeNorm.includes('bradesco')) return '❤️';
  if (nomeNorm.includes('santander')) return '❤️';
  if (nomeNorm.includes('caixa')) return '💙';
  if (nomeNorm.includes('banco do brasil') || nomeNorm.includes('bb')) return '💛';
  if (nomeNorm.includes('inter')) return '🧡';
  if (nomeNorm.includes('c6')) return '🖤';
  if (nomeNorm.includes('picpay')) return '💚';
  if (nomeNorm.includes('mercado pago')) return '💙';
  return '💳';
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}

// ============================================
// NORMALIZAÇÃO DE TIPOS
// ============================================

export function normalizeMessageType(rawType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text',
    'conversation': 'text',
    'extendedtextmessage': 'text',
    'audio': 'audio',
    'audiomessage': 'audio',
    'image': 'image',
    'imagemessage': 'image',
    'document': 'document',
    'documentmessage': 'document',
    'video': 'video',
    'videomessage': 'video',
    'location': 'location',
    'locationmessage': 'location',
    'contact': 'contact',
    'contactmessage': 'contact',
    'templatebuttonreplymessage': 'text',
    'button': 'text',
    'interactive': 'text'
  };
  
  const normalized = typeMap[rawType.toLowerCase()] || 'text';
  console.log(`🔧 MessageType normalizado: "${rawType}" → "${normalized}"`);
  return normalized;
}

// ============================================
// EXTRAÇÃO DE TEXTO
// ============================================

export function extrairTexto(payload: unknown): string {
  const p = payload as Record<string, unknown>;
  
  // Payload direto
  const data = p.data as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;
  if (message?.text) return String(message.text).trim();
  if (message?.caption) return String(message.caption).trim();
  
  // Payload N8N
  const body = p.body as Record<string, unknown> | undefined;
  const bodyMessage = body?.message as Record<string, unknown> | undefined;
  if (bodyMessage?.content) return String(bodyMessage.content).trim();
  if (bodyMessage?.text) return String(bodyMessage.text).trim();
  
  // Fallback
  const content = (p.message as Record<string, unknown>)?.content;
  if (typeof content === 'string') return content.trim();
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (c.text) return String(c.text).trim();
  }
  
  return '';
}

// ============================================
// ENVIO DE MENSAGENS
// ============================================

export async function enviarTexto(numero: string, texto: string): Promise<unknown> {
  if (!UAZAPI_TOKEN) {
    console.error('❌ UAZAPI_TOKEN não configurado');
    throw new Error('UAZAPI_TOKEN não configurado');
  }
  
  const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'token': UAZAPI_TOKEN
    },
    body: JSON.stringify({ 
      number: sanitizePhone(numero), 
      text: texto 
    })
  });
  
  if (!response.ok) {
    console.error('❌ Erro ao enviar mensagem:', response.status);
    throw new Error(`Erro UAZAPI: ${response.status}`);
  }
  
  return response.json();
}

export async function enviarViaEdgeFunction(
  phone: string,
  content: string,
  userId?: string,
  options?: { chatJid?: string },
): Promise<void> {
  const dest = options?.chatJid ?? phone;
  console.log('📤 Enviando via Edge Function para:', dest);
  console.log('📝 Conteúdo:', content.substring(0, 100) + '...');
  
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        ...(userId ? { user_id: userId } : {}),
        ...(options?.chatJid
          ? { chat_jid: options.chatJid }
          : { phone_number: phone }),
        message_type: 'text',
        content
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao enviar mensagem:', response.status, errorText);
    } else {
      console.log('✅ Mensagem enviada com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao chamar send-whatsapp-message:', error);
  }
}

export async function enviarMensagemComBotoes(
  numero: string, 
  texto: string, 
  botoes: BotaoInterativo[],
  footer?: string
): Promise<unknown> {
  if (!UAZAPI_TOKEN) {
    throw new Error('UAZAPI_TOKEN não configurado');
  }
  
  // Máximo 3 botões
  const choices = botoes.slice(0, 3).map(b => `${b.texto}|${b.id}`);
  
  const response = await fetch(`${UAZAPI_BASE_URL}/send/menu`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'token': UAZAPI_TOKEN
    },
    body: JSON.stringify({
      number: sanitizePhone(numero),
      type: 'button',
      text: texto,
      choices,
      footerText: footer || 'Escolha uma opção'
    })
  });
  
  return response.json();
}

// ============================================
// DOWNLOAD DE MÍDIA
// ============================================

export async function baixarMidiaUAZAPI(messageId: string): Promise<{
  base64: string;
  mimetype: string;
}> {
  const response = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'token': UAZAPI_TOKEN!
    },
    body: JSON.stringify({
      id: messageId,
      return_base64: true
    })
  });
  
  return response.json();
}

// ============================================
// LOGGING
// ============================================

export function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  
  console.log(`${emoji} [${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// ============================================
// TIMEZONE BRASIL
// ============================================

export function nowBrasilia(): Date {
  const now = new Date();
  // UTC-3
  now.setHours(now.getHours() - 3);
  return now;
}

export function todayBrasilia(): string {
  return nowBrasilia().toISOString().split('T')[0];
}

// ============================================
// DETECÇÃO DE CONTA
// ============================================

export function detectAccountFromMessage(message: string, accounts: Array<{
  id: string;
  name: string;
  bank?: string;
  type: string;
}>): { id: string; name: string; bank?: string; type: string } | null {
  const lowerMsg = message.toLowerCase();
  console.log('🔍 Detectando conta em:', lowerMsg);
  
  // Keywords por banco
  const accountKeywords: Record<string, string[]> = {
    'nubank': ['nubank', 'roxinho', 'nu bank', 'roxo'],
    'itaú': ['itau', 'itaú', 'banco itaú', 'laranja'],
    'inter': ['inter', 'banco inter', 'laranjinha'],
    'bradesco': ['bradesco'],
    'santander': ['santander'],
    'caixa': ['caixa', 'caixa econômica'],
    'banco do brasil': ['banco do brasil', 'bb'],
    'picpay': ['picpay', 'pic pay']
  };
  
  // Buscar por keywords
  for (const account of accounts) {
    const accountName = account.bank ? account.bank.toLowerCase() : account.name.toLowerCase();
    const keywords = accountKeywords[accountName] || [accountName];
    
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword)) {
        console.log(`✅ Conta detectada: ${account.name} (keyword: ${keyword})`);
        return account;
      }
    }
  }
  
  // Detectar por tipo (débito/crédito)
  if (lowerMsg.includes('débito') || lowerMsg.includes('debito')) {
    const checkingAccounts = accounts.filter(a => a.type === 'checking');
    if (checkingAccounts.length === 1) {
      console.log(`✅ Conta corrente única detectada: ${checkingAccounts[0].name}`);
      return checkingAccounts[0];
    }
  }
  
  if (lowerMsg.includes('crédito') || lowerMsg.includes('credito') || 
      lowerMsg.includes('cartão') || lowerMsg.includes('cartao')) {
    const creditAccounts = accounts.filter(a => a.type === 'credit_card');
    if (creditAccounts.length === 1) {
      console.log(`✅ Cartão único detectado: ${creditAccounts[0].name}`);
      return creditAccounts[0];
    }
  }
  
  console.log('❌ Nenhuma conta detectada');
  return null;
}

// ============================================
// RASTREAMENTO DE INTERAÇÃO - ANA CLARA
// ============================================

/**
 * Busca última interação do usuário (para saber se é primeira vez hoje)
 */
export async function buscarUltimaInteracao(userId: string): Promise<Date | null> {
  const supabase = getSupabase();
  
  try {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('created_at')
      .eq('user_id', userId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(2); // Pega 2 para comparar (a atual e a anterior)
    
    // Se tem mais de 1 mensagem, retorna a penúltima (a anterior à atual)
    if (data && data.length > 1) {
      return new Date(data[1].created_at);
    }
    
    return null; // Primeira mensagem do usuário
  } catch (error) {
    console.error('Erro ao buscar última interação:', error);
    return null;
  }
}

/**
 * Verifica se é a primeira interação do dia
 */
export function isPrimeiraInteracaoDia(ultimaInteracao: Date | null): boolean {
  if (!ultimaInteracao) return true;
  
  const agora = new Date();
  const hoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const ultimoDia = ultimaInteracao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  return hoje !== ultimoDia;
}

// ============================================
// CORS HEADERS
// ============================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
