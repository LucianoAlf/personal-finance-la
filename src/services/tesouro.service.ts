// =====================================================
// TESOURO DIRETO SERVICE
// =====================================================

import type {
  TesouroDiretoResponse,
  TesouroBond,
  UnifiedQuote,
  QuoteError,
} from '@/types/api.types';

const TESOURO_API_URL =
  'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';

export class TesouroDiretoService {
  private apiUrl = TESOURO_API_URL;
  private cache: TesouroDiretoResponse | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Busca todos os títulos disponíveis
   */
  async getAllBonds(): Promise<TesouroDiretoResponse | QuoteError> {
    try {
      // Verificar cache
      if (this.cache && Date.now() - this.cacheTimestamp < this.cacheTTL) {
        return this.cache;
      }

      const response = await fetch(this.apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TesouroDiretoResponse = await response.json();

      // Atualizar cache
      this.cache = data;
      this.cacheTimestamp = Date.now();

      return data;
    } catch (error) {
      return this.handleError('ALL', error);
    }
  }

  /**
   * Busca título por nome
   */
  async getBondByName(name: string): Promise<UnifiedQuote | QuoteError> {
    try {
      const data = await this.getAllBonds();

      if ('error' in data) {
        throw new Error(data.error);
      }

      const bond = data.TrsrBdTradgList.find((item) =>
        item.TrsrBd.nm.toLowerCase().includes(name.toLowerCase())
      );

      if (!bond) {
        throw new Error(`Título "${name}" não encontrado`);
      }

      return this.mapToUnifiedQuote(bond);
    } catch (error) {
      return this.handleError(name, error);
    }
  }

  /**
   * Busca múltiplos títulos por nome
   */
  async getBondsByNames(names: string[]): Promise<(UnifiedQuote | QuoteError)[]> {
    try {
      const data = await this.getAllBonds();

      if ('error' in data) {
        throw new Error(data.error);
      }

      return names.map((name) => {
        const bond = data.TrsrBdTradgList.find((item) =>
          item.TrsrBd.nm.toLowerCase().includes(name.toLowerCase())
        );

        if (bond) {
          return this.mapToUnifiedQuote(bond);
        } else {
          return {
            symbol: name,
            error: 'Título não encontrado',
            source: 'tesouro',
            timestamp: new Date().toISOString(),
          };
        }
      });
    } catch (error) {
      return names.map((name) => this.handleError(name, error));
    }
  }

  /**
   * Busca títulos por tipo
   */
  async getBondsByType(
    type: 'IPCA' | 'Selic' | 'Prefixado'
  ): Promise<TesouroBond[] | QuoteError> {
    try {
      const data = await this.getAllBonds();

      if ('error' in data) {
        throw new Error(data.error);
      }

      const filtered = data.TrsrBdTradgList.filter((item) => {
        const name = item.TrsrBd.nm.toLowerCase();
        if (type === 'IPCA') return name.includes('ipca');
        if (type === 'Selic') return name.includes('selic');
        if (type === 'Prefixado') return name.includes('prefixado');
        return false;
      });

      return filtered;
    } catch (error) {
      return this.handleError(type, error);
    }
  }

  /**
   * Simula investimento
   */
  simulateInvestment(
    bondPrice: number,
    amount: number,
    annualRate: number,
    months: number
  ): {
    initialAmount: number;
    finalAmount: number;
    profit: number;
    profitPercent: number;
  } {
    const quantity = Math.floor(amount / bondPrice);
    const invested = quantity * bondPrice;

    // Juros compostos
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const finalAmount = invested * Math.pow(1 + monthlyRate, months);
    const profit = finalAmount - invested;
    const profitPercent = (profit / invested) * 100;

    return {
      initialAmount: invested,
      finalAmount,
      profit,
      profitPercent,
    };
  }

  /**
   * Tesouro atualiza 1x por dia (~9:30)
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Fim de semana
    if (day === 0 || day === 6) return false;

    // Atualiza após 9:30
    return hour >= 9;
  }

  /**
   * Limpar cache manualmente
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  // ============= HELPERS PRIVADOS =============

  private mapToUnifiedQuote(bond: TesouroBond): UnifiedQuote {
    const price = bond.TrsrSales?.prcAftn || bond.TrsrSales?.prcMorn || 0;
    const previousPrice = bond.TrsrSales?.prcMorn || price;
    const change = price - previousPrice;
    const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

    return {
      symbol: bond.TrsrBd.cd,
      name: bond.TrsrBd.nm,
      price,
      change,
      changePercent,
      timestamp: bond.TrsrSales?.dt || new Date().toISOString(),
      source: 'tesouro',
      metadata: {
        maturityDate: bond.TrsrBd.mtrtyDt,
        minInvestment: bond.TrsrBd.minInvstmtAmt,
        annualRate: bond.TrsrBd.anulInvstmtRate,
        minRedeem: bond.TrsrBd.minRedVal,
        priceMorning: bond.TrsrSales?.prcMorn,
        priceAfternoon: bond.TrsrSales?.prcAftn,
      },
    };
  }

  private handleError(identifier: string, error: unknown): QuoteError {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Tesouro] Erro ao buscar ${identifier}:`, message);

    return {
      symbol: identifier,
      error: message,
      source: 'tesouro',
      timestamp: new Date().toISOString(),
    };
  }
}

// Exportar instância singleton
export const tesouroDiretoService = new TesouroDiretoService();
