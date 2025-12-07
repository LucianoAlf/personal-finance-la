// ============================================
// RESPONSE-TEMPLATES.TS - Templates de Resposta
// Modularização v1.0 - Dezembro 2025
// ============================================

import { formatCurrency } from './utils.ts';

// ============================================
// TEMPLATES DE TRANSAÇÃO
// ============================================

export function templateTransacaoRegistrada(data: {
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  description?: string;
  account?: string;
}): string {
  const typeEmoji = data.type === 'income' ? '💰' : '💸';
  const typeLabel = data.type === 'income' ? 'Receita' : 'Despesa';
  
  return `✅ *Lançamento Registrado!*\n\n` +
    `${typeEmoji} ${typeLabel}\n` +
    `💵 ${formatCurrency(data.amount)}\n` +
    `📂 ${data.category || 'Outros'}\n` +
    `📝 ${data.description || 'Sem descrição'}\n` +
    (data.account ? `🏦 ${data.account}\n` : '') +
    `📅 Hoje\n\n` +
    `💡 *Quer mudar algo? É só me dizer!*\n` +
    `Exemplos: "muda pra Nubank", "era 95", "exclui essa"`;
}

export function templateTransacaoErro(erro?: string): string {
  return `❌ Não consegui processar sua transação.\n\n` +
    (erro ? `Detalhes: ${erro}\n\n` : '') +
    `Tente novamente ou use o app.`;
}

// ============================================
// TEMPLATES DE CONFIRMAÇÃO
// ============================================

export function templateConfirmacaoExclusao(data: {
  type: 'income' | 'expense';
  amount: number;
  description?: string;
}): string {
  const tipo = data.type === 'income' ? '💰 Receita' : '💸 Despesa';
  
  return `🗑️ *Confirma exclusão?*\n\n` +
    `${tipo}: ${formatCurrency(data.amount)}\n` +
    `📝 ${data.description || 'Sem descrição'}\n\n` +
    `_Esta ação não pode ser desfeita._`;
}

export function templateConfirmacaoEdicao(): string {
  return `✏️ *O que você gostaria de mudar?*\n\n` +
    `Exemplos:\n` +
    `• "50 reais" ou "era 50"\n` +
    `• "descrição almoço"\n` +
    `• "categoria alimentação"\n\n` +
    `_Ou digite "cancelar" para voltar._`;
}

// ============================================
// TEMPLATES DE ERRO
// ============================================

export function templateErroGenerico(): string {
  return `⚠️ Erro ao processar sua mensagem.\n\n` +
    `Por favor, use o comando *ajuda* para ver opções disponíveis.`;
}

export function templateUsuarioNaoCadastrado(): string {
  return `👋 Olá! Para usar este serviço, você precisa se cadastrar no app Personal Finance LA primeiro.\n\n` +
    `Baixe em: https://personalfinance.la`;
}

export function templateComandoNaoReconhecido(comando: string): string {
  return `❓ Comando não reconhecido: "${comando}"\n\n` +
    `Digite *ajuda* para ver os comandos disponíveis.`;
}

// ============================================
// TEMPLATES DE SAUDAÇÃO
// ============================================

export function templateSaudacao(nome: string): string {
  const hora = new Date().getHours();
  let saudacao = 'Olá';
  
  if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
  else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
  else saudacao = 'Boa noite';
  
  return `${saudacao}, ${nome}! 👋\n\n` +
    `Sou a Ana Clara, sua assistente financeira.\n\n` +
    `Como posso ajudar?\n\n` +
    `💡 Dica: Digite *ajuda* para ver os comandos.`;
}

// ============================================
// TEMPLATES DE CONTEXTO
// ============================================

export function templatePerguntaConta(contas: Array<{ name: string; icon?: string }>): string {
  let mensagem = '🏦 *Em qual conta?*\n\n';
  
  contas.forEach((conta, i) => {
    const icon = conta.icon || '🏦';
    mensagem += `${i + 1}. ${icon} ${conta.name}\n`;
  });
  
  mensagem += '\n_Digite o número ou nome da conta_';
  
  return mensagem;
}

export function templatePerguntaCategoria(categorias: Array<{ name: string; icon?: string }>): string {
  let mensagem = '📂 *Qual categoria?*\n\n';
  
  categorias.forEach((cat, i) => {
    const icon = cat.icon || '📂';
    mensagem += `${i + 1}. ${icon} ${cat.name}\n`;
  });
  
  mensagem += '\n_Digite o número ou nome_';
  
  return mensagem;
}

export function templatePerguntaValor(): string {
  return '💰 *Qual o valor?*\n\n' +
    'Digite apenas o número (ex: 50 ou 50,00)';
}

// ============================================
// TEMPLATES DE SUCESSO
// ============================================

export function templateSucesso(mensagem: string): string {
  return `✅ ${mensagem}`;
}

export function templateCancelado(): string {
  return '👍 Ação cancelada. Como posso ajudar?';
}

// ============================================
// TEMPLATES DE ANALYTICS
// ============================================

export function templateAnalyticsErro(): string {
  return '❌ Não consegui processar sua consulta. Tente novamente.';
}

// ============================================
// EMOJIS POR TIPO
// ============================================

export const EMOJIS = {
  income: '💰',
  expense: '💸',
  transfer: '🔄',
  checking: '🏦',
  savings: '💰',
  credit_card: '💳',
  investment: '📈',
  stock: '📊',
  fund: '🏦',
  treasury: '🏛️',
  crypto: '₿',
  real_estate: '🏠',
  other: '💼',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  question: '❓',
  calendar: '📅',
  category: '📂',
  description: '📝',
  goal: '🎯',
  bill: '📋'
};
