// ============================================
// CONTAS-PAGAR.TS - Gestão de Contas a Pagar
// Personal Finance LA - Ana Clara
// FASE 3.1: Consultas | FASE 3.2: CRUD
// ============================================

import { getSupabase, getEmojiBanco } from './utils.ts';
import { resolveCanonicalCategory } from '../_shared/canonical-categorization.ts';
import { 
  validarValor, 
  validarDiaVencimento, 
  validarDescricao, 
  validarParcelas,
  textoContemValorNegativo,
  validarDataCompleta,
  extrairEValidarData,
  type ValidacaoDataCompleta
} from './validacoes.ts';

// ============================================
// TIMEZONE HELPERS - SEMPRE USA SÃO PAULO (BRT)
// ============================================

/**
 * Retorna a data atual no fuso horário de São Paulo
 * IMPORTANTE: Deno/Edge Functions rodam em UTC, precisamos ajustar para BRT
 */
function getHojeSaoPaulo(): Date {
  const agora = new Date();
  // Converter para string no timezone de São Paulo e parsear de volta
  const saoPauloStr = agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(saoPauloStr);
}

/**
 * Retorna a data atual em formato YYYY-MM-DD no fuso de São Paulo
 */
function getHojeStrSaoPaulo(): string {
  const hoje = getHojeSaoPaulo();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula dias entre duas datas considerando timezone de São Paulo
 */
function calcularDiasParaVencimentoBRT(dueDate: string): number {
  const hoje = getHojeSaoPaulo();
  hoje.setHours(0, 0, 0, 0);
  
  // Parse a data de vencimento como meia-noite em São Paulo
  const [ano, mes, dia] = dueDate.split('-').map(Number);
  const vencimento = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// TIPOS
// ============================================

export type TipoIntencaoContaPagar = 
  | 'LISTAR_CONTAS_PAGAR'      // "contas a pagar", "contas pendentes"
  | 'CONTAS_VENCENDO'          // "o que vence essa semana"
  | 'CONTAS_VENCIDAS'          // "contas vencidas", "atrasadas"
  | 'CONTAS_DO_MES'            // "contas desse mês"
  | 'RESUMO_CONTAS_MES'        // "quanto tenho de contas", "resumo"
  | 'CADASTRAR_CONTA_PAGAR'    // "tenho que pagar 150 de luz dia 10"
  | 'EDITAR_CONTA_PAGAR'       // "mudar valor da luz para 180"
  | 'EXCLUIR_CONTA_PAGAR'      // "excluir conta de luz"
  | 'MARCAR_CONTA_PAGA'        // (fase 3.3)
  | 'VALOR_CONTA_VARIAVEL'     // "luz veio 190"
  | 'HISTORICO_CONTA'          // "histórico da luz"
  | 'PAGAR_FATURA_CARTAO'      // "paguei a fatura do Nubank"
  | 'DESFAZER_PAGAMENTO'       // "desfazer pagamento da luz"
  | 'RESUMO_PAGAMENTOS_MES'    // "o que paguei esse mês"
  | 'CONTAS_AMBIGUO'           // "minhas contas" (perguntar ao usuário)
  | 'CADASTRAR_CONTA_AMBIGUO'  // "cadastrar conta" (bancária ou a pagar?)
  | null;

export interface ContasVencendoWindow {
  startOffsetDays: number;
  endOffsetDays: number;
  label: 'hoje' | 'amanha' | 'proximos_dias';
}

const NUMEROS_TEMPORAIS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
};

function normalizeCommandText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseTemporalNumber(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return NUMEROS_TEMPORAIS[token] ?? null;
}

function extractUpcomingDays(command: string): number | null {
  const match = command.match(
    /proximos?\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze)\s+dias?/,
  );
  return parseTemporalNumber(match?.[1]);
}

function formatDateOffset(baseDate: Date, offsetDays: number): string {
  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + offsetDays);
  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
}

export function resolveContasVencendoWindow(entidades?: Record<string, unknown>): ContasVencendoWindow {
  const command = normalizeCommandText(entidades?.comando_original as string | undefined);

  const upcomingDays = extractUpcomingDays(command);
  if (upcomingDays !== null) {
    return { startOffsetDays: 0, endOffsetDays: upcomingDays, label: 'proximos_dias' };
  }

  if (/\bhoje\b/.test(command)) {
    return { startOffsetDays: 0, endOffsetDays: 0, label: 'hoje' };
  }

  if (/\bamanha\b/.test(command)) {
    return { startOffsetDays: 1, endOffsetDays: 1, label: 'amanha' };
  }

  return { startOffsetDays: 0, endOffsetDays: 7, label: 'proximos_dias' };
}

export function resolveContasDoMesReference(entidades?: Record<string, unknown>): { mes?: number; ano?: number } {
  const command = normalizeCommandText(entidades?.comando_original as string | undefined);
  if (command.includes('mes que vem') || command.includes('proximo mes')) {
    const today = getHojeSaoPaulo();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { mes: nextMonth.getMonth(), ano: nextMonth.getFullYear() };
  }

  return {};
}

// ============================================
// ALIASES DE CONTAS (FASE 3.2)
// ============================================

// IMPORTANTE: Aliases mais específicos devem vir ANTES dos genéricos
// Ex: 'netflix' antes de 'internet' (porque 'net' está em 'netflix')
export const CONTA_ALIASES: Record<string, string[]> = {
  // Streaming (mais específicos primeiro)
  'netflix': ['netflix'],
  'spotify': ['spotify', 'deezer', 'apple music'],
  'amazon': ['amazon prime', 'prime video', 'amazon'],
  'disney': ['disney+', 'disneyplus', 'disney plus', 'disney'],
  'hbo': ['hbo max', 'hbo'],
  'max': ['max streaming'],
  'globoplay': ['globoplay', 'globo play'],
  
  // Serviços (depois dos streamings)
  'luz': ['luz', 'energia', 'enel', 'cpfl', 'eletropaulo', 'light', 'cemig', 'celpe', 'energisa', 'coelba', 'eletricidade'],
  'agua': ['agua', 'água', 'sabesp', 'copasa', 'sanepar', 'cedae', 'cagece', 'esgoto', 'saneamento'],
  'internet': ['internet', 'wifi', 'vivo fibra', 'claro net', 'banda larga', 'oi fibra', 'fibra ótica', 'fibra optica'],
  'aluguel': ['aluguel', 'alugel', 'moradia', 'locação', 'locacao'],
  'condominio': ['condominio', 'condomínio', 'cond', 'taxa condominial'],
  'gas': ['gas', 'gás', 'comgas', 'ultragaz', 'supergasbras', 'liquigás', 'naturgy'],
  'telefone': ['telefone', 'celular', 'móvel', 'movel', 'linha fixa'],
  
  // Outros
  'seguro': ['seguro', 'seguro auto', 'seguro carro', 'seguro vida', 'seguro residencial'],
  'plano_saude': ['plano de saúde', 'plano saude', 'unimed', 'bradesco saúde', 'sulamerica', 'amil', 'hapvida'],
  'escola': ['escola', 'faculdade', 'mensalidade escolar', 'curso', 'universidade'],
  'financiamento': ['financiamento', 'prestação', 'parcela carro', 'parcela casa', 'consórcio'],
  'iptu': ['iptu', 'imposto predial'],
  'ipva': ['ipva', 'licenciamento', 'detran'],
  'academia': ['academia', 'gym', 'smart fit', 'bluefit'],
};

// ============================================
// PALAVRAS QUE INDICAM PARCELAMENTO OBRIGATÓRIO
// ============================================
// Quando o usuário menciona essas palavras SEM número de parcelas,
// devemos PERGUNTAR quantas parcelas são, não assumir conta fixa!

const PALAVRAS_PARCELAMENTO_OBRIGATORIO = [
  'financiamento',
  'empréstimo',
  'emprestimo',
  'crediário',
  'crediario',
  'consórcio',
  'consorcio',
  'carnê',
  'carne',
  'prestação',
  'prestacao',
  'parcelamento',
  'parcelado',
  'parcelas'
];

/**
 * Verifica se a descrição indica um parcelamento obrigatório
 * (financiamento, empréstimo, etc.)
 */
function ehParcelamentoObrigatorio(texto: string): boolean {
  const textoLower = texto.toLowerCase();
  return PALAVRAS_PARCELAMENTO_OBRIGATORIO.some(palavra => 
    textoLower.includes(palavra)
  );
}

// Mapeamento de chaves internas para nomes de exibição bonitos
const NOMES_EXIBICAO: Record<string, string> = {
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'amazon': 'Amazon Prime',
  'disney': 'Disney+',
  'hbo': 'HBO Max',
  'max': 'Max',
  'globoplay': 'Globoplay',
  'luz': 'Luz',
  'agua': 'Água',
  'internet': 'Internet',
  'aluguel': 'Aluguel',
  'condominio': 'Condomínio',
  'gas': 'Gás',
  'telefone': 'Telefone',
  'seguro': 'Seguro',
  'plano_saude': 'Plano de Saúde',
  'escola': 'Escola',
  'financiamento': 'Financiamento',
  'iptu': 'IPTU',
  'ipva': 'IPVA',
  'academia': 'Academia',
};

// ============================================
// DETECÇÃO DE FATURA DE CARTÃO DE CRÉDITO
// ============================================

const PALAVRAS_FATURA_CARTAO = [
  'fatura',
  'cartão',
  'cartao',
  'credit card',
  'visa',
  'mastercard',
  'elo'
];

const NOMES_CARTOES_BANCOS = [
  'nubank', 'nu',
  'itau', 'itaú', 'itaucard',
  'bradesco',
  'santander',
  'banco do brasil', 'bb', 'ourocard',
  'caixa',
  'inter',
  'c6', 'c6 bank',
  'next',
  'original',
  'pan',
  'neon',
  'picpay',
  'mercado pago',
  'ame',
  'will bank', 'will',
  'digio',
  'credicard',
  'porto seguro', 'porto',
  'xp'
];

export interface DeteccaoFaturaCartao {
  ehFaturaCartao: boolean;
  nomeCartao: string | null;
  bancoIdentificado: string | null;
}

/**
 * Detecta se o texto indica uma fatura de cartão de crédito
 * e tenta identificar qual cartão/banco
 */
export function detectarFaturaCartao(texto: string): DeteccaoFaturaCartao {
  const textoLower = texto.toLowerCase();
  
  // Verificar se menciona fatura/cartão
  const temPalavraFatura = PALAVRAS_FATURA_CARTAO.some(p => textoLower.includes(p));
  
  if (!temPalavraFatura) {
    return { ehFaturaCartao: false, nomeCartao: null, bancoIdentificado: null };
  }
  
  // Tentar identificar qual cartão/banco
  for (const banco of NOMES_CARTOES_BANCOS) {
    if (textoLower.includes(banco)) {
      // Capitalizar nome do banco
      const nomeCapitalizado = banco.charAt(0).toUpperCase() + banco.slice(1);
      console.log(`[FATURA-CARTAO] Detectado banco: ${nomeCapitalizado}`);
      return {
        ehFaturaCartao: true,
        nomeCartao: `Fatura ${nomeCapitalizado}`,
        bancoIdentificado: banco
      };
    }
  }
  
  // Detectou fatura mas não identificou o cartão
  console.log('[FATURA-CARTAO] Detectada fatura genérica (sem banco identificado)');
  return {
    ehFaturaCartao: true,
    nomeCartao: null,
    bancoIdentificado: null
  };
}

/**
 * Busca cartão de crédito do usuário por nome/banco
 */
export async function buscarCartaoPorNome(
  userId: string, 
  nomeBanco: string
): Promise<{ id: string; name: string; brand: string; due_day: number } | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name, brand, due_day')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or(`name.ilike.%${nomeBanco}%,brand.ilike.%${nomeBanco}%`)
    .limit(1)
    .single();
  
  if (error || !data) {
    console.log(`[FATURA-CARTAO] Cartão não encontrado para: ${nomeBanco}`);
    return null;
  }
  
  console.log(`[FATURA-CARTAO] Cartão encontrado: ${data.name} (${data.id})`);
  return data;
}

/**
 * Lista todos os cartões ativos do usuário
 */
export async function listarCartoesUsuario(
  userId: string
): Promise<Array<{ id: string; name: string; brand: string }>> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name, brand')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (error || !data) {
    console.log('[FATURA-CARTAO] Nenhum cartão encontrado');
    return [];
  }
  
  return data;
}

/**
 * Cria ou atualiza fatura de cartão usando a função SQL
 */
export async function criarOuAtualizarFaturaCartao(
  userId: string,
  cartaoId: string,
  valor: number,
  dataVencimento: string
): Promise<{ sucesso: boolean; faturaId?: string; acao?: string; erro?: string }> {
  const supabase = getSupabase();
  
  console.log(`[FATURA-CARTAO] Criando/atualizando fatura: cartao=${cartaoId}, valor=${valor}, venc=${dataVencimento}`);
  
  const { data, error } = await supabase
    .rpc('criar_ou_atualizar_fatura', {
      p_user_id: userId,
      p_credit_card_id: cartaoId,
      p_amount: valor,
      p_due_date: dataVencimento
    });
  
  if (error) {
    console.error('[FATURA-CARTAO] Erro ao criar/atualizar fatura:', error);
    return { sucesso: false, erro: error.message };
  }
  
  if (data && data.length > 0) {
    const resultado = data[0];
    console.log(`[FATURA-CARTAO] Fatura ${resultado.acao}: ${resultado.fatura_id}`);
    return { 
      sucesso: resultado.sucesso, 
      faturaId: resultado.fatura_id, 
      acao: resultado.acao 
    };
  }
  
  return { sucesso: false, erro: 'Resposta inesperada da função SQL' };
}

// Normaliza nome da conta usando aliases
// Usa match de palavra completa para evitar falsos positivos (ex: "net" em "netflix")
export function normalizarNomeConta(texto: string): string {
  const textoLower = texto.toLowerCase().trim();
  
  // Primeiro: busca match exato
  for (const [chaveInterna, aliases] of Object.entries(CONTA_ALIASES)) {
    if (aliases.some(alias => textoLower === alias)) {
      return NOMES_EXIBICAO[chaveInterna] || chaveInterna.charAt(0).toUpperCase() + chaveInterna.slice(1);
    }
  }
  
  // Segundo: busca se o texto COMEÇA com algum alias (mais seguro que includes)
  for (const [chaveInterna, aliases] of Object.entries(CONTA_ALIASES)) {
    if (aliases.some(alias => textoLower.startsWith(alias + ' ') || textoLower.startsWith(alias))) {
      // Verifica se é realmente o início da palavra, não parte de outra
      const alias = aliases.find(a => textoLower.startsWith(a));
      if (alias && (textoLower === alias || textoLower[alias.length] === ' ' || textoLower[alias.length] === undefined)) {
        return NOMES_EXIBICAO[chaveInterna] || chaveInterna.charAt(0).toUpperCase() + chaveInterna.slice(1);
      }
    }
  }
  
  // Terceiro: busca palavra completa no texto (com word boundaries)
  for (const [chaveInterna, aliases] of Object.entries(CONTA_ALIASES)) {
    for (const alias of aliases) {
      // Cria regex para match de palavra completa
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textoLower)) {
        return NOMES_EXIBICAO[chaveInterna] || chaveInterna.charAt(0).toUpperCase() + chaveInterna.slice(1);
      }
    }
  }
  
  // Retorna original capitalizado se não encontrar alias
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// ============================================
// CALCULAR DATA DE VENCIMENTO (LOCAL)
// ============================================

/**
 * Converte diaVencimento (número ou string) para objeto Date
 * Suporta: 15, "15", "15/03", "15/03/2026"
 */
