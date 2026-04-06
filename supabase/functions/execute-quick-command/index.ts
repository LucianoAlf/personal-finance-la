/**
 * EDGE FUNCTION: execute-quick-command
 * Responsabilidade: Executar comandos rápidos do WhatsApp
 * 
 * Comandos suportados:
 * - saldo: Retorna saldo total
 * - resumo [período]: Resumo financeiro
 * - contas: Contas a vencer
 * - meta [nome]: Status de meta
 * - investimentos: Resumo do portfólio
 * - cartões: Faturas de cartão
 * - ajuda: Lista comandos
 * - relatório [mês]: Relatório completo
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CommandRequest {
  user_id: string;
  command: string;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { user_id, command }: CommandRequest = await req.json();
    
    console.log(`⚡ Executando comando: ${command} para usuário ${user_id}`);
    
    // Parse comando e parâmetros
    const parts = command.toLowerCase().trim().split(' ');
    const cmd = parts[0];
    const params = parts.slice(1);
    
    let response: any;
    
    switch (cmd) {
      case 'saldo':
        response = await getSaldo(supabase, user_id);
        break;
      
      case 'resumo':
        response = await getResumo(supabase, user_id, params[0] || 'mês');
        break;
      
      case 'contas':
        response = await getContas(supabase, user_id);
        break;
      
      case 'meta':
        response = await getMeta(supabase, user_id, params.join(' '));
        break;
      
      case 'investimentos':
        response = await getInvestimentos(supabase, user_id);
        break;
      
      case 'cartões':
      case 'cartoes':
        response = await getCartoes(supabase, user_id);
        break;
      
      case 'ajuda':
      case 'help':
        response = getAjuda();
        break;
      
      case 'relatório':
      case 'relatorio':
        response = await getRelatorio(supabase, user_id, params[0]);
        break;
      
      default:
        response = {
          success: false,
          message: `Comando "${cmd}" não reconhecido. Digite "ajuda" para ver os comandos disponíveis.`,
        };
    }
    
    // Atualizar estatísticas do comando
    if (response.success) {
      await supabase
        .from('whatsapp_quick_commands')
        .update({
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString(),
        })
        .eq('command', cmd);
    }
    
    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao executar comando:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * COMANDO: saldo
 * Retorna saldo total de todas as contas
 */
async function getSaldo(supabase: any, userId: string) {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
  
  return {
    success: true,
    message: `💰 *Seu Saldo Total*\n\nR$ ${formatCurrency(totalBalance)}\n\n_Atualizado agora_`,
    data: { total_balance: totalBalance },
  };
}

/**
 * COMANDO: resumo [período]
 * Resumo financeiro do período (dia/semana/mês)
 */
