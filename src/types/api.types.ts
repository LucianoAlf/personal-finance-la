// =====================================================
// TIPOS DE APIS DE INVESTIMENTOS
// =====================================================

// ============= BRAPI (B3) =============
export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume10Day?: number;
  marketCap?: number;
  priceEarnings?: number; // P/L
  dividendYield?: number; // Dividend Yield %
  logourl?: string;
}

export interface BrapiResponse {
  results: BrapiQuote[];
  requestedAt: string;
  took: string;
}

export interface BrapiHistoricalData {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface BrapiHistoricalResponse {
  symbol: string;
  historical: BrapiHistoricalData[];
}

// ============= COINGECKO (CRYPTO) =============
export interface CoinGeckoPrice {
  [coinId: string]: {
    brl?: number;
    usd?: number;
    brl_24h_change?: number;
    usd_24h_change?: number;
    brl_market_cap?: number;
    usd_market_cap?: number;
    brl_24h_vol?: number;
    usd_24h_vol?: number;
  };
}

export interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinGeckoMarketChart {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

// ============= TESOURO DIRETO =============
export interface TesouroBond {
  TrsrBd: {
    cd: string; // Código
    nm: string; // Nome (ex: "Tesouro IPCA+ 2029")
    mtrtyDt: string; // Data de vencimento
    minInvstmtAmt: number; // Valor mínimo
    untrInvstmtVal: number; // Preço unitário
    anulInvstmtRate: number; // Taxa anual
    minRedVal?: number; // Valor mínimo resgate
  };
  TrsrSales: {
    dt: string; // Data
    prcMorn: number; // Preço manhã
    prcAftn: number; // Preço tarde
  };
}

export interface TesouroDiretoResponse {
  TrsrBdTradgList: TesouroBond[];
}

// ============= BANCO CENTRAL (CÂMBIO) =============
export interface BCBCurrency {
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
}

export interface BCBCurrencyResponse {
  value: BCBCurrency[];
}

export interface BCBIndicator {
  data: string;
  valor: string;
}

export interface BCBIndicatorResponse {
  value: BCBIndicator[];
}

// ============= TIPOS UNIFICADOS =============
export interface UnifiedQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  timestamp: string;
  source: 'brapi' | 'coingecko' | 'tesouro' | 'bcb';
  metadata?: Record<string, any>;
}

export interface QuoteError {
  symbol: string;
  error: string;
  source: string;
  timestamp: string;
}

// ============= MAPEAMENTO CRYPTO =============
export const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOT: 'polkadot',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
};

// ============= RATE LIMITS =============
export const API_RATE_LIMITS = {
  brapi: {
    free: { requestsPerMinute: 300, requestsPerDay: 10000 },
    alf: { requestsPerMinute: 1000, requestsPerDay: 100000 },
  },
  coingecko: {
    free: { requestsPerMinute: 10 },
    pro: { requestsPerMinute: 500 },
  },
  tesouro: {
    free: { requestsPerDay: 1000 },
  },
  bcb: {
    free: { requestsPerMinute: 60 },
  },
} as const;
