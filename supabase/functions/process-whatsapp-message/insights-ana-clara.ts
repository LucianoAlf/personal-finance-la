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
