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
    // ✅ CORREÇÃO CRÍTICA: Buscar última transação de AMBAS as tabelas
    // e excluir a mais recente (por created_at)
    
    // Buscar última transação normal
    const { data: ultimaNormal } = await supabase
      .from('transactions')
      .select('id, description, amount, type, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Buscar última transação de cartão
    const { data: ultimaCartao } = await supabase
      .from('credit_card_transactions')
      .select('id, description, amount, created_at, credit_card_id, invoice_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('[EXCLUIR] Última normal:', ultimaNormal?.id, ultimaNormal?.created_at);
    console.log('[EXCLUIR] Última cartão:', ultimaCartao?.id, ultimaCartao?.created_at);
    
    // Determinar qual é a mais recente
    let excluirCartao = false;
    let transacaoParaExcluir: any = null;
    
    if (ultimaNormal && ultimaCartao) {
      // Comparar datas
      const dataNormal = new Date(ultimaNormal.created_at);
      const dataCartao = new Date(ultimaCartao.created_at);
      
      if (dataCartao > dataNormal) {
        excluirCartao = true;
        transacaoParaExcluir = ultimaCartao;
      } else {
        transacaoParaExcluir = ultimaNormal;
      }
    } else if (ultimaCartao) {
      excluirCartao = true;
      transacaoParaExcluir = ultimaCartao;
    } else if (ultimaNormal) {
      transacaoParaExcluir = ultimaNormal;
    } else {
      return '❌ Não encontrei nenhuma transação recente para excluir.';
    }
    
    console.log('[EXCLUIR] Excluindo:', excluirCartao ? 'CARTÃO' : 'NORMAL', transacaoParaExcluir.id);
    
    if (excluirCartao) {
      // Excluir transação de cartão
      const valor = parseFloat(transacaoParaExcluir.amount);
      
      // Atualizar fatura (subtrair valor)
      if (transacaoParaExcluir.invoice_id) {
        const { data: fatura } = await supabase
          .from('credit_card_invoices')
          .select('total_amount')
          .eq('id', transacaoParaExcluir.invoice_id)
          .single();
        
        if (fatura) {
          const novoTotal = Math.max(0, (fatura.total_amount || 0) - valor);
          await supabase
            .from('credit_card_invoices')
            .update({ total_amount: novoTotal })
            .eq('id', transacaoParaExcluir.invoice_id);
        }
      }
      
      // Atualizar limite do cartão (devolver valor)
      if (transacaoParaExcluir.credit_card_id) {
        const { data: cartao } = await supabase
          .from('credit_cards')
          .select('available_limit')
          .eq('id', transacaoParaExcluir.credit_card_id)
          .single();
        
        if (cartao) {
          const novoLimite = (cartao.available_limit || 0) + valor;
          await supabase
            .from('credit_cards')
            .update({ available_limit: novoLimite })
            .eq('id', transacaoParaExcluir.credit_card_id);
        }
      }
      
      // Deletar transação de cartão
      const { error: deleteError } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('id', transacaoParaExcluir.id);
      
      if (deleteError) {
        console.error('❌ Erro ao excluir transação de cartão:', deleteError);
        return '❌ Erro ao excluir transação. Tente novamente.';
      }
      
      return templateTransacaoExcluida({
        type: 'expense',
        amount: valor,
        description: transacaoParaExcluir.description
      });
    } else {
      // Excluir transação normal
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transacaoParaExcluir.id);
      
      if (deleteError) {
        console.error('❌ Erro ao excluir:', deleteError);
        return '❌ Erro ao excluir transação. Tente novamente.';
      }
      
      return templateTransacaoExcluida({
        type: transacaoParaExcluir.type as 'income' | 'expense',
        amount: parseFloat(transacaoParaExcluir.amount as any),
        description: transacaoParaExcluir.description
      });
    }
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
    // Buscar contas
    const { data: contas, error } = await supabase
      .from('accounts')
      .select('name, current_balance, type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');
    
    if (error || !contas || contas.length === 0) {
      return '❌ Você não tem contas cadastradas.\n\nAcesse o app para criar suas contas.';
    }
    
    // Formatar contas e calcular total
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