async function getResumo(supabase: any, userId: string, period: string) {
  let startDate: Date;
  const now = new Date();
  
  switch (period) {
    case 'dia':
    case 'hoje':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'semana':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'mês':
    case 'mes':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  // Buscar transações do período
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lte('date', now.toISOString());
  
  if (error) throw error;
  
  const income = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  
  const balance = income - expenses;
  const balanceEmoji = balance >= 0 ? '✅' : '⚠️';
  
  return {
    success: true,
    message: `📊 *Resumo ${period === 'dia' ? 'do Dia' : period === 'semana' ? 'da Semana' : 'do Mês'}*\n\n` +
             `💵 Receitas: R$ ${formatCurrency(income)}\n` +
             `💸 Despesas: R$ ${formatCurrency(expenses)}\n` +
             `${balanceEmoji} Saldo: R$ ${formatCurrency(balance)}`,
    data: { income, expenses, balance, period },
  };
}

/**
 * COMANDO: contas
 * Lista contas a vencer nos próximos 7 dias
 */
async function getContas(supabase: any, userId: string) {
  const today = new Date();
  const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const { data: bills, error } = await supabase
    .from('payable_bills')
    .select('description, amount, due_date')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .gte('due_date', today.toISOString())
    .lte('due_date', next7Days.toISOString())
    .order('due_date', { ascending: true })
    .limit(10);
  
  if (error) throw error;
  
  if (bills.length === 0) {
    return {
      success: true,
      message: '✅ *Contas a Pagar*\n\nVocê não tem contas a vencer nos próximos 7 dias!',
      data: { bills: [] },
    };
  }
  
  const total = bills.reduce((sum: number, b: any) => sum + b.amount, 0);
  
  let message = `📋 *Contas a Pagar (${bills.length})*\n\n`;
  
  bills.forEach((bill: any, index: number) => {
    const dueDate = new Date(bill.due_date);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const urgency = daysUntil <= 1 ? '🔴' : daysUntil <= 3 ? '🟡' : '🟢';
    
    message += `${urgency} ${bill.description}\n`;
    message += `   R$ ${formatCurrency(bill.amount)} - ${daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}\n\n`;
  });
  
  message += `💰 Total: R$ ${formatCurrency(total)}`;
  
  return {
    success: true,
    message,
    data: { bills, total, count: bills.length },
  };
}

/**
 * COMANDO: meta [nome]
 * Status de meta específica
 */
async function getMeta(supabase: any, userId: string, goalName: string) {
  if (!goalName) {
    const { data: goals, error } = await supabase
      .from('financial_goals')
      .select('name, target_amount, current_amount, goal_type, period_end, category:categories(name)')
      .eq('user_id', userId)
      .in('status', ['active', 'exceeded'])
      .limit(5);
    
    if (error) throw error;
    
    if ((goals || []).length === 0) {
      return {
        success: true,
        message: '🎯 *Metas Financeiras*\n\nVocê ainda não tem metas cadastradas.',
        data: { goals: [] },
      };
    }
    
    let message = '🎯 *Suas Metas Ativas*\n\n';
    
    goals.forEach((goal: any) => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const progressBar = getProgressBar(progress);
      const label = goal.goal_type === 'spending_limit'
        ? (goal.category?.name || goal.name)
        : goal.name;
      
      message += `${label}\n`;
      message += `${progressBar} ${progress.toFixed(0)}%${goal.goal_type === 'spending_limit' ? ' do limite' : ''}\n`;
      message += `R$ ${formatCurrency(goal.current_amount)} de R$ ${formatCurrency(goal.target_amount)}\n\n`;
    });
    
    return {
      success: true,
      message,
      data: { goals },
    };
  }
  
  // Buscar meta específica
  const { data: goals, error } = await supabase
    .from('financial_goals')
    .select('*, category:categories(name)')
    .eq('user_id', userId)
    .in('status', ['active', 'exceeded'])
    .limit(20);

  const normalizedGoalName = goalName.trim().toLowerCase();
  const goal = (goals || []).find((item: any) => {
    const name = String(item.name || '').toLowerCase();
    const categoryName = String(item.category?.name || '').toLowerCase();
    return name.includes(normalizedGoalName) || categoryName.includes(normalizedGoalName);
  });
  
  if (error || !goal) {
    return {
      success: false,
      message: `Meta "${goalName}" não encontrada. Digite "meta" para ver todas as suas metas.`,
    };
  }
  
  const progress = (goal.current_amount / goal.target_amount) * 100;
  const remaining = goal.target_amount - goal.current_amount;
  const progressBar = getProgressBar(progress);
  const label = goal.goal_type === 'spending_limit' ? (goal.category?.name || goal.name) : goal.name;
  
  return {
    success: true,
    message: goal.goal_type === 'spending_limit'
      ? `🧾 *Limite: ${label}*\n\n` +
        `${progressBar} ${progress.toFixed(1)}% do limite\n\n` +
        `💳 Gasto atual: R$ ${formatCurrency(goal.current_amount)}\n` +
        `🎯 Limite: R$ ${formatCurrency(goal.target_amount)}\n` +
        `${remaining >= 0 ? `📊 Restam: R$ ${formatCurrency(remaining)}` : `🚨 Excedeu: R$ ${formatCurrency(Math.abs(remaining))}`}`
      : `🎯 *Meta: ${goal.name}*\n\n` +
        `${progressBar} ${progress.toFixed(1)}%\n\n` +
        `💰 Economizado: R$ ${formatCurrency(goal.current_amount)}\n` +
        `🎯 Meta: R$ ${formatCurrency(goal.target_amount)}\n` +
        `📊 Faltam: R$ ${formatCurrency(remaining)}`,
    data: { goal, progress, remaining },
  };
}

/**
 * COMANDO: investimentos
 * Resumo do portfólio de investimentos
 */
