// ============================================
// CONTEXT-MANAGER.TS - Gerenciamento de Contexto
// Modularização v2.0 - Dezembro 2025
// ============================================
// 
// Estrutura da tabela conversation_context:
// - context_type: 'idle' | 'editing_transaction' | 'creating_transaction' | 'confirming_action' | 'multi_step_flow'
// - context_data: JSONB com dados do contexto
// - last_interaction: timestamp
// - expires_at: timestamp
// 
// ============================================

import { getSupabase, getEmojiBanco } from './utils.ts';
import { enviarConfirmacaoComBotoes } from './button-sender.ts';
import type { IntencaoClassificada } from './nlp-processor.ts';
import { templateTransacaoRegistrada } from './response-templates.ts';
import { processarRespostaContasAmbiguo, listarContasPagar } from './contas-pagar.ts';
import { consultarSaldo, listarContas } from './command-handlers.ts';
import {
  CATEGORIA_KEYWORDS,
  BANCO_CONFIGS,
  detectarCategoriaPorPalavraChave,
  detectarBancoPorAlias,
  detectarPagamentoPorAlias,
  CONTEXT_TIMEOUT_MINUTES as MAPPINGS_TIMEOUT
} from '../shared/mappings.ts';

// TTL do contexto: 60 minutos (1 hora)
// Aumentado de 15min para evitar perda de contexto quando usuário demora a responder
const CONTEXT_EXPIRATION_MINUTES = 60;

// Tipos do contexto
export type ContextType = 'idle' | 'editing_transaction' | 'creating_transaction' | 'confirming_action' | 'multi_step_flow' | 'awaiting_account_type_selection';

export interface ContextData {
  intencao_pendente?: IntencaoClassificada;
  transacao_id?: string;
  transacao_tipo?: 'transaction' | 'credit_card_transaction';
  step?: string; // 'awaiting_account', 'awaiting_category', 'awaiting_value', etc.
  phone?: string;
  current_data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ContextoConversa {
  id: string;
  user_id: string;
  phone: string;
  context_type: ContextType;
  context_data: ContextData;
  last_interaction: string;
  expires_at: string;
}

// ============================================
// BUSCAR CONTEXTO
// ============================================

export async function buscarContexto(userId: string): Promise<ContextoConversa | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !data) {
    console.log('📭 Nenhum contexto ativo para usuário:', userId);
    return null;
  }
  
  console.log('📬 Contexto encontrado:', data.context_type, '| Step:', data.context_data?.step);
  return data as ContextoConversa;
}

// ============================================
// SALVAR CONTEXTO
// ============================================

export async function salvarContexto(
  userId: string,
  contextType: ContextType,
  contextData: ContextData,
  phone?: string
): Promise<void> {
  const supabase = getSupabase();
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CONTEXT_EXPIRATION_MINUTES);
  
  const phoneValue = phone || contextData.phone || '';
  
  console.log('💾 Salvando contexto:', { userId, contextType, phoneValue, step: contextData.step });
  
  // Primeiro, deletar qualquer contexto existente para este usuário
  const { error: deleteError } = await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId);
  
  if (deleteError) {
    console.error('⚠️ Erro ao deletar contexto antigo:', deleteError);
  }
  
  // Inserir novo contexto
  const { data, error } = await supabase.from('conversation_context').insert({
    user_id: userId,
    phone: phoneValue,
    context_type: contextType,
    context_data: contextData,
    last_interaction: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  }).select().single();
  
  if (error) {
    console.error('❌ Erro ao salvar contexto:', JSON.stringify(error));
    throw error;
  }
  
  console.log('✅ Contexto salvo com sucesso:', data?.id, '| Type:', contextType, '| Step:', contextData.step);
}

// ============================================
// LIMPAR CONTEXTO
// ============================================

export async function limparContexto(userId: string): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ Erro ao limpar contexto:', error);
  } else {
    console.log('🧹 Contexto limpo para usuário:', userId);
  }
}

// ============================================
// VERIFICAR CONTEXTO ATIVO
// ============================================

export function isContextoAtivo(contexto: ContextoConversa | null): boolean {
  if (!contexto) return false;
  return contexto.context_type !== 'idle';
}

// ============================================
// ATUALIZAR DADOS DO CONTEXTO
// ============================================

