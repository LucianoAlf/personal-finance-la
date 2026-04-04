// =====================================================
// COINGECKO SERVICE - Criptomoedas
// =====================================================

import type {
  CoinGeckoPrice,
  CoinGeckoCoin,
  CoinGeckoMarketChart,
  UnifiedQuote,
  QuoteError,
} from '@/types/api.types';
import { CRYPTO_ID_MAP } from '@/types/api.types';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export class CoinGeckoService {
  private baseUrl = COINGECKO_BASE_URL;

  /**
   * Busca preço de uma criptomoeda
   */
  async getPrice(
    coinId: string,
    currency: 'brl' | 'usd' = 'brl'
  ): Promise<UnifiedQuote | QuoteError> {
    try {
      const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CoinGeckoPrice = await response.json();

      if (!data[coinId]) {
        throw new Error(`Coin ${coinId} não encontrada`);
      }

      return this.mapToUnifiedQuote(coinId, data[coinId], currency);
    } catch (error) {
      return this.handleError(coinId, error);
    }
  }

  /**
   * Busca preços em lote (até 250 coins)
   */
  async getBulkPrices(
    coinIds: string[],
    currency: 'brl' | 'usd' = 'brl'
  ): Promise<(UnifiedQuote | QuoteError)[]> {
    if (coinIds.length === 0) return [];

    try {
      const ids = coinIds.join(',');
      const url = `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CoinGeckoPrice = await response.json();

      // Mapear resultados
      return coinIds.map((coinId) => {
        if (data[coinId]) {
          return this.mapToUnifiedQuote(coinId, data[coinId], currency);
        } else {
          return {
            symbol: coinId,
            error: 'Coin não encontrada',
            source: 'coingecko',
            timestamp: new Date().toISOString(),
          };
        }
      });
    } catch (error) {
      return coinIds.map((coinId) => this.handleError(coinId, error));
    }
  }

  /**
   * Busca dados detalhados de mercado
   */
  async getCoinMarketData(
    coinId: string,
    currency: 'brl' | 'usd' = 'brl'
  ): Promise<CoinGeckoCoin | QuoteError> {
    try {
      const url = `${this.baseUrl}/coins/markets?vs_currency=${currency}&ids=${coinId}&order=market_cap_desc&sparkline=false`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CoinGeckoCoin[] = await response.json();

      if (!data || data.length === 0) {
        throw new Error(`Coin ${coinId} não encontrada`);
      }

      return data[0];
    } catch (error) {
      return this.handleError(coinId, error);
    }
  }

  /**
   * Busca histórico de preços
   */
  async getMarketChart(
    coinId: string,
    days: number = 30,
    currency: 'brl' | 'usd' = 'brl'
  ): Promise<CoinGeckoMarketChart | QuoteError> {
    try {
      const url = `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CoinGeckoMarketChart = await response.json();
      return data;
    } catch (error) {
      return this.handleError(coinId, error);
    }
  }

  /**
   * Converte símbolo (BTC) para coinId (bitcoin)
   */
  getCoinId(symbol: string): string {
    return CRYPTO_ID_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Busca top 100 criptomoedas
   */
  async getTopCoins(
    limit: number = 100,
    currency: 'brl' | 'usd' = 'brl'
  ): Promise<CoinGeckoCoin[]> {
    try {
      const url = `${this.baseUrl}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CoinGeckoCoin[] = await response.json();
      return data;
    } catch (error) {
      console.error('[CoinGecko] Erro ao buscar top coins:', error);
      return [];
    }
  }

  /**
   * Mercado de crypto está sempre aberto (24/7)
   */
  isMarketOpen(): boolean {
    return true;
  }

  // ============= HELPERS PRIVADOS =============

  private mapToUnifiedQuote(
    coinId: string,
    data: CoinGeckoPrice[string],
    currency: 'brl' | 'usd'
  ): UnifiedQuote {
    const price = data[currency] || 0;
    const change24h = data[`${currency}_24h_change`] || 0;
    const marketCap = data[`${currency}_market_cap`];
    const volume = data[`${currency}_24h_vol`];

    // Calcular variação absoluta
    const change = (price * change24h) / 100;

    return {
      symbol: coinId.toUpperCase(),
      name: coinId,
      price,
      change,
      changePercent: change24h,
      marketCap,
      volume,
      timestamp: new Date().toISOString(),
      source: 'coingecko',
      metadata: {
        currency,
      },
    };
  }

  private handleError(coinId: string, error: unknown): QuoteError {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[CoinGecko] Erro ao buscar ${coinId}:`, message);

    return {
      symbol: coinId,
      error: message,
      source: 'coingecko',
      timestamp: new Date().toISOString(),
    };
  }
}

// Exportar instância singleton
export const coinGeckoService = new CoinGeckoService();
