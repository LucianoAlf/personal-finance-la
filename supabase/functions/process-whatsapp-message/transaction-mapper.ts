// ============================================
// TRANSACTION MAPPER - CRUD de Transações
// ============================================
// 
// Responsável por:
// - Registrar transações (receita/despesa)
// - Editar transações existentes
// - Excluir transações
// - Buscar contas e categorias
// 
// ============================================

import { getSupabase, formatCurrency, todayBrasilia } from './utils.ts';
import type { IntencaoClassificada } from './nlp-processor.ts';
import { enviarConfirmacaoComBotoes, enviarSelecaoContas } from './button-sender.ts';

// ============================================
// TIPOS
// ============================================

export interface TransacaoInput {
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  account_id: string;
  category_id?: string;
  description?: string;
  transaction_date?: string;
}

export interface TransacaoResponse {
  success: boolean;
  transacao_id?: string;
  mensagem: string;
  dados?: Record<string, unknown>;
  precisaConfirmacao?: boolean;
  enviarBotoes?: boolean;
}

export interface ContaUsuario {
  id: string;
  name: string;
  icon: string | null;
  current_balance: number;
  type: string;
}

export interface CategoriaUsuario {
  id: string;
  name: string;
  icon: string | null;
  type: 'income' | 'expense';
}

// ============================================
// MAPEAMENTO DE BANCOS
// ============================================

const MAPEAMENTO_BANCOS: Record<string, string[]> = {
  'nubank': ['nubank', 'nu', 'roxinho', 'roxo'],
  'itau': ['itau', 'itaú', 'iti'],
  'bradesco': ['bradesco', 'bra'],
  'santander': ['santander', 'san'],
  'caixa': ['caixa', 'cef'],
  'inter': ['inter', 'banco inter'],
  'c6': ['c6', 'c6 bank', 'c6bank'],
  'picpay': ['picpay', 'pic pay'],
  'mercadopago': ['mercado pago', 'mercadopago', 'mp'],
  'bb': ['banco do brasil', 'bb'],
  'original': ['original', 'banco original'],
  'next': ['next'],
  'neon': ['neon'],
  'will': ['will', 'will bank'],
  'pagbank': ['pagbank', 'pagseguro'],
};

// ============================================
// MAPEAMENTO DE CATEGORIAS
// ============================================

const MAPEAMENTO_CATEGORIAS: Record<string, string[]> = {
  'alimentacao': ['alimentação', 'alimentacao', 'comida', 'mercado', 'supermercado', 'restaurante', 'lanche'],
  'transporte': ['transporte', 'uber', '99', 'taxi', 'gasolina', 'combustível', 'combustivel'],
  'saude': ['saúde', 'saude', 'farmácia', 'farmacia', 'médico', 'medico', 'hospital'],
  'educacao': ['educação', 'educacao', 'curso', 'escola', 'faculdade', 'livro'],
  'moradia': ['moradia', 'casa', 'aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua'],
  'lazer': ['lazer', 'entretenimento', 'cinema', 'netflix', 'spotify', 'show'],
  'vestuario': ['vestuário', 'vestuario', 'roupa', 'calçado', 'calcado', 'shopping'],
  'pet': ['pet', 'animal', 'cachorro', 'gato', 'ração', 'racao', 'veterinário', 'veterinario'],
  'outros': ['outros', 'outro', 'geral'],
};

// Mapeamento NLP → Nome no banco
const NLP_PARA_CATEGORIA: Record<string, string> = {
  'alimentacao': 'Alimentação',
  'alimentação': 'Alimentação',
  'transporte': 'Transporte',
  'saude': 'Saúde',
  'saúde': 'Saúde',
  'educacao': 'Educação',
  'educação': 'Educação',
  'moradia': 'Moradia',
  'lazer': 'Lazer',
  'vestuario': 'Vestuário',
  'vestuário': 'Vestuário',
  'pet': 'Pets',
  'pets': 'Pets',
  'tecnologia': 'Tecnologia',
  'assinaturas': 'Assinaturas',
  'viagens': 'Viagens',
  'beleza': 'Beleza',
  'esportes': 'Esportes',
  'investimentos': 'Investimentos',
  'outros': 'Outros',
  'mercado': 'Alimentação',
  'supermercado': 'Alimentação',
  'restaurante': 'Alimentação',
  'uber': 'Transporte',
  'gasolina': 'Transporte',
  'farmacia': 'Saúde',
  'farmácia': 'Saúde',
};

