// =====================================================
// BANCO CENTRAL SERVICE - Câmbio e Indicadores
// =====================================================

import type { BCBCurrencyResponse, BCBIndicatorResponse, QuoteError } from '@/types/api.types';

const BCB_BASE_URL = 'https://olinda.bcb.gov.br/olinda/servico';

export class BancoCentralService {
  private baseUrl = BCB_BASE_URL;

  /**
   * Busca cotação do dólar (PTAX)
   */
  async getDollarQuote(date?: string): Promise<{ buy: number; sell: number } | QuoteError> {
    try {
      const dateStr = date || this.formatDate(new Date());
      const url = `${this.baseUrl}/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$format=json`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BCBCurrencyResponse = await response.json();

      if (!data.value || data.value.length === 0) {
        throw new Error('Cotação não disponível para esta data');
      }

      const quote = data.value[0];

      return {
        buy: quote.cotacaoCompra,
        sell: quote.cotacaoVenda,
      };
    } catch (error) {
      return this.handleError('USD', error);
    }
  }

  /**
   * Busca cotação de moeda específica
   */
  async getCurrencyQuote(
    currencyCode: 'USD' | 'EUR' | 'GBP' | 'JPY',
    date?: string
  ): Promise<{ buy: number; sell: number } | QuoteError> {
    try {
      const dateStr = date || this.formatDate(new Date());
      const url = `${this.baseUrl}/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${currencyCode}'&@dataCotacao='${dateStr}'&$format=json`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BCBCurrencyResponse = await response.json();

      if (!data.value || data.value.length === 0) {
        throw new Error('Cotação não disponível para esta data');
      }

      const quote = data.value[0];

      return {
        buy: quote.cotacaoCompra,
        sell: quote.cotacaoVenda,
      };
    } catch (error) {
      return this.handleError(currencyCode, error);
    }
  }

  /**
   * Busca taxa SELIC
   */
  async getSelicRate(): Promise<number | QuoteError> {
    try {
      // Série 11 = SELIC (% a.a.)
      const url = `${this.baseUrl}/Expectativas/versao/v1/odata/ExpectativaMercadoSelic?$top=1&$orderby=Data%20desc&$format=json&$select=Mediana`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BCBIndicatorResponse = await response.json();

      if (!data.value || data.value.length === 0) {
        throw new Error('Taxa SELIC não disponível');
      }

      return parseFloat(data.value[0].valor);
    } catch (error) {
      return this.handleError('SELIC', error);
    }
  }

  /**
   * Busca CDI
   */
  async getCDIRate(): Promise<number | QuoteError> {
    try {
      // Série 12 = CDI (% a.a.)
      const today = this.formatDate(new Date());
      const url = `${this.baseUrl}/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$filter=Indicador%20eq%20'CDI'%20and%20Data%20eq%20'${today}'&$format=json&$select=Mediana`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BCBIndicatorResponse = await response.json();

      if (!data.value || data.value.length === 0) {
        throw new Error('Taxa CDI não disponível');
      }

      return parseFloat(data.value[0].valor);
    } catch (error) {
      return this.handleError('CDI', error);
    }
  }

  /**
   * Busca IPCA (inflação)
   */
  async getIPCA(): Promise<number | QuoteError> {
    try {
      const url = `${this.baseUrl}/Expectativas/versao/v1/odata/ExpectativasMercadoMensais?$filter=Indicador%20eq%20'IPCA'&$top=1&$orderby=Data%20desc&$format=json&$select=Mediana`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BCBIndicatorResponse = await response.json();

      if (!data.value || data.value.length === 0) {
        throw new Error('IPCA não disponível');
      }

      return parseFloat(data.value[0].valor);
    } catch (error) {
      return this.handleError('IPCA', error);
    }
  }

  /**
   * Busca múltiplos indicadores
   */
  async getAllIndicators(): Promise<{
    selic?: number;
    cdi?: number;
    ipca?: number;
    usd?: { buy: number; sell: number };
  }> {
    const [selic, cdi, ipca, usd] = await Promise.all([
      this.getSelicRate(),
      this.getCDIRate(),
      this.getIPCA(),
      this.getDollarQuote(),
    ]);

    return {
      selic: typeof selic === 'number' ? selic : undefined,
      cdi: typeof cdi === 'number' ? cdi : undefined,
      ipca: typeof ipca === 'number' ? ipca : undefined,
      usd: 'buy' in usd ? usd : undefined,
    };
  }

  // ============= HELPERS PRIVADOS =============

  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  private handleError(identifier: string, error: unknown): QuoteError {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[BCB] Erro ao buscar ${identifier}:`, message);

    return {
      symbol: identifier,
      error: message,
      source: 'bcb',
      timestamp: new Date().toISOString(),
    };
  }
}

// Exportar instância singleton
export const bancoCentralService = new BancoCentralService();
