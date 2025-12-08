// ============================================
// HUMANIZAÇÃO DA ANA CLARA
// Sistema de respostas humanizadas e contextuais
// Baseado no Zé (Copiloto Financeiro)
// ============================================

// ============================================
// IDENTIDADE
// ============================================

export const IDENTIDADE = {
  nome: 'Ana Clara',
  emoji: '🙋🏻‍♀️',
  papel: 'sua Personal Finance',
  tom: 'amiga próxima que entende de finanças',
  assinatura: '_Ana Clara • Personal Finance_ 🙋🏻‍♀️'
};

// ============================================
// SAUDAÇÕES POR HORÁRIO
// ============================================

export function getSaudacaoHorario(): { texto: string; emoji: string } {
  const agora = new Date();
  const hora = parseInt(agora.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo', 
    hour: '2-digit',
    hour12: false 
  }));
  
  if (hora >= 5 && hora < 12) {
    return { texto: 'Bom dia', emoji: '☀️' };
  } else if (hora >= 12 && hora < 18) {
    return { texto: 'Boa tarde', emoji: '🌤️' };
  } else {
    return { texto: 'Boa noite', emoji: '🌙' };
  }
}

// ============================================
// MENSAGENS CONTEXTUAIS POR CATEGORIA
// ============================================

