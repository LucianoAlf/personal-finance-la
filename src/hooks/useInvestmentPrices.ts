// =====================================================
// HOOK: useInvestmentPrices - Cotações em tempo real
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { investmentService } from '@/services/investment.service';
import type { UnifiedQuote, QuoteError } from '@/types/api.types';
import { getCacheTTL } from '@/utils/market-hours';
import { filterValidQuotes, filterErrors } from '@/utils/api-helpers';

export interface InvestmentPriceItem {
  ticker: string;
  type: 'stock' | 'crypto' | 'treasury';
  investmentId?: string;
}

export interface UseInvestmentPricesOptions {
  items: InvestmentPriceItem[];
  autoRefresh?: boolean;
  refreshInterval?: number; // ms (default: baseado no tipo)
  onSuccess?: (quotes: UnifiedQuote[]) => void;
  onError?: (errors: QuoteError[]) => void;
}

export interface UseInvestmentPricesReturn {
  quotes: Map<string, UnifiedQuote>;
  errors: Map<string, QuoteError>;
  loading: boolean;
  refreshing: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  updateSingle: (ticker: string, type: 'stock' | 'crypto' | 'treasury') => Promise<void>;
}

export function useInvestmentPrices(
  options: UseInvestmentPricesOptions
): UseInvestmentPricesReturn {
  const { items, autoRefresh = true, refreshInterval, onSuccess, onError } = options;

  const [quotes, setQuotes] = useState<Map<string, UnifiedQuote>>(new Map());
  const [errors, setErrors] = useState<Map<string, QuoteError>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Busca todas as cotações
   */
  const fetchAllQuotes = useCallback(async () => {
    if (items.length === 0) {
      setLoading(false);
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const results = await investmentService.getBulkQuotesWithCache(items);

      // Separar sucessos e erros
      const validQuotes = filterValidQuotes(results);
      const errorQuotes = filterErrors(results);

      // Atualizar state
      const newQuotes = new Map<string, UnifiedQuote>();
      validQuotes.forEach((quote) => {
        newQuotes.set(quote.symbol.toUpperCase(), quote);
      });

      const newErrors = new Map<string, QuoteError>();
      errorQuotes.forEach((error) => {
        newErrors.set(error.symbol.toUpperCase(), error);
      });

      setQuotes(newQuotes);
      setErrors(newErrors);
      setLastUpdate(new Date());

      // Callbacks
      if (validQuotes.length > 0 && onSuccess) {
        onSuccess(validQuotes);
      }
      if (errorQuotes.length > 0 && onError) {
        onError(errorQuotes);
      }
    } catch (error) {
      console.error('[useInvestmentPrices] Erro ao buscar cotações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items, onSuccess, onError]);

  /**
   * Refresh manual
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllQuotes();
  }, [fetchAllQuotes]);

  /**
   * Atualiza cotação individual
   */
  const updateSingle = useCallback(
    async (ticker: string, type: 'stock' | 'crypto' | 'treasury') => {
      try {
        const quote = await investmentService.getQuoteWithCache(ticker, type);

        if ('error' in quote) {
          setErrors((prev) => new Map(prev).set(ticker.toUpperCase(), quote));
        } else {
          setQuotes((prev) => new Map(prev).set(ticker.toUpperCase(), quote));
          setErrors((prev) => {
            const newErrors = new Map(prev);
            newErrors.delete(ticker.toUpperCase());
            return newErrors;
          });
        }

        setLastUpdate(new Date());
      } catch (error) {
        console.error(`[useInvestmentPrices] Erro ao atualizar ${ticker}:`, error);
      }
    },
    []
  );

  /**
   * Calcular intervalo de refresh baseado nos tipos
   */
  const getRefreshInterval = useCallback((): number => {
    if (refreshInterval) return refreshInterval;

    // Se tem crypto, usar 2min
    if (items.some((i) => i.type === 'crypto')) {
      return 2 * 60 * 1000;
    }

    // Se tem stock, usar TTL dinâmico
    if (items.some((i) => i.type === 'stock')) {
      return getCacheTTL('stock');
    }

    // Tesouro: 1 hora
    return 60 * 60 * 1000;
  }, [items, refreshInterval]);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = getRefreshInterval();

    intervalRef.current = setInterval(() => {
      console.log('[useInvestmentPrices] Auto-refresh triggered');
      fetchAllQuotes();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, getRefreshInterval, fetchAllQuotes]);

  /**
   * Fetch inicial
   */
  useEffect(() => {
    fetchAllQuotes();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAllQuotes]);

  return {
    quotes,
    errors,
    loading,
    refreshing,
    lastUpdate,
    refresh,
    updateSingle,
  };
}
