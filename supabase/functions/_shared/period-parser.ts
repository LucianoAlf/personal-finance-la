// ============================================
// 📅 PERIOD PARSER - Parser de Períodos em Linguagem Natural
// ============================================
// Converte frases como "esse mês", "semana passada" em ranges de datas

export interface Period {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  label: string; // "esse mês", "semana passada", etc.
}

/**
 * Formata uma data para YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Subtrai dias de uma data
 */
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Subtrai meses de uma data
 */
function subMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * Retorna o início da semana (domingo)
 */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 0 : day; // Domingo = 0
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Retorna o fim da semana (sábado)
 */
function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Retorna o início do mês
 */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Retorna o fim do mês
 */
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Parseia um nome de mês (ex: "outubro", "novembro")
 */
function parseNamedMonth(monthName: string, year?: number): Period {
  const months: Record<string, number> = {
    'janeiro': 0,
    'fevereiro': 1,
    'março': 2,
    'marco': 2, // Sem acento
    'abril': 3,
    'maio': 4,
    'junho': 5,
    'julho': 6,
    'agosto': 7,
    'setembro': 8,
    'outubro': 9,
    'novembro': 10,
    'dezembro': 11,
  };

  const monthIndex = months[monthName.toLowerCase()];
  if (monthIndex === undefined) {
    throw new Error(`Mês inválido: ${monthName}`);
  }

  const currentYear = year || new Date().getFullYear();
  const start = new Date(currentYear, monthIndex, 1);
  const end = new Date(currentYear, monthIndex + 1, 0);

  return {
    start: formatDate(start),
    end: formatDate(end),
    label: monthName,
  };
}

/**
 * Parseia uma string de período em linguagem natural
 * Exemplos: "hoje", "ontem", "essa semana", "semana passada", 
 *           "esse mês", "mês passado", "outubro", "últimos 7 dias"
 */
export function parsePeriod(input: string): Period {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zerar horas para comparações exatas
  
  const lowerInput = input.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos para matching

  // ============================================
  // PADRÕES SIMPLES
  // ============================================

  // HOJE
  if (lowerInput.includes('hoje')) {
    return {
      start: formatDate(today),
      end: formatDate(today),
      label: 'hoje',
    };
  }

  // ONTEM
  if (lowerInput.includes('ontem')) {
    const yesterday = subDays(today, 1);
    return {
      start: formatDate(yesterday),
      end: formatDate(yesterday),
      label: 'ontem',
    };
  }

  // ESSA SEMANA
  if (lowerInput.match(/essa?\s+semana/)) {
    return {
      start: formatDate(startOfWeek(today)),
      end: formatDate(today),
      label: 'essa semana',
    };
  }

  // SEMANA PASSADA
  if (lowerInput.match(/semana\s+passada/)) {
    const lastWeek = subDays(today, 7);
    return {
      start: formatDate(startOfWeek(lastWeek)),
      end: formatDate(endOfWeek(lastWeek)),
      label: 'semana passada',
    };
  }

  // ESSE MÊS
  if (lowerInput.match(/ess[ea]\s+m[eê]s/)) {
    return {
      start: formatDate(startOfMonth(today)),
      end: formatDate(today),
      label: 'esse mês',
    };
  }

  // MÊS PASSADO
  if (lowerInput.match(/m[eê]s\s+passado/)) {
    const lastMonth = subMonths(today, 1);
    return {
      start: formatDate(startOfMonth(lastMonth)),
      end: formatDate(endOfMonth(lastMonth)),
      label: 'mês passado',
    };
  }

  // ============================================
  // PADRÕES AVANÇADOS
  // ============================================

  // ÚLTIMOS X DIAS
  const daysMatch = lowerInput.match(/ultimos?\s+(\d+)\s+dias?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return {
      start: formatDate(subDays(today, days)),
      end: formatDate(today),
      label: `últimos ${days} dias`,
    };
  }

  // MÊS ESPECÍFICO (janeiro, fevereiro, etc)
  const monthMatch = lowerInput.match(/janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/);
  if (monthMatch) {
    return parseNamedMonth(monthMatch[0]);
  }

  // ============================================
  // DEFAULT: ESSE MÊS
  // ============================================
  console.log(`⚠️ Período não reconhecido: "${input}", usando "esse mês" como padrão`);
  return {
    start: formatDate(startOfMonth(today)),
    end: formatDate(today),
    label: 'esse mês (padrão)',
  };
}

/**
 * Formata um valor monetário
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}
