/**
 * Detecção de contexto conversacional
 * Diferencia entre NOVA TRANSAÇÃO e RESPOSTA ao contexto
 * 
 * Problema: Sistema confunde "Comprei um lanche e paguei no pix" (nova transação)
 *           com resposta a "Como você pagou?" (resposta ao contexto)
 * Solução: Detectar padrão de nova transação antes de processar como resposta
 */

export function pareceNovaTransacao(mensagem: string): boolean {
  const texto = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Padrões que indicam NOVA transação
  const verbosAcao = /\b(comprei|gastei|paguei|recebi|transferi|depositei|enviei|mandei)\b/;
  const temVerboAcao = verbosAcao.test(texto);
  
  // Se tem verbo de ação + valor OU verbo de ação + item, é nova transação
  const temValor = /\b\d+([.,]\d{2})?\b/.test(texto);
  
  const itensTransacao = [
    'lanche', 'mercado', 'uber', 'ifood', 'luz', 'agua', 'aluguel', 'gasolina',
    'farmacia', 'restaurante', 'almoco', 'jantar', 'cafe', 'conta', 'boleto',
    'rappi', 'taxi', '99', 'onibus', 'metro', 'passagem', 'cinema', 'livro',
    'roupa', 'sapato', 'bolsa', 'presente', 'padaria', 'pizzaria', 'bar',
    'combustivel', 'estacionamento', 'condominio', 'iptu', 'internet', 'telefone',
    'remedio', 'medico', 'consulta', 'exame', 'dentista', 'curso', 'escola'
  ];
  const temItem = new RegExp(`\\b(${itensTransacao.join('|')})\\b`).test(texto);
  
  // Respostas simples ao contexto (NÃO são novas transações)
  const respostasSimples = /^(pix|credito|crédito|debito|débito|dinheiro|1|2|3|4|nubank|itau|itaú|bradesco|santander|roxinho|laranjinha|cartao|cartão|nubank|inter|c6|original|next|picpay)$/i;
  if (respostasSimples.test(texto.trim())) {
    console.log('[CONTEXT-DETECTOR] ℹ️ Resposta simples ao contexto:', mensagem);
    return false;
  }
  
  // Se tem verbo de ação E (valor OU item), é nova transação
  if (temVerboAcao && (temValor || temItem)) {
    console.log('[CONTEXT-DETECTOR] ⚠️ Detectada nova transação:', mensagem);
    console.log('[CONTEXT-DETECTOR] Verbo de ação:', temVerboAcao);
    console.log('[CONTEXT-DETECTOR] Tem valor:', temValor, '| Tem item:', temItem);
    return true;
  }
  
  console.log('[CONTEXT-DETECTOR] ℹ️ Não parece nova transação:', mensagem);
  return false;
}

/**
 * Detecta se uma mensagem é uma resposta de seleção de conta
 * Exemplo: "Nubank", "1", "Itau"
 */
export function pareceSelecaoConta(mensagem: string): boolean {
  const texto = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const bancos = ['nubank', 'itau', 'bradesco', 'santander', 'inter', 'c6', 'caixa', 'bb', 'original', 'next', 'picpay', 'mercadopago'];
  const aliases = ['roxinho', 'roxo', 'laranjinha', 'banco do brasil'];
  const todosOsBancos = [...bancos, ...aliases];
  
  // Resposta por número
  if (/^[1-9]$/.test(texto.trim())) {
    return true;
  }
  
  // Resposta por nome de banco
  if (todosOsBancos.some(b => texto.includes(b))) {
    return true;
  }
  
  return false;
}

/**
 * Detecta se uma mensagem é uma resposta de seleção de cartão
 * Exemplo: "Nubank", "1", "Itau"
 */
export function pareceSelecaoCartao(mensagem: string): boolean {
  return pareceSelecaoConta(mensagem); // Mesma lógica
}

/**
 * Detecta se uma mensagem é uma resposta de método de pagamento
 * Exemplo: "Pix", "Crédito", "Débito", "Dinheiro"
 */
export function pareceMetodoPagamento(mensagem: string): boolean {
  const texto = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const metodos = ['pix', 'credito', 'crédito', 'debito', 'débito', 'dinheiro', 'cash', 'boleto', 'transferencia'];
  
  // Resposta por número
  if (/^[1-4]$/.test(texto.trim())) {
    return true;
  }
  
  // Resposta por nome de método
  if (metodos.some(m => texto.includes(m))) {
    return true;
  }
  
  return false;
}
