// =====================================================
// BRAPI SERVICE - Ações B3 + FIIs
// =====================================================

import type {
  BrapiQuote,
  BrapiResponse,
  BrapiHistoricalResponse,
  UnifiedQuote,
  QuoteError,
} from '@/types/api.types';

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const BRAPI_API_KEY = import.meta.env.VITE_BRAPI_API_KEY || '';

export class BrapiService {
  private baseUrl = BRAPI_BASE_URL;
  private apiKey = BRAPI_API_KEY;

  /**
   * Busca cotação de um único ticker
   */
  async getQuote(ticker: string): Promise<UnifiedQuote | QuoteError> {
    try {
      const url = this.buildUrl(`/quote/${ticker.toUpperCase()}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BrapiResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error(`Ticker ${ticker} não encontrado`);
      }

      return this.mapToUnifiedQuote(data.results[0]);
    } catch (error) {
      return this.handleError(ticker, error);
    }
  }

  /**
   * Busca cotações em lote (máximo 10 tickers)
   */
  async getBulkQuotes(tickers: string[]): Promise<(UnifiedQuote | QuoteError)[]> {
    if (tickers.length === 0) return [];
    if (tickers.length > 10) {
      console.warn('BrAPI: Máximo 10 tickers por request. Truncando...');
      tickers = tickers.slice(0, 10);
    }

    try {
      const tickerList = tickers.map((t) => t.toUpperCase()).join(',');
      const url = this.buildUrl(`/quote/${tickerList}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BrapiResponse = await response.json();

      // Mapear resultados
      const results: (UnifiedQuote | QuoteError)[] = [];
      for (const ticker of tickers) {
        const quote = data.results.find(
          (r) => r.symbol.toUpperCase() === ticker.toUpperCase()
        );
        if (quote) {
          results.push(this.mapToUnifiedQuote(quote));
        } else {
          results.push({
            symbol: ticker,
            error: 'Ticker não encontrado',
            source: 'brapi',
            timestamp: new Date().toISOString(),
          });
        }
      }

      return results;
    } catch (error) {
      // Retornar erro para todos os tickers
      return tickers.map((ticker) => this.handleError(ticker, error));
    }
  }

  /**
   * Busca dados históricos
   */
  async getHistoricalData(
    ticker: string,
    range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1mo'
  ): Promise<BrapiHistoricalResponse | QuoteError> {
    try {
      const url = this.buildUrl(`/quote/${ticker.toUpperCase()}`, { range });
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return this.handleError(ticker, error);
    }
  }

  /**
   * Busca dados fundamentalistas
   */
  async getFundamentals(ticker: string): Promise<BrapiQuote | QuoteError> {
    try {
      const url = this.buildUrl(`/quote/${ticker.toUpperCase()}`, {
        fundamental: 'true',
      });
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BrapiResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error(`Ticker ${ticker} não encontrado`);
      }

      return data.results[0];
    } catch (error) {
      return this.handleError(ticker, error);
    }
  }

  /**
   * Verifica se o mercado está aberto
   * B3: 10:00 - 17:00 (seg-sex, exceto feriados)
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Fim de semana
    if (day === 0 || day === 6) return false;

    // Horário de pregão: 10h-17h
    return hour >= 10 && hour < 17;
  }

  // ============= HELPERS PRIVADOS =============

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);

    // Adicionar API key se disponível
    if (this.apiKey) {
      url.searchParams.set('token', this.apiKey);
    }

    // Adicionar parâmetros adicionais
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  private mapToUnifiedQuote(quote: BrapiQuote): UnifiedQuote {
    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      timestamp: quote.regularMarketTime,
      source: 'brapi',
      metadata: {
        open: quote.regularMarketOpen,
        previousClose: quote.regularMarketPreviousClose,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        priceEarnings: quote.priceEarnings,
        dividendYield: quote.dividendYield,
        logourl: quote.logourl,
      },
    };
  }

  private handleError(ticker: string, error: unknown): QuoteError {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[BrAPI] Erro ao buscar ${ticker}:`, message);

    return {
      symbol: ticker,
      error: message,
      source: 'brapi',
      timestamp: new Date().toISOString(),
    };
  }
}

// Exportar instância singleton
export const brapiService = new BrapiService();
