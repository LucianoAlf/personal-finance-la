// =====================================================
// HELPERS PARA APIS
// =====================================================

import type { UnifiedQuote, QuoteError } from '@/types/api.types';

/**
 * Verifica se é um erro
 */
export function isQuoteError(result: UnifiedQuote | QuoteError): result is QuoteError {
  return 'error' in result;
}

/**
 * Filtra apenas cotações válidas
 */
export function filterValidQuotes(
  results: (UnifiedQuote | QuoteError)[]
): UnifiedQuote[] {
  return results.filter((r): r is UnifiedQuote => !isQuoteError(r));
}

/**
 * Filtra apenas erros
 */
export function filterErrors(results: (UnifiedQuote | QuoteError)[]): QuoteError[] {
  return results.filter((r): r is QuoteError => isQuoteError(r));
}

/**
 * Retry com backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch array em chunks
 */
export function batchArray<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

/**
 * Formata erro para exibição
 */
export function formatApiError(error: QuoteError): string {
  return `${error.symbol}: ${error.error} (${error.source})`;
}

/**
 * Calcula idade do cache em minutos
 */
export function getCacheAge(timestamp: string): number {
  const now = new Date().getTime();
  const cacheTime = new Date(timestamp).getTime();
  return Math.floor((now - cacheTime) / (1000 * 60));
}

/**
 * Verifica se cache expirou
 */
export function isCacheExpired(timestamp: string, ttlMs: number): boolean {
  const now = new Date().getTime();
  const cacheTime = new Date(timestamp).getTime();
  return now - cacheTime > ttlMs;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
