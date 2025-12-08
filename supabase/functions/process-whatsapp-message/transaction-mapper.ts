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
import { templateTransacaoRegistrada, templatePerguntaConta, templateTransacaoAtualizada, formatarValor } from './response-templates.ts';
import {
  CATEGORIA_KEYWORDS,
  BANCO_ALIAS_TO_NOME,
  NLP_CATEGORIA_MAP,
  detectarCategoriaPorPalavraChave,
  detectarBancoPorAlias,
  detectarPagamentoPorAlias,
  normalizarCategoriaNLP,
  getBancoConfig
} from '../shared/mappings.ts';

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
  payment_method?: 'pix' | 'credit' | 'debit' | 'cash' | 'boleto' | 'transfer' | 'other';
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
// MAPEAMENTOS CENTRALIZADOS
// ============================================
// Todos os mapeamentos foram movidos para shared/mappings.ts
// Importar de lá e usar as funções centralizadas!
// ============================================

// Mapeamento NLP → Nome no banco (DEPRECATED - usar NLP_CATEGORIA_MAP)
const NLP_PARA_CATEGORIA_DEPRECATED: Record<string, string> = {
  // Categorias diretas
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
  
  // Alimentação
  'mercado': 'Alimentação',
  'supermercado': 'Alimentação',
  'restaurante': 'Alimentação',
  'almoço': 'Alimentação',
  'almoco': 'Alimentação',
  'jantar': 'Alimentação',
  'lanche': 'Alimentação',
  'café': 'Alimentação',
  'cafe': 'Alimentação',
  'ifood': 'Alimentação',
  'rappi': 'Alimentação',
  'padaria': 'Alimentação',
  'açougue': 'Alimentação',
  'acougue': 'Alimentação',
  'feira': 'Alimentação',
  'comida': 'Alimentação',
  'rango': 'Alimentação',
  'dogão': 'Alimentação',
  'dogao': 'Alimentação',
  'breja': 'Alimentação',
  'cerveja': 'Alimentação',
  
  // Transporte
  'uber': 'Transporte',
  '99': 'Transporte',
  'taxi': 'Transporte',
  'táxi': 'Transporte',
  'gasolina': 'Transporte',
  'combustivel': 'Transporte',
  'combustível': 'Transporte',
  'estacionamento': 'Transporte',
  'pedagio': 'Transporte',
  'pedágio': 'Transporte',
  'corrida': 'Transporte',
  'onibus': 'Transporte',
  'ônibus': 'Transporte',
  'metro': 'Transporte',
  'metrô': 'Transporte',
  'abasteci': 'Transporte',
  'abastecimento': 'Transporte',
  'abastecer': 'Transporte',
  'posto': 'Transporte',
  'etanol': 'Transporte',
  'alcool': 'Transporte',
  'diesel': 'Transporte',
  
  // Saúde
  'farmacia': 'Saúde',
  'farmácia': 'Saúde',
  'remedio': 'Saúde',
  'remédio': 'Saúde',
  'medico': 'Saúde',
  'médico': 'Saúde',
  'consulta': 'Saúde',
  'exame': 'Saúde',
  'dentista': 'Saúde',
  'hospital': 'Saúde',
  
  // Moradia
  'aluguel': 'Moradia',
  'condominio': 'Moradia',
  'condomínio': 'Moradia',
  'luz': 'Moradia',
  'energia': 'Moradia',
  'agua': 'Moradia',
  'água': 'Moradia',
  'gas': 'Moradia',
  'gás': 'Moradia',
  'internet': 'Moradia',
  'iptu': 'Moradia',
  
  // Lazer
  'cinema': 'Lazer',
  'netflix': 'Lazer',
  'spotify': 'Lazer',
  'streaming': 'Lazer',
  'show': 'Lazer',
  'bar': 'Lazer',
  'festa': 'Lazer',
  
  // Educação
  'curso': 'Educação',
  'escola': 'Educação',
  'faculdade': 'Educação',
  'livro': 'Educação',
  'mensalidade': 'Educação',
  
  // Vestuário
  'roupa': 'Vestuário',
  'sapato': 'Vestuário',
  'tenis': 'Vestuário',
  'tênis': 'Vestuário',
  'shopping': 'Vestuário',
  'camisa': 'Vestuário',
  
  // Viagens
  'viagem': 'Viagens',
  'hotel': 'Viagens',
  'hospedagem': 'Viagens',
  'pousada': 'Viagens',
  'airbnb': 'Viagens',
  'passagem': 'Viagens',
  'aeroporto': 'Viagens',
  'aviao': 'Viagens',
  'avião': 'Viagens',
  
  // Pets
  'racao': 'Pets',
  'ração': 'Pets',
  'veterinario': 'Pets',
  'veterinário': 'Pets',
  'petshop': 'Pets',
  
  // Beleza
  'salao': 'Beleza',
  'salão': 'Beleza',
  'cabelo': 'Beleza',
  'unha': 'Beleza',
  'manicure': 'Beleza',
  'estetica': 'Beleza',
  'estética': 'Beleza',
  
  // Esportes
  'academia': 'Esportes',
  'treino': 'Esportes',
  'futebol': 'Esportes',
  
  // Tecnologia
  'celular': 'Tecnologia',
  'computador': 'Tecnologia',
  'notebook': 'Tecnologia',
  'eletronico': 'Tecnologia',
  'eletrônico': 'Tecnologia',
  
  // ========== RECEITAS ==========
  'salario': 'Salário',
  'salário': 'Salário',
  'pagamento': 'Salário',
  'holerite': 'Salário',
  'contracheque': 'Salário',
  
  'freelance': 'Freelance',
  'freela': 'Freelance',
  'bico': 'Freelance',
  'projeto': 'Freelance',
  
  'dividendo': 'Investimentos',
  'dividendos': 'Investimentos',
  'proventos': 'Investimentos',
  'rendimento': 'Investimentos',
  'juros': 'Investimentos',
  
  'bonus': 'Bonificações',
  'bônus': 'Bonificações',
  'plr': 'Bonificações',
  '13': 'Bonificações',
  'decimo': 'Bonificações',
  'décimo': 'Bonificações',
};

