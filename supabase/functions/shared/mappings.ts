/**
 * MAPEAMENTOS CENTRALIZADOS - Personal Finance LA
 * 
 * IMPORTANTE: Este é o ÚNICO local onde mapeamentos devem ser definidos.
 * Todos os outros arquivos DEVEM importar deste arquivo.
 * 
 * Última atualização: 08/12/2025
 * Versão: 1.0.0
 */

// ============================================
// 1. CATEGORIAS - Palavras-chave → Categoria
// ============================================

export const CATEGORIA_KEYWORDS: Record<string, string> = {
  // 🚗 Transporte
  'uber': 'Transporte',
  '99': 'Transporte',
  'taxi': 'Transporte',
  'gasolina': 'Transporte',
  'combustivel': 'Transporte',
  'combustível': 'Transporte',
  'estacionamento': 'Transporte',
  'pedagio': 'Transporte',
  'pedágio': 'Transporte',
  'abasteci': 'Transporte',
  'abastecimento': 'Transporte',
  'abastecer': 'Transporte',
  'posto': 'Transporte',
  'etanol': 'Transporte',
  'alcool': 'Transporte',
  'álcool': 'Transporte',
  'diesel': 'Transporte',
  'onibus': 'Transporte',
  'ônibus': 'Transporte',
  'metro': 'Transporte',
  'metrô': 'Transporte',
  'passagem': 'Transporte',
  'carro': 'Transporte',
  'moto': 'Transporte',
  'oficina': 'Transporte',
  'mecanico': 'Transporte',
  'mecânico': 'Transporte',
  'ipva': 'Transporte',
  'licenciamento': 'Transporte',
  'multa': 'Transporte',
  
  // 🍔 Alimentação
  'mercado': 'Alimentação',
  'supermercado': 'Alimentação',
  'ifood': 'Alimentação',
  'rappi': 'Alimentação',
  'restaurante': 'Alimentação',
  'lanche': 'Alimentação',
  'almoco': 'Alimentação',
  'almoço': 'Alimentação',
  'jantar': 'Alimentação',
  'cafe': 'Alimentação',
  'café': 'Alimentação',
  'padaria': 'Alimentação',
  'acougue': 'Alimentação',
  'açougue': 'Alimentação',
  'feira': 'Alimentação',
  'hortifruti': 'Alimentação',
  'delivery': 'Alimentação',
  'pizza': 'Alimentação',
  'hamburguer': 'Alimentação',
  'hambúrguer': 'Alimentação',
  'comida': 'Alimentação',
  'refeicao': 'Alimentação',
  'refeição': 'Alimentação',
  
  // 🏠 Moradia
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
  'wifi': 'Moradia',
  'iptu': 'Moradia',
  'seguro residencial': 'Moradia',
  'manutencao': 'Moradia',
  'manutenção': 'Moradia',
  'reforma': 'Moradia',
  'pintura': 'Moradia',
  'eletricista': 'Moradia',
  'encanador': 'Moradia',
  'faxina': 'Moradia',
  'diarista': 'Moradia',
  // 🔌 Eletrodomésticos
  'purificador': 'Eletrodomésticos',
  'ar condicionado': 'Eletrodomésticos',
  'geladeira': 'Eletrodomésticos',
  'fogao': 'Eletrodomésticos',
  'fogão': 'Eletrodomésticos',
  'microondas': 'Eletrodomésticos',
  'maquina de lavar': 'Eletrodomésticos',
  'máquina de lavar': 'Eletrodomésticos',
  'aspirador': 'Eletrodomésticos',
  'ventilador': 'Eletrodomésticos',
  'liquidificador': 'Eletrodomésticos',
  'cafeteira': 'Eletrodomésticos',
  'eletrodomestico': 'Eletrodomésticos',
  'eletrodoméstico': 'Eletrodomésticos',
  'tv': 'Eletrodomésticos',
  'televisao': 'Eletrodomésticos',
  'televisão': 'Eletrodomésticos',
  'smart tv': 'Eletrodomésticos',
  'secadora': 'Eletrodomésticos',
  'lava loucas': 'Eletrodomésticos',
  'lava louças': 'Eletrodomésticos',
  'forno': 'Eletrodomésticos',
  'cooktop': 'Eletrodomésticos',
  'fritadeira': 'Eletrodomésticos',
  'airfryer': 'Eletrodomésticos',
  
  // Móveis e decoração (continua em Moradia)
  'moveis': 'Moradia',
  'móveis': 'Moradia',
  'sofa': 'Moradia',
  'sofá': 'Moradia',
  'cama': 'Moradia',
  'colchao': 'Moradia',
  'colchão': 'Moradia',
  'cortina': 'Moradia',
  'tapete': 'Moradia',
  'decoracao': 'Moradia',
  'decoração': 'Moradia',
  
  // 🏥 Saúde
  'farmacia': 'Saúde',
  'farmácia': 'Saúde',
  'remedio': 'Saúde',
  'remédio': 'Saúde',
  'medicamento': 'Saúde',
  'medico': 'Saúde',
  'médico': 'Saúde',
  'consulta': 'Saúde',
  'exame': 'Saúde',
  'hospital': 'Saúde',
  'clinica': 'Saúde',
  'clínica': 'Saúde',
  'dentista': 'Saúde',
  'psicólogo': 'Saúde',
  'psicologo': 'Saúde',
  'terapia': 'Saúde',
  'plano de saude': 'Saúde',
  'plano de saúde': 'Saúde',
  'academia': 'Saúde',
  'pilates': 'Saúde',
  'yoga': 'Saúde',
  'suplemento': 'Saúde',
  
  // 📚 Educação
  'escola': 'Educação',
  'faculdade': 'Educação',
  'universidade': 'Educação',
  'curso': 'Educação',
  'livro': 'Educação',
  'material escolar': 'Educação',
  'mensalidade': 'Educação',
  'matricula': 'Educação',
  'matrícula': 'Educação',
  'apostila': 'Educação',
  'udemy': 'Educação',
  'alura': 'Educação',
  
  // 🎬 Lazer
  'cinema': 'Lazer',
  'teatro': 'Lazer',
  'show': 'Lazer',
  'ingresso': 'Lazer',
  'netflix': 'Lazer',
  'spotify': 'Lazer',
  'amazon prime': 'Lazer',
  'disney': 'Lazer',
  'hbo': 'Lazer',
  'streaming': 'Lazer',
  'jogo': 'Lazer',
  'game': 'Lazer',
  'playstation': 'Lazer',
  'xbox': 'Lazer',
  'bar': 'Lazer',
  'balada': 'Lazer',
  'festa': 'Lazer',
  'churras': 'Lazer',
  'churrasco': 'Lazer',
  
  // 👕 Vestuário
  'roupa': 'Vestuário',
  'camisa': 'Vestuário',
  'calca': 'Vestuário',
  'calça': 'Vestuário',
  'sapato': 'Vestuário',
  'tenis': 'Vestuário',
  'tênis': 'Vestuário',
  'loja': 'Vestuário',
  'shopping': 'Vestuário',
  'renner': 'Vestuário',
  'riachuelo': 'Vestuário',
  'cea': 'Vestuário',
  'c&a': 'Vestuário',
  'zara': 'Vestuário',
  
  // 💄 Beleza
  'salao': 'Beleza',
  'salão': 'Beleza',
  'cabelo': 'Beleza',
  'corte': 'Beleza',
  'manicure': 'Beleza',
  'pedicure': 'Beleza',
  'estetica': 'Beleza',
  'estética': 'Beleza',
  'maquiagem': 'Beleza',
  'perfume': 'Beleza',
  'cosmetico': 'Beleza',
  'cosmético': 'Beleza',
  'barbearia': 'Beleza',
  
  // 🐕 Pets
  'pet': 'Pets',
  'veterinario': 'Pets',
  'veterinário': 'Pets',
  'racao': 'Pets',
  'ração': 'Pets',
  'petshop': 'Pets',
  'pet shop': 'Pets',
  'cachorro': 'Pets',
  'gato': 'Pets',
  'vacina pet': 'Pets',
  
  // 💻 Tecnologia
  'celular': 'Tecnologia',
  'smartphone': 'Tecnologia',
  'computador': 'Tecnologia',
  'notebook': 'Tecnologia',
  'tablet': 'Tecnologia',
  'fone': 'Tecnologia',
  'eletrônico': 'Tecnologia',
  'eletronico': 'Tecnologia',
  'apple': 'Tecnologia',
  'samsung': 'Tecnologia',
  'xiaomi': 'Tecnologia',
  
  // 📄 Assinaturas
  'assinatura': 'Assinaturas',
  'plano': 'Assinaturas',
  'premium': 'Assinaturas',
  'pro': 'Assinaturas',
  
  // ✈️ Viagens
  'viagem': 'Viagens',
  'passagem aerea': 'Viagens',
  'passagem aérea': 'Viagens',
  'hotel': 'Viagens',
  'airbnb': 'Viagens',
  'hospedagem': 'Viagens',
  'mala': 'Viagens',
  'aeroporto': 'Viagens',
  
  // 🏋️ Esportes
  'esporte': 'Esportes',
  'futebol': 'Esportes',
  'corrida': 'Esportes',
  'bicicleta': 'Esportes',
  'bike': 'Esportes',
  'natacao': 'Esportes',
  'natação': 'Esportes',
  
  // 📈 Investimentos
  'investimento': 'Investimentos',
  'acao': 'Investimentos',
  'ação': 'Investimentos',
  'fundo': 'Investimentos',
  'tesouro': 'Investimentos',
  'cdb': 'Investimentos',
  'corretora': 'Investimentos',
  'cripto': 'Investimentos',
  'bitcoin': 'Investimentos',
};

