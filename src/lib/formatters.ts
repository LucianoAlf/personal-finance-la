// src/lib/formatters.ts
// Funções utilitárias para formatação de valores com base nas preferências do usuário

/**
 * Formata valor monetário de acordo com a moeda e locale
 * @param value - Valor numérico a ser formatado
 * @param currency - Código da moeda (BRL, USD, EUR)
 * @param locale - Locale para formatação (pt-BR, en-US, es-ES)
 * @returns String formatada com símbolo da moeda
 */
export function formatCurrency(
  value: number | string,
  currency: string = 'BRL',
  locale: string = 'pt-BR'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return 'R$ 0,00';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${numValue.toFixed(2)}`;
  }
}

function toDateObject(date: Date | string | number): Date {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00`);
  }

  return new Date(date);
}

function getZonedParts(date: Date, locale: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const mapped = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    hour: mapped.hour,
    minute: mapped.minute,
    second: mapped.second,
  };
}

function getZonedDateEpoch(date: Date, locale: string, timezone: string) {
  const parts = getZonedParts(date, locale, timezone);
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

/**
 * Formata data de acordo com o formato e locale especificados
 * @param date - Data a ser formatada (Date, string ou timestamp)
 * @param format - Formato desejado (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 * @param locale - Locale para formatação (pt-BR, en-US, es-ES)
 * @returns String formatada com a data
 */
export function formatDate(
  date: Date | string | number,
  format: string = 'DD/MM/YYYY',
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo'
): string {
  const dateObj = toDateObject(date);

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  const { day, month, year } = getZonedParts(dateObj, locale, timezone);

  // Formatos customizados
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      // Fallback para formatação do Intl
      try {
        return new Intl.DateTimeFormat(locale).format(dateObj);
      } catch (error) {
        console.error('Error formatting date:', error);
        return `${day}/${month}/${year}`;
      }
  }
}

/**
 * Formata data de forma relativa (ex: "há 2 dias", "ontem", "hoje")
 * @param date - Data a ser formatada
 * @param locale - Locale para formatação
 * @returns String formatada relativamente
 */
export function formatRelativeDate(
  date: Date | string | number,
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo'
): string {
  const dateObj = toDateObject(date);

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  const now = new Date();
  const todayEpoch = getZonedDateEpoch(now, locale, timezone);
  const dateEpoch = getZonedDateEpoch(dateObj, locale, timezone);
  const diffDays = Math.round((todayEpoch - dateEpoch) / (1000 * 60 * 60 * 24));

  if (locale === 'pt-BR') {
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'Há 1 semana' : `Há ${weeks} semanas`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Há 1 mês' : `Há ${months} meses`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Há 1 ano' : `Há ${years} anos`;
  } else if (locale === 'en-US') {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } else {
    // Fallback para español
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
  }
}

/**
 * Formata número de acordo com o locale
 * @param value - Número a ser formatado
 * @param locale - Locale para formatação (pt-BR, en-US, es-ES)
 * @param decimals - Número de casas decimais (padrão: 2)
 * @returns String formatada com o número
 */
export function formatNumber(
  value: number | string,
  locale: string = 'pt-BR',
  decimals: number = 2
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  } catch (error) {
    console.error('Error formatting number:', error);
    return numValue.toFixed(decimals);
  }
}

/**
 * Formata percentual
 * @param value - Valor do percentual (0-100 ou 0-1)
 * @param locale - Locale para formatação
 * @param isDecimal - Se o valor está em formato decimal (0-1) ou percentual (0-100)
 * @returns String formatada com o percentual
 */
export function formatPercentage(
  value: number,
  locale: string = 'pt-BR',
  isDecimal: boolean = false
): string {
  const percentValue = isDecimal ? value * 100 : value;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(isDecimal ? value : value / 100);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${percentValue.toFixed(2)}%`;
  }
}

/**
 * Formata número compacto (ex: 1.5K, 2.3M)
 * @param value - Número a ser formatado
 * @param locale - Locale para formatação
 * @returns String formatada de forma compacta
 */
export function formatCompactNumber(
  value: number,
  locale: string = 'pt-BR'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  } catch (error) {
    // Fallback manual
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
}

/**
 * Formata horário
 * @param date - Data/hora a ser formatada
 * @param locale - Locale para formatação
 * @param includeSeconds - Se deve incluir segundos
 * @returns String formatada com o horário
 */
export function formatTime(
  date: Date | string | number,
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo',
  includeSeconds: boolean = false
): string {
  const dateObj = toDateObject(date);

  if (isNaN(dateObj.getTime())) {
    return 'Hora inválida';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting time:', error);
    const { hour, minute, second } = getZonedParts(dateObj, locale, timezone);
    if (includeSeconds) {
      return `${hour}:${minute}:${second}`;
    }
    return `${hour}:${minute}`;
  }
}

/**
 * Formata data e hora completas
 * @param date - Data/hora a ser formatada
 * @param dateFormat - Formato da data
 * @param locale - Locale para formatação
 * @returns String formatada com data e hora
 */
export function formatDateTime(
  date: Date | string | number,
  dateFormat: string = 'DD/MM/YYYY',
  locale: string = 'pt-BR',
  timezone: string = 'America/Sao_Paulo'
): string {
  const formattedDate = formatDate(date, dateFormat, locale, timezone);
  const formattedTime = formatTime(date, locale, timezone, false);
  return `${formattedDate} ${formattedTime}`;
}