// Função para detectar categoria por QUALQUER texto (descrição, comando, categoria NLP)
// O parâmetro valor é opcional e usado para contexto (ex: água < R$20 = Alimentação, >= R$20 = Moradia)
function detectarCategoriaPorTexto(textos: string[], valor?: number): string | null {
  // Concatenar todos os textos e normalizar
  const textoCompleto = textos
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  console.log('[DETECTAR] ==========================================');
  console.log('[DETECTAR] Textos recebidos:', JSON.stringify(textos));
  console.log('[DETECTAR] Texto completo normalizado:', textoCompleto);
  console.log('[DETECTAR] Valor:', valor);
  console.log('[DETECTAR] Contém "luz"?', textoCompleto.includes('luz'));
  
  // ✅ REGRA ESPECIAL: "água" depende do valor
  // < R$20 = garrafa de água (Alimentação)
  // >= R$20 = conta de água (Moradia)
  if (textoCompleto.includes('agua')) {
    if (valor !== undefined && valor < 20) {
      console.log('[DETECTAR] ✅ Água com valor < R$20 → Alimentação (garrafa)');
      return 'Alimentação';
    } else {
      console.log('[DETECTAR] ✅ Água com valor >= R$20 → Moradia (conta)');
      return 'Moradia';
    }
  }
  
  // ✅ Usar função centralizada de shared/mappings.ts
  const categoriaDetectada = detectarCategoriaPorPalavraChave(textoCompleto);
  if (categoriaDetectada) {
    console.log('[DETECTAR] ✅ Match encontrado:', categoriaDetectada);
    return categoriaDetectada;
  }
  
  console.log('[DETECTAR] ❌ Nenhum match');
  return null;
}

// ============================================
// BUSCAR CATEGORIA (global ou do usuário)
// ============================================

// Função auxiliar para normalizar texto (remove acentos e lowercase)
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
}

