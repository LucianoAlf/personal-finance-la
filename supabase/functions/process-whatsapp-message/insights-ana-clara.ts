/**
 * Insights Inteligentes da Ana Clara
 * Transforma a consulta de saldo em uma experiência de Personal Finance Coach
 */

import { getSupabase } from './utils.ts';

// ============================================
// TIPOS
// ============================================

interface VencimentoProximo {
  descricao: string;
  valor: number;
  diasRestantes: number;
  urgencia: 'alta' | 'media' | 'baixa';
  parcelaAtual?: number;
  parcelaTotal?: number;
}

interface AnaliseMes {
  totalGastoMes: number;
  totalGastoMesAnterior: number;
  variacaoPercentual: number;
  topCategorias: { nome: string; valor: number; percentual: number }[];
  totalContasPagar: number;
}

interface MetaProgresso {
  nome: string;
  atual: number;
  objetivo: number;
  percentual: number;
}

interface ContaBancaria {
  name: string;
  current_balance: number;
  type?: string;
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getEmojiBanco(nome: string): string {
  const nomeNorm = nome.toLowerCase();
  const emojis: Record<string, string> = {
    'nubank': '💜', 'nu': '💜', 'roxinho': '💜',
    'itau': '🧡', 'itaú': '🧡', 'laranjinha': '🧡',
    'bradesco': '❤️', 'santander': '❤️',
    'inter': '🧡', 'c6': '🖤', 'c6 bank': '🖤',
    'caixa': '💙', 'bb': '💛', 'banco do brasil': '💛',
    'picpay': '💚', 'mercado pago': '💙', 'pagbank': '💛'
  };
  
  for (const [key, emoji] of Object.entries(emojis)) {
    if (nomeNorm.includes(key)) return emoji;
  }
  return '🏦';
}

// ============================================
// ALERTAS
// ============================================

function gerarAlertas(contas: ContaBancaria[]): string[] {
  const alertas: string[] = [];
  
  // Alerta de conta negativa
  for (const conta of contas) {
    if (conta.current_balance < 0) {
      alertas.push(`⚠️ *${conta.name}* está negativo em R$ ${formatarMoeda(Math.abs(conta.current_balance))}`);
      
      // Sugerir transferência se houver outra conta com saldo
      const contaComSaldo = contas.find(c => c.current_balance > Math.abs(conta.current_balance) && c.name !== conta.name);
      if (contaComSaldo) {
        alertas.push(`   💡 Transferir de ${contaComSaldo.name} para cobrir?`);
      }
    }
  }
  
  // Alerta de saldo muito baixo (< R$ 100)
  for (const conta of contas) {
    if (conta.current_balance > 0 && conta.current_balance < 100) {
      alertas.push(`⚡ *${conta.name}* com saldo baixo: R$ ${formatarMoeda(conta.current_balance)}`);
    }
  }
  
  return alertas;
}

// ============================================
// PRÓXIMOS VENCIMENTOS
// ============================================

async function buscarProximosVencimentos(userId: string): Promise<VencimentoProximo[]> {
  const supabase = getSupabase();
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().split('T')[0];
  
  try {
    // Buscar contas a pagar pendentes (incluindo parcelas)
    const { data: contas } = await supabase
      .from('payable_bills')
      .select('description, amount, due_date, status, installment_number, total_installments')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .gte('due_date', hojeStr)
      .lte('due_date', em7diasStr)
      .order('due_date', { ascending: true })
      .limit(8);
    
    // Buscar faturas de cartão pendentes
    const { data: faturas } = await supabase
      .from('credit_card_invoices')
      .select('*, credit_card:credit_cards(name)')
      .eq('user_id', userId)
      .in('status', ['open', 'closed', 'pending', 'overdue'])
      .gte('due_date', hojeStr)
      .lte('due_date', em7diasStr)
      .order('due_date', { ascending: true })
      .limit(3);
    
    const vencimentos: VencimentoProximo[] = [];
    
    // Processar contas a pagar
    if (contas) {
      for (const c of contas) {
        const dueDate = new Date(c.due_date);
        const diasRestantes = Math.ceil((dueDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        vencimentos.push({
          descricao: c.description,
          valor: c.amount,
          diasRestantes: Math.max(0, diasRestantes),
          urgencia: diasRestantes <= 2 ? 'alta' : diasRestantes <= 4 ? 'media' : 'baixa',
          parcelaAtual: c.installment_number || undefined,
          parcelaTotal: c.total_installments || undefined
        });
      }
    }
    
    // Processar faturas de cartão
    if (faturas) {
      for (const f of faturas) {
        const dueDate = new Date(f.due_date);
        const diasRestantes = Math.ceil((dueDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const nomeCartao = f.credit_card?.name || 'Cartão';
        
        vencimentos.push({
          descricao: `Fatura ${nomeCartao}`,
          valor: f.remaining_amount || f.total_amount,
          diasRestantes: Math.max(0, diasRestantes),
          urgencia: diasRestantes <= 2 ? 'alta' : diasRestantes <= 4 ? 'media' : 'baixa'
        });
      }
    }
    
    // Ordenar por dias restantes
    return vencimentos.sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 8);
  } catch (error) {
    console.error('[INSIGHTS] Erro ao buscar vencimentos:', error);
    return [];
  }
}

// ============================================
// ANÁLISE DO MÊS
// ============================================

async function gerarAnaliseMes(userId: string): Promise<AnaliseMes> {
  const supabase = getSupabase();
  
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  try {
    // Gastos do mês atual (transactions)
    const { data: gastosMes } = await supabase
      .from('transactions')
      .select('amount, category:categories(name)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('transaction_date', primeiroDiaMes.toISOString().split('T')[0])
      .lte('transaction_date', hoje.toISOString().split('T')[0]);
    
    // Gastos do mês atual (cartão de crédito)
    const { data: gastosCartaoMes } = await supabase
      .from('credit_card_transactions')
      .select('amount, category:categories(name)')
      .eq('user_id', userId)
      .gte('transaction_date', primeiroDiaMes.toISOString().split('T')[0])
      .lte('transaction_date', hoje.toISOString().split('T')[0]);
    
    // Gastos do mês anterior (transactions)
    const { data: gastosMesAnterior } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('transaction_date', primeiroDiaMesAnterior.toISOString().split('T')[0])
      .lte('transaction_date', ultimoDiaMesAnterior.toISOString().split('T')[0]);
    
    // Gastos do mês anterior (cartão)
    const { data: gastosCartaoMesAnterior } = await supabase
      .from('credit_card_transactions')
      .select('amount')
      .eq('user_id', userId)
      .gte('transaction_date', primeiroDiaMesAnterior.toISOString().split('T')[0])
      .lte('transaction_date', ultimoDiaMesAnterior.toISOString().split('T')[0]);
    
    // Contas a pagar pendentes DESTE MÊS (até o último dia do mês)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const ultimoDiaMesStr = ultimoDiaMes.toISOString().split('T')[0];
    
    const { data: contasPendentes } = await supabase
      .from('payable_bills')
      .select('amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', ultimoDiaMesStr);
    
    // Faturas pendentes DESTE MÊS
    const { data: faturasPendentes } = await supabase
      .from('credit_card_invoices')
      .select('remaining_amount')
      .eq('user_id', userId)
      .in('status', ['open', 'closed', 'pending', 'overdue'])
      .lte('due_date', ultimoDiaMesStr);
    
    // Calcular totais
    const totalMes = (gastosMes?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0) +
                     (gastosCartaoMes?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0);
    
    const totalMesAnterior = (gastosMesAnterior?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0) +
                             (gastosCartaoMesAnterior?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0);
    
    const variacao = totalMesAnterior > 0 ? ((totalMes - totalMesAnterior) / totalMesAnterior) * 100 : 0;
    
    // Top categorias (combinar transactions e cartão)
    const categoriaMap = new Map<string, number>();
    
    gastosMes?.forEach(t => {
      const cat = (t.category as any)?.name || 'Outros';
      categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + (t.amount || 0));
    });
    
    gastosCartaoMes?.forEach(t => {
      const cat = (t.category as any)?.name || 'Outros';
      categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + (t.amount || 0));
    });
    
    const topCategorias = Array.from(categoriaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome, valor]) => ({
        nome,
        valor,
        percentual: totalMes > 0 ? Math.round((valor / totalMes) * 100) : 0
      }));
    
    // Total a pagar
    const totalContasPagar = (contasPendentes?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0) +
                             (faturasPendentes?.reduce((acc, f) => acc + (f.remaining_amount || 0), 0) || 0);
    
    return {
      totalGastoMes: totalMes,
      totalGastoMesAnterior: totalMesAnterior,
      variacaoPercentual: variacao,
      topCategorias,
      totalContasPagar
    };
  } catch (error) {
    console.error('[INSIGHTS] Erro ao gerar análise:', error);
    return {
      totalGastoMes: 0,
      totalGastoMesAnterior: 0,
      variacaoPercentual: 0,
      topCategorias: [],
      totalContasPagar: 0
    };
  }
}

// ============================================
// METAS
// ============================================

async function buscarProgressoMetas(userId: string): Promise<MetaProgresso[]> {
  const supabase = getSupabase();
  
  try {
    // Tentar tabela financial_goals primeiro
    const { data: metas } = await supabase
      .from('financial_goals')
      .select('name, current_amount, target_amount')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(3);
    
    if (!metas || metas.length === 0) {
      // Fallback para savings_goals
      const { data: metasSavings } = await supabase
        .from('savings_goals')
        .select('name, current_amount, target_amount')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(3);
      
      if (!metasSavings) return [];
      
      return metasSavings.map(m => ({
        nome: m.name,
        atual: m.current_amount || 0,
        objetivo: m.target_amount || 0,
        percentual: m.target_amount > 0 ? Math.round(((m.current_amount || 0) / m.target_amount) * 100) : 0
      }));
    }
    
    return metas.map(m => ({
      nome: m.name,
      atual: m.current_amount || 0,
      objetivo: m.target_amount || 0,
      percentual: m.target_amount > 0 ? Math.round(((m.current_amount || 0) / m.target_amount) * 100) : 0
    }));
  } catch (error) {
    console.error('[INSIGHTS] Erro ao buscar metas:', error);
    return [];
  }
}

// ============================================
// DICA CONTEXTUAL
// ============================================

function gerarDicaContextual(
  saldoTotal: number,
  alertas: string[],
  analise: AnaliseMes,
  vencimentos: VencimentoProximo[]
): string {
  // Dica baseada em conta negativa
  if (alertas.some(a => a.includes('negativo'))) {
    return "Priorize cobrir o saldo negativo para evitar juros do cheque especial. Cada dia conta!";
  }
  
  // Dica baseada em vencimentos urgentes
  const urgentes = vencimentos.filter(v => v.urgencia === 'alta');
  if (urgentes.length > 0) {
    const total = urgentes.reduce((acc, v) => acc + v.valor, 0);
    return `Você tem ${urgentes.length} conta(s) vencendo em até 2 dias totalizando R$ ${formatarMoeda(total)}. Não esqueça de pagar!`;
  }
  
  // Dica baseada em redução de gastos
  if (analise.variacaoPercentual < -10) {
    const economia = Math.abs(analise.totalGastoMesAnterior - analise.totalGastoMes);
    return `Parabéns! Você está gastando ${Math.abs(Math.round(analise.variacaoPercentual))}% menos que mês passado. Que tal guardar R$ ${formatarMoeda(economia)} na reserva?`;
  }
  
  // Dica baseada em aumento de gastos
  if (analise.variacaoPercentual > 15) {
    const categoria = analise.topCategorias[0]?.nome || 'maior categoria';
    return `Atenção: seus gastos aumentaram ${Math.round(analise.variacaoPercentual)}% comparado ao mês passado. Revise suas despesas de ${categoria}.`;
  }
  
  // Dica baseada em saldo saudável
  if (saldoTotal > 5000 && analise.totalContasPagar < saldoTotal * 0.5) {
    return "Seu saldo está saudável! Considere investir o excedente. CDBs de liquidez diária são uma boa opção para começar.";
  }
  
  // Dica baseada em projeção apertada
  const saldoProjetado = saldoTotal - analise.totalContasPagar;
  if (saldoProjetado < 500 && saldoProjetado > 0) {
    return "Seu saldo ficará apertado após pagar as contas. Evite gastos extras este mês!";
  }
  
  // Dicas genéricas
  const dicasGenericas = [
    "Dica: Tente aplicar a regra 50-30-20: 50% necessidades, 30% desejos, 20% poupança.",
    "Revisar assinaturas mensais pode liberar dinheiro extra. Você usa todos os serviços que paga?",
    "Pequenos gastos diários somam muito no fim do mês. Aquele café de R$ 10 são R$ 300/mês!",
    "Ter uma reserva de emergência de 6 meses de gastos traz paz de espírito. Comece aos poucos!"
  ];
  
  return dicasGenericas[Math.floor(Math.random() * dicasGenericas.length)];
}

// ============================================
// FORMATADOR DE OUTPUT
// ============================================

function formatarOutputCompleto(
  contas: ContaBancaria[],
  alertas: string[],
  vencimentos: VencimentoProximo[],
  analise: AnaliseMes,
  metas: MetaProgresso[],
  dica: string
): string {
  let output = '💰 *Seus Saldos*\n━━━━━━━━━━━━━━━━━━━━\n\n';
  
  let saldoTotal = 0;
  
  // Lista de contas
  for (const conta of contas) {
    const emoji = getEmojiBanco(conta.name);
    const saldo = conta.current_balance || 0;
    saldoTotal += saldo;
    const status = saldo < 0 ? '⚠️' : saldo < 100 ? '⚡' : '✅';
    
    output += `${emoji} *${conta.name}*\n`;
    output += `R$ ${formatarMoeda(saldo)} ${status}\n\n`;
  }
  
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += `💵 *Total:* R$ ${formatarMoeda(saldoTotal)}\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // Alertas (se houver)
  if (alertas.length > 0) {
    output += '🚨 *ALERTAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    for (const alerta of alertas) {
      output += `${alerta}\n`;
    }
    output += '\n';
  }
  
  // Próximos vencimentos (se houver)
  if (vencimentos.length > 0) {
    output += '📅 *PRÓXIMOS VENCIMENTOS*\n━━━━━━━━━━━━━━━━━━━━\n';
    for (const v of vencimentos) {
      const emoji = v.urgencia === 'alta' ? '🔴' : v.urgencia === 'media' ? '🟡' : '🟢';
      const dias = v.diasRestantes === 0 ? 'HOJE' : v.diasRestantes === 1 ? 'amanhã' : `${v.diasRestantes} dias`;
      
      // Mostrar número da parcela se for parcelado
      let descricao = v.descricao;
      if (v.parcelaAtual && v.parcelaTotal && v.parcelaTotal > 1) {
        descricao = `${v.descricao} (${v.parcelaAtual}/${v.parcelaTotal})`;
      }
      
      output += `${emoji} ${descricao} - R$ ${formatarMoeda(v.valor)} (${dias})\n`;
    }
    output += '\n';
  }
  
  // Análise do mês (só se tiver dados)
  if (analise.totalGastoMes > 0 || analise.totalGastoMesAnterior > 0) {
    output += '📊 *ANÁLISE DO MÊS*\n━━━━━━━━━━━━━━━━━━━━\n';
    
    // Comparativo
    const variacaoEmoji = analise.variacaoPercentual < 0 ? '⬇️' : analise.variacaoPercentual > 0 ? '⬆️' : '➡️';
    const variacaoTexto = analise.variacaoPercentual < -5 ? '🎉' : analise.variacaoPercentual > 10 ? '⚠️' : '';
    
    output += `📈 *Comparativo:*\n`;
    output += `• Este mês: R$ ${formatarMoeda(analise.totalGastoMes)}\n`;
    output += `• Mês anterior: R$ ${formatarMoeda(analise.totalGastoMesAnterior)}\n`;
    output += `• Variação: ${variacaoEmoji} ${Math.abs(Math.round(analise.variacaoPercentual))}% ${variacaoTexto}\n\n`;
    
    // Top categorias
    if (analise.topCategorias.length > 0) {
      output += '🏆 *Top Gastos:*\n';
      const medalhas = ['🥇', '🥈', '🥉'];
      analise.topCategorias.forEach((cat, i) => {
        output += `${medalhas[i]} ${cat.nome}: R$ ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
      });
      output += '\n';
    }
    
    // Projeção do mês - usar total de contas a pagar até o fim do mês
    const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    const saldoProjetado = saldoTotal - analise.totalContasPagar;
    output += `💰 *Projeção de ${mesAtual}:*\n`;
    output += `• Saldo atual: R$ ${formatarMoeda(saldoTotal)}\n`;
    output += `• A pagar este mês: R$ ${formatarMoeda(analise.totalContasPagar)}\n`;
    output += `• Saldo projetado: R$ ${formatarMoeda(saldoProjetado)} ${saldoProjetado > 0 ? '✅' : '⚠️'}\n\n`;
  }
  
  // Metas (se houver)
  if (metas.length > 0) {
    output += '🎯 *SUAS METAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    for (const meta of metas) {
      const barraCheia = Math.min(Math.round(meta.percentual / 5), 20);
      const barraVazia = 20 - barraCheia;
      const barra = '█'.repeat(barraCheia) + '░'.repeat(barraVazia);
      output += `• ${meta.nome}: ${meta.percentual}%\n`;
      output += `  [${barra}]\n`;
      output += `  R$ ${formatarMoeda(meta.atual)} / ${formatarMoeda(meta.objetivo)}\n\n`;
    }
  }
  
  // Dica da Ana Clara
  output += '💡 *DICA DA ANA CLARA*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `"${dica}"\n\n`;
  
  // Ações rápidas
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚡ *AÇÕES RÁPIDAS*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += '• _"transferir X de Y para Z"_\n';
  output += '• _"minhas contas a pagar"_\n';
  output += '• _"quanto gastei de alimentação"_\n';
  output += '• _"extrato"_\n';
  
  return output;
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function gerarInsightsSaldo(userId: string, contas: ContaBancaria[]): Promise<string> {
  try {
    // Calcular saldo total
    const saldoTotal = contas.reduce((acc, c) => acc + (c.current_balance || 0), 0);
    
    // Gerar alertas (síncrono)
    const alertas = gerarAlertas(contas);
    
    // Buscar dados em paralelo para performance
    const [vencimentos, analise, metas] = await Promise.all([
      buscarProximosVencimentos(userId),
      gerarAnaliseMes(userId),
      buscarProgressoMetas(userId)
    ]);
    
    // Gerar dica contextual
    const dica = gerarDicaContextual(saldoTotal, alertas, analise, vencimentos);
    
    // Formatar output
    return formatarOutputCompleto(contas, alertas, vencimentos, analise, metas, dica);
  } catch (error) {
    console.error('[INSIGHTS] Erro geral:', error);
    
    // Fallback: retornar saldo simples se der erro
    let output = '💰 *Seus Saldos*\n━━━━━━━━━━━━━━━━━━━━\n\n';
    let saldoTotal = 0;
    
    for (const conta of contas) {
      const emoji = getEmojiBanco(conta.name);
      const saldo = conta.current_balance || 0;
      saldoTotal += saldo;
      output += `${emoji} *${conta.name}*\nR$ ${formatarMoeda(saldo)}\n\n`;
    }
    
    output += '━━━━━━━━━━━━━━━━━━━━\n';
    output += `💵 *Total:* R$ ${formatarMoeda(saldoTotal)}\n`;
    
    return output;
  }
}