// ============================================
// BUSCAR CATEGORIA (global ou do usuário)
// ============================================

async function buscarCategoriaInteligente(
  userId: string,
  nomeCategoria: string,
  tipo: 'income' | 'expense'
): Promise<string | null> {
  const supabase = getSupabase();
  
  // Normalizar nome
  const nomeNormalizado = nomeCategoria.toLowerCase().trim();
  const nomeBanco = NLP_PARA_CATEGORIA[nomeNormalizado] || nomeCategoria;
  
  console.log('[CATEGORIA] Buscando:', nomeNormalizado, '→', nomeBanco);
  
  // 1. Tentar buscar categoria do usuário primeiro
  const { data: catUsuario } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', nomeBanco)
    .eq('type', tipo)
    .limit(1)
    .maybeSingle();
  
  if (catUsuario) {
    console.log('[CATEGORIA] Encontrada do usuário:', catUsuario.name);
    return catUsuario.id;
  }
  
  // 2. Buscar categoria global (is_default = true)
  const { data: catGlobal } = await supabase
    .from('categories')
    .select('id, name')
    .is('user_id', null)
    .or(`is_default.eq.true`)
    .ilike('name', nomeBanco)
    .eq('type', tipo)
    .limit(1)
    .maybeSingle();
  
  if (catGlobal) {
    console.log('[CATEGORIA] Encontrada global:', catGlobal.name);
    return catGlobal.id;
  }
  
  // 3. Busca parcial em categorias globais
  const { data: catParcial } = await supabase
    .from('categories')
    .select('id, name')
    .or(`user_id.is.null,is_default.eq.true`)
    .ilike('name', `%${nomeBanco}%`)
    .eq('type', tipo)
    .limit(1)
    .maybeSingle();
  
  if (catParcial) {
    console.log('[CATEGORIA] Encontrada parcial:', catParcial.name);
    return catParcial.id;
  }
  
  console.log('[CATEGORIA] Não encontrada, usando Outros');
  
  // 4. Fallback: categoria "Outros"
  const { data: outros } = await supabase
    .from('categories')
    .select('id')
    .or(`user_id.is.null,is_default.eq.true`)
    .eq('name', 'Outros')
    .eq('type', tipo)
    .limit(1)
    .maybeSingle();
  
  return outros?.id || null;
}

// ============================================
// REGISTRAR TRANSAÇÃO
// ============================================

