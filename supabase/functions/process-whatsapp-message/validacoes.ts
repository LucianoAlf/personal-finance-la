// ============================================
// VALIDAÇÕES INTELIGENTES PARA CONTAS A PAGAR
// ============================================

// Limites máximos realistas por categoria
export const LIMITES_VALOR_POR_TIPO: Record<string, { max: number; alerta: number; nome: string }> = {
  // Assinaturas digitais - raramente passam de R$ 200
  'subscription': { max: 500, alerta: 200, nome: 'assinatura' },
  
  // Serviços variáveis (luz, água, gás)
  'service': { max: 2000, alerta: 800, nome: 'conta de serviço' },
  'utilities': { max: 2000, alerta: 800, nome: 'conta de consumo' },
  'variable': { max: 2000, alerta: 800, nome: 'conta variável' },
  
  // Telecomunicações (internet, celular)
  'telecom': { max: 1000, alerta: 500, nome: 'telecomunicação' },
  
  // Moradia (aluguel, condomínio)
  'housing': { max: 50000, alerta: 15000, nome: 'moradia' },
  
  // Saúde (plano de saúde)
  'healthcare': { max: 10000, alerta: 5000, nome: 'saúde' },
  
  // Educação (escola, faculdade)
  'education': { max: 20000, alerta: 8000, nome: 'educação' },
  
  // Seguros
  'insurance': { max: 5000, alerta: 2000, nome: 'seguro' },
  
  // Impostos (IPVA, IPTU)
  'tax': { max: 50000, alerta: 15000, nome: 'imposto' },
  
  // Empréstimos/Financiamentos (parcelas)
  'loan': { max: 20000, alerta: 5000, nome: 'empréstimo/financiamento' },
  
  // Parcelamentos genéricos
  'installment': { max: 20000, alerta: 5000, nome: 'parcelamento' },
  
  // Cartão de crédito (fatura)
  'credit_card': { max: 100000, alerta: 30000, nome: 'fatura de cartão' },
  
  // Alimentação
  'food': { max: 5000, alerta: 2000, nome: 'alimentação' },
  
  // Contas fixas genéricas
  'fixed': { max: 10000, alerta: 3000, nome: 'conta fixa' },
  
  // Outros/Desconhecido - limite moderado
  'other': { max: 10000, alerta: 3000, nome: 'conta' },
  'unknown': { max: 10000, alerta: 3000, nome: 'conta' },
  'one_time': { max: 50000, alerta: 10000, nome: 'conta avulsa' }
};

// Limite absoluto (nenhuma conta pode passar disso)
export const LIMITE_ABSOLUTO = 500000; // R$ 500.000

// ============================================
// TIPOS
// ============================================

export interface ValidacaoValor {
  valido: boolean;
  tipo: 'ok' | 'negativo' | 'zero' | 'muito_alto' | 'alerta' | 'absurdo';
  mensagem?: string;
  limiteMax?: number;
}

export interface ValidacaoData {
  valido: boolean;
  tipo: 'ok' | 'dia_invalido' | 'passado' | 'muito_futuro' | 'formato_invalido';
  mensagem?: string;
  dataCorrigida?: string;
}

export interface ValidacaoDescricao {
  valido: boolean;
  tipo: 'ok' | 'vazia' | 'muito_curta' | 'muito_longa' | 'caracteres_invalidos' | 'so_numeros';
  mensagem?: string;
  descricaoLimpa?: string;
}

