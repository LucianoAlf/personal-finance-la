/**
 * COMMAND HANDLERS - Comandos conversacionais rápidos
 * Não precisam de NLP, são padrões simples
 */

import { getSupabase } from './utils.ts';
import { 
  templateTransacaoExcluida, 
  templateTransacaoAtualizada, 
  templateSaldo, 
  templateListaContas,
  getEmojiConta,
  formatarValor
} from './response-templates.ts';

// ============================================
// EXCLUIR ÚLTIMA TRANSAÇÃO
// ============================================

export async function excluirUltimaTransacao(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  try {
    // Buscar última transação
    const { data: ultima, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description, amount, type')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError || !ultima) {
      return '❌ Não encontrei nenhuma transação recente para excluir.';
    }
    
    console.log('[EXCLUIR] Deletando transação:', ultima.id);
    
    // Deletar
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', ultima.id);
    
    if (deleteError) {
      console.error('❌ Erro ao excluir:', deleteError);
      return '❌ Erro ao excluir transação. Tente novamente.';
    }
    
    return templateTransacaoExcluida({
      type: ultima.type as 'income' | 'expense',
      amount: parseFloat(ultima.amount as any),
      description: ultima.description
    });
  } catch (error) {
    console.error('Erro em excluirUltimaTransacao:', error);
    return '❌ Erro ao processar comando. Tente novamente.';
  }
}

// ============================================
// MUDAR CONTA DA ÚLTIMA TRANSAÇÃO
// ============================================

export async function mudarContaUltimaTransacao(userId: string, nomeConta: string): Promise<string> {
  const supabase = getSupabase();
  
  try {
    // Buscar conta pelo nome
    const { data: conta, error: contaError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${nomeConta}%`)
      .limit(1)
      .single();
    
    if (contaError || !conta) {
      return `❌ Não encontrei a conta "${nomeConta}".\n\nDigite *contas* para ver suas contas disponíveis.`;
    }
    
    // Buscar última transação
    const { data: ultima, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description, amount, account_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError || !ultima) {
      return '❌ Não encontrei nenhuma transação recente para alterar.';
    }
    
    // Buscar nome da conta anterior
    const { data: contaAnterior } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', ultima.account_id)
      .single();
    
    console.log('[MUDAR CONTA] De:', contaAnterior?.name, 'Para:', conta.name);
    
    // Atualizar
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        account_id: conta.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ultima.id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar conta:', updateError);
      return '❌ Erro ao alterar conta. Tente novamente.';
    }
    
    const emojiAnterior = getEmojiConta(contaAnterior?.name || '');
    const emojiNovo = getEmojiConta(conta.name);
    
    return templateTransacaoAtualizada(
      'Conta',
      `${emojiAnterior} ${contaAnterior?.name || 'Anterior'}`,
      `${emojiNovo} ${conta.name}`
    );
  } catch (error) {
    console.error('Erro em mudarContaUltimaTransacao:', error);
    return '❌ Erro ao processar comando. Tente novamente.';
  }
}

// ============================================
// EXTRAIR NOME DA CONTA DO TEXTO
// ============================================

export function extrairNomeConta(texto: string): string | null {
  const match = texto.match(/(?:muda|troca|transfere)\s+(?:pra|pro|para)\s+(\w+)/i);
  return match ? match[1] : null;
}

// ============================================
// CONSULTAR SALDO
// ============================================

export async function consultarSaldo(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  try {
    const { data: contas, error } = await supabase
      .from('accounts')
      .select('name, current_balance, type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');
    
    if (error || !contas || contas.length === 0) {
      return '❌ Você não tem contas cadastradas.\n\nAcesse o app para criar suas contas.';
    }
    
    let total = 0;
    const contasFormatadas = contas.map((conta: any) => {
      const saldo = parseFloat(conta.current_balance) || 0;
      total += saldo;
      return { name: conta.name, balance: saldo };
    });
    
    return templateSaldo(contasFormatadas, total);
  } catch (error) {
    console.error('Erro em consultarSaldo:', error);
    return '❌ Erro ao consultar saldo. Tente novamente.';
  }
}

// ============================================
// LISTAR CONTAS
// ============================================

export async function listarContas(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  try {
    const { data: contas, error } = await supabase
      .from('accounts')
      .select('name, type, current_balance')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');
    
    if (error || !contas || contas.length === 0) {
      return '❌ Você não tem contas cadastradas.';
    }
    
    const contasFormatadas = contas.map((conta: any) => ({
      name: conta.name,
      type: conta.type,
      balance: parseFloat(conta.current_balance) || 0
    }));
    
    return templateListaContas(contasFormatadas);
  } catch (error) {
    console.error('Erro em listarContas:', error);
    return '❌ Erro ao listar contas. Tente novamente.';
  }
}