// ============================================
// 2. BANCOS - Aliases → Nome oficial
// ============================================

export interface BancoConfig {
  nome: string;
  aliases: string[];
  cor: string;
  emoji: string;
}

export const BANCO_CONFIGS: BancoConfig[] = [
  {
    nome: 'nubank',
    aliases: ['nubank', 'roxinho', 'roxo', 'nu', 'nubanck'],
    cor: '#8B5CF6',
    emoji: '💜'
  },
  {
    nome: 'itau',
    aliases: ['itau', 'itaú', 'laranjinha', 'itaú unibanco', 'itau unibanco'],
    cor: '#FF6600',
    emoji: '🧡'
  },
  {
    nome: 'bradesco',
    aliases: ['bradesco', 'brades', 'brad'],
    cor: '#CC092F',
    emoji: '❤️'
  },
  {
    nome: 'santander',
    aliases: ['santander', 'santan', 'sant'],
    cor: '#EC0000',
    emoji: '🔴'
  },
  {
    nome: 'banco do brasil',
    aliases: ['banco do brasil', 'bb', 'brasil'],
    cor: '#FFCC00',
    emoji: '💛'
  },
  {
    nome: 'caixa',
    aliases: ['caixa', 'caixa economica', 'caixa econômica', 'cef'],
    cor: '#0066CC',
    emoji: '💙'
  },
  {
    nome: 'inter',
    aliases: ['inter', 'banco inter', 'laranja'],
    cor: '#FF7A00',
    emoji: '🟠'
  },
  {
    nome: 'c6',
    aliases: ['c6', 'c6 bank', 'c6bank'],
    cor: '#1A1A1A',
    emoji: '⬛'
  },
  {
    nome: 'picpay',
    aliases: ['picpay', 'pic pay', 'pic'],
    cor: '#21C25E',
    emoji: '💚'
  },
  {
    nome: 'will',
    aliases: ['will', 'will bank', 'willbank'],
    cor: '#FFD700',
    emoji: '⭐'
  },
  {
    nome: 'pagbank',
    aliases: ['pagbank', 'pagseguro', 'pag'],
    cor: '#00A859',
    emoji: '💵'
  },
  {
    nome: 'neon',
    aliases: ['neon', 'banco neon'],
    cor: '#00D4FF',
    emoji: '🩵'
  },
  {
    nome: 'next',
    aliases: ['next', 'banco next'],
    cor: '#00FF00',
    emoji: '💚'
  },
  {
    nome: 'original',
    aliases: ['original', 'banco original'],
    cor: '#00A651',
    emoji: '💚'
  },
  {
    nome: 'btg',
    aliases: ['btg', 'btg pactual'],
    cor: '#001E62',
    emoji: '🔵'
  },
  {
    nome: 'xp',
    aliases: ['xp', 'xp investimentos'],
    cor: '#000000',
    emoji: '⚫'
  },
  {
    nome: 'rico',
    aliases: ['rico', 'rico investimentos'],
    cor: '#FF6600',
    emoji: '🟠'
  },
  {
    nome: 'clear',
    aliases: ['clear', 'clear corretora'],
    cor: '#00B4D8',
    emoji: '🔵'
  },
  {
    nome: 'mercado pago',
    aliases: ['mercado pago', 'mp', 'meli'],
    cor: '#00B1EA',
    emoji: '💙'
  },
  {
    nome: 'ame',
    aliases: ['ame', 'ame digital'],
    cor: '#E91E63',
    emoji: '💗'
  }
];

