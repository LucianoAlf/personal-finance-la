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
  locale: string = 'pt-BR'
): string {
  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

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
  locale: string = 'pt-BR'
): string {
  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // Se for string no formato YYYY-MM-DD, adicionar T12:00:00 para evitar problema de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dateObj = new Date(date + 'T12:00:00');
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }

  const now = new Date();
  
  // Comparar apenas ano, mês e dia (ignorar horário)
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Calcular diferença em dias de forma mais precisa
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const diffTime = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (locale === 'pt-BR') {
    if (isSameDay(dateObj, now)) return 'Hoje';
    if (isSameDay(dateObj, yesterday)) return 'Ontem';
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
  includeSeconds: boolean = false
): string {
  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Hora inválida';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting time:', error);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    if (includeSeconds) {
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
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
  locale: string = 'pt-BR'
): string {
  const formattedDate = formatDate(date, dateFormat, locale);
  const formattedTime = formatTime(date, locale, false);
  return `${formattedDate} ${formattedTime}`;
}
