// =====================================================
// INVESTMENT SERVICE - Cache Layer (via Edge Function)
// =====================================================

import { supabase } from '@/lib/supabase';
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
  timestamp: string; // Corrigido: tabela usa 'timestamp', não 'cached_at'
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

      if (cached && !isCacheExpired(cached.timestamp, ttl)) {
        console.log(`[Cache HIT] ${ticker} (idade: ${this.getCacheAge(cached.timestamp)}min)`);
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

      // 4. Cache é salvo pela Edge Function (não precisamos salvar aqui)
      // A Edge Function usa service_role_key e bypassa RLS

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
      .order('timestamp', { ascending: false })
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
      timestamp: new Date().toISOString(),
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
      timestamp: cached.timestamp,
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
    try {
      // Usar Edge Function para evitar CORS
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-quote`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol: ticker, type }),
        }
      );
      const quote = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          symbol: ticker,
          error: quote?.error || `Edge Function error: ${response.status}`,
          source: 'edge-function',
          timestamp: new Date().toISOString(),
        };
      }

      // Se retornou erro da API
      if (!quote || quote.error) {
        return {
          symbol: ticker,
          error: quote?.error || 'Quote unavailable',
          source: 'edge-function',
          timestamp: new Date().toISOString(),
        };
      }

      return quote;
    } catch (error) {
      console.error(`[API] Erro ao buscar ${ticker}:`, error);
      return {
        symbol: ticker,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'edge-function',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Exportar instância singleton
export const investmentService = new InvestmentService();
