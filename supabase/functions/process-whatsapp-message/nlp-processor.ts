// ============================================
// NLP PROCESSOR - Classificação de Intenções
// ============================================
// 
// Responsável por:
// - Detectar intenção do usuário (regex + LLM)
// - Extrair entidades (valor, conta, categoria)
// - Classificar consultas analíticas
// 
// ============================================

import { getSupabase } from './utils.ts';

// ============================================
// TIPOS
// ============================================

export type IntencaoTipo = 
  | 'REGISTRAR_RECEITA'
  | 'REGISTRAR_DESPESA'
  | 'CONSULTAR_SALDO'
  | 'EDITAR_TRANSACAO'
  | 'EXCLUIR_TRANSACAO'
  | 'ANALYTICS_QUERY'
  | 'LISTAR_CONTAS'
  | 'OUTRO';

export interface EntidadesExtraidas {
  valor?: number;
  conta?: string;
  categoria?: string;
  descricao?: string;
  periodo?: string;
  campo?: string; // Para edição: qual campo editar
}

export interface IntencaoClassificada {
  intencao: IntencaoTipo;
  confianca: number;
  entidades: EntidadesExtraidas;
  texto_original: string;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// ============================================
// PATTERNS DE DETECÇÃO (REGEX)
// ============================================

const PATTERNS = {
  // Receitas
  receita: /(?:ganhei|recebi|entrou|depositaram?|pix\s+(?:de|recebido)?|salario|salário|freelance|freela)\s*(?:R\$\s*)?([\d.,]+)/i,
  
  // Despesas
  despesa: /(?:gastei|paguei|comprei|saiu|debito|débito|pix\s+(?:para|pra|enviado)?)\s*(?:R\$\s*)?([\d.,]+)/i,
  
  // Valor genérico (R$ 50 ou 50 reais ou apenas número)
  valor: /(?:R\$\s*)?([\d]+(?:[.,]\d{1,2})?)/,
  
  // Contas bancárias
  contas: {
    nubank: /nubank|roxinho|nu\b/i,
    itau: /itau|itaú|iti\b/i,
    bradesco: /bradesco/i,
    santander: /santander/i,
    caixa: /caixa/i,
    inter: /inter|banco\s+inter/i,
    c6: /c6|c6\s*bank/i,
    picpay: /picpay/i,
    mercadopago: /mercado\s*pago|mp\b/i,
    bb: /banco\s+do\s+brasil|bb\b/i,
    original: /original/i,
    next: /next\b/i,
    neon: /neon/i,
  },
  
  // Tipos de conta (débito/crédito)
  tipoConta: {
    debito: /d[eé]bito|conta\s+corrente/i,
    credito: /cr[eé]dito|cart[aã]o/i,
  },
  
  // Categorias
  categorias: {
    alimentacao: /mercado|supermercado|ifood|uber\s*eats|rappi|restaurante|almo[çc]o|jantar|lanche|comida|pizza|hamburguer|padaria|a[çc]ougue|hortifruti/i,
    transporte: /uber|99|taxi|t[aá]xi|gasolina|combust[ií]vel|estacionamento|ped[aá]gio|corrida|onibus|[oô]nibus|metr[oô]/i,
    saude: /farm[aá]cia|m[eé]dico|hospital|consulta|rem[eé]dio|drogaria|exame|dentista|psic[oó]logo/i,
    educacao: /curso|escola|faculdade|livro|mensalidade|material\s+escolar|apostila|udemy|alura/i,
    moradia: /aluguel|condom[ií]nio|luz|energia|[aá]gua|g[aá]s|internet|iptu|seguro\s+residencial/i,
    lazer: /cinema|netflix|spotify|amazon|disney|hbo|streaming|show|ingresso|teatro|bar|balada|festa/i,
    vestuario: /roupa|cal[çc]ado|sapato|t[eê]nis|camisa|cal[çc]a|vestido|shopping|loja/i,
    pet: /pet|ra[çc][aã]o|veterin[aá]rio|cachorro|gato|petshop/i,
    assinaturas: /assinatura|mensalidade|plano|premium/i,
    investimentos: /investimento|a[çc][oõ]es|fii|tesouro|cdb|poupan[çc]a/i,
  },
  
  // Períodos
  periodos: {
    hoje: /hoje/i,
    ontem: /ontem/i,
    semana: /essa?\s+semana|esta\s+semana|semana\s+passada|[uú]ltimos?\s+7\s+dias/i,
    mes: /esse?\s+m[eê]s|este\s+m[eê]s|m[eê]s\s+passado|[uú]ltimos?\s+30\s+dias/i,
    ano: /esse?\s+ano|este\s+ano|ano\s+passado/i,
  },
  
  // Consultas analíticas
  analytics: /quanto\s+(?:gastei|ganhei|recebi|paguei)|qual\s+(?:o\s+)?(?:meu\s+)?(?:saldo|gasto|receita|total)|(?:me\s+)?mostra\s+(?:os\s+)?(?:gastos|receitas|despesas)/i,
  
  // Edição
  edicao: /(?:era|foi|muda|altera|corrige|atualiza)\s+(?:para?\s+)?(?:R\$\s*)?([\d.,]+)|muda\s+(?:para?\s+)?(\w+)|(?:era|foi)\s+(\w+)/i,
  
  // Exclusão
  exclusao: /(?:exclui|deleta|remove|apaga|cancela)\s+(?:essa?|essa\s+transa[çc][aã]o|[uú]ltimo|[uú]ltima|esse\s+lan[çc]amento)/i,
  
  // Listar contas
  listarContas: /(?:quais?|minhas?|lista)\s+(?:s[aã]o\s+)?(?:as\s+)?contas?|contas\s+(?:cadastradas?|ativas?)/i,
};

// ============================================
// CLASSIFICAR INTENÇÃO (PRINCIPAL)
// ============================================

export async function classificarIntencao(
  texto: string, 
  userId: string
): Promise<IntencaoClassificada> {
  const textoLower = texto.toLowerCase().trim();
  
  console.log('[NLP] Classificando:', textoLower.substring(0, 50));
  
  // 1. Tentar detecção por regex primeiro (mais rápido)
  const intencaoRegex = detectarIntencaoPorRegex(textoLower);
  
  if (intencaoRegex.intencao !== 'OUTRO' && intencaoRegex.confianca >= 0.7) {
    console.log('[NLP] Detectado por regex:', intencaoRegex.intencao, intencaoRegex.confianca);
    return intencaoRegex;
  }
  
  // 2. Se não detectou com confiança, usar LLM
  if (OPENAI_API_KEY) {
    try {
      console.log('[NLP] Usando LLM para classificação...');
      return await classificarIntencaoComLLM(texto, userId);
    } catch (error) {
      console.error('[NLP] Erro no LLM:', error);
    }
  }
  
  // 3. Retornar resultado do regex mesmo com baixa confiança
  if (intencaoRegex.intencao !== 'OUTRO') {
    return intencaoRegex;
  }
  
  // 4. Fallback
  return {
    intencao: 'OUTRO',
    confianca: 0.3,
    entidades: {},
    texto_original: texto
  };
}

// ============================================
// DETECÇÃO POR REGEX (RÁPIDO)
// ============================================

function detectarIntencaoPorRegex(texto: string): IntencaoClassificada {
  const entidades: EntidadesExtraidas = {};
  let intencao: IntencaoTipo = 'OUTRO';
  let confianca = 0.8;
  
  // Detectar valor
  const valorMatch = texto.match(PATTERNS.valor);
  if (valorMatch) {
    const valorStr = valorMatch[1].replace(',', '.');
    const valor = parseFloat(valorStr);
    if (!isNaN(valor) && valor > 0 && valor < 1000000) {
      entidades.valor = valor;
    }
  }
  
  // Detectar conta
  for (const [conta, pattern] of Object.entries(PATTERNS.contas)) {
    if (pattern.test(texto)) {
      entidades.conta = conta;
      break;
    }
  }
  
  // Detectar tipo de conta (débito/crédito)
  if (!entidades.conta) {
    for (const [tipo, pattern] of Object.entries(PATTERNS.tipoConta)) {
      if (pattern.test(texto)) {
        entidades.conta = tipo;
        break;
      }
    }
  }
  
  // Detectar categoria
  for (const [categoria, pattern] of Object.entries(PATTERNS.categorias)) {
    if (pattern.test(texto)) {
      entidades.categoria = categoria;
      break;
    }
  }
  
  // Detectar período
  for (const [periodo, pattern] of Object.entries(PATTERNS.periodos)) {
    if (pattern.test(texto)) {
      entidades.periodo = periodo;
      break;
    }
  }
  
  // ============================================
  // CLASSIFICAR INTENÇÃO
  // ============================================
  
  // Exclusão (prioridade alta)
  if (PATTERNS.exclusao.test(texto)) {
    intencao = 'EXCLUIR_TRANSACAO';
    confianca = 0.9;
  }
  // Edição
  else if (PATTERNS.edicao.test(texto)) {
    intencao = 'EDITAR_TRANSACAO';
    confianca = 0.85;
    const edicaoMatch = texto.match(PATTERNS.edicao);
    if (edicaoMatch) {
      if (edicaoMatch[1]) {
        entidades.valor = parseFloat(edicaoMatch[1].replace(',', '.'));
        entidades.campo = 'valor';
      }
      if (edicaoMatch[2]) {
        entidades.conta = edicaoMatch[2];
        entidades.campo = 'conta';
      }
      if (edicaoMatch[3]) {
        entidades.descricao = edicaoMatch[3];
        entidades.campo = 'descricao';
      }
    }
  }
  // Listar contas
  else if (PATTERNS.listarContas.test(texto)) {
    intencao = 'LISTAR_CONTAS';
    confianca = 0.9;
  }
  // Analytics
  else if (PATTERNS.analytics.test(texto)) {
    intencao = 'ANALYTICS_QUERY';
    confianca = 0.85;
  }
  // Receita
  else if (PATTERNS.receita.test(texto)) {
    intencao = 'REGISTRAR_RECEITA';
    const match = texto.match(PATTERNS.receita);
    if (match && match[1]) {
      entidades.valor = parseFloat(match[1].replace(',', '.'));
    }
    confianca = 0.85;
  }
  // Despesa
  else if (PATTERNS.despesa.test(texto)) {
    intencao = 'REGISTRAR_DESPESA';
    const match = texto.match(PATTERNS.despesa);
    if (match && match[1]) {
      entidades.valor = parseFloat(match[1].replace(',', '.'));
    }
    confianca = 0.85;
  }
  // Tem valor mas não detectou se é receita ou despesa
  else if (entidades.valor) {
    // Se tem categoria de despesa, assume despesa
    if (entidades.categoria) {
      intencao = 'REGISTRAR_DESPESA';
      confianca = 0.7;
    } else {
      // Assume despesa (mais comum)
      intencao = 'REGISTRAR_DESPESA';
      confianca = 0.5;
    }
  }
  
  // Extrair descrição
  if (intencao === 'REGISTRAR_DESPESA' || intencao === 'REGISTRAR_RECEITA') {
    const descricao = extrairDescricao(texto);
    if (descricao) entidades.descricao = descricao;
  }
  
  return {
    intencao,
    confianca,
    entidades,
    texto_original: texto
  };
}

// ============================================
// EXTRAIR DESCRIÇÃO
// ============================================

function extrairDescricao(texto: string): string {
  // Remove valor, palavras-chave comuns
  let descricao = texto
    .replace(/(?:gastei|paguei|comprei|ganhei|recebi|entrou|saiu)\s*/gi, '')
    .replace(/(?:R\$\s*)?[\d.,]+\s*/g, '')
    .replace(/(?:no|na|em|de|do|da|com|para|pra|pelo|pela)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove nome de banco se já foi detectado
  for (const pattern of Object.values(PATTERNS.contas)) {
    descricao = descricao.replace(pattern, '').trim();
  }
  
  // Capitaliza primeira letra
  if (descricao) {
    descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1);
  }
  
  return descricao;
}

// ============================================
// CLASSIFICAÇÃO COM LLM (FALLBACK)
// ============================================

async function classificarIntencaoComLLM(
  texto: string, 
  userId: string
): Promise<IntencaoClassificada> {
  const supabase = getSupabase();
  
  // Buscar histórico recente para contexto
  const { data: historico } = await supabase
    .from('whatsapp_messages')
    .select('content, direction')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  const historicoFormatado = historico?.map(m => 
    `${m.direction === 'inbound' ? 'Usuário' : 'Bot'}: ${m.content?.substring(0, 100)}` 
  ).reverse().join('\n') || '';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um classificador de intenções para um app de finanças pessoais brasileiro.
Analise a mensagem do usuário e retorne APENAS um JSON válido (sem markdown) com:

{
  "intencao": "REGISTRAR_RECEITA" | "REGISTRAR_DESPESA" | "CONSULTAR_SALDO" | "EDITAR_TRANSACAO" | "EXCLUIR_TRANSACAO" | "ANALYTICS_QUERY" | "OUTRO",
  "confianca": 0.0 a 1.0,
  "entidades": {
    "valor": número ou null,
    "categoria": "alimentacao" | "transporte" | "saude" | "educacao" | "moradia" | "lazer" | "vestuario" | "pet" | null,
    "conta": "nubank" | "itau" | "bradesco" | "santander" | "caixa" | "inter" | "c6" | "picpay" | null,
    "descricao": string ou null,
    "periodo": "hoje" | "ontem" | "semana" | "mes" | "ano" | null
  }
}

REGRAS:
- Valores em reais (R$) devem ser números (50.00, não "50,00")
- "Gastei", "paguei", "comprei" = REGISTRAR_DESPESA
- "Ganhei", "recebi", "entrou" = REGISTRAR_RECEITA
- "Quanto gastei", "qual meu saldo" = ANALYTICS_QUERY
- "Exclui", "apaga" = EXCLUIR_TRANSACAO
- "Era", "muda pra" = EDITAR_TRANSACAO

Histórico recente:
${historicoFormatado}`
        },
        { role: 'user', content: texto }
      ],
      temperature: 0.1,
      max_tokens: 300
    })
  });
  
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  
  try {
    // Tentar parsear JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar valor
      if (parsed.entidades?.valor) {
        const valor = parseFloat(parsed.entidades.valor);
        if (isNaN(valor) || valor <= 0 || valor >= 1000000) {
          parsed.entidades.valor = null;
        } else {
          parsed.entidades.valor = valor;
        }
      }
      
      return {
        intencao: parsed.intencao || 'OUTRO',
        confianca: parsed.confianca || 0.7,
        entidades: parsed.entidades || {},
        texto_original: texto
      };
    }
  } catch (e) {
    console.error('[NLP] Erro ao parsear resposta LLM:', e);
  }
  
  return {
    intencao: 'OUTRO',
    confianca: 0.3,
    entidades: {},
    texto_original: texto
  };
}

// ============================================
// FUNÇÕES AUXILIARES EXPORTADAS
// ============================================

/**
 * Verifica se o texto é uma consulta analítica
 */
export function isAnalyticsQuery(texto: string): boolean {
  return PATTERNS.analytics.test(texto.toLowerCase());
}

/**
 * Detecta conta mencionada no texto
 */
export function detectarConta(texto: string): string | null {
  const textoLower = texto.toLowerCase();
  
  for (const [conta, pattern] of Object.entries(PATTERNS.contas)) {
    if (pattern.test(textoLower)) {
      return conta;
    }
  }
  
  // Verificar tipo de conta
  for (const [tipo, pattern] of Object.entries(PATTERNS.tipoConta)) {
    if (pattern.test(textoLower)) {
      return tipo;
    }
  }
  
  return null;
}

/**
 * Detecta categoria mencionada no texto
 */
export function detectarCategoria(texto: string): string | null {
  const textoLower = texto.toLowerCase();
  
  for (const [categoria, pattern] of Object.entries(PATTERNS.categorias)) {
    if (pattern.test(textoLower)) {
      return categoria;
    }
  }
  
  return null;
}

/**
 * Extrai valor numérico do texto
 */
export function extrairValor(texto: string): number | null {
  const match = texto.match(PATTERNS.valor);
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(valor) && valor > 0 && valor < 1000000) {
      return valor;
    }
  }
  return null;
}

/**
 * Verifica se é comando de edição
 */
export function isComandoEdicao(texto: string): boolean {
  const t = texto.toLowerCase();
  // "era 50", "era R$ 50", "muda pra nubank", "muda pro itau"
  return /era\s+(?:R\$\s*)?\d/.test(t) || /muda\s+(?:pra|pro|para)\s+\w+/.test(t);
}

/**
 * Verifica se é comando de exclusão
 */
export function isComandoExclusao(texto: string): boolean {
  const t = texto.toLowerCase();
  // "exclui essa", "deleta", "apaga", "remove"
  return /(?:exclui|deleta|apaga|remove)/.test(t);
}

/**
 * Extrai entidades de um comando de edição
 * "era 95" → { valor: 95 }
 * "muda pra Nubank" → { conta: "Nubank" }
 */
export function extrairEntidadesEdicao(texto: string): { valor?: number; conta?: string } {
  const entidades: { valor?: number; conta?: string } = {};
  
  // Extrair valor: "era 95", "era R$ 95", "era 95,50"
  const matchValor = texto.match(/era\s+(?:R\$\s*)?([\d.,]+)/i);
  if (matchValor) {
    const valorStr = matchValor[1].replace(',', '.');
    const valor = parseFloat(valorStr);
    if (!isNaN(valor) && valor > 0) {
      entidades.valor = valor;
    }
  }
  
  // Extrair conta: "muda pra Nubank", "muda pro Itau"
  const matchConta = texto.match(/muda\s+(?:pra|pro|para)\s+(\w+)/i);
  if (matchConta) {
    entidades.conta = matchConta[1];
  }
  
  return entidades;
}
