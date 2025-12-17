// ============================================
// CONSULTAS.TS - Consultas Financeiras via WhatsApp
// Personal Finance - Ana Clara
// FASE 1: Consultas Básicas
// ============================================

import { getSupabase, getEmojiBanco } from './utils.ts';

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

function capitalizar(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ============================================
// SISTEMA DE PERÍODOS AVANÇADO
// ============================================

export interface PeriodoConfig {
  tipo: 'hoje' | 'ontem' | 'semana_atual' | 'semana_passada' | 'mes_atual' | 'mes_passado' | 
        'ultimos_dias' | 'ultimos_meses' | 'mes_especifico' | 'intervalo';
  quantidade?: number;  // Para ultimos_dias, ultimos_meses
  mes?: number;         // Para mes_especifico (1-12)
  inicio?: string;      // Para intervalo (YYYY-MM-DD)
  fim?: string;         // Para intervalo (YYYY-MM-DD)
}

// Tipos de método de pagamento
export type MetodoPagamento = 'pix' | 'debit' | 'credit' | 'boleto' | 'cash' | 'transfer' | 'all';

// Tipos de transação
export type TipoTransacao = 'expense' | 'income' | 'transfer' | 'all';

// Tipos de agrupamento
export type TipoAgrupamento = 'categoria' | 'conta' | 'cartao' | 'metodo' | 'dia';

// Interface completa de consulta
export interface ConfigConsultaCompleta {
  // Filtros
  periodo?: PeriodoConfig;
  conta?: string;
  cartao?: string;
  metodo?: MetodoPagamento;
  tipo?: TipoTransacao;
  categoria?: string;
  estabelecimento?: string;  // Filtro por descrição (iFood, Uber, etc.)
  
  // Visualização
  modo?: 'resumo' | 'detalhado';
  agrupar_por?: TipoAgrupamento;
}

// Interface legada (compatibilidade)
export interface ConfigConsulta {
  periodo: PeriodoConfig;
  conta?: string;
  cartao?: string;
  modo?: 'resumo' | 'detalhado';
  agrupar_por?: 'categoria' | 'cartao' | 'dia' | 'conta';
}

// Mapeamento de ícones por método
export const METODO_ICONS: Record<string, string> = {
  pix: '⚡',
  debit: '💳',
  credit: '💳',
  boleto: '📄',
  cash: '💵',
  transfer: '🔄',
  outros: '📌',
  all: '📊'
};

// Mapeamento de labels por método
export const METODO_LABELS: Record<string, string> = {
  pix: 'PIX',
  debit: 'Débito',
  credit: 'Crédito',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  outros: 'Outros',
  all: 'Todos'
};

/**
 * Calcula as datas de início e fim baseado na configuração de período
 */
export function calcularPeriodoAvancado(periodo: PeriodoConfig | string): { 
  dataInicio: Date; 
  dataFim: Date; 
  label: string;
} {
  const hoje = new Date();
  let dataInicio: Date;
  let dataFim: Date = new Date(hoje);
  let label: string;
  
  // Compatibilidade com formato antigo (string simples)
  if (typeof periodo === 'string') {
    periodo = { tipo: periodo as PeriodoConfig['tipo'] };
  }
  
  switch (periodo.tipo) {
    case 'hoje':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      label = 'Hoje';
      break;
      
    case 'ontem':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 23, 59, 59);
      label = 'Ontem';
      break;
      
    case 'semana_atual':
      const diaSemana = hoje.getDay();
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemana);
      label = 'Esta Semana';
      break;
      
    case 'semana_passada':
      const diaSemanaAtual = hoje.getDay();
      const domingoPassado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemanaAtual - 7);
      dataInicio = domingoPassado;
      dataFim = new Date(domingoPassado.getFullYear(), domingoPassado.getMonth(), domingoPassado.getDate() + 6, 23, 59, 59);
      label = 'Semana Passada';
      break;
      
    case 'mes_atual':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      label = obterNomeMes(hoje);
      break;
      
    case 'mes_passado':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59); // Último dia do mês anterior
      label = obterNomeMes(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
      break;
      
    case 'mes_especifico':
      const mesAlvo = periodo.mes || 1;
      // Se o mês é maior que o atual, assume ano anterior
      const ano = mesAlvo > hoje.getMonth() + 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      dataInicio = new Date(ano, mesAlvo - 1, 1);
      dataFim = new Date(ano, mesAlvo, 0, 23, 59, 59); // Último dia do mês
      label = obterNomeMes(dataInicio);
      break;
      
    case 'ultimos_dias':
      const dias = periodo.quantidade || 7;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias + 1);
      label = `Últimos ${dias} dias`;
      break;
      
    case 'ultimos_meses':
      const meses = periodo.quantidade || 1;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, hoje.getDate());
      label = `Últimos ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
      break;
      
    case 'intervalo':
      dataInicio = new Date(periodo.inicio || hoje.toISOString());
      dataFim = new Date(periodo.fim || hoje.toISOString());
      dataFim.setHours(23, 59, 59);
      label = `${periodo.inicio} a ${periodo.fim}`;
      break;
      
    default:
      // Padrão: mês atual
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      label = obterNomeMes(hoje);
  }
  
  return { dataInicio, dataFim, label };
}

/**
 * Extrai período estruturado do texto do usuário
 */
export function extrairPeriodoDoTexto(texto: string): PeriodoConfig {
  const textoLower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Últimos X dias
  const matchDias = textoLower.match(/ultimos?\s+(\d+)\s*dias?/);
  if (matchDias) {
    return { tipo: 'ultimos_dias', quantidade: parseInt(matchDias[1]) };
  }
  
  // Últimos X meses
  const matchMeses = textoLower.match(/ultimos?\s+(\d+)\s*mes(es)?/);
  if (matchMeses) {
    return { tipo: 'ultimos_meses', quantidade: parseInt(matchMeses[1]) };
  }
  
  // Mês específico
  const mesesNomes: Record<string, number> = {
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
  };
  
  for (const [nome, numero] of Object.entries(mesesNomes)) {
    if (textoLower.includes(`em ${nome}`) || textoLower.includes(`de ${nome}`) || 
        textoLower.includes(`${nome}`) && !textoLower.includes('esse') && !textoLower.includes('este')) {
      return { tipo: 'mes_especifico', mes: numero };
    }
  }
  
  // Semana passada / última semana
  if (textoLower.includes('semana passada') || textoLower.includes('ultima semana')) {
    return { tipo: 'semana_passada' };
  }
  
  // Mês passado / último mês
  if (textoLower.includes('mes passado') || textoLower.includes('ultimo mes')) {
    return { tipo: 'mes_passado' };
  }
  
  // Esta semana / essa semana
  if (textoLower.includes('essa semana') || textoLower.includes('esta semana') || textoLower.includes('semana')) {
    return { tipo: 'semana_atual' };
  }
  
  // Hoje
  if (textoLower.includes('hoje')) {
    return { tipo: 'hoje' };
  }
  
  // Ontem
  if (textoLower.includes('ontem')) {
    return { tipo: 'ontem' };
  }
  
  // Este mês / esse mês
  if (textoLower.includes('esse mes') || textoLower.includes('este mes')) {
    return { tipo: 'mes_atual' };
  }
  
  // Padrão: mês atual
  return { tipo: 'mes_atual' };
}

/**
 * Extrai método de pagamento do texto
 */
export function extrairMetodoDoTexto(texto: string): MetodoPagamento | undefined {
  const textoLower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // PIX
  if (textoLower.includes('pix') || textoLower.includes('no pix') || textoLower.includes('via pix')) {
    return 'pix';
  }
  
  // Débito
  if (textoLower.includes('debito') || textoLower.includes('no debito') || textoLower.includes('cartao de debito')) {
    return 'debit';
  }
  
  // Crédito (cuidado: não confundir com cartão de crédito como filtro de conta)
  if (textoLower.includes('no credito') || textoLower.includes('cartao de credito') || 
      textoLower.includes('parcelado') || textoLower.includes('parcelei')) {
    return 'credit';
  }
  
  // Boleto
  if (textoLower.includes('boleto') || textoLower.includes('boletos')) {
    return 'boleto';
  }
  
  // Dinheiro
  if (textoLower.includes('dinheiro') || textoLower.includes('especie') || 
      textoLower.includes('em dinheiro') || textoLower.includes('cash')) {
    return 'cash';
  }
  
  // Transferência
  if (textoLower.includes('transferencia') || textoLower.includes('transferencias') ||
      textoLower.includes('ted') || textoLower.includes('doc') || textoLower.includes('transferi')) {
    return 'transfer';
  }
  
  return undefined;
}

/**
 * Extrai modo de visualização e agrupamento do texto
 */
export function extrairModoDoTexto(texto: string): { 
  modo?: 'resumo' | 'detalhado'; 
  agrupar_por?: TipoAgrupamento;
} {
  const textoLower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let modo: 'resumo' | 'detalhado' | undefined;
  let agrupar_por: TipoAgrupamento | undefined;
  
  // Modo detalhado
  if (textoLower.includes('detalhado') || textoLower.includes('detalhes') || 
      textoLower.includes('cada gasto') || textoLower.includes('lista') ||
      textoLower.includes('todos') || textoLower.includes('cada um')) {
    modo = 'detalhado';
  }
  
  // Agrupar por método de pagamento
  if (textoLower.includes('por metodo') || textoLower.includes('por forma de pagamento') ||
      textoLower.includes('cada metodo')) {
    agrupar_por = 'metodo';
  }
  
  // Agrupar por cartão
  if (textoLower.includes('por cartao') || textoLower.includes('cada cartao') || 
      textoLower.includes('em cada cartao')) {
    agrupar_por = 'cartao';
  }
  
  // Agrupar por dia
  if (textoLower.includes('por dia') || textoLower.includes('cada dia')) {
    agrupar_por = 'dia';
  }
  
  // Agrupar por categoria
  if (textoLower.includes('por categoria')) {
    agrupar_por = 'categoria';
  }
  
  // Agrupar por conta
  if (textoLower.includes('por conta') || textoLower.includes('cada conta') ||
      textoLower.includes('em cada banco') || textoLower.includes('cada banco')) {
    agrupar_por = 'conta';
  }
  
  return { modo, agrupar_por };
}

/**
 * Extrai todas as configurações de consulta do texto
 */
export function extrairConfigConsulta(texto: string, entidadesNLP?: any): ConfigConsultaCompleta {
  const periodo = extrairPeriodoDoTexto(texto);
  const { modo, agrupar_por } = extrairModoDoTexto(texto);
  const metodo = entidadesNLP?.metodo || extrairMetodoDoTexto(texto);
  
  return {
    periodo,
    conta: entidadesNLP?.conta,
    cartao: entidadesNLP?.cartao,
    metodo,
    tipo: entidadesNLP?.tipo,
    modo: entidadesNLP?.modo || modo,
    agrupar_por: entidadesNLP?.agrupar_por || agrupar_por
  };
}

// ============================================
// APELIDOS DE BANCOS/CARTÕES
// ============================================

const APELIDOS_BANCOS: Record<string, string> = {
  // Nubank
  'roxinho': 'nubank',
  'roxo': 'nubank',
  'nu': 'nubank',
  
  // Itaú
  'laranjinha': 'itau',
  'laranja': 'itau',
  'itaú': 'itau',
  'itau': 'itau',
  
  // Bradesco
  'vermelhinho': 'bradesco',
  
  // Inter
  'laranjão': 'inter',
  'laranjao': 'inter',
  
  // C6
  'pretinho': 'c6',
  'carbono': 'c6',
  
  // Santander
  'vermelho': 'santander',
};

function normalizarNomeBanco(nome: string): string {
  const nomeLower = nome.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return APELIDOS_BANCOS[nomeLower] || nomeLower;
}

// ============================================
// BUSCAR CONTA/CARTÃO POR NOME
// ============================================

async function buscarContaPorNome(userId: string, nome: string): Promise<{ id: string; name: string } | null> {
  const supabase = getSupabase();
  const nomeNormalizado = normalizarNomeBanco(nome);
  
  console.log('[BUSCA-CONTA] Buscando conta:', nome, '→', nomeNormalizado);
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', `%${nomeNormalizado}%`)
    .limit(1);
  
  console.log('[BUSCA-CONTA] Resultado:', data?.[0]?.name || 'NÃO ENCONTRADA', 'erro:', error?.message || 'nenhum');
  
  return data?.[0] || null;
}

async function buscarCartaoPorNome(userId: string, nome: string): Promise<{ id: string; name: string } | null> {
  const supabase = getSupabase();
  const nomeNormalizado = normalizarNomeBanco(nome);
  
  console.log('[BUSCA-CARTAO] Buscando cartão:', nome, '→', nomeNormalizado);
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', `%${nomeNormalizado}%`)
    .limit(1);
  
  console.log('[BUSCA-CARTAO] Resultado:', data?.[0]?.name || 'NÃO ENCONTRADO', 'erro:', error?.message || 'nenhum');
  
  return data?.[0] || null;
}

// Buscar TODOS os cartões com o nome (para casos de duplicatas)
async function buscarTodosCartoesPorNome(userId: string, nome: string): Promise<string[]> {
  const supabase = getSupabase();
  const nomeNormalizado = normalizarNomeBanco(nome);
  
  console.log('[BUSCA-CARTOES] Buscando todos cartões:', nome, '→', nomeNormalizado);
  
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', `%${nomeNormalizado}%`);
  
  const ids = data?.map((c: { id: string }) => c.id) || [];
  console.log('[BUSCA-CARTOES] Encontrados:', ids.length, 'cartões', 'erro:', error?.message || 'nenhum');
  
  return ids;
}

// ============================================
// INTERFACE DE FILTROS
// ============================================

export interface FiltrosGastos {
  periodo?: PeriodoConsulta;
  conta?: string;
  cartao?: string;
  metodo_pagamento?: string;
}

// ============================================
// DETECTAR INTENÇÃO DE CONSULTA
// ============================================

export type TipoConsulta = 'saldo' | 'saldo_especifico' | 'gastos' | 'receitas' | 'resumo' | null;

// Tipos de período (compatível com sistema antigo + novos)
export type PeriodoConsulta = 
  | 'hoje' | 'ontem' | 'semana' | 'mes'  // Formato antigo (compatibilidade)
  | 'semana_atual' | 'semana_passada'     // Novos formatos
  | 'mes_atual' | 'mes_passado'
  | 'ultimos_dias' | 'ultimos_meses'
  | 'mes_especifico' | 'intervalo'
  | null;

export interface IntencaoConsulta {
  tipo: TipoConsulta;
  parametro?: string; // Nome da conta para saldo específico
  periodo?: PeriodoConsulta; // Período para gastos/receitas
}

// Detectar período na mensagem
function detectarPeriodo(msg: string): PeriodoConsulta {
  const msgLower = msg.toLowerCase();
  
  if (/\b(hoje|do dia|de hoje)\b/.test(msgLower)) {
    return 'hoje';
  }
  if (/\b(ontem|de ontem)\b/.test(msgLower)) {
    return 'ontem';
  }
  if (/\b(semana|essa semana|esta semana|semanal)\b/.test(msgLower)) {
    return 'semana';
  }
  if (/\b(mes|mês|esse mes|este mes|mensal|do mes)\b/.test(msgLower)) {
    return 'mes';
  }
  
  return null; // Default será tratado como mês
}

export function detectarIntencaoConsulta(msg: string): IntencaoConsulta | null {
  const msgLower = msg.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  // Saldo específico: "saldo da Nubank", "saldo do Itaú", "saldo na Nubank"
  const matchSaldoEspecifico = msgLower.match(/saldo\s+(da|do|de|na|no)\s+(.+)/);
  if (matchSaldoEspecifico) {
    return { tipo: 'saldo_especifico', parametro: matchSaldoEspecifico[2].trim() };
  }
  
  // Saldo geral
  // NOTA: "minhas contas" removido daqui - agora é tratado pelo NLP como CONTAS_AMBIGUO
  if (/\b(meu saldo|saldo|quanto tenho|como tao minhas contas|meus saldos)\b/.test(msgLower)) {
    return { tipo: 'saldo' };
  }
  
  // Gastos
  if (/\b(quanto gastei|gastos|despesas|gastei quanto|minhas despesas)\b/.test(msgLower)) {
    return { tipo: 'gastos', periodo: detectarPeriodo(msg) };
  }
  
  // Receitas
  if (/\b(quanto recebi|receitas|entradas|recebi quanto|minhas receitas)\b/.test(msgLower)) {
    return { tipo: 'receitas', periodo: detectarPeriodo(msg) };
  }
  
  // Resumo
  if (/\b(resumo|como estou|situacao|visao geral|meu resumo|resumo financeiro)\b/.test(msgLower)) {
    return { tipo: 'resumo' };
  }
  
  return null;
}

// ============================================
// CONSULTAR SALDO GERAL
// ============================================

export async function consultarSaldo(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('name, type, current_balance')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('current_balance', { ascending: false });
  
  if (error) {
    console.error('[CONSULTA] Erro ao buscar contas:', error);
    return '❌ Erro ao consultar saldos. Tente novamente.';
  }
  
  if (!accounts?.length) {
    return '❌ Você ainda não tem contas cadastradas.\n\n💡 Cadastre suas contas no app para acompanhar seus saldos!';
  }
  
  const emojisTipo: Record<string, string> = {
    checking: '🏦',
    savings: '🐷',
    cash: '💵',
    investment: '📈',
    credit_card: '💳'
  };
  
  let totalContas = 0;
  let totalCartoes = 0;
  let mensagem = '💰 *Seus Saldos*\n\n';
  
  // Separar contas e cartões
  const contasNormais = accounts.filter(c => c.type !== 'credit_card');
  const cartoes = accounts.filter(c => c.type === 'credit_card');
  
  // Listar contas normais
  for (const conta of contasNormais) {
    const emojiBanco = getEmojiBanco(conta.name);
    const emojiTipo = emojisTipo[conta.type] || '💰';
    const saldoFormatado = formatarMoeda(conta.current_balance);
    const indicador = conta.current_balance < 0 ? '🔴' : '';
    
    mensagem += `${emojiBanco} *${conta.name}*: ${saldoFormatado} ${indicador}\n`;
    totalContas += conta.current_balance;
  }
  
  // Listar cartões separadamente se houver
  if (cartoes.length > 0) {
    mensagem += `\n💳 *Cartões de Crédito*\n`;
    for (const cartao of cartoes) {
      const emojiBanco = getEmojiBanco(cartao.name);
      const saldoFormatado = formatarMoeda(Math.abs(cartao.current_balance));
      mensagem += `${emojiBanco} *${cartao.name}*: ${saldoFormatado} (usado)\n`;
      totalCartoes += cartao.current_balance;
    }
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `💎 *Total em Contas*: ${formatarMoeda(totalContas)}`;
  
  if (totalContas < 0) {
    mensagem += `\n\n⚠️ _Atenção: seu saldo está negativo!_`;
  }
  
  return mensagem;
}

// ============================================
// CONSULTAR SALDO ESPECÍFICO
// ============================================

export async function consultarSaldoEspecifico(userId: string, nomeConta: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, type, current_balance, bank_name')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!accounts?.length) {
    return '❌ Você ainda não tem contas cadastradas.';
  }
  
  // Normalizar para busca
  const nomeNorm = nomeConta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Buscar conta pelo nome
  const conta = accounts.find(c => {
    const contaNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const bancoNorm = (c.bank_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return contaNorm.includes(nomeNorm) || bancoNorm.includes(nomeNorm) || nomeNorm.includes(contaNorm);
  });
  
  if (!conta) {
    let lista = '❓ Não encontrei essa conta.\n\n📋 *Suas contas:*\n';
    accounts.forEach(c => {
      lista += `• ${c.name}\n`;
    });
    return lista;
  }
  
  const emojiBanco = getEmojiBanco(conta.name);
  const saldoFormatado = formatarMoeda(conta.current_balance);
  const indicador = conta.current_balance < 0 ? ' 🔴' : ' ✅';
  
  return `${emojiBanco} *${conta.name}*\n\n💰 Saldo: *${saldoFormatado}*${indicador}`;
}

// ============================================
// CONSULTAR GASTOS (COM SUPORTE A PERÍODO)
// ============================================

export async function consultarGastos(userId: string, periodo?: PeriodoConsulta): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  
  // Calcular datas baseado no período
  let dataInicio: Date;
  let dataFim: Date = hoje;
  let labelPeriodo: string;
  
  switch (periodo) {
    case 'hoje':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      labelPeriodo = 'Hoje';
      break;
    case 'ontem':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      labelPeriodo = 'Ontem';
      break;
    case 'semana':
      const diaSemana = hoje.getDay();
      const diffDomingo = diaSemana === 0 ? 0 : diaSemana;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diffDomingo);
      labelPeriodo = 'Esta Semana';
      break;
    case 'mes':
    default:
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      labelPeriodo = obterNomeMes(hoje);
      break;
  }
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      category:categories(name)
    `)
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('transaction_date', dataInicio.toISOString().split('T')[0])
    .lte('transaction_date', dataFim.toISOString().split('T')[0]);
  
  if (error) {
    console.error('[CONSULTA] Erro ao buscar gastos:', error);
    return '❌ Erro ao consultar gastos. Tente novamente.';
  }
  
  if (!transactions?.length) {
    const msgVazio = periodo === 'hoje' 
      ? '✨ Você não teve gastos hoje!\n\n💡 _Dia de economia!_ 😄'
      : periodo === 'ontem'
      ? '✨ Você não teve gastos ontem!'
      : periodo === 'semana'
      ? '✨ Você não teve gastos essa semana ainda!'
      : `✨ Você não teve gastos em ${obterNomeMes(hoje)} ainda!\n\n💡 _Que tal manter assim?_ 😄`;
    return msgVazio;
  }
  
  const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  // Agrupar por categoria
  const porCategoria: Record<string, number> = {};
  for (const t of transactions) {
    const cat = (t.category as any)?.name || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.amount);
  }
  
  // Ordenar por valor (maior primeiro) e pegar top 5
  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1]);
  
  let mensagem = `📊 *Gastos de ${labelPeriodo}*\n\n`;
  
  const emojisCategoria: Record<string, string> = {
    'Alimentação': '🍔',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Saúde': '💊',
    'Lazer': '🎮',
    'Educação': '📚',
    'Vestuário': '👕',
    'Assinaturas': '📺',
    'Viagens': '✈️',
    'Compras': '🛒',
    'Serviços': '🔧',
    'Outros': '📦'
  };
  
  for (const [cat, valor] of categorias) {
    const percentual = ((valor / total) * 100).toFixed(0);
    const emoji = emojisCategoria[cat] || '•';
    mensagem += `${emoji} ${cat}: ${formatarMoeda(valor)} (${percentual}%)\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `🔴 *Total*: ${formatarMoeda(total)}`;
  
  // Média diária só para mês
  if (!periodo || periodo === 'mes') {
    const diasPassados = hoje.getDate();
    const mediaDiaria = total / diasPassados;
    mensagem += `\n📅 _Média diária: ${formatarMoeda(mediaDiaria)}_`;
  }
  
  return mensagem;
}

// ============================================
// CONSULTAR GASTOS COM FILTROS (CONTA/CARTÃO/MÉTODO)
// ============================================

export async function consultarGastosComFiltros(userId: string, filtros: FiltrosGastos): Promise<string> {
  const supabase = getSupabase();
  const periodo = filtros.periodo || 'mes_atual';
  
  // ============================================
  // ✅ SISTEMA DE PERÍODOS AVANÇADO
  // Suporta: hoje, ontem, semana, mes, semana_passada, mes_passado, ultimos_dias, etc.
  // ============================================
  
  // Mapear formato antigo para novo (compatibilidade)
  const periodoMapeado: PeriodoConfig = typeof periodo === 'string' 
    ? { 
        tipo: periodo === 'semana' ? 'semana_atual' 
            : periodo === 'mes' ? 'mes_atual' 
            : periodo as PeriodoConfig['tipo']
      }
    : periodo;
  
  const { dataInicio, dataFim, label: labelPeriodo } = calcularPeriodoAvancado(periodoMapeado);
  
  console.log('[CONSULTA] Período:', JSON.stringify(periodoMapeado), '→', labelPeriodo);
  console.log('[CONSULTA] Datas:', dataInicio.toISOString().split('T')[0], 'a', dataFim.toISOString().split('T')[0]);
  
  // Normalizar filtros
  const contaFiltroNome = filtros.conta ? normalizarNomeBanco(filtros.conta) : null;
  const cartaoFiltroNome = filtros.cartao ? normalizarNomeBanco(filtros.cartao) : null;
  const metodoFiltro = filtros.metodo_pagamento || null;
  
  console.log('[CONSULTA] Filtros recebidos:', { contaFiltroNome, cartaoFiltroNome, metodoFiltro, periodo });
  
  // ============================================
  // ✅ VALIDAÇÃO: Confirmar que conta/cartão EXISTE para o usuário
  // Protege contra alucinações do NLP
  // ============================================
  
  let contaValidada: { id: string; name: string } | null = null;
  let cartoesValidados: string[] = [];
  let filtroNaoEncontrado: string | null = null;
  
  // Validar conta
  if (contaFiltroNome) {
    contaValidada = await buscarContaPorNome(userId, contaFiltroNome);
    if (contaValidada) {
      console.log(`✅ [VALIDAÇÃO] Conta "${contaFiltroNome}" validada:`, contaValidada.name);
    } else {
      console.log(`⚠️ [VALIDAÇÃO] Conta "${contaFiltroNome}" NÃO encontrada`);
    }
    
    // Também buscar cartões com esse nome (ex: "nubank" pode ser conta E cartão)
    cartoesValidados = await buscarTodosCartoesPorNome(userId, contaFiltroNome);
    if (cartoesValidados.length > 0) {
      console.log(`✅ [VALIDAÇÃO] ${cartoesValidados.length} cartão(ões) "${contaFiltroNome}" validado(s)`);
    }
    
    // Se não encontrou nem conta nem cartão, guardar para feedback
    if (!contaValidada && cartoesValidados.length === 0) {
      filtroNaoEncontrado = contaFiltroNome;
    }
  }
  
  // Validar cartão específico (se diferente da conta)
  if (cartaoFiltroNome && cartaoFiltroNome !== contaFiltroNome) {
    cartoesValidados = await buscarTodosCartoesPorNome(userId, cartaoFiltroNome);
    if (cartoesValidados.length > 0) {
      console.log(`✅ [VALIDAÇÃO] ${cartoesValidados.length} cartão(ões) "${cartaoFiltroNome}" validado(s)`);
    } else {
      console.log(`⚠️ [VALIDAÇÃO] Cartão "${cartaoFiltroNome}" NÃO encontrado`);
      filtroNaoEncontrado = cartaoFiltroNome;
    }
  }
  
  // Se NLP disse um banco/cartão que o usuário NÃO tem, informar
  if (filtroNaoEncontrado) {
    // Buscar contas e cartões do usuário para sugerir
    const { data: contasUsuario } = await supabase
      .from('accounts')
      .select('name')
      .eq('user_id', userId);
    
    const { data: cartoesUsuario } = await supabase
      .from('credit_cards')
      .select('name')
      .eq('user_id', userId);
    
    const nomesContas = contasUsuario?.map((c: { name: string }) => c.name).join(', ') || 'nenhuma';
    const nomesCartoes = cartoesUsuario?.map((c: { name: string }) => c.name).join(', ') || 'nenhum';
    
    return `🏦 Não encontrei "${capitalizar(filtroNaoEncontrado)}" nas suas contas ou cartões.\n\n` +
           `📋 *Suas contas:* ${nomesContas}\n` +
           `💳 *Seus cartões:* ${nomesCartoes}\n\n` +
           `_Tente novamente com um nome válido!_`;
  }
  
  let gastosDetalhados: Array<{
    descricao: string;
    valor: number;
    categoria: string;
    fonte: 'conta' | 'cartao';
  }> = [];
  let fontes: string[] = [];
  
  // ============================================
  // 1. BUSCAR EM TRANSACTIONS (conta bancária)
  // Buscar SEMPRE que tiver conta validada
  // ============================================
  
  console.log('[CONSULTA] === BUSCANDO EM TRANSACTIONS ===');
  console.log('[CONSULTA] contaValidada:', contaValidada?.name || 'NENHUMA');
  
  if (contaValidada) {
    console.log('[CONSULTA] ✅ Buscando transações da conta:', contaValidada.name, 'ID:', contaValidada.id);
    
    let query = supabase
      .from('transactions')
      .select(`
        amount,
        description,
        payment_method,
        account_id,
        category:categories(name),
        account:accounts!account_id(name)
      `)
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('account_id', contaValidada.id)
      .gte('transaction_date', dataInicio.toISOString().split('T')[0])
      .lte('transaction_date', dataFim.toISOString().split('T')[0]);
    
    // Filtrar por método de pagamento (se especificado)
    if (metodoFiltro) {
      query = query.eq('payment_method', metodoFiltro);
      console.log('[CONSULTA] Filtrando por método:', metodoFiltro);
    }
    
    const { data: transacoes, error } = await query;
    
    console.log('[CONSULTA] 📊 Transações conta encontradas:', transacoes?.length || 0, 'erro:', error?.message || 'nenhum');
    
    if (!error && transacoes && transacoes.length > 0) {
      const totalConta = transacoes.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      console.log('[CONSULTA] 💰 Total da conta:', totalConta.toFixed(2));
      
      gastosDetalhados.push(...transacoes.map((t: any) => ({
        descricao: t.description || 'Sem descrição',
        valor: Number(t.amount),
        categoria: (t.category as any)?.name || 'Outros',
        fonte: 'conta' as const
      })));
      fontes.push('conta');
    }
  } else {
    console.log('[CONSULTA] ⚠️ Nenhuma conta validada - pulando busca em transactions');
  }
  
  // ============================================
  // 2. BUSCAR EM CREDIT_CARD_TRANSACTIONS (cartão de crédito)
  // Buscar SEMPRE que tiver cartões validados
  // ============================================
  
  console.log('[CONSULTA] === BUSCANDO EM CREDIT_CARD_TRANSACTIONS ===');
  console.log('[CONSULTA] cartoesValidados:', cartoesValidados.length);
  
  if (cartoesValidados.length > 0) {
    console.log('[CONSULTA] ✅ Buscando transações de', cartoesValidados.length, 'cartões');
    
    let queryCartao = supabase
      .from('credit_card_transactions')
      .select(`
        amount,
        description,
        credit_card_id,
        category:categories(name),
        card:credit_cards(name)
      `)
      .eq('user_id', userId)
      .in('credit_card_id', cartoesValidados)
      .gte('purchase_date', dataInicio.toISOString().split('T')[0])
      .lte('purchase_date', dataFim.toISOString().split('T')[0]);
    
    const { data: comprasCartao, error: errorCartao } = await queryCartao;
    
    console.log('[CONSULTA] 📊 Transações cartão encontradas:', comprasCartao?.length || 0, 'erro:', errorCartao?.message || 'nenhum');
    
    if (!errorCartao && comprasCartao && comprasCartao.length > 0) {
      const totalCartao = comprasCartao.reduce((acc: number, c: any) => acc + Number(c.amount), 0);
      console.log('[CONSULTA] 💳 Total do cartão:', totalCartao.toFixed(2));
      
      gastosDetalhados.push(...comprasCartao.map((c: any) => ({
        descricao: c.description || 'Sem descrição',
        valor: Number(c.amount),
        categoria: (c.category as any)?.name || 'Outros',
        fonte: 'cartao' as const
      })));
      fontes.push('cartão');
    }
  } else {
    console.log('[CONSULTA] ⚠️ Nenhum cartão validado - pulando busca em credit_card_transactions');
  }
  
  // ============================================
  // 3. CALCULAR TOTAIS E COMBINAR RESULTADOS
  // ============================================
  
  const total = gastosDetalhados.reduce((acc, g) => acc + g.valor, 0);
  
  console.log('[CONSULTA] === RESULTADO FINAL ===');
  console.log('[CONSULTA] 📊 Total de transações:', gastosDetalhados.length);
  console.log('[CONSULTA] 💰 TOTAL GERAL: R$', total.toFixed(2));
  console.log('[CONSULTA] 📍 Fontes:', fontes.join(' + ') || 'nenhuma');
  
  // Agrupar por categoria
  const porCategoria: Record<string, number> = {};
  for (const g of gastosDetalhados) {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  }
  
  // Montar título com filtros
  let titulo = `📊 *Gastos - ${labelPeriodo}*`;
  
  if (cartaoFiltroNome) {
    titulo += `\n💳 Cartão ${capitalizar(cartaoFiltroNome)}`;
  } else if (contaFiltroNome) {
    titulo += `\n🏦 ${capitalizar(contaFiltroNome)}`;
  }
  if (metodoFiltro) {
    const metodoLabel: Record<string, string> = { 
      pix: 'PIX', 
      debit: 'Débito', 
      credit: 'Crédito', 
      cash: 'Dinheiro' 
    };
    titulo += ` (${metodoLabel[metodoFiltro] || metodoFiltro})`;
  }
  
  // Se não encontrou gastos
  if (total === 0) {
    let msg = `${titulo}\n\n`;
    msg += `✨ Nenhum gasto encontrado`;
    if (cartaoFiltroNome || contaFiltroNome || metodoFiltro) {
      msg += ` com os filtros aplicados`;
    }
    msg += `.`;
    return msg;
  }
  
  // Ordenar categorias por valor (todas as categorias)
  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1]);
  
  let mensagem = `${titulo}\n\n`;
  
  const emojisCategoria: Record<string, string> = {
    'Alimentação': '🍔',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Saúde': '💊',
    'Lazer': '🎮',
    'Educação': '📚',
    'Vestuário': '👕',
    'Assinaturas': '📺',
    'Viagens': '✈️',
    'Compras': '🛒',
    'Serviços': '🔧',
    'Outros': '📦'
  };
  
  for (const [cat, valor] of categorias) {
    const percentual = ((valor / total) * 100).toFixed(0);
    const emoji = emojisCategoria[cat] || '•';
    mensagem += `${emoji} ${cat}: ${formatarMoeda(valor)} (${percentual}%)\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `🔴 *Total*: ${formatarMoeda(total)}`;
  
  // Indicar fontes
  if (fontes.length > 0) {
    mensagem += `\n📍 _Fonte: ${fontes.join(' + ')}_`;
  }
  
  return mensagem;
}

