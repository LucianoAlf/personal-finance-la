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

import { getSupabase } from './utils.ts';
import { enviarConfirmacaoComBotoes } from './button-sender.ts';
import type { IntencaoClassificada } from './nlp-processor.ts';

const CONTEXT_EXPIRATION_MINUTES = 15;

// Tipos do contexto
export type ContextType = 'idle' | 'editing_transaction' | 'creating_transaction' | 'confirming_action' | 'multi_step_flow';

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
  }
  
  if (contextType === 'editing_transaction') {
    return await processarEdicao(texto, contexto, userId);
  }
  
  if (contextType === 'confirming_action') {
    if (step === 'awaiting_delete_confirmation') {
      return await processarConfirmacaoExclusao(texto, contexto, userId);
    }
    return await processarConfirmacao(texto, contexto, userId);
  }
  
  await limparContexto(userId);
  return '❓ Não entendi. Vamos recomeçar?';
}

// ============================================
// HANDLERS DE CONTEXTO
// ============================================

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
  const variacoesBancos: Record<string, string[]> = {
    'nubank': ['nubank', 'nuno bank', 'nuno benk', 'nu bank', 'roxinho', 'nu', 'nubamk'],
    'itau': ['itau', 'itaú', 'ita', 'itauu'],
    'bradesco': ['bradesco', 'brades', 'bradescoo'],
    'santander': ['santander', 'santan', 'santande'],
    'inter': ['inter', 'banco inter', 'inter bank'],
    'caixa': ['caixa', 'cef', 'caixa economica'],
    'bb': ['bb', 'banco do brasil', 'brasil'],
    'c6': ['c6', 'c6 bank', 'c 6'],
    'picpay': ['picpay', 'pic pay', 'pic'],
    'mercadopago': ['mercado pago', 'mercadopago', 'mp'],
  };
  
  // Tentar por nome/banco com variações
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bankNameLower = (account.bank_name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Match direto
      if (textoLower.includes(accountNameLower) || textoLower.includes(bankNameLower)) {
        contaSelecionada = account;
        console.log('✅ Match direto encontrado:', account.name);
        break;
      }
      
      // Match por variações
      for (const [banco, variacoes] of Object.entries(variacoesBancos)) {
        if (accountNameLower.includes(banco) || bankNameLower.includes(banco)) {
          for (const variacao of variacoes) {
            if (textoLower.includes(variacao)) {
              contaSelecionada = account;
              console.log('✅ Match por variação encontrado:', variacao, '→', account.name);
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
    
    // Buscar categoria padrão
    const { data: categoria } = await supabase
      .from('categories')
      .select('id, name, icon')
      .eq('user_id', userId)
      .ilike('name', `%${entidades.categoria || 'outros'}%`)
      .single();
    
    const categoryId = categoria?.id || null;
    const valorTransacao = entidades.valor || 0;
    const descricaoTransacao = entidades.descricao || 'Via WhatsApp';
    
    console.log('💰 Valor:', valorTransacao, '| Categoria:', categoryId, '| Desc:', descricaoTransacao);
    
    // 2. Montar payload de inserção
    const payload = {
      user_id: userId,
      amount: valorTransacao,
      type: intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense',
      account_id: contaSelecionada.id,
      category_id: categoryId,
      description: descricaoTransacao,
      transaction_date: new Date().toISOString().split('T')[0],
      is_paid: true,
      source: 'whatsapp'
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
    
    const tipoEmoji = intencao.intencao === 'REGISTRAR_RECEITA' ? '💰' : '💸';
    const tipoTexto = intencao.intencao === 'REGISTRAR_RECEITA' ? 'Receita' : 'Despesa';
    const valorFormatado = valorTransacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Mensagem de confirmação CONVERSACIONAL (sem botões)
    const mensagemSucesso = `✅ *Lançamento Registrado!*

${tipoEmoji} ${tipoTexto}
💵 *${valorFormatado}*
📂 ${categoria?.icon || '📁'} ${categoria?.name || 'Outros'}
📝 ${descricaoTransacao}
🏦 ${contaSelecionada.icon || '🏦'} ${contaSelecionada.name}
📅 ${new Date().toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━
💡 *Quer alterar algo?*

• Valor → _"era 95"_
• Conta → _"muda pra Nubank"_
• Excluir → _"exclui essa"_`;
    
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