export async function registrarTransacao(
  input: TransacaoInput
): Promise<TransacaoResponse> {
  const supabase = getSupabase();
  
  console.log('[TRANSACTION] Registrando:', {
    type: input.type,
    amount: input.amount,
    account_id: input.account_id
  });
  
  try {
    // Validar valor
    if (!input.amount || input.amount <= 0 || isNaN(input.amount)) {
      return {
        success: false,
        mensagem: '❌ Valor inválido. Informe um valor maior que zero.'
      };
    }
    
    if (input.amount >= 1000000) {
      return {
        success: false,
        mensagem: '❌ Valor muito alto. Verifique se está correto.'
      };
    }
    
    // Buscar categoria se não foi informada
    let categoryId = input.category_id;
    
    // Se ainda não tem categoria, buscar "Outros"
    if (!categoryId) {
      const outros = await buscarCategoriaPorNome(input.user_id, 'outros', input.type);
      categoryId = outros?.id;
    }
    
    // Inserir transação
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: input.user_id,
        account_id: input.account_id,
        category_id: categoryId,
        type: input.type,
        amount: input.amount,
        description: input.description || 'Via WhatsApp',
        transaction_date: input.transaction_date || todayBrasilia(),
        is_paid: true,
        source: 'whatsapp',
        status: 'completed',
        notes: `Registrado via WhatsApp em ${new Date().toLocaleString('pt-BR')}`
      })
      .select('id, amount, type, description, account_id, category_id')
      .single();
    
    if (error) {
      console.error('[TRANSACTION] Erro ao inserir:', error);
      throw error;
    }
    
    console.log('[TRANSACTION] Transação criada:', data.id);
    
    // Buscar dados para mensagem de confirmação
    const { data: conta } = await supabase
      .from('accounts')
      .select('name, icon')
      .eq('id', data.account_id)
      .single();
    
    const { data: categoria } = await supabase
      .from('categories')
      .select('name, icon')
      .eq('id', data.category_id)
      .single();
    
    // Montar mensagem de confirmação
    const tipoEmoji = input.type === 'income' ? '💰' : '💸';
    const tipoTexto = input.type === 'income' ? 'Receita' : 'Despesa';
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    
    const mensagem = `✅ *Lançamento Registrado!*

${tipoEmoji} ${tipoTexto}
💵 ${formatCurrency(input.amount)}
📂 ${categoria?.icon || '📁'} ${categoria?.name || 'Outros'}
📝 ${input.description || 'Via WhatsApp'}
🏦 ${conta?.icon || '🏦'} ${conta?.name || 'Conta'}
📅 ${dataFormatada}`;
    
    return {
      success: true,
      transacao_id: data.id,
      mensagem,
      dados: {
        ...data,
        conta_nome: conta?.name,
        categoria_nome: categoria?.name
      },
      // Flag para indicar que deve enviar botões
      enviarBotoes: true
    };
    
  } catch (error) {
    console.error('[TRANSACTION] Erro ao registrar:', error);
    return {
      success: false,
      mensagem: '❌ Erro ao registrar transação. Tente novamente.'
    };
  }
}

// ============================================
// EDITAR TRANSAÇÃO
// ============================================

export async function editarTransacao(
  transacaoId: string,
  userId: string,
  campos: Partial<{
    amount: number;
    description: string;
    category_id: string;
    account_id: string;
  }>
): Promise<TransacaoResponse> {
  const supabase = getSupabase();
  
  console.log('[TRANSACTION] Editando:', transacaoId, campos);
  
  try {
    // Verificar se transação existe e pertence ao usuário
    const { data: transacao } = await supabase
      .from('transactions')
      .select('id, amount, description')
      .eq('id', transacaoId)
      .eq('user_id', userId)
      .single();
    
    if (!transacao) {
      return {
        success: false,
        mensagem: '❌ Transação não encontrada.'
      };
    }
    
    // Atualizar
    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...campos,
        updated_at: new Date().toISOString()
      })
      .eq('id', transacaoId)
      .eq('user_id', userId)
      .select('id, amount, description')
      .single();
    
    if (error) throw error;
    
    let mensagemAlteracao = '';
    if (campos.amount) {
      mensagemAlteracao = `Valor: ${formatCurrency(transacao.amount)} → ${formatCurrency(campos.amount)}`;
    } else if (campos.description) {
      mensagemAlteracao = `Descrição: "${campos.description}"`;
    } else if (campos.account_id) {
      mensagemAlteracao = 'Conta alterada';
    } else if (campos.category_id) {
      mensagemAlteracao = 'Categoria alterada';
    }
    
    return {
      success: true,
      transacao_id: data.id,
      mensagem: `✅ *Transação Atualizada!*\n\n${mensagemAlteracao}`,
      dados: data
    };
    
  } catch (error) {
    console.error('[TRANSACTION] Erro ao editar:', error);
    return {
      success: false,
      mensagem: '❌ Erro ao editar transação.'
    };
  }
}

// ============================================
// EXCLUIR TRANSAÇÃO
// ============================================