// ============================================
// CONSULTAR RECEITAS (COM SUPORTE A PERÍODO)
// ============================================

export async function consultarReceitas(userId: string, periodo?: PeriodoConsulta): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  
  // Calcular datas baseado no período
  let dataInicio: Date;
  let dataFim: Date = hoje;
  let labelPeriodo: string;
  
  switch (periodo) {
    case 'hoje':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      labelPeriodo = 'Hoje';
      break;
    case 'ontem':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      labelPeriodo = 'Ontem';
      break;
    case 'semana':
      const diaSemana = hoje.getDay();
      const diffDomingo = diaSemana === 0 ? 0 : diaSemana;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diffDomingo);
      labelPeriodo = 'Esta Semana';
      break;
    case 'mes':
    default:
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      labelPeriodo = obterNomeMes(hoje);
      break;
  }
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      description,
      category:categories(name)
    `)
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('transaction_date', dataInicio.toISOString().split('T')[0])
    .lte('transaction_date', dataFim.toISOString().split('T')[0])
    .order('amount', { ascending: false });
  
  if (error) {
    console.error('[CONSULTA] Erro ao buscar receitas:', error);
    return '❌ Erro ao consultar receitas. Tente novamente.';
  }
  
  if (!transactions?.length) {
    const msgVazio = periodo === 'hoje' 
      ? '📭 Nenhuma receita registrada hoje.'
      : periodo === 'ontem'
      ? '📭 Nenhuma receita registrada ontem.'
      : periodo === 'semana'
      ? '📭 Nenhuma receita registrada essa semana.'
      : `📭 Nenhuma receita registrada em ${labelPeriodo}.\n\n💡 _Registre suas entradas para ter um controle completo!_`;
    return msgVazio;
  }
  
  const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  let mensagem = `💚 *Receitas de ${labelPeriodo}*\n\n`;
  
  // Listar até 5 maiores receitas
  const topReceitas = transactions.slice(0, 5);
  for (const t of topReceitas) {
    const descricao = t.description || (t.category as any)?.name || 'Receita';
    mensagem += `💰 ${descricao}: ${formatarMoeda(Number(t.amount))}\n`;
  }
  
  if (transactions.length > 5) {
    mensagem += `_... e mais ${transactions.length - 5} receitas_\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `🟢 *Total*: ${formatarMoeda(total)}`;
  
  return mensagem;
}