export async function atualizarContextData(
  userId: string, 
  dados: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase();
  const contexto = await buscarContexto(userId);
  
  if (!contexto) {
    console.log('⚠️ Nenhum contexto para atualizar');
    return;
  }
  
  const novosDados = {
    ...contexto.context_data,
    ...dados
  };
  
  await supabase
    .from('conversation_context')
    .update({ 
      context_data: novosDados,
      last_interaction: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  console.log('📝 Context data atualizado');
}

// ============================================
// PROCESSAR MENSAGEM NO CONTEXTO
// ============================================

export async function processarNoContexto(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string | null> {
  const step = contexto.context_data?.step || '';
  const contextType = contexto.context_type;
  
  console.log('🔄 Processando no contexto:', contextType, '| Step:', step);
  
  const command = texto.toLowerCase().trim();
  
  // Cancelar em qualquer estado
  if (command === 'cancelar' || command === 'cancela' || command === 'sair') {
    await limparContexto(userId);
    return '👍 Ação cancelada. Como posso ajudar?';
  }
  
  // Processar baseado no context_type e step
  if (contextType === 'creating_transaction') {
    if (step === 'awaiting_account') {
      const resultado = await processarSelecaoConta(texto, contexto, userId, phone);
      return resultado; // Pode ser null se enviou botões
    }
    if (step === 'awaiting_category') {
      return await processarCategoria(texto, contexto, userId);
    }
    if (step === 'awaiting_value') {
      return await processarValor(texto, contexto, userId);
    }
    if (step === 'awaiting_description') {
      return await processarDescricao(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_payment_method') {
      return await processarSelecaoMetodoPagamento(texto, contexto, userId, phone);
    }
    // ✅ BUG #21: Handler para seleção de conta em transferência
    if (step === 'awaiting_transfer_account') {
      return await processarSelecaoContaTransferencia(texto, contexto, userId, phone);
    }
  }
  
  if (contextType === 'editing_transaction') {
    return await processarEdicao(texto, contexto, userId);
  }
  
  if (contextType === 'confirming_action') {
    if (step === 'awaiting_delete_confirmation') {
      return await processarConfirmacaoExclusao(texto, contexto, userId);
    }
    if (step === 'awaiting_image_confirmation') {
      return await processarConfirmacaoImagem(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_image_account') {
      return await processarSelecaoContaImagem(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_card_selection') {
      return await processarSelecaoCartao(texto, contexto, userId);
    }
    return await processarConfirmacao(texto, contexto, userId);
  }
  
  // Handler para desambiguação "minhas contas"
  if (contextType === 'awaiting_account_type_selection') {
    return await processarSelecaoTipoConta(texto, contexto, userId);
  }
  
  await limparContexto(userId);
  return '❓ Não entendi. Vamos recomeçar?';
}

// ============================================
// HANDLERS DE CONTEXTO
// ============================================

// Handler para desambiguação "minhas contas"
async function processarSelecaoTipoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  console.log('🔄 [CONTAS] Processando seleção de tipo de conta:', texto);
  
  const escolha = processarRespostaContasAmbiguo(texto);
  
  if (escolha === 'bancarias') {
    // Usuário quer ver saldos bancários
    await limparContexto(userId);
    const saldos = await consultarSaldo(userId);
    return saldos;
  }
  
  if (escolha === 'pagar') {
    // Usuário quer ver contas a pagar
    await limparContexto(userId);
    const resultado = await listarContasPagar(userId);
    return resultado.mensagem;
  }
  
  // Não entendeu a resposta
  return `Não entendi. Por favor, digite:

1️⃣ ou *bancárias* → Ver saldos
2️⃣ ou *pagar* → Ver contas a pagar`;
}

async function processarConfirmacao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const command = texto.toLowerCase().trim();
  const transacaoId = contexto.context_data?.transacao_id;
  
  if (command === 'sim' || command === 's' || command === 'confirmar' || command === 'ok') {
    // Confirmar transação pendente
    if (transacaoId) {
      const supabase = getSupabase();
      await supabase
        .from('transactions')
        .update({ status: 'confirmed', is_paid: true })
        .eq('id', transacaoId);
      
      await limparContexto(userId);
      return '✅ Transação confirmada!';
    }
  }
  
  if (command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '❌ Transação cancelada.';
  }
  
  return 'Digite *sim* para confirmar ou *não* para cancelar.';
}

async function processarValor(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  // Extrair valor numérico
  const valorMatch = texto.match(/(\d+[.,]?\d*)/);
  
  if (!valorMatch) {
    return '❌ Não consegui identificar o valor. Digite apenas o número (ex: 50 ou 50,00)';
  }
  
  const valor = parseFloat(valorMatch[1].replace(',', '.'));
  
  if (isNaN(valor) || valor <= 0) {
    return '❌ Valor inválido. Digite um número positivo.';
  }
  
  // Atualizar context_data com valor
  await atualizarContextData(userId, { valor });
  
  // Próximo passo: pedir conta
  await salvarContexto(userId, 'creating_transaction', {
    ...contexto.context_data,
    step: 'awaiting_account',
    valor
  });
  
  return `💰 Valor: R$ ${valor.toFixed(2).replace('.', ',')}\n\nEm qual conta?`;
}

async function processarSelecaoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phoneFromCaller?: string
): Promise<string | null> {
  const supabase = getSupabase();
  
  // Buscar contas do usuário
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, bank_name, type, icon')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  console.log('🏦 Contas encontradas:', accounts?.length, '| Erro:', accountsError?.message);
  
  if (!accounts || accounts.length === 0) {
    await limparContexto(userId);
    return '❌ Você não tem contas cadastradas. Cadastre uma conta no app primeiro.';
  }
  
  // Tentar encontrar conta pelo texto
  // Normalizar texto (remover acentos, pontuação, etc)
  const textoLower = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[.,!?]/g, '') // Remove pontuação
    .trim();
  
  console.log('🔍 Texto normalizado para busca de conta:', textoLower);
  
  let contaSelecionada: typeof accounts[0] | null = null;
  
  // Primeiro, tentar por número
  const numeroMatch = texto.match(/^(\d+)$/);
  if (numeroMatch) {
    const index = parseInt(numeroMatch[1]) - 1;
    if (index >= 0 && index < accounts.length) {
      contaSelecionada = accounts[index];
    }
  }
  
  // Mapeamento de variações comuns de transcrição de áudio
  // IMPORTANTE: Ordenado do mais específico para o menos específico
  const variacoesBancos: Record<string, string[]> = {
    'itau': ['itau', 'itaú', 'ita', 'itauu', 'itaí'],
    'nubank': ['nubank', 'nuno bank', 'nuno benk', 'nu bank', 'roxinho', 'nubamk'],
    'bradesco': ['bradesco', 'brades', 'bradescoo'],
    'santander': ['santander', 'santan', 'santande'],
    'inter': ['inter', 'banco inter', 'inter bank'],
    'caixa': ['caixa', 'cef', 'caixa economica'],
    'bb': ['bb', 'banco do brasil', 'brasil'],
    'c6': ['c6', 'c6 bank', 'c 6'],
    'picpay': ['picpay', 'pic pay', 'pic'],
    'mercadopago': ['mercado pago', 'mercadopago', 'mp'],
  };
  
  console.log('🔍 Buscando conta para texto:', textoLower);
  console.log('🏦 Contas disponíveis:', accounts.map((a: any) => a.name).join(', '));
  
  // PRIMEIRO: Tentar match EXATO com variações (prioridade máxima)
  if (!contaSelecionada) {
    for (const [banco, variacoes] of Object.entries(variacoesBancos)) {
      // Verificar se o texto É exatamente uma das variações
      if (variacoes.includes(textoLower)) {
        // Encontrar a conta que corresponde a esse banco
        for (const account of accounts) {
          const accountNameLower = account.name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (accountNameLower.includes(banco)) {
            contaSelecionada = account;
            console.log('✅ Match EXATO por variação:', textoLower, '→', account.name);
            break;
          }
        }
        if (contaSelecionada) break;
      }
    }
  }
  
  // SEGUNDO: Tentar match direto no nome da conta
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bankNameLower = (account.bank_name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Match direto - texto é igual ao nome da conta
      if (textoLower === accountNameLower || textoLower === bankNameLower) {
        contaSelecionada = account;
        console.log('✅ Match direto EXATO:', account.name);
        break;
      }
    }
  }
  
  // TERCEIRO: Tentar match parcial (texto contém nome da conta)
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bankNameLower = (account.bank_name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (textoLower.includes(accountNameLower) || textoLower.includes(bankNameLower)) {
        contaSelecionada = account;
        console.log('✅ Match parcial encontrado:', account.name);
        break;
      }
    }
  }
  
  // QUARTO: Tentar match por variações (texto contém variação)
  if (!contaSelecionada) {
    for (const [banco, variacoes] of Object.entries(variacoesBancos)) {
      for (const variacao of variacoes) {
        if (textoLower.includes(variacao)) {
          // Encontrar a conta que corresponde a esse banco
          for (const account of accounts) {
            const accountNameLower = account.name.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (accountNameLower.includes(banco)) {
              contaSelecionada = account;
              console.log('✅ Match por variação:', variacao, '→', account.name);
              break;
            }
          }
          if (contaSelecionada) break;
        }
      }
      if (contaSelecionada) break;
    }
  }
  
  // Se ainda não encontrou, tentar match parcial mais agressivo
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Verificar se alguma palavra do texto está no nome da conta
      const palavras = textoLower.split(/\s+/);
      for (const palavra of palavras) {
        if (palavra.length >= 3 && accountNameLower.includes(palavra)) {
          contaSelecionada = account;
          console.log('✅ Match parcial encontrado:', palavra, '→', account.name);
          break;
        }
      }
      if (contaSelecionada) break;
    }
  }
  
  // Se encontrou conta, registrar a transação pendente
  const intencaoPendente = contexto.context_data?.intencao_pendente;
  console.log('📋 Contexto recebido:', JSON.stringify(contexto.context_data));
  console.log('📋 Intenção pendente:', JSON.stringify(intencaoPendente));
  console.log('🏦 Conta selecionada:', contaSelecionada?.name);
  
  if (contaSelecionada && intencaoPendente) {
    const intencao = intencaoPendente;
    const entidades = intencao.entidades || {};
    
    console.log('📊 Entidades:', JSON.stringify(entidades));
    
    // 1. Verificar se a conta existe e pertence ao usuário
    const { data: contaVerificada, error: contaError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', contaSelecionada.id)
      .eq('user_id', userId)
      .single();
    
    if (contaError || !contaVerificada) {
      console.error('❌ Conta não encontrada ou não pertence ao usuário:', JSON.stringify(contaError));
      await limparContexto(userId);
      return '❌ Conta não encontrada. Tente novamente.';
    }
    
    console.log('✅ Conta verificada:', contaVerificada.name);
    
    // ============================================
    // BUSCAR CATEGORIA INTELIGENTE
    // ============================================
    // 1. Busca por palavra-chave no comando original + descrição + categoria NLP
    // 2. Busca categoria global (user_id IS NULL) ou do usuário
    // 3. Fallback para "Outros"
    // ============================================
    
    const tipo = intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense';
    // Concatenar textos para análise de categoria
    // ⚠️ NÃO incluir entidades.categoria aqui! 
    // O NLP pode errar a categoria e contaminar a detecção por palavra-chave
    const textosParaAnalisar = [
      intencao?.comando_original,
      entidades.descricao
      // ❌ REMOVIDO: entidades.categoria (causava bug quando NLP errava)
    ].filter(Boolean).join(' ').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    console.log('[CONTEXTO-CATEGORIA] Textos para análise:', textosParaAnalisar);
    console.log('[CONTEXTO-CATEGORIA] Tipo:', tipo);
    
    // ✅ Usar mapeamento centralizado de shared/mappings.ts
    // Detectar categoria por palavra-chave
    let categoriaDetectada = detectarCategoriaPorPalavraChave(textosParaAnalisar);
    
    if (!categoriaDetectada) {
      categoriaDetectada = 'Outros';
    }
    
    console.log('[CONTEXTO-CATEGORIA] 🔍 Categoria detectada:', categoriaDetectada);
    console.log('[CONTEXTO-CATEGORIA] 📋 Categoria final detectada:', categoriaDetectada);
    
    // Buscar categoria no banco (global ou do usuário)
    const { data: categorias } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', tipo)
      .or(`user_id.is.null,user_id.eq.${userId}`);
    
    console.log('[CONTEXTO-CATEGORIA] Categorias disponíveis:', categorias?.map((c: any) => c.name).join(', '));
    
    // Normalizar para comparação
    const normalizarTexto = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Encontrar categoria pelo nome detectado
    let categoryId: string | null = null;
    let categoriaNome = 'Outros';
    
    if (categorias && categorias.length > 0) {
      const catEncontrada = categorias.find((c: any) => 
        normalizarTexto(c.name) === normalizarTexto(categoriaDetectada)
      );
      
      if (catEncontrada) {
        categoryId = catEncontrada.id;
        categoriaNome = catEncontrada.name;
        console.log('[CONTEXTO-CATEGORIA] ✅ Categoria encontrada:', catEncontrada.name, '| ID:', catEncontrada.id);
      } else {
        // Fallback para "Outros"
        const outros = categorias.find((c: any) => normalizarTexto(c.name) === 'outros');
        if (outros) {
          categoryId = outros.id;
          categoriaNome = outros.name;
          console.log('[CONTEXTO-CATEGORIA] ⚠️ Usando fallback "Outros"');
        }
      }
    }
    const valorTransacao = entidades.valor || 0;
    const descricaoTransacao = entidades.descricao || 'Via WhatsApp';
    
    console.log('💰 Valor:', valorTransacao, '| Categoria:', categoryId, '| Desc:', descricaoTransacao);
    
    // Mapear forma de pagamento do NLP para o banco
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
    
    // 2. Montar payload de inserção
    const payload: any = {
      user_id: userId,
      amount: valorTransacao,
      type: intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense',
      account_id: contaSelecionada.id,
      category_id: categoryId,
      description: descricaoTransacao,
      transaction_date: new Date().toISOString().split('T')[0],
      is_paid: true,
      source: 'whatsapp',
      payment_method: paymentMethod // ✅ Incluir forma de pagamento
    };
    
    console.log('📤 Payload de inserção:', JSON.stringify(payload, null, 2));
    
    // 3. Criar transação
    const { data: transacao, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      console.error('❌ ERRO COMPLETO:', JSON.stringify(error, null, 2));
      console.error('❌ Código:', error.code);
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Detalhes:', error.details);
      console.error('❌ Hint:', error.hint);
      await limparContexto(userId);
      return `❌ Erro ao registrar: ${error.message || 'Erro desconhecido'}`;
    }
    
    console.log('✅ Transação inserida com sucesso! ID:', transacao?.id);
    
    // Limpar contexto após sucesso
    await limparContexto(userId);
    
    // Usar novo template profissional
    const mensagemSucesso = templateTransacaoRegistrada({
      type: intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense',
      amount: valorTransacao,
      description: descricaoTransacao,
      category: categoriaNome,
      account: contaSelecionada.name,
      data: new Date(),
      paymentMethod: paymentMethod // ✅ Incluir forma de pagamento
    });
    
    return mensagemSucesso;
  }
  
  // Se encontrou conta mas não tem intenção pendente
  if (contaSelecionada) {
    await atualizarContextData(userId, { account_id: contaSelecionada.id, account_name: contaSelecionada.name });
    await limparContexto(userId);
    return `✅ Conta selecionada: ${contaSelecionada.name}`;
  }
  
  // Não encontrou - listar opções
  let lista = '🏦 *Escolha uma conta:*\n\n';
  accounts.forEach((acc: { name: string }, i: number) => {
    lista += `${i + 1}. ${acc.name}\n`;
  });
  lista += '\n_Digite o número ou nome da conta_';
  
  return lista;
}