export async function excluirTransacao(
  transacaoId: string,
  userId: string
): Promise<TransacaoResponse> {
  const supabase = getSupabase();
  
  console.log('[TRANSACTION] Excluindo:', transacaoId);
  
  try {
    // Buscar dados antes de excluir (para mensagem)
    const { data: transacao } = await supabase
      .from('transactions')
      .select('id, amount, description, type')
      .eq('id', transacaoId)
      .eq('user_id', userId)
      .single();
    
    if (!transacao) {
      return {
        success: false,
        mensagem: '❌ Transação não encontrada.'
      };
    }
    
    // Excluir
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transacaoId)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const tipoEmoji = transacao.type === 'income' ? '💰' : '💸';
    
    return {
      success: true,
      transacao_id: transacaoId,
      mensagem: `🗑️ *Transação Excluída!*\n\n${tipoEmoji} ${formatCurrency(transacao.amount)}\n📝 ${transacao.description || 'Via WhatsApp'}`
    };
    
  } catch (error) {
    console.error('[TRANSACTION] Erro ao excluir:', error);
    return {
      success: false,
      mensagem: '❌ Erro ao excluir transação.'
    };
  }
}

// ============================================
// BUSCAR ÚLTIMA TRANSAÇÃO
// ============================================

export async function buscarUltimaTransacao(
  userId: string
): Promise<{ id: string; amount: number; description: string; type: string } | null> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('transactions')
    .select('id, amount, description, type')
    .eq('user_id', userId)
    .eq('source', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return data;
}

// ============================================
// BUSCAR CONTA POR NOME
// ============================================