export interface ValidacaoParcelas {
  valido: boolean;
  tipo: 'ok' | 'atual_maior_total' | 'zero_parcelas' | 'negativo' | 'muito_parcelas';
  mensagem?: string;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função auxiliar para verificar se texto contém valor negativo
export function textoContemValorNegativo(texto: string): boolean {
  // Verifica padrões como "-50", "- 50", "-R$50", "- R$ 50"
  return /(?:^|\s)-\s*(?:r?\$?\s*)?\d/.test(texto.toLowerCase());
}

export function formatarValorBR(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatarValorCurto(valor: number): string {
  if (valor >= 1000000) {
    return `${(valor / 1000000).toFixed(1).replace('.', ',')} milhões`;
  }
  if (valor >= 1000) {
    return `${(valor / 1000).toFixed(0)} mil`;
  }
  return formatarValorBR(valor);
}

// ============================================
// VALIDAÇÃO DE VALOR
// ============================================

export function validarValor(valor: number, tipoContaDetectado?: string, descricao?: string): ValidacaoValor {
  const descricaoTexto = descricao ? ` da *${descricao}*` : '';
  
  // 1. Valor negativo
  if (valor < 0) {
    return {
      valido: false,
      tipo: 'negativo',
      mensagem: `❌ *Ops!* O valor não pode ser negativo.\n\n💰 Qual o valor correto${descricaoTexto}?`
    };
  }
  
  // 2. Valor zero
  if (valor === 0) {
    return {
      valido: false,
      tipo: 'zero',
      mensagem: undefined // Não é erro, só não informou - vai perguntar normalmente
    };
  }
  
  // 3. Valor absurdamente alto (qualquer tipo)
  if (valor > LIMITE_ABSOLUTO) {
    return {
      valido: false,
      tipo: 'absurdo',
      mensagem: `❌ *Ops!* R$ ${formatarValorCurto(valor)} parece um valor incorreto.\n\n💰 Qual o valor correto${descricaoTexto}?\n\n_Verifique se não digitou números a mais_`
    };
  }
  
  // 4. Verificar limite por tipo
  const tipo = tipoContaDetectado || 'unknown';
  const limites = LIMITES_VALOR_POR_TIPO[tipo] || LIMITES_VALOR_POR_TIPO['unknown'];
  
  // Valor acima do máximo para o tipo
  if (valor > limites.max) {
    return {
      valido: false,
      tipo: 'muito_alto',
      mensagem: `❌ *Ops!* R$ ${formatarValorBR(valor)} parece alto demais para ${limites.nome}.\n\n💰 Qual o valor correto${descricaoTexto}?\n\n_Limite para ${limites.nome}: R$ ${formatarValorBR(limites.max)}_`,
      limiteMax: limites.max
    };
  }
  
  // 5. Valor alto mas aceitável - só alertar (não bloqueia)
  if (valor > limites.alerta) {
    return {
      valido: true, // Aceita, mas alerta
      tipo: 'alerta',
      mensagem: undefined // Processa normalmente
    };
  }
  
  // 6. Tudo OK
  return { valido: true, tipo: 'ok' };
}

// ============================================
// VALIDAÇÃO DE DIA DE VENCIMENTO (só dia 1-31)
// ============================================

export function validarDiaVencimento(dia: number | string): ValidacaoData {
  const diaNum = typeof dia === 'string' ? parseInt(dia) : dia;
  
  // 1. Não é número
  if (isNaN(diaNum)) {
    return {
      valido: false,
      tipo: 'formato_invalido',
      mensagem: '❌ *Ops!* Não entendi o dia.\n\n📅 Qual o dia do vencimento? (1-31)\n\n_Ex: "10", "dia 15", "todo dia 20"_'
    };
  }
  
  // 2. Dia fora do range
  if (diaNum < 1 || diaNum > 31) {
    return {
      valido: false,
      tipo: 'dia_invalido',
      mensagem: `❌ *Ops!* Dia ${diaNum} não existe!\n\n📅 Qual o dia do vencimento? (1-31)`
    };
  }
  
  // 3. Dia 29, 30, 31 - aceitar (sistema trata meses curtos)
  return { valido: true, tipo: 'ok' };
}

// ============================================
// VALIDAÇÃO DE DATA COMPLETA (DD/MM/YYYY)
// ============================================

export interface ValidacaoDataCompleta {
  valido: boolean;
  tipo: 'ok' | 'muito_antiga' | 'passado_recente' | 'muito_futura' | 'ano_absurdo' | 'formato_invalido' | 'mes_invalido' | 'dia_invalido';
  mensagem?: string;
  dataCorrigida?: Date;
  alerta?: string; // Mensagem de alerta (para datas passadas recentes)
}

// Constantes de limites de data
const ANO_MINIMO = 2020;
const ANO_MAXIMO = 2030;
const DIAS_PASSADO_MAXIMO = 365; // 1 ano no passado
const DIAS_FUTURO_MAXIMO = 730; // 2 anos no futuro
const DIAS_PASSADO_ALERTA = 30; // Alertar se passou há menos de 30 dias

/**
 * Parseia uma data no formato brasileiro (DD/MM/YYYY ou DD/MM)
 * Também tenta interpretar formatos invertidos
 */
export function parseDataBrasileira(dataStr: string): Date | null {
  if (!dataStr) return null;
  
  const limpo = dataStr.trim();
  
  // Padrão 1: DD/MM/YYYY ou DD-MM-YYYY
  let match = limpo.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const dia = parseInt(match[1]);
    const mes = parseInt(match[2]);
    const ano = parseInt(match[3]);
    
    // Validar se faz sentido
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return new Date(ano, mes - 1, dia);
    }
    
    // Tentar interpretar como YYYY/MM/DD invertido
    if (parseInt(match[1]) > 31 && parseInt(match[3]) <= 31) {
      const anoInv = parseInt(match[1]);
      const mesInv = parseInt(match[2]);
      const diaInv = parseInt(match[3]);
      if (mesInv >= 1 && mesInv <= 12 && diaInv >= 1 && diaInv <= 31) {
        return new Date(anoInv, mesInv - 1, diaInv);
      }
    }
  }
  
