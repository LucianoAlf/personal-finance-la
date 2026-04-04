// =====================================================
// UTILIDADES DE HORÁRIO DE MERCADO
// =====================================================

export interface MarketHours {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  message: string;
}

/**
 * Feriados B3 2025
 */
const B3_HOLIDAYS_2025 = [
  '2025-01-01', // Ano Novo
  '2025-02-12', // Carnaval
  '2025-02-13', // Carnaval
  '2025-04-18', // Paixão de Cristo
  '2025-04-21', // Tiradentes
  '2025-05-01', // Dia do Trabalho
  '2025-06-19', // Corpus Christi
  '2025-09-07', // Independência
  '2025-10-12', // Nossa Senhora Aparecida
  '2025-11-02', // Finados
  '2025-11-15', // Proclamação da República
  '2025-11-20', // Consciência Negra
  '2025-12-25', // Natal
];

/**
 * Verifica se é feriado B3
 */
export function isB3Holiday(date: Date = new Date()): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return B3_HOLIDAYS_2025.includes(dateStr);
}

/**
 * Verifica se o mercado B3 está aberto
 * Horário: 10:00 - 17:00 (seg-sex, exceto feriados)
 */
export function isB3MarketOpen(now: Date = new Date()): MarketHours {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();

  // Fim de semana
  if (day === 0 || day === 6) {
    const nextMonday = getNextWeekday(now, 1);
    nextMonday.setHours(10, 0, 0, 0);
    return {
      isOpen: false,
      nextOpen: nextMonday,
      message: 'Mercado fechado (fim de semana)',
    };
  }

  // Feriado
  if (isB3Holiday(now)) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextOpen = getNextTradingDay(nextDay);
    nextOpen.setHours(10, 0, 0, 0);
    return {
      isOpen: false,
      nextOpen,
      message: 'Mercado fechado (feriado)',
    };
  }

  // Antes da abertura (antes das 10:00)
  if (hour < 10) {
    const nextOpen = new Date(now);
    nextOpen.setHours(10, 0, 0, 0);
    return {
      isOpen: false,
      nextOpen,
      message: 'Mercado abre às 10:00',
    };
  }

  // Após o fechamento (após 17:00)
  if (hour >= 17) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextOpen = getNextTradingDay(nextDay);
    nextOpen.setHours(10, 0, 0, 0);
    return {
      isOpen: false,
      nextOpen,
      message: 'Mercado fechado (encerrou às 17:00)',
    };
  }

  // Mercado aberto
  const nextClose = new Date(now);
  nextClose.setHours(17, 0, 0, 0);
  return {
    isOpen: true,
    nextClose,
    message: 'Mercado aberto',
  };
}

/**
 * Crypto está sempre aberto (24/7)
 */
export function isCryptoMarketOpen(): MarketHours {
  return {
    isOpen: true,
    message: 'Mercado 24/7',
  };
}

/**
 * Tesouro Direto atualiza 1x por dia (~9:30)
 */
export function isTesouroDiretoOpen(now: Date = new Date()): MarketHours {
  const hour = now.getHours();
  const day = now.getDay();

  // Fim de semana
  if (day === 0 || day === 6) {
    const nextMonday = getNextWeekday(now, 1);
    nextMonday.setHours(9, 30, 0, 0);
    return {
      isOpen: false,
      nextOpen: nextMonday,
      message: 'Atualização na segunda-feira às 9:30',
    };
  }

  // Antes das 9:30
  if (hour < 9 || (hour === 9 && now.getMinutes() < 30)) {
    const nextOpen = new Date(now);
    nextOpen.setHours(9, 30, 0, 0);
    return {
      isOpen: false,
      nextOpen,
      message: 'Atualização às 9:30',
    };
  }

  // Após 9:30
  return {
    isOpen: true,
    message: 'Preços atualizados',
  };
}

/**
 * Calcula TTL do cache baseado no tipo e horário
 */
export function getCacheTTL(type: 'stock' | 'crypto' | 'treasury'): number {
  if (type === 'crypto') {
    return 2 * 60 * 1000; // 2 minutos (24/7)
  }

  if (type === 'treasury') {
    return 24 * 60 * 60 * 1000; // 24 horas (atualiza 1x/dia)
  }

  // Stock/FII
  const market = isB3MarketOpen();
  if (market.isOpen) {
    return 5 * 60 * 1000; // 5 minutos (mercado aberto)
  } else {
    return 60 * 60 * 1000; // 1 hora (mercado fechado)
  }
}

/**
 * Formata tempo até próxima abertura/fechamento
 */
export function formatTimeUntil(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return 'agora';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
}

// ============= HELPERS PRIVADOS =============

function getNextWeekday(date: Date, targetDay: number): Date {
  const result = new Date(date);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay + 7 - currentDay) % 7 || 7;
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function getNextTradingDay(date: Date): Date {
  let nextDay = new Date(date);

  while (true) {
    const day = nextDay.getDay();

    // Pular fim de semana
    if (day === 0) {
      nextDay.setDate(nextDay.getDate() + 1);
      continue;
    }
    if (day === 6) {
      nextDay.setDate(nextDay.getDate() + 2);
      continue;
    }

    // Verificar feriado
    if (!isB3Holiday(nextDay)) {
      return nextDay;
    }

    nextDay.setDate(nextDay.getDate() + 1);
  }
}