export async function buscarContaPorNome(
  userId: string,
  nomeConta: string
): Promise<ContaUsuario | null> {
  const supabase = getSupabase();
  const nomeNormalizado = nomeConta.toLowerCase().trim();
  
  // Encontrar nome real da conta via mapeamento
  let termoBusca = nomeNormalizado;
  for (const [banco, apelidos] of Object.entries(MAPEAMENTO_BANCOS)) {
    if (apelidos.some(a => nomeNormalizado.includes(a))) {
      termoBusca = banco;
      break;
    }
  }
  
  // Buscar conta
  const { data } = await supabase
    .from('accounts')
    .select('id, name, icon, current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .ilike('name', `%${termoBusca}%`)
    .limit(1)
    .single();
  
  return data;
}

// ============================================
// BUSCAR CATEGORIA POR NOME
// ============================================

export async function buscarCategoriaPorNome(
  userId: string,
  nomeCategoria: string,
  tipo: 'income' | 'expense'
): Promise<CategoriaUsuario | null> {
  const supabase = getSupabase();
  const nomeNormalizado = nomeCategoria.toLowerCase().trim();
  
  // Encontrar nome real via mapeamento
  let termoBusca = nomeNormalizado;
  for (const [categoria, apelidos] of Object.entries(MAPEAMENTO_CATEGORIAS)) {
    if (apelidos.some(a => nomeNormalizado.includes(a))) {
      termoBusca = categoria;
      break;
    }
  }
  
  // Buscar categoria
  const { data } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('user_id', userId)
    .eq('type', tipo)
    .ilike('name', `%${termoBusca}%`)
    .limit(1)
    .single();
  
  return data;
}

// ============================================
// BUSCAR CONTAS DO USUÁRIO
// ============================================

export async function buscarContas(
  userId: string
): Promise<ContaUsuario[]> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('accounts')
    .select('id, name, icon, current_balance, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  return data || [];
}

// ============================================
// BUSCAR CATEGORIAS DO USUÁRIO
// ============================================

export async function buscarCategorias(
  userId: string,
  tipo?: 'income' | 'expense'
): Promise<CategoriaUsuario[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('user_id', userId)
    .order('name');
  
  if (tipo) {
    query = query.eq('type', tipo);
  }
  
  const { data } = await query;
  
  return data || [];
}

// ============================================
// PROCESSAR INTENÇÃO DE TRANSAÇÃO
// ============================================

export async function processarIntencaoTransacao(
  intencao: IntencaoClassificada,
  userId: string,
  phone: string
): Promise<TransacaoResponse> {
  const { entidades } = intencao;
  
  console.log('[TRANSACTION] Processando intenção:', intencao.intencao, entidades);
  
  // Verificar se tem valor válido
  if (!entidades.valor || entidades.valor <= 0 || isNaN(entidades.valor)) {
    return {
      success: false,
      mensagem: '❓ Não entendi o valor. Pode repetir?\n\n_Exemplo: "Gastei 50 no mercado"_',
      precisaConfirmacao: false
    };
  }
  
  // Buscar conta
  let contaId: string | null = null;
  let contaNome: string | null = null;
  
  if (entidades.conta) {
    const conta = await buscarContaPorNome(userId, entidades.conta);
    if (conta) {
      contaId = conta.id;
      contaNome = conta.name;
    }
  }
  
  // Se não tem conta, verificar quantas o usuário tem
  if (!contaId) {
    const contas = await buscarContas(userId);
    
    if (contas.length === 0) {
      return {
        success: false,
        mensagem: '❌ Você não tem contas cadastradas.\n\n_Cadastre uma conta no app primeiro._',
        precisaConfirmacao: false
      };
    }
    
    if (contas.length === 1) {
      // Usar única conta disponível
      contaId = contas[0].id;
      contaNome = contas[0].name;
    } else {
      // Perguntar qual conta
      const listaContas = contas.map(c => 
        `• ${c.icon || '🏦'} ${c.name}`
      ).join('\n');
      
      return {
        success: false,
        mensagem: `💳 *Em qual conta?*\n\n${listaContas}\n\n_Responda com o nome da conta_`,
        precisaConfirmacao: true
      };
    }
  }
  
  // Registrar transação
  const tipo = intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense';
  
  // Buscar categoria usando função inteligente
  let categoryId: string | undefined;
  if (entidades.categoria) {
    const catId = await buscarCategoriaInteligente(userId, entidades.categoria, tipo);
    if (catId) categoryId = catId;
  }
  
  // Usar descrição do NLP (não fazer parsing manual!)
  // O GPT já extrai "Mercado" de "Gastei 30 reais no mercado"
  const descricao = entidades.descricao || entidades.categoria || 'Via WhatsApp';
  
  console.log('[TRANSACTION] Preparando:', {
    valor: entidades.valor,
    descricao,
    categoria: entidades.categoria,
    categoryId,
    conta: contaNome
  });
  
  const resultado = await registrarTransacao({
    user_id: userId,
    amount: entidades.valor,
    type: tipo,
    account_id: contaId!,
    description: descricao,
    category_id: categoryId
  });
  
  return resultado;
}

// ============================================
// PROCESSAR EDIÇÃO
// ============================================

export async function processarEdicao(
  userId: string,
  entidades: { valor?: number; conta?: string; descricao?: string; campo?: string }
): Promise<TransacaoResponse> {
  // Buscar última transação
  const ultimaTransacao = await buscarUltimaTransacao(userId);
  
  if (!ultimaTransacao) {
    return {
      success: false,
      mensagem: '❌ Não encontrei nenhuma transação recente para editar.'
    };
  }
  
  const campos: Partial<{ amount: number; description: string; account_id: string }> = {};
  
  if (entidades.valor && entidades.valor > 0) {
    campos.amount = entidades.valor;
  }
  
  if (entidades.descricao) {
    campos.description = entidades.descricao;
  }
  
  if (entidades.conta) {
    const conta = await buscarContaPorNome(userId, entidades.conta);
    if (conta) {
      campos.account_id = conta.id;
    }
  }
  
  if (Object.keys(campos).length === 0) {
    return {
      success: false,
      mensagem: '❓ O que você quer alterar?\n\n_Exemplos: "era 50", "muda pra Nubank"_'
    };
  }
  
  return await editarTransacao(ultimaTransacao.id, userId, campos);
}

// ============================================
// PROCESSAR EXCLUSÃO
// ============================================

export async function processarExclusao(
  userId: string
): Promise<TransacaoResponse> {
  // Buscar última transação
  const ultimaTransacao = await buscarUltimaTransacao(userId);
  
  if (!ultimaTransacao) {
    return {
      success: false,
      mensagem: '❌ Não encontrei nenhuma transação recente para excluir.'
    };
  }
  
  return await excluirTransacao(ultimaTransacao.id, userId);
}
