// ============================================
// CARTAO-CREDITO.TS - Gestão de Cartões via WhatsApp
// Personal Finance - Ana Clara
// FASE 2: Cartão de Crédito
// ============================================

import { getSupabase, getEmojiBanco } from './utils.ts';
import { detectarCategoriaAutomatica } from './transaction-mapper.ts';

// ============================================
// TIPOS
// ============================================

export type TipoIntencaoCartao = 
  | 'compra_cartao'           // "gastei 200 no cartão"
  | 'compra_parcelada'        // "comprei 600 em 3x"
  | 'consulta_fatura'         // "fatura do nubank"
  | 'consulta_limite'         // "limite do cartão"
  | 'listar_cartoes'          // "meus cartões"
  | null;

export interface IntencaoCartao {
  tipo: TipoIntencaoCartao;
  valor?: number;
  parcelas?: number;
  cartao?: string;           // Nome do cartão mencionado
  descricao?: string;
}

export interface DadosCompraCartao {
  valor: number;
  parcelas: number;
  cartao_id: string;
  descricao: string;
  categoria_id?: string;
  data_compra: string;
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

function calcularDataFatura(diaFechamento: number, dataCompra: Date): Date {
  const ano = dataCompra.getFullYear();
  const mes = dataCompra.getMonth();
  const dia = dataCompra.getDate();
  
  // Se a compra foi antes do fechamento, entra na fatura do mês atual
  // Se foi depois, entra na fatura do próximo mês
  if (dia <= diaFechamento) {
    return new Date(ano, mes, 1);
  } else {
    return new Date(ano, mes + 1, 1);
  }
}

// ============================================
// BUSCAR OU CRIAR FATURA DO MÊS
// ============================================

async function buscarOuCriarFatura(
  supabase: any,
  userId: string,
  cartaoId: string,
  closingDay: number,
  dueDay: number,
  dataCompra: Date
): Promise<string | null> {
  try {
    // Calcular o mês de referência da fatura
    const referenceMonth = calcularDataFatura(closingDay, dataCompra);
    const referenceMonthStr = referenceMonth.toISOString().split('T')[0];
    
    console.log('[FATURA] Buscando fatura para:', { cartaoId, referenceMonthStr });
    
    // Buscar fatura existente
    const { data: faturaExistente, error: buscaError } = await supabase
      .from('credit_card_invoices')
      .select('id')
      .eq('credit_card_id', cartaoId)
      .eq('user_id', userId)
      .eq('reference_month', referenceMonthStr)
      .single();
    
    if (faturaExistente && !buscaError) {
      console.log('[FATURA] Fatura existente encontrada:', faturaExistente.id);
      return faturaExistente.id;
    }
    
    // Criar nova fatura
    const closingDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), closingDay);
    const dueDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), dueDay);
    
    // Se o dia de vencimento é menor que o dia de fechamento, a fatura vence no mês seguinte
    if (dueDay < closingDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    const { data: novaFatura, error: criarError } = await supabase
      .from('credit_card_invoices')
      .insert({
        credit_card_id: cartaoId,
        user_id: userId,
        reference_month: referenceMonthStr,
        closing_date: closingDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: 0,
        paid_amount: 0,
        status: 'open'
      })
      .select('id')
      .single();
    
    if (criarError) {
      console.error('[FATURA] Erro ao criar fatura:', criarError);
      return null;
    }
    
    console.log('[FATURA] Nova fatura criada:', novaFatura.id);
    return novaFatura.id;
    
  } catch (error) {
    console.error('[FATURA] Erro:', error);
    return null;
  }
}

// ============================================
// DETECTAR INTENÇÃO DE CARTÃO
// ============================================