  // Padrão 2: DD/MM (assume ano atual ou próximo)
  match = limpo.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const dia = parseInt(match[1]);
    const mes = parseInt(match[2]);
    
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      const hoje = new Date();
      let ano = hoje.getFullYear();
      
      // Se a data já passou este ano, assume próximo ano
      const dataEsteAno = new Date(ano, mes - 1, dia);
      if (dataEsteAno < hoje) {
        ano++;
      }
      
      return new Date(ano, mes - 1, dia);
    }
  }
  
  // Padrão 3: YYYY/MM/DD (formato invertido)
  match = limpo.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const ano = parseInt(match[1]);
    const mes = parseInt(match[2]);
    const dia = parseInt(match[3]);
    
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return new Date(ano, mes - 1, dia);
    }
  }
  
  return null;
}

/**
 * Formata uma data para exibição no formato brasileiro
 */
export function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Valida uma data completa (DD/MM/YYYY)
 */
export function validarDataCompleta(dataStr: string): ValidacaoDataCompleta {
  const data = parseDataBrasileira(dataStr);
  
  // 1. Formato inválido
  if (!data || isNaN(data.getTime())) {
    return {
      valido: false,
      tipo: 'formato_invalido',
      mensagem: '❌ *Ops!* Não entendi a data.\n\n📅 Informe no formato: "15/03" ou "15/03/2025"'
    };
  }
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  
  // 2. Ano absurdo
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) {
    return {
      valido: false,
      tipo: 'ano_absurdo',
      mensagem: `❌ *Ops!* O ano ${ano} parece incorreto.\n\n📅 Qual a data correta?\n\n_Anos válidos: ${ANO_MINIMO} a ${ANO_MAXIMO}_`
    };
  }
  
  // 3. Mês inválido (já tratado no parse, mas double-check)
  if (mes < 1 || mes > 12) {
    return {
      valido: false,
      tipo: 'mes_invalido',
      mensagem: `❌ *Ops!* Mês ${mes} não existe!\n\n📅 Qual a data correta?`
    };
  }
  
  // 4. Dia inválido para o mês
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > diasNoMes) {
    return {
      valido: false,
      tipo: 'dia_invalido',
      mensagem: `❌ *Ops!* Dia ${dia} não existe em ${mes}/${ano}!\n\n📅 Qual a data correta?`
    };
  }
  
  // Calcular diferença em dias
  const diffMs = data.getTime() - hoje.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 5. Data muito antiga (mais de 1 ano no passado)
  if (diffDias < -DIAS_PASSADO_MAXIMO) {
    const anosAtras = Math.floor(Math.abs(diffDias) / 365);
    return {
      valido: false,
      tipo: 'muito_antiga',
      mensagem: `❌ *Ops!* ${formatarDataBR(data)} foi há ${anosAtras > 1 ? `${anosAtras} anos` : 'mais de 1 ano'}!\n\n📅 Qual a data correta do vencimento?`
    };
  }
  
  // 6. Data muito futura (mais de 2 anos)
  if (diffDias > DIAS_FUTURO_MAXIMO) {
    return {
      valido: false,
      tipo: 'muito_futura',
      mensagem: `❌ *Ops!* ${formatarDataBR(data)} é muito distante (${Math.floor(diffDias / 365)} anos no futuro).\n\n📅 Qual a data correta?`
    };
  }
  
  // 7. Data passada recente (últimos 30 dias) - aceitar com alerta
  if (diffDias < 0 && diffDias >= -DIAS_PASSADO_ALERTA) {
    return {
      valido: true,
      tipo: 'passado_recente',
      dataCorrigida: data,
      alerta: `⚠️ *Atenção:* ${formatarDataBR(data)} já passou. Cadastrando como conta atrasada.`
    };
  }
  
  // 8. Data passada (entre 30 dias e 1 ano) - aceitar com alerta mais forte
  if (diffDias < -DIAS_PASSADO_ALERTA && diffDias >= -DIAS_PASSADO_MAXIMO) {
    const mesesAtras = Math.floor(Math.abs(diffDias) / 30);
    return {
      valido: true,
      tipo: 'passado_recente',
      dataCorrigida: data,
      alerta: `⚠️ *Atenção:* ${formatarDataBR(data)} foi há ${mesesAtras} ${mesesAtras === 1 ? 'mês' : 'meses'}. Cadastrando mesmo assim.`
    };
  }
  
  // 9. Tudo OK
  return {
    valido: true,
    tipo: 'ok',
    dataCorrigida: data
  };
}

