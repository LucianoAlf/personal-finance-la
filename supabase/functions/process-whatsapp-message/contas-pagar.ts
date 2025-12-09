// ============================================
// CONTAS-PAGAR.TS - Gestão de Contas a Pagar
// Personal Finance LA - Ana Clara
// FASE 3.1: Consultas
// ============================================

import { getSupabase } from './utils.ts';

// ============================================
// TIPOS
// ============================================

export type TipoIntencaoContaPagar = 
  | 'LISTAR_CONTAS_PAGAR'      // "minhas contas", "contas a pagar"
  | 'CONTAS_VENCENDO'          // "o que vence essa semana"
  | 'CONTAS_VENCIDAS'          // "contas vencidas", "atrasadas"
  | 'CONTAS_DO_MES'            // "contas desse mês"
  | 'RESUMO_CONTAS_MES'        // "quanto tenho de contas", "resumo"
  | 'CADASTRAR_CONTA_PAGAR'    // (fase 3.2)
  | 'EDITAR_CONTA_PAGAR'       // (fase 3.2)
  | 'EXCLUIR_CONTA_PAGAR'      // (fase 3.2)
  | 'MARCAR_CONTA_PAGA'        // (fase 3.3)
  | 'VALOR_CONTA_VARIAVEL'     // (fase 3.3)
  | 'HISTORICO_CONTA'          // (fase 3.3)
  | null;

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

