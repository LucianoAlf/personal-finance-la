// ============================================
// RESPONSE-TEMPLATES.TS - Templates de Resposta
// Modularização v2.0 - Dezembro 2025
// Design profissional inspirado em GranaZen/Copiloto
// ============================================

import { formatCurrency } from './utils.ts';

// ============================================
// EMOJIS POR CATEGORIA
// ============================================

const EMOJI_CATEGORIA: Record<string, string> = {
  'alimentacao': '🍽️',
  'Alimentação': '🍽️',
  'transporte': '🚗',
  'Transporte': '🚗',
  'saude': '🏥',
  'Saúde': '🏥',
  'educacao': '📚',
  'Educação': '📚',
  'moradia': '🏠',
  'Moradia': '🏠',
  'lazer': '🎮',
  'Lazer': '🎮',
  'vestuario': '👕',
  'Vestuário': '👕',
  'mercado': '🛒',
  'Mercado': '🛒',
  'supermercado': '🛒',
  'Supermercado': '🛒',
  'combustivel': '⛽',
  'Combustível': '⛽',
  'investimento': '📈',
  'Investimento': '📈',
  'salario': '💼',
  'Salário': '💼',
  'freelance': '💻',
  'Freelance': '💻',
  'restaurante': '🍔',
  'Restaurante': '🍔',
  'cafe': '☕',
  'Café': '☕',
  'farmacia': '💊',
  'Farmácia': '💊',
  'uber': '🚕',
  'Uber': '🚕',
  'outros': '📦',
  'Outros': '📦',
  'default': '📋'
};

const EMOJI_CONTA: Record<string, string> = {
  'nubank': '💜',
  'nu': '💜',
  'roxinho': '💜',
  'itau': '🧡',
  'itaú': '🧡',
  'bradesco': '❤️',
  'santander': '❤️',
  'inter': '🧡',
  'c6': '⚫',
  'caixa': '💙',
  'bb': '💛',
  'banco do brasil': '💛',
  'picpay': '💚',
  'mercado pago': '💙',
  'default': '🏦'
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getEmojiCategoria(categoria: string): string {
  if (!categoria) return EMOJI_CATEGORIA['default'];
  return EMOJI_CATEGORIA[categoria] || EMOJI_CATEGORIA[categoria.toLowerCase()] || EMOJI_CATEGORIA['default'];
}

function getEmojiConta(conta: string): string {
  if (!conta) return EMOJI_CONTA['default'];
  const contaLower = conta.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_CONTA)) {
    if (contaLower.includes(key)) return emoji;
  }
  return EMOJI_CONTA['default'];
}

function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

function formatarData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR');
}