export function detectarIntencaoCartao(msg: string): IntencaoCartao | null {
  const msgLower = msg.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // COMPRA PARCELADA: "comprei 600 em 3x", "gastei 1200 em 6 vezes no cartão"
  const matchParcelado = msgLower.match(
    /(?:comprei|gastei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:em|de)\s+(\d+)\s*(?:x|vezes|parcelas?)(?:\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+))?/
  );
  if (matchParcelado) {
    const valor = parseFloat(matchParcelado[1].replace(',', '.'));
    const parcelas = parseInt(matchParcelado[2]);
    const cartao = matchParcelado[3]?.trim();
    return { 
      tipo: 'compra_parcelada', 
      valor, 
      parcelas,
      cartao
    };
  }
  
  // COMPRA SIMPLES NO CARTÃO: "gastei 200 no cartão", "compra de 150 no nubank"
  const matchCompraCartao = msgLower.match(
    /(?:comprei|gastei|paguei|compra\s+de)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+)/
  );
  if (matchCompraCartao) {
    const valor = parseFloat(matchCompraCartao[1].replace(',', '.'));
    const cartaoOuLocal = matchCompraCartao[2]?.trim();
    
    // Verificar se menciona cartão explicitamente ou é nome de cartão conhecido
    const cartoesConhecidos = ['nubank', 'itau', 'itaú', 'bradesco', 'santander', 'inter', 'c6', 'visa', 'mastercard', 'cartao', 'cartão'];
    const isCartao = cartoesConhecidos.some(c => cartaoOuLocal.includes(c));
    
    if (isCartao) {
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1,
        cartao: cartaoOuLocal.replace('cartao', '').replace('cartão', '').trim() || undefined
      };
    }
  }
  
  // Padrão alternativo: "no cartão gastei 200"
  const matchCartaoGastei = msgLower.match(
    /(?:no|na)\s+(?:cartao|cartão)\s+(?:gastei|comprei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/
  );
  if (matchCartaoGastei) {
    const valor = parseFloat(matchCartaoGastei[1].replace(',', '.'));
    return { tipo: 'compra_cartao', valor, parcelas: 1 };
  }
  
  // PADRÃO COMPLETO: "gastei 50 no almoço e paguei com cartão de crédito no nubank"
  // Também captura: "gastei 50 no almoço e paguei com cartão de crédito nubank" (sem "no")
  // Captura: valor + descrição + cartão (opcional)
  const matchPagueiCartao = msgLower.match(
    /(?:gastei|comprei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:reais\s+)?(?:no|na|em|de)\s+(.+?)\s+(?:e\s+)?(?:paguei\s+)?(?:com\s+)?(?:o\s+)?(?:cartao|cartão)(?:\s+de\s+credito)?(?:\s+(?:no|na|do|da)?\s*(.+))?/
  );
  if (matchPagueiCartao) {
    const valor = parseFloat(matchPagueiCartao[1].replace(',', '.'));
    const descricao = matchPagueiCartao[2]?.trim();
    let cartao = matchPagueiCartao[3]?.trim();
    
    // Limpar pontuação final do cartão
    if (cartao) {
      cartao = cartao.replace(/[.,!?]+$/, '').trim();
    }
    
    // Se capturou um cartão válido
    if (cartao && cartao.length > 0) {
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1,
        cartao,
        descricao: descricao ? descricao.charAt(0).toUpperCase() + descricao.slice(1) : undefined
      };
    }
  }
  
  // PADRÃO: menciona "cartão" ou "crédito" em qualquer lugar + valor
  // "almoço 50 reais no cartão", "paguei 100 no crédito"
  if (/\b(cartao|cartão|credito|crédito)\b/.test(msgLower)) {
    const matchValor = msgLower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
    if (matchValor) {
      const valor = parseFloat(matchValor[1].replace(',', '.'));
      // Tentar extrair nome do cartão - com ou sem preposição
      const matchCartaoNome = msgLower.match(/(?:(?:no|na|do|da)\s+)?(nubank|itau|itaú|bradesco|santander|inter|c6|picpay)/i);
      if (matchCartaoNome) {
        return { 
          tipo: 'compra_cartao', 
          valor, 
          parcelas: 1,
          cartao: matchCartaoNome[1]
        };
      }
      // Se não encontrou cartão específico, retorna sem cartão (vai perguntar)
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1,
        cartao: undefined
      };
    }
  }
  
  // CONSULTA FATURA: "fatura do nubank", "minha fatura", "fatura do cartão"
  if (/\b(fatura|faturas)\b/.test(msgLower)) {
    const matchFatura = msgLower.match(/fatura\s+(?:do|da|de)\s+(.+)/);
    return { 
      tipo: 'consulta_fatura',
      cartao: matchFatura?.[1]?.replace('cartao', '').replace('cartão', '').trim()
    };
  }
  
  // CONSULTA LIMITE: "limite do cartão", "meu limite", "limite disponível"
  if (/\b(limite|limites)\b/.test(msgLower)) {
    const matchLimite = msgLower.match(/limite\s+(?:do|da|de)\s+(.+)/);
    return { 
      tipo: 'consulta_limite',
      cartao: matchLimite?.[1]?.replace('cartao', '').replace('cartão', '').trim()
    };
  }
  
  // LISTAR CARTÕES: "meus cartões", "cartões"
  if (/\b(meus\s+cartoes|meus\s+cartões|cartoes|cartões)\b/.test(msgLower)) {
    return { tipo: 'listar_cartoes' };
  }
  
  return null;
}