function getEmojiConta(nome: string): string {
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
  
  let mensagem = `📋 *Suas Contas a Pagar*\n📅 ${obterNomeMes(hoje)}/${hoje.getFullYear()}\n\n`;
  
  let indexGlobal = 1;
  
  // VENCIDAS
  if (vencidas.length > 0) {
    mensagem += `🔴 *VENCIDAS*\n`;
    for (const t of vencidas) {
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      const dias = Math.abs(calcularDiasParaVencimento(t.due_date));
      mensagem += `${indexGlobal}. ${emoji} ${t.description} (${formatarData(t.due_date)}): ${formatarMoeda(t.amount)} ⚠️ _há ${dias}d_\n`;
      
      // Atualizar index na conta original
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      
      indexGlobal++;
    }
    mensagem += `\n`;
  }
  
  // PRÓXIMOS 7 DIAS
  if (proximos7.length > 0) {
    mensagem += `🟡 *PRÓXIMOS 7 DIAS*\n`;
    for (const t of proximos7) {
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      const dias = calcularDiasParaVencimento(t.due_date);
      let label = '';
      if (dias === 0) {
        label = '🔔 HOJE';
      } else if (dias === 1) {
        label = 'amanhã';
      } else if (dias <= 3) {
        label = `⚠️ ${dias}d`;
      } else {
        label = `${dias}d`;
      }
      mensagem += `${indexGlobal}. ${emoji} ${t.description} (${formatarData(t.due_date)}): ${formatarMoeda(t.amount)} _${label}_\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      
      indexGlobal++;
    }
    mensagem += `\n`;
  }
  
  // RESTANTE DO MÊS
  if (restante.length > 0) {
    mensagem += `🟢 *RESTANTE DO MÊS*\n`;
    for (const t of restante.slice(0, 5)) {
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      mensagem += `${indexGlobal}. ${emoji} ${t.description} (${formatarData(t.due_date)}): ${formatarMoeda(t.amount)}\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      
      indexGlobal++;
    }
    if (restante.length > 5) {
      mensagem += `   _... e mais ${restante.length - 5} contas_\n`;
    }
  }
  
  // TOTAL
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total pendente:* ${formatarMoeda(total)}`;
  
  // Dica de atalho
  mensagem += `\n\n💡 _Pagar rápido: "paguei a 1" ou "paguei a luz"_`;
  
  if (vencidas.length > 0) {
    mensagem += `\n\n⚠️ _Você tem ${vencidas.length} conta(s) vencida(s)!_`;
  }
  
  return { mensagem, contas };
}

// ============================================
// CONTAS VENCENDO (PRÓXIMOS X DIAS)
// ============================================

export async function contasVencendo(userId: string, dias: number = 7): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + dias);
  
  // Buscar contas
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .lte('due_date', dataLimite.toISOString().split('T')[0])
    .order('due_date', { ascending: true });
  
  // Buscar faturas
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
    .lte('due_date', dataLimite.toISOString().split('T')[0])
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
  
  let mensagem = `📅 *Vencimentos - Próximos ${dias} dias*\n${formatarData(hoje.toISOString().split('T')[0])} a ${formatarData(dataLimite.toISOString().split('T')[0])}\n\n`;
  
  // Agrupar
  const vencidos = todos.filter(t => calcularDiasParaVencimento(t.due_date) < 0);
  const hojeList = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 0);
  const amanha = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 1);
  const restante = todos.filter(t => calcularDiasParaVencimento(t.due_date) > 1);
  
  if (vencidos.length > 0) {
    mensagem += `🔴 *VENCIDO*\n`;
    for (const t of vencidos) {
      const diasAtraso = Math.abs(calcularDiasParaVencimento(t.due_date));
      mensagem += `${t.emoji} ${t.description} (${formatarDataComDia(t.due_date)}): ${formatarMoeda(t.amount)} ⚠️ _há ${diasAtraso}d_\n`;
    }
    mensagem += `\n`;
  }
  
  if (hojeList.length > 0) {
    mensagem += `🟠 *HOJE*\n`;
    for (const t of hojeList) {
      mensagem += `${t.emoji} ${t.description}: ${formatarMoeda(t.amount)} 🔔\n`;
    }
    mensagem += `\n`;
  }
  
  if (amanha.length > 0) {
    mensagem += `🟡 *AMANHÃ*\n`;
    for (const t of amanha) {
      mensagem += `${t.emoji} ${t.description}: ${formatarMoeda(t.amount)}\n`;
    }
    mensagem += `\n`;
  }
  
  if (restante.length > 0) {
    mensagem += `🟢 *ESTA SEMANA*\n`;
    for (const t of restante) {
      const diasRestantes = calcularDiasParaVencimento(t.due_date);
      mensagem += `${t.emoji} ${t.description} (${formatarDataComDia(t.due_date)}): ${formatarMoeda(t.amount)} _${diasRestantes}d_\n`;
    }
  }
  
  // Total
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(total)}`;
  
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
  
  let mensagem = `🔴 *Contas Vencidas*\n\n`;
  let total = 0;
  
  for (const c of vencidas) {
    const emoji = getEmojiConta(c.description);
    const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
    mensagem += `${emoji} ${c.description} (${formatarDataComDia(c.due_date)}): ${formatarMoeda(c.amount)} _há ${dias}d_\n`;
    total += Number(c.amount);
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total em atraso:* ${formatarMoeda(total)}\n\n`;
  mensagem += `⚠️ _Regularize o quanto antes para evitar juros!_\n\n`;
  mensagem += `💡 _Para pagar: "paguei a luz" ou "paguei 185 de luz"_`;
  
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
    
    // Fases 3.2 e 3.3 serão implementadas depois
    case 'CADASTRAR_CONTA_PAGAR':
    case 'EDITAR_CONTA_PAGAR':
    case 'EXCLUIR_CONTA_PAGAR':
      return { 
        mensagem: `🚧 _Funcionalidade em desenvolvimento..._\n\nEm breve você poderá cadastrar e editar contas!\n\n💡 Por enquanto, use:\n• _"minhas contas"_\n• _"o que vence essa semana"_` 
      };
    
    case 'MARCAR_CONTA_PAGA':
    case 'VALOR_CONTA_VARIAVEL':
    case 'HISTORICO_CONTA':
      return { 
        mensagem: `🚧 _Funcionalidade em desenvolvimento..._\n\nEm breve você poderá marcar contas como pagas!\n\n💡 Por enquanto, use:\n• _"minhas contas"_\n• _"contas vencidas"_` 
      };
    
    default:
      return { 
        mensagem: `❓ Não entendi o que você quer fazer com contas.\n\n💡 Tente:\n• _"minhas contas"_\n• _"o que vence essa semana"_\n• _"contas vencidas"_\n• _"resumo de contas"_` 
      };
  }
}
