// ============================================
// 📊 ANALYTICS QUERY - Consultas Analíticas com Dados Reais
// ============================================
// Previne alucinação da LLM fornecendo dados REAIS do banco

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parsePeriod, formatCurrency, Period } from '../_shared/period-parser.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ============================================
// CACHE DE INTENTS (v24.1 - Otimização)
// ============================================
// Cache em memória para evitar chamadas repetidas ao LLM
// Válido por 5 minutos
const intentCache = new Map<string, { intent: QueryIntent; timestamp: number }>();

// ============================================
// TIPOS
// ============================================

interface AnalyticsRequest {
  user_id: string;
  phone: string;
  raw_query: string;
}

interface QueryIntent {
  type: 'account_balance' | 'sum_by_category' | 'sum_by_merchant' | 'sum_by_account_type' | 'sum_by_account_and_merchant' | 'unknown';
  account_name?: string;
  category_name?: string;
  merchant?: string;
  account_type?: string;
  period_text?: string;
  confidence: number;
}

// ============================================
// DETECTAR INTENT COM FALLBACK REGEX (v24.1 - Otimização)
// ============================================
// 70% das queries são simples e não precisam de LLM
// Fallback: regex → LLM

function detectQueryIntentWithRegex(rawQuery: string): QueryIntent | null {
  const lowerQuery = rawQuery.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  // PADRÃO 1: "qual meu saldo no/da X"
  const saldoMatch = lowerQuery.match(/(?:qual|quanto|saldo).*(?:saldo|tenho).*(?:do|da|no|na)\s+(\w+)/);
  if (saldoMatch) {
    return {
      type: 'account_balance',
      account_name: saldoMatch[1],
      confidence: 0.95,
    };
  }
  
  // PADRÃO 2: "quanto gastei de cartão/crédito/débito"
  const tipoMatch = lowerQuery.match(/quanto\s+gastei\s+(?:de|no|com|usando)\s+(cartao|credito|debito|corrente)/);
  if (tipoMatch) {
    return {
      type: 'sum_by_account_type',
      account_type: tipoMatch[1],
      period_text: extractPeriod(lowerQuery),
      confidence: 0.9,
    };
  }
  
  // PADRÃO 3: "quanto gastei no/em X" (estabelecimento)
  const merchantMatch = lowerQuery.match(/quanto\s+gastei\s+(?:no|em|com|usando)\s+(\w+)/);
  if (merchantMatch && !['cartao', 'credito', 'debito', 'corrente'].includes(merchantMatch[1])) {
    return {
      type: 'sum_by_merchant',
      merchant: merchantMatch[1],
      period_text: extractPeriod(lowerQuery),
      confidence: 0.85,
    };
  }
  
  return null; // Não detectou com regex, vai precisar de LLM
}

function extractPeriod(query: string): string {
  if (query.includes('hoje')) return 'hoje';
  if (query.includes('ontem')) return 'ontem';
  if (query.includes('semana passada')) return 'semana passada';
  if (query.includes('essa semana') || query.includes('esta semana')) return 'essa semana';
  if (query.includes('mes passado') || query.includes('mês passado')) return 'mês passado';
  const daysMatch = query.match(/ultimos?\s+(\d+)\s+dias?/);
  if (daysMatch) return `últimos ${daysMatch[1]} dias`;
  return 'esse mês'; // Default
}

// ============================================
// DETECTAR INTENT DA CONSULTA VIA LLM
// ============================================