async function processarCategoria(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar categorias
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!categories || categories.length === 0) {
    await limparContexto(userId);
    return '❌ Nenhuma categoria encontrada.';
  }
  
  const textoLower = texto.toLowerCase();
  
  // Tentar por número
  const numeroMatch = texto.match(/^(\d+)$/);
  if (numeroMatch) {
    const index = parseInt(numeroMatch[1]) - 1;
    if (index >= 0 && index < categories.length) {
      const cat = categories[index];
      await atualizarContextData(userId, { category_id: cat.id, category_name: cat.name });
      await limparContexto(userId);
      return `✅ Categoria: ${cat.icon || '📂'} ${cat.name}`;
    }
  }
  
  // Tentar por nome
  for (const cat of categories) {
    if (textoLower.includes(cat.name.toLowerCase())) {
      await atualizarContextData(userId, { category_id: cat.id, category_name: cat.name });
      await limparContexto(userId);
      return `✅ Categoria: ${cat.icon || '📂'} ${cat.name}`;
    }
  }
  
  // Listar opções
  let lista = '📂 *Escolha uma categoria:*\n\n';
  categories.forEach((cat: { icon?: string; name: string }, i: number) => {
    lista += `${i + 1}. ${cat.icon || '📂'} ${cat.name}\n`;
  });
  lista += '\n_Digite o número ou nome_';
  
  return lista;
}