function calcularDataVencimentoLocal(diaVencimento: number | string): Date | null {
  const hoje = getHojeSaoPaulo();
  hoje.setHours(0, 0, 0, 0);
  
  const diaStr = String(diaVencimento).trim();
  console.log(`[DATA] Convertendo: "${diaStr}" (tipo: ${typeof diaVencimento})`);
  
  // Caso 1: Número simples (dia do mês) - 15, "15", "5"
  if (/^\d{1,2}$/.test(diaStr)) {
    const dia = parseInt(diaStr);
    if (dia < 1 || dia > 31) {
      console.error(`[DATA] Dia inválido: ${dia}`);
      return null;
    }
    
    let data = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    // Se já passou, vai para o próximo mês
    if (data <= hoje) {
      data.setMonth(data.getMonth() + 1);
    }
    
    console.log(`[DATA] Dia simples: ${dia} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Caso 2: Formato DD/MM (dia/mês) - "15/03", "5/1"
  const matchDDMM = diaStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (matchDDMM) {
    const dia = parseInt(matchDDMM[1]);
    const mes = parseInt(matchDDMM[2]) - 1; // JavaScript meses são 0-indexed
    
    if (dia < 1 || dia > 31 || mes < 0 || mes > 11) {
      console.error(`[DATA] Data inválida: dia=${dia}, mes=${mes + 1}`);
      return null;
    }
    
    let ano = hoje.getFullYear();
    let data = new Date(ano, mes, dia);
    
    // Se a data já passou este ano, vai para o próximo ano
    if (data <= hoje) {
      ano += 1;
      data = new Date(ano, mes, dia);
    }
    
    console.log(`[DATA] DD/MM: ${dia}/${mes + 1} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Caso 3: Formato DD/MM/YYYY ou DD/MM/YY - "15/03/2026", "15/03/26"
  const matchDDMMYYYY = diaStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (matchDDMMYYYY) {
    const dia = parseInt(matchDDMMYYYY[1]);
    const mes = parseInt(matchDDMMYYYY[2]) - 1;
    let ano = parseInt(matchDDMMYYYY[3]);
    
    // Converter ano de 2 dígitos para 4
    if (ano < 100) {
      ano += 2000;
    }
    
    const data = new Date(ano, mes, dia);
    console.log(`[DATA] DD/MM/YYYY: ${dia}/${mes + 1}/${ano} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Fallback: formato não reconhecido
  console.error(`[DATA] Formato não reconhecido: "${diaStr}"`);
  return null;
}

// ============================================
// TIPOS DE CONTA (SISTEMA ROBUSTO)
// ============================================

export type BillType = 
  | 'fixed'        // Conta fixa - mesmo valor todo mês (aluguel, plano)
  | 'variable'     // Conta variável - valor muda (luz, água, gás)
  | 'subscription' // Assinatura digital (Netflix, Spotify)
  | 'installment'  // Parcelamento (geladeira em 10x)
  | 'one_time'     // Conta avulsa/única (IPVA, matrícula)
  | 'credit_card'  // Fatura de cartão
  | 'unknown';     // Tipo desconhecido - perguntar ao usuário

// Interface para dados de cadastro
export interface DadosCadastroConta {
  tipo?: BillType;
  descricao?: string;
  valor?: number;
  diaVencimento?: number;   // 1-31
  dataVencimento?: string;  // YYYY-MM-DD (para avulsas)
  recorrencia?: 'unica' | 'mensal' | 'anual';
  parcelaAtual?: number;
  totalParcelas?: number;
  textoOriginal?: string;
  paymentMethod?: 'credit_card' | 'boleto' | 'pix' | 'debit';  // Método de pagamento
  creditCardId?: string;  // ID do cartão (se for parcelamento no cartão)
  creditCardName?: string;  // Nome do cartão (para exibição)
}

// ============================================
// IDENTIFICAÇÃO DE TIPO DE CONTA
// ============================================

export function identificarTipoConta(texto: string, entidades: Record<string, unknown>): BillType {
  const textoLower = texto.toLowerCase();
  
  // PARCELAMENTO - tem parcelas mencionadas OU palavras que indicam parcelamento
  // Palavras como "financiamento", "empréstimo", "crediário", "parcela" SEMPRE são parcelamentos
  const palavrasParcelamento = [
    'financiamento', 'empréstimo', 'emprestimo', 'crediário', 'crediario',
    'consórcio', 'consorcio', 'carnê', 'carne', 'prestação', 'prestacao',
    'parcela', 'parcelamento', 'parcelado', 'parcelada'
  ];
  
  if (
    /(\d+)\s*x\s*de?\s*r?\$?\s*([\d.,]+)/i.test(textoLower) ||  // "10x de 250"
    /em\s*(\d+)\s*x/i.test(textoLower) ||                        // "em 10x"
    /(\d+)\s*x\b/i.test(textoLower) ||                           // "10x" sozinho
    /parcela\s*(\d+)\s*(de|\/)\s*(\d+)/i.test(textoLower) ||     // "parcela 3 de 12"
    /em\s*(\d+)\s*vezes/i.test(textoLower) ||                    // "em 10 vezes"
    /(\d+)\s*parcelas?/i.test(textoLower) ||                     // "10 parcelas"
    entidades.parcela_atual || entidades.total_parcelas ||
    palavrasParcelamento.some(p => textoLower.includes(p))
  ) {
    return 'installment';
  }
  
  // ASSINATURA - serviços conhecidos
  const assinaturas = [
    'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo', 'max',
    'globoplay', 'youtube premium', 'apple music', 'deezer', 'paramount', 'star+',
    'xbox game pass', 'playstation plus', 'nintendo', 'crunchyroll',
    'chatgpt', 'chat gpt', 'openai', 'claude', 'midjourney', 'canva', 'adobe', 'microsoft 365',
    'icloud', 'google one', 'dropbox', 'notion', 'figma', 'copilot', 'gemini'
  ];
  if (assinaturas.some(s => textoLower.includes(s))) {
    return 'subscription';
  }
  
  // CONTA FIXA - serviços com valor fixo mensal
  const fixas = [
    'internet', 'fibra', 'banda larga', 'wifi', 'wi-fi',
    'aluguel', 'condomínio', 'condominio', 'seguro', 'plano de saúde', 'plano de saude',
    'academia', 'escola', 'faculdade', 'mensalidade', 'pensão', 'pensao',
    'tv a cabo', 'tv por assinatura', 'claro', 'vivo', 'tim', 'oi', 'net'
  ];
  if (fixas.some(f => textoLower.includes(f))) {
    return 'fixed';
  }
  
  // CONTA VARIÁVEL - serviços de consumo
  const variaveis = [
    'luz', 'energia', 'eletricidade', 'enel', 'cpfl', 'cemig', 'light', 'celpe', 'energisa',
    'água', 'agua', 'sabesp', 'copasa', 'cedae', 'sanepar',
    'gás', 'gas', 'comgás', 'comgas', 'naturgy',
    'telefone fixo'
  ];
  if (variaveis.some(v => textoLower.includes(v))) {
    return 'variable';
  }
  
  // FATURA DE CARTÃO
  if (
    /fatura/i.test(textoLower) ||
    (/cart[aã]o/i.test(textoLower) && /(nubank|itau|itaú|bradesco|santander|inter|c6|xp|picpay)/i.test(textoLower))
  ) {
    return 'credit_card';
  }
  
  // CONTA AVULSA - pagamento único
  const avulsas = ['ipva', 'iptu', 'matrícula', 'matricula', 'licenciamento', 'multa', 'taxa'];
  if (avulsas.some(a => textoLower.includes(a))) {
    return 'one_time';
  }
  
  // DETECTAR INDICADORES DE VALOR VARIÁVEL NO TEXTO
  // Se menciona "em média", "aproximadamente", etc → VARIÁVEL
  const indicadoresVariavel = [
    'em média', 'em media', 'aproximadamente', 'aproximado',
    'mais ou menos', '+ ou -', 'por volta de', 'cerca de',
    'geralmente', 'normalmente', 'varia', 'variável', 'variavel'
  ];
  if (indicadoresVariavel.some(ind => textoLower.includes(ind))) {
    return 'variable';
  }
  
  // Se menciona "todo mês", "mensal", "recorrente" → FIXA
  if (/todo\s*m[eê]s|mensal|recorrente|sempre|fixo/i.test(textoLower)) {
    return 'fixed';
  }
  
  // DEFAULT: desconhecido - perguntar ao usuário
  return 'unknown';
}

// ============================================
// VERIFICAR SE CONTA É VARIÁVEL (para exibição)
// ============================================

export function isContaVariavel(tipo: BillType, texto?: string): boolean {
  // Tipo explicitamente variável
  if (tipo === 'variable') return true;
  
  // Se tem texto, verificar indicadores
  if (texto) {
    const textoLower = texto.toLowerCase();
    const indicadoresVariavel = [
      'em média', 'em media', 'aproximadamente', 'aproximado',
      'mais ou menos', '+ ou -', 'por volta de', 'cerca de',
      'geralmente', 'normalmente', 'varia', 'variável', 'variavel'
    ];
    if (indicadoresVariavel.some(ind => textoLower.includes(ind))) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// CAMPOS OBRIGATÓRIOS POR TIPO
// ============================================

export function getCamposObrigatorios(tipo: BillType): string[] {
  const campos: Record<BillType, string[]> = {
    'fixed': ['descricao', 'valor', 'diaVencimento'],
    'variable': ['descricao', 'valor', 'diaVencimento'],  // valor médio é obrigatório
    'subscription': ['descricao', 'valor', 'diaVencimento'],
    'installment': ['descricao', 'valor', 'diaVencimento', 'parcelaAtual', 'totalParcelas'],
    'one_time': ['descricao', 'valor', 'diaVencimento'],  // simplificado para dia
    'credit_card': ['descricao', 'diaVencimento'],
    'unknown': ['descricao']
  };
  
  return campos[tipo] || campos['unknown'];
}

// ============================================
// VALIDAÇÃO DE CAMPOS
// ============================================

export function validarCamposConta(dados: DadosCadastroConta, camposObrigatorios: string[]): string[] {
  const faltantes: string[] = [];
  
  for (const campo of camposObrigatorios) {
    switch (campo) {
      case 'descricao':
        if (!dados.descricao || dados.descricao.trim() === '') {
          faltantes.push('descricao');
        }
        break;
        
      case 'valor':
        if (dados.valor === undefined || dados.valor === null || dados.valor <= 0) {
          faltantes.push('valor');
        }
        break;
        
      case 'diaVencimento':
        if (!dados.diaVencimento || dados.diaVencimento < 1 || dados.diaVencimento > 31) {
          faltantes.push('diaVencimento');
        }
        break;
        
      case 'dataVencimento':
        if (!dados.dataVencimento) {
          faltantes.push('dataVencimento');
        }
        break;
        
      case 'parcelaAtual':
        if (!dados.parcelaAtual || dados.parcelaAtual < 1) {
          faltantes.push('parcelaAtual');
        }
        break;
        
      case 'totalParcelas':
        if (!dados.totalParcelas || dados.totalParcelas < 1) {
          faltantes.push('totalParcelas');
        }
        break;
    }
  }
  
  return faltantes;
}

// ============================================
// FUNÇÕES DE EXTRAÇÃO
// ============================================

export function extrairValorTexto(texto: string): number | null {
  const limpo = texto.replace(/\s/g, '').toLowerCase();
  // Captura sinal negativo opcional antes do valor
  const match = limpo.match(/(-?)r?\$?([\d]+[.,]?[\d]*)/);
  
  if (match) {
    const isNegativo = match[1] === '-';
    const valor = parseFloat(match[2].replace(',', '.'));
    
    // Se for negativo, retorna o valor negativo para que o chamador possa tratar
    if (isNegativo) {
      return -valor;
    }
    
    return valor > 0 ? valor : null;
  }
  return null;
}

// Função textoContemValorNegativo movida para validacoes.ts

export function extrairDiaTexto(texto: string): number | null {
  const limpo = texto.toLowerCase();
  const match = limpo.match(/(\d{1,2})/);
  
  if (match) {
    const dia = parseInt(match[1]);
    return (dia >= 1 && dia <= 31) ? dia : null;
  }
  return null;
}

export function extrairParcelasTexto(texto: string): { atual: number; total: number } | null {
  const limpo = texto.toLowerCase();
  
  // Mapa de ordinais para números
  const ORDINAIS: Record<string, number> = {
    'primeira': 1, 'primeiro': 1, '1ª': 1, '1º': 1,
    'segunda': 2, 'segundo': 2, '2ª': 2, '2º': 2,
    'terceira': 3, 'terceiro': 3, '3ª': 3, '3º': 3,
    'quarta': 4, 'quarto': 4, '4ª': 4, '4º': 4,
    'quinta': 5, 'quinto': 5, '5ª': 5, '5º': 5,
    'sexta': 6, 'sexto': 6, '6ª': 6, '6º': 6,
    'sétima': 7, 'setima': 7, 'sétimo': 7, 'setimo': 7, '7ª': 7, '7º': 7,
    'oitava': 8, 'oitavo': 8, '8ª': 8, '8º': 8,
    'nona': 9, 'nono': 9, '9ª': 9, '9º': 9,
    'décima': 10, 'decima': 10, 'décimo': 10, 'decimo': 10, '10ª': 10, '10º': 10,
    'décima primeira': 11, 'decima primeira': 11, '11ª': 11, '11º': 11,
    'décima segunda': 12, 'decima segunda': 12, '12ª': 12, '12º': 12,
  };
  
  // Função auxiliar para converter ordinal para número
  const ordinalParaNumero = (texto: string): number | null => {
    const textoNorm = texto.toLowerCase().trim();
    return ORDINAIS[textoNorm] || null;
  };
  
  // Padrão 0 (NOVO): "10 parcelas, estou na segunda" - com ordinal por extenso
  let match = limpo.match(/(\d+)\s*parcelas?,?\s*(?:estou\s*)?na\s+(\w+)/);
  if (match) {
    const total = parseInt(match[1]);
    const ordinalTexto = match[2];
    // Tentar como número primeiro
    let atual = parseInt(ordinalTexto);
    // Se não for número, tentar como ordinal
    if (isNaN(atual)) {
      atual = ordinalParaNumero(ordinalTexto) || 0;
    }
    if (atual >= 1 && total >= 1 && atual <= total) {
      console.log(`[PARCELAS] Padrão ordinal: ${atual}/${total} (de "${ordinalTexto}")`);
      return { atual, total };
    }
  }
  
  // Padrão 1: "48 parcelas, estou na 12" ou "48 parcelas parcela 12"
  match = limpo.match(/(\d+)\s*parcelas?,?\s*(?:estou\s*na|parcela)?\s*(\d+)/);
  if (match) {
    const total = parseInt(match[1]);
    const atual = parseInt(match[2]);
    if (atual >= 1 && total >= 1 && atual <= total) {
      return { atual, total };
    }
  }
  
  // Padrão 2: "parcela 12 de 48" ou "parcela 12/48"
  match = limpo.match(/parcela\s*(\d+)\s*(?:de|\/)\s*(\d+)/);
  if (match) {
    const atual = parseInt(match[1]);
    const total = parseInt(match[2]);
    if (atual >= 1 && total >= 1 && atual <= total) {
      return { atual, total };
    }
  }
  
  // Padrão 3: "36x, parcela 5" ou "36x parcela 5"
  match = limpo.match(/(\d+)\s*x,?\s*parcela\s*(\d+)/);
  if (match) {
    const total = parseInt(match[1]);
    const atual = parseInt(match[2]);
    if (atual >= 1 && total >= 1 && atual <= total) {
      return { atual, total };
    }
  }
  
  // Padrão 4: "3 de 10", "3/10", "3ª de 10"
  match = limpo.match(/(\d+)\s*(?:ª|°|de|\/)\s*(\d+)/);
  if (match) {
    const atual = parseInt(match[1]);
    const total = parseInt(match[2]);
    if (atual >= 1 && total >= 1 && atual <= total) {
      return { atual, total };
    }
  }
  
  // Padrão 5: "10x de 150" - assume parcela 1
  match = limpo.match(/(\d+)\s*x/);
  if (match) {
    return { atual: 1, total: parseInt(match[1]) };
  }
  
  // Padrão 6: Apenas "48" (total de parcelas, assume parcela 1)
  match = limpo.match(/^(\d+)$/);
  if (match) {
    const total = parseInt(match[1]);
    if (total >= 2 && total <= 120) {
      return { atual: 1, total };
    }
  }
  
  return null;
}

export function extrairRecorrenciaTexto(texto: string): 'mensal' | 'unica' | null {
  const limpo = texto.toLowerCase();
  
  if (/sim|mensal|todo\s*m[eê]s|repete|recorrente|1/.test(limpo)) {
    return 'mensal';
  }
  
  if (/n[aã]o|única|unica|só\s*essa|avulsa|2/.test(limpo)) {
    return 'unica';
  }
  
  return null;
}

export function extrairTipoDeResposta(texto: string): BillType | null {
  const limpo = texto.toLowerCase().trim();
  
  // Mapeamento direto (números e nomes de tipos)
  const mapeamento: Record<string, BillType> = {
    // Fixa
    '1': 'fixed', 'fixa': 'fixed', 'fixo': 'fixed', 'fixas': 'fixed',
    // Variável
    '2': 'variable', 'variável': 'variable', 'variavel': 'variable', 'variaveis': 'variable', 'variáveis': 'variable',
    // Assinatura
    '3': 'subscription', 'assinatura': 'subscription', 'assinaturas': 'subscription', 'streaming': 'subscription', 'serviço': 'subscription', 'servico': 'subscription',
    // Parcelamento
    '4': 'installment', 'parcelamento': 'installment', 'parcela': 'installment', 'parcelada': 'installment', 'parcelado': 'installment', 'parcelas': 'installment',
    // Avulsa
    '5': 'one_time', 'avulsa': 'one_time', 'única': 'one_time', 'unica': 'one_time', 'avulso': 'one_time', 'avulsas': 'one_time'
  };
  
  if (mapeamento[limpo]) {
    return mapeamento[limpo];
  }
  
  // Se não é número/tipo direto, tentar identificar pelo nome da conta
  const tipo = identificarTipoConta(limpo, {});
  if (tipo && tipo !== 'unknown') {
    console.log(`[TIPO-RESPOSTA] Nome de conta "${texto}" identificado como tipo: ${tipo}`);
    return tipo;
  }
  
  return null;
}

// Função para extrair tipo E atualizar descrição quando usuário responde com nome de conta
export function extrairTipoEDescricaoDeResposta(texto: string): { tipo: BillType | null, descricao?: string } {
  const limpo = texto.toLowerCase().trim();
  
  // Mapeamento direto (números e nomes de tipos) - NÃO muda descrição
  const mapeamento: Record<string, BillType> = {
    '1': 'fixed', 'fixa': 'fixed', 'fixo': 'fixed', 'fixas': 'fixed',
    '2': 'variable', 'variável': 'variable', 'variavel': 'variable', 'variaveis': 'variable', 'variáveis': 'variable',
    '3': 'subscription', 'assinatura': 'subscription', 'assinaturas': 'subscription', 'streaming': 'subscription',
    '4': 'installment', 'parcelamento': 'installment', 'parcela': 'installment', 'parcelada': 'installment',
    '5': 'one_time', 'avulsa': 'one_time', 'única': 'one_time', 'unica': 'one_time', 'avulso': 'one_time'
  };
  
  if (mapeamento[limpo]) {
    return { tipo: mapeamento[limpo] };
  }
  
  // Se não é número/tipo direto, tentar identificar pelo nome da conta
  const tipo = identificarTipoConta(limpo, {});
  if (tipo && tipo !== 'unknown') {
    // Capitalizar descrição
    const descricao = texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    console.log(`[TIPO-RESPOSTA] Nome de conta "${texto}" → tipo: ${tipo}, descricao: ${descricao}`);
    return { tipo, descricao };
  }
  
  return { tipo: null };
}

// Mapear campo para estado do contexto
export function getStateForField(campo: string): string {
  const mapa: Record<string, string> = {
    'descricao': 'awaiting_bill_description',
    'valor': 'awaiting_bill_amount',
    'diaVencimento': 'awaiting_due_day',
    'dataVencimento': 'awaiting_due_date',
    'parcelaAtual': 'awaiting_installment_info',
    'totalParcelas': 'awaiting_installment_info',
    'tipo': 'awaiting_bill_type'
  };
  
  return mapa[campo] || 'awaiting_bill_description';
}

// ============================================
// TEMPLATES DE PERGUNTAS
// ============================================

export function getPerguntaParaCampo(campo: string, dados: DadosCadastroConta): string {
  const descricao = dados.descricao || 'essa conta';
  const emoji = dados.descricao ? getEmojiConta(dados.descricao) : '📋';
  
  switch (campo) {
    case 'descricao':
      return `📝 Qual conta você quer cadastrar?

_Exemplo: luz, água, Netflix, aluguel..._`;

    case 'valor':
      // Verificar se é conta variável (luz, água, gás) para perguntar valor médio
      const contasVariaveis = ['luz', 'água', 'agua', 'gás', 'gas', 'energia', 'elétrica', 'eletrica', 'esgoto', 'saneamento'];
      const descLower = descricao.toLowerCase();
      const isVariavel = contasVariaveis.some(c => descLower.includes(c));
      
      if (isVariavel) {
        return `📝 Vou cadastrar *${descricao}*.

${emoji} 💰 Qual o *valor médio* da conta de *${descricao}*?

_O valor pode variar, mas informe uma média, ex: "150" ou "R$ 180,00"_`;
      }
      
      // Se é parcelamento, perguntar valor da PARCELA especificamente
      const ehParcelamento = dados.totalParcelas && dados.totalParcelas > 1;
      if (ehParcelamento) {
        return `📝 Vou cadastrar *${descricao}* em *${dados.totalParcelas}x*.

${emoji} 💰 Qual o valor de *cada parcela*?

_Ex: "250" significa R$ 250 por parcela (total: R$ ${(250 * (dados.totalParcelas || 1)).toLocaleString('pt-BR')})_

💡 _Ou digite "total 2500" se quiser informar o valor total_`;
      }
      
      return `📝 Vou cadastrar *${descricao}*.

${emoji} 💰 Qual é o valor?

_Digite só o número, ex: "150" ou "150,00"_`;

    case 'diaVencimento':
      const valorStr = dados.valor ? ` de R$ ${dados.valor.toFixed(2).replace('.', ',')}` : '';
      return `📝 Vou cadastrar *${descricao}*${valorStr}.

${emoji} 📅 Qual o *dia do vencimento*? (1-31)

_Ex: "10", "dia 15", "todo dia 20"_`;

    case 'dataVencimento':
      return `📝 Vou cadastrar *${descricao}*${dados.valor ? ` de R$ ${dados.valor.toFixed(2).replace('.', ',')}` : ''}.

${emoji} 📅 Qual a *data do vencimento*?

_Ex: "15/01", "15 de janeiro"_`;

    case 'parcelaAtual':
    case 'totalParcelas':
      return `📝 Vou cadastrar o parcelamento de *${descricao}*.

🔢 Qual parcela é essa e de quantas?

_Ex: "3 de 10", "parcela 5 de 12", "5/12"_`;

    default:
      return `❓ Preciso de mais informações sobre *${descricao}*. Pode me contar mais?`;
  }
}

export function templatePerguntarTipoConta(descricao?: string): string {
  const intro = descricao 
    ? `📝 Vou cadastrar *${descricao}*.` 
    : `📝 Vou cadastrar sua conta.`;
    
  return `${intro}

🤔 Que tipo de conta é essa?

1️⃣ *Fixa* - mesmo valor todo mês (aluguel, plano)
2️⃣ *Variável* - valor muda (luz, água, gás)
3️⃣ *Assinatura* - serviço digital (Netflix, Spotify)
4️⃣ *Parcelamento* - compra parcelada
5️⃣ *Avulsa* - só essa vez (IPVA, matrícula)

_Digite o número ou o nome_`;
}

// ============================================
// MAPEAMENTO PARA BILL_TYPE DO BANCO
// ============================================

// Valores aceitos pela constraint payable_bills_bill_type_check:
// 'service', 'telecom', 'subscription', 'housing', 'education', 
// 'healthcare', 'insurance', 'loan', 'installment', 'credit_card', 'tax', 'food', 'other'

export function mapearBillTypeParaBanco(tipoInterno: BillType, descricao: string): string {
  const descLower = descricao.toLowerCase();
  
  // ASSINATURAS (streaming, apps) - verificar primeiro pela descrição
  if (/netflix|spotify|amazon|disney|hbo|globoplay|youtube|apple|deezer|paramount|star|crunchyroll|chatgpt|canva|adobe|prime|max|notion|figma|microsoft\s*365|icloud|google\s*one|dropbox/.test(descLower)) {
    return 'subscription';
  }
  
  // MORADIA
  if (/aluguel|condom[íi]nio|moradia/.test(descLower)) {
    return 'housing';
  }
  
  // TELECOM
  if (/internet|telefone|celular|fibra|wifi|vivo|claro|tim|oi\b|net\b/.test(descLower)) {
    return 'telecom';
  }
  
  // EDUCAÇÃO
  if (/escola|faculdade|curso|matr[íi]cula|mensalidade|educa/.test(descLower)) {
    return 'education';
  }
  
  // SAÚDE
  if (/plano.*sa[úu]de|hospital|m[ée]dico|consulta|farm[áa]cia|unimed|amil|sulam[ée]rica|sa[úu]de/.test(descLower)) {
    return 'healthcare';
  }
  
  // SEGUROS
  if (/seguro/.test(descLower)) {
    return 'insurance';
  }
  
  // IMPOSTOS
  if (/ipva|iptu|imposto|taxa|licenciamento|multa/.test(descLower)) {
    return 'tax';
  }
  
  // EMPRÉSTIMOS (dinheiro emprestado)
  if (/empr[ée]stimo|consignado/.test(descLower)) {
    return 'loan';
  }
  
  // PARCELAMENTOS/FINANCIAMENTOS (compras parceladas)
  if (/financiamento|parcela|geladeira|tv|televis[ãa]o|celular|notebook|computador|m[óo]vel|eletrodom[ée]stico|carro|moto|ve[íi]culo|im[óo]vel|casa|apartamento/.test(descLower)) {
    return 'installment';
  }
  
  // ALIMENTAÇÃO
  if (/alimenta[çc][ãa]o|mercado|supermercado|restaurante|ifood|rappi|uber\s*eats|comida|refei[çc][ãa]o|lanche|almo[çc]o|janta|caf[ée]|padaria/.test(descLower)) {
    return 'food';
  }
  
  // SERVIÇOS (luz, água, gás)
  if (/luz|energia|[áa]gua|g[áa]s|enel|cpfl|cemig|sabesp|comg[áa]s|light|celpe|energisa|copasa|cedae|sanepar|naturgy/.test(descLower)) {
    return 'service';
  }
  
  // Mapear pelo tipo interno se não identificou pela descrição
  const mapeamentoPorTipo: Record<BillType, string> = {
    'subscription': 'subscription',
    'credit_card': 'credit_card',
    'installment': 'installment',  // Compras parceladas (geladeira, TV, etc)
    'fixed': 'service',
    'variable': 'service',
    'one_time': 'other',
    'unknown': 'other'
  };
  
  return mapeamentoPorTipo[tipoInterno] || 'other';
}

/**
 * Busca o category_id do banco de dados baseado na descrição da conta
 * Isso garante consistência com o sistema de categorias padronizado
 */
export async function buscarCategoryIdPorDescricao(
  supabase: any,
  userId: string,
  descricao: string
): Promise<string | null> {
  const resolved = await resolveCanonicalCategory(supabase, {
    userId,
    transactionType: 'expense',
    textSources: [descricao],
    context: 'payable_bill',
  });
  console.log(
    `[CATEGORY] Descrição "${descricao}" → "${resolved.categoryName}" (${resolved.categoryId ?? 'null'}) path=${resolved.resolutionPath}`,
  );
  return resolved.categoryId;
}

export interface ContaPagar {
  id: string;
  description: string;
  provider_name?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  is_recurring: boolean;
  bill_type?: string;
  category?: { name: string };
  category_id?: string;
  account?: { name: string };
  // Para exibição numerada
  index?: number;
  // Tipo para diferenciação
  tipo?: 'conta' | 'fatura';
  // FASE 3.3: Campos adicionais para pagamentos
  paid_at?: string;
  paid_amount?: number;
  payment_method?: string;
  credit_card_id?: string;
  recurrence_config?: Record<string, unknown>;
  parent_recurring_id?: string;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
}

export interface FaturaCartao {
  id: string;
  card_name: string;
  total_amount: number;
  due_date: string;
  status: string;
}

// ============================================
// HELPERS
// ============================================

function formatarMoeda(valor: number): string {
  const absValor = Math.abs(valor);
  const formatted = absValor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return valor < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

function obterNomeMes(data: Date): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[data.getMonth()];
}

function formatarData(data: string): string {
  const d = new Date(data + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDataComDia(data: string): string {
  const d = new Date(data + 'T12:00:00');
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const dia = dias[d.getDay()];
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${dia})`;
}

// DEPRECATED: Usar calcularDiasParaVencimentoBRT() que considera timezone de São Paulo
function calcularDiasParaVencimento(dueDate: string): number {
  // Redireciona para a versão com timezone correto
  return calcularDiasParaVencimentoBRT(dueDate);
}

export function getEmojiConta(nome: string): string {
  const n = nome.toLowerCase();
  
  // Aliases de contas comuns
  const aliases: Record<string, string> = {
    // Energia
    'luz': '💡', 'energia': '💡', 'enel': '💡', 'light': '💡', 'eletricidade': '💡',
    'cemig': '💡', 'cpfl': '💡', 'eletropaulo': '💡', 'coelba': '💡', 'celpe': '💡',
    // Água
    'agua': '💧', 'água': '💧', 'saneamento': '💧', 'cedae': '💧', 'sabesp': '💧',
    'esgoto': '💧', 'copasa': '💧', 'sanepar': '💧',
    // Gás
    'gas': '🔥', 'gás': '🔥', 'naturgy': '🔥', 'comgas': '🔥', 'ultragaz': '🔥',
    // Internet/Telefone
    'internet': '🌐', 'wifi': '🌐', 'banda larga': '🌐', 'fibra': '🌐',
    'celular': '📱', 'telefone': '📱', 'tim': '📱', 'vivo': '📱', 
    'claro': '📱', 'oi': '📱', 'telecom': '🌐',
    // Moradia
    'aluguel': '🏠', 'moradia': '🏠', 'iptu': '🏠', 'housing': '🏠',
    'condominio': '🏢', 'condomínio': '🏢', 'cond': '🏢',
    // Streaming
    'netflix': '📺', 'disney': '📺', 'hbo': '📺', 'amazon prime': '📺',
    'globoplay': '📺', 'streaming': '📺', 'subscription': '📺',
    'spotify': '🎵', 'deezer': '🎵', 'apple music': '🎵',
    // Outros
    'academia': '🏋️', 'gym': '🏋️', 'smart fit': '🏋️',
    'seguro': '🛡️',
    'ipva': '🚗', 'licenciamento': '🚗', 'carro': '🚗', 'detran': '🚗',
    'escola': '📚', 'faculdade': '📚', 'curso': '📚', 'mensalidade': '📚',
    'financiamento': '🏦', 'emprestimo': '🏦', 'empréstimo': '🏦', 'parcela': '🏦',
    'plano de saude': '🏥', 'plano de saúde': '🏥', 'unimed': '🏥', 'amil': '🏥',
    'service': '📋',
  };
  
  for (const [key, emoji] of Object.entries(aliases)) {
    if (n.includes(key)) return emoji;
  }
  
  return '📋';
}

// ============================================
// BUSCAR CONTAS PENDENTES
// ============================================

export async function buscarContasPendentes(userId: string): Promise<ContaPagar[]> {
  const supabase = getSupabase();
  
  const { data: contas, error } = await supabase
    .from('payable_bills')
    .select(`
      id,
      description,
      provider_name,
      amount,
      due_date,
      status,
      is_recurring,
      bill_type,
      category:categories(name),
      account:accounts(name)
    `)
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('[CONTAS-PAGAR] Erro ao buscar contas:', error);
    return [];
  }
  
  return (contas || []).map((c: any, idx: number) => ({
    ...c,
    index: idx + 1,
    tipo: 'conta' as const,
    category: c.category as any,
    account: c.account as any
  }));
}

// ============================================
// BUSCAR FATURAS DE CARTÃO PENDENTES
// ============================================

export async function buscarFaturasPendentes(userId: string): Promise<FaturaCartao[]> {
  const supabase = getSupabase();
  
  const { data: faturas, error } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .in('status', ['open', 'closed'])
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('[CONTAS-PAGAR] Erro ao buscar faturas:', error);
    return [];
  }
  
  return (faturas || []).map((f: any) => ({
    id: f.id,
    card_name: f.card?.name || 'Cartão',
    total_amount: f.total_amount,
    due_date: f.due_date,
    status: f.status
  }));
}

// ============================================
// LISTAR CONTAS A PAGAR (COM FATURAS)
// ============================================

export async function listarContasPagar(userId: string): Promise<{ mensagem: string; contas: ContaPagar[] }> {
  const contas = await buscarContasPendentes(userId);
  const faturas = await buscarFaturasPendentes(userId);
  
  console.log('[CONTAS-PAGAR] Contas encontradas:', contas.length);
  console.log('[CONTAS-PAGAR] Faturas encontradas:', faturas.length);
  
  // Combinar contas + faturas
  const todos: ContaPagar[] = [];
  
  contas.forEach(c => todos.push({ ...c, tipo: 'conta' }));
  faturas.forEach(f => todos.push({ 
    id: f.id,
    description: `Fatura ${f.card_name}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status === 'open' || f.status === 'closed' ? 'pending' : 'paid',
    is_recurring: false,
    tipo: 'fatura'
  }));
  
  // Ordenar por data
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (todos.length === 0) {
    return { 
      mensagem: `✅ *Tudo em dia!*\n\nVocê não tem contas pendentes no momento. 🎉\n\n💡 _Para cadastrar uma conta:_\n_"Tenho que pagar 150 de luz dia 10"_`,
      contas: []
    };
  }
  
  // IMPORTANTE: Usar timezone de São Paulo
  const hoje = getHojeSaoPaulo();
  
  // Separar por status
  const vencidas = todos.filter(t => calcularDiasParaVencimento(t.due_date) < 0);
  const proximos7 = todos.filter(t => {
    const dias = calcularDiasParaVencimento(t.due_date);
    return dias >= 0 && dias <= 7;
  });
  const restante = todos.filter(t => calcularDiasParaVencimento(t.due_date) > 7);
  
  let mensagem = `📋 *Suas Contas a Pagar*\n📅 ${obterNomeMes(hoje)}/${hoje.getFullYear()}\n`;
  
  let indexGlobal = 1;
  
  // VENCIDAS
  if (vencidas.length > 0) {
    mensagem += `\n🔴 *VENCIDAS* (${vencidas.length})\n`;
    for (const t of vencidas) {
      const dias = Math.abs(calcularDiasParaVencimento(t.due_date));
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      // Formato: emoji Nome - DD/MM (dia): R$ valor — há Xd
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _há ${dias}d_\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
  }
  
  // PRÓXIMOS 7 DIAS
  if (proximos7.length > 0) {
    mensagem += `\n🟡 *PRÓXIMOS 7 DIAS* (${proximos7.length})\n`;
    for (const t of proximos7) {
      const dias = calcularDiasParaVencimento(t.due_date);
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      let prazo = '';
      if (dias === 0) prazo = 'HOJE';
      else if (dias === 1) prazo = 'amanhã';
      else prazo = `em ${dias}d`;
      
      // Formato: emoji Nome - DD/MM (dia): R$ valor — prazo
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _${prazo}_\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
  }
  
  // RESTANTE DO MÊS
  if (restante.length > 0) {
    mensagem += `\n🟢 *RESTANTE DO MÊS* (${restante.length})\n`;
    for (const t of restante.slice(0, 5)) {
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      // Formato: emoji Nome - DD/MM (dia): R$ valor
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)}\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
    if (restante.length > 5) {
      mensagem += `_... +${restante.length - 5} contas_\n`;
    }
  }
  
  // TOTAL
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total pendente:* ${formatarMoeda(total)}`;
  
  return { mensagem, contas };
}

// ============================================
// CONTAS VENCENDO (PRÓXIMOS X DIAS)
// ============================================

export async function contasVencendo(
  userId: string,
  window: ContasVencendoWindow = { startOffsetDays: 0, endOffsetDays: 7, label: 'proximos_dias' },
): Promise<string> {
  const supabase = getSupabase();
  // IMPORTANTE: Usar timezone de São Paulo para evitar problemas com UTC
  const hoje = getHojeSaoPaulo();
  hoje.setHours(0, 0, 0, 0);
  const dataInicioStr = formatDateOffset(hoje, window.startOffsetDays);
  const dataLimiteStr = formatDateOffset(hoje, window.endOffsetDays);
  
  // Buscar contas A VENCER (de hoje em diante, não vencidas!)
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .eq('status', 'pending')  // Só pendentes, não overdue!
    .gte('due_date', dataInicioStr)  // A partir do início da janela
    .lte('due_date', dataLimiteStr)  // Até o limite
    .order('due_date', { ascending: true });
  
  // Buscar faturas A VENCER
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .in('status', ['open', 'closed'])
    .gte('due_date', dataInicioStr)  // A partir do início da janela
    .lte('due_date', dataLimiteStr)  // Até o limite
    .order('due_date', { ascending: true });
  
  // Combinar e ordenar
  const todos: any[] = [];
  
  (contas || []).forEach((c: any) => todos.push({
    ...c,
    tipo: 'conta',
    emoji: getEmojiConta(c.description)
  }));
  
  (faturas || []).forEach((f: any) => todos.push({
    id: f.id,
    description: `Fatura ${f.card?.name || 'Cartão'}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status,
    tipo: 'fatura',
    emoji: '💳'
  }));
  
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const emptyMessages: Record<ContasVencendoWindow['label'], string> = {
    hoje: '✅ *Tudo tranquilo!*\n\nNenhuma conta vence hoje. 🎉',
    amanha: '✅ *Tudo tranquilo!*\n\nNenhuma conta vence amanhã. 🎉',
    proximos_dias: `✅ *Tudo tranquilo!*\n\nNenhuma conta vencendo nos próximos ${window.endOffsetDays} dias! 🎉`,
  };
  
  if (todos.length === 0) {
    return emptyMessages[window.label];
  }
  
  const headingByLabel: Record<ContasVencendoWindow['label'], string> = {
    hoje: '📅 *Contas a Vencer*\n_Somente hoje_\n',
    amanha: '📅 *Contas a Vencer*\n_Somente amanhã_\n',
    proximos_dias: `📅 *Contas a Vencer*\n_Próximos ${window.endOffsetDays} dias_\n`,
  };

  let mensagem = headingByLabel[window.label];
  
  // Agrupar por prazo (só futuro, não tem vencidos aqui!)
  const hojeList = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 0);
  const amanha = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 1);
  const restante = todos.filter(t => calcularDiasParaVencimento(t.due_date) > 1);
  
  let idx = 1;
  
  if (hojeList.length > 0) {
    mensagem += `\n🔴 *HOJE* (${hojeList.length})\n`;
    for (const t of hojeList) {
      mensagem += `${idx}. ${t.emoji} ${t.description}: ${formatarMoeda(t.amount)} 🔔\n`;
      idx++;
    }
  }
  
  if (amanha.length > 0) {
    mensagem += `\n🟡 *AMANHÃ* (${amanha.length})\n`;
    for (const t of amanha) {
      mensagem += `${idx}. ${t.emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)}\n`;
      idx++;
    }
  }
  
  if (restante.length > 0) {
    mensagem += `\n🟢 *ESTA SEMANA* (${restante.length})\n`;
    for (const t of restante) {
      const diasRestantes = calcularDiasParaVencimento(t.due_date);
      mensagem += `${idx}. ${t.emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _em ${diasRestantes}d_\n`;
      idx++;
    }
  }
  
  // Total
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total a vencer:* ${formatarMoeda(total)}`;
  
  return mensagem;
}

// ============================================
// CONTAS VENCIDAS
// ============================================

export async function contasVencidas(userId: string): Promise<string> {
  const supabase = getSupabase();
  const hoje = getHojeSaoPaulo();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  // Buscar contas a pagar vencidas
  const { data: contasVencidas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, bill_type')
    .eq('user_id', userId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true });
  
  // ✅ CORREÇÃO: Buscar também faturas de cartão vencidas
  const { data: faturasVencidas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      due_date,
      total_amount,
      paid_amount,
      remaining_amount,
      status,
      credit_cards!inner(name)
    `)
    .eq('user_id', userId)
    .lt('due_date', hojeStr)
    .not('status', 'eq', 'paid')
    .order('due_date', { ascending: true });
  
  // Combinar contas e faturas
  const vencidas: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string;
    bill_type: string;
    is_fatura: boolean;
  }> = [];
  
  // Adicionar contas a pagar
  if (contasVencidas) {
    for (const c of contasVencidas) {
      vencidas.push({
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        due_date: c.due_date,
        bill_type: c.bill_type || 'other',
        is_fatura: false
      });
    }
  }
  
  // Adicionar faturas de cartão
  if (faturasVencidas) {
    for (const f of faturasVencidas as any[]) {
      const valorRestante = f.remaining_amount ?? (f.total_amount - (f.paid_amount || 0));
      vencidas.push({
        id: f.id,
        description: `Fatura ${f.credit_cards.name}`,
        amount: Number(valorRestante),
        due_date: f.due_date,
        bill_type: 'credit_card',
        is_fatura: true
      });
    }
  }
  
  // Ordenar por data de vencimento
  vencidas.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (vencidas.length === 0) {
    return `✅ *Parabéns!*\n\nVocê não tem contas vencidas! 🎉\n\n_Continue assim, suas finanças agradecem!_`;
  }
  
  let mensagem = `🔴 *Contas Vencidas*\n_${vencidas.length} conta(s) em atraso_\n`;
  let total = 0;
  let idx = 1;
  
  // Agrupar por tempo de atraso
  const muitoAtrasadas = vencidas.filter((c: any) => Math.abs(calcularDiasParaVencimento(c.due_date)) > 15);
  const atrasadas = vencidas.filter((c: any) => {
    const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
    return dias > 7 && dias <= 15;
  });
  const recentes = vencidas.filter((c: any) => Math.abs(calcularDiasParaVencimento(c.due_date)) <= 7);
  
  if (muitoAtrasadas.length > 0) {
    mensagem += `\n⚠️ *MAIS DE 15 DIAS* (${muitoAtrasadas.length})\n`;
    for (const c of muitoAtrasadas) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  if (atrasadas.length > 0) {
    mensagem += `\n🟠 *8 A 15 DIAS* (${atrasadas.length})\n`;
    for (const c of atrasadas) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  if (recentes.length > 0) {
    mensagem += `\n🟡 *ATÉ 7 DIAS* (${recentes.length})\n`;
    for (const c of recentes) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total em atraso:* ${formatarMoeda(total)}\n\n`;
  mensagem += `⚠️ _Regularize o quanto antes para evitar juros!_\n\n`;
  mensagem += `💡 _"paguei a 1" ou "paguei a luz"_`;
  
  return mensagem;
}

// ============================================
// CONTAS DO MÊS
// ============================================

export async function contasDoMes(userId: string, mes?: number, ano?: number): Promise<string> {
  const supabase = getSupabase();
  // IMPORTANTE: Usar timezone de São Paulo
  const hoje = getHojeSaoPaulo();
  const mesAlvo = mes ?? hoje.getMonth();
  const anoAlvo = ano ?? hoje.getFullYear();
  
  const inicioMes = new Date(anoAlvo, mesAlvo, 1);
  const fimMes = new Date(anoAlvo, mesAlvo + 1, 0);
  
  const inicioMesStr = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-01`;
  const fimMesStr = `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(fimMes.getDate()).padStart(2, '0')}`;
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .gte('due_date', inicioMesStr)
    .lte('due_date', fimMesStr)
    .order('due_date', { ascending: true });
  
  // Buscar faturas do mês
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0])
    .order('due_date', { ascending: true });
  
  // Combinar
  const todos: any[] = [];
  
  (contas || []).forEach((c: any) => todos.push({
    ...c,
    tipo: 'conta',
    emoji: getEmojiConta(c.description)
  }));
  
  (faturas || []).forEach((f: any) => todos.push({
    id: f.id,
    description: `Fatura ${f.card?.name || 'Cartão'}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status,
    tipo: 'fatura',
    emoji: '💳'
  }));
  
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (todos.length === 0) {
    return `✅ Nenhuma conta em ${obterNomeMes(inicioMes)}!`;
  }
  
  let mensagem = `📋 *Contas de ${obterNomeMes(inicioMes)}*\n\n`;
  let totalPendente = 0;
  let totalPago = 0;
  
  for (const t of todos) {
    const dias = calcularDiasParaVencimento(t.due_date);
    let status = '';
    
    if (t.status === 'paid') {
      status = '✅';
      totalPago += Number(t.amount);
    } else if (dias < 0) {
      status = '🔴';
      totalPendente += Number(t.amount);
    } else if (dias === 0) {
      status = '🟠 HOJE';
      totalPendente += Number(t.amount);
    } else if (dias <= 3) {
      status = '🟡';
      totalPendente += Number(t.amount);
    } else {
      status = '🟢';
      totalPendente += Number(t.amount);
    }
    
    mensagem += `${status} ${t.emoji} ${t.description} (${formatarData(t.due_date)}): ${formatarMoeda(t.amount)}\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  if (totalPago > 0) {
    mensagem += `✅ Pago: ${formatarMoeda(totalPago)}\n`;
  }
  mensagem += `⏳ Pendente: ${formatarMoeda(totalPendente)}\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(totalPago + totalPendente)}`;
  
  return mensagem;
}

// ============================================
// RESUMO DE CONTAS DO MÊS
// ============================================

export async function resumoContasMes(userId: string): Promise<string> {
  const supabase = getSupabase();
  // IMPORTANTE: Usar timezone de São Paulo
  const hoje = getHojeSaoPaulo();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  
  const inicioMesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const fimMesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(fimMes.getDate()).padStart(2, '0')}`;
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMesStr)
    .lte('due_date', fimMesStr);
  
  // Buscar faturas do mês
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select('total_amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMesStr)
    .lte('due_date', fimMesStr);
  
  // Calcular totais
  const contasPagas = (contas || []).filter((c: any) => c.status === 'paid');
  const contasPendentes = (contas || []).filter((c: any) => c.status === 'pending');
  const contasVencidasList = (contas || []).filter((c: any) => c.status === 'overdue');
  
  const faturasPagas = (faturas || []).filter((f: any) => f.status === 'paid');
  const faturasPendentes = (faturas || []).filter((f: any) => ['open', 'closed'].includes(f.status));
  
  const totalPago = 
    contasPagas.reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    faturasPagas.reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  const totalPendente = 
    contasPendentes.reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    faturasPendentes.reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  const totalVencido = contasVencidasList.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  
  const totalPrevisto = totalPago + totalPendente + totalVencido;
  
  // Buscar mês anterior para comparativo
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  const { data: contasMesAnterior } = await supabase
    .from('payable_bills')
    .select('amount')
    .eq('user_id', userId)
    .gte('due_date', inicioMesAnterior.toISOString().split('T')[0])
    .lte('due_date', fimMesAnterior.toISOString().split('T')[0]);
  
  const { data: faturasMesAnterior } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('user_id', userId)
    .gte('due_date', inicioMesAnterior.toISOString().split('T')[0])
    .lte('due_date', fimMesAnterior.toISOString().split('T')[0]);
  
  const totalMesAnterior = 
    (contasMesAnterior || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    (faturasMesAnterior || []).reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  // Montar mensagem
  let mensagem = `📊 *Resumo de ${obterNomeMes(hoje)}*\n\n`;
  
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 Total previsto: ${formatarMoeda(totalPrevisto)}\n`;
  mensagem += `✅ Já pago: ${formatarMoeda(totalPago)}\n`;
  mensagem += `⏳ Pendente: ${formatarMoeda(totalPendente)}\n`;
  
  if (totalVencido > 0) {
    mensagem += `🔴 Vencido: ${formatarMoeda(totalVencido)}\n`;
  }
  
  mensagem += `\n📋 Contas: ${(contas || []).length}\n`;
  mensagem += `💳 Faturas: ${(faturas || []).length}\n`;
  
  // Comparativo
  if (totalMesAnterior > 0) {
    const diferenca = totalPrevisto - totalMesAnterior;
    const percentual = (diferenca / totalMesAnterior) * 100;
    
    mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
    if (diferenca > 0) {
      mensagem += `📈 vs ${obterNomeMes(inicioMesAnterior)}: +${formatarMoeda(diferenca)} (+${percentual.toFixed(0)}%)`;
    } else if (diferenca < 0) {
      mensagem += `📉 vs ${obterNomeMes(inicioMesAnterior)}: ${formatarMoeda(diferenca)} (${percentual.toFixed(0)}%)`;
    } else {
      mensagem += `➡️ vs ${obterNomeMes(inicioMesAnterior)}: Igual`;
    }
  }
  
  return mensagem;
}

// ============================================
// SALVAR CONTEXTO DE LISTAGEM (para atalho "paguei a 1")
// ============================================

export async function salvarContextoListagem(userId: string, contas: ContaPagar[]): Promise<void> {
  const supabase = getSupabase();
  
  // Salvar no contexto do usuário
  await supabase
    .from('user_context')
    .upsert({
      user_id: userId,
      context_type: 'lista_contas_pagar',
      context_data: {
        contas: contas.map(c => ({
          index: c.index,
          id: c.id,
          nome: c.description
        })),
        expira_em: Date.now() + (30 * 60 * 1000) // 30 minutos
      },
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,context_type'
    });
}

// ============================================
// TEMPLATE PARA DESAMBIGUAÇÃO
// ============================================

export function templateContasAmbiguo(): string {
  return `Oi! Quais contas você quer consultar?

1️⃣ Contas Bancárias (saldos)
2️⃣ Contas a Pagar (luz, água, etc)

_Digite 1 ou 2, ou escreva "bancárias" ou "pagar"_ 😊`;
}

export function templateCadastrarContaAmbiguo(): string {
  return `📝 Que tipo de conta você quer cadastrar?

1️⃣ Conta Bancária (Nubank, Itaú, etc)
2️⃣ Conta a Pagar (luz, Netflix, aluguel)

_Digite 1 ou 2_`;
}

// ============================================
// PROCESSAR RESPOSTA DA DESAMBIGUAÇÃO
// ============================================

export function processarRespostaCadastrarContaAmbiguo(resposta: string): 'bancaria' | 'pagar' | null {
  const r = resposta.toLowerCase().trim();
  
  // Opção 1 - Conta Bancária
  if (r === '1' || r === 'bancária' || r === 'bancaria' || r === 'banco' || r === 'nubank' || r === 'itau' || r === 'itaú') {
    return 'bancaria';
  }
  
  // Opção 2 - Conta a Pagar
  if (r === '2' || r === 'pagar' || r === 'a pagar' || r === 'luz' || r === 'netflix' || r === 'aluguel') {
    return 'pagar';
  }
  
  return null;
}

export function processarRespostaContasAmbiguo(resposta: string): 'bancarias' | 'pagar' | null {
  const r = resposta.toLowerCase().trim();
  
  // Opção 1 - Contas Bancárias
  if (r === '1' || r === 'bancárias' || r === 'bancarias' || r === 'bancos' || r === 'saldo' || r === 'saldos') {
    return 'bancarias';
  }
  
  // Opção 2 - Contas a Pagar
  if (r === '2' || r === 'pagar' || r === 'a pagar' || r === 'pendentes' || r === 'contas a pagar') {
    return 'pagar';
  }
  
  return null;
}

// ============================================
// PROCESSAR INTENÇÃO - CONSULTAS (FASE 3.1)
// ============================================

export async function processarIntencaoContaPagar(
  intencao: TipoIntencaoContaPagar,
  userId: string,
  _phone: string,
  _entidades?: any
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: any }> {
  
  console.log('[CONTAS-PAGAR] Processando intenção:', intencao);
  
  switch (intencao) {
    case 'LISTAR_CONTAS_PAGAR': {
      const resultado = await listarContasPagar(userId);
      
      // Salvar contexto para atalho "paguei a 1"
      if (resultado.contas.length > 0) {
        await salvarContextoListagem(userId, resultado.contas);
      }
      
      return { mensagem: resultado.mensagem };
    }
    
    case 'CONTAS_VENCENDO':
      return { mensagem: await contasVencendo(userId, resolveContasVencendoWindow(_entidades)) };
    
    case 'CONTAS_VENCIDAS':
      return { mensagem: await contasVencidas(userId) };
    
    case 'CONTAS_DO_MES': {
      const mesRef = resolveContasDoMesReference(_entidades);
      return { mensagem: await contasDoMes(userId, mesRef.mes, mesRef.ano) };
    }
    
    case 'RESUMO_CONTAS_MES':
      return { mensagem: await resumoContasMes(userId) };
    
    // FASE 3.2: CRUD de contas
    case 'CADASTRAR_CONTA_PAGAR':
      return await processarCadastroConta(userId, _phone, _entidades);
    
    case 'EDITAR_CONTA_PAGAR':
      return await processarEdicaoConta(userId, _entidades);
    
    case 'EXCLUIR_CONTA_PAGAR':
      return await processarExclusaoConta(userId, _phone, _entidades);
    
    case 'MARCAR_CONTA_PAGA':
      return await processarMarcarPago(userId, _phone, _entidades);
    
    case 'VALOR_CONTA_VARIAVEL':
      return await processarValorContaVariavel(userId, _phone, _entidades);
    
    case 'HISTORICO_CONTA':
      return await processarHistoricoConta(userId, _phone, _entidades);
    
    case 'PAGAR_FATURA_CARTAO':
      return await processarPagarFaturaCartao(userId, _phone, _entidades);
    
    case 'DESFAZER_PAGAMENTO':
      return await processarDesfazerPagamento(userId, _phone, _entidades);
    
    case 'RESUMO_PAGAMENTOS_MES':
      return await processarResumoPagamentosMes(userId, _phone, _entidades);
    
    case 'CONTAS_AMBIGUO':
      return { 
        mensagem: templateContasAmbiguo(),
        precisaConfirmacao: true,
        dados: { step: 'awaiting_account_type_selection' }
      };
    
    case 'CADASTRAR_CONTA_AMBIGUO':
      return { 
        mensagem: templateCadastrarContaAmbiguo(),
        precisaConfirmacao: true,
        dados: { step: 'awaiting_register_account_type' }
      };
    
    default:
      return { 
        mensagem: `❓ Não entendi o que você quer fazer com contas.\n\n💡 Tente:\n• _"minhas contas"_\n• _"o que vence essa semana"_\n• _"contas vencidas"_\n• _"resumo de contas"_` 
      };
  }
}

// ============================================
// FASE 3.3: CADASTRAR FATURA DE CARTÃO
// ============================================

async function processarCadastroFaturaCartao(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>,
  deteccao: DeteccaoFaturaCartao
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const { salvarContexto } = await import('./context-manager.ts');
  
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const valor = entidades.valor as number | undefined;
  const diaVencimento = entidades.dia_vencimento as number | undefined;
  
  console.log('[FATURA-CARTAO] Processando cadastro de fatura');
  console.log('[FATURA-CARTAO] Banco identificado:', deteccao.bancoIdentificado);
  console.log('[FATURA-CARTAO] Valor:', valor, 'Dia:', diaVencimento);
  
  // Se identificou o banco, tentar encontrar o cartão
  if (deteccao.bancoIdentificado) {
    const cartao = await buscarCartaoPorNome(userId, deteccao.bancoIdentificado);
    
    if (cartao) {
      // Cartão existe - verificar se temos todos os dados
      if (valor && diaVencimento) {
        // Todos os dados OK - criar fatura direto
        const hoje = new Date();
        let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
        if (dueDate < hoje) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
        
        const resultado = await criarOuAtualizarFaturaCartao(userId, cartao.id, valor, dueDateStr);
        
        if (resultado.sucesso) {
          return {
            mensagem: `✅ *Fatura cadastrada!*

💳 ${cartao.name}
💰 R$ ${valor.toFixed(2).replace('.', ',')}
📅 Vence dia ${diaVencimento}
🔔 _Vou te lembrar 3 dias antes!_

💡 Acesse a página de *Cartões* para ver os detalhes.`
          };
        }
        
        return { mensagem: `❌ Erro ao cadastrar fatura: ${resultado.erro}` };
      }
      
      // Falta valor - perguntar
      if (!valor) {
        await salvarContexto(userId, 'awaiting_invoice_amount', {
          cartaoId: cartao.id,
          cartaoNome: cartao.name,
          diaVencimento: diaVencimento || cartao.due_day,
          textoOriginal: comandoOriginal
        });
        
        return {
          mensagem: `📝 Vou cadastrar a fatura do *${cartao.name}*.

💰 Qual o valor da fatura?

Ex: "2500", "R$ 1.850,00"`
        };
      }
      
      // Falta dia - perguntar
      if (!diaVencimento) {
        await salvarContexto(userId, 'awaiting_invoice_due_date', {
          cartaoId: cartao.id,
          cartaoNome: cartao.name,
          valor,
          textoOriginal: comandoOriginal
        });
        
        return {
          mensagem: `📝 Vou cadastrar a fatura do *${cartao.name}*.

📅 Qual o dia de vencimento?

Ex: "10", "dia 15", "todo dia 7"`
        };
      }
    } else {
      // Cartão não existe - perguntar se quer cadastrar
      const nomeCapitalizado = deteccao.bancoIdentificado.charAt(0).toUpperCase() + 
                                deteccao.bancoIdentificado.slice(1);
      
      await salvarContexto(userId, 'awaiting_card_creation_confirmation', {
        bancoNome: deteccao.bancoIdentificado,
        valor,
        diaVencimento,
        textoOriginal: comandoOriginal
      });
      
      return {
        mensagem: `💳 Não encontrei o cartão *${nomeCapitalizado}* cadastrado.

Quer que eu:
1️⃣ Cadastre o cartão e a fatura
2️⃣ Cadastre só a fatura como conta avulsa

Digite 1 ou 2`
      };
    }
  }
  
  // Detectou fatura mas não identificou o cartão - listar cartões
  const cartoes = await listarCartoesUsuario(userId);
  
  if (cartoes.length > 0) {
    await salvarContexto(userId, 'awaiting_card_selection', {
      cartoes,
      valor,
      diaVencimento,
      textoOriginal: comandoOriginal
    });
    
    let opcoes = cartoes.map((c, i) => `${i + 1}️⃣ ${c.name}`).join('\n');
    opcoes += `\n${cartoes.length + 1}️⃣ Outro cartão (cadastrar novo)`;
    
    return {
      mensagem: `📝 Vou cadastrar uma fatura de cartão.

💳 De qual cartão é a fatura?

${opcoes}`
    };
  }
  
  // Usuário não tem cartões - perguntar nome
  await salvarContexto(userId, 'awaiting_card_creation_confirmation', {
    criarNovoCartao: true,
    valor,
    diaVencimento,
    textoOriginal: comandoOriginal
  });
  
  return {
    mensagem: `📝 Vou cadastrar a fatura do cartão.

💳 Qual o nome do cartão?

Ex: "Nubank", "Itaú", "Bradesco"`
  };
}

// ============================================
// FASE 3.2: CADASTRAR CONTA (SISTEMA ROBUSTO)
// ============================================

async function processarCadastroConta(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  
  console.log('[CADASTRAR-CONTA] Iniciando processamento robusto');
  console.log('[CADASTRAR-CONTA] Entidades NLP:', JSON.stringify(entidades));
  console.log('[CADASTRAR-CONTA] Comando original:', comandoOriginal);
  
  // ============================================
  // PASSO 0: Verificar se é FATURA DE CARTÃO
  // ============================================
  const deteccaoFatura = detectarFaturaCartao(comandoOriginal);
  
  if (deteccaoFatura.ehFaturaCartao) {
    console.log('[CADASTRAR-CONTA] Detectada FATURA DE CARTÃO:', deteccaoFatura);
    return await processarCadastroFaturaCartao(userId, phone, entidades, deteccaoFatura);
  }
  
  // ============================================
  // PASSO 1: Extrair dados do NLP + fallback
  // ============================================
  
  let descricaoRaw = entidades.descricao as string || entidades.nome_conta as string || '';
  let valor = entidades.valor as number | undefined;
  let diaVencimento = entidades.dia_vencimento as number | undefined;
  let parcelaAtual = entidades.parcela_atual as number | undefined;
  let totalParcelas = entidades.total_parcelas as number | undefined || entidades.parcelas as number | undefined;
  
  // Fallback: extrair descrição do texto
  if (!descricaoRaw && comandoOriginal) {
    for (const [tipo, aliases] of Object.entries(CONTA_ALIASES)) {
      if (aliases.some(alias => comandoOriginal.includes(alias))) {
        descricaoRaw = tipo;
        break;
      }
    }
  }
  
  // ============================================
  // PASSO 2: VALIDAÇÃO CRÍTICA - Não confiar cegamente no NLP
  // ============================================
  
  // Só aceitar dia_vencimento se REALMENTE foi mencionado no texto
  // Suporta: "dia 15", "dia 15/03", "15/03", "todo dia 10", "vence dia 5"
  const textoMencionaDia = comandoOriginal && (
    /dia\s*\d{1,2}(?:[\/\-\.]\d{1,2})?/i.test(comandoOriginal) ||
    /todo\s+dia/i.test(comandoOriginal) ||
    /vence\s+(dia\s*)?\d{1,2}/i.test(comandoOriginal) ||
    /vencimento\s+(dia\s*)?\d{1,2}/i.test(comandoOriginal) ||
    /\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?/i.test(comandoOriginal) // 15/03 ou 15/03/2025
  );
  
  console.log(`[CADASTRAR-CONTA] textoMencionaDia: ${textoMencionaDia}, comando: "${comandoOriginal}"`);
  
  if (diaVencimento && !textoMencionaDia) {
    console.log('[CADASTRAR-CONTA] NLP inventou dia_vencimento. Ignorando.');
    diaVencimento = undefined;
  }
  
  // Só aceitar valor se REALMENTE foi mencionado no texto
  // IMPORTANTE: Não confundir "3 de 10" (parcelas) com valor!
  const textoMencionaValor = comandoOriginal && (
    /r\s*\$\s*\d/i.test(comandoOriginal) ||
    /\d+\s*(reais|real)/i.test(comandoOriginal) ||
    /valor\s*(de)?\s*\d/i.test(comandoOriginal) ||
    /pagar\s*\d/i.test(comandoOriginal) ||
    /\d+[.,]\d{2}/i.test(comandoOriginal)  // 150,00 ou 150.00
  );
  
  // Se menciona parcelas no formato "X de Y", NÃO considerar como valor
  const textoTemPadraoParcelasXdeY = comandoOriginal && /parcela\s*\d+\s*(de|\/)\s*\d+/i.test(comandoOriginal);
  
  if (valor && !textoMencionaValor) {
    console.log('[CADASTRAR-CONTA] NLP inventou valor. Ignorando.');
    valor = undefined;
  }
  
  // CRÍTICO: Se o texto tem padrão "parcela X de Y", limpar valor que veio do NLP
  // pois provavelmente é confusão com o número de parcelas
  if (valor && textoTemPadraoParcelasXdeY) {
    const matchParcela = comandoOriginal.match(/parcela\s*(\d+)\s*(de|\/)\s*(\d+)/i);
    if (matchParcela) {
      const numParcela = parseInt(matchParcela[1]);
      const totalParc = parseInt(matchParcela[3]);
      if (valor === numParcela || valor === totalParc) {
        console.log(`[CADASTRAR-CONTA] ⚠️ Valor ${valor} é número de parcela (${numParcela}/${totalParc}). Limpando.`);
        valor = undefined;
      }
    }
  }
  
  // Só aceitar parcelas se REALMENTE foi mencionado no texto
  // Padrões válidos: "36x", "em 24x", "24 parcelas", "parcela 3 de 12", "3/12"
  const textoMencionaParcelas = comandoOriginal && (
    /\d+\s*x/i.test(comandoOriginal) ||                    // "36x", "24x"
    /\d+\s*parcelas?/i.test(comandoOriginal) ||            // "36 parcelas"
    /parcela\s*\d+/i.test(comandoOriginal) ||              // "parcela 3"
    /\d+\s*(de|\/)\s*\d+/i.test(comandoOriginal) ||        // "3 de 12", "3/12"
    /em\s*\d+\s*vezes/i.test(comandoOriginal)              // "em 12 vezes"
  );
  
  if (totalParcelas && !textoMencionaParcelas) {
    console.log(`[CADASTRAR-CONTA] NLP inventou totalParcelas=${totalParcelas}. Ignorando.`);
    totalParcelas = undefined;
    parcelaAtual = undefined;
  }
  
  // FALLBACK: Extrair parcelas do texto manualmente (padrão "parcela X de Y")
  // Isso é CRÍTICO para casos como "TV parcela 3 de 10" onde o NLP pode confundir
  if (comandoOriginal && textoMencionaParcelas) {
    // Padrão 1: "parcela 15 de 10" ou "parcela 3/12"
    const matchParcela = comandoOriginal.match(/parcela\s*(\d+)\s*(de|\/)\s*(\d+)/i);
    if (matchParcela) {
      parcelaAtual = parseInt(matchParcela[1]);
      totalParcelas = parseInt(matchParcela[3]);
      console.log(`[CADASTRAR-CONTA] Parcelas extraídas manualmente: ${parcelaAtual}/${totalParcelas}`);
      
      // IMPORTANTE: Se o NLP confundiu o número da parcela com valor, limpar o valor
      // Verifica se o valor é igual a qualquer número do padrão de parcelas
      if (valor === parcelaAtual || valor === totalParcelas) {
        console.log(`[CADASTRAR-CONTA] ⚠️ NLP confundiu parcela com valor (${valor}). Limpando valor.`);
        valor = undefined;
      }
    }
    
    // Padrão 2: "3 de 12" ou "5/10" (sem a palavra "parcela")
    if (!parcelaAtual && !totalParcelas) {
      const matchSimples = comandoOriginal.match(/(\d+)\s*(de|\/)\s*(\d+)/i);
      if (matchSimples) {
        const num1 = parseInt(matchSimples[1]);
        const num2 = parseInt(matchSimples[3]);
        // Só considerar se parecer parcela (num1 <= num2 ou num2 > 1)
        if (num2 > 1) {
          parcelaAtual = num1;
          totalParcelas = num2;
          console.log(`[CADASTRAR-CONTA] Parcelas extraídas (padrão simples): ${parcelaAtual}/${totalParcelas}`);
          
          // Limpar valor se foi confundido
          if (valor === parcelaAtual || valor === totalParcelas) {
            console.log(`[CADASTRAR-CONTA] ⚠️ NLP confundiu parcela com valor (${valor}). Limpando valor.`);
            valor = undefined;
          }
        }
      }
    }
    
    // VERIFICAÇÃO EXTRA: Se detectamos parcelas e o valor é muito baixo (< 50), provavelmente é confusão
    // Ex: "TV parcela 3 de 10" → valor=10 é claramente o total de parcelas
    if (parcelaAtual && totalParcelas && valor !== undefined && valor <= totalParcelas && valor < 50) {
      console.log(`[CADASTRAR-CONTA] ⚠️ Valor ${valor} muito baixo para parcelamento. Provavelmente é número de parcela. Limpando.`);
      valor = undefined;
    }
  }
  
  // Fallback: extrair dia do texto (SEMPRE tentar, mesmo se NLP retornou algo)
  console.log(`[CADASTRAR-CONTA] Tentando extrair dia do texto: "${comandoOriginal}", diaVencimento atual: ${diaVencimento}`);
  
  // Variável para armazenar data completa extraída (para validação posterior)
  let dataCompletaExtraida: string | undefined = undefined;
  
  if (comandoOriginal) {
    // PRIMEIRO: Verificar se há data completa (DD/MM/YYYY) - precisa validar!
    const matchDataCompleta = comandoOriginal.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (matchDataCompleta) {
      dataCompletaExtraida = matchDataCompleta[0];
      diaVencimento = parseInt(matchDataCompleta[1]);
      console.log(`[CADASTRAR-CONTA] Data completa extraída: ${dataCompletaExtraida}, dia: ${diaVencimento}`);
    }
    
    // Padrão 1: "dia 15/03" ou "dia 15-03" ou "dia 15.03" → extrair só o dia (15)
    if (!diaVencimento) {
      let diaMatch = comandoOriginal.match(/dia\s*(\d{1,2})[\/\-\.]\d{1,2}/i);
      if (diaMatch) {
        diaVencimento = parseInt(diaMatch[1]);
        console.log(`[CADASTRAR-CONTA] Dia extraído de data completa: ${diaVencimento}`);
      }
    }
    
    // Padrão 2: "dia 15" (sem mês) - MAIS FLEXÍVEL
    if (!diaVencimento) {
      const diaMatch = comandoOriginal.match(/dia\s*(\d{1,2})/i);
      if (diaMatch) {
        diaVencimento = parseInt(diaMatch[1]);
        console.log(`[CADASTRAR-CONTA] Dia extraído simples: ${diaVencimento}`);
      }
    }
    
    // Padrão 3: "15/03" ou "15-03" em qualquer lugar do texto (sem "dia") - SEM ANO
    if (!diaVencimento) {
      const diaMatch = comandoOriginal.match(/(\d{1,2})[\/\-\.](\d{1,2})(?![\/\-\.]\d)/i);
      if (diaMatch) {
        diaVencimento = parseInt(diaMatch[1]);
        console.log(`[CADASTRAR-CONTA] Dia extraído de data: ${diaVencimento}`);
      }
    }
    
    console.log(`[CADASTRAR-CONTA] Dia final após fallback: ${diaVencimento}`);
  }
  
  // PRIMEIRO: Detectar padrão de parcelamento "Nx de valor" (ex: "10x de 250", "24x de 99 reais")
  // Isso DEVE vir antes do fallback de valor para não confundir parcelas com valor
  if (comandoOriginal) {
    // Regex melhorado para capturar:
    // - "24x de 99" 
    // - "24x de 99 reais"
    // - "24x de R$ 99"
    // - "em 24x de 99"
    const parcelamentoMatch = comandoOriginal.match(/(?:em\s+)?(\d+)\s*x\s*(?:de\s*)?r?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:reais|real)?/i);
    if (parcelamentoMatch) {
      const numParcelas = parseInt(parcelamentoMatch[1]);
      const valorParcela = parseFloat(parcelamentoMatch[2].replace(',', '.'));
      
      console.log(`[CADASTRAR-CONTA] Parcelamento detectado: ${numParcelas}x de R$ ${valorParcela}`);
      
      // Só usar se faz sentido (parcelas entre 2 e 72, valor > 0)
      if (numParcelas >= 2 && numParcelas <= 72 && valorParcela > 0) {
        if (!totalParcelas) totalParcelas = numParcelas;
        if (!parcelaAtual) parcelaAtual = 1;
        
        // ⚠️ CRÍTICO: SEMPRE usar o valor da parcela extraído do texto!
        // O NLP pode calcular o total (24 × 99 = 2376) ao invés do valor por parcela (99)
        // Quando detectamos "Nx de valor", o valor correto é o da parcela, não o total!
        if (valor && valor !== valorParcela) {
          console.log(`[CADASTRAR-CONTA] ⚠️ NLP retornou valor ${valor}, mas texto diz ${valorParcela}. Usando valor do texto!`);
        }
        valor = valorParcela;  // SEMPRE sobrescrever com o valor correto
        
        console.log(`[CADASTRAR-CONTA] Valores definidos: parcela ${parcelaAtual}/${totalParcelas}, valor R$ ${valor}`);
      }
    }
  }
  
  // Fallback: extrair valor do texto (só se não foi extraído do parcelamento)
  // CRÍTICO: Criar texto sem padrão de parcelas para não confundir
  let textoParaExtrairValor = comandoOriginal || '';
  if (parcelaAtual && totalParcelas && comandoOriginal) {
    // Remover padrões de parcela do texto antes de buscar valor
    textoParaExtrairValor = comandoOriginal
      .replace(/parcela\s*\d+\s*(?:de|\/)\s*\d+/gi, ' ')  // "parcela 3 de 10"
      .replace(/\d+\s*(?:de|\/)\s*\d+/gi, ' ')            // "3 de 10" ou "3/10"
      .replace(/\d+\s*x\b/gi, ' ')                         // "10x"
      .trim();
    console.log(`[CADASTRAR-CONTA] Texto sem parcelas para extrair valor: "${textoParaExtrairValor}"`);
  }
  
  if (!valor && textoParaExtrairValor) {
    // Evitar capturar número de parcelas como valor
    // Padrão: busca valor após "de" ou "R$" ou "reais", mas NÃO após "x"
    const valorMatch = textoParaExtrairValor.match(/(?:de\s*)?r\$\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*reais/i);
    if (valorMatch) {
      const valorCapturado = valorMatch[1] || valorMatch[2];
      if (valorCapturado && !textoParaExtrairValor.includes('dia ' + valorCapturado)) {
        valor = parseFloat(valorCapturado.replace(',', '.'));
        console.log(`[CADASTRAR-CONTA] Valor extraído do texto (R$/reais): R$ ${valor}`);
      }
    }
    
    // Fallback 2: Capturar número solto que parece ser valor (>= 10 e não é dia)
    // Ex: "Conta de luz 180, vence dia 10" → 180 é valor, 10 é dia
    if (!valor) {
      // Encontrar todos os números no texto LIMPO (sem parcelas)
      const numeros = textoParaExtrairValor.match(/\d+(?:[.,]\d+)?/g);
      if (numeros) {
        for (const num of numeros) {
          const numFloat = parseFloat(num.replace(',', '.'));
          // Ignorar números que são dias (1-31) ou que aparecem após "dia"
          const isDia = textoParaExtrairValor.match(new RegExp(`dia\\s*${num}\\b`, 'i'));
          const isVencimento = textoParaExtrairValor.match(new RegExp(`vence\\s*(dia\\s*)?${num}\\b`, 'i'));
          
          // EXTRA: Ignorar se é igual a parcelaAtual ou totalParcelas
          const isParcela = (parcelaAtual && numFloat === parcelaAtual) || (totalParcelas && numFloat === totalParcelas);
          
          // Se é um número >= 10 e não é dia de vencimento e não é parcela, provavelmente é valor
          if (numFloat >= 10 && !isDia && !isVencimento && !isParcela) {
            valor = numFloat;
            console.log(`[CADASTRAR-CONTA] Valor extraído do texto (número solto): R$ ${valor}`);
            break;
          }
        }
      }
    }
  }
  
  // Fallback: extrair parcelas do texto (para formatos como "3/10", "parcela 3 de 10")
  if (!parcelaAtual && comandoOriginal) {
    const parcelas = extrairParcelasTexto(comandoOriginal);
    if (parcelas) {
      parcelaAtual = parcelas.atual;
      if (!totalParcelas) {
        totalParcelas = parcelas.total;
      }
    }
    
    // Se ainda não tem parcelaAtual mas tem totalParcelas, assumir parcela 1
    if (!parcelaAtual && totalParcelas) {
      console.log(`[CADASTRAR-CONTA] Assumindo parcela 1 de ${totalParcelas}`);
      parcelaAtual = 1;
    }
  }
  
  // ============================================
  // PASSO 3: Identificar tipo de conta
  // ============================================
  
  const tipo = identificarTipoConta(comandoOriginal || descricaoRaw, entidades);
  console.log('[CADASTRAR-CONTA] Tipo identificado:', tipo);
  
  // ============================================
  // PASSO 4: Montar dados e validar
  // ============================================
  
  // IMPORTANTE: Manter descrição ORIGINAL do usuário, apenas capitalizar
  // normalizarNomeConta só deve ser usada para COMPARAÇÃO de duplicatas
  const descricao = descricaoRaw 
    ? descricaoRaw.charAt(0).toUpperCase() + descricaoRaw.slice(1).toLowerCase()
    : undefined;
  
  const dados: DadosCadastroConta = {
    tipo,
    descricao,
    valor,
    diaVencimento,
    parcelaAtual,
    totalParcelas,
    recorrencia: tipo === 'fixed' || tipo === 'subscription' || tipo === 'variable' ? 'mensal' : 'unica',
    textoOriginal: comandoOriginal
  };
  
  console.log('[CADASTRAR-CONTA] Dados extraídos:', JSON.stringify(dados));
  
  // ============================================
  // PASSO 4.5: Validações inteligentes
  // ============================================
  
  // 4.5.1: Verificar valor negativo no texto original
  if (textoContemValorNegativo(comandoOriginal || '')) {
    console.log('[CADASTRAR-CONTA] ❌ Valor negativo detectado no texto!');
    const validacao = validarValor(-1, tipo, descricao); // Força validação de negativo
    return {
      mensagem: validacao.mensagem || `❌ *Ops!* O valor não pode ser negativo.\n\n💰 Qual o valor correto${descricao ? ` da *${descricao}*` : ''}?`,
      precisaConfirmacao: true,
      dados: {
        contextType: 'awaiting_bill_amount',
        descricao,
        diaVencimento,
        tipo,
        parcelaAtual,
        totalParcelas,
        phone
      }
    };
  }
  
  // 4.5.2: Validar valor com limites inteligentes por tipo
  if (valor !== undefined) {
    const validacaoValor = validarValor(valor, tipo, descricao);
    if (!validacaoValor.valido) {
      console.log(`[CADASTRAR-CONTA] ❌ Valor inválido: ${validacaoValor.tipo} - R$ ${valor}`);
      return {
        mensagem: validacaoValor.mensagem!,
        precisaConfirmacao: true,
        dados: {
          contextType: 'awaiting_bill_amount',
          descricao,
          diaVencimento,
          tipo,
          parcelaAtual,
          totalParcelas,
          phone
        }
      };
    }
  }
  
  // 4.5.3: Validar data completa (DD/MM/YYYY) se foi informada
  if (dataCompletaExtraida) {
    const validacaoData = validarDataCompleta(dataCompletaExtraida);
    if (!validacaoData.valido) {
      console.log(`[CADASTRAR-CONTA] ❌ Data completa inválida: ${dataCompletaExtraida} - ${validacaoData.tipo}`);
      return {
        mensagem: validacaoData.mensagem!,
        precisaConfirmacao: true,
        dados: {
          contextType: 'awaiting_due_day',
          descricao,
          valor,
          tipo,
          parcelaAtual,
          totalParcelas,
          phone
        }
      };
    }
    // Se tem alerta (data passada recente), guardar para mostrar na confirmação
    if (validacaoData.alerta) {
      console.log(`[CADASTRAR-CONTA] ⚠️ Alerta de data: ${validacaoData.alerta}`);
      // O alerta será mostrado junto com a confirmação de cadastro
    }
  }
  
  // 4.5.4: Validar dia de vencimento (se não foi data completa)
  if (diaVencimento !== undefined && !dataCompletaExtraida) {
    const validacaoDia = validarDiaVencimento(diaVencimento);
    if (!validacaoDia.valido) {
      console.log(`[CADASTRAR-CONTA] ❌ Dia inválido: ${diaVencimento}`);
      return {
        mensagem: validacaoDia.mensagem!,
        precisaConfirmacao: true,
        dados: {
          contextType: 'awaiting_due_day',
          descricao,
          valor,
          tipo,
          parcelaAtual,
          totalParcelas,
          phone
        }
      };
    }
  }
  
  // 4.5.5: Validar parcelas (se for parcelamento)
  if (parcelaAtual !== undefined || totalParcelas !== undefined) {
    const validacaoParcelas = validarParcelas(parcelaAtual, totalParcelas);
    if (!validacaoParcelas.valido) {
      console.log(`[CADASTRAR-CONTA] ❌ Parcelas inválidas: ${parcelaAtual}/${totalParcelas}`);
      // IMPORTANTE: NÃO salvar valor se foi confundido com número de parcela
      // O valor será perguntado depois que as parcelas forem corrigidas
      const valorParaSalvar = (valor === parcelaAtual || valor === totalParcelas) ? undefined : valor;
      if (valorParaSalvar !== valor) {
        console.log(`[CADASTRAR-CONTA] ⚠️ Valor ${valor} parece ser número de parcela. Não salvando.`);
      }
      return {
        mensagem: validacaoParcelas.mensagem!,
        precisaConfirmacao: true,
        dados: {
          contextType: 'awaiting_installment_info',
          descricao,
          valor: valorParaSalvar,  // Só salva se não foi confundido
          diaVencimento,
          tipo: 'installment',
          phone
        }
      };
    }
  }
  
  // ============================================
  // PASSO 5: Se tipo desconhecido, perguntar
  // ============================================
  
  if (tipo === 'unknown' && descricao) {
    return {
      mensagem: templatePerguntarTipoConta(descricao),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_type',
        ...dados,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 5.5: Verificar se é parcelamento obrigatório SEM parcelas válidas
  // ============================================
  // Palavras como "financiamento", "empréstimo", "crediário" SEMPRE são parcelamentos
  // Se o usuário não informou o número de parcelas (ou NLP assumiu 1), devemos PERGUNTAR
  // NOTA: totalParcelas = 1 é inválido para financiamento/empréstimo - sempre tem mais de 1 parcela!
  
  const textoParaVerificar = comandoOriginal || descricaoRaw || '';
  const parcelasInvalidas = !totalParcelas || totalParcelas <= 1;
  
  if (ehParcelamentoObrigatorio(textoParaVerificar) && parcelasInvalidas) {
    console.log('[CADASTRAR-CONTA] ⚠️ Parcelamento obrigatório detectado SEM número de parcelas válido!');
    console.log('[CADASTRAR-CONTA] Texto:', textoParaVerificar);
    console.log('[CADASTRAR-CONTA] totalParcelas atual:', totalParcelas, '(inválido para parcelamento)');
    
    return {
      mensagem: `📝 Vou cadastrar o parcelamento de *${descricao || descricaoRaw}*.\n\n🔢 Quantas parcelas são no total?\nE qual parcela é essa?\n\n_Ex: "48 parcelas, estou na 12" ou "36x, parcela 5"_`,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_installment_info',
        descricao: descricao || descricaoRaw,
        valor,
        diaVencimento,
        tipo: 'installment',
        textoOriginal: comandoOriginal,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 6: Validar campos obrigatórios
  // ============================================
  
  const camposObrigatorios = getCamposObrigatorios(tipo);
  const camposFaltantes = validarCamposConta(dados, camposObrigatorios);
  
  console.log('[CADASTRAR-CONTA] Campos obrigatórios:', camposObrigatorios);
  console.log('[CADASTRAR-CONTA] Campos faltantes:', camposFaltantes);
  
  // Se falta descrição, perguntar primeiro
  if (camposFaltantes.includes('descricao')) {
    return {
      mensagem: getPerguntaParaCampo('descricao', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_description',
        ...dados,
        phone
      }
    };
  }
  
  // Verificar duplicação (só se tem descrição)
  if (descricao) {
    const contaExistente = await buscarContaPorNome(userId, descricao);
    
    if (contaExistente) {
      return {
        mensagem: templateContaDuplicada(contaExistente, valor),
        precisaConfirmacao: true,
        dados: { 
          step: 'awaiting_duplicate_decision',
          conta_existente_id: contaExistente.id,
          novo_valor: valor,
          ...dados,
          phone
        }
      };
    }
  }
  
  // ORDEM DE PRIORIDADE: VALOR → DIA → TIPO
  // VALOR é prioridade MÁXIMA (sem valor = não pode cadastrar)
  if (camposFaltantes.includes('valor')) {
    console.log('[CADASTRAR-CONTA] Falta VALOR - prioridade 1');
    return {
      mensagem: getPerguntaParaCampo('valor', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_amount',
        descricao: dados.descricao,
        valor: dados.valor,
        tipo: dados.tipo,
        recorrencia: dados.recorrencia,
        diaVencimento: dados.diaVencimento,
        parcelaAtual: dados.parcelaAtual,
        totalParcelas: dados.totalParcelas,
        textoOriginal: dados.textoOriginal,
        phone
      }
    };
  }
  
  // DIA vem depois do valor - prioridade 2
  if (camposFaltantes.includes('diaVencimento')) {
    console.log('[CADASTRAR-CONTA] Falta DIA - prioridade 2');
    console.log('[CADASTRAR-CONTA] Salvando contexto awaiting_due_day com dados:', {
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      recorrencia: dados.recorrencia
    });
    
    return {
      mensagem: getPerguntaParaCampo('diaVencimento', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_due_day',
        descricao: dados.descricao,
        valor: dados.valor,
        tipo: dados.tipo,
        recorrencia: dados.recorrencia,
        parcelaAtual: dados.parcelaAtual,
        totalParcelas: dados.totalParcelas,
        textoOriginal: dados.textoOriginal,
        phone
      }
    };
  }
  
  // Se falta info de parcelas, perguntar
  if (camposFaltantes.includes('parcelaAtual') || camposFaltantes.includes('totalParcelas')) {
    return {
      mensagem: getPerguntaParaCampo('parcelaAtual', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_installment_info',
        ...dados,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 6.3: PARCELAMENTO - Perguntar método de pagamento
  // ============================================
  // Se é parcelamento e não sabemos como será pago (cartão ou boleto),
  // precisamos perguntar para vincular corretamente
  
  const ehParcelamento = totalParcelas && totalParcelas > 1;
  const metodoPagamentoDefinido = dados.paymentMethod || entidades.payment_method;
  
  if (ehParcelamento && !metodoPagamentoDefinido) {
    const { salvarContexto } = await import('./context-manager.ts');
    
    console.log('[CADASTRAR-CONTA] ⚠️ Parcelamento detectado SEM método de pagamento');
    console.log('[CADASTRAR-CONTA] Perguntando: cartão ou boleto?');
    
    await salvarContexto(userId, 'awaiting_installment_payment_method', {
      descricao: dados.descricao,
      valor: dados.valor,
      diaVencimento: dados.diaVencimento,
      tipo: dados.tipo,
      parcelaAtual: dados.parcelaAtual,
      totalParcelas: dados.totalParcelas,
      recorrencia: dados.recorrencia,
      textoOriginal: dados.textoOriginal
    });
    
    return {
      mensagem: `📝 Vou cadastrar o parcelamento de *${descricao}*.

💳 Esse parcelamento é no *cartão* ou no *boleto*?

1️⃣ Cartão de crédito
2️⃣ Boleto/Carnê

_Digite 1 ou 2_`,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_installment_payment_method',
        ...dados,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 6.5: Conta variável SEM valor - perguntar valor médio
  // ============================================
  // Contas de serviços (luz, água, gás) são naturalmente variáveis
  // Se não informou valor, perguntar o valor médio para controle financeiro
  
  const CONTAS_VARIAVEIS_KEYWORDS = [
    'luz', 'energia', 'elétrica', 'eletrica', 'enel', 'cpfl', 'cemig', 'light', 'celpe', 'energisa',
    'água', 'agua', 'sabesp', 'copasa', 'cedae', 'sanepar',
    'gás', 'gas', 'comgás', 'comgas', 'naturgy'
  ];
  
  const descricaoLower = (descricao || '').toLowerCase();
  const textoOriginalLower = (comandoOriginal || '').toLowerCase();
  const ehContaDeServico = CONTAS_VARIAVEIS_KEYWORDS.some(kw => 
    descricaoLower.includes(kw) || textoOriginalLower.includes(kw)
  );
  
  // Se é conta de serviço variável E não tem valor, perguntar valor médio
  if (ehContaDeServico && !valor) {
    console.log('[CADASTRAR-CONTA] ⚠️ Conta variável detectada SEM valor - perguntando valor médio');
    console.log('[CADASTRAR-CONTA] Descrição:', descricao);
    
    const emoji = getEmojiConta(descricao || '');
    return {
      mensagem: `📝 Vou cadastrar a conta de *${descricao}*.\n\n💰 Qual o valor médio mensal?\n\n_Ex: "80 reais" ou "em média 120"_`,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_average_value',
        descricao,
        diaVencimento,
        tipo: 'variable',
        textoOriginal: comandoOriginal,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 7: Todos os campos OK - Cadastrar!
  // ============================================
  
  return await cadastrarContaNoBanco(supabase, userId, dados);
}

// Função EXPORTADA para criar conta diretamente (usada pelo context-manager na opção "3")
export async function criarContaDiretamente(
  userId: string,
  dados: DadosCadastroConta
): Promise<{ mensagem: string }> {
  const supabase = getSupabase();
  return await cadastrarContaNoBanco(supabase, userId, dados);
}

// Função para efetivamente inserir no banco
async function cadastrarContaNoBanco(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  dados: DadosCadastroConta
): Promise<{ mensagem: string }> {
  
  const { descricao, valor, diaVencimento, tipo, parcelaAtual, totalParcelas, recorrencia, paymentMethod, creditCardId } = dados;
  
  if (!descricao || !diaVencimento) {
    return { mensagem: '❌ Dados incompletos. Tente novamente.' };
  }
  
  // Calcular due_date - suporta número (15) ou string ("15/03", "15/03/2026")
  const dueDate = calcularDataVencimentoLocal(diaVencimento);
  
  if (!dueDate) {
    console.error(`[CADASTRAR-CONTA] Data inválida: ${diaVencimento}`);
    return { mensagem: `❓ Não entendi a data "${diaVencimento}". Use formato: "15" ou "dia 10".` };
  }
  
  // Formatar data corretamente
  const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
  
  // Mapear tipo para bill_type do banco usando função inteligente
  const billTypeDb = mapearBillTypeParaBanco(tipo || 'unknown', descricao);
  const isRecurring = recorrencia === 'mensal' || tipo === 'fixed' || tipo === 'subscription' || tipo === 'variable';
  const isInstallment = tipo === 'installment';
  
  console.log(`[CADASTRAR-CONTA] Tipo interno: ${tipo}`);
  console.log(`[CADASTRAR-CONTA] Descrição: ${descricao}`);
  console.log(`[CADASTRAR-CONTA] bill_type mapeado: ${billTypeDb}`);
  console.log(`[CADASTRAR-CONTA] Parcelas recebidas: parcelaAtual=${parcelaAtual}, totalParcelas=${totalParcelas}`);
  console.log(`[CADASTRAR-CONTA] isInstallment: ${isInstallment}`);
  
  // Garantir que campos de parcela são números válidos ou null
  const installmentNumber = (parcelaAtual && !isNaN(parcelaAtual)) ? Number(parcelaAtual) : null;
  const installmentTotal = (totalParcelas && !isNaN(totalParcelas)) ? Number(totalParcelas) : null;
  
  // Se tem parcelas, garantir que ambos os campos estão preenchidos
  const finalInstallmentNumber = installmentNumber || (installmentTotal ? 1 : null);
  const finalInstallmentTotal = installmentTotal || null;
  
  console.log(`[CADASTRAR-CONTA] Parcelas finais: ${finalInstallmentNumber}/${finalInstallmentTotal}`);
  
  // Se é parcelamento, precisa de installment_group_id (constraint do banco)
  const isInstallmentFinal = isInstallment || (finalInstallmentTotal !== null && finalInstallmentTotal > 1);
  const installmentGroupId = isInstallmentFinal ? crypto.randomUUID() : null;
  
  console.log(`[CADASTRAR-CONTA] isInstallmentFinal: ${isInstallmentFinal}, groupId: ${installmentGroupId}`);
  
  // Buscar category_id baseado na descrição para consistência com sistema de categorias
  const categoryId = await buscarCategoryIdPorDescricao(supabase, userId, descricao);
  
  const insertData = {
    user_id: userId,
    description: descricao,
    amount: valor || null,
    due_date: dueDateStr,
    status: 'pending',
    is_recurring: isRecurring && !isInstallmentFinal,
    bill_type: billTypeDb,
    category_id: categoryId,  // Novo: categoria padronizada
    recurrence_config: isRecurring && !isInstallmentFinal ? { type: 'monthly', day: diaVencimento } : null,
    is_installment: isInstallmentFinal,
    installment_number: isInstallmentFinal ? finalInstallmentNumber : null,
    installment_total: isInstallmentFinal ? finalInstallmentTotal : null,
    installment_group_id: installmentGroupId,
    payment_method: paymentMethod || null,
    credit_card_id: creditCardId || null,
  };
  
  // Se é parcelamento, gerar apenas as parcelas RESTANTES (da atual até o total)
  if (isInstallmentFinal && finalInstallmentTotal && finalInstallmentTotal > 1) {
    const parcelas = [];
    const baseDate = new Date(dueDate);
    
    // Parcela inicial = a que o usuário informou (ou 1 se não informou)
    const parcelaInicial = finalInstallmentNumber || 1;
    // Quantidade a criar = total - inicial + 1 (ex: 12 - 3 + 1 = 10 parcelas)
    const quantidadeParcelas = finalInstallmentTotal - parcelaInicial + 1;
    
    console.log(`[CADASTRAR-CONTA] Criando ${quantidadeParcelas} parcelas (${parcelaInicial} até ${finalInstallmentTotal})`);
    
    for (let i = 0; i < quantidadeParcelas; i++) {
      const numeroParcela = parcelaInicial + i;  // 3, 4, 5, ... 12
      const parcelaDate = new Date(baseDate);
      parcelaDate.setMonth(parcelaDate.getMonth() + i);
      
      const parcelaDateStr = `${parcelaDate.getFullYear()}-${String(parcelaDate.getMonth() + 1).padStart(2, '0')}-${String(parcelaDate.getDate()).padStart(2, '0')}`;
      
      parcelas.push({
        ...insertData,
        due_date: parcelaDateStr,
        installment_number: numeroParcela,
      });
    }
    
    console.log(`[CADASTRAR-CONTA] Gerando ${parcelas.length} parcelas com group_id: ${installmentGroupId}`);
    
    const { error } = await supabase
      .from('payable_bills')
      .insert(parcelas);
    
    if (error) {
      console.error('[CADASTRAR-CONTA] Erro ao inserir parcelas:', error);
      return { mensagem: '❌ Erro ao cadastrar parcelamento. Tente novamente.' };
    }
    
    console.log(`[CADASTRAR-CONTA] ${parcelas.length} parcelas criadas com sucesso!`);
  } else {
    // Conta única (não parcelada)
    console.log(`[CADASTRAR-CONTA] INSERT data:`, JSON.stringify(insertData));
    
    const { error } = await supabase
      .from('payable_bills')
      .insert(insertData);
    
    if (error) {
      console.error('[CADASTRAR-CONTA] Erro ao inserir:', error);
      return { mensagem: '❌ Erro ao cadastrar conta. Tente novamente.' };
    }
  }
  
  // Template de sucesso
  const emoji = getEmojiConta(descricao);
  const textoOriginal = dados.textoOriginal || '';
  const isVariavel = tipo === 'variable' || isContaVariavel(tipo || 'unknown', textoOriginal);
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${emoji} *${descricao}*\n`;
  
  // Formatar valor baseado no tipo
  if (!valor) {
    msg += `💰 Valor variável _(informar ao pagar)_\n`;
  } else if (isVariavel) {
    msg += `💰 R$ ${valor.toFixed(2).replace('.', ',')} _(valor médio)_\n`;
  } else {
    msg += `💰 R$ ${valor.toFixed(2).replace('.', ',')}\n`;
  }
  
  msg += `📅 Vence dia ${diaVencimento}\n`;
  
  // Tipo de recorrência
  if (isInstallmentFinal && finalInstallmentTotal && finalInstallmentTotal > 1) {
    const parcelaInicial = finalInstallmentNumber || 1;
    const parcelasRestantes = finalInstallmentTotal - parcelaInicial + 1;
    
    if (parcelaInicial > 1) {
      // Parcela intermediária (ex: "parcela 3 de 12")
      msg += `🔢 Parcela ${parcelaInicial}/${finalInstallmentTotal}\n`;
      msg += `📊 ${parcelasRestantes} parcelas cadastradas (${parcelaInicial} a ${finalInstallmentTotal})\n`;
    } else {
      // Parcelamento novo (começando da 1)
      msg += `🔢 Parcelamento: ${finalInstallmentTotal}x de R$ ${(valor || 0).toFixed(2).replace('.', ',')}\n`;
    }
  } else if (tipo === 'subscription') {
    msg += `🔄 Assinatura mensal\n`;
  } else if (isVariavel) {
    msg += `📊 Valor variável _(informe quando chegar)_\n`;
  } else if (isRecurring) {
    msg += `🔄 Recorrente mensal\n`;
  } else {
    msg += `📌 Pagamento único\n`;
  }
  
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  // Dica para contas variáveis
  if (isVariavel || !valor) {
    msg += `\n\n💡 _Quando chegar a conta: "${descricao.toLowerCase()} veio 185"_`;
  }
  
  return { mensagem: msg };
}

// ============================================
// FASE 3.2: EDITAR CONTA
// ============================================

async function processarEdicaoConta(
  userId: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string }> {
  const supabase = getSupabase();
  
  // Extrair do NLP ou do texto original
  let nomeConta = entidades.conta as string || entidades.nome_conta as string || entidades.descricao as string || '';
  let campo = entidades.campo as string || '';
  let novoValor = entidades.novo_valor || entidades.valor;
  
  // Fallback: extrair do comando original se NLP não extraiu
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  
  if (!nomeConta && comandoOriginal) {
    // Tentar extrair nome da conta do texto
    for (const [tipo, aliases] of Object.entries(CONTA_ALIASES)) {
      if (aliases.some(alias => comandoOriginal.includes(alias))) {
        nomeConta = tipo;
        break;
      }
    }
  }
  
  if (!novoValor && comandoOriginal) {
    // Extrair valor do texto: "para 175", "para R$175", "de 150 para 175"
    const valorMatch = comandoOriginal.match(/para\s*r?\$?\s*(\d+(?:[.,]\d+)?)/i);
    if (valorMatch) {
      novoValor = parseFloat(valorMatch[1].replace(',', '.'));
      campo = 'valor'; // Se tem "para X", é edição de valor
    }
  }
  
  if (!campo && comandoOriginal) {
    // Detectar campo pelo contexto
    if (comandoOriginal.includes('valor') || comandoOriginal.includes('preço') || comandoOriginal.includes('custo')) {
      campo = 'valor';
    } else if (comandoOriginal.includes('dia') || comandoOriginal.includes('vencimento')) {
      campo = 'dia';
    } else if (comandoOriginal.includes('nome') || comandoOriginal.includes('renomear')) {
      campo = 'nome';
    }
  }
  
  console.log('[EDITAR-CONTA] Entidades extraídas:', { nomeConta, campo, novoValor, comandoOriginal });
  
  if (!nomeConta) {
    return { mensagem: `❓ Qual conta você quer editar?\n\n💡 Exemplo:\n_"mudar valor da luz para 180"_` };
  }
  
  // Buscar conta
  const conta = await buscarContaPorNome(userId, nomeConta);
  
  if (!conta) {
    return { mensagem: `❌ Conta "${nomeConta}" não encontrada.\n\n💡 Use _"contas a pagar"_ para ver suas contas.` };
  }
  
  // Determinar campo a editar
  let campoDb = '';
  let valorAntigo: any = '';
  let valorNovo: any = novoValor;
  
  if (campo.includes('valor') || typeof novoValor === 'number') {
    campoDb = 'amount';
    valorAntigo = formatarMoeda(conta.amount);
    valorNovo = typeof novoValor === 'number' ? novoValor : parseFloat(String(novoValor));
  } else if (campo.includes('dia')) {
    campoDb = 'due_date';
    valorAntigo = `dia ${new Date(conta.due_date).getDate()}`;
    const novoDia = parseInt(String(novoValor));
    const novaData = new Date(conta.due_date);
    novaData.setDate(novoDia);
    valorNovo = novaData.toISOString().split('T')[0];
  } else if (campo.includes('nome')) {
    campoDb = 'description';
    valorAntigo = conta.description;
    // Manter descrição original, apenas capitalizar
    const novoNome = String(novoValor);
    valorNovo = novoNome.charAt(0).toUpperCase() + novoNome.slice(1).toLowerCase();
  }
  
  if (!campoDb) {
    return { mensagem: `❓ O que você quer alterar?\n\n💡 Exemplos:\n_"mudar valor da luz para 180"_\n_"alterar dia da internet para 10"_` };
  }
  
  // Atualizar
  const { error } = await supabase
    .from('payable_bills')
    .update({ [campoDb]: valorNovo })
    .eq('id', conta.id);
  
  if (error) {
    console.error('Erro ao editar conta:', error);
    return { mensagem: `❌ Erro ao editar conta. Tente novamente.` };
  }
  
  const emoji = getEmojiConta(conta.description);
  const campoExibicao = campoDb === 'amount' ? 'Valor' : campoDb === 'due_date' ? 'Vencimento' : 'Nome';
  const valorNovoExibicao = campoDb === 'amount' ? formatarMoeda(valorNovo) : campoDb === 'due_date' ? `dia ${new Date(valorNovo).getDate()}` : valorNovo;
  
  return {
    mensagem: `✅ *Conta atualizada!*\n\n${emoji} *${conta.description}*\n📝 ${campoExibicao}: ${valorAntigo} → *${valorNovoExibicao}*`
  };
}

// ============================================
// FASE 3.2: EXCLUIR CONTA
// ============================================

async function processarExclusaoConta(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const nomeConta = entidades.conta as string || entidades.nome_conta as string || '';
  
  if (!nomeConta) {
    return { mensagem: `❓ Qual conta você quer excluir?\n\n💡 Exemplo:\n_"excluir conta de netflix"_` };
  }
  
  // Buscar conta
  const conta = await buscarContaPorNome(userId, nomeConta);
  
  if (!conta) {
    return { mensagem: `❌ Conta "${nomeConta}" não encontrada.\n\n💡 Use _"contas a pagar"_ para ver suas contas.` };
  }
  
  // Pedir confirmação
  return {
    mensagem: templateConfirmarExclusao(conta),
    precisaConfirmacao: true,
    dados: {
      step: 'awaiting_delete_confirmation',
      conta_id: conta.id,
      conta_nome: conta.description,
      phone
    }
  };
}

// ============================================
// FASE 3.2: BUSCAR CONTA POR NOME
// ============================================

export async function buscarContaPorNome(userId: string, nome: string): Promise<ContaPagar | null> {
  const supabase = getSupabase();
  
  const nomeLower = nome.toLowerCase().trim();
  
  console.log(`[DUPLICATA-CHECK] Buscando duplicatas para: "${nome}"`);
  
  // Buscar todas as contas do usuário
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue']);
  
  if (!contas || contas.length === 0) return null;
  
  // Palavras-chave de contas variáveis (luz, água, gás)
  const contasVariaveis = ['luz', 'água', 'agua', 'gás', 'gas', 'energia', 'elétrica', 'eletrica', 'esgoto'];
  
  // Palavras a ignorar na comparação (preposições, artigos, prefixos comuns)
  const palavrasIgnorar = ['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'parcela', 'conta', 'pagamento', 'fatura'];
  
  // Extrair palavra principal (remover palavras comuns)
  const extrairPalavraPrincipal = (texto: string): string => {
    const palavras = texto.toLowerCase().split(/\s+/).filter(p => !palavrasIgnorar.includes(p));
    return palavras.join(' ');
  };
  
  const palavraPrincipalNova = extrairPalavraPrincipal(nomeLower);
  console.log(`[DUPLICATA-CHECK] Palavra principal nova: "${palavraPrincipalNova}"`);
  
  // Extrair palavra-chave de conta variável
  const palavraChaveNova = contasVariaveis.find(c => nomeLower.includes(c));
  
  const contaEncontrada = contas.find((c: any) => {
    const descLower = c.description.toLowerCase().trim();
    const palavraPrincipalExistente = extrairPalavraPrincipal(descLower);
    
    // Match exato → duplicata
    if (descLower === nomeLower) {
      console.log(`[DUPLICATA-CHECK] "${nome}" === "${c.description}" → DUPLICATA (exato)`);
      return true;
    }
    
    // Match de palavra principal → duplicata
    // Ex: "Parcela da geladeira" → "geladeira" === "Geladeira" → "geladeira"
    if (palavraPrincipalNova && palavraPrincipalExistente && 
        (palavraPrincipalNova === palavraPrincipalExistente ||
         palavraPrincipalNova.includes(palavraPrincipalExistente) ||
         palavraPrincipalExistente.includes(palavraPrincipalNova))) {
      console.log(`[DUPLICATA-CHECK] Palavra principal: "${palavraPrincipalNova}" ~ "${palavraPrincipalExistente}" → DUPLICATA`);
      return true;
    }
    
    // Se ambas são contas variáveis do mesmo tipo → duplicata
    if (palavraChaveNova) {
      const palavraChaveExistente = contasVariaveis.find(c => descLower.includes(c));
      if (palavraChaveExistente === palavraChaveNova) {
        console.log(`[DUPLICATA-CHECK] Mesma conta variável: "${palavraChaveNova}" → DUPLICATA`);
        return true;
      }
    }
    
    // Se uma contém a outra → duplicata
    if (descLower.includes(nomeLower) || nomeLower.includes(descLower)) {
      console.log(`[DUPLICATA-CHECK] Contém → DUPLICATA`);
      return true;
    }
    
    return false;
  });
  
  if (contaEncontrada) {
    console.log(`[DUPLICATA-CHECK] Encontrada duplicata: "${contaEncontrada.description}"`);
  } else {
    console.log(`[DUPLICATA-CHECK] Nenhuma duplicata encontrada`);
  }
  
  return contaEncontrada || null;
}

// ============================================
// FASE 3.2: EXECUTAR EXCLUSÃO
// ============================================

export async function executarExclusaoConta(userId: string, contaId: string): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('payable_bills')
    .delete()
    .eq('id', contaId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erro ao excluir conta:', error);
    return { sucesso: false, mensagem: `❌ Erro ao excluir conta. Tente novamente.` };
  }
  
  return { sucesso: true, mensagem: '' };
}

// ============================================
// FASE 3.2: TEMPLATES
// ============================================

function templateContaCadastrada(dados: {
  descricao: string;
  emoji: string;
  valor?: number;
  diaVencimento: number;
  recorrente: boolean;
  variavel: boolean;
  parcelas?: number;
}): string {
  const valorStr = dados.variavel 
    ? '💰 Valor variável _(informar ao pagar)_' 
    : `💰 ${formatarMoeda(dados.valor || 0)}`;
  
  const recorrenciaStr = dados.parcelas 
    ? `🔢 Parcela 1/${dados.parcelas}`
    : dados.recorrente 
      ? '🔄 Recorrente mensal' 
      : '📌 Pagamento único';
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${dados.emoji} *${dados.descricao}*\n`;
  msg += `${valorStr}\n`;
  msg += `📅 Vence dia ${dados.diaVencimento}\n`;
  msg += `${recorrenciaStr}\n`;
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  if (dados.variavel) {
    msg += `\n\n💡 Quando chegar a conta:\n_"${dados.descricao.toLowerCase()} veio 185"_`;
  }
  
  return msg;
}

function templatePerguntarDiaVencimento(descricao: string): string {
  const emoji = getEmojiConta(descricao);
  return `${emoji} *${descricao}*\n\n📅 Qual o *dia do vencimento*? (1-31)`;
}

function templatePerguntarValor(descricao: string, recorrente?: boolean): string {
  const emoji = getEmojiConta(descricao);
  const recorrenteStr = recorrente ? ' (todo mês)' : '';
  return `📝 Entendi! Vou cadastrar sua conta de *${descricao}*${recorrenteStr}.\n\n${emoji} 💰 Qual é o *valor* dessa conta?\n\n_Pode ser um valor aproximado._`;
}

function templateContaDuplicada(conta: ContaPagar, novoValor?: number): string {
  const emoji = getEmojiConta(conta.description);
  const valorAtual = conta.amount ? formatarMoeda(conta.amount) : 'Variável';
  const diaVenc = new Date(conta.due_date).getDate();
  
  let msg = `⚠️ Você já tem uma conta de *${conta.description}* cadastrada!\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `📅 Vence dia ${diaVenc}\n`;
  msg += `💰 ${valorAtual}\n\n`;
  
  if (novoValor) {
    msg += `Deseja atualizar o valor para ${formatarMoeda(novoValor)}?\n\n`;
  } else {
    msg += `O que deseja fazer?\n\n`;
  }
  
  msg += `1️⃣ ${novoValor ? 'Sim, atualizar valor' : 'Editar esta conta'}\n`;
  msg += `2️⃣ Manter como está\n`;
  msg += `3️⃣ Criar nova conta separada`;
  
  return msg;
}

function templateConfirmarExclusao(conta: ContaPagar): string {
  const emoji = getEmojiConta(conta.description);
  const valorStr = conta.amount ? formatarMoeda(conta.amount) : 'Variável';
  const diaVenc = new Date(conta.due_date).getDate();
  
  let msg = `⚠️ *Confirmar exclusão?*\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `💰 ${valorStr}\n`;
  msg += `📅 Dia ${diaVenc}\n\n`;
  msg += `Digite *SIM* para confirmar ou *NÃO* para cancelar.`;
  
  return msg;
}

export function templateContaExcluida(nome: string): string {
  return `✅ Conta de *${nome}* excluída com sucesso!`;
}

// ============================================
// FASE 3.3: REGISTRO DE PAGAMENTOS
// ============================================

/**
 * Verifica se uma conta é variável baseado no histórico de valores
 * Uma conta é variável se teve mais de 10% de variação nos últimos 6 meses
 */
async function verificarContaVariavelPorHistorico(userId: string, descricao: string): Promise<boolean> {
  const supabase = getSupabase();
  
  // Buscar histórico de pagamentos desta conta
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('amount, paid_amount')
    .eq('user_id', userId)
    .ilike('description', `%${descricao}%`)
    .eq('status', 'paid')
    .order('due_date', { ascending: false })
    .limit(6);
  
  if (!contas || contas.length < 2) {
    // Sem histórico suficiente - verificar pelo tipo
    const contasVariaveis = ['luz', 'água', 'agua', 'gás', 'gas', 'energia', 'elétrica', 'eletrica', 'esgoto'];
    return contasVariaveis.some((c: string) => descricao.toLowerCase().includes(c));
  }
  
  // Calcular variação
  const valores = contas.map((c: { paid_amount?: number; amount?: number }) => c.paid_amount || c.amount || 0).filter((v: number) => v > 0);
  if (valores.length < 2) return false;
  
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const variacao = (max - min) / min;
  
  return variacao > 0.1; // Mais de 10% de variação = variável
}

/**
 * Extrai palavras principais removendo artigos e preposições
 */
const PALAVRAS_IGNORADAS = [
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os',
  'um', 'uma', 'uns', 'umas', 'e', 'ou', 'para', 'por',
  'com', 'sem', 'em', 'no', 'na', 'nos', 'nas', 'ao', 'aos',
  'conta', 'pagar', 'pagamento', 'parcela', 'fatura'
];

function extrairPalavrasPrincipais(texto: string): string[] {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(p => p.length > 2 && !PALAVRAS_IGNORADAS.includes(p));
}

/**
 * CAMADA 2: Validação Anti-Alucinação
 * Valida se o nome extraído pelo GPT-4 existe na lista de contas
 * Previne alucinações onde o GPT inventa nomes que não existem
 */
interface ValidacaoResult {
  valido: boolean;
  contaExata?: ContaPagar;
  sugestoes?: ContaPagar[];
}

async function validarContaExtraida(
  userId: string,
  nomeExtraido: string
): Promise<ValidacaoResult> {
  const supabase = getSupabase();
  
  if (!nomeExtraido || nomeExtraido.trim() === '') {
    return { valido: false };
  }
  
  const nomeNormalizado = nomeExtraido.toLowerCase().trim();
  console.log(`[CAMADA-2] Validando: "${nomeExtraido}"`);
  
  // Buscar TODAS as contas pendentes do usuário
  const { data: contasPendentes } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });
  
  if (!contasPendentes || contasPendentes.length === 0) {
    console.log(`[CAMADA-2] ❌ Usuário não tem contas pendentes`);
    return { valido: false };
  }
  
  console.log(`[CAMADA-2] Contas disponíveis: ${contasPendentes.map((c: any) => c.description).join(', ')}`);
  
  // 1. Busca EXATA (case-insensitive)
  const matchExato = contasPendentes.find((c: any) => 
    c.description.toLowerCase().trim() === nomeNormalizado
  );
  
  if (matchExato) {
    console.log(`[CAMADA-2] ✅ Match EXATO: "${matchExato.description}"`);
    return { valido: true, contaExata: matchExato as ContaPagar };
  }
  
  // 2. Busca por CONTÉM (o nome extraído contém ou está contido)
  const matchParcial = contasPendentes.find((c: any) => {
    const contaNorm = c.description.toLowerCase().trim();
    return contaNorm.includes(nomeNormalizado) || nomeNormalizado.includes(contaNorm);
  });
  
  if (matchParcial) {
    console.log(`[CAMADA-2] ✅ Match PARCIAL: "${matchParcial.description}"`);
    return { valido: true, contaExata: matchParcial as ContaPagar };
  }
  
  // 3. Busca por PALAVRAS-CHAVE (fuzzy)
  const palavrasExtraidas = extrairPalavrasPrincipais(nomeNormalizado);
  console.log(`[CAMADA-2] Palavras extraídas: [${palavrasExtraidas.join(', ')}]`);
  
  if (palavrasExtraidas.length === 0) {
    console.log(`[CAMADA-2] ❌ Nenhuma palavra principal extraída`);
    return { valido: false };
  }
  
  const sugestoes = contasPendentes.filter((conta: any) => {
    const palavrasConta = extrairPalavrasPrincipais(conta.description.toLowerCase());
    // Conta deve ter pelo menos 50% das palavras em comum
    const palavrasComuns = palavrasExtraidas.filter(p => 
      palavrasConta.some(pc => pc.includes(p) || p.includes(pc))
    );
    return palavrasComuns.length >= Math.ceil(palavrasExtraidas.length * 0.5);
  });
  
  if (sugestoes.length === 1) {
    // Uma única sugestão forte - provavelmente é essa
    console.log(`[CAMADA-2] ✅ Match ÚNICO por palavras: "${sugestoes[0].description}"`);
    return { valido: true, contaExata: sugestoes[0] as ContaPagar };
  } else if (sugestoes.length > 1) {
    // Múltiplas sugestões - precisa perguntar
    console.log(`[CAMADA-2] ⚠️ Múltiplas sugestões: ${sugestoes.map((s: any) => s.description).join(', ')}`);
    return { valido: false, sugestoes: sugestoes as ContaPagar[] };
  }
  
  // 4. Nenhum match - GPT provavelmente alucionou
  console.log(`[CAMADA-2] ❌ Nenhum match encontrado - possível alucinação do GPT`);
  return { valido: false };
}

/**
 * CAMADA 3: Busca Fuzzy (fallback)
 * Busca conta pendente pelo nome usando match inteligente
 * Retorna também sugestões se houver múltiplos matches
 */
export interface BuscaContaResult {
  conta: ContaPagar | null;
  sugestoes?: ContaPagar[];
  precisaEscolher?: boolean;
}

export async function buscarContaPendenteComSugestoes(
  userId: string, 
  nomeConta: string
): Promise<BuscaContaResult> {
  console.log(`[BUSCAR-PENDENTE] Iniciando busca para: "${nomeConta}"`);
  
  // ============================================
  // CAMADA 2: Validação Anti-Alucinação
  // ============================================
  const validacao = await validarContaExtraida(userId, nomeConta);
  
  if (validacao.valido && validacao.contaExata) {
    return { conta: validacao.contaExata };
  }
  
  if (validacao.sugestoes && validacao.sugestoes.length > 0) {
    console.log(`[BUSCAR-PENDENTE] Múltiplas sugestões encontradas`);
    return { conta: null, sugestoes: validacao.sugestoes, precisaEscolher: true };
  }
  
  // ============================================
  // CAMADA 3: Busca Fuzzy (fallback anti-alucinação)
  // ============================================
  console.log(`[CAMADA-3] Iniciando busca fuzzy para: "${nomeConta}"`);
  
  const palavrasBusca = extrairPalavrasPrincipais(nomeConta);
  console.log(`[CAMADA-3] Palavras principais: [${palavrasBusca.join(', ')}]`);
  
  const supabase = getSupabase();
  
  // Buscar todas as contas pendentes do usuário
  const { data: todasContas } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });
  
  if (!todasContas || todasContas.length === 0) {
    console.log(`[CAMADA-3] ❌ Usuário não tem contas pendentes`);
    return { conta: null };
  }
  
  console.log(`[CAMADA-3] Contas disponíveis: ${todasContas.map((c: any) => c.description).join(', ')}`);
  
  // Estratégia 1: Match por palavras principais (TODAS as palavras)
  if (palavrasBusca.length > 0) {
    const contaMatchTodas = todasContas.find((c: any) => {
      const descLower = c.description.toLowerCase();
      return palavrasBusca.every(p => descLower.includes(p));
    });
    
    if (contaMatchTodas) {
      console.log(`[CAMADA-3] ✅ Match por TODAS palavras: "${contaMatchTodas.description}"`);
      return { conta: contaMatchTodas as ContaPagar };
    }
  }
  
  // Estratégia 2: Match por palavra principal mais relevante (maior peso)
  if (palavrasBusca.length > 0) {
    // Ordenar por quantidade de matches
    const contasComScore = todasContas.map((c: any) => {
      const descLower = c.description.toLowerCase();
      const matchCount = palavrasBusca.filter((p: string) => descLower.includes(p)).length;
      return { conta: c, score: matchCount };
    }).filter((item: { conta: any; score: number }) => item.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    
    if (contasComScore.length > 0) {
      const melhorMatch = contasComScore[0];
      console.log(`[CAMADA-3] ✅ Melhor match (${melhorMatch.score}/${palavrasBusca.length} palavras): "${melhorMatch.conta.description}"`);
      return { conta: melhorMatch.conta as ContaPagar };
    }
  }
  
  // Estratégia 3: Busca por substring simples (última tentativa)
  const nomeContaLower = nomeConta.toLowerCase();
  const contaSubstring = todasContas.find((c: any) => {
    const descLower = c.description.toLowerCase();
    return descLower.includes(nomeContaLower) || nomeContaLower.includes(descLower);
  });
  
  if (contaSubstring) {
    console.log(`[CAMADA-3] ✅ Match por substring: "${contaSubstring.description}"`);
    return { conta: contaSubstring as ContaPagar };
  }
  
  // Estratégia 4: Busca por aliases conhecidos
  const aliases: Record<string, string[]> = {
    'luz': ['energia', 'elétrica', 'eletrica', 'light', 'enel', 'cpfl', 'cemig', 'celpe', 'energisa'],
    'água': ['agua', 'saneamento', 'sabesp', 'cedae', 'copasa', 'sanepar'],
    'gás': ['gas', 'comgas', 'naturgy'],
    'internet': ['wifi', 'fibra', 'net', 'claro', 'vivo', 'oi', 'tim'],
    'telefone': ['celular', 'móvel', 'movel'],
    'aluguel': ['moradia', 'apartamento', 'casa'],
    'condomínio': ['condominio', 'condo'],
    'empréstimo': ['emprestimo', 'consignado'],
    'financiamento': ['financ', 'carro', 'veículo', 'veiculo', 'moto', 'casa', 'imóvel', 'imovel'],
  };
  
  for (const [principal, variacoes] of Object.entries(aliases)) {
    if (nomeContaLower.includes(principal) || variacoes.some(v => nomeContaLower.includes(v))) {
      const contaAlias = todasContas.find((c: any) => {
        const descLower = c.description.toLowerCase();
        return descLower.includes(principal) || variacoes.some(v => descLower.includes(v));
      });
      
      if (contaAlias) {
        console.log(`[CAMADA-3] ✅ Match por alias "${principal}": "${contaAlias.description}"`);
        return { conta: contaAlias as ContaPagar };
      }
    }
  }
  
  console.log(`[CAMADA-3] ❌ Nenhuma conta encontrada para: "${nomeConta}"`);
  return { conta: null };
}

/**
 * Função de compatibilidade - mantém a interface antiga
 */
export async function buscarContaPendente(
  userId: string, 
  nomeConta: string
): Promise<ContaPagar | null> {
  const resultado = await buscarContaPendenteComSugestoes(userId, nomeConta);
  return resultado.conta;
}

/**
 * Calcula comparativo com mês anterior
 */
interface Comparativo {
  valorAtual: number;
  valorAnterior: number | null;
  variacao: number;
  media6Meses: number;
  media12Meses: number;
  tendencia: 'subindo' | 'estavel' | 'descendo';
}

export async function calcularComparativo(userId: string, descricao: string, valorAtual: number): Promise<Comparativo> {
  const supabase = getSupabase();
  
  // Buscar histórico de pagamentos desta conta (últimos 12 meses)
  const { data: historico } = await supabase
    .from('payable_bills')
    .select('amount, paid_amount')
    .eq('user_id', userId)
    .ilike('description', `%${descricao}%`)
    .eq('status', 'paid')
    .order('due_date', { ascending: false })
    .limit(12);
  
  if (!historico || historico.length === 0) {
    return { 
      valorAtual,
      variacao: 0, 
      media6Meses: valorAtual, 
      media12Meses: valorAtual,
      valorAnterior: null,
      tendencia: 'estavel'
    };
  }
  
  const valores = historico.map((h: { paid_amount?: number; amount?: number }) => h.paid_amount || h.amount || 0);
  const valorAnterior = valores[0];
  
  // Variação percentual
  const variacao = valorAnterior ? ((valorAtual - valorAnterior) / valorAnterior) * 100 : 0;
  
  // Médias
  const ultimos6 = valores.slice(0, 6);
  const media6Meses = ultimos6.length > 0 
    ? ultimos6.reduce((a: number, b: number) => a + b, 0) / ultimos6.length 
    : valorAtual;
  
  const media12Meses = valores.length > 0 
    ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length 
    : valorAtual;
  
  // Tendência (comparar média dos últimos 3 com média dos 3 anteriores)
  let tendencia: 'subindo' | 'estavel' | 'descendo' = 'estavel';
  if (valores.length >= 6) {
    const media3Recentes = valores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3;
    const media3Anteriores = valores.slice(3, 6).reduce((a: number, b: number) => a + b, 0) / 3;
    
    const diferencaPercentual = ((media3Recentes - media3Anteriores) / media3Anteriores) * 100;
    
    if (diferencaPercentual > 5) tendencia = 'subindo';
    else if (diferencaPercentual < -5) tendencia = 'descendo';
  }
  
  return { valorAtual, variacao, media6Meses, media12Meses, valorAnterior, tendencia };
}

/**
 * Marca uma conta como paga
 */
export async function marcarComoPago(
  userId: string,
  billId: string,
  valorPago?: number,
  metodoPagamento?: string
): Promise<{ sucesso: boolean; mensagem: string; proximaOcorrencia?: ContaPagar }> {
  const supabase = getSupabase();
  const agora = new Date().toISOString();
  
  // Buscar a conta
  const { data: conta, error: erroBusca } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', userId)
    .single();
  
  if (erroBusca || !conta) {
    return { sucesso: false, mensagem: '❌ Conta não encontrada.' };
  }
  
  const valorFinal = valorPago || conta.amount;
  
  // ✅ FIX: Constraint valid_paid_status exige paid_amount >= amount
  // Quando usuário informa valor diferente, atualizar o amount da conta
  // Isso é comum para contas variáveis (luz, água, gás)
  const { error: erroUpdate } = await supabase
    .from('payable_bills')
    .update({
      status: 'paid',
      paid_at: agora,
      paid_amount: valorFinal,
      amount: valorFinal, // Atualiza o amount para o valor pago (satisfaz constraint)
      payment_method: metodoPagamento || conta.payment_method || 'other',
      updated_at: agora
    })
    .eq('id', billId);
  
  if (erroUpdate) {
    console.error('[MARCAR-PAGO] Erro ao atualizar:', erroUpdate);
    return { sucesso: false, mensagem: '❌ Erro ao marcar como pago.' };
  }
  
  // Registrar no histórico de pagamentos
  await supabase.from('bill_payment_history').insert({
    bill_id: billId,
    user_id: userId,
    payment_date: agora,
    amount_paid: valorFinal,
    payment_method: metodoPagamento || conta.payment_method
  });
  
  // Se é recorrente, criar próxima ocorrência
  let proximaOcorrencia: ContaPagar | undefined;
  if (conta.is_recurring && conta.recurrence_config) {
    proximaOcorrencia = await criarProximaOcorrencia(userId, conta);
  }
  
  // Calcular comparativo se for conta variável
  const ehVariavel = await verificarContaVariavelPorHistorico(userId, conta.description);
  let comparativoMsg = '';
  
  if (ehVariavel && valorFinal) {
    const comp = await calcularComparativo(userId, conta.description, valorFinal);
    if (comp.valorAnterior) {
      const seta = comp.variacao > 0 ? '📈' : comp.variacao < 0 ? '📉' : '➡️';
      const variacaoStr = comp.variacao > 0 ? `+${comp.variacao.toFixed(1)}%` : `${comp.variacao.toFixed(1)}%`;
      comparativoMsg = `\n\n${seta} *${variacaoStr}* vs mês anterior\n📊 Média (6 meses): ${formatarMoeda(comp.media6Meses)}`;
    }
  }
  
  const emoji = getEmojiConta(conta.description);
  let msg = `✅ *Pagamento registrado!*\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `💰 ${formatarMoeda(valorFinal)}\n`;
  msg += `📅 Vencimento: ${formatarData(conta.due_date)}`;
  msg += comparativoMsg;
  
  if (proximaOcorrencia) {
    msg += `\n\n🔄 Próxima: ${formatarData(proximaOcorrencia.due_date)}`;
  }
  
  return { sucesso: true, mensagem: msg, proximaOcorrencia };
}

/**
 * Cria próxima ocorrência de conta recorrente
 */
async function criarProximaOcorrencia(userId: string, contaAtual: ContaPagar): Promise<ContaPagar | undefined> {
  const supabase = getSupabase();
  
  const config = contaAtual.recurrence_config as { frequency?: string; interval?: number } | null;
  if (!config) return undefined;
  
  const frequency = config.frequency || 'monthly';
  const interval = config.interval || 1;
  
  // Calcular próxima data
  const dataAtual = new Date(contaAtual.due_date);
  let proximaData: Date;
  
  switch (frequency) {
    case 'weekly':
      proximaData = new Date(dataAtual.setDate(dataAtual.getDate() + (7 * interval)));
      break;
    case 'monthly':
      proximaData = new Date(dataAtual.setMonth(dataAtual.getMonth() + interval));
      break;
    case 'yearly':
      proximaData = new Date(dataAtual.setFullYear(dataAtual.getFullYear() + interval));
      break;
    default:
      proximaData = new Date(dataAtual.setMonth(dataAtual.getMonth() + 1));
  }
  
  const proximaDataStr = proximaData.toISOString().split('T')[0];
  
  // Verificar se já existe
  const { data: existente } = await supabase
    .from('payable_bills')
    .select('id')
    .eq('user_id', userId)
    .ilike('description', contaAtual.description)
    .eq('due_date', proximaDataStr)
    .limit(1);
  
  if (existente && existente.length > 0) {
    return undefined; // Já existe
  }
  
  // Criar nova ocorrência
  const novaConta = {
    user_id: userId,
    description: contaAtual.description,
    amount: contaAtual.amount,
    due_date: proximaDataStr,
    bill_type: contaAtual.bill_type,
    provider_name: contaAtual.provider_name,
    category_id: contaAtual.category_id,
    status: 'pending',
    is_recurring: true,
    recurrence_config: contaAtual.recurrence_config,
    parent_recurring_id: contaAtual.parent_recurring_id || contaAtual.id,
    reminder_enabled: contaAtual.reminder_enabled,
    reminder_days_before: contaAtual.reminder_days_before,
    payment_method: contaAtual.payment_method,
    credit_card_id: contaAtual.credit_card_id
  };
  
  const { data: nova, error } = await supabase
    .from('payable_bills')
    .insert(novaConta)
    .select()
    .single();
  
  if (error) {
    console.error('[CRIAR-PROXIMA] Erro:', error);
    return undefined;
  }
  
  return nova as ContaPagar;
}

/**
 * Consulta histórico de uma conta
 */
export async function consultarHistorico(
  userId: string,
  nomeConta: string
): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar últimos 12 meses
  const { data: historico } = await supabase
    .from('payable_bills')
    .select('description, amount, paid_amount, due_date, status, paid_at')
    .eq('user_id', userId)
    .ilike('description', `%${nomeConta}%`)
    .order('due_date', { ascending: false })
    .limit(12);
  
  if (!historico || historico.length === 0) {
    return `❓ Não encontrei histórico de *${nomeConta}*.\n\n💡 Verifique o nome ou cadastre a conta primeiro.`;
  }
  
  const emoji = getEmojiConta(nomeConta);
  const valores = historico.filter((h: { paid_amount?: number; amount?: number }) => h.paid_amount || h.amount).map((h: { paid_amount?: number; amount?: number }) => h.paid_amount || h.amount || 0);
  const media = valores.length > 0 ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length : 0;
  const min = valores.length > 0 ? Math.min(...valores) : 0;
  const max = valores.length > 0 ? Math.max(...valores) : 0;
  
  let msg = `📊 *Histórico: ${nomeConta}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Estatísticas
  msg += `📈 *Estatísticas (${valores.length} meses)*\n`;
  msg += `• Média: ${formatarMoeda(media)}\n`;
  msg += `• Menor: ${formatarMoeda(min)}\n`;
  msg += `• Maior: ${formatarMoeda(max)}\n\n`;
  
  // Últimos pagamentos
  msg += `📅 *Últimos pagamentos*\n`;
  historico.slice(0, 6).forEach((h: { due_date: string; paid_amount?: number; amount?: number; status: string }) => {
    const data = new Date(h.due_date);
    const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const valor = h.paid_amount || h.amount;
    const status = h.status === 'paid' ? '✅' : h.status === 'overdue' ? '⚠️' : '⏳';
    msg += `${status} ${mesAno}: ${valor ? formatarMoeda(valor) : 'Variável'}\n`;
  });
  
  return msg;
}

/**
 * Atualiza valor de conta pendente (para contas variáveis)
 */
export async function atualizarValorConta(
  userId: string,
  billId: string,
  novoValor: number
): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('payable_bills')
    .update({ 
      amount: novoValor,
      updated_at: new Date().toISOString()
    })
    .eq('id', billId)
    .eq('user_id', userId);
  
  if (error) {
    return { sucesso: false, mensagem: '❌ Erro ao atualizar valor.' };
  }
  
  return { sucesso: true, mensagem: `✅ Valor atualizado para ${formatarMoeda(novoValor)}` };
}

/**
 * Processa intenção MARCAR_CONTA_PAGA
 */
export async function processarMarcarPago(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const valorInformado = entidades.valor as number | undefined;
  let nomeConta = entidades.conta as string || entidades.descricao as string || '';
  let contaBancariaInformada = entidades.conta_bancaria as string || '';
  
  console.log(`[MARCAR-PAGO] Comando: "${comandoOriginal}", Conta: "${nomeConta}", Valor: ${valorInformado}, ContaBancaria: "${contaBancariaInformada}"`);
  
  // ✅ CORREÇÃO: Detectar se é fatura de cartão e redirecionar
  const ehFaturaCartao = /\b(fatura|cartao|cartão)\b/i.test(comandoOriginal) || 
                         /\b(fatura|cartao|cartão)\b/i.test(nomeConta);
  if (ehFaturaCartao) {
    console.log('[MARCAR-PAGO] 🔄 Detectada fatura de cartão, redirecionando para processarPagarFaturaCartao');
    return await processarPagarFaturaCartao(userId, phone, entidades);
  }
  
  // ⚠️ CORREÇÃO BUG CRÍTICO: Detectar se NLP confundiu banco com conta
  const BANCOS_CONHECIDOS = ['itau', 'itaú', 'bradesco', 'santander', 'nubank', 'inter', 'c6', 'caixa', 'bb', 'next', 'neon', 'original', 'picpay', 'mercado pago', 'pagbank'];
  const nomeContaLower = nomeConta.toLowerCase();
  
  if (BANCOS_CONHECIDOS.some(b => nomeContaLower.includes(b))) {
    console.log('[MARCAR-PAGO] ⚠️ Detectado BANCO como conta! Corrigindo...');
    
    // Extrair conta real do texto original
    const matchContaReal = comandoOriginal.match(/pagu?e?i\s+(?:a|o|as|os)?\s*(\w+)/i);
    if (matchContaReal && !BANCOS_CONHECIDOS.some(b => matchContaReal[1].toLowerCase().includes(b))) {
      console.log(`[MARCAR-PAGO] Conta real extraída: "${matchContaReal[1]}"`);
      // O banco que estava em "conta" vai para "conta_bancaria"
      if (!contaBancariaInformada) {
        contaBancariaInformada = nomeConta;
      }
      nomeConta = matchContaReal[1];
    }
  }
  
  // Extrair banco do texto se não veio nas entidades
  if (!contaBancariaInformada && comandoOriginal) {
    const matchBanco = comandoOriginal.match(/(?:no|na|pelo|pela|via|do|da)\s+(itau|itaú|bradesco|santander|nubank|inter|c6|caixa|bb|next|neon|original|picpay|mercado pago|pagbank)/i);
    if (matchBanco) {
      contaBancariaInformada = matchBanco[1].toLowerCase().replace('itaú', 'itau');
      console.log(`[MARCAR-PAGO] Banco extraído do texto: "${contaBancariaInformada}"`);
    }
  }
  
  // Extrair nome da conta do texto se não veio nas entidades
  let nomeContaFinal = nomeConta;
  if (!nomeContaFinal && comandoOriginal) {
    // Padrões: "paguei a luz", "paguei 185 de luz", "quitei o aluguel"
    const match = comandoOriginal.match(/(?:paguei|quitei|pago|apaguei)\s+(?:a|o|de|da|do)?\s*(?:\d+(?:[.,]\d+)?\s*(?:de|da|do)?\s*)?(.+?)(?:\s+(?:no|na|pelo|pela|com|do|da)\s+(?:nubank|itau|itaú|bradesco|santander|inter|c6|caixa|bb|banco|conta).*)?$/i);
    if (match) {
      nomeContaFinal = match[1].trim();
    }
  }
  
  if (!nomeContaFinal) {
    return {
      mensagem: `❓ Qual conta você pagou?\n\n💡 Exemplos:\n• _"paguei a luz"_\n• _"paguei 185 de luz"_\n• _"quitei o aluguel"_`,
      precisaConfirmacao: true,
      dados: { step: 'awaiting_bill_name_for_payment', phone }
    };
  }
  
  // Verificar se já foi paga este mês
  const jaPaga = await verificarContaJaPaga(userId, nomeContaFinal);
  if (jaPaga) {
    return {
      mensagem: `✅ *${nomeContaFinal}* já está paga este mês!\n\n💡 Use _"histórico da ${nomeContaFinal}"_ para ver detalhes.`,
    };
  }
  
  // ============================================
  // ARQUITETURA HÍBRIDA: Buscar conta com sugestões
  // ============================================
  const resultado = await buscarContaPendenteComSugestoes(userId, nomeContaFinal);
  
  // Caso 1: Múltiplas sugestões - perguntar ao usuário
  if (resultado.precisaEscolher && resultado.sugestoes && resultado.sugestoes.length > 0) {
    const opcoes = resultado.sugestoes
      .slice(0, 5) // Máximo 5 opções
      .map((s, i) => `${i + 1}️⃣ ${s.description} - ${formatarMoeda(s.amount || 0)}`)
      .join('\n');
    
    return {
      mensagem: `🤔 Encontrei algumas contas parecidas:\n\n${opcoes}\n\n*Qual delas você pagou?* _(digite o número)_`,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_selection',
        sugestoes: resultado.sugestoes.slice(0, 5).map(s => ({ id: s.id, description: s.description, amount: s.amount })),
        valor: valorInformado,
        contaBancaria: contaBancariaInformada,
        textoOriginal: comandoOriginal,
        phone
      }
    };
  }
  
  // Caso 2: Nenhuma conta encontrada - listar pendentes
  if (!resultado.conta) {
    // Buscar contas pendentes para mostrar ao usuário
    const { data: contasPendentes } = await supabase
      .from('payable_bills')
      .select('description, amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5);
    
    if (contasPendentes && contasPendentes.length > 0) {
      const listaPendentes = contasPendentes
        .map((c: any, i: number) => `${i + 1}️⃣ ${c.description} - ${formatarMoeda(c.amount || 0)}`)
        .join('\n');
      
      return {
        mensagem: `❓ Não encontrei conta de *${nomeContaFinal}* pendente.\n\n📋 *Suas contas pendentes:*\n${listaPendentes}\n\n💡 Diga o nome exato ou o número da conta.`,
      };
    }
    
    return {
      mensagem: `❓ Não encontrei conta de *${nomeContaFinal}* pendente.\n\n💡 Verifique:\n• _"contas a pagar"_ para ver suas contas\n• O nome está correto?`,
    };
  }
  
  // Caso 3: Conta encontrada com sucesso
  const conta = resultado.conta;
  
  // Verificar se é conta variável e precisa do valor
  const ehVariavel = await verificarContaVariavelPorHistorico(userId, conta.description);
  
  if (ehVariavel && !valorInformado && !conta.amount) {
    return {
      mensagem: `💰 Quanto veio a conta de *${conta.description}*?\n\n_Digite o valor, ex: "185" ou "R$ 185,00"_`,
      precisaConfirmacao: true,
      dados: { 
        step: 'awaiting_payment_value', 
        billId: conta.id,
        descricao: conta.description,
        phone 
      }
    };
  }
  
  // Extrair método de pagamento do texto
  const metodoPagamento = extrairMetodoPagamento(comandoOriginal);
  
  // Extrair multa/juros se houver
  const valorBase = valorInformado || conta.amount || 0;
  const multaJuros = extrairMultaJuros(comandoOriginal, valorBase);
  const valorFinal = multaJuros ? multaJuros.total : valorBase;
  
  // ============================================
  // VERIFICAR CONTA BANCÁRIA
  // ============================================
  
  // Tentar extrair conta bancária do comando
  let contaBancariaId: string | null = null;
  let contaBancariaNome: string | null = null;
  
  // Verificar se foi informada nas entidades
  if (contaBancariaInformada) {
    const contaEncontrada = await buscarContaBancariaPorNome(userId, contaBancariaInformada);
    if (contaEncontrada) {
      contaBancariaId = contaEncontrada.id;
      contaBancariaNome = contaEncontrada.name;
    }
  }
  
  // Se não veio nas entidades, tentar extrair do texto
  if (!contaBancariaId && comandoOriginal) {
    const bancos = ['nubank', 'itau', 'itaú', 'bradesco', 'santander', 'inter', 'c6', 'caixa', 'bb', 'banco do brasil', 'picpay', 'mercado pago'];
    for (const banco of bancos) {
      if (comandoOriginal.includes(banco)) {
        const contaEncontrada = await buscarContaBancariaPorNome(userId, banco);
        if (contaEncontrada) {
          contaBancariaId = contaEncontrada.id;
          contaBancariaNome = contaEncontrada.name;
          break;
        }
      }
    }
  }
  
  // Se não encontrou conta bancária, perguntar ao usuário
  if (!contaBancariaId) {
    // Listar contas do usuário
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name, current_balance')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');
    
    if (!contas || contas.length === 0) {
      return {
        mensagem: `❌ Você não tem contas bancárias cadastradas.\n\n💡 Cadastre uma conta primeiro para registrar pagamentos.`,
      };
    }
    
    let msg = `💳 *De qual conta saiu o pagamento?*\n\n`;
    msg += `${getEmojiConta(conta.description)} *${conta.description}*\n`;
    msg += `💰 ${formatarMoeda(valorFinal)}\n\n`;
    
    contas.forEach((c: { id: string; name: string; current_balance: number }, i: number) => {
      const emoji = getEmojiBanco(c.name);
      msg += `${i + 1}️⃣ ${emoji} ${c.name} (${formatarMoeda(c.current_balance)})\n`;
    });
    
    msg += `\n_Digite o número ou o nome da conta_`;
    
    return {
      mensagem: msg,
      precisaConfirmacao: true,
      dados: { 
        step: 'awaiting_payment_account', 
        billId: conta.id,
        descricao: conta.description,
        valorFinal,
        metodoPagamento,
        multaJuros,
        contasDisponiveis: contas.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        phone 
      }
    };
  }
  
  // Marcar como pago E criar transação
  const resultadoPagamento = await marcarComoPagoComTransacao(
    userId, 
    conta.id, 
    valorFinal, 
    contaBancariaId,
    contaBancariaNome || 'Conta',
    metodoPagamento || undefined
  );
  
  // Adicionar info de multa/juros se houver
  let mensagemFinal = resultadoPagamento.mensagem;
  if (multaJuros && multaJuros.multa > 0) {
    mensagemFinal = mensagemFinal.replace(
      `💰 ${formatarMoeda(valorFinal)}`,
      `💰 Valor original: ${formatarMoeda(multaJuros.valorOriginal)}\n💸 Multa/Juros: ${formatarMoeda(multaJuros.multa)}\n💰 Total pago: ${formatarMoeda(multaJuros.total)}`
    );
  }
  
  return { mensagem: mensagemFinal };
}

/**
 * Busca conta bancária por nome (fuzzy match)
 */
async function buscarContaBancariaPorNome(
  userId: string, 
  nomeBanco: string
): Promise<{ id: string; name: string; balance: number } | null> {
  const supabase = getSupabase();
  const nomeLower = nomeBanco.toLowerCase().trim();
  
  // Aliases de bancos
  const aliases: Record<string, string[]> = {
    'nubank': ['nu', 'roxinho', 'roxo', 'nuno'],
    'itau': ['itaú', 'ita', 'itauzinho', 'laranjinha'],
    'bradesco': ['brades', 'vermelhinho'],
    'santander': ['santan', 'vermelho'],
    'inter': ['laranjão', 'banco inter'],
    'c6': ['c6 bank', 'pretinho', 'carbono'],
    'caixa': ['cef', 'caixa economica'],
    'banco do brasil': ['bb', 'amarelinho'],
    'picpay': ['pic', 'verdinho'],
    'mercado pago': ['mp', 'mercadopago'],
  };
  
  // Buscar todas as contas do usuário
  const { data: contas } = await supabase
    .from('accounts')
    .select('id, name, current_balance')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!contas || contas.length === 0) return null;
  
  // Tentar match exato primeiro
  for (const conta of contas) {
    if (conta.name.toLowerCase() === nomeLower) {
      return conta;
    }
  }
  
  // Tentar match parcial
  for (const conta of contas) {
    if (conta.name.toLowerCase().includes(nomeLower) || nomeLower.includes(conta.name.toLowerCase())) {
      return conta;
    }
  }
  
  // Tentar por aliases
  for (const [banco, aliasesList] of Object.entries(aliases)) {
    if (nomeLower.includes(banco) || aliasesList.some(a => nomeLower.includes(a))) {
      for (const conta of contas) {
        const contaNome = conta.name.toLowerCase();
        if (contaNome.includes(banco) || aliasesList.some(a => contaNome.includes(a))) {
          return conta;
        }
      }
    }
  }
  
  return null;
}

/**
 * Busca estatísticas do mês para exibir no output de pagamento
 */
async function buscarEstatisticasMes(
  userId: string,
  contaBancariaId: string
): Promise<{ saldoConta: number; contasPagas: number; totalContas: number; totalPagoMes: number }> {
  const supabase = getSupabase();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0];
  
  // Buscar saldo atualizado da conta
  const { data: conta } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', contaBancariaId)
    .single();
  
  const saldoConta = conta?.current_balance || 0;
  
  // Buscar contas do mês
  const { data: contasMes } = await supabase
    .from('payable_bills')
    .select('status, paid_amount, amount')
    .eq('user_id', userId)
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes);
  
  const totalContas = contasMes?.length || 0;
  const contasPagas = contasMes?.filter((c: { status: string }) => c.status === 'paid').length || 0;
  const totalPagoMes = contasMes
    ?.filter((c: { status: string }) => c.status === 'paid')
    .reduce((sum: number, c: { paid_amount: number; amount: number }) => sum + (c.paid_amount || c.amount || 0), 0) || 0;
  
  return { saldoConta, contasPagas, totalContas, totalPagoMes };
}

/**
 * Marca conta como paga E cria transação de despesa
 */
async function marcarComoPagoComTransacao(
  userId: string,
  billId: string,
  valorPago: number,
  contaBancariaId: string,
  contaBancariaNome: string,
  metodoPagamento?: string
): Promise<{ sucesso: boolean; mensagem: string; proximaOcorrencia?: ContaPagar }> {
  const supabase = getSupabase();
  const agora = new Date().toISOString();
  
  // Buscar a conta a pagar
  const { data: conta, error: erroBusca } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', userId)
    .single();
  
  if (erroBusca || !conta) {
    return { sucesso: false, mensagem: '❌ Conta não encontrada.' };
  }
  
  const valorFinal = valorPago || conta.amount;
  
  // 1. Atualizar status para pago
  // ✅ FIX: payment_method deve ter valor default 'other' para não violar constraint valid_paid_status
  const { error: erroUpdate } = await supabase
    .from('payable_bills')
    .update({
      status: 'paid',
      paid_at: agora,
      paid_amount: valorFinal,
      payment_method: metodoPagamento || conta.payment_method || 'other',
      payment_account_id: contaBancariaId,
      updated_at: agora
    })
    .eq('id', billId);
  
  if (erroUpdate) {
    console.error('[MARCAR-PAGO] Erro ao atualizar:', erroUpdate);
    return { sucesso: false, mensagem: '❌ Erro ao marcar como pago.' };
  }
  
  // 2. Registrar no histórico de pagamentos
  await supabase.from('bill_payment_history').insert({
    bill_id: billId,
    user_id: userId,
    payment_date: agora,
    amount_paid: valorFinal,
    payment_method: metodoPagamento || conta.payment_method,
    account_from_id: contaBancariaId
  });
  
  // 3. Criar transação de despesa
  const { error: erroTransacao } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: contaBancariaId,
      type: 'expense',
      amount: valorFinal,
      description: `Pagamento: ${conta.description}`,
      category_id: conta.category_id,
      transaction_date: agora.split('T')[0],
      is_recurring: false,
      is_paid: true,
      source: 'whatsapp',
      notes: `Conta a pagar: ${billId}`
    });
  
  if (erroTransacao) {
    console.error('[MARCAR-PAGO] Erro ao criar transação:', erroTransacao);
    // Não falha o pagamento, apenas loga
  }
  
  // 4. Atualizar saldo da conta bancária
  const { error: erroSaldo } = await supabase.rpc('update_account_balance', {
    p_account_id: contaBancariaId,
    p_amount: -valorFinal
  });
  
  if (erroSaldo) {
    console.error('[MARCAR-PAGO] Erro ao atualizar saldo:', erroSaldo);
    // Tenta atualização direta
    await supabase
      .from('accounts')
      .update({ balance: supabase.rpc('decrement_balance', { amount: valorFinal }) })
      .eq('id', contaBancariaId);
  }
  
  // 5. Se é recorrente, criar próxima ocorrência
  let proximaOcorrencia: ContaPagar | undefined;
  if (conta.is_recurring && conta.recurrence_config) {
    proximaOcorrencia = await criarProximaOcorrencia(userId, conta);
  }
  
  // 6. Calcular comparativo se for conta variável
  const ehVariavel = await verificarContaVariavelPorHistorico(userId, conta.description);
  let comparativoMsg = '';
  
  if (ehVariavel && valorFinal) {
    const comp = await calcularComparativo(userId, conta.description, valorFinal);
    if (comp.valorAnterior) {
      const seta = comp.variacao > 0 ? '📈' : comp.variacao < 0 ? '📉' : '➡️';
      const variacaoStr = comp.variacao > 0 ? `+${comp.variacao.toFixed(1)}%` : `${comp.variacao.toFixed(1)}%`;
      comparativoMsg = ` (${seta} ${variacaoStr} vs mês anterior)\n📊 Média (6 meses): ${formatarMoeda(comp.media6Meses)}`;
    }
  }
  
  // 7. Buscar estatísticas do mês e saldo atualizado
  const stats = await buscarEstatisticasMes(userId, contaBancariaId);
  
  const emoji = getEmojiConta(conta.description);
  const emojiBanco = getEmojiBanco(contaBancariaNome);
  let msg = `✅ *Pagamento registrado!*\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `💰 ${formatarMoeda(valorFinal)}`;
  
  // Adicionar info de parcelas para empréstimos/financiamentos
  if (conta.is_installment && conta.installment_number && conta.installment_total) {
    const parcelaAtual = conta.installment_number;
    const totalParcelas = conta.installment_total;
    const parcelasPagas = parcelaAtual; // A parcela atual foi paga
    const parcelasRestantes = totalParcelas - parcelaAtual;
    const valorRestante = parcelasRestantes * valorFinal;
    
    msg += `\n📋 Parcela ${parcelaAtual}/${totalParcelas}`;
    if (parcelasRestantes > 0) {
      msg += `\n💵 Restante: ${formatarMoeda(valorRestante)} (${parcelasRestantes} parcelas)`;
    } else {
      msg += `\n🎉 *Última parcela! Quitado!*`;
    }
  }
  
  // Adicionar comparativo inline para contas variáveis
  if (comparativoMsg) {
    msg += comparativoMsg;
  }
  msg += `\n`;
  
  msg += `${emojiBanco} Conta: ${contaBancariaNome}\n`;
  msg += `📅 Vencimento: ${formatarData(conta.due_date)}`;
  
  if (metodoPagamento) {
    const metodoNomes: Record<string, string> = {
      'pix': 'PIX', 'debit': 'Débito', 'credit': 'Crédito', 'boleto': 'Boleto',
      'transfer': 'Transferência', 'cash': 'Dinheiro', 'auto_debit': 'Débito Automático'
    };
    msg += `\n💳 Via: ${metodoNomes[metodoPagamento] || metodoPagamento}`;
  }
  
  // Adicionar seção de estatísticas
  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
  
  msg += `\n\n━━━━━━━━━━━━━━━━━━━━`;
  msg += `\n💳 Saldo ${contaBancariaNome}: ${formatarMoeda(stats.saldoConta)}`;
  msg += `\n📊 Contas pagas este mês: ${stats.contasPagas}/${stats.totalContas}`;
  msg += `\n💸 Total pago em ${mesCapitalizado}: ${formatarMoeda(stats.totalPagoMes)}`;
  msg += `\n━━━━━━━━━━━━━━━━━━━━`;
  
  if (proximaOcorrencia) {
    msg += `\n\n🔄 Próxima: ${formatarData(proximaOcorrencia.due_date)}`;
  }
  
  return { sucesso: true, mensagem: msg, proximaOcorrencia };
}

/**
 * Mapeia bill_type para categoria de transação
 */
function mapBillTypeToCategory(billType: string): string {
  const mapping: Record<string, string> = {
    'service': 'Serviços',
    'housing': 'Moradia',
    'telecom': 'Telecomunicações',
    'subscription': 'Assinaturas',
    'loan': 'Empréstimos',
    'insurance': 'Seguros',
    'healthcare': 'Saúde',
    'education': 'Educação',
    'tax': 'Impostos',
    'credit_card': 'Cartão de Crédito',
    'other': 'Outros'
  };
  return mapping[billType] || 'Contas a Pagar';
}

/**
 * Processa intenção VALOR_CONTA_VARIAVEL (ex: "luz veio 190")
 */
export async function processarValorContaVariavel(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const valorInformado = entidades.valor as number | undefined;
  const nomeConta = entidades.conta as string || entidades.descricao as string || '';
  
  console.log(`[VALOR-VARIAVEL] Comando: "${comandoOriginal}", Conta: "${nomeConta}", Valor: ${valorInformado}`);
  
  // Extrair do texto: "luz veio 190", "água deu 85"
  let nomeContaFinal = nomeConta;
  let valorFinal = valorInformado;
  
  if (comandoOriginal) {
    const match = comandoOriginal.match(/(.+?)\s+(?:veio|deu|chegou|ficou)\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
    if (match) {
      nomeContaFinal = match[1].trim();
      valorFinal = parseFloat(match[2].replace(',', '.'));
    }
  }
  
  if (!nomeContaFinal || !valorFinal) {
    return {
      mensagem: `❓ Não entendi. Tente:\n\n💡 _"luz veio 190"_\n💡 _"água deu 85"_`,
    };
  }
  
  // Buscar conta pendente
  const conta = await buscarContaPendente(userId, nomeContaFinal);
  
  if (!conta) {
    return {
      mensagem: `❓ Não encontrei conta de *${nomeContaFinal}* pendente.\n\n💡 Quer cadastrar? Diga:\n• _"cadastrar luz 190 dia 15"_`,
    };
  }
  
  // Verificar variação significativa (>50% acima da média)
  const alerta = await verificarVariacaoSignificativa(userId, conta.description, valorFinal);
  
  if (alerta.alertar) {
    // Salvar contexto para aguardar confirmação
    return {
      mensagem: alerta.mensagem,
      precisaConfirmacao: true,
      dados: { 
        step: 'awaiting_variation_confirmation', 
        billId: conta.id,
        valor: valorFinal,
        descricao: conta.description,
        phone 
      }
    };
  }
  
  // Atualizar valor
  const resultado = await atualizarValorConta(userId, conta.id, valorFinal);
  
  if (resultado.sucesso) {
    const emoji = getEmojiConta(conta.description);
    return {
      mensagem: `${emoji} *${conta.description}*\n${resultado.mensagem}\n📅 Vence: ${formatarData(conta.due_date)}\n\n💡 Para pagar: _"paguei a ${nomeContaFinal}"_`,
    };
  }
  
  return { mensagem: resultado.mensagem };
}

/**
 * Processa intenção HISTORICO_CONTA
 */
export async function processarHistoricoConta(
  userId: string,
  _phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const nomeConta = entidades.conta as string || entidades.descricao as string || '';
  
  // Extrair do texto: "histórico da luz", "histórico luz"
  let nomeContaFinal = nomeConta;
  if (!nomeContaFinal && comandoOriginal) {
    const match = comandoOriginal.match(/hist[óo]rico\s+(?:da|do|de)?\s*(.+)/i);
    if (match) {
      nomeContaFinal = match[1].trim();
    }
  }
  
  if (!nomeContaFinal) {
    return {
      mensagem: `❓ Histórico de qual conta?\n\n💡 Exemplos:\n• _"histórico da luz"_\n• _"histórico água"_`,
    };
  }
  
  const historico = await consultarHistorico(userId, nomeContaFinal);
  return { mensagem: historico };
}

/**
 * Processa intenção PAGAR_FATURA_CARTAO
 * Suporta: pagamento total, parcial e mínimo
 */
export async function processarPagarFaturaCartao(
  userId: string,
  _phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  // ✅ CORREÇÃO: A IA pode colocar o banco em "cartao" OU em "conta_bancaria"
  const nomeCartao = entidades.cartao as string || entidades.conta_bancaria as string || '';
  const valorInformado = entidades.valor as number | undefined;
  const tipoPagamento = entidades.tipoPagamento as 'total' | 'parcial' | 'minimo' | undefined;
  
  console.log(`[PAGAR-FATURA] Comando: "${comandoOriginal}", Cartão: "${nomeCartao}", ContaBancaria: "${entidades.conta_bancaria}", Valor: ${valorInformado}, Tipo: ${tipoPagamento}`);
  
  // Extrair nome do cartão do texto se não veio nas entidades
  let nomeCartaoFinal = nomeCartao;
  if (!nomeCartaoFinal && comandoOriginal) {
    // Lista de bancos/cartões conhecidos para busca direta
    const bancosConhecidos = ['nubank', 'itau', 'itaú', 'bradesco', 'santander', 'inter', 'c6', 'caixa', 'bb', 'next', 'neon', 'original', 'picpay', 'mercado pago', 'pagbank', 'pan', 'bmg', 'safra', 'sicredi', 'sicoob'];
    
    // Primeiro: buscar banco conhecido diretamente no texto
    for (const banco of bancosConhecidos) {
      if (comandoOriginal.includes(banco)) {
        nomeCartaoFinal = banco;
        console.log(`[PAGAR-FATURA] Banco encontrado diretamente: "${banco}"`);
        break;
      }
    }
    
    // Fallback: padrões regex se não encontrou banco conhecido
    if (!nomeCartaoFinal) {
      // Padrão: "cartão Nubank", "do cartão Itaú"
      const matchCartao = comandoOriginal.match(/(?:cartão|cartao)\s+(?:do|da|de)?\s*(\w+)/i);
      // Padrão: "fatura do Nubank" (mas não "fatura de novembro")
      const matchFatura = comandoOriginal.match(/fatura\s+(?:do|da)\s+(\w+)/i);
      // Padrão: "paguei 2500 no Nubank"
      const matchValor = comandoOriginal.match(/paguei\s+[\d.,]+\s+(?:no|na|do|da)\s+(\w+)/i);
      
      if (matchCartao) nomeCartaoFinal = matchCartao[1];
      else if (matchFatura && !['novembro', 'dezembro', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro'].includes(matchFatura[1].toLowerCase())) {
        nomeCartaoFinal = matchFatura[1];
      }
      else if (matchValor) nomeCartaoFinal = matchValor[1];
    }
  }
  
  console.log(`[PAGAR-FATURA] Nome do cartão final: "${nomeCartaoFinal}"`);
  
  // Detectar tipo de pagamento do texto
  let tipoPagamentoFinal = tipoPagamento;
  if (!tipoPagamentoFinal && comandoOriginal) {
    if (comandoOriginal.includes('mínimo') || comandoOriginal.includes('minimo')) {
      tipoPagamentoFinal = 'minimo';
    } else if (valorInformado) {
      tipoPagamentoFinal = 'parcial'; // Se informou valor específico
    } else {
      tipoPagamentoFinal = 'total';
    }
  }
  
  if (!nomeCartaoFinal) {
    return {
      mensagem: `❓ Qual cartão você pagou?\n\n💡 Exemplos:\n• _"paguei a fatura do Nubank"_\n• _"paguei o cartão Itaú"_`,
    };
  }
  
  // Buscar cartão do usuário (ativo e não arquivado)
  const { data: cartao } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .or(`name.ilike.%${nomeCartaoFinal}%,issuing_bank.ilike.%${nomeCartaoFinal}%`)
    .limit(1)
    .single();
  
  console.log(`[PAGAR-FATURA] Busca cartão "${nomeCartaoFinal}" → Encontrado: ${cartao ? cartao.name : 'NÃO'}`);
  
  if (!cartao) {
    return {
      mensagem: `🤔 Não encontrei o cartão *${nomeCartaoFinal}*.\n\n💡 Use *"meus cartões"* para ver seus cartões cadastrados.`,
    };
  }
  
  // Buscar fatura pendente do cartão - PRIORIZAR VENCIDAS
  // 1. Primeiro buscar faturas vencidas (overdue ou partial com due_date < hoje)
  const hoje = new Date().toISOString().split('T')[0];
  
  let { data: fatura } = await supabase
    .from('credit_card_invoices')
    .select('*')
    .eq('credit_card_id', cartao.id)
    .in('status', ['overdue', 'partial'])
    .lt('due_date', hoje)
    .order('due_date', { ascending: true })
    .limit(1)
    .single();
  
  // 2. Se não tem vencida, buscar próxima pendente
  if (!fatura) {
    const { data: faturaProxima } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', cartao.id)
      .in('status', ['open', 'closed', 'pending', 'partial'])
      .gte('due_date', hoje)
      .order('due_date', { ascending: true })
      .limit(1)
      .single();
    
    fatura = faturaProxima;
  }
  
  console.log(`[PAGAR-FATURA] Fatura encontrada: ${fatura ? `${fatura.reference_month} - ${fatura.status} - R$${fatura.total_amount}` : 'NENHUMA'}`);
  
  if (!fatura) {
    return {
      mensagem: `✅ Não há fatura pendente para *${cartao.name}*!`,
    };
  }
  
  // Calcular valor restante (remaining_amount é gerado, mas pode não estar atualizado)
  const valorRestante = fatura.remaining_amount ?? (fatura.total_amount - (fatura.paid_amount || 0));
  const valorJaPago = fatura.paid_amount || 0;
  
  console.log(`[PAGAR-FATURA] Fatura: total=${fatura.total_amount}, jaPago=${valorJaPago}, restante=${valorRestante}`);
  
  // Determinar valor do pagamento
  let valorPagamento: number;
  let statusNovo: string;
  let mensagemTipo: string;
  
  if (tipoPagamentoFinal === 'minimo') {
    valorPagamento = fatura.minimum_payment || valorRestante * 0.15;
    statusNovo = 'partial';
    mensagemTipo = '(pagamento mínimo)';
  } else if (valorInformado && valorInformado < valorRestante) {
    valorPagamento = valorInformado;
    statusNovo = 'partial';
    mensagemTipo = '(pagamento parcial)';
  } else {
    // Pagar o valor restante (não o total, caso já tenha pago parte)
    valorPagamento = valorInformado || valorRestante;
    statusNovo = 'paid';
    mensagemTipo = '(pagamento total)';
  }
  
  // Calcular novo valor pago (acumulativo)
  const novoValorPago = valorJaPago + valorPagamento;
  
  const agora = new Date().toISOString();
  
  // Registrar pagamento da fatura
  const { error: updateError } = await supabase
    .from('credit_card_invoices')
    .update({
      status: statusNovo,
      paid_amount: novoValorPago,
      payment_date: agora,
      updated_at: agora
    })
    .eq('id', fatura.id);
  
  if (updateError) {
    console.error('[PAGAR-FATURA] Erro ao atualizar fatura:', updateError);
    return { mensagem: `❌ Erro ao registrar pagamento da fatura.` };
  }
  
  // Atualizar limite disponível do cartão
  const novoLimiteDisponivel = (cartao.available_limit || 0) + valorPagamento;
  await supabase
    .from('credit_cards')
    .update({
      available_limit: Math.min(novoLimiteDisponivel, cartao.credit_limit || novoLimiteDisponivel),
      updated_at: agora
    })
    .eq('id', cartao.id);
  
  // Formatar data de vencimento
  const dataVenc = new Date(fatura.due_date);
  const dataVencFormatada = dataVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  
  let resposta = `✅ Fatura *${cartao.name}* paga! ${mensagemTipo}
💰 Valor pago: ${formatarMoeda(valorPagamento)}
📅 Vencimento: ${dataVencFormatada}`;
  
  if (statusNovo === 'partial') {
    const restante = fatura.total_amount - valorPagamento;
    resposta += `

⚠️ *Valor restante: ${formatarMoeda(restante)}*
_Atenção: juros podem ser cobrados sobre o saldo._`;
  }
  
  // Mostrar novo limite disponível
  resposta += `

💳 Limite disponível: ${formatarMoeda(novoLimiteDisponivel)}`;
  
  console.log(`[PAGAR-FATURA] ✅ Fatura ${cartao.name} paga: ${valorPagamento}`);
  
  return { mensagem: resposta };
}

/**
 * Processa intenção DESFAZER_PAGAMENTO
 * Estorna pagamento feito por engano
 */
export async function processarDesfazerPagamento(
  userId: string,
  _phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const nomeConta = entidades.conta as string || '';
  
  console.log(`[DESFAZER-PAGAMENTO] Comando: "${comandoOriginal}", Conta: "${nomeConta}"`);
  
  // Extrair nome da conta do texto se não veio nas entidades
  let nomeContaFinal = nomeConta;
  if (!nomeContaFinal && comandoOriginal) {
    // Padrões: "desfazer pagamento da luz", "cancelar pagamento do aluguel", "errei, a luz não foi paga"
    const match = comandoOriginal.match(/(?:desfazer|cancelar|estornar)\s+(?:pagamento\s+)?(?:da|do|de)?\s*(.+)/i);
    const matchErrei = comandoOriginal.match(/(?:errei|erro).+?(?:da|do|de|a|o)\s+(\w+)/i);
    const matchNaoPaga = comandoOriginal.match(/(\w+)\s+(?:não|nao)\s+foi\s+pag/i);
    
    if (match) nomeContaFinal = match[1].trim();
    else if (matchErrei) nomeContaFinal = matchErrei[1].trim();
    else if (matchNaoPaga) nomeContaFinal = matchNaoPaga[1].trim();
  }
  
  if (!nomeContaFinal) {
    return {
      mensagem: `❓ Qual pagamento deseja desfazer?\n\n💡 Exemplos:\n• _"desfazer pagamento da luz"_\n• _"cancelar pagamento do aluguel"_`,
    };
  }
  
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  
  // Buscar conta paga no mês atual
  const { data: contaPaga } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .ilike('description', `%${nomeContaFinal}%`)
    .eq('status', 'paid')
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes)
    .order('paid_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!contaPaga) {
    return {
      mensagem: `❓ Não encontrei pagamento de *${nomeContaFinal}* registrado este mês.\n\n💡 Use _"o que paguei esse mês"_ para ver seus pagamentos.`,
    };
  }
  
  const agora = new Date().toISOString();
  
  // Reverter status para pendente ou overdue
  const dataVenc = new Date(contaPaga.due_date);
  const novoStatus = dataVenc < hoje ? 'overdue' : 'pending';
  
  const { error: updateError } = await supabase
    .from('payable_bills')
    .update({
      status: novoStatus,
      paid_at: null,
      paid_amount: null,
      updated_at: agora
    })
    .eq('id', contaPaga.id);
  
  if (updateError) {
    console.error('[DESFAZER-PAGAMENTO] Erro:', updateError);
    return { mensagem: `❌ Erro ao desfazer pagamento.` };
  }
  
  // Remover do histórico de pagamentos
  await supabase
    .from('bill_payment_history')
    .delete()
    .eq('bill_id', contaPaga.id)
    .order('payment_date', { ascending: false })
    .limit(1);
  
  const emoji = getEmojiConta(contaPaga.description);
  const dataVencFormatada = dataVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const statusStr = novoStatus === 'overdue' ? '⚠️ Vencida' : '⏳ Pendente';
  
  console.log(`[DESFAZER-PAGAMENTO] ✅ Pagamento de ${contaPaga.description} desfeito`);
  
  return {
    mensagem: `🔄 *Pagamento desfeito!*\n\n${emoji} *${contaPaga.description}*\n📅 Vencimento: ${dataVencFormatada}\n${statusStr}`,
  };
}

/**
 * Processa intenção RESUMO_PAGAMENTOS_MES
 * Mostra o que foi pago no mês
 */
export async function processarResumoPagamentosMes(
  userId: string,
  _phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  const mesInformado = entidades.mes as string || '';
  
  console.log(`[RESUMO-PAGAMENTOS] Comando: "${comandoOriginal}", Mês: "${mesInformado}"`);
  
  // Determinar mês de referência
  const hoje = new Date();
  let mesRef = hoje.getMonth();
  let anoRef = hoje.getFullYear();
  
  // Detectar mês do texto
  const meses: Record<string, number> = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  
  const textoCompleto = `${mesInformado} ${comandoOriginal}`.toLowerCase();
  for (const [nomeMes, numMes] of Object.entries(meses)) {
    if (textoCompleto.includes(nomeMes)) {
      mesRef = numMes;
      // Se mês futuro, assume ano anterior
      if (numMes > hoje.getMonth()) anoRef--;
      break;
    }
  }
  
  const inicioMes = new Date(anoRef, mesRef, 1).toISOString().split('T')[0];
  const fimMes = new Date(anoRef, mesRef + 1, 0).toISOString().split('T')[0];
  const nomeMesRef = obterNomeMes(new Date(anoRef, mesRef, 1));
  
  // Buscar contas pagas no mês
  const { data: contasPagas } = await supabase
    .from('payable_bills')
    .select('description, paid_amount, amount, paid_at')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes)
    .order('paid_at', { ascending: true });
  
  // Buscar faturas pagas no mês
  const { data: faturasPagas } = await supabase
    .from('credit_card_invoices')
    .select('credit_card_id, paid_amount, total_amount, paid_at')
    .eq('status', 'paid')
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes);
  
  // Buscar nomes dos cartões
  let faturasPagasComNome: Array<{ nome: string; valor: number }> = [];
  if (faturasPagas && faturasPagas.length > 0) {
    const cartaoIds = [...new Set(faturasPagas.map(f => f.credit_card_id))];
    const { data: cartoes } = await supabase
      .from('credit_cards')
      .select('id, name')
      .in('id', cartaoIds);
    
    const cartaoMap = new Map(cartoes?.map(c => [c.id, c.name]) || []);
    faturasPagasComNome = faturasPagas.map(f => ({
      nome: cartaoMap.get(f.credit_card_id) || 'Cartão',
      valor: f.paid_amount || f.total_amount
    }));
  }
  
  // Buscar contas pendentes
  const { data: contasPendentes } = await supabase
    .from('payable_bills')
    .select('description, amount, due_date')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes)
    .order('due_date', { ascending: true });
  
  // Calcular totais
  const totalPagoContas = (contasPagas || []).reduce((sum, c) => sum + (c.paid_amount || c.amount || 0), 0);
  const totalPagoFaturas = faturasPagasComNome.reduce((sum, f) => sum + f.valor, 0);
  const totalPago = totalPagoContas + totalPagoFaturas;
  const totalPendente = (contasPendentes || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  
  let msg = `📊 *Resumo: ${nomeMesRef}/${anoRef}*\n━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Seção de pagos
  const qtdPagos = (contasPagas?.length || 0) + faturasPagasComNome.length;
  if (qtdPagos > 0) {
    msg += `✅ *Pagos (${qtdPagos})*\n`;
    
    (contasPagas || []).forEach(c => {
      const emoji = getEmojiConta(c.description);
      const valor = c.paid_amount || c.amount || 0;
      msg += `  ${emoji} ${c.description} - ${formatarMoeda(valor)}\n`;
    });
    
    faturasPagasComNome.forEach(f => {
      msg += `  💳 Fatura ${f.nome} - ${formatarMoeda(f.valor)}\n`;
    });
    
    msg += `\n💰 *Total pago: ${formatarMoeda(totalPago)}*\n`;
  } else {
    msg += `✅ Nenhum pagamento registrado em ${nomeMesRef}.\n`;
  }
  
  // Seção de pendentes
  if (contasPendentes && contasPendentes.length > 0) {
    msg += `\n⏳ *Pendentes (${contasPendentes.length})*\n`;
    
    contasPendentes.forEach(c => {
      const emoji = getEmojiConta(c.description);
      const dataVenc = new Date(c.due_date);
      const diaVenc = dataVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      msg += `  ${emoji} ${c.description} - ${formatarMoeda(c.amount || 0)} (vence ${diaVenc})\n`;
    });
    
    msg += `\n💸 *Total pendente: ${formatarMoeda(totalPendente)}*`;
  }
  
  console.log(`[RESUMO-PAGAMENTOS] ${qtdPagos} pagos, ${contasPendentes?.length || 0} pendentes`);
  
  return { mensagem: msg };
}

/**
 * Extrai método de pagamento do texto
 */
export function extrairMetodoPagamento(texto: string): string | null {
  const textoLower = texto.toLowerCase();
  
  if (textoLower.includes('pix')) return 'pix';
  if (textoLower.includes('débito') || textoLower.includes('debito')) return 'debit';
  if (textoLower.includes('crédito') || textoLower.includes('credito')) return 'credit';
  if (textoLower.includes('boleto')) return 'boleto';
  if (textoLower.includes('transferência') || textoLower.includes('transferencia') || textoLower.includes('ted') || textoLower.includes('doc')) return 'transfer';
  if (textoLower.includes('dinheiro') || textoLower.includes('espécie') || textoLower.includes('especie')) return 'cash';
  if (textoLower.includes('débito automático') || textoLower.includes('debito automatico')) return 'auto_debit';
  
  return null;
}

/**
 * Extrai multa/juros do texto
 * Retorna { valorOriginal, multa, total } ou null
 */
export function extrairMultaJuros(texto: string, valorPrincipal: number): { valorOriginal: number; multa: number; total: number } | null {
  const textoLower = texto.toLowerCase();
  
  // Padrões: "com multa de 10", "mais 10 de juros", "paguei 205 com juros"
  const matchMulta = textoLower.match(/(?:multa|juros)\s+(?:de\s+)?(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
  const matchMais = textoLower.match(/(?:mais|mais)\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s+(?:de\s+)?(?:multa|juros)/i);
  
  if (matchMulta) {
    const multa = parseFloat(matchMulta[1].replace(',', '.'));
    return { valorOriginal: valorPrincipal, multa, total: valorPrincipal + multa };
  }
  
  if (matchMais) {
    const multa = parseFloat(matchMais[1].replace(',', '.'));
    return { valorOriginal: valorPrincipal, multa, total: valorPrincipal + multa };
  }
  
  return null;
}

/**
 * Verifica variação significativa e retorna alerta se necessário
 */
export async function verificarVariacaoSignificativa(
  userId: string,
  descricao: string,
  valorAtual: number
): Promise<{ alertar: boolean; mensagem: string; percentual: number }> {
  const comparativo = await calcularComparativo(userId, descricao, valorAtual);
  
  // Alertar se variação > 50% acima da média
  const variacaoMedia = comparativo.media6Meses > 0 
    ? ((valorAtual - comparativo.media6Meses) / comparativo.media6Meses) * 100 
    : 0;
  
  if (variacaoMedia > 50) {
    const msg = `⚠️ *Atenção!* ${formatarMoeda(valorAtual)} está *${variacaoMedia.toFixed(0)}% acima* da sua média (${formatarMoeda(comparativo.media6Meses)}).

Possíveis causas:
• Maior consumo no mês
• Reajuste tarifário
• Erro de leitura

Deseja que eu registre esse valor? (sim/não)`;
    
    return { alertar: true, mensagem: msg, percentual: variacaoMedia };
  }
  
  return { alertar: false, mensagem: '', percentual: variacaoMedia };
}

/**
 * Verifica se uma conta já foi paga no mês atual
 */
async function verificarContaJaPaga(userId: string, descricao: string): Promise<boolean> {
  const supabase = getSupabase();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const { data: contaPaga } = await supabase
    .from('payable_bills')
    .select('id')
    .eq('user_id', userId)
    .ilike('description', `%${descricao}%`)
    .eq('status', 'paid')
    .gte('due_date', inicioMes)
    .lte('due_date', fimMes)
    .limit(1)
    .single();
  
  return !!contaPaga;
}