// ============================================
// INSIGHTS PARA CONTA ESPECÍFICA
// ============================================

async function buscarMovimentacaoRecente(userId: string, contaId: string): Promise<any> {
  const supabase = getSupabase();
  const hoje = new Date();
  const dias7atras = new Date();
  dias7atras.setDate(dias7atras.getDate() - 7);
  
  try {
    // Última entrada
    const { data: entradas } = await supabase
      .from('transactions')
      .select('amount, transaction_date')
      .eq('user_id', userId)
      .eq('account_id', contaId)
      .eq('type', 'income')
      .order('transaction_date', { ascending: false })
      .limit(1);
    
    // Última saída
    const { data: saidas } = await supabase
      .from('transactions')
      .select('amount, transaction_date, category:categories(name)')
      .eq('user_id', userId)
      .eq('account_id', contaId)
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false })
      .limit(1);
    
    // Saldo há 7 dias (aproximado - soma de transações)
    const { data: transacoes7dias } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .eq('account_id', contaId)
      .gte('transaction_date', dias7atras.toISOString().split('T')[0]);
    
    let saldo7diasAtras = 0;
    if (transacoes7dias) {
      const totalMovimentacao = transacoes7dias.reduce((acc: number, t: any) => {
        return acc + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
      saldo7diasAtras = totalMovimentacao;
    }
    
    return {
      ultimaEntrada: entradas?.[0],
      ultimaSaida: saidas?.[0],
      saldo7diasAtras
    };
  } catch (error) {
    console.error('[INSIGHTS] Erro ao buscar movimentação recente:', error);
    return { ultimaEntrada: null, ultimaSaida: null, saldo7diasAtras: 0 };
  }
}