export const MENSAGENS_CONTEXTUAIS: Record<string, string> = {
  // Despesas - Alimentação
  'alimentacao': '🍽️ Cuidar da alimentação é investir em saúde!',
  'alimentação': '🍽️ Cuidar da alimentação é investir em saúde!',
  'mercado': '🛒 Boas compras!',
  'supermercado': '🛒 Boas compras!',
  'restaurante': '🍴 Bom apetite!',
  'lanche': '🥪 Uma pausa para recarregar as energias!',
  'ifood': '🛵 Delivery chegando!',
  'almoço': '🍽️ Hora do almoço! Bom apetite!',
  'almoco': '🍽️ Hora do almoço! Bom apetite!',
  'jantar': '🍽️ Hora do jantar! Bom apetite!',
  'cafe': '☕ Cafezinho é essencial!',
  'café': '☕ Cafezinho é essencial!',
  
  // Despesas - Transporte
  'transporte': '🚗 Mobilidade é essencial no dia a dia!',
  'uber': '🚕 Mobilidade na palma da mão!',
  '99': '🚕 Mobilidade na palma da mão!',
  'gasolina': '⛽ Tanque cheio, estrada livre!',
  'combustivel': '⛽ Tanque cheio, estrada livre!',
  'combustível': '⛽ Tanque cheio, estrada livre!',
  'estacionamento': '🅿️ Carro seguro!',
  'pedagio': '🛣️ Estrada livre!',
  'pedágio': '🛣️ Estrada livre!',
  
  // Despesas - Moradia
  'moradia': '🏠 Lar doce lar! Casa em ordem, vida em ordem.',
  'aluguel': '🏠 Teto garantido!',
  'condominio': '🏢 Moradia organizada!',
  'condomínio': '🏢 Moradia organizada!',
  'luz': '💡 Energia que move a casa!',
  'energia': '💡 Energia que move a casa!',
  'agua': '💧 Água é vida!',
  'água': '💧 Água é vida!',
  'gas': '🔥 Gás em dia!',
  'gás': '🔥 Gás em dia!',
  'internet': '🌐 Conexão é tudo hoje em dia!',
  'wifi': '📶 Conectado!',
  
  // Despesas - Saúde
  'saude': '🏥 Saúde em primeiro lugar, sempre!',
  'saúde': '🏥 Saúde em primeiro lugar, sempre!',
  'farmacia': '💊 Cuidando da saúde!',
  'farmácia': '💊 Cuidando da saúde!',
  'remedio': '💊 Cuidando da saúde!',
  'remédio': '💊 Cuidando da saúde!',
  'medico': '👨‍⚕️ Cuidando da saúde!',
  'médico': '👨‍⚕️ Cuidando da saúde!',
  'academia': '💪 Corpo em movimento!',
  'dentista': '🦷 Sorriso em dia!',
  
  // Despesas - Educação
  'educacao': '📚 Investir em conhecimento nunca é demais!',
  'educação': '📚 Investir em conhecimento nunca é demais!',
  'curso': '📚 Investindo em conhecimento!',
  'livro': '📖 Leitura é sempre um bom investimento!',
  'escola': '🎒 Educação é prioridade!',
  'faculdade': '🎓 Investindo no futuro!',
  
  // Despesas - Lazer
  'lazer': '🎬 Diversão também é importante para o equilíbrio!',
  'cinema': '🎬 Bom filme!',
  'netflix': '🎬 Hora de relaxar!',
  'spotify': '🎵 Música é vida!',
  'streaming': '📺 Entretenimento garantido!',
  'viagem': '✈️ Boas aventuras!',
  'passeio': '🚶 Aproveite o passeio!',
  
  // Despesas - Vestuário
  'vestuario': '👕 Visual em dia, autoestima lá em cima!',
  'vestuário': '👕 Visual em dia, autoestima lá em cima!',
  'roupa': '👕 Visual renovado!',
  'sapato': '👟 Estilo nos pés!',
  'calçado': '👟 Estilo nos pés!',
  
  // Despesas - Pet
  'pet': '🐾 Nossos pets merecem todo carinho!',
  'cachorro': '🐕 Cuidando do melhor amigo!',
  'gato': '🐱 Cuidando do felino!',
  'ração': '🐾 Pet alimentado, pet feliz!',
  'racao': '🐾 Pet alimentado, pet feliz!',
  'veterinario': '🏥 Cuidando da saúde do pet!',
  'veterinário': '🏥 Cuidando da saúde do pet!',
  
  // Despesas - Assinaturas
  'assinaturas': '📱 Serviços que facilitam a vida!',
  'assinatura': '📱 Serviço garantido!',
  
  // Despesas - Presentes
  'presente': '🎁 Que legal dar presente!',
  'presentes': '🎁 Generosidade é uma virtude!',
  
  // Receitas
  'salario': '💼 Dia de pagamento! Merecido!',
  'salário': '💼 Dia de pagamento! Merecido!',
  'freelance': '💻 Trabalho extra valorizando!',
  'freela': '💻 Trabalho extra valorizando!',
  'investimento': '📈 Dinheiro trabalhando por você!',
  'investimentos': '📈 Dinheiro trabalhando por você!',
  'rendimento': '📊 Seus investimentos rendendo!',
  'rendimentos': '📊 Seus investimentos rendendo!',
  'dividendo': '💰 Dividendos chegando!',
  'dividendos': '💰 Dividendos chegando!',
  'bonus': '🎁 Bônus merecido!',
  'bônus': '🎁 Bônus merecido!',
  'venda': '🤝 Negócio fechado!',
  'vendas': '🤝 Boas vendas!',
  'pix': '💸 Pix recebido!',
  'transferencia': '💸 Transferência recebida!',
  'transferência': '💸 Transferência recebida!',
  
  // Default
  'default': '📝 Anotado!'
};

// ============================================
// MENSAGENS MOTIVACIONAIS
// ============================================