// Helper: Mapa de alias → nome oficial
export const BANCO_ALIAS_TO_NOME: Record<string, string> = {};
BANCO_CONFIGS.forEach(banco => {
  banco.aliases.forEach(alias => {
    BANCO_ALIAS_TO_NOME[alias.toLowerCase()] = banco.nome;
  });
});

// ============================================
// 3. FORMAS DE PAGAMENTO
// ============================================

export interface PagamentoConfig {
  id: string;
  label: string;
  aliases: string[];
  emoji: string;
  requerConta: boolean;
}

export const PAGAMENTO_CONFIGS: PagamentoConfig[] = [
  {
    id: 'credit',
    label: 'Cartão de Crédito',
    aliases: ['credito', 'crédito', 'cartao', 'cartão', 'cartao de credito', 'cartão de crédito', 'credit', 'cc'],
    emoji: '💳',
    requerConta: false
  },
  {
    id: 'debit',
    label: 'Cartão de Débito',
    aliases: ['debito', 'débito', 'cartao de debito', 'cartão de débito', 'debit'],
    emoji: '💳',
    requerConta: true
  },
  {
    id: 'pix',
    label: 'PIX',
    aliases: ['pix'],
    emoji: '📲',
    requerConta: true
  },
  {
    id: 'cash',
    label: 'Dinheiro',
    aliases: ['dinheiro', 'cash', 'especie', 'espécie', 'em maos', 'em mãos'],
    emoji: '💵',
    requerConta: true
  },
  {
    id: 'transfer',
    label: 'Transferência',
    aliases: ['transferencia', 'transferência', 'ted', 'doc'],
    emoji: '🏦',
    requerConta: true
  },
  {
    id: 'boleto',
    label: 'Boleto',
    aliases: ['boleto', 'boleto bancario', 'boleto bancário'],
    emoji: '📄',
    requerConta: true
  }
];