async function processarConfirmacaoExclusao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const command = texto.toLowerCase().trim();
  
  const transacaoId = contexto.context_data?.transacao_id;
  const transacaoTipo = contexto.context_data?.transacao_tipo;
  
  if (command === 'sim' || command === 's' || command === 'confirmar') {
    if (transacaoId) {
      const supabase = getSupabase();
      const tabela = transacaoTipo === 'credit_card_transaction' 
        ? 'credit_card_transactions' 
        : 'transactions';
      
      const { error } = await supabase
        .from(tabela)
        .delete()
        .eq('id', transacaoId)
        .eq('user_id', userId);
      
      await limparContexto(userId);
      
      if (error) {
        return '❌ Erro ao excluir. Tente novamente.';
      }
      
      return '✅ Transação excluída com sucesso!';
    }
  }
  
  if (command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '👍 Exclusão cancelada.';
  }
  
  return '⚠️ Digite *sim* para confirmar a exclusão ou *não* para cancelar.';
}

async function processarEdicao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const transacaoId = contexto.context_data?.transacao_id;
  const transacaoTipo = contexto.context_data?.transacao_tipo;
  
  if (!transacaoId) {
    await limparContexto(userId);
    return '❌ Nenhuma transação para editar.';
  }
  
  const supabase = getSupabase();
  const textoLower = texto.toLowerCase();
  
  // Detectar o que editar
  const updates: Record<string, unknown> = {};
  
  // Editar valor
  const valorMatch = texto.match(/(\d+[.,]?\d*)\s*(reais?|r\$)?/i);
  if (valorMatch || textoLower.includes('valor')) {
    const match = texto.match(/(\d+[.,]?\d*)/);
    if (match) {
      const novoValor = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(novoValor) && novoValor > 0) {
        updates.amount = novoValor;
      }
    }
  }
  
  // Editar descrição
  if (textoLower.startsWith('descrição') || textoLower.startsWith('descricao')) {
    const novaDescricao = texto.replace(/^descri[çc][ãa]o\s*/i, '').trim();
    if (novaDescricao) {
      updates.description = novaDescricao;
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return '❓ Não entendi o que mudar.\n\nExemplos:\n• "50 reais" ou "era 50"\n• "descrição almoço"\n• "categoria alimentação"';
  }
  
  // Aplicar updates
  const tabela = transacaoTipo === 'credit_card_transaction' 
    ? 'credit_card_transactions' 
    : 'transactions';
  
  const { error } = await supabase
    .from(tabela)
    .update(updates)
    .eq('id', transacaoId)
    .eq('user_id', userId);
  
  await limparContexto(userId);
  
  if (error) {
    return '❌ Erro ao atualizar. Tente novamente.';
  }
  
  const campos = Object.keys(updates).join(', ');
  return `✅ Transação atualizada! (${campos})`;
}