// ============================================
// CONSULTAR RECEITAS COM FILTROS (CONTA/PERÍODO)
// ============================================

export async function consultarReceitasComFiltros(userId: string, filtros: FiltrosGastos): Promise<string> {
  const supabase = getSupabase();
  const periodo = filtros.periodo || 'mes_atual';
  
  // Usar sistema de períodos avançado
  const periodoMapeado: PeriodoConfig = typeof periodo === 'string' 
    ? { 
        tipo: periodo === 'semana' ? 'semana_atual' 
            : periodo === 'mes' ? 'mes_atual' 
            : periodo as PeriodoConfig['tipo']
      }
    : periodo;
  
  const { dataInicio, dataFim, label: labelPeriodo } = calcularPeriodoAvancado(periodoMapeado);
  
  console.log('[RECEITAS] Período:', JSON.stringify(periodoMapeado), '→', labelPeriodo);
  console.log('[RECEITAS] Datas:', dataInicio.toISOString().split('T')[0], 'a', dataFim.toISOString().split('T')[0]);
  
  // Normalizar filtro de conta
  const contaFiltroNome = filtros.conta ? normalizarNomeBanco(filtros.conta) : null;
  
  console.log('[RECEITAS] Filtro de conta:', contaFiltroNome);
  
  // Validar conta se especificada
  let contaValidada: { id: string; name: string } | null = null;
  
  if (contaFiltroNome) {
    contaValidada = await buscarContaPorNome(userId, contaFiltroNome);
    if (contaValidada) {
      console.log(`✅ [RECEITAS] Conta "${contaFiltroNome}" validada:`, contaValidada.name);
    } else {
      console.log(`⚠️ [RECEITAS] Conta "${contaFiltroNome}" NÃO encontrada`);
      return `❌ Não encontrei uma conta chamada "${contaFiltroNome}".\n\n💡 Use "minhas contas" para ver suas contas disponíveis.`;
    }
  }
  
  // Buscar receitas
  let query = supabase
    .from('transactions')
    .select(`
      amount,
      description,
      transaction_date,
      category:categories(name),
      accounts!account_id(name)
    `)
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('transaction_date', dataInicio.toISOString().split('T')[0])
    .lte('transaction_date', dataFim.toISOString().split('T')[0]);
  
  // Filtrar por conta se especificada
  if (contaValidada) {
    query = query.eq('account_id', contaValidada.id);
  }
  
  const { data: transactions, error } = await query.order('amount', { ascending: false });
  
  if (error) {
    console.error('[RECEITAS] Erro ao buscar:', error);
    return '❌ Erro ao consultar receitas. Tente novamente.';
  }
  
  if (!transactions?.length) {
    const contaLabel = contaValidada ? ` na conta ${contaValidada.name}` : '';
    return `📭 Nenhuma receita encontrada${contaLabel} em ${labelPeriodo}.\n\n💡 _Registre suas entradas para ter um controle completo!_`;
  }
  
  const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  // Montar mensagem
  const contaLabel = contaValidada ? `\n🏦 ${contaValidada.name}` : '';
  let mensagem = `💚 *Receitas de ${labelPeriodo}*${contaLabel}\n\n`;
  
  // Listar receitas
  const topReceitas = transactions.slice(0, 8);
  for (const t of topReceitas) {
    const descricao = t.description || (t.category as any)?.name || 'Receita';
    mensagem += `💰 ${descricao}: ${formatarMoeda(Number(t.amount))}\n`;
  }
  
  if (transactions.length > 8) {
    mensagem += `_... e mais ${transactions.length - 8} receitas_\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `🟢 *Total*: ${formatarMoeda(total)}`;
  
  return mensagem;
}

// ============================================
// 🔥 CONSULTA FINANCEIRA UNIFICADA
// Suporta: qualquer método, período, conta, agrupamento
// ============================================

interface TransacaoUnificada {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  conta?: string;
  cartao?: string;
  metodo: string;
  tipo: string;
  fonte: 'conta' | 'cartao';
  parcela?: string;
}

export async function consultarFinancasUnificada(
  userId: string, 
  config: ConfigConsultaCompleta
): Promise<string> {
  const supabase = getSupabase();
  
  // Calcular período
  const periodoConfig = config.periodo || { tipo: 'mes_atual' as const };
  const { dataInicio, dataFim, label: labelPeriodo } = calcularPeriodoAvancado(periodoConfig);
  
  console.log('[UNIFICADA] Config:', JSON.stringify(config));
  console.log('[UNIFICADA] Período:', labelPeriodo, dataInicio.toISOString().split('T')[0], 'a', dataFim.toISOString().split('T')[0]);
  
  // Validar conta se especificada
  let contaValidada: { id: string; name: string } | null = null;
  let cartoesValidados: string[] = [];
  
  if (config.conta) {
    const contaNormalizada = normalizarNomeBanco(config.conta);
    contaValidada = await buscarContaPorNome(userId, contaNormalizada);
    cartoesValidados = await buscarTodosCartoesPorNome(userId, contaNormalizada);
    
    if (!contaValidada && cartoesValidados.length === 0) {
      return `❌ Não encontrei "${config.conta}" nas suas contas ou cartões.\n\n💡 Use "minhas contas" para ver suas opções.`;
    }
  }
  
  let transacoesContas: TransacaoUnificada[] = [];
  let transacoesCartao: TransacaoUnificada[] = [];
  
  // Determinar tipo de transação (expense/income)
  const tipoTransacao = config.tipo || 'expense';
  
  // ===== BUSCAR EM TRANSACTIONS (contas) =====
  // PIX, débito, dinheiro, boleto, transferência estão aqui
  const deveBuscarContas = !config.cartao && config.metodo !== 'credit';
  
  if (deveBuscarContas) {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        description,
        transaction_date,
        payment_method,
        type,
        category:categories(name),
        accounts!account_id(name)
      `)
      .eq('user_id', userId)
      .gte('transaction_date', dataInicio.toISOString().split('T')[0])
      .lte('transaction_date', dataFim.toISOString().split('T')[0]);
    
    // Filtrar por tipo (expense/income)
    if (tipoTransacao !== 'all') {
      query = query.eq('type', tipoTransacao);
    }
    
    // Filtrar por conta
    if (contaValidada) {
      query = query.eq('account_id', contaValidada.id);
    }
    
    // Filtrar por método de pagamento
    if (config.metodo && config.metodo !== 'all' && config.metodo !== 'credit') {
      query = query.eq('payment_method', config.metodo);
    }
    
    const { data, error } = await query.order('transaction_date', { ascending: false });
    
    if (data && !error) {
      transacoesContas = data.map((t: any) => ({
        id: t.id,
        descricao: t.description || 'Transação',
        valor: Math.abs(Number(t.amount)),
        data: t.transaction_date,
        categoria: t.category?.name || 'Outros',
        conta: t.accounts?.name,
        metodo: t.payment_method || 'outros',
        tipo: t.type,
        fonte: 'conta' as const
      }));
    }
    
    console.log('[UNIFICADA] Transações de conta:', transacoesContas.length);
  }
  
  // ===== BUSCAR EM CREDIT_CARD_TRANSACTIONS (cartões) =====
  // Apenas compras no crédito
  const deveBuscarCartao = !config.metodo || config.metodo === 'credit' || config.metodo === 'all';
  
  if (deveBuscarCartao && tipoTransacao !== 'income') {
    // Buscar cartões
    let cartaoIds: string[] = [];
    
    if (cartoesValidados.length > 0) {
      cartaoIds = cartoesValidados;
    } else if (!config.conta) {
      // Buscar todos os cartões do usuário
      const { data: todosCartoes } = await supabase
        .from('credit_cards')
        .select('id')
        .eq('user_id', userId);
      cartaoIds = todosCartoes?.map((c: any) => c.id) || [];
    }
    
    if (cartaoIds.length > 0) {
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          id,
          amount,
          description,
          purchase_date,
          is_installment,
          installment_number,
          total_installments,
          credit_cards(name),
          categories(name)
        `)
        .eq('user_id', userId)
        .in('credit_card_id', cartaoIds)
        .gte('purchase_date', dataInicio.toISOString().split('T')[0])
        .lte('purchase_date', dataFim.toISOString().split('T')[0])
        .order('purchase_date', { ascending: false });
      
      if (data && !error) {
        transacoesCartao = data.map((t: any) => ({
          id: t.id,
          descricao: t.description || 'Compra',
          valor: Math.abs(Number(t.amount)),
          data: t.purchase_date,
          categoria: t.categories?.name || 'Outros',
          cartao: t.credit_cards?.name,
          metodo: 'credit',
          tipo: 'expense',
          fonte: 'cartao' as const,
          parcela: t.is_installment ? `${t.installment_number}/${t.total_installments}` : undefined
        }));
      }
      
      console.log('[UNIFICADA] Transações de cartão:', transacoesCartao.length);
    }
  }
  
  // ===== COMBINAR E PROCESSAR =====
  let todasTransacoes = [...transacoesContas, ...transacoesCartao];
  
  // ✅ BUG #19: Filtrar por categoria se especificada
  if (config.categoria) {
    const categoriaNorm = config.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    console.log('[UNIFICADA] 🏷️ Filtrando por categoria:', config.categoria);
    
    todasTransacoes = todasTransacoes.filter(t => {
      const catTransacao = t.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return catTransacao.includes(categoriaNorm) || categoriaNorm.includes(catTransacao);
    });
    
    console.log('[UNIFICADA] 🏷️ Transações após filtro categoria:', todasTransacoes.length);
  }
  
  // ✅ Filtrar por estabelecimento/descrição (iFood, Uber, etc.)
  if (config.estabelecimento) {
    const estabelecimentoNorm = config.estabelecimento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    console.log('[UNIFICADA] 🏪 Filtrando por estabelecimento:', config.estabelecimento);
    
    todasTransacoes = todasTransacoes.filter(t => {
      const descNorm = t.descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return descNorm.includes(estabelecimentoNorm);
    });
    
    console.log('[UNIFICADA] 🏪 Transações após filtro estabelecimento:', todasTransacoes.length);
  }
  
  // Ordenar por data (mais recente primeiro)
  todasTransacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  
  // Calcular total
  const total = todasTransacoes.reduce((acc, t) => acc + t.valor, 0);
  
  // Determinar fontes usadas
  const fontes: string[] = [];
  if (transacoesContas.length > 0) fontes.push('conta');
  if (transacoesCartao.length > 0) fontes.push('cartão');
  
  console.log('[UNIFICADA] Total transações:', todasTransacoes.length, '| Total:', total);
  
  // ===== FORMATAR RESPOSTA =====
  return formatarRespostaUnificada(todasTransacoes, total, {
    periodo: periodoConfig,
    labelPeriodo,
    conta: contaValidada?.name || config.conta,
    metodo: config.metodo,
    tipo: tipoTransacao,
    modo: config.modo,
    agrupar_por: config.agrupar_por,
    fontes,
    estabelecimento: config.estabelecimento
  });
}

// ============================================
// FORMATAÇÃO DE RESPOSTA UNIFICADA
// ============================================

function formatarRespostaUnificada(
  transacoes: TransacaoUnificada[],
  total: number,
  config: {
    periodo: PeriodoConfig;
    labelPeriodo: string;
    conta?: string;
    metodo?: MetodoPagamento;
    tipo?: TipoTransacao;
    modo?: 'resumo' | 'detalhado';
    agrupar_por?: TipoAgrupamento;
    fontes: string[];
    estabelecimento?: string;
  }
): string {
  // Montar título - com ou sem estabelecimento
  const tipoLabel = config.tipo === 'income' ? 'Receitas' : 'Gastos';
  const metodoLabel = config.metodo ? ` (${METODO_LABELS[config.metodo] || config.metodo})` : '';
  const contaLabel = config.conta ? `\n🏦 ${capitalizar(config.conta)}` : '';
  
  let msg = '';
  
  // Se tem estabelecimento, usar formato específico
  if (config.estabelecimento) {
    const estabelecimentoCapitalizado = capitalizar(config.estabelecimento);
    const emojiEstabelecimento = getEmojiEstabelecimento(config.estabelecimento);
    msg = `${emojiEstabelecimento} *Gastos com ${estabelecimentoCapitalizado}*\n`;
    msg += `📅 ${config.labelPeriodo}\n\n`;
  } else {
    msg = `📊 *${tipoLabel} de ${config.labelPeriodo}*${metodoLabel}${contaLabel}\n\n`;
  }
  
  if (transacoes.length === 0) {
    return msg + '✨ Nenhuma transação encontrada no período.';
  }
  
  // ===== MODO DETALHADO =====
  if (config.modo === 'detalhado') {
    // Formato limpo: data - valor (método)
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    transacoes.forEach(t => {
      const metodoLabel = getMetodoLabel(t.metodo);
      const parcelaInfo = t.parcela ? ` [${t.parcela}]` : '';
      msg += `• ${formatarDataCurta(t.data)} - ${formatarMoeda(t.valor)} (${metodoLabel})${parcelaInfo}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    console.log('[RESPOSTA] Modo detalhado: mostrando todas as', transacoes.length, 'transações');
  }
  // ===== AGRUPAR POR MÉTODO =====
  else if (config.agrupar_por === 'metodo') {
    const grupos = agruparTransacoes(transacoes, 'metodo');
    grupos.forEach(grupo => {
      const pct = total > 0 ? ((grupo.total / total) * 100).toFixed(0) : '0';
      const icon = METODO_ICONS[grupo.nome] || '📌';
      msg += `${icon} ${METODO_LABELS[grupo.nome] || grupo.nome}: ${formatarMoeda(grupo.total)} (${pct}%)\n`;
    });
  }
  // ===== AGRUPAR POR CONTA =====
  else if (config.agrupar_por === 'conta') {
    const grupos = agruparTransacoes(transacoes, 'conta');
    grupos.forEach(grupo => {
      const pct = total > 0 ? ((grupo.total / total) * 100).toFixed(0) : '0';
      msg += `🏦 ${grupo.nome || 'Cartão'}: ${formatarMoeda(grupo.total)} (${pct}%)\n`;
    });
  }
  // ===== AGRUPAR POR CARTÃO =====
  else if (config.agrupar_por === 'cartao') {
    const transacoesCartao = transacoes.filter(t => t.fonte === 'cartao');
    const grupos = agruparTransacoes(transacoesCartao, 'cartao');
    grupos.forEach(grupo => {
      const pct = total > 0 ? ((grupo.total / total) * 100).toFixed(0) : '0';
      msg += `💳 ${grupo.nome}: ${formatarMoeda(grupo.total)} (${pct}%)\n`;
    });
  }
  // ===== AGRUPAR POR DIA =====
  else if (config.agrupar_por === 'dia') {
    const grupos = agruparTransacoes(transacoes, 'data');
    grupos.slice(0, 10).forEach(grupo => {
      msg += `📅 ${formatarDataCurta(grupo.nome)}: ${formatarMoeda(grupo.total)}\n`;
    });
    if (grupos.length > 10) {
      msg += `_... e mais ${grupos.length - 10} dias_\n`;
    }
  }
  // ===== PADRÃO: POR CATEGORIA (TODAS) =====
  else {
    const grupos = agruparTransacoes(transacoes, 'categoria');
    grupos.forEach(grupo => {
      const pct = total > 0 ? ((grupo.total / total) * 100).toFixed(0) : '0';
      msg += `${getEmojiCategoria(grupo.nome)} ${grupo.nome}: ${formatarMoeda(grupo.total)} (${pct}%)\n`;
    });
  }
  
  // Rodapé com total e contagem
  const totalIcon = config.tipo === 'income' ? '💰' : '💰';
  msg += `\n${totalIcon} *Total:* ${formatarMoeda(total)}\n`;
  msg += `📊 *${transacoes.length} ${transacoes.length === 1 ? 'transação' : 'transações'}*`;
  
  return msg;
}