async function getInvestimentos(supabase: any, userId: string) {
  const [{ data: investments, error: investmentsError }, { data: investmentGoals, error: goalsError }] = await Promise.all([
    supabase
      .from('investments')
      .select('id, name, ticker, quantity, purchase_price, current_price, total_invested, current_value, type')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('investment_goals')
      .select('id, name, category, target_amount, current_amount, target_date, monthly_contribution, expected_return_rate, linked_investments, auto_invest, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('target_date', { ascending: true }),
  ]);

  if (investmentsError) throw investmentsError;
  if (goalsError) throw goalsError;

  const summary = (investments || []).reduce((acc: any, investment: any) => {
    const totalInvested = Number(investment.total_invested || (Number(investment.quantity) * Number(investment.purchase_price || 0)));
    const currentValue = Number(investment.current_value || (Number(investment.quantity) * Number(investment.current_price || investment.purchase_price || 0)));
    acc.total_invested += totalInvested;
    acc.total_value += currentValue;
    return acc;
  }, {
    total_invested: 0,
    total_value: 0,
  });

  if ((!investments || investments.length === 0) && (!investmentGoals || investmentGoals.length === 0)) {
    return {
      success: true,
      message: '📈 *Investimentos*\n\nVocê ainda não tem investimentos nem metas de investimento ativas.',
      data: { summary: null },
    };
  }
  
  const returnValue = summary.total_value - summary.total_invested;
  const returnPercentage = summary.total_invested > 0 ? (returnValue / summary.total_invested) * 100 : 0;
  const returnEmoji = returnValue >= 0 ? '📈' : '📉';
  const goalsSummary = (investmentGoals || [])
    .map((goal: any) => buildInvestmentGoalSnapshot(goal, investments || []))
    .sort((a: any, b: any) => b.projected_gap - a.projected_gap)
    .slice(0, 3);

  const goalsMessage = goalsSummary.length > 0
    ? `\n\n🎯 *Metas de investimento*\n` + goalsSummary.map((goal: any) => (
      `• ${goal.name}: ${goal.progress_percentage.toFixed(1)}% (${formatCurrency(goal.current_amount)} de ${formatCurrency(goal.target_amount)})\n` +
      `  Projeção: ${formatCurrency(goal.final_projection)} | Gap: ${formatCurrency(goal.projected_gap)}\n` +
      `  Aporte atual: ${formatCurrency(goal.monthly_contribution)} | Necessário: ${formatCurrency(goal.required_monthly_contribution)}`
    )).join('\n\n')
    : '\n\n🎯 Nenhuma meta de investimento ativa.';
  
  return {
    success: true,
    message: `💼 *Seu Portfólio*\n\n` +
             `💰 Valor Atual: R$ ${formatCurrency(summary.total_value)}\n` +
             `📊 Investido: R$ ${formatCurrency(summary.total_invested)}\n` +
             `${returnEmoji} Retorno: R$ ${formatCurrency(returnValue)} (${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%)` +
             goalsMessage,
    data: { summary, return_value: returnValue, return_percentage: returnPercentage, goals: goalsSummary },
  };
}

function buildInvestmentGoalSnapshot(goal: any, investments: any[]) {
  const linkedCurrentAmount = goal.auto_invest
    ? (goal.linked_investments || []).reduce((sum: number, investmentId: string) => {
        const investment = investments.find((item: any) => item.id === investmentId);
        if (!investment) return sum;
        return sum + Number(investment.current_value || (Number(investment.quantity) * Number(investment.current_price || investment.purchase_price || 0)));
      }, 0)
    : 0;

  const currentAmount = Number(goal.current_amount || 0) + linkedCurrentAmount;
  const targetAmount = Number(goal.target_amount || 0);
  const monthlyContribution = Number(goal.monthly_contribution || 0);
  const annualRate = Number(goal.expected_return_rate || 0);
  const monthsRemaining = calculateInvestmentGoalMonths(goal.target_date);
  const finalProjection = projectInvestmentGoalValue(currentAmount, monthlyContribution, annualRate, monthsRemaining);
  const requiredMonthlyContribution = solveInvestmentGoalContribution(currentAmount, annualRate, monthsRemaining, targetAmount);

  return {
    name: goal.name,
    current_amount: currentAmount,
    target_amount: targetAmount,
    monthly_contribution: monthlyContribution,
    final_projection: finalProjection,
    required_monthly_contribution: requiredMonthlyContribution,
    projected_gap: Math.max(0, targetAmount - finalProjection),
    progress_percentage: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0,
  };
}

function calculateInvestmentGoalMonths(targetDate?: string | null) {
  if (!targetDate) return 0;
  const today = new Date();
  const target = new Date(`${targetDate}T12:00:00`);
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function projectInvestmentGoalValue(currentAmount: number, monthlyContribution: number, annualRate: number, months: number) {
  if (months <= 0) return currentAmount;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let balance = currentAmount;

  for (let month = 0; month < months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return balance;
}

function solveInvestmentGoalContribution(currentAmount: number, annualRate: number, months: number, targetAmount: number) {
  if (targetAmount <= currentAmount || months <= 0) return 0;

  let low = 0;
  let high = Math.max(targetAmount, 1000);

  while (projectInvestmentGoalValue(currentAmount, high, annualRate, months) < targetAmount) {
    high *= 2;
    if (high > targetAmount * 10) break;
  }

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (low + high) / 2;
    if (projectInvestmentGoalValue(currentAmount, mid, annualRate, months) >= targetAmount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

/**
 * COMANDO: cartões
 * Status de faturas de cartão
 */
async function getCartoes(supabase: any, userId: string) {
  const { data: cards, error } = await supabase
    .from('credit_cards')
    .select('id, name, brand, last_four_digits, credit_limit, available_limit, closing_day, due_day, is_active, is_archived')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('name', { ascending: true });
  
  if (error) throw error;
  
  const activeCards = (cards || []).filter((card: any) => card.is_active !== false);
  
  if (activeCards.length === 0) {
    return {
      success: true,
      message: '💳 *Cartões de Crédito*\n\nVocê ainda não tem cartões ativos cadastrados.',
      data: { cards: [] },
    };
  }
  
  const { data: invoices, error: invoiceError } = await supabase
    .from('credit_card_invoices')
    .select('credit_card_id, status, due_date, reference_month, total_amount, remaining_amount')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });
  
  if (invoiceError) throw invoiceError;
  
  const invoicesByCard = new Map<string, any[]>();
  (invoices || []).forEach((invoice: any) => {
    if (!invoicesByCard.has(invoice.credit_card_id)) {
      invoicesByCard.set(invoice.credit_card_id, []);
    }
    invoicesByCard.get(invoice.credit_card_id)!.push(invoice);
  });
  
  const pickInvoice = (list: any[] = []) => {
    const openOrPartial = list.find((inv) => inv.status === 'open' || inv.status === 'partial');
    if (openOrPartial) return openOrPartial;
    return list[0] || null;
  };
  
  let message = `💳 *Cartões de Crédito (${activeCards.length})*\n\n`;
  let totalOpen = 0;
  
  activeCards.forEach((card: any) => {
    const invoice = pickInvoice(invoicesByCard.get(card.id));
    const limiter = typeof card.credit_limit === 'number' ? card.credit_limit : 0;
    const available = typeof card.available_limit === 'number' ? card.available_limit : 0;
    const used = Math.max(limiter - available, 0);
    
    let invoiceLine = '   ✅ Nenhuma fatura aberta';
    if (invoice) {
      const dueDate = invoice.due_date ? formatDate(new Date(invoice.due_date)) : null;
      const amountBase = invoice.status === 'open' || invoice.status === 'partial'
        ? (invoice.remaining_amount ?? invoice.total_amount ?? 0)
        : (invoice.total_amount ?? 0);
      
      if (invoice.status === 'open' || invoice.status === 'partial') {
        totalOpen += amountBase;
      }
      
      const statusEmoji = invoice.status === 'partial'
        ? '🟡'
        : invoice.status === 'open'
          ? '🟠'
          : '🟢';
      const statusLabel = invoice.status === 'partial'
        ? 'Pagamento parcial'
        : invoice.status === 'open'
          ? 'Fatura aberta'
          : 'Última fatura';
      
      invoiceLine = `${statusEmoji} ${statusLabel}${dueDate ? ` · vence ${dueDate}` : ''}\n` +
        `   Valor: R$ ${formatCurrency(amountBase)}`;
    }
    
    message += `💠 ${card.name} • final ${card.last_four_digits || '----'}\n`;
    message += `   Limite R$ ${formatCurrency(limiter)} · Usado R$ ${formatCurrency(used)}\n`;
    message += `${invoiceLine}\n\n`;
  });
  
  if (totalOpen > 0) {
    message += `🔔 Total em aberto: R$ ${formatCurrency(totalOpen)}`;
  }
  
  return {
    success: true,
    message,
    data: {
      cards: activeCards,
      invoices,
      total_open_amount: totalOpen,
    },
  };
}

/**
 * COMANDO: ajuda
 * Lista todos os comandos disponíveis
 */
function getAjuda() {
  return {
    success: true,
    message: `📚 *Comandos Disponíveis*\n\n` +
             `💰 *saldo* - Ver saldo total\n` +
             `📊 *resumo [período]* - Resumo financeiro\n` +
             `   Ex: resumo dia, resumo semana, resumo mês\n\n` +
             `📋 *contas* - Contas a vencer (7 dias)\n` +
             `🎯 *meta [nome]* - Status de metas\n` +
             `📈 *investimentos* - Resumo do portfólio\n` +
             `💳 *cartões* - Faturas de cartão\n` +
             `📄 *relatório [mês]* - Relatório completo\n\n` +
             `_Você também pode enviar lançamentos por texto, áudio ou foto!_`,
  };
}

/**
 * COMANDO: relatório [mês]
 * Gera relatório completo do mês
 */
async function getRelatorio(supabase: any, userId: string, month?: string) {
  // TODO: Implementar geração de relatório completo
  return {
    success: true,
    message: `📄 *Relatório ${month || 'do Mês'}*\n\n` +
             `Estou gerando seu relatório completo...\n\n` +
             `_Em breve você receberá um PDF com todas as informações!_`,
  };
}

/**
 * Helpers
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function getProgressBar(percentage: number): string {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