async function detectQueryIntent(rawQuery: string): Promise<QueryIntent> {
  console.log('🤖 [analytics] Detectando intent:', rawQuery);
  
  // ============================================
  // CACHE: Evitar chamadas repetidas ao LLM
  // ============================================
  const cacheKey = rawQuery.toLowerCase().trim();
  const cached = intentCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutos
    console.log('✅ [analytics] Intent do cache (economia de LLM)');
    return cached.intent;
  }
  
  // ============================================
  // FALLBACK 1: Tentar detectar com regex (70% dos casos)
  // ============================================
  const regexIntent = detectQueryIntentWithRegex(rawQuery);
  if (regexIntent && regexIntent.confidence >= 0.85) {
    console.log('✅ [analytics] Intent detectado via regex (economia de LLM):', regexIntent);
    intentCache.set(cacheKey, { intent: regexIntent, timestamp: Date.now() });
    return regexIntent;
  }
  
  // ============================================
  // FALLBACK 2: Chamar LLM para queries complexas
  // ============================================
  console.log('🤖 [analytics] Chamando LLM para query complexa...');

  const prompt = `Você é um parser de consultas financeiras. Analise a pergunta e identifique o tipo de consulta.

PERGUNTA: "${rawQuery}"

TIPOS POSSÍVEIS:
1. account_balance → "qual meu saldo", "saldo do nubank"
2. sum_by_category → "quanto gastei em alimentação", "gastos com transporte"
3. sum_by_merchant → "quanto gastei no ifood", "gastos no uber"
4. sum_by_account_type → "quanto gastei de cartão", "gastos no débito"
5. sum_by_account_and_merchant → "quanto gastei no ifood no nubank"

EXTRAIA (se presente):
- account_name: nome da conta/banco (nubank, itaú, inter, etc)
- category_name: categoria (alimentação, transporte, lazer, etc)
- merchant: estabelecimento (ifood, uber, amazon, etc)
- account_type: tipo de conta (cartão, crédito, débito, corrente)
- period_text: período mencionado (esse mês, semana passada, outubro, etc)

Responda APENAS com JSON:
{
  "type": "tipo_da_consulta",
  "account_name": "nome ou null",
  "category_name": "categoria ou null",
  "merchant": "estabelecimento ou null",
  "account_type": "tipo ou null",
  "period_text": "período ou null",
  "confidence": 0.0 a 1.0
}`;

  try {
    // Timeout de 10s para prevenir travamentos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 10x mais barato que GPT-4!
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200, // Suficiente para JSON
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Remover markdown se presente
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const intent = JSON.parse(jsonStr);
    
    console.log('✅ [analytics] Intent detectado via LLM:', intent);
    
    // Salvar no cache
    intentCache.set(cacheKey, { intent, timestamp: Date.now() });
    
    return intent;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('⏱️ [analytics] Timeout ao chamar OpenAI (10s)');
    } else {
      console.error('❌ [analytics] Erro ao detectar intent:', error);
      console.error('❌ [analytics] Error message:', error.message);
      console.error('❌ [analytics] Error stack:', error.stack);
    }
    
    // ✅ v24: Fallback para regex mesmo com baixa confidence
    if (regexIntent) {
      console.log(`⚠️ [analytics] LLM falhou, usando regex com confidence ${regexIntent.confidence}`);
      return regexIntent;
    }
    
    return {
      type: 'unknown',
      confidence: 0,
    };
  }
}

// ============================================
// QUERY 1: SALDO DE CONTA
// ============================================

