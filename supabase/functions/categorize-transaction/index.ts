/**
 * EDGE FUNCTION: categorize-transaction
 * Responsabilidade: Categorizar e criar transação usando LLM configurado pelo usuário
 * 
 * Fluxo:
 * 1. Recebe dados brutos (texto, áudio transcrito ou dados de OCR)
 * 2. Busca configuração de IA do usuário
 * 3. Usa LLM para extrair/validar dados da transação
 * 4. Cria transação no Supabase
 * 5. Retorna confirmação formatada
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CategorizeRequest {
  user_id: string;
  data: {
    raw_text?: string;
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
    merchant_name?: string;
    items?: any[];
  };
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
    const { user_id, data }: CategorizeRequest = await req.json();
    
    console.log('🤖 Categorizando transação para usuário:', user_id);
    
    // Buscar configuração de IA do usuário
    const { data: aiConfig, error: aiError } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_default', true)
      .eq('is_validated', true)
      .single();
    
    if (aiError || !aiConfig) {
      console.warn('⚠️ Config de IA não encontrada, usando fallback');
      // Fallback: usar dados fornecidos sem LLM
      return await createTransactionFallback(supabase, user_id, data);
    }
    
    // Extrair/validar dados usando LLM
    const extractedData = await extractTransactionData(aiConfig, data);
    
    if (!extractedData.success) {
      throw new Error(extractedData.error || 'Falha ao extrair dados');
    }
    
    // Validar dados extraídos
    const validation = validateTransactionData(extractedData.data);
    
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Dados incompletos: ${validation.errors.join(', ')}`,
          requires_confirmation: true,
          extracted_data: extractedData.data,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Criar transação
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        amount: extractedData.data.amount,
        type: extractedData.data.type,
        category: extractedData.data.category,
        description: extractedData.data.description,
        date: extractedData.data.date || new Date().toISOString(),
        metadata: {
          source: 'whatsapp',
          merchant_name: data.merchant_name,
          items: data.items,
          confidence: extractedData.data.confidence,
        },
      })
      .select()
      .single();
    
    if (txError) {
      console.error('❌ Erro ao criar transação:', txError);
      throw txError;
    }
    
    console.log('✅ Transação criada:', transaction.id);
    
    // Formatar mensagem de confirmação
    const confirmationMessage = formatConfirmationMessage(transaction);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: confirmationMessage,
        transaction_id: transaction.id,
        data: extractedData.data,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao categorizar transação:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Extrai dados da transação usando LLM
 */
async function extractTransactionData(aiConfig: any, data: any) {
  const provider = aiConfig.provider;
  const model = aiConfig.model;
  const apiKey = aiConfig.api_key; // Descriptografar em produção
  
  // Construir prompt
  const prompt = buildExtractionPrompt(data);
  
  // Chamar LLM apropriado
  let response;
  
  switch (provider) {
    case 'openai':
      response = await callOpenAI(apiKey, model, prompt, aiConfig);
      break;
    case 'gemini':
      response = await callGemini(apiKey, model, prompt, aiConfig);
      break;
    case 'claude':
      response = await callClaude(apiKey, model, prompt, aiConfig);
      break;
    case 'openrouter':
      response = await callOpenRouter(apiKey, model, prompt, aiConfig);
      break;
    default:
      throw new Error(`Provider ${provider} não suportado`);
  }
  
  return response;
}

/**
 * Constrói prompt para extração de dados
 */
function buildExtractionPrompt(data: any): string {
  const systemPrompt = `Você é um assistente financeiro especializado em extrair dados de transações.
Extraia os seguintes campos:
- amount (número, apenas valor numérico sem R$ ou vírgulas)
- type (income ou expense)
- category (uma de: food, transport, health, education, entertainment, shopping, bills, salary, investment, other)
- description (texto curto e descritivo)
- date (YYYY-MM-DD, se não mencionado use a data de hoje)

Retorne APENAS um JSON válido com esses campos, sem texto adicional.`;

  let userPrompt = '';
  
  if (data.raw_text) {
    userPrompt = `Mensagem do usuário: "${data.raw_text}"`;
  } else if (data.merchant_name && data.amount) {
    userPrompt = `Nota fiscal: Estabelecimento "${data.merchant_name}", Valor R$ ${data.amount}`;
    if (data.items && data.items.length > 0) {
      userPrompt += `\nItens: ${data.items.map((i: any) => i.name).join(', ')}`;
    }
  } else {
    userPrompt = `Dados: ${JSON.stringify(data)}`;
  }
  
  return `${systemPrompt}\n\n${userPrompt}`;
}

