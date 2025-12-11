// ============================================
// CONTAS-PAGAR.TS - Gestão de Contas a Pagar
// Personal Finance LA - Ana Clara
// FASE 3.1: Consultas | FASE 3.2: CRUD
// ============================================

import { getSupabase } from './utils.ts';

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
  | 'VALOR_CONTA_VARIAVEL'     // (fase 3.3)
  | 'HISTORICO_CONTA'          // (fase 3.3)
  | 'CONTAS_AMBIGUO'           // "minhas contas" (perguntar ao usuário)
  | 'CADASTRAR_CONTA_AMBIGUO'  // "cadastrar conta" (bancária ou a pagar?)
  | null;

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
  const match = limpo.match(/r?\$?([\d]+[.,]?[\d]*)/);
  
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'));
    return valor > 0 ? valor : null;
  }
  return null;
}

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
// 'healthcare', 'insurance', 'loan', 'credit_card', 'tax', 'other'

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
  
  // EMPRÉSTIMOS/FINANCIAMENTOS
  if (/empr[ée]stimo|financiamento|consignado/.test(descLower)) {
    return 'loan';
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
  // NOTA: 'installment' agora mapeia para 'other' (Compras Parceladas)
  // 'loan' é reservado apenas para empréstimos/financiamentos explícitos
  const mapeamentoPorTipo: Record<BillType, string> = {
    'subscription': 'subscription',
    'credit_card': 'credit_card',
    'installment': 'other',  // Compras parceladas (geladeira, TV, etc)
    'fixed': 'service',
    'variable': 'service',
    'one_time': 'other',
    'unknown': 'other'
  };
  
  return mapeamentoPorTipo[tipoInterno] || 'other';
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
  account?: { name: string };
  // Para exibição numerada
  index?: number;
  // Tipo para diferenciação
  tipo?: 'conta' | 'fatura';
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

export async function contasVencendo(userId: string, dias: number = 7): Promise<string> {
  const supabase = getSupabase();
  // IMPORTANTE: Usar timezone de São Paulo para evitar problemas com UTC
  const hoje = getHojeSaoPaulo();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = getHojeStrSaoPaulo();
  
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + dias);
  const dataLimiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, '0')}-${String(dataLimite.getDate()).padStart(2, '0')}`;
  
  // Buscar contas A VENCER (de hoje em diante, não vencidas!)
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .eq('status', 'pending')  // Só pendentes, não overdue!
    .gte('due_date', hojeStr)  // A partir de hoje
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
    .gte('due_date', hojeStr)  // A partir de hoje
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
  
  if (todos.length === 0) {
    return `✅ *Tudo tranquilo!*\n\nNenhuma conta vencendo nos próximos ${dias} dias! 🎉`;
  }
  
  let mensagem = `📅 *Contas a Vencer*\n_Próximos ${dias} dias_\n`;
  
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
  
  const { data: vencidas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, bill_type')
    .eq('user_id', userId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true });
  
  if (!vencidas || vencidas.length === 0) {
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
      return { mensagem: await contasVencendo(userId, 7) };
    
    case 'CONTAS_VENCIDAS':
      return { mensagem: await contasVencidas(userId) };
    
    case 'CONTAS_DO_MES':
      return { mensagem: await contasDoMes(userId) };
    
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
    case 'VALOR_CONTA_VARIAVEL':
    case 'HISTORICO_CONTA':
      return { 
        mensagem: `🚧 _Funcionalidade em desenvolvimento..._\n\nEm breve você poderá marcar contas como pagas!\n\n💡 Por enquanto, use:\n• _"contas a pagar"_\n• _"contas vencidas"_` 
      };
    
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
  const textoMencionaValor = comandoOriginal && (
    /r\s*\$\s*\d/i.test(comandoOriginal) ||
    /\d+\s*(reais|real)/i.test(comandoOriginal) ||
    /valor\s*(de)?\s*\d/i.test(comandoOriginal) ||
    /pagar\s*\d/i.test(comandoOriginal) ||
    /\d+[.,]\d{2}/i.test(comandoOriginal)  // 150,00 ou 150.00
  );
  
  if (valor && !textoMencionaValor) {
    console.log('[CADASTRAR-CONTA] NLP inventou valor. Ignorando.');
    valor = undefined;
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
  
  // Fallback: extrair dia do texto (SEMPRE tentar, mesmo se NLP retornou algo)
  console.log(`[CADASTRAR-CONTA] Tentando extrair dia do texto: "${comandoOriginal}", diaVencimento atual: ${diaVencimento}`);
  
  if (comandoOriginal) {
    // Padrão 1: "dia 15/03" ou "dia 15-03" ou "dia 15.03" → extrair só o dia (15)
    let diaMatch = comandoOriginal.match(/dia\s*(\d{1,2})[\/\-\.]\d{1,2}/i);
    if (diaMatch && !diaVencimento) {
      diaVencimento = parseInt(diaMatch[1]);
      console.log(`[CADASTRAR-CONTA] Dia extraído de data completa: ${diaVencimento}`);
    }
    
    // Padrão 2: "dia 15" (sem mês) - MAIS FLEXÍVEL
    if (!diaVencimento) {
      diaMatch = comandoOriginal.match(/dia\s*(\d{1,2})/i);
      if (diaMatch) {
        diaVencimento = parseInt(diaMatch[1]);
        console.log(`[CADASTRAR-CONTA] Dia extraído simples: ${diaVencimento}`);
      }
    }
    
    // Padrão 3: "15/03" ou "15-03" em qualquer lugar do texto (sem "dia")
    if (!diaVencimento) {
      diaMatch = comandoOriginal.match(/(\d{1,2})[\/\-\.](\d{1,2})/i);
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
  if (!valor && comandoOriginal) {
    // Evitar capturar número de parcelas como valor
    // Padrão: busca valor após "de" ou "R$" ou "reais", mas NÃO após "x"
    const valorMatch = comandoOriginal.match(/(?:de\s*)?r\$\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*reais/i);
    if (valorMatch) {
      const valorCapturado = valorMatch[1] || valorMatch[2];
      if (valorCapturado && !comandoOriginal.includes('dia ' + valorCapturado)) {
        valor = parseFloat(valorCapturado.replace(',', '.'));
        console.log(`[CADASTRAR-CONTA] Valor extraído do texto (R$/reais): R$ ${valor}`);
      }
    }
    
    // Fallback 2: Capturar número solto que parece ser valor (>= 10 e não é dia)
    // Ex: "Conta de luz 180, vence dia 10" → 180 é valor, 10 é dia
    if (!valor) {
      // Encontrar todos os números no texto
      const numeros = comandoOriginal.match(/\d+(?:[.,]\d+)?/g);
      if (numeros) {
        for (const num of numeros) {
          const numFloat = parseFloat(num.replace(',', '.'));
          // Ignorar números que são dias (1-31) ou que aparecem após "dia"
          const isDia = comandoOriginal.match(new RegExp(`dia\\s*${num}\\b`, 'i'));
          const isVencimento = comandoOriginal.match(new RegExp(`vence\\s*(dia\\s*)?${num}\\b`, 'i'));
          
          // Se é um número >= 10 e não é dia de vencimento, provavelmente é valor
          if (numFloat >= 10 && !isDia && !isVencimento) {
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
  
  const insertData = {
    user_id: userId,
    description: descricao,
    amount: valor || null,
    due_date: dueDateStr,
    status: 'pending',
    is_recurring: isRecurring && !isInstallmentFinal,
    bill_type: billTypeDb,
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