// ============================================
// BUSCAR CARTÕES DO USUÁRIO
// ============================================

export async function buscarCartoesUsuario(userId: string): Promise<any[]> {
  const supabase = getSupabase();
  
  const { data: cartoes, error } = await supabase
    .from('credit_cards')
    .select('id, name, brand, last_four_digits, credit_limit, available_limit, closing_day, due_day, color')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('[CARTAO] Erro ao buscar cartões:', error);
    return [];
  }
  
  return cartoes || [];
}

// ============================================
// LISTAR CARTÕES
// ============================================

export async function listarCartoes(userId: string): Promise<string> {
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.\n\n💡 _Cadastre seus cartões no app para controlar suas faturas!_`;
  }
  
  let mensagem = `💳 *Seus Cartões de Crédito*\n\n`;
  
  for (const cartao of cartoes) {
    const emoji = getEmojiBanco(cartao.name);
    const limiteUsado = cartao.credit_limit - cartao.available_limit;
    const percentualUsado = ((limiteUsado / cartao.credit_limit) * 100).toFixed(0);
    
    mensagem += `${emoji} *${cartao.name}*`;
    if (cartao.last_four_digits) {
      mensagem += ` (****${cartao.last_four_digits})`;
    }
    mensagem += `\n`;
    mensagem += `   💰 Limite: ${formatarMoeda(cartao.credit_limit)}\n`;
    mensagem += `   ✅ Disponível: ${formatarMoeda(cartao.available_limit)}\n`;
    mensagem += `   📊 Usado: ${percentualUsado}%\n`;
    mensagem += `   📅 Fecha dia ${cartao.closing_day} | Vence dia ${cartao.due_day}\n\n`;
  }
  
  return mensagem;
}

// ============================================
// CONSULTAR LIMITE
// ============================================

export async function consultarLimite(userId: string, nomeCartao?: string): Promise<string> {
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.`;
  }
  
  // Se especificou cartão, filtrar
  let cartoesParaMostrar = cartoes;
  if (nomeCartao) {
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cartoesParaMostrar = cartoes.filter((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    
    if (cartoesParaMostrar.length === 0) {
      let lista = `❓ Não encontrei o cartão "${nomeCartao}".\n\n📋 *Seus cartões:*\n`;
      cartoes.forEach((c: any) => { lista += `• ${c.name}\n`; });
      return lista;
    }
  }
  
  if (cartoesParaMostrar.length === 1) {
    const c = cartoesParaMostrar[0];
    const emoji = getEmojiBanco(c.name);
    const limiteUsado = c.credit_limit - c.available_limit;
    const percentualUsado = ((limiteUsado / c.credit_limit) * 100).toFixed(0);
    
    return `${emoji} *${c.name}*\n\n` +
           `💰 *Limite Total:* ${formatarMoeda(c.credit_limit)}\n` +
           `✅ *Disponível:* ${formatarMoeda(c.available_limit)}\n` +
           `🔴 *Usado:* ${formatarMoeda(limiteUsado)} (${percentualUsado}%)`;
  }
  
  // Múltiplos cartões
  let mensagem = `💳 *Limites dos Cartões*\n\n`;
  let totalLimite = 0;
  let totalDisponivel = 0;
  
  for (const c of cartoesParaMostrar) {
    const emoji = getEmojiBanco(c.name);
    mensagem += `${emoji} *${c.name}*: ${formatarMoeda(c.available_limit)} de ${formatarMoeda(c.credit_limit)}\n`;
    totalLimite += c.credit_limit;
    totalDisponivel += c.available_limit;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━\n`;
  mensagem += `💎 *Total Disponível:* ${formatarMoeda(totalDisponivel)}`;
  
  return mensagem;
}

// ============================================
// CONSULTAR FATURA
// ============================================

export async function consultarFatura(userId: string, nomeCartao?: string): Promise<string> {
  const supabase = getSupabase();
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.`;
  }
  
  // Filtrar cartão se especificado
  let cartaoSelecionado = cartoes[0];
  if (nomeCartao) {
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrado = cartoes.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    
    if (!encontrado) {
      let lista = `❓ Não encontrei o cartão "${nomeCartao}".\n\n📋 *Seus cartões:*\n`;
      cartoes.forEach((c: any) => { lista += `• ${c.name}\n`; });
      return lista;
    }
    cartaoSelecionado = encontrado;
  }
  
  const emoji = getEmojiBanco(cartaoSelecionado.name);
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  // Buscar fatura atual
  const { data: fatura } = await supabase
    .from('credit_card_invoices')
    .select('*')
    .eq('credit_card_id', cartaoSelecionado.id)
    .eq('user_id', userId)
    .gte('reference_month', mesAtual.toISOString().split('T')[0])
    .order('reference_month', { ascending: true })
    .limit(1)
    .single();
  
  // Buscar transações do período
  const { data: transacoes } = await supabase
    .from('credit_card_transactions')
    .select(`
      amount, description, purchase_date,
      total_installments, installment_number,
      category:categories(name)
    `)
    .eq('credit_card_id', cartaoSelecionado.id)
    .eq('user_id', userId)
    .gte('invoice_date', mesAtual.toISOString().split('T')[0])
    .order('purchase_date', { ascending: false })
    .limit(10);
  
  let mensagem = `${emoji} *Fatura ${cartaoSelecionado.name}*\n`;
  mensagem += `📅 ${obterNomeMes(hoje)}\n\n`;
  
  if (fatura) {
    const statusEmoji: Record<string, string> = {
      'open': '🟡',
      'closed': '🟠',
      'paid': '🟢',
      'overdue': '🔴'
    };
    
    const statusTexto: Record<string, string> = {
      'open': 'Aberta',
      'closed': 'Fechada',
      'paid': 'Paga',
      'overdue': 'Vencida'
    };
    
    mensagem += `${statusEmoji[fatura.status] || '⚪'} *Status:* ${statusTexto[fatura.status] || fatura.status}\n`;
    mensagem += `💰 *Valor:* ${formatarMoeda(fatura.total_amount)}\n`;
    
    if (fatura.due_date) {
      const vencimento = new Date(fatura.due_date);
      mensagem += `📆 *Vencimento:* ${vencimento.toLocaleDateString('pt-BR')}\n`;
    }
    mensagem += `\n`;
  }
  
  if (transacoes && transacoes.length > 0) {
    mensagem += `📝 *Últimas compras:*\n`;
    for (const t of transacoes.slice(0, 5)) {
      const data = new Date(t.purchase_date).toLocaleDateString('pt-BR');
      let linha = `• ${t.description}: ${formatarMoeda(Number(t.amount))}`;
      if (t.total_installments > 1) {
        linha += ` (${t.installment_number}/${t.total_installments})`;
      }
      mensagem += `${linha}\n`;
    }
    
    if (transacoes.length > 5) {
      mensagem += `_... e mais ${transacoes.length - 5} compras_\n`;
    }
  } else {
    mensagem += `✨ _Nenhuma compra neste período_`;
  }
  
  // Calcular total se não tiver fatura
  if (!fatura && transacoes && transacoes.length > 0) {
    const total = transacoes.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    mensagem += `\n━━━━━━━━━━━━━━━━\n`;
    mensagem += `🔴 *Total parcial:* ${formatarMoeda(total)}`;
  }
  
  return mensagem;
}

// ============================================
// REGISTRAR COMPRA NO CARTÃO
// ============================================

export async function registrarCompraCartao(
  userId: string,
  dados: DadosCompraCartao
): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabase();
  
  try {
    // Buscar cartão
    const { data: cartao, error: cartaoError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', dados.cartao_id)
      .eq('user_id', userId)
      .single();
    
    if (cartaoError || !cartao) {
      return { sucesso: false, mensagem: '❌ Cartão não encontrado.' };
    }
    
    const dataCompra = new Date(dados.data_compra);
    const valorParcela = dados.valor / dados.parcelas;
    
    // Buscar ou criar fatura do mês
    const invoiceId = await buscarOuCriarFatura(
      supabase,
      userId,
      dados.cartao_id,
      cartao.closing_day,
      cartao.due_day,
      dataCompra
    );
    
    console.log('[CARTAO] Fatura associada:', invoiceId);
    
    // ✅ DETECTAR CATEGORIA AUTOMATICAMENTE
    let categoriaId: string | undefined = dados.categoria_id;
    if (!categoriaId && dados.descricao) {
      console.log('[CARTAO] Detectando categoria para:', dados.descricao, 'valor:', dados.valor);
      // ✅ Passar o valor para contexto (ex: água < R$20 = Alimentação)
      const catDetectada = await detectarCategoriaAutomatica(userId, dados.descricao, 'expense', dados.valor);
      categoriaId = catDetectada || undefined;
      console.log('[CARTAO] Categoria detectada:', categoriaId);
    }
    
    // Criar transações (uma para cada parcela)
    const transacoes = [];
    const installmentGroupId = dados.parcelas > 1 ? crypto.randomUUID() : null;
    
    for (let i = 1; i <= dados.parcelas; i++) {
      transacoes.push({
        user_id: userId,
        credit_card_id: dados.cartao_id,
        invoice_id: invoiceId, // ← ASSOCIAR À FATURA!
        category_id: categoriaId || null,
        amount: valorParcela,
        description: dados.parcelas > 1 
          ? `${dados.descricao} (${i}/${dados.parcelas})` 
          : dados.descricao,
        purchase_date: dados.data_compra,
        is_installment: dados.parcelas > 1,
        total_installments: dados.parcelas,
        installment_number: i,
        installment_group_id: installmentGroupId,
        source: 'whatsapp'
      });
    }
    
    const { error: insertError } = await supabase
      .from('credit_card_transactions')
      .insert(transacoes);
    
    // Atualizar total da fatura
    if (invoiceId) {
      const { data: faturaAtual } = await supabase
        .from('credit_card_invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single();
      
      const novoTotal = (faturaAtual?.total_amount || 0) + dados.valor;
      
      await supabase
        .from('credit_card_invoices')
        .update({ total_amount: novoTotal })
        .eq('id', invoiceId);
      
      console.log('[CARTAO] Fatura atualizada, novo total:', novoTotal);
    }
    
    if (insertError) {
      console.error('[CARTAO] Erro ao inserir transações:', insertError);
      return { sucesso: false, mensagem: '❌ Erro ao registrar compra.' };
    }
    
    // Atualizar limite disponível
    const novoLimiteDisponivel = cartao.available_limit - dados.valor;
    await supabase
      .from('credit_cards')
      .update({ available_limit: novoLimiteDisponivel })
      .eq('id', dados.cartao_id);
    
    // Buscar nome da categoria
    let nomeCategoria = 'Outros';
    if (categoriaId) {
      const { data: cat } = await supabase
        .from('categories')
        .select('name, icon')
        .eq('id', categoriaId)
        .single();
      if (cat) {
        nomeCategoria = cat.name;
      }
    }
    
    // Montar resposta no mesmo padrão do templateTransacaoRegistrada
    const emoji = getEmojiBanco(cartao.name);
    const dataFormatada = dataCompra.toLocaleDateString('pt-BR');
    
    // Frase motivacional
    const frases = [
      'Compra registrada! 💳',
      'Anotado no cartão! 📝',
      'Lançado na fatura! 💳'
    ];
    const frase = frases[Math.floor(Math.random() * frases.length)];
    
    let mensagem = `${frase}\n\n`;
    mensagem += `⭐ *Transação Registrada!* ⭐\n\n`;
    mensagem += `📝 *Descrição:* ${dados.descricao}\n`;
    mensagem += `💰 *Valor:* ${formatarMoeda(dados.valor)}\n`;
    mensagem += `🔴 *Tipo:* Despesa (Cartão)\n`;
    mensagem += `📂 *Categoria:* ${nomeCategoria}\n`;
    mensagem += `${emoji} *Cartão:* ${cartao.name}\n`;
    
    if (dados.parcelas > 1) {
      mensagem += `📊 *Parcelas:* ${dados.parcelas}x de ${formatarMoeda(valorParcela)}\n`;
    }
    
    mensagem += `📅 *Data:* ${dataFormatada}\n`;
    mensagem += `💳 *Vai na fatura de:* ${obterNomeMes(dataCompra)}\n\n`;
    mensagem += `✔️ *Status:* Pendente (fatura)\n`;
    mensagem += `✅ *Limite disponível:* ${formatarMoeda(novoLimiteDisponivel)}\n`;
    
    // Dica se limite baixo
    const percentualUsado = ((cartao.credit_limit - novoLimiteDisponivel) / cartao.credit_limit) * 100;
    if (percentualUsado > 80) {
      mensagem += `\n⚠️ _Atenção: você já usou ${percentualUsado.toFixed(0)}% do limite!_\n`;
    }
    
    mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💡 *Quer alterar algo?*\n`;
    mensagem += `• Valor → "era 95"\n`;
    mensagem += `• Excluir → "exclui essa"`;
    
    return { sucesso: true, mensagem };
    
  } catch (error) {
    console.error('[CARTAO] Erro:', error);
    return { sucesso: false, mensagem: '❌ Erro ao processar compra.' };
  }
}

// ============================================
// PROCESSAR INTENÇÃO DE CARTÃO (FUNÇÃO PRINCIPAL)
// ============================================

export async function processarIntencaoCartao(
  intencao: IntencaoCartao,
  userId: string,
  _phone: string
): Promise<{ mensagem: string; precisaConfirmacao: boolean; dados?: any }> {
  console.log('[CARTAO] Processando:', intencao.tipo, '| Valor:', intencao.valor, '| Cartão:', intencao.cartao, '| Descrição:', intencao.descricao);
  
  switch (intencao.tipo) {
    case 'listar_cartoes':
      return { 
        mensagem: await listarCartoes(userId), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_limite':
      return { 
        mensagem: await consultarLimite(userId, intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_fatura':
      return { 
        mensagem: await consultarFatura(userId, intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'compra_cartao':
    case 'compra_parcelada': {
      const cartoes = await buscarCartoesUsuario(userId);
      
      if (cartoes.length === 0) {
        return {
          mensagem: '💳 Você não tem cartões cadastrados.\n\n💡 _Cadastre seus cartões no app!_',
          precisaConfirmacao: false
        };
      }
      
      // Se só tem um cartão ou especificou qual
      let cartaoSelecionado = null;
      
      if (intencao.cartao) {
        const nomeNorm = intencao.cartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        cartaoSelecionado = cartoes.find((c: any) => {
          const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
        });
      } else if (cartoes.length === 1) {
        cartaoSelecionado = cartoes[0];
      }
      
      if (cartaoSelecionado) {
        // Registrar direto
        const resultado = await registrarCompraCartao(userId, {
          valor: intencao.valor!,
          parcelas: intencao.parcelas || 1,
          cartao_id: cartaoSelecionado.id,
          descricao: intencao.descricao || 'Compra no cartão',
          data_compra: new Date().toISOString().split('T')[0]
        });
        
        return {
          mensagem: resultado.mensagem,
          precisaConfirmacao: false
        };
      }
      
      // Precisa escolher cartão
      let msg = `💳 *Compra de ${formatarMoeda(intencao.valor!)}*`;
      if (intencao.parcelas && intencao.parcelas > 1) {
        msg += ` em ${intencao.parcelas}x`;
      }
      msg += `\n\n🏦 *Em qual cartão?*\n\n`;
      
      cartoes.forEach((c: any, i: number) => {
        const emoji = getEmojiBanco(c.name);
        msg += `${i + 1}. ${emoji} ${c.name}\n`;
      });
      
      msg += `\n_Responda com número/nome ou "cancelar"_`;
      
      return {
        mensagem: msg,
        precisaConfirmacao: true,
        dados: {
          tipo: 'compra_cartao',
          valor: intencao.valor,
          parcelas: intencao.parcelas || 1,
          descricao: intencao.descricao || 'Compra no cartão',
          cartoes: cartoes.map((c: any) => ({ id: c.id, name: c.name }))
        }
      };
    }
    
    default:
      return { 
        mensagem: '❓ Não entendi o que você quer fazer com o cartão.', 
        precisaConfirmacao: false 
      };
  }
}
