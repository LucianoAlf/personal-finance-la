// ============================================
// BUTTON-HANDLER.TS - Processamento de Botões
// Modularização v1.0 - Dezembro 2025
// ============================================

import { getSupabase, enviarTexto, enviarMensagemComBotoes, formatCurrency } from './utils.ts';
import { salvarContexto, limparContexto } from './context-manager.ts';
import type { BotaoInterativo } from './types.ts';

// ============================================
// PARSE BUTTON ID
// ⚠️ IMPORTANTE: Não usar split('_') - UUIDs têm hífens!
// ============================================

export function parseButtonId(buttonId: string): { acao: string; id: string } {
  // Formato: "acao_uuid-com-hifens"
  
  const acoes = ['editar', 'excluir', 'confirmar', 'cancelar', 'pagar', 'detalhes'];
  
  for (const acao of acoes) {
    if (buttonId.startsWith(`${acao}_`)) {
      return { 
        acao, 
        id: buttonId.replace(`${acao}_`, '') 
      };
    }
  }
  
  return { acao: 'desconhecido', id: buttonId };
}

// ============================================
// PROCESSAR CLIQUE EM BOTÃO
// ============================================

export async function processarBotao(
  buttonId: string, 
  userId: string, 
  phone: string
): Promise<void> {
  const { acao, id } = parseButtonId(buttonId);
  
  console.log(`🔘 Botão clicado: acao=${acao}, id=${id}`);
  
  switch (acao) {
    case 'editar':
      await iniciarFluxoEdicao(id, userId, phone);
      break;
      
    case 'excluir':
      await iniciarFluxoExclusao(id, userId, phone);
      break;
      
    case 'confirmar':
      await confirmarAcao(id, userId, phone);
      break;
      
    case 'cancelar':
      await cancelarAcao(userId, phone);
      break;
      
    case 'pagar':
      await marcarComoPago(id, userId, phone);
      break;
      
    case 'detalhes':
      await mostrarDetalhes(id, userId, phone);
      break;
      
    default:
      await enviarTexto(phone, '❌ Ação não reconhecida. Tente novamente.');
  }
}

// ============================================
// FLUXO DE EDIÇÃO
// ============================================

async function iniciarFluxoEdicao(
  transacaoId: string, 
  userId: string, 
  phone: string
): Promise<void> {
  // Salvar contexto
  await salvarContexto(userId, 'editing_transaction', {
    transacao_id: transacaoId,
    transacao_tipo: 'transaction',
    step: 'awaiting_field',
    phone
  }, phone);
  
  await enviarTexto(phone, 
    '✏️ *O que você gostaria de mudar?*\n\n' +
    'Exemplos:\n' +
    '• "50 reais" ou "era 50"\n' +
    '• "descrição almoço"\n' +
    '• "categoria alimentação"\n\n' +
    '_Ou digite "cancelar" para voltar._'
  );
}

// ============================================
// FLUXO DE EXCLUSÃO
// ============================================

async function iniciarFluxoExclusao(
  transacaoId: string, 
  userId: string, 
  phone: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Buscar transação
  const { data: transacao } = await supabase
    .from('transactions')
    .select('amount, description, type')
    .eq('id', transacaoId)
    .eq('user_id', userId)
    .single();
  
  if (!transacao) {
    await enviarTexto(phone, '❌ Transação não encontrada.');
    return;
  }
  
  // Salvar contexto
  await salvarContexto(userId, 'confirming_action', {
    transacao_id: transacaoId,
    transacao_tipo: 'transaction',
    step: 'awaiting_delete_confirmation',
    phone
  }, phone);
  
  const tipo = transacao.type === 'income' ? '💰 Receita' : '💸 Despesa';
  
  await enviarMensagemComBotoes(
    phone,
    `🗑️ *Confirma exclusão?*\n\n` +
    `${tipo}: ${formatCurrency(transacao.amount)}\n` +
    `📝 ${transacao.description || 'Sem descrição'}`,
    [
      { texto: '✅ Confirmar', id: `confirmar_${transacaoId}` },
      { texto: '❌ Cancelar', id: `cancelar_${transacaoId}` }
    ],
    'Esta ação não pode ser desfeita'
  );
}

// ============================================
// CONFIRMAR AÇÃO
// ============================================

async function confirmarAcao(
  transacaoId: string, 
  userId: string, 
  phone: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Excluir transação
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transacaoId)
    .eq('user_id', userId);
  
  // Limpar contexto
  await limparContexto(userId);
  
  if (error) {
    await enviarTexto(phone, '❌ Erro ao excluir. Tente novamente.');
    return;
  }
  
  await enviarTexto(phone, '✅ Transação excluída com sucesso!');
}

// ============================================
// CANCELAR AÇÃO
// ============================================

async function cancelarAcao(userId: string, phone: string): Promise<void> {
  await limparContexto(userId);
  await enviarTexto(phone, '👍 Ação cancelada.');
}

// ============================================
// MARCAR COMO PAGO
// ============================================

async function marcarComoPago(
  billId: string, 
  userId: string, 
  phone: string
): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('payable_bills')
    .update({ 
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('id', billId)
    .eq('user_id', userId);
  
  if (error) {
    await enviarTexto(phone, '❌ Erro ao marcar como pago.');
    return;
  }
  
  await enviarTexto(phone, '✅ Conta marcada como paga!');
}

// ============================================
// MOSTRAR DETALHES
// ============================================

async function mostrarDetalhes(
  id: string, 
  userId: string, 
  phone: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Tentar buscar como transação
  const { data: transacao } = await supabase
    .from('transactions')
    .select('*, categories(name, icon)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (transacao) {
    const tipo = transacao.type === 'income' ? '💰 Receita' : '💸 Despesa';
    const categoria = transacao.categories?.name || 'Sem categoria';
    const icone = transacao.categories?.icon || '📂';
    
    await enviarTexto(phone,
      `📋 *Detalhes da Transação*\n\n` +
      `${tipo}\n` +
      `💵 ${formatCurrency(transacao.amount)}\n` +
      `${icone} ${categoria}\n` +
      `📝 ${transacao.description || 'Sem descrição'}\n` +
      `📅 ${new Date(transacao.transaction_date).toLocaleDateString('pt-BR')}`
    );
    return;
  }
  
  await enviarTexto(phone, '❌ Não encontrei os detalhes.');
}

// ============================================
// HELPER: ENVIAR CONFIRMAÇÃO COM BOTÕES
// ============================================

export async function enviarConfirmacaoComBotoes(
  phone: string,
  mensagem: string,
  transacaoId: string
): Promise<void> {
  const botoes: BotaoInterativo[] = [
    { texto: '✏️ Editar', id: `editar_${transacaoId}` },
    { texto: '🗑️ Excluir', id: `excluir_${transacaoId}` }
  ];
  
  await enviarMensagemComBotoes(phone, mensagem, botoes, 'Escolha uma ação');
}
