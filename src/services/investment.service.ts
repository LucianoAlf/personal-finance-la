// =====================================================
// INVESTMENT SERVICE - Cache Layer
// =====================================================

import { supabase } from '@/lib/supabase';
import { brapiService } from './brapi.service';
import { coinGeckoService } from './coingecko.service';
import { tesouroDiretoService } from './tesouro.service';
import type { UnifiedQuote, QuoteError } from '@/types/api.types';
import { getCacheTTL } from '@/utils/market-hours';
import { isCacheExpired, batchArray, filterValidQuotes } from '@/utils/api-helpers';

export interface CachedQuote {
  symbol: string;
  price: number;
  variation: number;
  volume: number | null;
  source: string;
  metadata: Record<string, any> | null;
  cached_at: string;
}

export class InvestmentService {
  /**
   * Busca cotação com cache inteligente
   */
  async getQuoteWithCache(
    ticker: string,
    type: 'stock' | 'crypto' | 'treasury'
  ): Promise<UnifiedQuote | QuoteError> {
    try {
      // 1. Verificar cache
      const cached = await this.getCachedQuote(ticker);
      const ttl = getCacheTTL(type);

      if (cached && !isCacheExpired(cached.cached_at, ttl)) {
        console.log(`[Cache HIT] ${ticker} (idade: ${this.getCacheAge(cached.cached_at)}min)`);
        return this.mapCachedToUnified(cached);
      }

      console.log(`[Cache MISS] ${ticker} - Buscando na API...`);

      // 2. Buscar na API apropriada
      const quote = await this.fetchFromAPI(ticker, type);

      // 3. Se erro, retornar cache antigo como fallback
      if ('error' in quote && cached) {
        console.warn(`[Fallback] Usando cache antigo para ${ticker}`);
        return this.mapCachedToUnified(cached);
      }

      // 4. Salvar no cache
      if (!('error' in quote)) {
        await this.saveToCache(quote);
      }

      return quote;
    } catch (error) {
      console.error(`[InvestmentService] Erro ao buscar ${ticker}:`, error);
      return {
        symbol: ticker,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        source: 'cache',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Busca múltiplas cotações em batch
   */
  async getBulkQuotesWithCache(
    items: Array<{ ticker: string; type: 'stock' | 'crypto' | 'treasury' }>
  ): Promise<(UnifiedQuote | QuoteError)[]> {
    // Agrupar por tipo
    const byType = {
      stock: items.filter((i) => i.type === 'stock').map((i) => i.ticker),
      crypto: items.filter((i) => i.type === 'crypto').map((i) => i.ticker),
      treasury: items.filter((i) => i.type === 'treasury').map((i) => i.ticker),
    };

    const results: (UnifiedQuote | QuoteError)[] = [];

    // Processar stocks em batch de 10
    if (byType.stock.length > 0) {
      const batches = batchArray(byType.stock, 10);
      for (const batch of batches) {
        const quotes = await Promise.all(
          batch.map((ticker) => this.getQuoteWithCache(ticker, 'stock'))
        );
        results.push(...quotes);
      }
    }

    // Processar crypto em batch de 250
    if (byType.crypto.length > 0) {
      const quotes = await Promise.all(
        byType.crypto.map((ticker) => this.getQuoteWithCache(ticker, 'crypto'))
      );
      results.push(...quotes);
    }

    // Processar tesouro
    if (byType.treasury.length > 0) {
      const quotes = await Promise.all(
        byType.treasury.map((ticker) => this.getQuoteWithCache(ticker, 'treasury'))
      );
      results.push(...quotes);
    }

    return results;
  }

  /**
   * Atualiza preço de um investimento
   */
  async updateInvestmentPrice(
    investmentId: string,
    ticker: string,
    type: 'stock' | 'crypto' | 'treasury'
  ): Promise<{ success: boolean; price?: number; error?: string }> {
    try {
      const quote = await this.getQuoteWithCache(ticker, type);

      if ('error' in quote) {
        return { success: false, error: quote.error };
      }

      // Atualizar investments.current_price
      const { error } = await supabase
        .from('investments')
        .update({
          current_price: quote.price,
          last_price_update: new Date().toISOString(),
        })
        .eq('id', investmentId);

      if (error) throw error;

      return { success: true, price: quote.price };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // ============= CACHE METHODS =============

  private async getCachedQuote(symbol: string): Promise<CachedQuote | null> {
    const { data, error } = await supabase
      .from('investment_quotes_history')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as CachedQuote;
  }

  private async saveToCache(quote: UnifiedQuote): Promise<void> {
    const { error } = await supabase.from('investment_quotes_history').insert({
      symbol: quote.symbol.toUpperCase(),
      price: quote.price,
      variation: quote.changePercent,
      volume: quote.volume || null,
      source: quote.source,
      metadata: quote.metadata || null,
      cached_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Cache] Erro ao salvar:', error);
    }
  }

  private mapCachedToUnified(cached: CachedQuote): UnifiedQuote {
    return {
      symbol: cached.symbol,
      name: cached.symbol,
      price: cached.price,
      change: (cached.price * cached.variation) / 100,
      changePercent: cached.variation,
      volume: cached.volume || undefined,
      timestamp: cached.cached_at,
      source: cached.source as any,
      metadata: cached.metadata || undefined,
    };
  }

  private getCacheAge(timestamp: string): number {
    const now = new Date().getTime();
    const cacheTime = new Date(timestamp).getTime();
    return Math.floor((now - cacheTime) / (1000 * 60));
  }

  // ============= API METHODS =============

  private async fetchFromAPI(
    ticker: string,
    type: 'stock' | 'crypto' | 'treasury'
  ): Promise<UnifiedQuote | QuoteError> {
    switch (type) {
      case 'stock':
        return brapiService.getQuote(ticker);

      case 'crypto':
        const coinId = coinGeckoService.getCoinId(ticker);
        return coinGeckoService.getPrice(coinId, 'brl');

      case 'treasury':
        return tesouroDiretoService.getBondByName(ticker);

      default:
        return {
          symbol: ticker,
          error: `Tipo inválido: ${type}`,
          source: 'cache',
          timestamp: new Date().toISOString(),
        };
    }
  }
}

// Exportar instância singleton
export const investmentService = new InvestmentService();