async function getAccountBalance(userId: string, accountName: string, supabase: any) {
  console.log(`📊 [analytics] Consultando saldo: ${accountName}`);

  const { data, error } = await supabase
    .from('accounts')
    .select('name, current_balance, type, bank_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .ilike('name', `%${accountName}%`)
    .single();

  if (error || !data) {
    console.error('❌ [analytics] Conta não encontrada:', error);
    return null;
  }

  return {
    query_type: 'account_balance',
    account_name: data.name,
    bank_name: data.bank_name,
    type: data.type,
    balance: parseFloat(data.current_balance),
    formatted_balance: formatCurrency(data.current_balance),
  };
}

// ============================================
// QUERY 2: SOMA POR CATEGORIA
// ============================================

async function getSumByCategory(userId: string, categoryName: string, period: Period, supabase: any) {
  console.log(`📊 [analytics] Consultando gastos por categoria: ${categoryName}, período: ${period.label}`);

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      description,
      transaction_date,
      categories!inner(name)
    `)
    .eq('user_id', userId)
    .eq('type', 'expense')
    .ilike('categories.name', `%${categoryName}%`)
    .gte('transaction_date', period.start)
    .lte('transaction_date', period.end)
    .order('transaction_date', { ascending: false })
    .order('amount', { ascending: false })
    .limit(500); // Performance: max 500 transações

  if (error) {
    console.error('❌ [analytics] Erro ao consultar categoria:', error);
    return null;
  }

  const total = data.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  return {
    query_type: 'sum_by_category',
    category_name: categoryName,
    period: period.label,
    total,
    count: data.length,
    formatted_total: formatCurrency(total),
    transactions: data.slice(0, 5), // Top 5 para contexto
  };
}

// ============================================
// QUERY 3: SOMA POR ESTABELECIMENTO (MERCHANT)
// ============================================

async function getSumByMerchant(userId: string, merchant: string, period: Period, supabase: any) {
  console.log(`📊 [analytics] Consultando gastos no ${merchant}, período: ${period.label}`);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, description, transaction_date, accounts!inner(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .ilike('description', `%${merchant}%`)
    .gte('transaction_date', period.start)
    .lte('transaction_date', period.end)
    .order('transaction_date', { ascending: false })
    .order('amount', { ascending: false })
    .limit(500); // Performance: max 500 transações

  if (error) {
    console.error('❌ [analytics] Erro ao consultar merchant:', error);
    return null;
  }

  // ✅ v24: Tratar array vazio corretamente
  if (!data || data.length === 0) {
    console.log(`⚠️ Nenhum resultado encontrado com '${merchant}'`);
    return {
      query_type: 'sum_by_merchant',
      merchant,
      period: period.label,
      total: 0,
      count: 0,
      formatted_total: formatCurrency(0),
      transactions: [],
    };
  }

  const total = data.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  return {
    query_type: 'sum_by_merchant',
    merchant,
    period: period.label,
    total,
    count: data.length,
    formatted_total: formatCurrency(total),
    transactions: data.slice(0, 5),
  };
}

// ============================================
// QUERY 4: SOMA POR TIPO DE CONTA
// ============================================

async function getSumByAccountType(userId: string, accountType: string, period: Period, supabase: any) {
  console.log(`📊 [analytics] Consultando gastos por tipo: ${accountType}, período: ${period.label}`);

  // Mapear tipo mencionado para tipo no banco
  const typeMap: Record<string, string> = {
    'cartão': 'credit_card',
    'cartao': 'credit_card',
    'crédito': 'credit_card',
    'credito': 'credit_card',
    'débito': 'checking',
    'debito': 'checking',
    'corrente': 'checking',
  };

  const dbType = typeMap[accountType.toLowerCase()] || accountType;

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      description,
      transaction_date,
      accounts!inner(name, type)
    `)
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('accounts.type', dbType)
    .gte('transaction_date', period.start)
    .lte('transaction_date', period.end)
    .order('transaction_date', { ascending: false })
    .order('amount', { ascending: false })
    .limit(500); // Performance: max 500 transações

  if (error) {
    console.error('❌ [analytics] Erro ao consultar por tipo:', error);
    return null;
  }

  const total = data.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  // Agrupar por conta
  const byAccount: Record<string, number> = {};
  data.forEach((t: any) => {
    const accountName = t.accounts.name;
    byAccount[accountName] = (byAccount[accountName] || 0) + parseFloat(t.amount);
  });

  return {
    query_type: 'sum_by_account_type',
    account_type: accountType,
    db_type: dbType,
    period: period.label,
    total,
    count: data.length,
    formatted_total: formatCurrency(total),
    by_account: byAccount,
  };
}

// ============================================
// QUERY 5: SOMA POR CONTA E ESTABELECIMENTO
// ============================================