// ============================================
// PROCESSAR CONFIRMAÇÃO DE IMAGEM
// ============================================
async function processarConfirmacaoImagem(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const command = texto.toLowerCase().trim();
  const dadosImagem = contexto.context_data?.dados_imagem as {
    tipo: string;
    valor: number;
    descricao: string;
    categoria: string;
    tipo_transacao?: string;
    data?: string;
  } | undefined;
  
  if (!dadosImagem) {
    await limparContexto(userId);
    return '❌ Dados da imagem não encontrados. Envie novamente.';
  }
  
  if (command === 'sim' || command === 's' || command === 'confirmar' || command === 'ok') {
    // Buscar contas do usuário
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (!contas || contas.length === 0) {
      await limparContexto(userId);
      return '❌ Você não tem contas cadastradas. Cadastre uma conta no app primeiro.';
    }
    
    if (contas.length > 1) {
      // Perguntar qual conta
      await salvarContexto(userId, 'creating_transaction', {
        step: 'awaiting_account',
        phone,
        intencao_pendente: {
          intencao: dadosImagem.tipo_transacao === 'income' ? 'REGISTRAR_RECEITA' : 'REGISTRAR_DESPESA',
          confianca: 0.95,
          entidades: {
            valor: dadosImagem.valor,
            descricao: dadosImagem.descricao,
            categoria: dadosImagem.categoria
          },
          explicacao: 'Leitura de imagem',
          resposta_conversacional: 'Transação via imagem',
          comando_original: `Imagem: ${dadosImagem.descricao}`
        }
      }, phone);
      
      let lista = '🏦 *Em qual conta?*\n\n';
      contas.forEach((acc: any, i: number) => {
        lista += `${i + 1}. ${acc.name}\n`;
      });
      lista += '\n_Responda com o número ou nome_';
      return lista;
    }
    
    // Tem só uma conta, registrar direto
    const tipo = dadosImagem.tipo_transacao || 'expense';
    
    // Buscar categoria
    const categoriaDetectada = dadosImagem.categoria || 'Outros';
    const tipoCategoria = tipo === 'income' ? 'income' : 'expense';
    
    // Buscar categoria no banco (global ou do usuário)
    const { data: categorias } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', tipoCategoria)
      .or(`user_id.is.null,user_id.eq.${userId}`);
    
    // Normalizar para comparação
    const normalizarTexto = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Encontrar categoria pelo nome detectado
    let categoryId: string | null = null;
    
    if (categorias && categorias.length > 0) {
      const catEncontrada = categorias.find((c: any) => 
        normalizarTexto(c.name) === normalizarTexto(categoriaDetectada)
      );
      
      if (catEncontrada) {
        categoryId = catEncontrada.id;
      } else {
        // Fallback para "Outros"
        const outros = categorias.find((c: any) => normalizarTexto(c.name) === 'outros');
        if (outros) {
          categoryId = outros.id;
        }
      }
    }
    
    const payload = {
      user_id: userId,
      amount: dadosImagem.valor,
      type: tipo,
      account_id: contas[0].id,
      category_id: categoryId,
      description: dadosImagem.descricao,
      transaction_date: dadosImagem.data || new Date().toISOString().split('T')[0],
      is_paid: true,
      source: 'whatsapp'
    };
    
    const { data: transacao, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    
    await limparContexto(userId);
    
    if (error) {
      console.error('[IMAGE] Erro ao registrar:', error);
      return `❌ Erro ao registrar: ${error.message}`;
    }
    
    const emoji = tipo === 'income' ? '💰' : '💸';
    return `✅ *Registrado com sucesso!*\n\n` +
           `${emoji} R$ ${dadosImagem.valor.toFixed(2).replace('.', ',')}\n` +
           `📝 ${dadosImagem.descricao}\n` +
           `📂 ${dadosImagem.categoria}\n` +
           `🏦 ${contas[0].name}`;
  }
  
  if (command === 'não' || command === 'nao' || command === 'n' || command === 'cancelar') {
    await limparContexto(userId);
    return '👍 Cancelado! Envie outra imagem ou me diga o que quer registrar.';
  }
  
  return '❓ Responda *sim* para confirmar ou *não* para cancelar.';
}

// ============================================
// PROCESSAR SELEÇÃO DE CONTA (IMAGEM) - FLUXO UNIFICADO
// ============================================
async function processarSelecaoContaImagem(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const command = texto.toLowerCase().trim();
  
  const dadosImagem = contexto.context_data?.dados_imagem as {
    tipo: string;
    valor: number;
    descricao: string;
    categoria: string;
    tipo_transacao?: string;
    data?: string;
  } | undefined;
  
  const contas = contexto.context_data?.contas as Array<{ id: string; name: string }> | undefined;
  
  if (!dadosImagem || !contas) {
    await limparContexto(userId);
    return '❌ Dados não encontrados. Envie a imagem novamente.';
  }
  
  // Verificar cancelamento
  if (command === 'cancelar' || command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '👍 Cancelado! Envie outra imagem ou me diga o que quer registrar.';
  }
  
  // Encontrar conta selecionada
  let contaSelecionada: { id: string; name: string } | null = null;
  
  // Por número
  const numero = parseInt(command);
  if (!isNaN(numero) && numero >= 1 && numero <= contas.length) {
    contaSelecionada = contas[numero - 1];
  }
  
  // Por nome (parcial)
  if (!contaSelecionada) {
    const normalizarTexto = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const comandoNorm = normalizarTexto(command);
    
    contaSelecionada = contas.find(c => 
      normalizarTexto(c.name).includes(comandoNorm) || 
      comandoNorm.includes(normalizarTexto(c.name))
    ) || null;
  }
  
  if (!contaSelecionada) {
    let lista = '❓ Não encontrei essa conta.\n\n🏦 *Escolha uma:*\n\n';
    contas.forEach((acc, i) => {
      lista += `${i + 1}. ${acc.name}\n`;
    });
    lista += '\n_Responda com número/nome ou "cancelar"_';
    return lista;
  }
  
  // Registrar transação
  const tipo = dadosImagem.tipo_transacao || 'expense';
  const tipoCategoria = tipo === 'income' ? 'income' : 'expense';
  
  // Buscar categoria no banco
  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name')
    .eq('type', tipoCategoria)
    .or(`user_id.is.null,user_id.eq.${userId}`);
  
  const normalizarTexto = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let categoryId: string | null = null;
  
  if (categorias && categorias.length > 0) {
    // Buscar categoria pelo nome
    const catEncontrada = categorias.find((c: any) => 
      normalizarTexto(c.name) === normalizarTexto(dadosImagem.categoria)
    );
    
    if (catEncontrada) {
      categoryId = catEncontrada.id;
    } else {
      // Fallback para "Outros" ou "Alimentação"
      const fallback = categorias.find((c: any) => 
        normalizarTexto(c.name) === 'alimentacao' || normalizarTexto(c.name) === 'outros'
      );
      if (fallback) {
        categoryId = fallback.id;
      }
    }
  }
  
  console.log('[IMAGE] Categoria detectada:', dadosImagem.categoria, '| ID:', categoryId);
  
  const payload = {
    user_id: userId,
    amount: dadosImagem.valor,
    type: tipo,
    account_id: contaSelecionada.id,
    category_id: categoryId,
    description: dadosImagem.descricao,
    transaction_date: dadosImagem.data || new Date().toISOString().split('T')[0],
    is_paid: true,
    source: 'whatsapp'
  };
  
  const { data: transacao, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();
  
  await limparContexto(userId);
  
  if (error) {
    console.error('[IMAGE] Erro ao registrar:', error);
    return `❌ Erro ao registrar: ${error.message}`;
  }
  
  // Buscar nome da categoria
  let nomeCategoria = dadosImagem.categoria;
  if (categoryId && categorias) {
    const cat = categorias.find((c: any) => c.id === categoryId);
    if (cat) nomeCategoria = cat.name;
  }
  
  // Usa getEmojiBanco de utils.ts
  const emojiBanco = getEmojiBanco(contaSelecionada.name);
  const emoji = tipo === 'income' ? '💰' : '💸';
  const tipoTexto = tipo === 'income' ? 'Receita' : 'Despesa';
  const dataFormatada = dadosImagem.data 
    ? new Date(dadosImagem.data + 'T12:00:00').toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');
  
  return `Anotado! 📝\n\n` +
         `⭐ *Transação Registrada!* ⭐\n\n` +
         `📝 *Descrição:* ${dadosImagem.descricao}\n` +
         `${emoji} *Valor:* R$ ${dadosImagem.valor.toFixed(2).replace('.', ',')}\n` +
         `🔴 *Tipo:* ${tipoTexto}\n` +
         `🏷️ *Categoria:* ${nomeCategoria}\n` +
         `${emojiBanco} *Conta:* ${contaSelecionada.name}\n` +
         `📅 *Data:* ${dataFormatada}\n\n` +
         `✅ *Status:* Pago\n\n` +
         `💡 *Quer alterar algo?*\n` +
         `• Valor → _"era 95"_\n` +
         `• Conta → _"muda pra Nubank"_\n` +
         `• Excluir → _"exclui essa"_`;
}

// ============================================
// PROCESSAR SELEÇÃO DE CARTÃO (FASE 2)
// ============================================

async function processarSelecaoCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const dados = contexto.context_data?.dados_cartao as any;
  
  if (!dados || !dados.cartoes) {
    await limparContexto(userId);
    return '❌ Erro: dados do cartão não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Compra cancelada.';
  }
  
  // Buscar cartão por número ou nome
  let cartaoSelecionado = null;
  const numero = parseInt(resposta);
  
  if (!isNaN(numero) && numero > 0 && numero <= dados.cartoes.length) {
    cartaoSelecionado = dados.cartoes[numero - 1];
  } else {
    const respostaNorm = resposta.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cartaoSelecionado = dados.cartoes.find((c: any) => {
      const nomeNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeNorm.includes(respostaNorm) || respostaNorm.includes(nomeNorm);
    });
  }
  
  if (!cartaoSelecionado) {
    return `❓ Não encontrei esse cartão.\n\nResponda com o número ou nome do cartão.`;
  }
  
  // Importar e chamar registrarCompraCartao
  const { registrarCompraCartao } = await import('./cartao-credito.ts');
  
  const resultado = await registrarCompraCartao(userId, {
    valor: dados.valor,
    parcelas: dados.parcelas,
    cartao_id: cartaoSelecionado.id,
    descricao: dados.descricao,
    data_compra: new Date().toISOString().split('T')[0]
  });
  
  await limparContexto(userId);
  return resultado.mensagem;
}

// ============================================
// PROCESSAR DESCRIÇÃO DA TRANSAÇÃO
// ============================================

async function processarDescricao(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const dados = contexto.context_data?.dados_transacao as any;
  
  if (!dados) {
    await limparContexto(userId);
    return '❌ Erro: dados da transação não encontrados.';
  }
  
  const descricao = texto.trim();
  
  if (!descricao || descricao.length < 2) {
    return '❓ Descrição muito curta. Pode ser mais específico?\n\n_Exemplo: "Lanche", "Mercado", "Uber"_';
  }
  
  console.log('[DESCRIPTION] ✅ [BUG #17] Descrição fornecida pelo usuário:', descricao);
  
  // ✅ BUG #17: Detectar categoria baseado na descrição fornecida
  const { detectarCategoriaAutomatica } = await import('./transaction-mapper.ts');
  let categoryId: string | null | undefined;
  let categoriaNome = 'Outros';
  
  try {
    categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
    console.log('[DESCRIPTION] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
    
    // Se encontrou categoria, buscar o nome para exibir no template
    if (categoryId) {
      const { data: categorias } = await getSupabase()
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();
      if (categorias?.name) {
        categoriaNome = categorias.name;
      }
    }
  } catch (err) {
    console.log('[DESCRIPTION] ⚠️ Erro ao detectar categoria:', err);
  }
  
  // Agora perguntar método de pagamento
  const { templatePerguntaMetodoPagamentoComBancos } = await import('./transaction-mapper.ts');
  const mensagem = await templatePerguntaMetodoPagamentoComBancos(descricao, dados.valor, userId);
  
  // Salvar contexto com descrição e categoria detectada
  await salvarContexto(userId, 'creating_transaction', {
    step: 'awaiting_payment_method',
    phone,
    dados_transacao: {
      valor: dados.valor,
      descricao: descricao,
      categoria: categoryId,
      conta: dados.conta,
      tipo: 'expense'
    }
  }, phone);
  
  return mensagem;
}

// ============================================
// PROCESSAR SELEÇÃO DE MÉTODO DE PAGAMENTO
// ============================================

async function processarSelecaoMetodoPagamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const dados = contexto.context_data?.dados_transacao as any;
  const intencao = contexto.context_data?.intencao_pendente as any;
  
  if (!dados && !intencao) {
    await limparContexto(userId);
    return '❌ Erro: dados da transação não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // ✅ BUG #18: Verificar se é uma NOVA transação antes de processar como resposta
  // Usando função centralizada do context-detector.ts
  const { pareceNovaTransacao } = await import('../shared/context-detector.ts');
  
  if (pareceNovaTransacao(resposta)) {
    console.log('[PAYMENT_METHOD] ⚠️ [BUG #18] Parece nova transação, não resposta ao contexto');
    console.log('[PAYMENT_METHOD] Limpando contexto e processando como nova transação');
    await limparContexto(userId);
    // Retorna vazio para deixar o fluxo normal processar como nova transação
    return '';
  }
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Transação cancelada.';
  }
  
  // Normalizar resposta (remover acentos, espaços extras, pontuação)
  const respostaNorm = resposta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('[PAYMENT_METHOD] Resposta original:', resposta);
  console.log('[PAYMENT_METHOD] Resposta normalizada:', respostaNorm);
  
  // Detectar método de pagamento por palavras-chave
  let metodo: { method: 'credit' | 'debit' | 'pix' | 'cash', label: string } | null = null;
  
  // Verificar por número primeiro
  if (respostaNorm === '1') {
    metodo = { method: 'credit', label: 'Cartão de crédito' };
  } else if (respostaNorm === '2') {
    metodo = { method: 'debit', label: 'Débito' };
  } else if (respostaNorm === '3') {
    metodo = { method: 'pix', label: 'PIX' };
  } else if (respostaNorm === '4') {
    metodo = { method: 'cash', label: 'Dinheiro' };
  }
  // Verificar por palavras-chave (ordem importa!)
  else if (respostaNorm.includes('credito') || respostaNorm.includes('cartao de credito') || respostaNorm.includes('cartao')) {
    metodo = { method: 'credit', label: 'Cartão de crédito' };
  } else if (respostaNorm.includes('debito')) {
    metodo = { method: 'debit', label: 'Débito' };
  } else if (respostaNorm.includes('pix')) {
    metodo = { method: 'pix', label: 'PIX' };
  } else if (respostaNorm.includes('dinheiro') || respostaNorm.includes('cash')) {
    metodo = { method: 'cash', label: 'Dinheiro' };
  }
  
  console.log('[PAYMENT_METHOD] Método detectado:', metodo);
  
  if (!metodo) {
    return `❓ Não entendi. Responda:\n\n1️⃣ Cartão de crédito\n2️⃣ Débito\n3️⃣ PIX\n4️⃣ Dinheiro`;
  }
  
  // 🔧 NOVO: Detectar banco/conta na mesma resposta
  const respostaLower = resposta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // ✅ BUG #14: Verificar se já tem banco no contexto ANTES de detectar na resposta
  let contaDetectada: string | null = dados?.conta || intencao?.entidades?.conta || null;
  if (contaDetectada) {
    console.log('[PAYMENT_METHOD] 🏦 Banco do contexto:', contaDetectada);
  }
  
  // Se não tinha no contexto, tentar detectar na resposta atual
  if (!contaDetectada) {
    contaDetectada = detectarBancoPorAlias(respostaLower);
    if (contaDetectada) {
      console.log('[PAYMENT_METHOD] 🏦 Banco detectado na resposta:', contaDetectada);
    }
  }
  
  // Se escolheu CARTÃO DE CRÉDITO → fluxo de cartões
  if (metodo.method === 'credit') {
    const { buscarCartoesUsuario } = await import('./cartao-credito.ts');
    const cartoes = await buscarCartoesUsuario(userId);
    
    if (cartoes.length === 0) {
      await limparContexto(userId);
      return `❌ Você não tem cartões de crédito cadastrados.\n\n💡 Cadastre no app primeiro!`;
    }
    
    // 🔧 NOVO: Verificar se o nome do cartão já foi mencionado na resposta
    let cartaoSelecionado = null;
    const respostaLower = resposta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const cartao of cartoes) {
      const bankNameLower = cartao.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Verifica se o nome do banco está na resposta (ex: "nubank" em "cartao nubank")
      if (respostaLower.includes(bankNameLower)) {
        cartaoSelecionado = cartao;
        console.log('🎯 [CARD_DETECTION] Cartão detectado na resposta:', cartao.name);
        break;
      }
    }
    
    // ✅ BUG #15: Se não encontrou na resposta, verificar se tem no contexto
    if (!cartaoSelecionado && contaDetectada) {
      console.log('[PAYMENT_METHOD] 🏦 Verificando cartão do contexto:', contaDetectada);
      for (const cartao of cartoes) {
        const bankNameLower = cartao.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (bankNameLower.includes(contaDetectada)) {
          cartaoSelecionado = cartao;
          console.log('🎯 [CARD_DETECTION] Cartão encontrado no contexto:', cartao.name);
          break;
        }
      }
    }
    
    // Se encontrou cartão específico (na resposta ou no contexto), registrar direto
    if (cartaoSelecionado) {
      const { registrarCompraCartao } = await import('./cartao-credito.ts');
      const resultado = await registrarCompraCartao(userId, {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        cartao_id: cartaoSelecionado.id,
        descricao: dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp',
        data_compra: new Date().toISOString().split('T')[0]
      });
      await limparContexto(userId);
      return resultado.mensagem;
    }
    
    if (cartoes.length === 1) {
      // Registrar direto no único cartão
      const { registrarCompraCartao } = await import('./cartao-credito.ts');
      const resultado = await registrarCompraCartao(userId, {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        cartao_id: cartoes[0].id,
        descricao: dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp',
        data_compra: new Date().toISOString().split('T')[0]
      });
      await limparContexto(userId);
      return resultado.mensagem;
    }
    
    // Múltiplos cartões → perguntar qual
    const { getEmojiBanco } = await import('./utils.ts');
    await salvarContexto(userId, 'confirming_action', {
      step: 'awaiting_card_selection',
      phone,
      dados_cartao: {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        descricao: dados?.descricao || intencao?.entidades?.descricao,
        cartoes: cartoes.map((c: any) => ({ id: c.id, name: c.name }))
      }
    }, phone);
    
    let msg = `💳 *Qual cartão?*\n\n`;
    cartoes.forEach((c: any, i: number) => {
      msg += `${i + 1}️⃣ ${getEmojiBanco(c.name)} ${c.name}\n`;
    });
    msg += `\n_Responda com o número ou nome_`;
    return msg;
  }
  
  // DÉBITO, PIX ou DINHEIRO → registrar em transactions
  const supabase = getSupabase();
  
  // Buscar contas do usuário
  const { data: contas } = await supabase
    .from('accounts')
    .select('id, name, icon')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (!contas || contas.length === 0) {
    await limparContexto(userId);
    return `❌ Você não tem contas cadastradas.`;
  }
  
  const valor = dados?.valor || intencao?.entidades?.valor;
  const descricao = dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp';
  
  // 🔧 Se detectou banco na resposta, tentar encontrar a conta
  let contaSelecionada: typeof contas[0] | null = null;
  if (contaDetectada) {
    // Buscar conta que corresponde ao banco detectado
    for (const conta of contas) {
      const contaNorm = conta.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (contaNorm.includes(contaDetectada)) {
        contaSelecionada = conta;
        console.log('[PAYMENT_METHOD] ✅ Conta encontrada para banco:', contaDetectada, '→', conta.name);
        break;
      }
    }
  }
  
  // Se encontrou conta, registrar direto!
  if (contaSelecionada) {
    // ✅ BUG #12: Detectar categoria antes de registrar
    const { detectarCategoriaAutomatica, buscarCategoriaPorNome } = await import('./transaction-mapper.ts');
    let categoryId: string | null | undefined;
    let categoriaNome = 'Outros';
    try {
      categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
      console.log('[PAYMENT_METHOD] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
      
      // Se encontrou categoria, buscar o nome para exibir no template
      if (categoryId) {
        const { data: categorias } = await getSupabase()
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        if (categorias?.name) {
          categoriaNome = categorias.name;
        }
      }
    } catch (err) {
      console.log('[PAYMENT_METHOD] ⚠️ Erro ao detectar categoria:', err);
    }
    
    const { registrarTransacao } = await import('./transaction-mapper.ts');
    const resultado = await registrarTransacao({
      user_id: userId,
      amount: valor,
      type: 'expense',
      account_id: contaSelecionada.id,
      category_id: categoryId || undefined,
      description: descricao,
      payment_method: metodo.method
    });
    
    await limparContexto(userId);
    
    // ✅ BUG #11: Usar template correto
    if (resultado.success) {
      return templateTransacaoRegistrada({
        type: 'expense',
        amount: valor,
        description: descricao,
        category: categoriaNome,
        account: contaSelecionada.name,
        data: new Date(),
        paymentMethod: metodo.method
      });
    }
    return resultado.mensagem;
  }
  
  if (contas.length === 1) {
    // Registrar direto na única conta
    // ✅ BUG #12: Detectar categoria antes de registrar
    const { detectarCategoriaAutomatica } = await import('./transaction-mapper.ts');
    let categoryId: string | null | undefined;
    let categoriaNome = 'Outros';
    try {
      categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
      console.log('[PAYMENT_METHOD] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
      
      // Se encontrou categoria, buscar o nome para exibir no template
      if (categoryId) {
        const { data: categorias } = await getSupabase()
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        if (categorias?.name) {
          categoriaNome = categorias.name;
        }
      }
    } catch (err) {
      console.log('[PAYMENT_METHOD] ⚠️ Erro ao detectar categoria:', err);
    }
    
    const { registrarTransacao } = await import('./transaction-mapper.ts');
    const resultado = await registrarTransacao({
      user_id: userId,
      amount: valor,
      type: 'expense',
      account_id: contas[0].id,
      category_id: categoryId || undefined,
      description: descricao,
      payment_method: metodo.method
    });
    
    await limparContexto(userId);
    
    // ✅ BUG #11: Usar template correto
    if (resultado.success) {
      return templateTransacaoRegistrada({
        type: 'expense',
        amount: valor,
        description: descricao,
        category: categoriaNome,
        account: contas[0].name,
        data: new Date(),
        paymentMethod: metodo.method
      });
    }
    return resultado.mensagem;
  }
  
  // Múltiplas contas → perguntar qual
  const { getEmojiBanco } = await import('./utils.ts');
  
  // Atualizar contexto com método de pagamento e ir para seleção de conta
  await salvarContexto(userId, 'creating_transaction', {
    step: 'awaiting_account',
    phone,
    intencao_pendente: {
      ...intencao,
      entidades: {
        ...intencao?.entidades,
        forma_pagamento: metodo.method === 'debit' ? 'debito' : 
                         metodo.method === 'pix' ? 'pix' : 
                         metodo.method === 'cash' ? 'dinheiro' : 'other'
      }
    }
  }, phone);
  
  let msg = `💳 *${metodo.label}*\n\n`;
  msg += `🏦 De qual conta?\n\n`;
  contas.forEach((c: any, i: number) => {
    msg += `${i + 1}️⃣ ${getEmojiBanco(c.name)} ${c.name}\n`;
  });
  msg += `\n_Responda com o número ou nome_`;
  return msg;
}

// ============================================
// ✅ BUG #21: PROCESSAR SELEÇÃO DE CONTA PARA TRANSFERÊNCIA
// ============================================

async function processarSelecaoContaTransferencia(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data?.dados_transacao as any;
  
  if (!dados) {
    await limparContexto(userId);
    return '❌ Erro: dados da transferência não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Transferência cancelada.';
  }
  
  // Buscar contas do usuário
  const { data: contas } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId);
  
  if (!contas || contas.length === 0) {
    await limparContexto(userId);
    return '❌ Você não tem contas cadastradas.';
  }
  
  // Tentar encontrar a conta por número ou nome
  let contaSelecionada: { id: string; name: string } | null = null;
  
  // Por número
  const numero = parseInt(resposta);
  if (!isNaN(numero) && numero >= 1 && numero <= contas.length) {
    contaSelecionada = contas[numero - 1];
  }
  
  // Por nome
  if (!contaSelecionada) {
    const respostaNorm = resposta.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    contaSelecionada = contas.find((c: any) => {
      const nomeNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeNorm.includes(respostaNorm) || respostaNorm.includes(nomeNorm);
    }) || null;
  }
  
  if (!contaSelecionada) {
    let msg = `❓ Não encontrei essa conta.\n\n🏦 Escolha uma:\n\n`;
    contas.forEach((c: any, i: number) => {
      msg += `${i + 1}. ${c.name}\n`;
    });
    return msg;
  }
  
  console.log('[TRANSFER-CONTEXT] ✅ Conta selecionada:', contaSelecionada.name);
  
  // Registrar a transferência
  const dataTransacao = dados.data || new Date().toISOString().split('T')[0];
  const { data: transacao, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: contaSelecionada.id,
      amount: dados.valor,
      type: 'transfer',
      payment_method: 'transfer',
      description: `Transferência para ${dados.descricao}`,
      transaction_date: dataTransacao,
      category_id: null
    })
    .select('id');
  
  if (error) {
    console.error('[TRANSFER-CONTEXT] ❌ Erro ao registrar:', error);
    await limparContexto(userId);
    return '❌ Erro ao registrar transferência. Tente novamente.';
  }
  
  console.log('[TRANSFER-CONTEXT] ✅ Transferência registrada:', transacao?.[0]?.id);
  
  // Limpar contexto
  await limparContexto(userId);
  
  // Usar template formatado
  const { templateTransferenciaRegistrada } = await import('./response-templates.ts');
  return templateTransferenciaRegistrada({
    amount: dados.valor,
    destinatario: dados.descricao || 'Não especificado',
    contaOrigem: contaSelecionada.name,
    data: dataTransacao,
    status: 'completed'
  });
}