// Função auxiliar para agrupar transações
function agruparTransacoes(
  transacoes: TransacaoUnificada[], 
  campo: 'categoria' | 'conta' | 'cartao' | 'metodo' | 'data'
): { nome: string; total: number; count: number }[] {
  const grupos: Record<string, { total: number; count: number }> = {};
  
  transacoes.forEach(t => {
    const chave = (t as any)[campo] || 'Outros';
    if (!grupos[chave]) {
      grupos[chave] = { total: 0, count: 0 };
    }
    grupos[chave].total += t.valor;
    grupos[chave].count += 1;
  });
  
  return Object.entries(grupos)
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.total - a.total);
}

// Função auxiliar para formatar data curta
function formatarDataCurta(data: string): string {
  const d = new Date(data + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Função auxiliar para emoji de estabelecimento
function getEmojiEstabelecimento(estabelecimento: string): string {
  const estabLower = estabelecimento.toLowerCase();
  const emojis: Record<string, string> = {
    'uber': '🚗',
    '99': '🚗',
    'ifood': '🍔',
    'rappi': '🍔',
    'spotify': '🎵',
    'netflix': '🎬',
    'disney': '🎬',
    'hbo': '🎬',
    'amazon': '📦',
    'mercado livre': '📦',
    'magalu': '🛒',
    'americanas': '🛒',
    'shopee': '🛒',
    'starbucks': '☕',
    'mcdonalds': '🍔',
    'burger king': '🍔',
    'subway': '🥪',
    'outback': '🥩',
  };
  
  for (const [key, emoji] of Object.entries(emojis)) {
    if (estabLower.includes(key)) return emoji;
  }
  return '🏪';
}

// Função auxiliar para label de método de pagamento (texto legível)
function getMetodoLabel(metodo: string | null | undefined): string {
  if (!metodo) return '—'; // Não definido
  
  const labels: Record<string, string> = {
    'pix': 'PIX',
    'debit': 'Débito',
    'credit': 'Cartão',
    'boleto': 'Boleto',
    'cash': 'Dinheiro',
    'transfer': 'Transf.',
    'outros': '—'
  };
  return labels[metodo] || '—';
}

// Função auxiliar para emoji de categoria
function getEmojiCategoria(categoria: string): string {
  const emojis: Record<string, string> = {
    'Alimentação': '🍔',
    'Transporte': '🚗',
    'Lazer': '🎮',
    'Saúde': '💊',
    'Educação': '📚',
    'Moradia': '🏠',
    'Viagens': '✈️',
    'Compras': '🛒',
    'Assinaturas': '📱',
    'Pets': '🐾',
    'Investimentos': '📈',
    'Salário': '💰',
    'Outros': '📌'
  };
  return emojis[categoria] || '📌';
}

// ============================================
// GERAR RESUMO FINANCEIRO
// ============================================

export async function gerarResumo(userId: string): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  // Buscar saldo total das contas
  const { data: accounts } = await supabase
    .from('accounts')
    .select('current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('type', 'credit_card');
  
  const saldoTotal = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;
  
  // Buscar gastos do mês
  const { data: despesas } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('transaction_date', inicioMes.toISOString().split('T')[0])
    .lte('transaction_date', hoje.toISOString().split('T')[0]);
  
  const gastosDoMes = despesas?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  // Buscar receitas do mês
  const { data: receitas } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('transaction_date', inicioMes.toISOString().split('T')[0])
    .lte('transaction_date', hoje.toISOString().split('T')[0]);
  
  const receitasDoMes = receitas?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  // Calcular saldo do mês
  const saldoMes = receitasDoMes - gastosDoMes;
  
  // Montar mensagem
  let mensagem = `📋 *Resumo Financeiro*\n`;
  mensagem += `📅 ${obterNomeMes(hoje)} de ${hoje.getFullYear()}\n\n`;
  
  mensagem += `💰 *Saldo em Contas*: ${formatarMoeda(saldoTotal)}\n\n`;
  
  mensagem += `🟢 Receitas: +${formatarMoeda(receitasDoMes)}\n`;
  mensagem += `🔴 Despesas: -${formatarMoeda(gastosDoMes)}\n`;
  mensagem += `━━━━━━━━━━━━━━━━\n`;
  
  const emojiSaldo = saldoMes >= 0 ? '✅' : '⚠️';
  mensagem += `${emojiSaldo} *Saldo do mês*: ${formatarMoeda(saldoMes)}`;
  
  // Dicas baseadas na situação
  if (saldoMes < 0) {
    mensagem += `\n\n💡 _Atenção! Você está gastando mais do que recebe._`;
  } else if (receitasDoMes > 0) {
    const percentualEconomia = ((saldoMes / receitasDoMes) * 100).toFixed(0);
    if (Number(percentualEconomia) >= 20) {
      mensagem += `\n\n🎉 _Parabéns! Você está economizando ${percentualEconomia}% da sua renda!_`;
    } else if (Number(percentualEconomia) >= 10) {
      mensagem += `\n\n👍 _Bom! Você está economizando ${percentualEconomia}%. Tente chegar a 20%!_`;
    } else if (Number(percentualEconomia) > 0) {
      mensagem += `\n\n💪 _Você está economizando ${percentualEconomia}%. Que tal aumentar um pouco?_`;
    }
  }
  
  // Dias restantes no mês
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = ultimoDia - hoje.getDate();
  if (diasRestantes > 0) {
    mensagem += `\n\n📆 _${diasRestantes} dias restantes no mês_`;
  }
  
  return mensagem;
}

// ============================================
// PROCESSAR CONSULTA (FUNÇÃO PRINCIPAL)
// ============================================

export async function processarConsulta(
  intencao: IntencaoConsulta,
  userId: string
): Promise<string> {
  console.log('[CONSULTA] Processando:', intencao.tipo, '| Param:', intencao.parametro, '| Periodo:', intencao.periodo);
  
  switch (intencao.tipo) {
    case 'saldo':
      return await consultarSaldo(userId);
    
    case 'saldo_especifico':
      return await consultarSaldoEspecifico(userId, intencao.parametro || '');
    
    case 'gastos':
      return await consultarGastos(userId, intencao.periodo);
    
    case 'receitas':
      return await consultarReceitas(userId, intencao.periodo);
    
    case 'resumo':
      return await gerarResumo(userId);
    
    default:
      return '❓ Não entendi sua consulta. Tente:\n• "meu saldo"\n• "quanto gastei"\n• "quanto recebi"\n• "resumo"';
  }
}