async function buscarCategoriaInteligente(
  userId: string,
  nomeCategoria: string,
  tipo: 'income' | 'expense'
): Promise<string | null> {
  const supabase = getSupabase();
  
  // ✅ Usar função centralizada de shared/mappings.ts
  const nomeNormalizado = normalizarTexto(nomeCategoria);
  const nomeBanco = normalizarCategoriaNLP(nomeNormalizado) || nomeCategoria;
  const nomeBancoNorm = normalizarTexto(nomeBanco);
  
  console.log('[CATEGORIA] ========================================');
  console.log('[CATEGORIA] Input:', nomeCategoria);
  console.log('[CATEGORIA] Normalizado (sem acento):', nomeNormalizado);
  console.log('[CATEGORIA] Mapeado para:', nomeBanco);
  console.log('[CATEGORIA] Mapeado normalizado:', nomeBancoNorm);
  console.log('[CATEGORIA] Tipo:', tipo);
  
  try {
    // BUSCA SIMPLES: todas as categorias do tipo
    const { data: todasCategorias, error: errAll } = await supabase
      .from('categories')
      .select('id, name, user_id, type')
      .eq('type', tipo);
    
    console.log('[CATEGORIA] Total categorias tipo', tipo, ':', todasCategorias?.length || 0);
    if (todasCategorias && todasCategorias.length > 0) {
      console.log('[CATEGORIA] Categorias disponíveis:', todasCategorias.map((c: any) => c.name).join(', '));
    }
    
    if (errAll) {
      console.error('[CATEGORIA] Erro ao listar categorias:', errAll);
      return null;
    }
    
    if (!todasCategorias || todasCategorias.length === 0) {
      console.log('[CATEGORIA] ❌ Nenhuma categoria encontrada no banco!');
      return null;
    }
    
    // Buscar por nome EXATO (normalizado, sem acentos)
    const categoriaEncontrada = todasCategorias.find((c: any) => 
      normalizarTexto(c.name) === nomeBancoNorm
    );
    
    if (categoriaEncontrada) {
      console.log('[CATEGORIA] ✅ ENCONTRADA (exata):', categoriaEncontrada.name, '| ID:', categoriaEncontrada.id);
      return categoriaEncontrada.id;
    }
    
    // Busca parcial (contém)
    const categoriaParcial = todasCategorias.find((c: any) => {
      const catNorm = normalizarTexto(c.name);
      return catNorm.includes(nomeBancoNorm) || nomeBancoNorm.includes(catNorm);
    });
    
    if (categoriaParcial) {
      console.log('[CATEGORIA] ✅ ENCONTRADA (parcial):', categoriaParcial.name, '| ID:', categoriaParcial.id);
      return categoriaParcial.id;
    }
    
    console.log('[CATEGORIA] ❌ NÃO ENCONTRADA para:', nomeBanco, '(norm:', nomeBancoNorm, ')');
    console.log('[CATEGORIA] ========================================');
    return null;
    
  } catch (err) {
    console.error('[CATEGORIA] ERRO CRÍTICO:', err);
    return null;
  }
}

// ============================================
// DETECTAR CATEGORIA AUTOMATICAMENTE (EXPORTADA)
// ============================================

export async function detectarCategoriaAutomatica(
  userId: string,
  descricao: string,
  tipo: 'income' | 'expense' = 'expense',
  valor?: number // ✅ Novo parâmetro para contexto de valor
): Promise<string | null> {
  console.log('[CATEGORIA-AUTO] Detectando para:', descricao, 'tipo:', tipo, 'valor:', valor);
  
  const categoriaDetectada = detectarCategoriaPorTexto([descricao], valor);
  
  if (categoriaDetectada) {
    console.log('[CATEGORIA-AUTO] Categoria detectada:', categoriaDetectada);
    const catId = await buscarCategoriaInteligente(userId, categoriaDetectada, tipo);
    if (catId) {
      console.log('[CATEGORIA-AUTO] ✅ ID encontrado:', catId);
      return catId;
    }
  }
  
  // Fallback: buscar "Outros"
  console.log('[CATEGORIA-AUTO] Usando fallback "Outros"');
  const outros = await buscarCategoriaPorNome(userId, 'Outros', tipo);
  return outros?.id || null;
}

// ============================================
// TEMPLATE PERGUNTA MÉTODO DE PAGAMENTO
// ============================================