function getFraseMotivacional(tipo: string, categoria: string): string {
  const frases: Record<string, string[]> = {
    'alimentacao': [
      'Bom apetite! 😋',
      'Alimentação é essencial!',
      'Que delícia! Comer bem é investir em saúde.',
    ],
    'Alimentação': [
      'Bom apetite! 😋',
      'Alimentação é essencial!',
      'Que delícia! Comer bem é investir em saúde.',
    ],
    'transporte': [
      'Mobilidade é importante! 🚀',
      'Bora pra cima!',
    ],
    'Transporte': [
      'Mobilidade é importante! 🚀',
      'Bora pra cima!',
    ],
    'lazer': [
      'Diversão também é importante! 🎉',
      'Momentos de lazer são essenciais!',
    ],
    'Lazer': [
      'Diversão também é importante! 🎉',
      'Momentos de lazer são essenciais!',
    ],
    'saude': [
      'Saúde em primeiro lugar! 💪',
      'Cuidar de si é o melhor investimento!',
    ],
    'Saúde': [
      'Saúde em primeiro lugar! 💪',
      'Cuidar de si é o melhor investimento!',
    ],
    'income': [
      'Ótimo! Mais uma entrada! 💰',
      'Continue assim! 💪',
      'Excelente trabalho!',
      'Dinheiro na conta! 🎉',
    ],
    'default': [
      'Registrado com sucesso! ✨',
      'Tudo certo! ✅',
      'Anotado! 📝',
    ]
  };
  
  if (tipo === 'income') {
    const arr = frases['income'];
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  const categoriaFrases = frases[categoria] || frases['default'];
  return categoriaFrases[Math.floor(Math.random() * categoriaFrases.length)];
}

// ============================================
// TEMPLATES DE TRANSAÇÃO
// ============================================

export function templateTransacaoRegistrada(data: {
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  description?: string;
  account?: string;
  data?: Date | string;
}): string {
  const emojiTipo = data.type === 'income' ? '🟢' : '🔴';
  const tipoLabel = data.type === 'income' ? 'Receita' : 'Despesa';
  const emojiCategoria = getEmojiCategoria(data.category || '');
  const emojiConta = getEmojiConta(data.account || '');
  const valorFormatado = formatarValor(data.amount);
  const dataFormatada = data.data ? formatarData(data.data) : formatarData(new Date());
  const frase = getFraseMotivacional(data.type, data.category || '');
  const statusEmoji = data.type === 'income' ? '✔️' : '✔️';
  const statusLabel = data.type === 'income' ? 'Recebido' : 'Pago';
  
  let mensagem = `${frase}\n\n`;
  mensagem += `⭐ *Transação Registrada!* ⭐\n\n`;
  mensagem += `📝 *Descrição:* ${data.description || 'Não especificada'}\n`;
  mensagem += `💰 *Valor:* R$ ${valorFormatado}\n`;
  mensagem += `${emojiTipo} *Tipo:* ${tipoLabel}\n`;
  mensagem += `${emojiCategoria} *Categoria:* ${data.category || 'Outros'}\n`;
  mensagem += `${emojiConta} *Conta:* ${data.account || 'Não especificada'}\n`;
  mensagem += `📅 *Data:* ${dataFormatada}\n\n`;
  mensagem += `${statusEmoji} *Status:* ${statusLabel}\n`;
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💡 *Quer alterar algo?*\n`;
  mensagem += `• Valor → "era 95"\n`;
  mensagem += `• Conta → "muda pra Nubank"\n`;
  mensagem += `• Excluir → "exclui essa"`;
  
  return mensagem;
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
  const emojiTipo = data.type === 'income' ? '🟢' : '🔴';
  const tipoLabel = data.type === 'income' ? 'Receita' : 'Despesa';
  const valorFormatado = formatarValor(data.amount);
  
  return `🗑️ *Confirma exclusão?*\n\n` +
    `${emojiTipo} ${tipoLabel}: ${data.description || 'Sem descrição'}\n` +
    `💰 Valor: R$ ${valorFormatado}\n\n` +
    `⚠️ _Esta ação não pode ser desfeita._`;
}

export function templateTransacaoExcluida(data: {
  type: 'income' | 'expense';
  amount: number;
  description?: string;
}): string {
  const emojiTipo = data.type === 'income' ? '🟢' : '🔴';
  const tipoLabel = data.type === 'income' ? 'Receita' : 'Despesa';
  const valorFormatado = formatarValor(data.amount);
  
  return `🗑️ *Transação Excluída!*\n\n` +
    `${emojiTipo} ${tipoLabel}: ${data.description || 'Sem descrição'}\n` +
    `💰 Valor: R$ ${valorFormatado}\n\n` +
    `✅ Removida com sucesso!`;
}

export function templateTransacaoAtualizada(campo: string, valorAntigo: string, valorNovo: string): string {
  return `✅ *Transação Atualizada!*\n\n` +
    `📝 ${campo}\n` +
    `${valorAntigo} → ${valorNovo}\n\n` +
    `Alteração salva com sucesso! ✨`;
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
    const emojiConta = getEmojiConta(conta.name);
    mensagem += `${i + 1}. ${emojiConta} ${conta.name}\n`;
  });
  
  mensagem += '\n_Responda com o número ou nome da conta_';
  
  return mensagem;
}

// ============================================
// TEMPLATES DE SALDO
// ============================================

export function templateSaldo(contas: Array<{name: string, balance: number}>, total: number): string {
  const emojiTotal = total >= 0 ? '✅' : '⚠️';
  const totalFormatado = formatarValor(Math.abs(total));
  
  let mensagem = `💰 *Seus Saldos*\n\n`;
  
  for (const conta of contas) {
    const emoji = getEmojiConta(conta.name);
    const saldoEmoji = conta.balance >= 0 ? '💚' : '🔴';
    const saldoFormatado = formatarValor(Math.abs(conta.balance));
    const sinal = conta.balance < 0 ? '-' : '';
    mensagem += `${emoji} *${conta.name}*\n`;
    mensagem += `   ${saldoEmoji} R$ ${sinal}${saldoFormatado}\n\n`;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `${emojiTotal} *Total: R$ ${total < 0 ? '-' : ''}${totalFormatado}*`;
  
  return mensagem;
}

export function templateListaContas(contas: Array<{name: string, type: string, balance: number}>): string {
  let mensagem = `🏦 *Suas Contas*\n\n`;
  
  contas.forEach((conta, i) => {
    const emoji = getEmojiConta(conta.name);
    const saldoFormatado = formatarValor(Math.abs(conta.balance));
    const sinal = conta.balance < 0 ? '-' : '';
    mensagem += `${i + 1}. ${emoji} *${conta.name}*\n`;
    mensagem += `   💰 R$ ${sinal}${saldoFormatado}\n\n`;
  });
  
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
// TEMPLATES DE AJUDA
// ============================================

export function templateAjuda(): string {
  return `📚 *Central de Ajuda - Ana Clara*\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `*💸 Registrar Despesa:*\n` +
    `• "Gastei 50 no mercado"\n` +
    `• "Paguei 100 de luz"\n` +
    `• "30 reais no almoço"\n\n` +
    `*💰 Registrar Receita:*\n` +
    `• "Recebi 1000 de salário"\n` +
    `• "Entrou 500 de freelance"\n\n` +
    `*✏️ Editar Transação:*\n` +
    `• "Era 95" (corrige valor)\n` +
    `• "Muda pra Nubank" (troca conta)\n` +
    `• "Exclui essa" (remove)\n\n` +
    `*📊 Consultas:*\n` +
    `• "Saldo"\n` +
    `• "Contas"\n` +
    `• "Resumo do mês"\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🎤 _Pode mandar áudio também!_`;
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

// ============================================
// EXPORTS AUXILIARES
// ============================================

export {
  getEmojiCategoria,
  getEmojiConta,
  formatarValor,
  formatarData
};