/**
 * Extrai e valida data de um texto (pode ser só dia ou data completa)
 */
export function extrairEValidarData(texto: string): ValidacaoDataCompleta {
  const textoLimpo = texto.trim().toLowerCase();
  
  // Tentar extrair data completa primeiro (DD/MM/YYYY ou DD/MM)
  const matchDataCompleta = textoLimpo.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
  if (matchDataCompleta) {
    const dataStr = matchDataCompleta[0];
    return validarDataCompleta(dataStr);
  }
  
  // Se não encontrou data completa, pode ser só dia
  const matchDia = textoLimpo.match(/(?:dia\s*)?(\d{1,2})(?:\s|$)/);
  if (matchDia) {
    const dia = parseInt(matchDia[1]);
    
    // Validar se é um dia válido (1-31)
    if (dia >= 1 && dia <= 31) {
      // Dia simples é sempre válido (sistema calcula próximo vencimento)
      return {
        valido: true,
        tipo: 'ok'
      };
    } else {
      return {
        valido: false,
        tipo: 'dia_invalido',
        mensagem: `❌ *Ops!* Dia ${dia} não existe!\n\n📅 Qual o dia do vencimento? (1-31)`
      };
    }
  }
  
  return {
    valido: false,
    tipo: 'formato_invalido',
    mensagem: '❌ *Ops!* Não entendi a data.\n\n📅 Qual o dia do vencimento?\n\n_Ex: "10", "15/03", "dia 20"_'
  };
}

// ============================================
// VALIDAÇÃO DE DESCRIÇÃO
// ============================================

