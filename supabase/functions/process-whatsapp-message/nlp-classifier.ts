/**
 * NLP CLASSIFIER - Sistema Inteligente de Classificação
 * Baseado na arquitetura do Copiloto
 * 
 * Usa GPT-4 com Function Calling para:
 * - Interpretar linguagem natural e gírias
 * - Extrair intenção + entidades
 * - Manter contexto de conversa
 * - Gerar respostas amigáveis
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// TIPOS
// ============================================

export interface IntencaoClassificada {
  intencao: string;
  confianca: number;
  entidades: {
    valor?: number;
    categoria?: string;
    descricao?: string;
    data?: string;
    periodo?: string;
    conta?: string;
    plataforma?: string;
  };
  explicacao: string;
  resposta_conversacional: string;
  comando_original?: string;
}

// ============================================
// FUNCTION CALLING SCHEMA
// ============================================

const INTENT_CLASSIFICATION_FUNCTION = {
  name: 'classificar_comando',
  description: 'Classifica intenção e extrai entidades de comando financeiro',
  parameters: {
    type: 'object',
    properties: {
      intencao: {
        type: 'string',
        enum: [
          'REGISTRAR_RECEITA',
          'REGISTRAR_DESPESA',
          'CONSULTAR_SALDO',
          'RELATORIO',
          'CONSULTAR_METAS',
          'SAUDACAO',
          'AJUDA',
          'EDITAR_TRANSACAO',
          'EXCLUIR_TRANSACAO',
          'LISTAR_CONTAS',
          'SELECIONAR_CONTA',
          'OUTRO'
        ]
      },
      confianca: {
        type: 'number',
        minimum: 0,
        maximum: 1
      },
      entidades: {
        type: 'object',
        properties: {
          valor: { type: 'number' },
          categoria: { type: 'string' },
          descricao: { type: 'string' },
          data: { type: 'string' },
          periodo: { 
            type: 'string',
            enum: ['hoje', 'ontem', 'semana', 'mes']
          },
          conta: { type: 'string' },
          plataforma: { type: 'string' }
        }
      },
      explicacao: { type: 'string' },
      resposta_conversacional: { type: 'string' }
    },
    required: ['intencao', 'confianca', 'entidades', 'resposta_conversacional']
  }
};

// ============================================
// SYSTEM PROMPT
// ============================================

function gerarSystemPrompt(
  memoriaUsuario: string,
  historicoConversa: string,
  dataHoraAtual: string,
  contasDisponiveis: string
): string {
  return `Você é a "Ana Clara", assistente financeira inteligente do app Personal Finance.
Você é amigável, direta, entende gírias e expressões informais brasileiras.

## CONTEXTO TEMPORAL
${dataHoraAtual}

## CONTAS DISPONÍVEIS DO USUÁRIO
${contasDisponiveis}

## HISTÓRICO RECENTE DA CONVERSA (últimas mensagens)
${historicoConversa}

## MEMÓRIA DO USUÁRIO (gírias, preferências aprendidas)
${memoriaUsuario}

## SUA TAREFA
Interprete a mensagem do usuário e extraia TODAS as informações em uma única resposta.

## INTENÇÕES POSSÍVEIS
1. REGISTRAR_RECEITA: Recebeu dinheiro (salário, freelance, venda)
2. REGISTRAR_DESPESA: Gastou com algo
3. CONSULTAR_SALDO: Pergunta sobre saldo, quanto tem
4. RELATORIO: Pede resumo, relatório
5. CONSULTAR_METAS: Pergunta sobre metas
6. SAUDACAO: Cumprimento simples (oi, olá, bom dia)
7. AJUDA: Pede ajuda, comandos
8. EDITAR_TRANSACAO: Quer editar algo ("era X", "muda pra")
9. EXCLUIR_TRANSACAO: Quer excluir ("exclui essa", "apaga")
10. LISTAR_CONTAS: Quer ver contas disponíveis
11. SELECIONAR_CONTA: Está respondendo qual conta usar
12. OUTRO: Não relacionado a finanças

## REGRAS CRÍTICAS DE INTERPRETAÇÃO

### Gírias de Dinheiro
- "conto", "pila", "mango", "pau" = real (moeda)
- "50 conto" = R$ 50
- "torrei", "gastei", "paguei" = despesa

### Apelidos de Bancos (MUITO IMPORTANTE!)
- "roxinho", "roxinha", "conta roxa", "nu", "nuno bank", "nuno benk" = Nubank
- "laranjinha", "inter", "banco inter" = Inter
- "amarelinho", "bb", "banco do brasil" = Banco do Brasil
- "vermelhinho", "santander", "santan" = Santander
- "azulzinho", "caixa", "cef" = Caixa
- "itaú", "itau", "ita", "no itaú" = Itaú
- "bradesco", "brades" = Bradesco
- "c6", "c6 bank" = C6 Bank
- "picpay", "pic pay" = PicPay

### Interpretação de Datas
- "agora", "já", "acabei de" → data/hora ATUAL
- "hoje" → data de HOJE
- "ontem" → dia ANTERIOR
- Se não mencionar data → assume AGORA

### Categorias de Despesa (use APENAS estas)
- alimentacao: comida, bebida, restaurante, mercado, café, almoço, jantar
- transporte: uber, 99, taxi, ônibus, metrô
- lazer: cinema, show, festa, bar
- saude: farmácia, médico, remédio
- educacao: curso, livro, escola
- moradia: aluguel, conta de luz, água, internet
- vestuario: roupa, sapato, acessório
- outros: qualquer outra coisa

## CONTEXTO DE CONVERSA
Se o histórico mostra que Ana perguntou "Em qual conta?" e o usuário responde apenas com nome de banco:
- INTENÇÃO deve ser SELECIONAR_CONTA
- Extraia a conta mencionada no campo "conta"
- Use o contexto anterior para completar a transação

## FORMATO DE RESPOSTA
Retorne APENAS JSON válido, sem markdown:
{
  "intencao": "REGISTRAR_DESPESA",
  "confianca": 0.95,
  "entidades": {
    "valor": 50,
    "categoria": "alimentacao",
    "descricao": "Mercado",
    "conta": "Nubank"
  },
  "explicacao": "Usuário gastou 50 no mercado, conta Nubank",
  "resposta_conversacional": "✅ Registrei R$ 50 no mercado, conta Nubank! 🛒"
}

## FORMATAÇÃO DA RESPOSTA CONVERSACIONAL
- SEMPRE use emojis relevantes
- SEMPRE use *asteriscos* para negrito
- Separe informações em linhas
- Seja amigável e direto
- Se faltar informação, pergunte de forma natural`;
}

// ============================================
// BUSCAR HISTÓRICO DE CONVERSA
// ============================================

async function buscarHistoricoConversa(
  supabase: any,
  userId: string,
  limite: number = 8
): Promise<string> {
  try {
    const { data: mensagens } = await supabase
      .from('whatsapp_messages')
      .select('content, direction, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (!mensagens || mensagens.length === 0) {
      return 'Nenhuma conversa anterior.';
    }

    // Inverter para ordem cronológica
    const ordenadas = mensagens.reverse();
    
    return ordenadas.map((m: any) => {
      const hora = new Date(m.created_at).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const remetente = m.direction === 'inbound' ? 'Usuário' : 'Ana';
      return `[${hora}] ${remetente}: ${m.content}`;
    }).join('\n');
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return 'Erro ao carregar histórico.';
  }
}

// ============================================
// BUSCAR CONTAS DO USUÁRIO
// ============================================

async function buscarContasUsuario(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name, bank_name, type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!contas || contas.length === 0) {
      return 'Nenhuma conta cadastrada.';
    }

    return contas.map((c: any, i: number) => 
      `${i + 1}. ${c.name} (${c.bank_name || c.type})`
    ).join('\n');
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return 'Erro ao carregar contas.';
  }
}

// ============================================
// BUSCAR CONFIGURAÇÃO DO PROVEDOR DE IA
// ============================================

interface AIProviderConfig {
  provider: string;
  model: string;
  api_key: string;
  temperature: number;
}

async function buscarConfiguracaoIA(supabase: any, userId: string): Promise<AIProviderConfig | null> {
  try {
    // Buscar provedor padrão do usuário
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('provider, model, api_key, temperature')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_validated', true)
      .single();
    
    if (error || !data) {
      console.log('⚠️ Nenhum provedor configurado, usando padrão');
      return null;
    }
    
    console.log('✅ Provedor configurado:', data.provider, data.model);
    return data;
  } catch (error) {
    console.error('Erro ao buscar config IA:', error);
    return null;
  }
}

// ============================================
// CLASSIFICAR INTENÇÃO COM IA CONFIGURADA
// ============================================

export async function classificarIntencaoNLP(
  texto: string,
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<IntencaoClassificada> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Buscar configuração do usuário E contexto em paralelo
  const [configIA, historicoConversa, contasDisponiveis] = await Promise.all([
    buscarConfiguracaoIA(supabase, userId),
    buscarHistoricoConversa(supabase, userId, 8),
    buscarContasUsuario(supabase, userId)
  ]);

  // Usar configuração do usuário ou fallback para env
  const apiKey = configIA?.api_key || Deno.env.get('OPENAI_API_KEY');
  const model = configIA?.model || 'gpt-4o-mini';
  const temperature = configIA?.temperature || 0.3;
  const provider = configIA?.provider || 'openai';
  
  if (!apiKey) {
    console.error('❌ API Key não configurada');
    return fallbackClassificacao(texto);
  }

  // Data/hora atual
  const agora = new Date();
  const dataHoraAtual = `Data: ${agora.toLocaleDateString('pt-BR')} | Hora: ${agora.toLocaleTimeString('pt-BR')}`;

  // Memória do usuário (por enquanto vazia, pode expandir depois)
  const memoriaUsuario = 'Nenhuma memória específica registrada.';

  // Montar System Prompt
  const systemPrompt = gerarSystemPrompt(
    memoriaUsuario,
    historicoConversa,
    dataHoraAtual,
    contasDisponiveis
  );

  console.log('🧠 Chamando IA para classificação NLP...');
  console.log('🤖 Provider:', provider, '| Modelo:', model);
  console.log('📝 Texto:', texto);

  try {
    // Determinar endpoint baseado no provider
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    if (provider === 'google' || provider === 'gemini') {
      // Google Gemini usa endpoint diferente
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } else if (provider === 'anthropic' || provider === 'claude') {
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      };
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    }

    // Para OpenAI e compatíveis (OpenRouter)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: texto }
        ],
        functions: [INTENT_CLASSIFICATION_FUNCTION],
        function_call: { name: 'classificar_comando' },
        temperature: temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      return fallbackClassificacao(texto);
    }

    const result = await response.json();
    const functionCall = result.choices?.[0]?.message?.function_call;

    if (!functionCall?.arguments) {
      console.error('❌ Resposta sem function_call');
      return fallbackClassificacao(texto);
    }

    const intencao: IntencaoClassificada = JSON.parse(functionCall.arguments);
    intencao.comando_original = texto;

    console.log('✅ Classificação NLP:', JSON.stringify(intencao, null, 2));

    return intencao;

  } catch (error) {
    console.error('❌ Erro ao classificar:', error);
    return fallbackClassificacao(texto);
  }
}

// ============================================
// FALLBACK (se GPT falhar)
// ============================================

function fallbackClassificacao(texto: string): IntencaoClassificada {
  console.log('⚠️ Usando fallback de classificação');
  
  const textoLower = texto.toLowerCase();
  
  // Detectar saudação
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|eai|e ai)/i.test(textoLower)) {
    return {
      intencao: 'SAUDACAO',
      confianca: 0.8,
      entidades: {},
      explicacao: 'Saudação detectada',
      resposta_conversacional: 'Olá! 👋 Como posso ajudar?',
      comando_original: texto
    };
  }

  // Detectar saldo
  if (/saldo|quanto (tenho|gastei|ganhei)/i.test(textoLower)) {
    return {
      intencao: 'CONSULTAR_SALDO',
      confianca: 0.7,
      entidades: {},
      explicacao: 'Consulta de saldo',
      resposta_conversacional: '📊 Vou verificar seu saldo...',
      comando_original: texto
    };
  }

  // Detectar valor (possível despesa/receita)
  const valorMatch = textoLower.match(/(\d+(?:[.,]\d{2})?)/);
  if (valorMatch) {
    const valor = parseFloat(valorMatch[1].replace(',', '.'));
    return {
      intencao: 'REGISTRAR_DESPESA',
      confianca: 0.5,
      entidades: { valor, descricao: texto },
      explicacao: 'Possível despesa detectada',
      resposta_conversacional: `💰 Entendi R$ ${valor.toFixed(2)}. Em qual conta?`,
      comando_original: texto
    };
  }

  // Default
  return {
    intencao: 'OUTRO',
    confianca: 0.3,
    entidades: {},
    explicacao: 'Não consegui entender',
    resposta_conversacional: '🤔 Não entendi. Pode reformular? Diga algo como "gastei 50 no mercado"',
    comando_original: texto
  };
}

// ============================================
// EXPORTAR PARA USO
// ============================================

export { gerarSystemPrompt, buscarHistoricoConversa, buscarContasUsuario };