/**
 * Chama OpenAI API
 */
async function callOpenAI(apiKey: string, model: string, prompt: string, config: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.split('\n\n')[0] },
        { role: 'user', content: prompt.split('\n\n')[1] },
      ],
      temperature: config.temperature || 0.3,
      max_tokens: config.max_tokens || 500,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }
  
  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    const data = JSON.parse(content);
    return { success: true, data: { ...data, confidence: 0.9 } };
  } catch (e) {
    return { success: false, error: 'Resposta inválida do LLM' };
  }
}

/**
 * Chama Google Gemini API
 */
async function callGemini(apiKey: string, model: string, prompt: string, config: any) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature || 0.3,
          maxOutputTokens: config.max_tokens || 500,
        },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Gemini API error');
  }
  
  const result = await response.json();
  const content = result.candidates[0].content.parts[0].text;
  
  try {
    const data = JSON.parse(content);
    return { success: true, data: { ...data, confidence: 0.9 } };
  } catch (e) {
    return { success: false, error: 'Resposta inválida do LLM' };
  }
}

/**
 * Chama Anthropic Claude API
 */
async function callClaude(apiKey: string, model: string, prompt: string, config: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: config.max_tokens || 500,
      temperature: config.temperature || 0.3,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Claude API error');
  }
  
  const result = await response.json();
  const content = result.content[0].text;
  
  try {
    const data = JSON.parse(content);
    return { success: true, data: { ...data, confidence: 0.9 } };
  } catch (e) {
    return { success: false, error: 'Resposta inválida do LLM' };
  }
}

/**
 * Chama OpenRouter API
 */
async function callOpenRouter(apiKey: string, model: string, prompt: string, config: any) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.split('\n\n')[0] },
        { role: 'user', content: prompt.split('\n\n')[1] },
      ],
      temperature: config.temperature || 0.3,
      max_tokens: config.max_tokens || 500,
    }),
  });
  
  if (!response.ok) {
    throw new Error('OpenRouter API error');
  }
  
  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    const data = JSON.parse(content);
    return { success: true, data: { ...data, confidence: 0.9 } };
  } catch (e) {
    return { success: false, error: 'Resposta inválida do LLM' };
  }
}

/**
 * Valida dados extraídos
 */
function validateTransactionData(data: any) {
  const errors: string[] = [];
  
  if (!data.amount || data.amount <= 0) {
    errors.push('valor inválido');
  }
  
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.push('tipo inválido');
  }
  
  if (!data.category) {
    errors.push('categoria ausente');
  }
  
  if (!data.description) {
    errors.push('descrição ausente');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Cria transação sem LLM (fallback)
 */
async function createTransactionFallback(supabase: any, userId: string, data: any) {
  // Usar dados fornecidos diretamente
  const amount = data.amount || 0;
  const description = data.description || data.merchant_name || 'Transação via WhatsApp';
  const category = data.category || 'other';
  const type = data.type || 'expense';
  
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount,
      type,
      category,
      description,
      date: data.date || new Date().toISOString(),
      metadata: { source: 'whatsapp', fallback: true },
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return new Response(
    JSON.stringify({
      success: true,
      message: formatConfirmationMessage(transaction),
      transaction_id: transaction.id,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Formata mensagem de confirmação
 */
function formatConfirmationMessage(transaction: any): string {
  const typeEmoji = transaction.type === 'income' ? '💵' : '💸';
  const categoryLabels: Record<string, string> = {
    food: '🍔 Alimentação',
    transport: '🚗 Transporte',
    health: '🏥 Saúde',
    education: '📚 Educação',
    entertainment: '🎬 Lazer',
    shopping: '🛍️ Compras',
    bills: '📄 Contas',
    salary: '💰 Salário',
    investment: '📈 Investimento',
    other: '📦 Outros',
  };
  
  const categoryLabel = categoryLabels[transaction.category] || transaction.category;
  const amount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(transaction.amount);
  
  return `${typeEmoji} *Lançamento Registrado!*\n\n` +
         `${categoryLabel}\n` +
         `${transaction.description}\n` +
         `${amount}\n\n` +
         `_Registrado com sucesso!_`;
}