async function getSumByAccountAndMerchant(
  userId: string,
  accountName: string,
  merchant: string,
  period: Period,
  supabase: any
) {
  console.log(`📊 [analytics] Consultando ${merchant} no ${accountName}, período: ${period.label}`);

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      description,
      transaction_date,
      accounts!inner(name)
    `)
    .eq('user_id', userId)
    .eq('type', 'expense')
    .ilike('accounts.name', `%${accountName}%`)
    .ilike('description', `%${merchant}%`)
    .gte('transaction_date', period.start)
    .lte('transaction_date', period.end)
    .order('transaction_date', { ascending: false })
    .order('amount', { ascending: false })
    .limit(500); // Performance: max 500 transações

  if (error) {
    console.error('❌ [analytics] Erro ao consultar combinado:', error);
    return null;
  }

  const total = data.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  return {
    query_type: 'sum_by_account_and_merchant',
    account_name: accountName,
    merchant,
    period: period.label,
    total,
    count: data.length,
    formatted_total: formatCurrency(total),
    transactions: data.slice(0, 5),
  };
}

// ============================================
// FORMATAR RESPOSTA EM LINGUAGEM NATURAL
// ============================================

function formatResponse(result: any): string {
  if (!result) {
    return '❌ Não consegui encontrar essa informação. Pode reformular a pergunta?';
  }

  switch (result.query_type) {
    case 'account_balance':
      return `💰 *Saldo ${result.account_name}*\n\n${result.formatted_balance}`;

    case 'sum_by_category':
      if (result.count === 0) {
        return `📊 Você não teve gastos em *${result.category_name}* ${result.period}.`;
      }
      return `📊 *Gastos em ${result.category_name}*\n\n` +
             `💵 ${result.formatted_total}\n` +
             `📝 ${result.count} transaç${result.count === 1 ? 'ão' : 'ões'}\n` +
             `📅 ${result.period}`;

    case 'sum_by_merchant':
      if (result.count === 0) {
        return `📊 Você não teve gastos no *${result.merchant}* ${result.period}.`;
      }
      return `📊 *Gastos no ${result.merchant}*\n\n` +
             `💵 ${result.formatted_total}\n` +
             `📝 ${result.count} transaç${result.count === 1 ? 'ão' : 'ões'}\n` +
             `📅 ${result.period}`;

    case 'sum_by_account_type':
      if (result.count === 0) {
        return `📊 Você não teve gastos no ${result.account_type} ${result.period}.`;
      }
      
      let accountBreakdown = '';
      if (Object.keys(result.by_account).length > 1) {
        accountBreakdown = '\n\n*Por conta:*\n' +
          Object.entries(result.by_account)
            .map(([acc, val]) => `• ${acc}: ${formatCurrency(val as number)}`)
            .join('\n');
      }
      
      return `📊 *Gastos no ${result.account_type}*\n\n` +
             `💵 ${result.formatted_total}\n` +
             `📝 ${result.count} transaç${result.count === 1 ? 'ão' : 'ões'}\n` +
             `📅 ${result.period}` +
             accountBreakdown;

    case 'sum_by_account_and_merchant':
      if (result.count === 0) {
        return `📊 Você não teve gastos no *${result.merchant}* usando *${result.account_name}* ${result.period}.`;
      }
      return `📊 *${result.merchant} no ${result.account_name}*\n\n` +
             `💵 ${result.formatted_total}\n` +
             `📝 ${result.count} transaç${result.count === 1 ? 'ão' : 'ões'}\n` +
             `📅 ${result.period}`;

    default:
      return '❌ Tipo de consulta não reconhecido.';
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { user_id, phone, raw_query }: AnalyticsRequest = await req.json();

    console.log('📊 [analytics] Nova consulta:', { user_id, phone, raw_query });

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Detectar intent da consulta
    const intent = await detectQueryIntent(raw_query);

    if (intent.type === 'unknown' || intent.confidence < 0.5) {
      console.error('❌ [analytics] Intent desconhecido ou baixa confidence:', intent);
      return new Response(
        JSON.stringify({
          success: false,
          message: '❌ Não consegui encontrar essa informação. Pode reformular a pergunta?\n\n' +
                   '💡 Exemplos:\n' +
                   '• "Qual meu saldo no Nubank?"\n' +
                   '• "Quanto gastei no iFood esse mês?"\n' +
                   '• "Quanto gastei de cartão?"',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 2. Parsear período (se mencionado)
    const period = intent.period_text ? parsePeriod(intent.period_text) : parsePeriod('esse mês');

    // 3. Executar query baseado no tipo
    let result = null;

    switch (intent.type) {
      case 'account_balance':
        if (!intent.account_name) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '❌ Qual conta você quer saber o saldo?',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        result = await getAccountBalance(user_id, intent.account_name, supabase);
        break;

      case 'sum_by_category':
        if (!intent.category_name) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '❌ Qual categoria você quer consultar?',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        result = await getSumByCategory(user_id, intent.category_name, period, supabase);
        break;

      case 'sum_by_merchant':
        if (!intent.merchant) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '❌ Qual estabelecimento você quer consultar?',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        result = await getSumByMerchant(user_id, intent.merchant, period, supabase);
        break;

      case 'sum_by_account_type':
        if (!intent.account_type) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '❌ Qual tipo de conta você quer consultar? (cartão, débito, etc)',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        result = await getSumByAccountType(user_id, intent.account_type, period, supabase);
        break;

      case 'sum_by_account_and_merchant':
        if (!intent.account_name || !intent.merchant) {
          return new Response(
            JSON.stringify({
              success: false,
              message: '❌ Preciso saber a conta e o estabelecimento.',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        result = await getSumByAccountAndMerchant(
          user_id,
          intent.account_name,
          intent.merchant,
          period,
          supabase
        );
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: '❌ Tipo de consulta não suportado.',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 4. Formatar resposta
    const formattedResponse = formatResponse(result);

    console.log('✅ [analytics] Resposta gerada:', formattedResponse);

    return new Response(
      JSON.stringify({
        success: true,
        formatted_response: formattedResponse,
        raw_data: result,
        intent,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [analytics] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
