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
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { user_id, data } = await req.json();
    console.log('🤖 Categorizando transação para usuário:', user_id);
    // Buscar configuração de IA do usuário
    const { data: aiConfig, error: aiError } = await supabase.from('ai_provider_configs').select('*').eq('user_id', user_id).eq('is_default', true).eq('is_validated', true).single();
    if (aiError || !aiConfig) {
      console.warn('⚠️ Config de IA não encontrada, usando fallback');
      // Fallback: usar dados fornecidos sem LLM
      return await createTransactionFallback(supabase, user_id, data);
    }
    // Extrair/validar dados usando LLM
    const extractedData = await extractTransactionData(aiConfig, data);
    
    console.log('📊 Resultado da extração:', JSON.stringify(extractedData, null, 2));
    
    if (!extractedData.success) {
      console.error('❌ ERRO DETALHADO:', extractedData.error);
      throw new Error(extractedData.error || 'Falha ao extrair dados');
    }
    // Validar dados extraídos
    const validation = validateTransactionData(extractedData.data);
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        success: false,
        message: `Dados incompletos: ${validation.errors.join(', ')}`,
        requires_confirmation: true,
        extracted_data: extractedData.data
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Mapear slug da IA para nome em português
    const categorySlugMap: Record<string, string> = {
      'food': 'Alimentação',
      'transport': 'Transporte',
      'health': 'Saúde',
      'education': 'Educação',
      'entertainment': 'Lazer',
      'shopping': 'Outros', // Compras gerais
      'bills': 'Moradia', // Contas fixas
      'salary': 'Salário',
      'investment': 'Investimentos',
      'other': 'Outros'
    };
    
    const categorySlug = extractedData.data.category;
    const categoryName = categorySlugMap[categorySlug] || 'Outros';
    const transactionType = extractedData.data.type;
    
    console.log(`🔍 Mapeando categoria: slug="${categorySlug}" → name="${categoryName}", type="${transactionType}"`);
    
    // Buscar category_id pelo nome E tipo
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', categoryName)
      .eq('type', transactionType)
      .eq('is_default', true)
      .single();
    
    if (category) {
      console.log(`✅ Categoria encontrada: ${category.name} (${category.id})`);
    } else {
      console.warn(`⚠️ Categoria "${categoryName}" (${transactionType}) não encontrada, usando "Outros"`);
    }
    
    // ✅ CRÍTICO: Buscar account_id se não fornecido
    let accountId = data.account_id;
    if (!accountId) {
      console.log('🔍 account_id não fornecido, buscando conta ativa do usuário...');
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (account) {
        accountId = account.id;
        console.log('✅ Conta encontrada:', accountId);
      } else {
        console.warn('⚠️ Nenhuma conta ativa encontrada para o usuário');
      }
    }
    
    // ✅ CRÍTICO: Sempre usar data atual (não confiar na AI)
    const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('📅 Data da transação:', transactionDate);
    
    // Criar transação
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id,
      account_id: accountId, // ✅ Sempre preenchido
      amount: extractedData.data.amount,
      type: extractedData.data.type,
      category_id: category?.id || null, // UUID da categoria ou null
      description: extractedData.data.description,
      transaction_date: transactionDate, // ✅ Sempre data atual
      is_paid: true,
      source: 'whatsapp',
      whatsapp_message_id: data.message_id
    }).select().single();
    if (txError) {
      console.error('❌ Erro ao criar transação:', txError);
      throw txError;
    }
    console.log('✅ Transação criada:', transaction.id);
    // Formatar mensagem de confirmação com dados extraídos
    const confirmationMessage = formatConfirmationMessage(transaction, extractedData.data);
    return new Response(JSON.stringify({
      success: true,
      message: confirmationMessage,
      transaction_id: transaction.id,
      data: extractedData.data
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
/**
 * Extrai dados da transação usando LLM
 */ async function extractTransactionData(aiConfig, data) {
  const provider = aiConfig.provider;
  const model = aiConfig.model_name || aiConfig.model;
  const apiKey = aiConfig.api_key_encrypted || aiConfig.api_key; // Descriptografar em produção
  // Construir prompt (respeitando system_prompt do usuário se existir)
  const prompt = buildExtractionPrompt(data, aiConfig.system_prompt);
  // Chamar LLM apropriado
  let response;
  switch(provider){
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
 * Remove markdown code fences do JSON
 */
function cleanMarkdownFromJSON(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

/**
 * Constrói prompt para extração de dados
 */ function buildExtractionPrompt(data, extraSystemPrompt) {
  const systemPrompt = `Você é um assistente financeiro especializado em extrair dados de transações.

CATEGORIAS VÁLIDAS (use EXATAMENTE estes nomes):
- food (alimentação: restaurantes, supermercados, delivery, café)
- transport (transporte: uber, combustível, estacionamento, ônibus)
- health (saúde: farmácia, médico, exames, hospital)
- education (educação: cursos, livros, mensalidade, material)
- entertainment (lazer: cinema, streaming, viagens, shows)
- shopping (compras: roupas, calçados, eletrônicos, presentes)
- bills (contas: água, luz, internet, telefone, aluguel)
- salary (salário: renda recebida, ordenado, pagamento)
- investment (investimento: aplicações, renda fixa, ações)
- other (outros: categorias não listadas acima)

⚠️ CRÍTICO: SEMPRE retorne uma categoria válida da lista. NUNCA "undefined" ou null.

Extraia os seguintes campos:
- amount (número, apenas valor numérico sem R$ ou vírgulas)
- type (income ou expense)
- category (UMA das categorias da lista acima)
- description (texto curto e descritivo em português)
- date (YYYY-MM-DD, se não mencionado use a data de hoje)

Retorne APENAS um JSON válido com esses campos, sem texto adicional.`;
  const prefix = extraSystemPrompt ? `${extraSystemPrompt}\n\n` : '';
  let userPrompt = '';
  if (data.raw_text) {
    userPrompt = `Mensagem do usuário: "${data.raw_text}"`;
  } else if (data.merchant_name && data.amount) {
    userPrompt = `Nota fiscal: Estabelecimento "${data.merchant_name}", Valor R$ ${data.amount}`;
    if (data.items && data.items.length > 0) {
      userPrompt += `\nItens: ${data.items.map((i)=>i.name).join(', ')}`;
    }
  } else {
    userPrompt = `Dados: ${JSON.stringify(data)}`;
  }
  return `${prefix}${systemPrompt}\n\n${userPrompt}`;
}
/**
 * Chama OpenAI API
 */
async function callOpenAI(apiKey, model, prompt, config) {
  console.log('🔍 Chamando OpenAI com modelo:', model);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}` 
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt.split('\n\n')[0] },
        { role: 'user', content: prompt.split('\n\n').slice(1).join('\n\n') }
      ],
      temperature: config.temperature || 0.3,
      max_tokens: config.max_tokens || 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Erro OpenAI API:', JSON.stringify(error));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  console.log('📨 Resposta bruta do OpenAI:', content);
  
  const cleaned = cleanMarkdownFromJSON(content);
  
  console.log('🧹 Após limpeza markdown:', cleaned);
  
  try {
    const data = JSON.parse(cleaned);
    console.log('✅ JSON parseado com sucesso:', JSON.stringify(data));
    return { success: true, data: { ...data, confidence: 0.9 } };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('❌ Erro no JSON.parse:', errorMessage);
    console.error('❌ String que falhou:', cleaned);
    return { success: false, error: `Parse error: ${errorMessage}` };
  }
}
/**
 * Chama Google Gemini API
 */ async function callGemini(apiKey, model, prompt, config) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: config.temperature || 0.3,
        maxOutputTokens: config.max_tokens || 500
      }
    })
  });
  if (!response.ok) {
    throw new Error('Gemini API error');
  }
  const result = await response.json();
  const content = result.candidates[0].content.parts[0].text;
  try {
    const data = JSON.parse(content);
    return {
      success: true,
      data: {
        ...data,
        confidence: 0.9
      }
    };
  } catch (e) {
    return {
      success: false,
      error: 'Resposta inválida do LLM'
    };
  }
}
/**
 * Chama Anthropic Claude API
 */ async function callClaude(apiKey, model, prompt, config) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.max_tokens || 500,
      temperature: config.temperature || 0.3
    })
  });
  if (!response.ok) {
    throw new Error('Claude API error');
  }
  const result = await response.json();
  const content = result.content[0].text;
  try {
    const data = JSON.parse(content);
    return {
      success: true,
      data: {
        ...data,
        confidence: 0.9
      }
    };
  } catch (e) {
    return {
      success: false,
      error: 'Resposta inválida do LLM'
    };
  }
}
/**
 * Chama OpenRouter API
 */ async function callOpenRouter(apiKey, model, prompt, config) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: prompt.split('\n\n')[0]
        },
        {
          role: 'user',
          content: prompt.split('\n\n')[1]
        }
      ],
      temperature: config.temperature || 0.3,
      max_tokens: config.max_tokens || 500
    })
  });
  if (!response.ok) {
    throw new Error('OpenRouter API error');
  }
  const result = await response.json();
  const content = result.choices[0].message.content;
  try {
    const data = JSON.parse(content);
    return {
      success: true,
      data: {
        ...data,
        confidence: 0.9
      }
    };
  } catch (e) {
    return {
      success: false,
      error: 'Resposta inválida do LLM'
    };
  }
}
/**
 * Valida dados extraídos
 */ function validateTransactionData(data) {
  const errors = [];
  if (!data.amount || data.amount <= 0) {
    errors.push('valor inválido');
  }
  if (!data.type || ![
    'income',
    'expense'
  ].includes(data.type)) {
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
    errors
  };
}
/**
 * Cria transação sem LLM (fallback)
 */ async function createTransactionFallback(supabase, userId, data) {
  // Usar dados fornecidos diretamente
  const amount = data.amount || 0;
  const description = data.description || data.merchant_name || 'Transação via WhatsApp';
  const category = data.category || 'other';
  const type = data.type || 'expense';
  const { data: transaction, error } = await supabase.from('transactions').insert({
    user_id: userId,
    amount,
    type,
    category,
    description,
    date: data.date || new Date().toISOString(),
    metadata: {
      source: 'whatsapp',
      fallback: true
    }
  }).select().single();
  if (error) throw error;
  return new Response(JSON.stringify({
    success: true,
    message: formatConfirmationMessage(transaction),
    transaction_id: transaction.id
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
/**
 * Formata mensagem de confirmação
 */ function formatConfirmationMessage(transaction: any, extractedData: any = null) {
  // Usar dados extraídos se disponíveis, senão usar da transação
  const type = extractedData?.type || transaction.type;
  const category = extractedData?.category || transaction.category;
  const description = extractedData?.description || transaction.description;
  const amount = extractedData?.amount || transaction.amount;
  
  const typeEmoji = type === 'income' ? '💰' : '💸';
  
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
    other: '📦 Outros'
  };
  
  // ✅ Fallback robusto para categoria
  let categoryDisplay = '';
  if (category && category !== 'undefined' && category !== 'null' && category !== '') {
    categoryDisplay = categoryLabels[category] || `📂 ${category}`;
  }
  
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
  
  // ✅ Montar mensagem apenas com campos válidos
  let message = `${typeEmoji} *Lançamento Registrado!*\n\n`;
  
  if (categoryDisplay) {
    message += `${categoryDisplay}\n`;
  }
  
  if (description) {
    message += `📝 ${description}\n`;
  }
  
  message += `${formattedAmount}\n\n`;
  message += `_Registrado com sucesso!_`;
  
  return message;
}
