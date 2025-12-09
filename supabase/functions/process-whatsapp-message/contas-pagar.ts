// ============================================
// CONTAS-PAGAR.TS - Gestão de Contas a Pagar
// Personal Finance LA - Ana Clara
// FASE 3.1: Consultas | FASE 3.2: CRUD
// ============================================

import { getSupabase } from './utils.ts';

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
  | null;

// ============================================
// ALIASES DE CONTAS (FASE 3.2)
// ============================================

export const CONTA_ALIASES: Record<string, string[]> = {
  'luz': ['luz', 'energia', 'enel', 'cpfl', 'eletropaulo', 'light', 'cemig', 'celpe', 'energisa', 'coelba', 'eletricidade'],
  'agua': ['agua', 'água', 'sabesp', 'copasa', 'sanepar', 'cedae', 'cagece', 'esgoto', 'saneamento'],
  'internet': ['internet', 'wifi', 'net', 'vivo fibra', 'claro net', 'banda larga', 'oi fibra', 'fibra'],
  'aluguel': ['aluguel', 'alugel', 'moradia', 'locação', 'locacao'],
  'condominio': ['condominio', 'condomínio', 'cond', 'taxa condominial'],
  'gas': ['gas', 'gás', 'comgas', 'ultragaz', 'supergasbras', 'liquigás', 'naturgy'],
  'telefone': ['telefone', 'celular', 'móvel', 'movel', 'vivo', 'claro', 'tim', 'oi'],
  'netflix': ['netflix'],
  'spotify': ['spotify', 'deezer', 'apple music'],
  'amazon': ['amazon', 'prime', 'amazon prime'],
  'disney': ['disney', 'disney+', 'disneyplus'],
  'hbo': ['hbo', 'hbo max', 'max'],
  'globoplay': ['globoplay', 'globo play'],
  'seguro': ['seguro', 'seguro auto', 'seguro carro', 'seguro vida', 'seguro residencial'],
  'plano_saude': ['plano de saúde', 'plano saude', 'unimed', 'bradesco saúde', 'sulamerica', 'amil', 'hapvida'],
  'escola': ['escola', 'faculdade', 'mensalidade', 'curso', 'universidade'],
  'financiamento': ['financiamento', 'prestação', 'parcela carro', 'parcela casa', 'consórcio'],
  'iptu': ['iptu', 'imposto predial'],
  'ipva': ['ipva', 'licenciamento', 'detran'],
  'academia': ['academia', 'gym', 'smart fit', 'bluefit'],
};

// Normaliza nome da conta usando aliases
export function normalizarNomeConta(texto: string): string {
  const textoLower = texto.toLowerCase().trim();
  for (const [nomeNormalizado, aliases] of Object.entries(CONTA_ALIASES)) {
    if (aliases.some(alias => textoLower.includes(alias))) {
      // Capitaliza primeira letra
      return nomeNormalizado.charAt(0).toUpperCase() + nomeNormalizado.slice(1);
    }
  }
  // Retorna original capitalizado se não encontrar alias
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Interface para dados de cadastro
export interface DadosCadastroConta {
  descricao: string;
  valor?: number;           // Opcional para variáveis
  diaVencimento?: number;   // 1-31
  recorrencia: 'unica' | 'mensal' | 'anual' | 'semanal';
  parcelas?: number;
  parcelaAtual?: number;
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

function calcularDiasParaVencimento(dueDate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dueDate + 'T12:00:00');
  vencimento.setHours(0, 0, 0, 0);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
  
  const hoje = new Date();
  
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
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + dias);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];
  
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
  const hoje = new Date();
  const mesAlvo = mes ?? hoje.getMonth();
  const anoAlvo = ano ?? hoje.getFullYear();
  
  const inicioMes = new Date(anoAlvo, mesAlvo, 1);
  const fimMes = new Date(anoAlvo, mesAlvo + 1, 0);
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0])
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
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0]);
  
  // Buscar faturas do mês
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select('total_amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0]);
  
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

// ============================================
// PROCESSAR RESPOSTA DA DESAMBIGUAÇÃO
// ============================================

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
    
    default:
      return { 
        mensagem: `❓ Não entendi o que você quer fazer com contas.\n\n💡 Tente:\n• _"minhas contas"_\n• _"o que vence essa semana"_\n• _"contas vencidas"_\n• _"resumo de contas"_` 
      };
  }
}

// ============================================
// FASE 3.2: CADASTRAR CONTA
// ============================================

async function processarCadastroConta(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  
  // Extrair dados das entidades
  const descricaoRaw = entidades.descricao as string || entidades.nome_conta as string || '';
  const valor = entidades.valor as number | undefined;
  const diaVencimento = entidades.dia_vencimento as number | undefined;
  const recorrente = entidades.recorrente as boolean || entidades.recorrencia === 'mensal';
  const parcelas = entidades.parcelas as number | undefined;
  
  if (!descricaoRaw) {
    return { 
      mensagem: `❓ Qual conta você quer cadastrar?\n\n💡 Exemplo:\n_"tenho que pagar 150 de luz dia 10"_` 
    };
  }
  
  // Normalizar nome
  const descricao = normalizarNomeConta(descricaoRaw);
  const emoji = getEmojiConta(descricao);
  
  // Verificar duplicação
  const contaExistente = await buscarContaPorNome(userId, descricao);
  
  if (contaExistente) {
    // Conta já existe - perguntar o que fazer
    return {
      mensagem: templateContaDuplicada(contaExistente, valor),
      precisaConfirmacao: true,
      dados: { 
        step: 'awaiting_duplicate_decision',
        conta_existente_id: contaExistente.id,
        novo_valor: valor,
        phone
      }
    };
  }
  
  // Se falta o dia de vencimento, perguntar
  if (!diaVencimento) {
    return {
      mensagem: templatePerguntarDiaVencimento(descricao),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_due_day',
        descricao,
        valor,
        recorrente,
        parcelas,
        phone
      }
    };
  }
  
  // Calcular due_date
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  
  // Se o dia já passou neste mês, usar próximo mês
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  // Inserir no banco
  const { data: novaConta, error } = await supabase
    .from('payable_bills')
    .insert({
      user_id: userId,
      description: descricao,
      amount: valor || 0,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_recurring: recorrente,
      bill_type: valor ? 'fixed' : 'variable',
      recurrence_config: recorrente ? { type: 'monthly', day: diaVencimento } : null,
      installment_number: parcelas ? 1 : null,
      installment_total: parcelas || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao cadastrar conta:', error);
    return { mensagem: `❌ Erro ao cadastrar conta. Tente novamente.` };
  }
  
  return {
    mensagem: templateContaCadastrada({
      descricao,
      emoji,
      valor,
      diaVencimento,
      recorrente,
      variavel: !valor,
      parcelas
    })
  };
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
    valorNovo = normalizarNomeConta(String(novoValor));
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
  const nomeNormalizado = normalizarNomeConta(nome).toLowerCase();
  
  // Buscar todas as contas do usuário
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue']);
  
  if (!contas || contas.length === 0) return null;
  
  // Buscar por match exato ou parcial
  const contaEncontrada = contas.find((c: any) => {
    const descLower = c.description.toLowerCase();
    return descLower === nomeNormalizado || 
           descLower.includes(nomeNormalizado) ||
           nomeNormalizado.includes(descLower);
  });
  
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
