// ============================================
// 🤖 LLM INTENT PARSER - FASE 1
// Edge Function para interpretar intenções complexas
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// INTERFACES
// ============================================

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  category_id: string;
  transaction_date: string;
  type: 'income' | 'expense';
}

interface IntentRequest {
  message: string;
  context: {
    transaction: Transaction;
    available_categories: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
}

interface Intent {
  action: 'edit_value' | 'edit_description' | 'edit_category' | 'edit_date' | 'confirm' | 'cancel';
  value: string;
  confidence: number;
  reasoning?: string;
}

interface IntentResponse {
  intents: Intent[];
  raw_response?: string;
  error?: string;
}

// Exemplos curtos para guiar o modelo
const FEW_SHOT_EXAMPLES = `
Exemplos de interpretação correta:

Mensagem: "120"
Resposta:
{
  "intents": [
    { "action": "edit_value", "value": "120", "confidence": 0.95 }
  ]
}

Mensagem: "120 no mercado"
Resposta:
{
  "intents": [
    { "action": "edit_value", "value": "120", "confidence": 0.95 }
  ]
}

Mensagem: "muda categoria pra alimentação"
Resposta:
{
  "intents": [
    { "action": "edit_category", "value": "alimentação", "confidence": 0.9 }
  ]
}
`;

// ============================================
// PROMPT TEMPLATE
// ============================================

function buildPrompt(request: IntentRequest): string {
  const { message, context } = request;
  const { transaction, available_categories } = context;

  // Formatar categorias disponíveis
  const categoriesList = available_categories
    .map(cat => `- ${cat.name} (${cat.type})`)
    .join('\n');

  // Formatar data legível
  const dateFormatted = new Date(transaction.transaction_date).toLocaleDateString('pt-BR');

  return `Você é um assistente financeiro especializado em interpretar comandos de edição de transações em português do Brasil.

CONTEXTO DA TRANSAÇÃO ATUAL:
- Valor: R$ ${transaction.amount.toFixed(2)}
- Descrição: "${transaction.description}"
- Categoria: ${transaction.category}
- Data: ${dateFormatted}
- Tipo: ${transaction.type === 'income' ? 'Receita' : 'Despesa'}

CATEGORIAS DISPONÍVEIS:
${categoriesList}

MENSAGEM DO USUÁRIO:
"${message}"

TAREFA:
Identifique TODAS as intenções de edição na mensagem do usuário.

REGRAS DE INTERPRETAÇÃO:
1. VALOR (edit_value):
   - O campo "value" DEVE conter APENAS o número, sem texto adicional.
   - Exemplos CORRETOS: "150", "50.5", "150.50", "150,50".
   - Exemplos ERRADOS: "150 no mercado", "mudar para 150", "R$ 150".
   - Mesmo que o usuário diga "120 no mercado", o "value" de edit_value deve ser apenas "120".
2. DESCRIÇÃO (edit_description):
   - Texto descritivo sem números de valor (ex: "Uber Black", "Supermercado Atacadão").
   - Frases com "muda/altera descrição para X" = editar descrição.

3. CATEGORIA:
   - Palavra "categoria" seguida de nome (ex: "categoria alimentação") = editar categoria
   - Nome de categoria sozinho (ex: "transporte", "alimentação") = editar categoria
   - Deve corresponder a uma das categorias disponíveis

4. DATA:
   - Formatos de data (ex: "15/11", "15/11/2025") = editar data
   - Palavras temporais (ex: "ontem", "hoje", "anteontem") = editar data
   - Frases com "muda/altera data para X" = editar data

5. CONFIRMAÇÃO/CANCELAMENTO:
   - "pronto", "ok", "confirma", "tá bom" = confirmar
   - "cancelar", "sair", "desistir", "não" = cancelar

IMPORTANTE:
- Múltiplas intenções são permitidas em uma única mensagem
- Cada intenção deve ter uma confiança (0.0 a 1.0)
- Se não tiver certeza, use confiança < 0.7
- Sempre priorize a interpretação mais natural

RETORNE APENAS JSON VÁLIDO (sem markdown):
{
  "intents": [
    {
      "action": "edit_value|edit_description|edit_category|edit_date|confirm|cancel",
      "value": "valor extraído da mensagem",
      "confidence": 0.0-1.0,
      "reasoning": "breve explicação da interpretação"
    }
  ]
}`;
}

// ============================================
// FUNÇÃO PRINCIPAL: CHAMAR LLM
// ============================================

async function callOpenAI(prompt: string): Promise<IntentResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('LLM_MODEL') || 'gpt-4o-mini';

  if (!apiKey) {
    return {
      intents: [],
      error: 'OPENAI_API_KEY não configurada'
    };
  }

