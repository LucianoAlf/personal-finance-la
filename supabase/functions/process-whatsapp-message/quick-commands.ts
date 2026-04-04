// ============================================
// QUICK-COMMANDS.TS - Comandos Rápidos
// Modularização v1.0 - Dezembro 2025
// ============================================

import { getSupabase, enviarViaEdgeFunction, formatCurrency, todayBrasilia } from './utils.ts';

// ============================================
// VERIFICAR SE É COMANDO RÁPIDO
// ============================================

const COMANDOS_RAPIDOS = [
  'saldo', '/saldo',
  'resumo', '/resumo',
  'contas', '/contas',
  'cartoes', '/cartoes', 'cartões',
  'metas', '/metas', 'meta',
  'investimentos', '/investimentos', 'investimento',
  'ajuda', '/ajuda', 'help'
];

export function isComandoRapido(texto: string): boolean {
  const textoLower = texto.toLowerCase().trim();
  return COMANDOS_RAPIDOS.includes(textoLower);
}

// ============================================
// PROCESSAR COMANDO RÁPIDO
// ============================================

export async function processarComandoRapido(
  texto: string, 
  userId: string, 
  phone: string
): Promise<string> {
  const comando = texto.toLowerCase().trim().replace('/', '');
  
  let responseText = '';
  
  switch (comando) {
    case 'saldo':
      responseText = await comandoSaldo(userId);
      break;
      
    case 'resumo':
      responseText = await comandoResumo(userId);
      break;
      
    case 'contas':
      responseText = await comandoContas(userId);
      break;
      
    case 'cartoes':
    case 'cartões':
      responseText = await comandoCartoes(userId);
      break;
      
    case 'metas':
    case 'meta':
      responseText = await comandoMetas(userId);
      break;
      
    case 'investimentos':
    case 'investimento':
      responseText = await comandoInvestimentos(userId);
      break;
      
    case 'ajuda':
    case 'help':
      responseText = comandoAjuda();
      break;
      
    default:
      responseText = '❓ Comando não reconhecido. Digite "ajuda" para ver os comandos.';
  }
  
  // Enviar resposta
  await enviarViaEdgeFunction(phone, responseText);
  
  return responseText;
}

// ============================================
// COMANDO: SALDO
// ============================================

async function comandoSaldo(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('current_balance', { ascending: false });
  
  if (!accounts || accounts.length === 0) {
    return '💰 Nenhuma conta cadastrada.\n\n💡 Cadastre suas contas no app para acompanhar seus saldos!';
  }
  
  // Usar insights inteligentes da Ana Clara
  try {
    const { gerarInsightsSaldo } = await import('./insights-ana-clara.ts');
    return await gerarInsightsSaldo(userId, accounts);
  } catch (error) {
    console.error('[SALDO] Erro ao gerar insights:', error);
    
    // Fallback simples se insights falhar
    let total = 0;
    let mensagem = '💰 *Seus Saldos*\n\n';
    
    for (const acc of accounts) {
      const balance = Number(acc.current_balance);
      const emoji = balance < 0 ? '🔴' : '🟢';
      mensagem += `${emoji} *${acc.name}*: ${formatCurrency(balance)}\n`;
      total += balance;
    }
    
    mensagem += `\n━━━━━━━━━━━━━━\n`;
    mensagem += `💵 *Total:* ${formatCurrency(total)}`;
    
    if (total < 0) {
      mensagem += `\n\n⚠️ _Atenção: seu saldo total está negativo!_`;
    }
    
    return mensagem;
  }
}

// ============================================
// COMANDO: RESUMO
// ============================================