// Helper: Mapa de alias → id
export const PAGAMENTO_ALIAS_TO_ID: Record<string, string> = {};
PAGAMENTO_CONFIGS.forEach(pagamento => {
  pagamento.aliases.forEach(alias => {
    PAGAMENTO_ALIAS_TO_ID[alias.toLowerCase()] = pagamento.id;
  });
});

// ============================================
// 4. CATEGORIAS NLP (inglês → português)
// ============================================

export const NLP_CATEGORIA_MAP: Record<string, string> = {
  'transport': 'Transporte',
  'transportation': 'Transporte',
  'food': 'Alimentação',
  'groceries': 'Alimentação',
  'housing': 'Moradia',
  'home': 'Moradia',
  'health': 'Saúde',
  'healthcare': 'Saúde',
  'education': 'Educação',
  'entertainment': 'Lazer',
  'leisure': 'Lazer',
  'clothing': 'Vestuário',
  'clothes': 'Vestuário',
  'beauty': 'Beleza',
  'pets': 'Pets',
  'technology': 'Tecnologia',
  'tech': 'Tecnologia',
  'subscriptions': 'Assinaturas',
  'travel': 'Viagens',
  'sports': 'Esportes',
  'investments': 'Investimentos',
  'other': 'Outros',
  'others': 'Outros',
  'transporte': 'Transporte',
  'alimentação': 'Alimentação',
  'alimentacao': 'Alimentação',
  'moradia': 'Moradia',
  'saúde': 'Saúde',
  'saude': 'Saúde',
  'educação': 'Educação',
  'educacao': 'Educação',
  'lazer': 'Lazer',
  'vestuário': 'Vestuário',
  'vestuario': 'Vestuário',
  'beleza': 'Beleza',
  'tecnologia': 'Tecnologia',
  'assinaturas': 'Assinaturas',
  'viagens': 'Viagens',
  'esportes': 'Esportes',
  'investimentos': 'Investimentos',
  'outros': 'Outros',
};