export const MENSAGENS_MOTIVACIONAIS: Record<string, string[]> = {
  // Despesas - Alimentação
  'alimentacao': ['Bom apetite! 😋', 'Aproveite a refeição! 🍽️', 'Que delícia! 😊'],
  'alimentação': ['Bom apetite! 😋', 'Aproveite a refeição! 🍽️', 'Que delícia! 😊'],
  'mercado': ['Despensa cheia! 🛒', 'Casa abastecida! 😊', 'Compras feitas! ✅'],
  'restaurante': ['Bom apetite! 😋', 'Aproveite! 🍴', 'Que delícia! 😊'],
  'lanche': ['Bom lanche! 🥪', 'Energia recarregada! 💪', 'Aproveite! 😊'],
  'ifood': ['Bom apetite! 🛵', 'Aproveite o delivery! 😋', 'Que venha a comida! 🍔'],
  
  // Despesas - Transporte
  'transporte': ['Boa viagem! 🚗', 'Bom trajeto! 😊', 'Mobilidade garantida! 👍'],
  'uber': ['Boa viagem! 🚕', 'Bom trajeto! 😊', 'Chegue bem! 👍'],
  'gasolina': ['Boas viagens! ⛽', 'Tanque cheio! 🚗', 'Estrada livre! 🛣️'],
  'combustivel': ['Boas viagens! ⛽', 'Tanque cheio! 🚗', 'Estrada livre! 🛣️'],
  
  // Despesas - Moradia
  'moradia': ['Casa em ordem! 🏠', 'Lar organizado! ✨', 'Conforto garantido! 😊'],
  'aluguel': ['Teto garantido! 🏠', 'Moradia segura! 😊', 'Casa em dia! ✅'],
  'luz': ['Energia garantida! 💡', 'Casa iluminada! ✨', 'Conta em dia! ✅'],
  'agua': ['Água garantida! 💧', 'Conta em dia! ✅', 'Essencial! 😊'],
  'internet': ['Conectado! 🌐', 'Online! 📶', 'Conexão garantida! 👍'],
  
  // Despesas - Saúde
  'saude': ['Cuide-se bem! 💪', 'Saúde é prioridade! 😊', 'Boa recuperação! 🙏'],
  'saúde': ['Cuide-se bem! 💪', 'Saúde é prioridade! 😊', 'Boa recuperação! 🙏'],
  'farmacia': ['Melhoras! 💊', 'Cuide-se! 😊', 'Saúde em dia! 💪'],
  'academia': ['Bom treino! 💪', 'Corpo em forma! 🏋️', 'Saúde em dia! 😊'],
  
  // Despesas - Educação
  'educacao': ['Bons estudos! 📚', 'Conhecimento é poder! 💡', 'Sucesso nos estudos! 🎓'],
  'educação': ['Bons estudos! 📚', 'Conhecimento é poder! 💡', 'Sucesso nos estudos! 🎓'],
  'curso': ['Bons estudos! 📚', 'Aproveite o curso! 💡', 'Sucesso! 🎓'],
  
  // Despesas - Lazer
  'lazer': ['Divirta-se! 🎉', 'Aproveite! 😊', 'Você merece! 🌟'],
  'cinema': ['Bom filme! 🎬', 'Divirta-se! 🍿', 'Aproveite! 😊'],
  'netflix': ['Bom filme! 🎬', 'Aproveite a série! 📺', 'Relaxe! 😊'],
  'viagem': ['Boa viagem! ✈️', 'Aproveite! 🌴', 'Boas aventuras! 🗺️'],
  
  // Despesas - Pet
  'pet': ['Pet feliz! 🐾', 'Cuidando bem! 😊', 'Amor de pet! 💕'],
  
  // Receitas
  'salario': ['Parabéns pelo trabalho! 👏', 'Merecido! 💪', 'Continue assim! 🚀'],
  'salário': ['Parabéns pelo trabalho! 👏', 'Merecido! 💪', 'Continue assim! 🚀'],
  'freelance': ['Ótimo trabalho extra! 💼', 'Mandou bem! 👏', 'Esforço recompensado! 💪'],
  'freela': ['Ótimo trabalho extra! 💼', 'Mandou bem! 👏', 'Esforço recompensado! 💪'],
  'investimento': ['Ótima decisão! 📈', 'Dinheiro trabalhando! 💰', 'Futuro garantido! 🎯'],
  'investimentos': ['Ótima decisão! 📈', 'Dinheiro trabalhando! 💰', 'Futuro garantido! 🎯'],
  'rendimento': ['Dinheiro rendendo! 📊', 'Ótimo retorno! 💰', 'Investimento valendo! 📈'],
  'bonus': ['Parabéns! 🎉', 'Merecido! 👏', 'Que venham mais! 🚀'],
  'bônus': ['Parabéns! 🎉', 'Merecido! 👏', 'Que venham mais! 🚀'],
  'venda': ['Ótima venda! 🤝', 'Negócio fechado! 💪', 'Parabéns! 👏'],
  
  // Default
  'default': ['Tudo certo! 😊', 'Registrado! ✅', 'Anotado! 📝', 'Feito! ✅']
};