async function comandoResumo(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar resumo do mês atual
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('transaction_date', inicioMes.toISOString().split('T')[0]);
  
  let receitas = 0;
  let despesas = 0;
  
  transactions?.forEach((t: { amount: number | string; type: string }) => {
    if (t.type === 'income') receitas += Number(t.amount);
    else if (t.type === 'expense') despesas += Number(t.amount);
  });
  
  const saldo = receitas - despesas;
  const emoji = saldo >= 0 ? '✅' : '⚠️';
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  
  return `📊 *Resumo de ${mesNome}*\n\n` +
    `💰 Receitas: ${formatCurrency(receitas)}\n` +
    `💸 Despesas: ${formatCurrency(despesas)}\n` +
    `━━━━━━━━━━━━━━\n` +
    `${emoji} Saldo: ${formatCurrency(saldo)}\n\n` +
    `_${saldo >= 0 ? '🎉 Você economizou este mês!' : '⚠️ Atenção aos gastos!'}_`;
}

// ============================================
// COMANDO: CONTAS A PAGAR
// ============================================

async function comandoContas(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const hoje = todayBrasilia();
  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() + 7);
  
  const { data: bills } = await supabase
    .from('payable_bills')
    .select('description, amount, due_date, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .lte('due_date', seteDias.toISOString().split('T')[0])
    .order('due_date');
  
  if (!bills || bills.length === 0) {
    return '✅ Nenhuma conta pendente nos próximos 7 dias!';
  }
  
  let mensagem = '📋 *Contas a Pagar*\n\n';
  let total = 0;
  
  for (const bill of bills) {
    const isVencida = bill.due_date < hoje;
    const isHoje = bill.due_date === hoje;
    const emoji = isVencida ? '🔴' : isHoje ? '🟡' : '🟢';
    
    const dueDate = new Date(bill.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const whenText = diffDays < 0 ? 'Vencida' : diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`;
    
    mensagem += `${emoji} ${bill.description}\n`;
    mensagem += `   ${formatCurrency(Number(bill.amount))} - ${whenText}\n\n`;
    
    total += Number(bill.amount);
  }
  
  mensagem += `━━━━━━━━━━━━━━\n`;
  mensagem += `💰 Total: ${formatCurrency(total)}`;
  
  return mensagem;
}

// ============================================
// COMANDO: CARTÕES
// ============================================

async function comandoCartoes(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: cards } = await supabase
    .from('credit_cards')
    .select('id, name, last_four_digits, due_day, credit_limit')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_archived', false);
  
  if (!cards || cards.length === 0) {
    return '💳 Nenhum cartão cadastrado.';
  }
  
  let mensagem = '💳 *Seus Cartões*\n\n';
  
  for (const card of cards) {
    // Buscar gastos do mês atual
    const { data: cardTransactions } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', card.id)
      .gte('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .lt('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]);
    
    const totalSpent = cardTransactions?.reduce((sum: number, ct: { amount: number | string }) => 
      sum + Math.abs(Number(ct.amount)), 0) || 0;
    
    const limit = Number(card.credit_limit);
    const usedPercent = limit > 0 ? (totalSpent / limit * 100).toFixed(0) : 0;
    
    // Calcular dias até vencimento
    const today = new Date();
    const currentDay = today.getDate();
    const dueDay = card.due_day;
    let daysUntilDue;
    
    if (currentDay <= dueDay) {
      daysUntilDue = dueDay - currentDay;
    } else {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      daysUntilDue = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const whenText = daysUntilDue === 0 ? 'Hoje' : daysUntilDue === 1 ? 'Amanhã' : `Em ${daysUntilDue} dias`;
    const lastFour = card.last_four_digits ? `(****${card.last_four_digits})` : '';
    
    mensagem += `*${card.name}* ${lastFour}\n`;
    mensagem += `💰 Fatura: ${formatCurrency(totalSpent)}\n`;
    mensagem += `📊 Limite: ${formatCurrency(limit)} (${usedPercent}% usado)\n`;
    mensagem += `📅 Vencimento: ${whenText} (dia ${dueDay})\n\n`;
  }
  
  return mensagem;
}

// ============================================
// COMANDO: METAS
// ============================================

async function comandoMetas(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: goals } = await supabase
    .from('financial_goals')
    .select('name, target_amount, current_amount, deadline, icon, goal_type')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('goal_type', 'savings')
    .order('deadline');
  
  if (!goals || goals.length === 0) {
    return '🎯 Nenhuma meta ativa.';
  }
  
  let mensagem = '🎯 *Suas Metas*\n\n';
  
  for (const goal of goals) {
    const icon = goal.icon || '🎯';
    const target = Number(goal.target_amount);
    const current = Number(goal.current_amount || 0);
    const percentual = target > 0 ? (current / target * 100) : 0;
    const barra = gerarBarraProgresso(percentual);
    
    let deadlineText = '';
    if (goal.deadline) {
      const targetDate = new Date(goal.deadline);
      const today = new Date();
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) deadlineText = ' (vencida)';
      else if (diffDays === 0) deadlineText = ' (hoje)';
      else if (diffDays <= 30) deadlineText = ` (${diffDays} dias)`;
    }
    
    mensagem += `${icon} *${goal.name}*${deadlineText}\n`;
    mensagem += `   ${barra} ${percentual.toFixed(0)}%\n`;
    mensagem += `   ${formatCurrency(current)} / ${formatCurrency(target)}\n\n`;
  }
  
  return mensagem;
}

// ============================================
// COMANDO: INVESTIMENTOS
// ============================================

async function comandoInvestimentos(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: investments } = await supabase
    .from('investments')
    .select('name, ticker, quantity, average_price, current_price, type')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!investments || investments.length === 0) {
    return '💼 Nenhum investimento cadastrado.';
  }
  
  let totalInvestido = 0;
  let totalAtual = 0;
  let mensagem = '💼 *Seu Portfólio*\n\n';
  
  const typeEmojis: Record<string, string> = {
    stock: '📊',
    fund: '🏦',
    treasury: '🏛️',
    crypto: '₿',
    real_estate: '🏠',
    other: '💼'
  };
  
  for (const inv of investments) {
    const investido = Number(inv.quantity) * Number(inv.average_price);
    const atual = Number(inv.quantity) * Number(inv.current_price);
    const retorno = investido > 0 ? ((atual / investido - 1) * 100).toFixed(2) : '0.00';
    const emoji = typeEmojis[inv.type] || '💼';
    const sinal = Number(retorno) >= 0 ? '📈' : '📉';
    
    mensagem += `${emoji} *${inv.ticker || inv.name}*\n`;
    mensagem += `   ${formatCurrency(atual)} (${sinal} ${retorno}%)\n\n`;
    
    totalInvestido += investido;
    totalAtual += atual;
  }
  
  const retornoTotal = totalInvestido > 0 
    ? ((totalAtual / totalInvestido - 1) * 100).toFixed(2) 
    : '0.00';
  
  mensagem += `━━━━━━━━━━━━━━\n`;
  mensagem += `💰 Total: ${formatCurrency(totalAtual)}\n`;
  mensagem += `📊 Retorno: ${retornoTotal}%`;
  
  return mensagem;
}

// ============================================
// COMANDO: AJUDA
// ============================================

function comandoAjuda(): string {
  return `🙋🏻‍♀️ *Ana Clara • Personal Finance*\n\n` +
    `*Comandos Rápidos:*\n` +
    `💰 saldo - Ver saldos das contas\n` +
    `📊 resumo - Resumo do mês\n` +
    `📋 contas - Contas a pagar\n` +
    `💳 cartões - Limites dos cartões\n` +
    `🎯 metas - Progresso das metas\n` +
    `💼 investimentos - Portfólio\n\n` +
    `*Para registrar:*\n` +
    `"Gastei 50 no mercado"\n` +
    `"Recebi 1000 de salário"\n` +
    `"Paguei 200 de luz"\n\n` +
    `*Para consultar:*\n` +
    `"Quanto gastei no iFood?"\n` +
    `"Quanto gastei esse mês?"\n\n` +
    `🎤 Você também pode enviar *áudios*!`;
}

// ============================================
// HELPERS
// ============================================

function gerarBarraProgresso(percentual: number): string {
  const cheio = Math.min(Math.floor(percentual / 10), 10);
  const vazio = 10 - cheio;
  return '█'.repeat(cheio) + '░'.repeat(vazio);
}
