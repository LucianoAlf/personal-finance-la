// SPRINT 5.1: Edge Function para buscar benchmarks reais
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Benchmark {
  name: string;
  return: number;
  type: 'fixed_income' | 'inflation' | 'equity' | 'crypto' | 'commodity';
}

type Period = '1M' | '3M' | '6M' | '1Y';

const PERIOD_DAYS: Record<Period, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { period = '1Y' } = await req.json();

    // Buscar benchmarks paralelamente
    const [cdi, ipca, sp500, bitcoin, ethereum] = await Promise.allSettled([
      fetchCDI(period),
      fetchIPCA(period),
      fetchSP500(period),
      fetchBitcoin(period),
      fetchEthereum(period),
    ]);

    const benchmarks: Benchmark[] = [];

    if (cdi.status === 'fulfilled') benchmarks.push(cdi.value);
    if (ipca.status === 'fulfilled') benchmarks.push(ipca.value);
    if (sp500.status === 'fulfilled') benchmarks.push(sp500.value);
    if (bitcoin.status === 'fulfilled') benchmarks.push(bitcoin.value);
    if (ethereum.status === 'fulfilled') benchmarks.push(ethereum.value);
    return new Response(
      JSON.stringify({ benchmarks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar benchmarks:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar benchmarks' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Buscar CDI do Banco Central
 */
async function fetchCDI(period: Period): Promise<Benchmark> {
  const days = PERIOD_DAYS[period];

  try {
    const response = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/${days}?formato=json`
    );

    if (!response.ok) throw new Error('Erro ao buscar CDI');

    const data = await response.json();

    // Calcular retorno composto
    const compoundReturn = data.reduce((acc: number, item: any) => {
      return acc * (1 + parseFloat(item.valor) / 100);
    }, 1);

    const totalReturn = (compoundReturn - 1) * 100;

    return {
      name: 'CDI',
      return: parseFloat(totalReturn.toFixed(2)),
      type: 'fixed_income',
    };
  } catch (error) {
    console.error('Erro ao buscar CDI:', error);
    throw error;
  }
}

/**
 * Buscar IPCA do Banco Central
 */
async function fetchIPCA(period: Period): Promise<Benchmark> {
  const months = Math.ceil(PERIOD_DAYS[period] / 30);

  try {
    const response = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/${months}?formato=json`
    );

    if (!response.ok) throw new Error('Erro ao buscar IPCA');

    const data = await response.json();

    // Calcular acumulado
    const compoundReturn = data.reduce((acc: number, item: any) => {
      return acc * (1 + parseFloat(item.valor) / 100);
    }, 1);

    const totalReturn = (compoundReturn - 1) * 100;

    return {
      name: 'IPCA',
      return: parseFloat(totalReturn.toFixed(2)),
      type: 'inflation',
    };
  } catch (error) {
    console.error('Erro ao buscar IPCA:', error);
    throw error;
  }
}

/**
 * Buscar S&P 500 via Alpha Vantage
 */
async function fetchSP500(period: Period): Promise<Benchmark> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');

  if (!apiKey) {
    console.warn('ALPHA_VANTAGE_API_KEY não configurada');
    throw new Error('ALPHA_VANTAGE_API_KEY não configurada');
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&apikey=${apiKey}&outputsize=full`
    );

    if (!response.ok) throw new Error('Erro ao buscar S&P 500');

    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      throw new Error('Limite de requisições Alpha Vantage');
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) throw new Error('Dados inválidos');

    const dates = Object.keys(timeSeries).sort().reverse();
    const days = PERIOD_DAYS[period];

    const latestPrice = parseFloat(timeSeries[dates[0]]['4. close']);
    const oldPrice = parseFloat(timeSeries[dates[Math.min(days, dates.length - 1)]]?.['4. close'] || latestPrice);

    const returnPct = ((latestPrice - oldPrice) / oldPrice) * 100;

    return {
      name: 'S&P 500',
      return: parseFloat(returnPct.toFixed(2)),
      type: 'equity',
    };
  } catch (error) {
    console.error('Erro ao buscar S&P 500:', error);
    throw error;
  }
}

/**
 * Buscar Bitcoin via CoinGecko (API pública)
 */
async function fetchBitcoin(period: Period): Promise<Benchmark> {
  const days = PERIOD_DAYS[period];

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=${days}`
    );

    if (!response.ok) throw new Error('Erro ao buscar Bitcoin');

    const data = await response.json();
    const prices = data.prices;

    if (!prices || prices.length < 2) throw new Error('Dados insuficientes');

    const latestPrice = prices[prices.length - 1][1];
    const oldPrice = prices[0][1];

    const returnPct = ((latestPrice - oldPrice) / oldPrice) * 100;

    return {
      name: 'Bitcoin',
      return: parseFloat(returnPct.toFixed(2)),
      type: 'crypto',
    };
  } catch (error) {
    console.error('Erro ao buscar Bitcoin:', error);
    throw error;
  }
}

/**
 * Buscar Ethereum via CoinGecko
 */
async function fetchEthereum(period: Period): Promise<Benchmark> {
  const days = PERIOD_DAYS[period];

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=brl&days=${days}`
    );

    if (!response.ok) throw new Error('Erro ao buscar Ethereum');

    const data = await response.json();
    const prices = data.prices;

    if (!prices || prices.length < 2) throw new Error('Dados insuficientes');

    const latestPrice = prices[prices.length - 1][1];
    const oldPrice = prices[0][1];

    const returnPct = ((latestPrice - oldPrice) / oldPrice) * 100;

    return {
      name: 'Ethereum',
      return: parseFloat(returnPct.toFixed(2)),
      type: 'crypto',
    };
  } catch (error) {
    console.error('Erro ao buscar Ethereum:', error);
    throw error;
  }
}