// ============================================
// 5. FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Detecta categoria por palavra-chave no texto
 */
export function detectarCategoriaPorPalavraChave(texto: string): string | null {
  if (!texto) return null;
  
  const textoNormalizado = texto.toLowerCase();
  
  for (const [palavra, categoria] of Object.entries(CATEGORIA_KEYWORDS)) {
    if (textoNormalizado.includes(palavra)) {
      return categoria;
    }
  }
  
  return null;
}

/**
 * Detecta banco por alias no texto
 */
export function detectarBancoPorAlias(texto: string): string | null {
  if (!texto) return null;
  
  const textoNormalizado = texto.toLowerCase();
  
  for (const banco of BANCO_CONFIGS) {
    for (const alias of banco.aliases) {
      if (textoNormalizado.includes(alias)) {
        return banco.nome;
      }
    }
  }
  
  return null;
}

/**
 * Detecta forma de pagamento por alias no texto
 */
export function detectarPagamentoPorAlias(texto: string): PagamentoConfig | null {
  if (!texto) return null;
  
  const textoNormalizado = texto.toLowerCase();
  
  for (const pagamento of PAGAMENTO_CONFIGS) {
    for (const alias of pagamento.aliases) {
      if (textoNormalizado.includes(alias)) {
        return pagamento;
      }
    }
  }
  
  return null;
}

/**
 * Normaliza categoria do NLP para português
 */
export function normalizarCategoriaNLP(categoriaNLP: string): string {
  if (!categoriaNLP) return 'Outros';
  
  const normalizada = categoriaNLP.toLowerCase().trim();
  return NLP_CATEGORIA_MAP[normalizada] || 'Outros';
}

/**
 * Busca config completa do banco pelo nome ou alias
 */
export function getBancoConfig(nomeOuAlias: string): BancoConfig | null {
  if (!nomeOuAlias) return null;
  
  const normalizado = nomeOuAlias.toLowerCase();
  
  return BANCO_CONFIGS.find(banco => 
    banco.nome === normalizado || banco.aliases.includes(normalizado)
  ) || null;
}

/**
 * Busca config completa do pagamento pelo id ou alias
 */
export function getPagamentoConfig(idOuAlias: string): PagamentoConfig | null {
  if (!idOuAlias) return null;
  
  const normalizado = idOuAlias.toLowerCase();
  
  return PAGAMENTO_CONFIGS.find(pagamento => 
    pagamento.id === normalizado || pagamento.aliases.includes(normalizado)
  ) || null;
}

// ============================================
// 6. CONSTANTES ADICIONAIS
// ============================================

export const CATEGORIAS_VALIDAS = [
  'Transporte',
  'Alimentação',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Beleza',
  'Pets',
  'Tecnologia',
  'Assinaturas',
  'Viagens',
  'Esportes',
  'Investimentos',
  'Outros'
];

export const CATEGORIA_PADRAO = 'Outros';
export const CONTEXT_TIMEOUT_MINUTES = 60;