async function analisarContaMes(userId: string, contaId: string): Promise<any> {
  const supabase = getSupabase();
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  try {
    const { data: transacoes } = await supabase
      .from('transactions')
      .select('amount, type, category:categories(name)')
      .eq('user_id', userId)
      .eq('account_id', contaId)
      .gte('transaction_date', primeiroDiaMes.toISOString().split('T')[0])
      .lte('transaction_date', hoje.toISOString().split('T')[0]);
    
    let totalEntradas = 0;
    let totalSaidas = 0;
    const categoriaMap = new Map<string, number>();
    
    transacoes?.forEach((t: any) => {
      if (t.type === 'income') {
        totalEntradas += t.amount || 0;
      } else {
        totalSaidas += t.amount || 0;
        const cat = (t.category as any)?.name || 'Outros';
        categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + (t.amount || 0));
      }
    });
    
    const topCategorias = Array.from(categoriaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome, valor]) => ({
        nome,
        valor,
        percentual: totalSaidas > 0 ? Math.round((valor / totalSaidas) * 100) : 0
      }));
    
    return {
      totalEntradas,
      totalSaidas,
      resultado: totalEntradas - totalSaidas,
      topCategorias
    };
  } catch (error) {
    console.error('[INSIGHTS] Erro ao analisar conta mês:', error);
    return { totalEntradas: 0, totalSaidas: 0, resultado: 0, topCategorias: [] };
  }
}

function gerarAlertasConta(conta: any): any[] {
  const alertas = [];
  
  if (conta.current_balance < 0) {
    const jurosDia = Math.abs(conta.current_balance) * 0.000433; // ~13% ao mês
    alertas.push({
      tipo: 'cheque_especial',
      mensagem: 'Conta no cheque especial!',
      juros: jurosDia
    });
  }
  
  if (conta.current_balance > 0 && conta.current_balance < 100) {
    alertas.push({
      tipo: 'saldo_baixo',
      mensagem: 'Saldo baixo para emergências'
    });
  }
  
  return alertas;
}

function gerarDicaContaEspecifica(conta: any, alertas: any[], analise: any): string {
  if (alertas.some((a: any) => a.tipo === 'cheque_especial')) {
    return 'Priorize cobrir o saldo negativo. Os juros do cheque especial são os mais altos do mercado (~13% ao mês).';
  }
  
  if (analise.resultado < 0) {
    const topCategoria = analise.topCategorias[0]?.nome || 'gastos';
    return `Esta conta está saindo mais do que entrando este mês. Revise os gastos com ${topCategoria}.`;
  }
  
  if (conta.current_balance > 5000) {
    return 'Saldo saudável! Considere investir o excedente para não perder para a inflação.';
  }
  
  return 'Mantenha pelo menos 1 mês de despesas nesta conta como reserva de liquidez.';
}