export function templatePerguntaMetodoPagamento(descricao: string, valor: number, bancos?: string[]): string {
  const valorFormatado = formatCurrency(valor);
  
  let msg = `💰 *${descricao || 'Despesa'}* - ${valorFormatado}\n\n`;
  msg += `💳 Como você pagou?\n\n`;
  msg += `1️⃣ Cartão de crédito\n`;
  msg += `2️⃣ Débito\n`;
  msg += `3️⃣ PIX\n`;
  msg += `4️⃣ Dinheiro\n\n`;
  
  // Mostrar bancos disponíveis se houver
  if (bancos && bancos.length > 0) {
    msg += `🏦 Seus bancos: ${bancos.join(', ')}\n\n`;
    msg += `💡 _Responda: 'Cartão ${bancos[0]}' ou '1 ${bancos[0]}'_\n\n`;
  } else {
    msg += `_Responda com o número ou nome_\n\n`;
  }
  
  msg += `_Ana Clara • Personal Finance_ 🙋🏻‍♀️`;
  
  return msg;
}

// Versão assíncrona que busca os bancos do usuário
export async function templatePerguntaMetodoPagamentoComBancos(
  descricao: string, 
  valor: number, 
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar cartões de crédito
  const { data: cartoes } = await supabase
    .from('credit_cards')
    .select('name')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  // Buscar contas bancárias
  const { data: contas } = await supabase
    .from('accounts')
    .select('name')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  // Combinar nomes únicos de bancos
  const bancosSet = new Set<string>();
  cartoes?.forEach((c: { name: string }) => bancosSet.add(c.name));
  contas?.forEach((c: { name: string }) => bancosSet.add(c.name));
  
  const bancos = Array.from(bancosSet);
  
  return templatePerguntaMetodoPagamento(descricao, valor, bancos);
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
        payment_method: input.payment_method || null,
        notes: `Registrado via WhatsApp em ${new Date().toLocaleString('pt-BR')}`
      })
      .select('id, amount, type, description, account_id, category_id, payment_method')
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
    
    // Usar novo template profissional
    const mensagem = templateTransacaoRegistrada({
      type: input.type,
      amount: input.amount,
      description: input.description || 'Via WhatsApp',
      category: categoria?.name || 'Outros',
      account: conta?.name || 'Conta',
      data: new Date(),
      paymentMethod: input.payment_method // ✅ Incluir forma de pagamento
    });
    
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
  
  // ✅ Usar função centralizada de shared/mappings.ts
  // Detectar banco por alias
  let termoBusca = detectarBancoPorAlias(nomeNormalizado) || nomeNormalizado;
  
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
  
  // ✅ Usar função centralizada de shared/mappings.ts
  // Detectar categoria por palavra-chave
  let termoBusca = detectarCategoriaPorPalavraChave(nomeNormalizado) || nomeNormalizado;
  
  console.log('[CATEGORIA] buscarCategoriaPorNome:', nomeCategoria, '→', termoBusca, '| tipo:', tipo);
  
  // 1. Primeiro buscar categoria do USUÁRIO
  const { data: catUsuario } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('user_id', userId)
    .eq('type', tipo)
    .ilike('name', `%${termoBusca}%`)
    .limit(1)
    .maybeSingle();
  
  if (catUsuario) {
    console.log('[CATEGORIA] ✅ Encontrada do usuário:', catUsuario.name);
    return catUsuario;
  }
  
  // 2. Se não encontrou, buscar categoria GLOBAL (user_id = null)
  const { data: catGlobal } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .is('user_id', null)
    .eq('type', tipo)
    .ilike('name', `%${termoBusca}%`)
    .limit(1)
    .maybeSingle();
  
  if (catGlobal) {
    console.log('[CATEGORIA] ✅ Encontrada global:', catGlobal.name);
    return catGlobal;
  }
  
  console.log('[CATEGORIA] ❌ Não encontrada:', termoBusca);
  return null;
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
  
  // ✅ BUG #17: Validar se descrição realmente existe na mensagem original
  // O NLP às vezes inventa descrições que não estão no texto
  if (entidades.descricao && intencao.comando_original) {
    const textoOriginal = intencao.comando_original.toLowerCase();
    const descricaoLower = entidades.descricao.toLowerCase();
    
    // Lista de descrições comuns que o NLP pode inventar
    const descricoesSuspeitas = ['uber', 'ifood', 'mercado', 'lanche', 'almoço', 'jantar', 'café'];
    
    // Se é uma descrição comum mas NÃO está no texto original, é alucinação
    if (descricoesSuspeitas.includes(descricaoLower) && !textoOriginal.includes(descricaoLower)) {
      console.log('[TRANSACTION] ⚠️ [BUG #17] Descrição alucinada detectada:', entidades.descricao);
      console.log('[TRANSACTION] Texto original não contém:', descricaoLower);
      entidades.descricao = undefined;
      entidades.categoria = undefined;
    }
  }
  
  // ============================================
  // VERIFICAR MÉTODO DE PAGAMENTO
  // ============================================
  
  // ✅ BUG #10: Fallback para detectar forma_pagamento ANTES de verificar
  // Se NLP não extraiu forma_pagamento, detectar no texto original
  if (!entidades.forma_pagamento && intencao.comando_original) {
    const pagamentoDetectado = detectarPagamentoPorAlias(intencao.comando_original);
    if (pagamentoDetectado) {
      const mapeoPagamento: Record<string, 'pix' | 'credito' | 'debito' | 'dinheiro' | 'boleto'> = {
        'credit': 'credito',
        'debit': 'debito',
        'pix': 'pix',
        'cash': 'dinheiro',
        'boleto': 'boleto'
      };
      const formaMapeada = mapeoPagamento[pagamentoDetectado.id];
      if (formaMapeada) {
        entidades.forma_pagamento = formaMapeada;
        console.log('[TRANSACTION] ✅ Forma pagamento detectada por fallback (ANTES):', entidades.forma_pagamento);
      }
    }
  }
  
  // Se não especificou forma de pagamento, perguntar
  const formasPagamentoValidas = ['pix', 'credito', 'debito', 'dinheiro', 'boleto', 'transferencia'];
  const metodoEspecificado = entidades.forma_pagamento && 
    formasPagamentoValidas.includes(entidades.forma_pagamento);
  
  console.log('[TRANSACTION] Método de pagamento:', {
    forma_pagamento: entidades.forma_pagamento,
    especificado: metodoEspecificado,
    conta: entidades.conta  // 🔧 DEBUG: Verificar se conta está chegando
  });
  
  // ✅ BUG #17: Se não tem descrição, perguntar antes de pedir método
  if (!entidades.descricao && intencao.intencao === 'REGISTRAR_DESPESA') {
    console.log('[TRANSACTION] ⚠️ [BUG #17] Sem descrição, perguntando ao usuário');
    const contaLabel = entidades.conta ? `no ${entidades.conta}` : '';
    const valorFormatado = entidades.valor.toFixed(2);
    
    return {
      success: false,
      mensagem: `💰 R$ ${valorFormatado} ${contaLabel}\n\n📝 O que você comprou/pagou?`,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_description',
        valor: entidades.valor,
        conta: entidades.conta,
        tipo: 'expense'
      }
    };
  }
  
  // Se não especificou método, perguntar (apenas para despesas)
  if (!metodoEspecificado && intencao.intencao === 'REGISTRAR_DESPESA') {
    const descricao = entidades.descricao || entidades.categoria || 'Despesa';
    // Usar versão com bancos para mostrar opções disponíveis
    const mensagem = await templatePerguntaMetodoPagamentoComBancos(descricao, entidades.valor, userId);
    return {
      success: false,
      mensagem,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_payment_method',
        valor: entidades.valor,
        descricao: entidades.descricao,
        categoria: entidades.categoria,
        conta: entidades.conta, // ✅ BUG #14: Preservar banco no contexto!
        tipo: 'expense'
      }
    };
  }
  
  // Buscar conta
  let contaId: string | null = null;
  let contaNome: string | null = null;
  
  if (entidades.conta) {
    console.log('[TRANSACTION] 🔍 Buscando conta por nome:', entidades.conta);
    const conta = await buscarContaPorNome(userId, entidades.conta);
    console.log('[TRANSACTION] 🔍 Resultado busca conta:', conta ? `Encontrou: ${conta.name} (${conta.id})` : 'NÃO ENCONTROU');
    if (conta) {
      contaId = conta.id;
      contaNome = conta.name;
    }
  } else {
    console.log('[TRANSACTION] ⚠️ entidades.conta está vazio/undefined');
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
      // Perguntar qual conta usando template profissional
      return {
        success: false,
        mensagem: templatePerguntaConta(contas.map(c => ({ name: c.name, icon: c.icon || undefined }))),
        precisaConfirmacao: true
      };
    }
  }
  
  // Registrar transação
  const tipo = intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense';
  
  // Usar descrição do NLP
  const descricao = entidades.descricao || entidades.categoria || 'Via WhatsApp';
  
  // ============================================
  // CATEGORIZAÇÃO SIMPLIFICADA E ROBUSTA
  // ============================================
  // 1. Junta TODOS os textos (comando, descrição, categoria NLP)
  // 2. Busca palavra-chave em TUDO de uma vez
  // 3. Se não achar, usa "Outros"
  // ============================================
  
  let categoryId: string | undefined;
  let metodoUsado = 'nenhum';
  
  // PASSO ÚNICO: Detectar categoria analisando textos disponíveis
  // ⚠️ NÃO incluir entidades.categoria aqui!
  // O NLP pode errar a categoria e contaminar a detecção por palavra-chave
  const textosParaAnalisar = [
    intencao.comando_original,  // "gastei 15 no uber"
    descricao,                   // "Uber"
    // ❌ REMOVIDO: entidades.categoria (causava bug quando NLP errava)
  ];
  
  const textosValidos = textosParaAnalisar.filter((t): t is string => !!t);
  console.log('[CATEGORIA] ==========================================');
  console.log('[CATEGORIA] Textos para análise:', textosValidos);
  console.log('[CATEGORIA] Tipo:', tipo);
  console.log('[CATEGORIA] Valor:', entidades.valor);
  
  // ✅ Passar o valor para contexto (ex: água < R$20 = Alimentação)
  const categoriaDetectada = detectarCategoriaPorTexto(textosValidos, entidades.valor);
  
  if (categoriaDetectada) {
    console.log('[CATEGORIA] ✅ Categoria detectada por palavra-chave:', categoriaDetectada);
    const catId = await buscarCategoriaInteligente(userId, categoriaDetectada, tipo);
    console.log('[CATEGORIA] ID retornado por buscarCategoriaInteligente:', catId);
    if (catId) {
      categoryId = catId;
      metodoUsado = 'deteccao_automatica';
      console.log('[CATEGORIA] ✅ SUCESSO! Categoria:', categoriaDetectada, '| ID:', catId);
    } else {
      console.log('[CATEGORIA] ❌ buscarCategoriaInteligente retornou null para:', categoriaDetectada);
      console.log('[CATEGORIA] 💡 Verifique se a categoria existe no banco de dados!');
    }
  } else {
    console.log('[CATEGORIA] ❌ detectarCategoriaPorTexto não encontrou nenhuma palavra-chave');
    console.log('[CATEGORIA] 📝 Textos analisados:', textosValidos.join(' | '));
  }
  
  // FALLBACK: Se não encontrou, usar "Outros"
  if (!categoryId) {
    console.log('[CATEGORIA] ⚠️ Usando fallback "Outros"');
    console.log('[CATEGORIA] 📝 DEBUG:', {
      textosAnalisados: textosValidos,
      categoriaDetectada,
      tipo
    });
    
    const outros = await buscarCategoriaPorNome(userId, 'Outros', tipo);
    if (outros) {
      categoryId = outros.id;
      metodoUsado = 'fallback_outros';
      console.log('[CATEGORIA] Fallback "Outros" ID:', outros.id);
    }
  }
  
  console.log('[CATEGORIA] ==========================================');
  
  // Mapear forma_pagamento do NLP para payment_method do banco
  // Nota: O fallback de forma_pagamento já foi feito ANTES da verificação de método (linha ~886)
  const mapFormaPagamento: Record<string, 'pix' | 'credit' | 'debit' | 'cash' | 'boleto' | 'transfer' | 'other'> = {
    'pix': 'pix',
    'credito': 'credit',
    'debito': 'debit',
    'dinheiro': 'cash',
    'boleto': 'boleto',
    'transferencia': 'transfer'
  };
  
  const paymentMethod = entidades.forma_pagamento 
    ? mapFormaPagamento[entidades.forma_pagamento] || 'other'
    : undefined;
  
  console.log('[TRANSACTION] Preparando:', {
    valor: entidades.valor,
    descricao,
    categoria_nlp: entidades.categoria,
    categoryId,
    metodo_categorizacao: metodoUsado,
    conta: contaNome,
    payment_method: paymentMethod
  });
  
  const resultado = await registrarTransacao({
    user_id: userId,
    amount: entidades.valor,
    type: tipo,
    account_id: contaId!,
    description: descricao,
    category_id: categoryId,
    payment_method: paymentMethod
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

// ============================================
// ✅ BUG #21: PROCESSAR TRANSFERÊNCIA
// ============================================

export async function processarIntencaoTransferencia(
  intencao: IntencaoClassificada,
  userId: string,
  phone: string
): Promise<TransacaoResponse> {
  const { entidades } = intencao;
  const supabase = getSupabase();
  
  console.log('[TRANSFER] Processando transferência:', entidades);
  
  // Validar valor
  if (!entidades.valor || entidades.valor <= 0 || isNaN(entidades.valor)) {
    return {
      success: false,
      mensagem: '❓ Não entendi o valor da transferência. Pode repetir?\n\n_Exemplo: "Transferi 1000 para a conta do João"_',
      precisaConfirmacao: false
    };
  }
  
  // Validar descrição (obrigatória para transferência)
  if (!entidades.descricao && intencao.comando_original) {
    // Tentar extrair nome da pessoa/conta da descrição
    const textoOriginal = intencao.comando_original;
    const match = textoOriginal.match(/(?:para|transferi|enviei)\s+(.+?)(?:\s+de|\s+na|\s+do|$)/i);
    if (match && match[1]) {
      entidades.descricao = match[1].trim();
    }
  }
  
  if (!entidades.descricao) {
    return {
      success: false,
      mensagem: '💰 Transferência de R$ ' + entidades.valor.toFixed(2) + '\n\n👤 Para quem você transferiu?',
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_transfer_recipient',
        valor: entidades.valor,
        conta: entidades.conta,
        tipo: 'transfer'
      }
    };
  }
  
  // Buscar conta de origem
  let contaId: string | null = null;
  if (entidades.conta) {
    const contaNormalizada = entidades.conta.toLowerCase();
    const { data: contas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${contaNormalizada}%`)
      .limit(1);
    
    if (contas && contas.length > 0) {
      contaId = contas[0].id;
      console.log('[TRANSFER] ✅ Conta encontrada:', entidades.conta);
    }
  }
  
  // Se não especificou conta, perguntar
  if (!contaId) {
    console.log('[TRANSFER] ⚠️ Sem conta, perguntando ao usuário');
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId);
    
    if (!contas || contas.length === 0) {
      return {
        success: false,
        mensagem: '❌ Você não tem contas cadastradas. Crie uma conta primeiro!'
      };
    }
    
    let msg = `💰 Transferência de R$ ${entidades.valor.toFixed(2)} para ${entidades.descricao}\n\n🏦 De qual conta?\n\n`;
    contas.forEach((c, i) => {
      msg += `${i + 1}. ${c.name}\n`;
    });
    
    return {
      success: false,
      mensagem: msg,
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_transfer_account',
        valor: entidades.valor,
        descricao: entidades.descricao,
        tipo: 'transfer'
      }
    };
  }
  
  // Registrar transferência
  const { data: transacao, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: contaId,
      amount: entidades.valor,
      type: 'transfer',  // ✅ BUG #21: Usar 'transfer' como tipo
      payment_method: 'transfer',
      description: `Transferência para ${entidades.descricao}`,
      transaction_date: entidades.data || todayBrasilia(),
      category_id: null  // ✅ BUG #21: Transferências não têm categoria
    })
    .select('id');
  
  if (error) {
    console.error('[TRANSFER] ❌ Erro ao registrar:', error);
    return {
      success: false,
      mensagem: '❌ Erro ao registrar transferência. Tente novamente.'
    };
  }
  
  console.log('[TRANSFER] ✅ Transferência registrada:', transacao?.[0]?.id);
  
  return {
    success: true,
    transacao_id: transacao?.[0]?.id,
    mensagem: `✅ Transferência de R$ ${entidades.valor.toFixed(2)} para ${entidades.descricao} registrada!`,
    precisaConfirmacao: false
  };
}