const CARACTERES_INVALIDOS = /[<>{}[\]\\|`~^]/g;
const MAX_TAMANHO_DESCRICAO = 100;
const MIN_TAMANHO_DESCRICAO = 2;

export function validarDescricao(descricao: string | undefined | null): ValidacaoDescricao {
  
  // 1. Vazia ou só espaços
  if (!descricao || !descricao.trim()) {
    return {
      valido: false,
      tipo: 'vazia',
      mensagem: '🤔 *Não entendi.* Qual conta você quer cadastrar?\n\n_Ex: "Netflix 55 dia 17", "Aluguel 1500 dia 5"_'
    };
  }
  
  const descLimpa = descricao.trim();
  
  // 2. Só números
  if (/^\d+$/.test(descLimpa)) {
    return {
      valido: false,
      tipo: 'so_numeros',
      mensagem: '🤔 *Qual é o nome da conta?*\n\n_Ex: "Netflix", "Luz", "Aluguel"_'
    };
  }
  
  // 3. Muito curta (1 caractere)
  if (descLimpa.length < MIN_TAMANHO_DESCRICAO) {
    return {
      valido: false,
      tipo: 'muito_curta',
      mensagem: `🤔 *"${descLimpa}" é muito curto.* Qual é essa conta?\n\n_Ex: "Netflix", "Luz", "Aluguel"_`
    };
  }
  
  // 4. Muito longa
  if (descLimpa.length > MAX_TAMANHO_DESCRICAO) {
    return {
      valido: false,
      tipo: 'muito_longa',
      mensagem: `❌ *Nome muito longo!* Use no máximo ${MAX_TAMANHO_DESCRICAO} caracteres.\n\n💡 Tente um nome mais curto.`
    };
  }
  
  // 5. Caracteres inválidos
  if (CARACTERES_INVALIDOS.test(descLimpa)) {
    const descricaoLimpa = descLimpa.replace(CARACTERES_INVALIDOS, '').trim();
    
    if (descricaoLimpa.length < MIN_TAMANHO_DESCRICAO) {
      return {
        valido: false,
        tipo: 'caracteres_invalidos',
        mensagem: '❌ *Nome inválido.* Use apenas letras, números e espaços.\n\n_Ex: "Netflix", "Plano de Saúde", "Parcela TV"_'
      };
    }
    
    // Aceita mas limpa os caracteres
    return {
      valido: true,
      tipo: 'ok',
      descricaoLimpa: descricaoLimpa
    };
  }
  
  return {
    valido: true,
    tipo: 'ok',
    descricaoLimpa: descLimpa
  };
}

// ============================================
// VALIDAÇÃO DE PARCELAS
// ============================================

const MAX_PARCELAS = 120; // 10 anos de parcelas mensais

export function validarParcelas(parcelaAtual: number | undefined, totalParcelas: number | undefined): ValidacaoParcelas {
  
  // Se não informou parcelas, não é erro
  if (parcelaAtual === undefined && totalParcelas === undefined) {
    return { valido: true, tipo: 'ok' };
  }
  
  const atual = parcelaAtual || 1;
  const total = totalParcelas || 1;
  
  // 1. Parcelas negativas
  if (atual < 0 || total < 0) {
    return {
      valido: false,
      tipo: 'negativo',
      mensagem: '❌ *Ops!* Número de parcelas não pode ser negativo.\n\n🔢 Qual parcela é essa e de quantas?\n\n_Ex: "3 de 10", "parcela 5 de 12"_'
    };
  }
  
  // 2. Zero parcelas
  if (total === 0) {
    return {
      valido: false,
      tipo: 'zero_parcelas',
      mensagem: '❌ *Ops!* O total de parcelas deve ser pelo menos 1.\n\n🔢 Quantas parcelas são no total?'
    };
  }
  
  // 3. Parcela atual > total
  if (atual > total) {
    return {
      valido: false,
      tipo: 'atual_maior_total',
      mensagem: `❌ *Ops!* A parcela ${atual} não pode ser maior que o total de ${total}.\n\n🔢 Qual parcela é essa e de quantas?`
    };
  }
  
  // 4. Muitas parcelas (suspeito)
  if (total > MAX_PARCELAS) {
    return {
      valido: false,
      tipo: 'muito_parcelas',
      mensagem: `❌ *Ops!* ${total} parcelas parece muito. Máximo: ${MAX_PARCELAS}.\n\n🔢 Quantas parcelas são no total?`
    };
  }
  
  return { valido: true, tipo: 'ok' };
}

// ============================================
// FUNÇÃO PRINCIPAL DE VALIDAÇÃO COMPLETA
// ============================================

export interface ResultadoValidacaoCompleta {
  valido: boolean;
  campo?: 'valor' | 'dia' | 'descricao' | 'parcelas';
  mensagem?: string;
  dados?: {
    descricaoLimpa?: string;
  };
}

export function validarDadosConta(
  valor: number | undefined,
  diaVencimento: number | undefined,
  descricao: string | undefined,
  tipo: string | undefined,
  parcelaAtual?: number,
  totalParcelas?: number
): ResultadoValidacaoCompleta {
  
  // 1. Validar descrição primeiro
  const validacaoDesc = validarDescricao(descricao);
  if (!validacaoDesc.valido) {
    return {
      valido: false,
      campo: 'descricao',
      mensagem: validacaoDesc.mensagem
    };
  }
  
  // 2. Validar valor (se informado)
  if (valor !== undefined && valor !== null) {
    const validacaoValor = validarValor(valor, tipo, validacaoDesc.descricaoLimpa);
    if (!validacaoValor.valido) {
      return {
        valido: false,
        campo: 'valor',
        mensagem: validacaoValor.mensagem,
        dados: { descricaoLimpa: validacaoDesc.descricaoLimpa }
      };
    }
  }
  
  // 3. Validar dia de vencimento (se informado)
  if (diaVencimento !== undefined && diaVencimento !== null) {
    const validacaoDia = validarDiaVencimento(diaVencimento);
    if (!validacaoDia.valido) {
      return {
        valido: false,
        campo: 'dia',
        mensagem: validacaoDia.mensagem,
        dados: { descricaoLimpa: validacaoDesc.descricaoLimpa }
      };
    }
  }
  
  // 4. Validar parcelas (se for parcelamento)
  if (parcelaAtual !== undefined || totalParcelas !== undefined) {
    const validacaoParcelas = validarParcelas(parcelaAtual, totalParcelas);
    if (!validacaoParcelas.valido) {
      return {
        valido: false,
        campo: 'parcelas',
        mensagem: validacaoParcelas.mensagem,
        dados: { descricaoLimpa: validacaoDesc.descricaoLimpa }
      };
    }
  }
  
  // Tudo válido
  return {
    valido: true,
    dados: { descricaoLimpa: validacaoDesc.descricaoLimpa }
  };
}