async function buscarMetasContaEspecifica(userId: string, contaId: string): Promise<any[]> {
  const supabase = getSupabase();
  
  try {
    // Buscar metas de economia e gastos relacionadas ao usuário
    const { data: metas } = await supabase
      .from('financial_goals')
      .select('name, goal_type, current_amount, target_amount, icon, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(3);
    
    return metas || [];
  } catch (error) {
    console.error('[INSIGHTS] Erro ao buscar metas:', error);
    return [];
  }
}

export async function gerarInsightsContaEspecifica(userId: string, conta: any): Promise<string> {
  try {
    const [movimentacao, analise, metas] = await Promise.all([
      buscarMovimentacaoRecente(userId, conta.id),
      analisarContaMes(userId, conta.id),
      buscarMetasContaEspecifica(userId, conta.id)
    ]);
    
    const alertas = gerarAlertasConta(conta);
    const dica = gerarDicaContaEspecifica(conta, alertas, analise);
    
    return formatarOutputContaEspecifica(conta, movimentacao, analise, alertas, dica, metas);
  } catch (error) {
    console.error('[INSIGHTS] Erro ao gerar insights conta específica:', error);
    // Fallback simples
    const emoji = getEmojiBanco(conta.name);
    const indicador = conta.current_balance < 0 ? '🔴' : '🟢';
    return `${emoji} *${conta.name}*\n💰 Saldo: ${formatarMoeda(conta.current_balance)} ${indicador}`;
  }
}

function formatarOutputContaEspecifica(conta: any, movimentacao: any, analise: any, alertas: any[], dica: string, metas: any[]): string {
  const emoji = getEmojiBanco(conta.name);
  const indicador = conta.current_balance < 0 ? '🔴' : '🟢';
  
  let output = `${emoji} *Saldo ${conta.name}*\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += `💰 *Saldo Atual:* ${formatarMoeda(conta.current_balance)} ${indicador}\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // Alertas
  if (alertas.length > 0) {
    output += '🚨 *ALERTAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    for (const alerta of alertas) {
      if (alerta.tipo === 'cheque_especial') {
        output += `⚠️ ${alerta.mensagem}\n`;
        output += `💸 Juros estimados: ~R$ ${formatarMoeda(alerta.juros)}/dia\n`;
      } else if (alerta.tipo === 'saldo_baixo') {
        output += `⚠️ ${alerta.mensagem}\n`;
      }
    }
    output += '\n';
  }
  
  // Movimentação recente
  if (movimentacao.ultimaEntrada || movimentacao.ultimaSaida) {
    output += '📅 *MOVIMENTAÇÃO RECENTE*\n━━━━━━━━━━━━━━━━━━━━\n';
    
    if (movimentacao.ultimaEntrada) {
      const data = new Date(movimentacao.ultimaEntrada.transaction_date).toLocaleDateString('pt-BR');
      output += `📥 Última entrada: ${formatarMoeda(movimentacao.ultimaEntrada.amount)} (${data})\n`;
    }
    
    if (movimentacao.ultimaSaida) {
      const data = new Date(movimentacao.ultimaSaida.transaction_date).toLocaleDateString('pt-BR');
      const categoria = (movimentacao.ultimaSaida.category as any)?.name || 'Outros';
      output += `📤 Última saída: ${formatarMoeda(movimentacao.ultimaSaida.amount)} (${data} - ${categoria})\n`;
    }
    
    if (movimentacao.saldo7diasAtras !== 0) {
      const variacao = conta.current_balance - movimentacao.saldo7diasAtras;
      const emoji_var = variacao < 0 ? '⬇️' : '⬆️';
      output += `📊 Variação 7 dias: ${emoji_var} ${formatarMoeda(variacao)}\n`;
    }
    
    output += '\n';
  }
  
  // Análise do mês
  if (analise.totalEntradas > 0 || analise.totalSaidas > 0) {
    output += '📊 *ANÁLISE DO MÊS*\n━━━━━━━━━━━━━━━━━━━━\n';
    output += `📥 Entradas: ${formatarMoeda(analise.totalEntradas)}\n`;
    output += `📤 Saídas: ${formatarMoeda(analise.totalSaidas)}\n`;
    
    const emojiResultado = analise.resultado >= 0 ? '✅' : '⚠️';
    output += `${emojiResultado} Resultado: ${formatarMoeda(analise.resultado)}\n`;
    
    // Top categorias
    if (analise.topCategorias.length > 0) {
      output += '\n🏆 *Top Gastos:*\n';
      const medalhas = ['🥇', '🥈', '🥉'];
      analise.topCategorias.forEach((cat: any, i: number) => {
        output += `${medalhas[i]} ${cat.nome}: ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
      });
    }
    
    output += '\n';
  }
  
  // Projeção de dezembro
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const diasRestantes = Math.ceil((ultimoDiaMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long' });
  
  output += `💰 *Projeção de ${mesAtual}:*\n━━━━━━━━━━━━━━━━━━━━\n`;
  output += `• Saldo atual: ${formatarMoeda(conta.current_balance)}\n`;
  output += `• Saídas previstas: ${formatarMoeda(analise.totalSaidas)}\n`;
  const saldoProjetado = conta.current_balance - analise.totalSaidas;
  const emojiProjecao = saldoProjetado > 0 ? '✅' : '⚠️';
  output += `• Saldo projetado: ${formatarMoeda(saldoProjetado)} ${emojiProjecao}\n`;
  output += `• Dias restantes: ${diasRestantes}\n\n`;
  
  // Metas
  if (metas.length > 0) {
    output += '🎯 *SUAS METAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    for (const meta of metas) {
      const percentual = meta.target_amount > 0 ? Math.round((meta.current_amount / meta.target_amount) * 100) : 0;
      const barraCheia = Math.min(Math.round(percentual / 5), 20);
      const barraVazia = 20 - barraCheia;
      const barra = '█'.repeat(barraCheia) + '░'.repeat(barraVazia);
      
      output += `• ${meta.name}: ${percentual}%\n`;
      output += `  [${barra}]\n`;
      output += `  ${formatarMoeda(meta.current_amount)} / ${formatarMoeda(meta.target_amount)}\n\n`;
    }
  }
  
  // Dica
  output += '💡 *DICA DA ANA CLARA*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `"${dica}"\n\n`;
  
  // Ações rápidas
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚡ *AÇÕES RÁPIDAS*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `• _"extrato ${conta.name.toLowerCase()}"_\n`;
  output += `• _"quanto gastei no ${conta.name.toLowerCase()}"_\n`;
  
  if (conta.current_balance < 0) {
    output += '• _"transferir X do [outra conta] pro ' + conta.name.toLowerCase() + '"_\n';
  }
  
  return output;
}

// ============================================
// RELATÓRIO DE GASTOS DO MÊS (NOVO TEMPLATE)
// ============================================

const CATEGORIA_EMOJI: Record<string, string> = {
  'Alimentação': '🍽️',
  'Restaurante': '🍽️',
  'Mercado': '🛒',
  'Transporte': '🚗',
  'Combustível': '⛽',
  'Moradia': '🏠',
  'Contas de Consumo': '💡',
  'Saúde': '🏥',
  'Farmácia': '💊',
  'Educação': '📚',
  'Lazer': '🎬',
  'Viagens': '✈️',
  'Compras': '🛍️',
  'Eletrodomésticos': '📺',
  'Presentes': '🎁',
  'Beleza': '💅',
  'Assinaturas': '📱',
  'Financiamento': '🏦',
  'Empréstimo': '💳',
  'Delivery': '🛵',
  'Outros': '📦',
  'Transferência entre Contas': '🔄'
};

const CATEGORIA_TIPO: Record<string, 'essencial' | 'estiloVida' | 'superfluo'> = {
  'Moradia': 'essencial',
  'Contas de Consumo': 'essencial',
  'Mercado': 'essencial',
  'Saúde': 'essencial',
  'Farmácia': 'essencial',
  'Educação': 'essencial',
  'Transporte': 'essencial',
  'Financiamento': 'essencial',
  'Empréstimo': 'essencial',
  'Alimentação': 'estiloVida',
  'Restaurante': 'estiloVida',
  'Combustível': 'estiloVida',
  'Delivery': 'estiloVida',
  'Assinaturas': 'estiloVida',
  'Outros': 'estiloVida',
  'Viagens': 'superfluo',
  'Lazer': 'superfluo',
  'Compras': 'superfluo',
  'Eletrodomésticos': 'superfluo',
  'Presentes': 'superfluo',
  'Beleza': 'superfluo',
};

function getNomeMes(mes: number): string {
  const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return meses[mes] || '';
}

function gerarBarraProgresso(percentual: number): string {
  const total = 20;
  const preenchido = Math.min(Math.round((percentual / 100) * total), total);
  const vazio = total - preenchido;
  return '[' + '█'.repeat(preenchido) + '░'.repeat(vazio) + ']';
}

export async function gerarRelatorioGastosMes(userId: string, periodoConfig?: any): Promise<string> {
  const supabase = getSupabase();
  
  const periodo = calcularPeriodoRelatorio(periodoConfig);
  const { dataInicio, dataFim, label, mes, labelComparativo } = periodo;
  
  // Calcular período anterior para comparação
  const diasPeriodo = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dataInicioAnterior = new Date(dataInicio.getTime() - (diasPeriodo * 24 * 60 * 60 * 1000));
  const dataFimAnterior = new Date(dataInicio.getTime() - (24 * 60 * 60 * 1000));
  
  console.log('[RELATORIO] Período:', label, '| De:', dataInicio.toISOString().split('T')[0], 'Até:', dataFim.toISOString().split('T')[0]);
  
  try {
    const [{ data: gastosMes }, { data: gastosMesAnterior }] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, transaction_date, category:categories(name)')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', dataInicio.toISOString().split('T')[0])
        .lte('transaction_date', dataFim.toISOString().split('T')[0]),
      supabase
        .from('transactions')
        .select('amount, category:categories(name)')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', dataInicioAnterior.toISOString().split('T')[0])
        .lte('transaction_date', dataFimAnterior.toISOString().split('T')[0])
    ]);
    
    if (!gastosMes || gastosMes.length === 0) {
      return `📊 *Gastos de ${label}*\n\n` +
             `Você ainda não tem gastos registrados neste período.\n\n` +
             `💡 Registre sua primeira despesa: _"gastei 50 de almoço"_`;
    }
    
    const analise = processarGastosRelatorio(gastosMes, gastosMesAnterior || [], mes);
    analise.mesAtual = label; // Usar label do período
    analise.labelComparativo = labelComparativo; // Usar label dinâmico do comparativo
    const dica = gerarDicaGastos(analise);
    
    return formatarRelatorioGastos(analise, dica);
  } catch (error) {
    console.error('[INSIGHTS] Erro ao gerar relatório de gastos:', error);
    return '❌ Erro ao gerar relatório. Tente novamente.';
  }
}

interface GastoCategoria {
  nome: string;
  valor: number;
  percentual: number;
  transacoes: number;
  emoji: string;
}

interface AnaliseGastosMes {
  total: number;
  transacoes: number;
  mediaDiaria: number;
  mesAtual: string;
  labelComparativo: string; // Ex: "semana passada", "ontem", "mês anterior"
  categorias: GastoCategoria[];
  top5: GastoCategoria[];
  demais: GastoCategoria[];
  porTipo: {
    essenciais: { valor: number; percentual: number; categorias: string[] };
    estiloVida: { valor: number; percentual: number; categorias: string[] };
    superfluos: { valor: number; percentual: number; categorias: string[] };
  };
  comparativo: {
    mesAnterior: number;
    variacao: number;
    variacaoPercentual: number;
    maiorAumento: { categoria: string; valor: number; percentual: number } | null;
    maiorReducao: { categoria: string; valor: number; percentual: number } | null;
  };
}

function processarGastosRelatorio(gastosMes: any[], gastosMesAnterior: any[], mesAtual: number): AnaliseGastosMes {
  const total = gastosMes.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
  const transacoes = gastosMes.length;
  const diasNoMes = new Date().getDate();
  const mediaDiaria = total / diasNoMes;
  
  const categoriaMap = new Map<string, { valor: number; transacoes: number }>();
  gastosMes.forEach((t: any) => {
    const cat = (t.category as any)?.name || 'Outros';
    const atual = categoriaMap.get(cat) || { valor: 0, transacoes: 0 };
    categoriaMap.set(cat, {
      valor: atual.valor + t.amount,
      transacoes: atual.transacoes + 1
    });
  });
  
  const categorias: GastoCategoria[] = Array.from(categoriaMap.entries())
    .map(([nome, dados]) => ({
      nome,
      valor: dados.valor,
      percentual: Math.round((dados.valor / total) * 100),
      transacoes: dados.transacoes,
      emoji: CATEGORIA_EMOJI[nome] || '📦'
    }))
    .sort((a, b) => b.valor - a.valor);
  
  const top5 = categorias.slice(0, 5);
  const demais = categorias.slice(5);
  const porTipo = calcularPorTipoGastos(categorias, total);
  const comparativo = calcularComparativoGastos(categorias, gastosMesAnterior, total);
  
  return {
    total,
    transacoes,
    mediaDiaria,
    mesAtual: getNomeMes(mesAtual),
    labelComparativo: 'período anterior', // Será sobrescrito pelo chamador
    categorias,
    top5,
    demais,
    porTipo,
    comparativo
  };
}

function calcularPorTipoGastos(categorias: GastoCategoria[], total: number) {
  const essenciais = { valor: 0, categorias: [] as string[] };
  const estiloVida = { valor: 0, categorias: [] as string[] };
  const superfluos = { valor: 0, categorias: [] as string[] };
  
  categorias.forEach(cat => {
    const tipo = CATEGORIA_TIPO[cat.nome] || 'estiloVida';
    if (tipo === 'essencial') {
      essenciais.valor += cat.valor;
      essenciais.categorias.push(cat.nome);
    } else if (tipo === 'estiloVida') {
      estiloVida.valor += cat.valor;
      estiloVida.categorias.push(cat.nome);
    } else {
      superfluos.valor += cat.valor;
      superfluos.categorias.push(cat.nome);
    }
  });
  
  return {
    essenciais: {
      valor: essenciais.valor,
      percentual: total > 0 ? Math.round((essenciais.valor / total) * 100) : 0,
      categorias: essenciais.categorias.slice(0, 4)
    },
    estiloVida: {
      valor: estiloVida.valor,
      percentual: total > 0 ? Math.round((estiloVida.valor / total) * 100) : 0,
      categorias: estiloVida.categorias.slice(0, 4)
    },
    superfluos: {
      valor: superfluos.valor,
      percentual: total > 0 ? Math.round((superfluos.valor / total) * 100) : 0,
      categorias: superfluos.categorias.slice(0, 4)
    }
  };
}

function calcularComparativoGastos(categoriasAtuais: GastoCategoria[], gastosMesAnterior: any[], totalAtual: number) {
  const totalMesAnterior = gastosMesAnterior?.reduce((acc: number, t: any) => acc + (t.amount || 0), 0) || 0;
  const variacao = totalAtual - totalMesAnterior;
  const variacaoPercentual = totalMesAnterior > 0 ? Math.round((variacao / totalMesAnterior) * 100) : 0;
  
  const catMesAnterior = new Map<string, number>();
  gastosMesAnterior?.forEach((t: any) => {
    const cat = (t.category as any)?.name || 'Outros';
    catMesAnterior.set(cat, (catMesAnterior.get(cat) || 0) + t.amount);
  });
  
  let maiorAumento: { categoria: string; valor: number; percentual: number } | null = null;
  let maiorReducao: { categoria: string; valor: number; percentual: number } | null = null;
  
  categoriasAtuais.forEach(cat => {
    const valorAnterior = catMesAnterior.get(cat.nome) || 0;
    const diff = cat.valor - valorAnterior;
    const diffPercentual = valorAnterior > 0 ? Math.round((diff / valorAnterior) * 100) : (cat.valor > 0 ? 100 : 0);
    
    if (diff > 0 && (!maiorAumento || diff > maiorAumento.valor)) {
      maiorAumento = { categoria: cat.nome, valor: diff, percentual: diffPercentual };
    }
    if (diff < 0 && (!maiorReducao || diff < maiorReducao.valor)) {
      maiorReducao = { categoria: cat.nome, valor: Math.abs(diff), percentual: Math.abs(diffPercentual) };
    }
  });
  
  return { mesAnterior: totalMesAnterior, variacao, variacaoPercentual, maiorAumento, maiorReducao };
}

function formatarRelatorioGastos(analise: AnaliseGastosMes, dica: string): string {
  let output = `📊 *Gastos de ${analise.mesAtual}*\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // RESUMO
  output += '💰 *RESUMO*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `💸 Total: ${formatarMoeda(analise.total)}\n`;
  output += `📝 Transações: ${analise.transacoes}\n`;
  output += `📅 Média diária: ${formatarMoeda(analise.mediaDiaria)}\n`;
  
  const variacaoEmoji = analise.comparativo.variacaoPercentual > 0 ? '⬆️' : 
                        analise.comparativo.variacaoPercentual < 0 ? '⬇️' : '➡️';
  const variacaoSinal = analise.comparativo.variacao > 0 ? '+' : '';
  if (analise.comparativo.mesAnterior > 0) {
    output += `📈 vs ${analise.labelComparativo}: ${variacaoEmoji} ${variacaoSinal}${analise.comparativo.variacaoPercentual}% (${formatarMoeda(Math.abs(analise.comparativo.variacao))})\n`;
  }
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // TOP 5
  output += '🏆 *TOP 5 GASTOS*\n━━━━━━━━━━━━━━━━━━━━\n';
  const medalhas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  analise.top5.forEach((cat, i) => {
    const nomeFormatado = cat.nome.length > 12 ? cat.nome.substring(0, 11) + '..' : cat.nome;
    output += `${medalhas[i]} ${nomeFormatado.padEnd(13)} ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
    output += `   ${gerarBarraProgresso(cat.percentual)}\n`;
  });
  output += '\n';
  
  // OUTRAS CATEGORIAS
  if (analise.demais.length > 0) {
    output += '📋 *OUTRAS CATEGORIAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    const demaisMostrar = analise.demais.slice(0, 5);
    const demaisRestantes = analise.demais.slice(5);
    
    demaisMostrar.forEach(cat => {
      output += `${cat.emoji} ${cat.nome}: ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
    });
    
    if (demaisRestantes.length > 0) {
      const totalRestantes = demaisRestantes.reduce((acc, c) => acc + c.valor, 0);
      output += `... e mais ${demaisRestantes.length} (${formatarMoeda(totalRestantes)})\n`;
    }
    output += '\n';
  }
  
  // ANÁLISE POR TIPO
  output += '📊 *ANÁLISE POR TIPO*\n━━━━━━━━━━━━━━━━━━━━\n';
  
  if (analise.porTipo.essenciais.valor > 0) {
    output += `🏠 *Essenciais* (${analise.porTipo.essenciais.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.essenciais.valor)}\n`;
    output += `${analise.porTipo.essenciais.categorias.join(', ')}\n\n`;
  }
  
  if (analise.porTipo.estiloVida.valor > 0) {
    output += `🎯 *Estilo de Vida* (${analise.porTipo.estiloVida.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.estiloVida.valor)}\n`;
    output += `${analise.porTipo.estiloVida.categorias.join(', ')}\n\n`;
  }
  
  if (analise.porTipo.superfluos.valor > 0) {
    output += `🎉 *Supérfluos* (${analise.porTipo.superfluos.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.superfluos.valor)}\n`;
    output += `${analise.porTipo.superfluos.categorias.join(', ')}\n\n`;
  }
  
  // VARIAÇÕES
  if (analise.comparativo.maiorAumento || analise.comparativo.maiorReducao) {
    output += `📈 *VARIAÇÕES vs ${analise.labelComparativo.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (analise.comparativo.maiorAumento) {
      output += `⬆️ Maior aumento:\n`;
      output += `   ${analise.comparativo.maiorAumento.categoria}: +${formatarMoeda(analise.comparativo.maiorAumento.valor)} (+${analise.comparativo.maiorAumento.percentual}%)\n`;
    }
    
    if (analise.comparativo.maiorReducao) {
      output += `⬇️ Maior redução:\n`;
      output += `   ${analise.comparativo.maiorReducao.categoria}: -${formatarMoeda(analise.comparativo.maiorReducao.valor)} (-${analise.comparativo.maiorReducao.percentual}%)\n`;
    }
    output += '\n';
  }
  
  // DICA
  output += '💡 *DICA DA ANA CLARA*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `"${dica}"\n\n`;
  
  // AÇÕES RÁPIDAS
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚡ *AÇÕES RÁPIDAS*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `• _"quanto gastei de ${analise.top5[0]?.nome.toLowerCase() || 'alimentação'}"_\n`;
  output += '• _"comparar com novembro"_\n';
  output += '• _"extrato"_\n';
  
  return output;
}

function gerarDicaGastos(analise: AnaliseGastosMes): string {
  if (analise.comparativo.variacaoPercentual > 20) {
    return `Seus gastos aumentaram ${analise.comparativo.variacaoPercentual}% comparado ao mês passado. Revise especialmente ${analise.top5[0]?.nome || 'suas maiores categorias'}.`;
  }
  
  if (analise.comparativo.variacaoPercentual < -10) {
    const economia = Math.abs(analise.comparativo.variacao);
    return `Parabéns! Você economizou ${formatarMoeda(economia)} comparado ao mês passado. Continue assim!`;
  }
  
  if (analise.porTipo.superfluos.percentual > 30) {
    return `${analise.porTipo.superfluos.percentual}% dos seus gastos são supérfluos. Tente manter abaixo de 20% para sobrar mais para investir.`;
  }
  
  if (analise.top5[0] && analise.top5[0].percentual > 25) {
    return `${analise.top5[0].nome} representa ${analise.top5[0].percentual}% dos seus gastos. Se foi pontual, ótimo! Se não, considere criar um fundo específico.`;
  }
  
  if (analise.porTipo.essenciais.percentual >= 40 && analise.porTipo.essenciais.percentual <= 60) {
    return `Boa distribuição! ${analise.porTipo.essenciais.percentual}% em essenciais está dentro do recomendado (40-60%).`;
  }
  
  return `Sua média diária é ${formatarMoeda(analise.mediaDiaria)}. Use essa referência para controlar gastos até o fim do mês.`;
}

// ============================================
// RELATÓRIO DE GASTOS POR CONTA/CARTÃO ESPECÍFICO
// ============================================

interface PeriodoRelatorio {
  dataInicio: Date;
  dataFim: Date;
  label: string;
  mes: number;
  labelComparativo: string; // Ex: "semana anterior", "dia anterior", "mês anterior"
}

function calcularPeriodoRelatorio(periodoConfig?: any): PeriodoRelatorio {
  const hoje = new Date();
  let dataInicio: Date;
  let dataFim: Date;
  let label: string;
  let mes: number;
  let labelComparativo: string;
  
  const tipo = periodoConfig?.tipo || 'mes_atual';
  
  console.log('[PERIODO] Tipo recebido:', tipo);
  
  switch (tipo) {
    case 'mes_passado':
    case 'mes_anterior':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      mes = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
      label = getNomeMes(mes);
      labelComparativo = 'mês anterior';
      console.log('[PERIODO] Mês passado:', label, dataInicio.toISOString(), 'a', dataFim.toISOString());
      break;
    case 'semana_passada':
      const diaSemanaPassada = hoje.getDay();
      const diffDomingoPassado = diaSemanaPassada === 0 ? 7 : diaSemanaPassada;
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diffDomingoPassado);
      dataInicio = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate() - 6);
      mes = hoje.getMonth() + 1;
      label = 'a Semana Passada';
      labelComparativo = 'semana anterior';
      console.log('[PERIODO] Semana passada:', dataInicio.toISOString(), 'a', dataFim.toISOString());
      break;
    case 'semana':
    case 'semana_atual':
      const diaSemana = hoje.getDay();
      const diffDomingo = diaSemana === 0 ? 0 : diaSemana;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diffDomingo);
      dataFim = hoje;
      mes = hoje.getMonth() + 1;
      label = 'a Semana';
      labelComparativo = 'semana passada';
      console.log('[PERIODO] Esta semana:', dataInicio.toISOString(), 'a', dataFim.toISOString());
      break;
    case 'hoje':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      dataFim = hoje;
      mes = hoje.getMonth() + 1;
      label = 'Hoje';
      labelComparativo = 'ontem';
      break;
    case 'ontem':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
      mes = hoje.getMonth() + 1;
      label = 'Ontem';
      labelComparativo = 'anteontem';
      break;
    case 'dia_semana':
      // Calcular a data do dia da semana especificado (mais recente)
      const diaSemanaAlvo = periodoConfig.diaSemana ?? 0;
      const diaAtual = hoje.getDay();
      let diasAtras = diaAtual - diaSemanaAlvo;
      if (diasAtras < 0) diasAtras += 7; // Se o dia já passou nesta semana, pega da semana passada
      if (diasAtras === 0 && hoje.getHours() < 12) diasAtras = 7; // Se for hoje de manhã, pega semana passada
      
      const dataDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diasAtras);
      dataInicio = dataDia;
      dataFim = dataDia;
      mes = dataDia.getMonth() + 1;
      
      const nomesDias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      label = nomesDias[diaSemanaAlvo];
      labelComparativo = `${nomesDias[diaSemanaAlvo]} anterior`;
      console.log('[PERIODO] Dia da semana:', label, dataDia.toISOString().split('T')[0]);
      break;
    case 'mes_especifico':
      const mesEsp = periodoConfig.mes || hoje.getMonth() + 1;
      const anoEsp = periodoConfig.ano || hoje.getFullYear();
      dataInicio = new Date(anoEsp, mesEsp - 1, 1);
      dataFim = new Date(anoEsp, mesEsp, 0);
      mes = mesEsp;
      label = getNomeMes(mesEsp);
      labelComparativo = 'mês anterior';
      console.log('[PERIODO] Mês específico:', label, dataInicio.toISOString(), 'a', dataFim.toISOString());
      break;
    case 'ultimos_dias':
      const qtdDias = periodoConfig.quantidade || 7;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - qtdDias + 1);
      dataFim = hoje;
      mes = hoje.getMonth() + 1;
      label = `Últimos ${qtdDias} dias`;
      labelComparativo = `${qtdDias} dias anteriores`;
      break;
    case 'ultimos_meses':
      const qtdMeses = periodoConfig.quantidade || 3;
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - qtdMeses + 1, 1);
      dataFim = hoje;
      mes = hoje.getMonth() + 1;
      label = `Últimos ${qtdMeses} meses`;
      labelComparativo = `${qtdMeses} meses anteriores`;
      console.log('[PERIODO] Últimos meses:', qtdMeses, dataInicio.toISOString(), 'a', dataFim.toISOString());
      break;
    case 'mes_atual':
    default:
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = hoje;
      mes = hoje.getMonth() + 1;
      label = getNomeMes(mes);
      labelComparativo = 'mês anterior';
      break;
  }
  
  return { dataInicio, dataFim, label, mes, labelComparativo };
}

export async function gerarRelatorioGastosConta(
  userId: string,
  contaNome: string,
  periodoConfig?: any
): Promise<string> {
  const supabase = getSupabase();
  
  const periodo = calcularPeriodoRelatorio(periodoConfig);
  const { dataInicio, dataFim, label, mes, labelComparativo } = periodo;
  
  // Calcular período anterior para comparação
  const diasPeriodo = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dataInicioAnterior = new Date(dataInicio.getTime() - (diasPeriodo * 24 * 60 * 60 * 1000));
  const dataFimAnterior = new Date(dataInicio.getTime() - (24 * 60 * 60 * 1000));
  
  try {
    // Buscar conta
    let contaInfo: any = null;
    const nomeNorm = contaNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name, current_balance, type')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    contaInfo = contas?.find((c: any) => {
      const contaNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return contaNorm.includes(nomeNorm) || nomeNorm.includes(contaNorm);
    });
    
    if (!contaInfo) {
      return `❌ Não encontrei a conta "${contaNome}".\n\n💡 Use "minhas contas" para ver suas opções.`;
    }
    
    // Buscar gastos do período na conta
    const [{ data: gastosMes }, { data: gastosMesAnterior }] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, transaction_date, description, category:categories(name)')
        .eq('user_id', userId)
        .eq('account_id', contaInfo.id)
        .eq('type', 'expense')
        .gte('transaction_date', dataInicio.toISOString().split('T')[0])
        .lte('transaction_date', dataFim.toISOString().split('T')[0]),
      supabase
        .from('transactions')
        .select('amount, category:categories(name)')
        .eq('user_id', userId)
        .eq('account_id', contaInfo.id)
        .eq('type', 'expense')
        .gte('transaction_date', dataInicioAnterior.toISOString().split('T')[0])
        .lte('transaction_date', dataFimAnterior.toISOString().split('T')[0])
    ]);
    
    const nomeConta = contaInfo?.name || contaNome;
    const emojiBanco = getEmojiBanco(nomeConta);
    
    if (!gastosMes || gastosMes.length === 0) {
      return `${emojiBanco} *Gastos no ${nomeConta} - ${label}*\n\n` +
             `✨ Você não teve gastos nesta conta neste período!\n\n` +
             `💡 _Ótimo controle!_`;
    }
    
    const analise = processarGastosRelatorio(gastosMes, gastosMesAnterior || [], mes);
    analise.mesAtual = label; // Usar label do período
    analise.labelComparativo = labelComparativo; // Usar label dinâmico do comparativo
    const dica = gerarDicaGastosConta(analise, nomeConta);
    
    return formatarRelatorioGastosConta(analise, dica, nomeConta, emojiBanco);
  } catch (error) {
    console.error('[INSIGHTS] Erro ao gerar relatório de gastos conta:', error);
    return '❌ Erro ao gerar relatório. Tente novamente.';
  }
}

export async function gerarRelatorioGastosCartao(
  userId: string,
  cartaoNome: string,
  periodoConfig?: any
): Promise<string> {
  console.log('[RELATORIO-CARTAO] ========================================');
  console.log('[RELATORIO-CARTAO] cartaoNome:', cartaoNome);
  console.log('[RELATORIO-CARTAO] periodoConfig RAW:', periodoConfig);
  console.log('[RELATORIO-CARTAO] periodoConfig.tipo:', periodoConfig?.tipo);
  console.log('[RELATORIO-CARTAO] typeof periodoConfig:', typeof periodoConfig);
  console.log('[RELATORIO-CARTAO] ========================================');
  
  const supabase = getSupabase();
  
  const periodo = calcularPeriodoRelatorio(periodoConfig);
  const { dataInicio, dataFim, label, mes, labelComparativo } = periodo;
  
  console.log('[RELATORIO-CARTAO] Período calculado:', dataInicio.toISOString().split('T')[0], 'até', dataFim.toISOString().split('T')[0]);
  
  // Calcular período anterior para comparação
  const tipo = periodoConfig?.tipo || 'mes_atual';
  console.log('[RELATORIO-CARTAO] Tipo de período:', tipo);
  
  // Calcular período anterior baseado no tipo
  let dataInicioAnterior: Date;
  let dataFimAnterior: Date;
  
  if (tipo === 'semana' || tipo === 'semana_atual') {
    // Semana anterior: 7 dias antes do início da semana atual
    dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 7);
    dataFimAnterior = new Date(dataInicio);
    dataFimAnterior.setDate(dataFimAnterior.getDate() - 1);
    console.log('[RELATORIO-CARTAO] SEMANA: Período anterior 7 dias antes');
  } else if (tipo === 'hoje' || tipo === 'ontem') {
    // Comparar com dia anterior
    dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 1);
    dataFimAnterior = new Date(dataInicioAnterior);
    console.log('[RELATORIO-CARTAO] DIA: Comparando com dia anterior');
  } else if (tipo === 'dia_semana') {
    // Comparar com mesmo dia da semana anterior (7 dias antes)
    dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 7);
    dataFimAnterior = new Date(dataInicioAnterior);
    console.log('[RELATORIO-CARTAO] DIA_SEMANA: Comparando com mesmo dia semana anterior');
  } else {
    // Mês ou outros: usar mesma duração
    const diasPeriodo = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - diasPeriodo);
    dataFimAnterior = new Date(dataInicio);
    dataFimAnterior.setDate(dataFimAnterior.getDate() - 1);
    console.log('[RELATORIO-CARTAO] GENÉRICO: diasPeriodo=', diasPeriodo);
  }
  
  console.log('[RELATORIO-CARTAO] Período anterior:', dataInicioAnterior.toISOString().split('T')[0], 'até', dataFimAnterior.toISOString().split('T')[0]);
  
  try {
    // Buscar cartão
    let cartaoInfo: any = null;
    const nomeNorm = cartaoNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    console.log('[CARTAO-DEBUG] Buscando cartão para userId:', userId);
    console.log('[CARTAO-DEBUG] Nome recebido:', cartaoNome, '| Normalizado:', nomeNorm);
    
    const { data: cartoes, error: cartaoError } = await supabase
      .from('credit_cards')
      .select('id, name, credit_limit, available_limit, brand')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (cartaoError) {
      console.error('[CARTAO-DEBUG] Erro ao buscar cartões:', cartaoError);
    }
    
    console.log('[CARTAO-DEBUG] Cartões encontrados:', cartoes?.length, '| Nomes:', cartoes?.map((c: any) => c.name));
    
    cartaoInfo = cartoes?.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
      console.log('[CARTAO-DEBUG] Comparando:', cartaoNorm, 'com', nomeNorm, '| Match:', match);
      return match;
    });
    
    console.log('[CARTAO-DEBUG] Cartão encontrado:', cartaoInfo ? cartaoInfo.name : 'NENHUM');
    
    if (!cartaoInfo) {
      // Fallback: buscar conta bancária com mesmo nome
      console.log('[CARTAO-DEBUG] Cartão não encontrado, tentando fallback para conta...');
      const { data: contas } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      console.log('[CARTAO-DEBUG] Contas encontradas:', contas?.map((c: any) => c.name));
      
      const contaSimilar = contas?.find((c: any) => {
        const contaNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return contaNorm.includes(nomeNorm) || nomeNorm.includes(contaNorm);
      });
      
      if (contaSimilar) {
        console.log('[CARTAO-DEBUG] Conta similar encontrada:', contaSimilar.name);
        // Buscar transações da conta
        const { data: transacoesConta } = await supabase
          .from('transactions')
          .select('amount, transaction_date, description, category:categories(name)')
          .eq('user_id', userId)
          .eq('account_id', contaSimilar.id)
          .eq('type', 'expense')
          .gte('transaction_date', dataInicio.toISOString().split('T')[0])
          .lte('transaction_date', dataFim.toISOString().split('T')[0]);
        
        console.log('[CARTAO-DEBUG] Transações na conta:', transacoesConta?.length);
        
        if (transacoesConta && transacoesConta.length > 0) {
          const analise = processarGastosRelatorio(transacoesConta, [], mes);
          analise.mesAtual = label;
          analise.labelComparativo = labelComparativo;
          const dica = gerarDicaGastosCartao(analise, contaSimilar.name, 0, 0);
          return formatarRelatorioGastosCartao(analise, dica, contaSimilar.name, getEmojiBanco(contaSimilar.name), 0, 0);
        }
      }
      
      return `❌ Não encontrei o cartão "${cartaoNome}".\n\n💡 Use "meus cartões" para ver suas opções.`;
    }
    
    // Buscar gastos do período no cartão (campo correto é purchase_date)
    console.log('[CARTAO-QUERY] Buscando transações do cartão:', cartaoInfo.id);
    console.log('[CARTAO-QUERY] Período atual:', dataInicio.toISOString().split('T')[0], 'até', dataFim.toISOString().split('T')[0]);
    console.log('[CARTAO-QUERY] Período anterior:', dataInicioAnterior.toISOString().split('T')[0], 'até', dataFimAnterior.toISOString().split('T')[0]);
    
    const [{ data: gastosMes, error: errMes }, { data: gastosMesAnterior, error: errAnt }] = await Promise.all([
      supabase
        .from('credit_card_transactions')
        .select('amount, purchase_date, description, category:categories(name)')
        .eq('user_id', userId)
        .eq('credit_card_id', cartaoInfo.id)
        .gte('purchase_date', dataInicio.toISOString().split('T')[0])
        .lte('purchase_date', dataFim.toISOString().split('T')[0]),
      supabase
        .from('credit_card_transactions')
        .select('amount, category:categories(name)')
        .eq('user_id', userId)
        .eq('credit_card_id', cartaoInfo.id)
        .gte('purchase_date', dataInicioAnterior.toISOString().split('T')[0])
        .lte('purchase_date', dataFimAnterior.toISOString().split('T')[0])
    ]);
    
    console.log('[CARTAO-QUERY] Transações período atual:', gastosMes?.length || 0, errMes ? `ERRO: ${errMes.message}` : '');
    console.log('[CARTAO-QUERY] Transações período anterior:', gastosMesAnterior?.length || 0, errAnt ? `ERRO: ${errAnt.message}` : '');
    
    const nomeCartao = cartaoInfo?.name || cartaoNome;
    const emojiBanco = getEmojiBanco(nomeCartao);
    const limite = Number(cartaoInfo?.credit_limit) || 0;
    const disponivel = Number(cartaoInfo?.available_limit) || limite;
    const usado = limite - disponivel; // Calcular uso baseado no limite disponível
    
    // Se não há transações no cartão de crédito neste período
    // NÃO fazer fallback para conta bancária - isso confunde os dados!
    if (!gastosMes || gastosMes.length === 0) {
      console.log('[CARTAO] Sem transações em credit_card_transactions para o período');
      
      return `${emojiBanco} *Compras ${nomeCartao}*\n📅 ${label}\n\n` +
             `✨ Nenhuma compra no cartão neste período\n\n` +
             (limite > 0 ? `💳 Limite: ${formatarMoeda(limite)}\n\n` : '') +
             `💡 Para registrar compras no cartão:\n` +
             `   _"50 reais ifood no ${nomeCartao.toLowerCase()}"_`;
    }
    
    const analise = processarGastosRelatorio(gastosMes, gastosMesAnterior || [], mes);
    analise.mesAtual = label; // Usar label do período
    analise.labelComparativo = labelComparativo; // Usar label dinâmico do comparativo
    const dica = gerarDicaGastosCartao(analise, nomeCartao, limite, usado);
    
    return formatarRelatorioGastosCartao(analise, dica, nomeCartao, emojiBanco, limite, usado);
  } catch (error) {
    console.error('[INSIGHTS] Erro ao gerar relatório de gastos cartão:', error);
    return '❌ Erro ao gerar relatório. Tente novamente.';
  }
}

function formatarRelatorioGastosConta(analise: AnaliseGastosMes, dica: string, nomeConta: string, emoji: string): string {
  let output = `${emoji} *Gastos no ${nomeConta} - ${analise.mesAtual}*\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // RESUMO
  output += '💰 *RESUMO*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `💸 Total: ${formatarMoeda(analise.total)}\n`;
  output += `📝 Transações: ${analise.transacoes}\n`;
  output += `📅 Média diária: ${formatarMoeda(analise.mediaDiaria)}\n`;
  
  if (analise.comparativo.mesAnterior > 0) {
    const variacaoEmoji = analise.comparativo.variacaoPercentual > 0 ? '⬆️' : 
                          analise.comparativo.variacaoPercentual < 0 ? '⬇️' : '➡️';
    const variacaoSinal = analise.comparativo.variacao > 0 ? '+' : '';
    output += `📈 vs ${analise.labelComparativo}: ${variacaoEmoji} ${variacaoSinal}${analise.comparativo.variacaoPercentual}% (${formatarMoeda(Math.abs(analise.comparativo.variacao))})\n`;
  }
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // TOP 5
  output += '🏆 *TOP 5 GASTOS*\n━━━━━━━━━━━━━━━━━━━━\n';
  const medalhas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  analise.top5.forEach((cat, i) => {
    const nomeFormatado = cat.nome.length > 12 ? cat.nome.substring(0, 11) + '..' : cat.nome;
    output += `${medalhas[i]} ${nomeFormatado.padEnd(13)} ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
    output += `   ${gerarBarraProgresso(cat.percentual)}\n`;
  });
  output += '\n';
  
  // OUTRAS CATEGORIAS
  if (analise.demais.length > 0) {
    output += '📋 *OUTRAS CATEGORIAS*\n━━━━━━━━━━━━━━━━━━━━\n';
    const demaisMostrar = analise.demais.slice(0, 4);
    demaisMostrar.forEach(cat => {
      output += `${cat.emoji} ${cat.nome}: ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
    });
    if (analise.demais.length > 4) {
      const totalRestantes = analise.demais.slice(4).reduce((acc, c) => acc + c.valor, 0);
      output += `... e mais ${analise.demais.length - 4} (${formatarMoeda(totalRestantes)})\n`;
    }
    output += '\n';
  }
  
  // ANÁLISE POR TIPO
  output += '📊 *ANÁLISE POR TIPO*\n━━━━━━━━━━━━━━━━━━━━\n';
  if (analise.porTipo.essenciais.valor > 0) {
    output += `🏠 Essenciais: ${formatarMoeda(analise.porTipo.essenciais.valor)} (${analise.porTipo.essenciais.percentual}%)\n`;
  }
  if (analise.porTipo.estiloVida.valor > 0) {
    output += `🎯 Estilo de Vida: ${formatarMoeda(analise.porTipo.estiloVida.valor)} (${analise.porTipo.estiloVida.percentual}%)\n`;
  }
  if (analise.porTipo.superfluos.valor > 0) {
    output += `🎉 Supérfluos: ${formatarMoeda(analise.porTipo.superfluos.valor)} (${analise.porTipo.superfluos.percentual}%)\n`;
  }
  output += '\n';
  
  // DICA
  output += '💡 *DICA DA ANA CLARA*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `"${dica}"\n\n`;
  
  // AÇÕES RÁPIDAS
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚡ *AÇÕES RÁPIDAS*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `• _"extrato ${nomeConta.toLowerCase()}"_\n`;
  output += `• _"saldo ${nomeConta.toLowerCase()}"_\n`;
  output += '• _"quanto gastei esse mês"_\n';
  
  return output;
}

function formatarRelatorioGastosCartao(analise: AnaliseGastosMes, dica: string, nomeCartao: string, emoji: string, limite: number, usado: number): string {
  // Header com nome do cartão e período (formato: "Gastos do Cartão X na Semana/no Mês")
  const preposicao = analise.mesAtual.toLowerCase().startsWith('a ') ? 'n' : 'de ';
  const periodoFormatado = analise.mesAtual.toLowerCase().startsWith('a ') 
    ? analise.mesAtual.replace('a ', 'na ')  // "a Semana" → "na Semana"
    : analise.mesAtual;  // "Dezembro" → "de Dezembro" (já tratado abaixo)
  
  let tituloFinal = periodoFormatado;
  if (!periodoFormatado.toLowerCase().startsWith('n')) {
    tituloFinal = `de ${periodoFormatado}`;  // "Dezembro" → "de Dezembro"
  }
  
  let output = `${emoji} *Gastos do Cartão ${nomeCartao} ${tituloFinal}*\n`;
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // RESUMO (mesmo padrão do template geral)
  output += '💰 *RESUMO*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `💸 Total: ${formatarMoeda(analise.total)}\n`;
  output += `📝 Transações: ${analise.transacoes}\n`;
  output += `📅 Média diária: ${formatarMoeda(analise.mediaDiaria)}\n`;
  
  // Comparativo dinâmico (semana vs semana anterior, hoje vs ontem, mês vs mês anterior)
  if (analise.comparativo.mesAnterior > 0) {
    const variacaoEmoji = analise.comparativo.variacaoPercentual > 0 ? '⬆️' : 
                          analise.comparativo.variacaoPercentual < 0 ? '⬇️' : '➡️';
    const variacaoSinal = analise.comparativo.variacao > 0 ? '+' : '';
    output += `📈 vs ${analise.labelComparativo}: ${variacaoEmoji} ${variacaoSinal}${analise.comparativo.variacaoPercentual}% (${formatarMoeda(Math.abs(analise.comparativo.variacao))})\n`;
  }
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // TOP 5 GASTOS
  output += '🏆 *TOP 5 GASTOS*\n━━━━━━━━━━━━━━━━━━━━\n';
  const medalhas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  analise.top5.forEach((cat, i) => {
    const nomeFormatado = cat.nome.length > 12 ? cat.nome.substring(0, 11) + '..' : cat.nome;
    output += `${medalhas[i]} ${nomeFormatado.padEnd(13)} ${formatarMoeda(cat.valor)} (${cat.percentual}%)\n`;
    output += `   ${gerarBarraProgresso(cat.percentual)}\n`;
  });
  output += '\n';
  
  // ANÁLISE POR TIPO (formato expandido como template geral)
  output += '📊 *ANÁLISE POR TIPO*\n━━━━━━━━━━━━━━━━━━━━\n';
  if (analise.porTipo.essenciais.valor > 0) {
    output += `🏠 *Essenciais* (${analise.porTipo.essenciais.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.essenciais.valor)}\n`;
    if (analise.porTipo.essenciais.categorias && analise.porTipo.essenciais.categorias.length > 0) {
      output += `${analise.porTipo.essenciais.categorias.slice(0, 3).join(', ')}\n`;
    }
    output += '\n';
  }
  if (analise.porTipo.estiloVida.valor > 0) {
    output += `🎯 *Estilo de Vida* (${analise.porTipo.estiloVida.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.estiloVida.valor)}\n`;
    if (analise.porTipo.estiloVida.categorias && analise.porTipo.estiloVida.categorias.length > 0) {
      output += `${analise.porTipo.estiloVida.categorias.slice(0, 3).join(', ')}\n`;
    }
    output += '\n';
  }
  if (analise.porTipo.superfluos.valor > 0) {
    output += `🎉 *Supérfluos* (${analise.porTipo.superfluos.percentual}%)\n`;
    output += `${formatarMoeda(analise.porTipo.superfluos.valor)}\n`;
    if (analise.porTipo.superfluos.categorias && analise.porTipo.superfluos.categorias.length > 0) {
      output += `${analise.porTipo.superfluos.categorias.slice(0, 3).join(', ')}\n`;
    }
    output += '\n';
  }
  
  // VARIAÇÕES vs PERÍODO ANTERIOR (se houver comparativo)
  if (analise.comparativo.mesAnterior > 0 && (analise.comparativo.maiorAumento || analise.comparativo.maiorReducao)) {
    output += `📈 *VARIAÇÕES vs ${analise.labelComparativo.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (analise.comparativo.maiorAumento) {
      output += `⬆️ Maior aumento:\n`;
      output += `   ${analise.comparativo.maiorAumento.categoria}: +${formatarMoeda(analise.comparativo.maiorAumento.valor)} (+${analise.comparativo.maiorAumento.percentual}%)\n`;
    }
    if (analise.comparativo.maiorReducao) {
      output += `⬇️ Maior redução:\n`;
      output += `   ${analise.comparativo.maiorReducao.categoria}: -${formatarMoeda(analise.comparativo.maiorReducao.valor)} (-${analise.comparativo.maiorReducao.percentual}%)\n`;
    }
    output += '\n';
  }
  
  // DICA DA ANA CLARA
  output += '💡 *DICA DA ANA CLARA*\n━━━━━━━━━━━━━━━━━━━━\n';
  output += `"${dica}"\n\n`;
  
  // AÇÕES RÁPIDAS
  output += '━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚡ *AÇÕES RÁPIDAS*\n━━━━━━━━━━━━━━━━━━━━\n';
  const topCategoria = analise.top5[0]?.nome?.toLowerCase() || 'alimentação';
  output += `• _"quanto gastei de ${topCategoria}"_\n`;
  output += `• _"comparar com ${analise.labelComparativo}"_\n`;
  output += `• _"fatura ${nomeCartao.toLowerCase()}"_\n`;
  
  return output;
}

function gerarDicaGastosConta(analise: AnaliseGastosMes, nomeConta: string): string {
  if (analise.comparativo.variacaoPercentual > 30) {
    return `Seus gastos no ${nomeConta} aumentaram ${analise.comparativo.variacaoPercentual}% este mês. Revise especialmente ${analise.top5[0]?.nome || 'as maiores categorias'}.`;
  }
  
  if (analise.comparativo.variacaoPercentual < -20) {
    return `Ótimo! Você reduziu ${Math.abs(analise.comparativo.variacaoPercentual)}% dos gastos no ${nomeConta} comparado ao mês passado.`;
  }
  
  if (analise.porTipo.superfluos.percentual > 40) {
    return `${analise.porTipo.superfluos.percentual}% dos gastos no ${nomeConta} são supérfluos. Considere usar outra conta para esses gastos.`;
  }
  
  return `Média de ${formatarMoeda(analise.mediaDiaria)}/dia no ${nomeConta}. Use como referência para controle.`;
}

function gerarDicaGastosCartao(analise: AnaliseGastosMes, nomeCartao: string, limite: number, usado: number): string {
  const dicas: string[] = [];
  
  // 1. Análise do comparativo com período anterior
  if (analise.comparativo.mesAnterior > 0) {
    const variacao = analise.comparativo.variacaoPercentual;
    const valorVariacao = Math.abs(analise.comparativo.variacao);
    
    if (variacao < -20) {
      dicas.push(`Excelente! Você reduziu ${Math.abs(variacao)}% (${formatarMoeda(valorVariacao)}) comparado ao ${analise.labelComparativo}. Seu controle está funcionando!`);
    } else if (variacao > 50) {
      dicas.push(`Atenção: gastos aumentaram ${variacao}% vs ${analise.labelComparativo}. Isso pode impactar sua fatura!`);
    } else if (variacao > 20) {
      dicas.push(`Gastos subiram ${variacao}% vs ${analise.labelComparativo}. Fique atento para não virar tendência.`);
    }
  }
  
  // 2. Análise da maior variação por categoria
  if (analise.comparativo.maiorAumento && analise.comparativo.maiorAumento.percentual > 50) {
    const cat = analise.comparativo.maiorAumento.categoria;
    const valor = analise.comparativo.maiorAumento.valor;
    dicas.push(`${cat} teve aumento de ${formatarMoeda(valor)}. Vale revisar se foi pontual ou recorrente.`);
  }
  
  // 3. Análise por tipo de gasto (supérfluos no cartão é perigoso)
  if (analise.porTipo.superfluos.percentual > 40) {
    const categorias = analise.porTipo.superfluos.categorias?.slice(0, 2).join(' e ') || 'compras';
    dicas.push(`${analise.porTipo.superfluos.percentual}% em supérfluos (${categorias}). Cartão de crédito em supérfluos pode virar bola de neve com juros!`);
  } else if (analise.porTipo.essenciais.percentual > 70) {
    dicas.push(`Ótimo perfil! ${analise.porTipo.essenciais.percentual}% dos gastos são essenciais. Uso consciente do cartão.`);
  }
  
  // 4. Análise da concentração de gastos
  if (analise.top5[0] && analise.top5[0].percentual > 50) {
    const topCat = analise.top5[0].nome;
    dicas.push(`${topCat} representa ${analise.top5[0].percentual}% dos gastos. Considere diversificar ou negociar melhores condições.`);
  }
  
  // 5. Análise de frequência (muitas transações pequenas)
  if (analise.transacoes > 10 && analise.mediaDiaria < 50) {
    dicas.push(`Muitas transações pequenas (${analise.transacoes}). Compras por impulso? Tente agrupar para ter mais controle.`);
  }
  
  // 6. Análise de delivery/alimentação (comum em cartão)
  const deliveryGasto = analise.categorias.find(c => c.nome.toLowerCase().includes('delivery') || c.nome.toLowerCase().includes('ifood'));
  if (deliveryGasto && deliveryGasto.percentual > 25) {
    dicas.push(`Delivery representa ${deliveryGasto.percentual}% dos gastos. Cozinhar em casa pode economizar até 60%!`);
  }
  
  // Selecionar a dica mais relevante (prioridade: comparativo > tipo > categoria)
  if (dicas.length > 0) {
    return dicas[0];
  }
  
  // Fallback: dica genérica mas útil
  if (analise.total > 0) {
    const mediaProjetada = analise.mediaDiaria * 30;
    return `Com essa média (${formatarMoeda(analise.mediaDiaria)}/dia), você gastaria ~${formatarMoeda(mediaProjetada)}/mês no ${nomeCartao}. Planeje sua fatura!`;
  }
  
  return `Mantenha o controle do ${nomeCartao}. Pague sempre o total da fatura para evitar juros de até 400% ao ano!`;
}

// ============================================
// EXPORTS
// ============================================

export {
  gerarAlertas,
  buscarProximosVencimentos,
  gerarAnaliseMes,
  buscarProgressoMetas,
  gerarDicaContextual,
  formatarMoeda,
  getEmojiBanco
};