  try {
    console.log('🤖 Chamando OpenAI:', model);
    console.log('📝 Prompt length:', prompt.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente financeiro especializado em interpretar comandos de edição de transações. Sempre retorne JSON válido.'
          },
          {
            role: 'user',
            content: 'A seguir alguns exemplos de entrada e saída em JSON para você seguir como padrão:\n\n' + FEW_SHOT_EXAMPLES
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Temperatura bem baixa para respostas mais determinísticas
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      return {
        intents: [],
        error: `OpenAI error: ${response.status}`
      };
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    
    console.log('✅ Resposta OpenAI:', rawResponse);

    // Parse JSON response
    const parsed = JSON.parse(rawResponse);
    
    return {
      intents: parsed.intents || [],
      raw_response: rawResponse
    };

  } catch (error) {
    console.error('❌ Erro ao chamar OpenAI:', error);
    return {
      intents: [],
      error: String(error)
    };
  }
}

// ============================================
// FALLBACK: INTERPRETAÇÃO SIMPLES (SEM LLM)
// ============================================

function simpleFallbackParser(message: string, context: IntentRequest['context']): IntentResponse {
  console.log('🛟 Usando fallback simples (sem LLM)');
  
  const intents: Intent[] = [];
  const lowerMsg = message.toLowerCase().trim();

  // 1. Detectar valor (número puro)
  const numberMatch = lowerMsg.match(/^(\d+[.,]?\d*)$/);
  if (numberMatch) {
    intents.push({
      action: 'edit_value',
      value: numberMatch[1].replace(',', '.'),
      confidence: 0.9,
      reasoning: 'Número puro detectado'
    });
  }

  // 2. Detectar categoria
  const categoryMatch = lowerMsg.match(/categoria\s+(\w+)/);
  if (categoryMatch) {
    intents.push({
      action: 'edit_category',
      value: categoryMatch[1],
      confidence: 0.85,
      reasoning: 'Palavra "categoria" detectada'
    });
  } else {
    // Verificar se é nome de categoria diretamente
    const matchedCategory = context.available_categories.find(
      cat => cat.name.toLowerCase() === lowerMsg
    );
    if (matchedCategory) {
      intents.push({
        action: 'edit_category',
        value: matchedCategory.name,
        confidence: 0.8,
        reasoning: 'Nome de categoria encontrado'
      });
    }
  }

  // 3. Detectar data
  const dateMatch = lowerMsg.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
  if (dateMatch) {
    intents.push({
      action: 'edit_date',
      value: dateMatch[1],
      confidence: 0.85,
      reasoning: 'Formato de data detectado'
    });
  }

  // 4. Detectar palavras temporais
  if (lowerMsg.includes('ontem')) {
    intents.push({
      action: 'edit_date',
      value: 'ontem',
      confidence: 0.8,
      reasoning: 'Palavra temporal detectada'
    });
  }

  // 5. Detectar confirmação/cancelamento
  if (['pronto', 'ok', 'confirma', 'sim'].some(word => lowerMsg === word)) {
    intents.push({
      action: 'confirm',
      value: 'true',
      confidence: 0.95,
      reasoning: 'Confirmação detectada'
    });
  }

  if (['cancelar', 'sair', 'não', 'desistir'].some(word => lowerMsg === word)) {
    intents.push({
      action: 'cancel',
      value: 'true',
      confidence: 0.95,
      reasoning: 'Cancelamento detectado'
    });
  }

  // 6. Se não detectou nada, assumir descrição
  if (intents.length === 0 && lowerMsg.length > 3) {
    intents.push({
      action: 'edit_description',
      value: message.trim(),
      confidence: 0.7,
      reasoning: 'Texto livre interpretado como descrição'
    });
  }

  return { intents };
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req) => {
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
    console.log('🚀 [llm-intent-parser] Requisição recebida');

    const request: IntentRequest = await req.json();
    
    console.log('📥 Request:', {
      message: request.message,
      transaction_id: request.context.transaction.id,
      categories_count: request.context.available_categories.length
    });

    // Validação
    if (!request.message || !request.context) {
      return new Response(JSON.stringify({
        intents: [],
        error: 'Requisição inválida: message e context são obrigatórios'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Tentar usar LLM
    const prompt = buildPrompt(request);
    let result = await callOpenAI(prompt);

    // Se LLM falhar, usar fallback
    if (result.error || result.intents.length === 0) {
      console.log('⚠️ LLM falhou ou não retornou intenções, usando fallback');
      result = simpleFallbackParser(request.message, request.context);
    }

    console.log('✅ Intenções detectadas:', result.intents.length);
    result.intents.forEach((intent, i) => {
      console.log(`  ${i + 1}. ${intent.action}: "${intent.value}" (${(intent.confidence * 100).toFixed(0)}%)`);
    });

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Erro no handler:', error);
    return new Response(JSON.stringify({
      intents: [],
      error: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