/**
 * Retorna mensagem motivacional aleatória para categoria
 */
export function getMensagemMotivacional(categoria: string, descricao?: string): string {
  const catLower = categoria.toLowerCase();
  const descLower = (descricao || '').toLowerCase();
  
  // Tentar pela descrição primeiro (mais específico)
  for (const [key, msgs] of Object.entries(MENSAGENS_MOTIVACIONAIS)) {
    if (descLower.includes(key)) {
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }
  
  // Depois pela categoria
  const mensagens = MENSAGENS_MOTIVACIONAIS[catLower] || MENSAGENS_MOTIVACIONAIS['default'];
  return mensagens[Math.floor(Math.random() * mensagens.length)];
}

/**
 * Retorna mensagem contextual para categoria
 */
export function getMensagemContextual(categoria: string, descricao?: string): string {
  const catLower = categoria.toLowerCase();
  const descLower = (descricao || '').toLowerCase();
  
  // Tentar pela descrição primeiro (mais específico)
  for (const [key, msg] of Object.entries(MENSAGENS_CONTEXTUAIS)) {
    if (descLower.includes(key)) {
      return msg;
    }
  }
  
  // Depois pela categoria
  return MENSAGENS_CONTEXTUAIS[catLower] || MENSAGENS_CONTEXTUAIS['default'];
}

// ============================================
// EMOJIS POR CATEGORIA
// ============================================

export const EMOJI_CATEGORIA: Record<string, string> = {
  'alimentação': '🍽️',
  'alimentacao': '🍽️',
  'mercado': '🛒',
  'supermercado': '🛒',
  'restaurante': '🍴',
  'transporte': '🚗',
  'uber': '🚕',
  'gasolina': '⛽',
  'combustível': '⛽',
  'combustivel': '⛽',
  'moradia': '🏠',
  'aluguel': '🏠',
  'luz': '💡',
  'água': '💧',
  'agua': '💧',
  'internet': '🌐',
  'saúde': '🏥',
  'saude': '🏥',
  'farmácia': '💊',
  'farmacia': '💊',
  'academia': '💪',
  'educação': '📚',
  'educacao': '📚',
  'lazer': '🎬',
  'cinema': '🎬',
  'netflix': '📺',
  'spotify': '🎵',
  'vestuário': '👕',
  'vestuario': '👕',
  'pet': '🐾',
  'assinaturas': '📱',
  'presentes': '🎁',
  'outros': '📦',
  'salário': '💼',
  'salario': '💼',
  'freelance': '💻',
  'investimentos': '📈',
  'rendimentos': '📊',
  'dividendos': '💰',
  'default': '📌'
};

export function getEmojiCategoria(categoria: string): string {
  const cat = categoria.toLowerCase();
  return EMOJI_CATEGORIA[cat] || EMOJI_CATEGORIA['default'];
}

// ============================================
// EMOJIS POR BANCO/CONTA
// ============================================

export function getEmojiBanco(conta: string): string {
  const contaLower = conta.toLowerCase();
  
  if (contaLower.includes('nubank') || contaLower.includes('roxinho') || contaLower.includes('nu ')) return '💜';
  if (contaLower.includes('itau') || contaLower.includes('itaú') || contaLower.includes('laranjão')) return '🧡';
  if (contaLower.includes('bradesco')) return '❤️';
  if (contaLower.includes('inter') || contaLower.includes('laranjinha')) return '🧡';
  if (contaLower.includes('caixa') || contaLower.includes('cef')) return '💙';
  if (contaLower.includes('santander')) return '❤️';
  if (contaLower.includes('bb') || contaLower.includes('brasil') || contaLower.includes('banco do brasil')) return '💛';
  if (contaLower.includes('c6')) return '🖤';
  if (contaLower.includes('picpay')) return '💚';
  if (contaLower.includes('mercado') || contaLower.includes('mp')) return '💙';
  if (contaLower.includes('carteira') || contaLower.includes('dinheiro') || contaLower.includes('espécie')) return '💵';
  if (contaLower.includes('poupança') || contaLower.includes('poupanca')) return '🐷';
  if (contaLower.includes('investimento')) return '📈';
  if (contaLower.includes('credito') || contaLower.includes('crédito') || contaLower.includes('cartão')) return '💳';
  
  return '🏦';
}

// ============================================
// VARIAÇÕES DE RESPOSTAS (Anti-robótico)
// ============================================

export const VARIACOES = {
  confirmacao_despesa: [
    'Anotado! ✅',
    'Registrado! 📝',
    'Feito! ✅',
    'Beleza! 👍',
    'Pronto! ✅',
    'Certo! 📝',
    'Ok! ✅'
  ],
  confirmacao_receita: [
    'Ótimo! 💰',
    'Que bom! 🎉',
    'Excelente! 💪',
    'Maravilha! ✨',
    'Show! 🎉',
    'Boa! 💰',
    'Legal! 🎉'
  ],
  saudacao_primeira_vez: [
    '{saudacao}, {nome}! {emoji}',
    '{emoji} {saudacao}, {nome}!',
    'Oi, {nome}! {saudacao}! {emoji}'
  ],
  saudacao_retorno: [
    'Oi, {nome}!',
    'Olá, {nome}!',
    'E aí, {nome}!',
    'Opa, {nome}!',
    'Fala, {nome}!',
    'Oi de novo, {nome}!'
  ],
  despedida: [
    'Qualquer coisa, é só chamar! 😊',
    'Estou por aqui se precisar! 💜',
    'Conte comigo! 🙋🏻‍♀️',
    'Até mais! 👋',
    'Se precisar, me chama! 😊',
    'Tô aqui! 💜'
  ],
  agradecimento: [
    'De nada, {nome}! Conte sempre comigo, se precisar de mais alguma coisa, é só me chamar! 🙋🏻‍♀️',
    'Imagina! Tô aqui pra isso mesmo, {nome}. Se precisar, é só me chamar! 💜',
    'Por nada, {nome}! Sempre que precisar, estarei por aqui! 🙋🏻‍♀️',
    'Fico feliz em ajudar! Conte comigo sempre, {nome}! 💜',
    'Que isso! É um prazer ajudar você, {nome}. Qualquer coisa, me chama! 🙋🏻‍♀️'
  ],
  pergunta_engajamento: [
    'Posso ajudar em mais alguma coisa?',
    'Precisa de algo mais?',
    'Quer registrar mais alguma coisa?',
    'Algo mais que eu possa fazer?',
    'No que mais posso ajudar?',
    'Mais alguma coisa?'
  ]
};

/**
 * Retorna variação aleatória substituindo placeholders
 */
export function getVariacao(
  tipo: keyof typeof VARIACOES, 
  dados?: { nome?: string; saudacao?: string; emoji?: string }
): string {
  const opcoes = VARIACOES[tipo];
  let escolhida = opcoes[Math.floor(Math.random() * opcoes.length)];
  
  if (dados) {
    if (dados.nome) escolhida = escolhida.replace(/{nome}/g, dados.nome);
    if (dados.saudacao) escolhida = escolhida.replace(/{saudacao}/g, dados.saudacao);
    if (dados.emoji) escolhida = escolhida.replace(/{emoji}/g, dados.emoji);
  }
  
  // Limpar placeholders não substituídos
  escolhida = escolhida.replace(/, {nome}/g, '').replace(/{nome}/g, '');
  
  return escolhida;
}

// ============================================
// VERIFICAR PRIMEIRA INTERAÇÃO DO DIA
// ============================================

export function isPrimeiraInteracaoDia(ultimaInteracao: Date | null): boolean {
  if (!ultimaInteracao) return true;
  
  const agora = new Date();
  const hoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const ultimoDia = ultimaInteracao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  return hoje !== ultimoDia;
}

// ============================================
// GERAR ASSINATURA
// ============================================

export function getAssinatura(): string {
  return `\n\n_${IDENTIDADE.nome} • Personal Finance_ ${IDENTIDADE.emoji}`;
}

// ============================================
// FORMATADORES
// ============================================

export function formatarValor(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
