// Edge Function para buscar cotações (evita CORS)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  symbol: string;
  type: 'stock' | 'crypto' | 'treasury';
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_API_KEY = Deno.env.get('BRAPI_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function buildErrorPayload(symbol: string, error: unknown) {
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    symbol: symbol || null,
    name: symbol || null,
    price: 0,
    change: 0,
    changePercent: 0,
  };
}

function isLookupError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /BrAPI error|CoinGecko error|Tesouro Direto error|Quote not found|Crypto not found|Treasury bond not found|Treasury price unavailable|Unsupported type/i.test(message);
}

function normalizeTreasuryText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

async function fetchTreasuryQuote(symbol: string) {
  const response = await fetch(
    'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json'
  );

  if (!response.ok) {
    throw new Error(`Tesouro Direto error: ${response.status}`);
  }

  const data = await response.json();
  const bonds = data.TrsrBdTradgList || [];
  const normalizedSymbol = normalizeTreasuryText(symbol);

  const bond = bonds.find((item: any) => {
    const bondName = normalizeTreasuryText(item?.TrsrBd?.nm || '');
    const extendedName = normalizeTreasuryText(
      `${item?.TrsrBd?.nm || ''}${item?.TrsrBd?.mtrtyDt || ''}${item?.TrsrBd?.featrs || ''}`
    );

    return bondName.includes(normalizedSymbol) || extendedName.includes(normalizedSymbol);
  });

  if (!bond) {
    throw new Error('Treasury bond not found');
  }

  const price = bond.TrsrSales?.prcAftn || bond.TrsrSales?.prcMorn || 0;

  if (!price) {
    throw new Error('Treasury price unavailable');
  }

  const previousPrice = bond.TrsrSts?.prvsClsgPric || price;
  const change = price - previousPrice;
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: bond.TrsrBd?.nm || symbol.toUpperCase(),
    price,
    change,
    changePercent,
    volume: null,
    timestamp: new Date().toISOString(),
    source: 'tesouro',
    metadata: {
      maturityDate: bond.TrsrBd?.mtrtyDt,
      annualInvestmentRate: bond.TrsrBd?.anulInvstmtRate,
      sellPrice: bond.TrsrSales?.untrInvstmtVal,
    },
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody = '';
  let parsedRequest: QuoteRequest | null = null;

  try {
    requestBody = await req.text();
    console.log('[get-quote] Body recebido:', requestBody);

    parsedRequest = JSON.parse(requestBody) as QuoteRequest;
    const { symbol, type } = parsedRequest;

    if (!symbol || !type) {
      return new Response(
        JSON.stringify({ error: 'symbol and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedSymbol = symbol.toUpperCase();
    console.log(`[get-quote] Buscando ${normalizedSymbol} (${type})`);

    let quote;

    // Buscar baseado no tipo
    if (type === 'stock') {
      const tokenParam = BRAPI_API_KEY ? `?token=${BRAPI_API_KEY}` : '';
      const url = `https://brapi.dev/api/quote/${normalizedSymbol}${tokenParam}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`BrAPI error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) {
        throw new Error('Quote not found');
      }

      quote = {
        symbol: result.symbol.toUpperCase(),
        name: result.longName || result.shortName,
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        timestamp: new Date().toISOString(),
        source: 'brapi',
        metadata: {
          high: result.regularMarketDayHigh,
          low: result.regularMarketDayLow,
          open: result.regularMarketOpen,
          previousClose: result.regularMarketPreviousClose,
        },
      };
    } else if (type === 'crypto') {
      // CoinGecko para crypto
      const coinMap: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        USDT: 'tether',
        BNB: 'binancecoin',
        SOL: 'solana',
      };

      const coinId = coinMap[symbol] || symbol.toLowerCase();

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko error: ${response.status}`);
      }

      const data = await response.json();
      const coinData = data[coinId];

      if (!coinData) {
        throw new Error('Crypto not found');
      }
      const price = coinData.brl;
      const change24h = coinData.brl_24h_change || 0;

      quote = {
        symbol: normalizedSymbol,
        name: coinId,
        price,
        change: (price * change24h) / 100,
        changePercent: change24h,
        volume: coinData.brl_24h_vol,
        timestamp: new Date().toISOString(),
        source: 'coingecko',
        metadata: {
          market_cap: coinData.brl_market_cap,
        },
      };
    } else if (type === 'treasury') {
      quote = await fetchTreasuryQuote(normalizedSymbol);
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }

    // Salvar no cache (apenas se price > 0)
    if (quote.price > 0) {
      const { error: insertError } = await supabase.from('investment_quotes_history').insert({
        symbol: quote.symbol,
        price: Number(quote.price),
        variation: Number(quote.changePercent),
        volume: quote.volume !== undefined && quote.volume !== null
          ? Number(quote.volume)
          : null,
        source: quote.source,
        metadata: quote.metadata || null,
        timestamp: new Date().toISOString(),
      });

      if (insertError) {
        console.error('[get-quote] Erro ao salvar cache:', insertError);
      }
    }

    console.log(`[get-quote] ✅ ${normalizedSymbol} = R$ ${quote.price}`);

    return new Response(
      JSON.stringify(quote),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-quote] Erro:', error);
    const normalizedSymbol = parsedRequest?.symbol?.toUpperCase() ?? '';

    try {
      const cached = await getCachedQuoteFromSupabase(normalizedSymbol);

      if (cached) {
        console.log('[get-quote] Retornando cotação do cache');
        const variation = Number(cached.variation) || 0;
        const price = Number(cached.price) || 0;

        return new Response(
          JSON.stringify({
            symbol: cached.symbol,
            name: cached.symbol,
            price,
            change: (price * variation) / 100,
            changePercent: variation,
            volume: cached.volume !== null ? Number(cached.volume) : null,
            timestamp: cached.timestamp,
            source: cached.source,
            metadata: cached.metadata,
            fromCache: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (cacheError) {
      console.error('[get-quote] Erro ao recuperar cache:', cacheError);
    }

    return new Response(
      JSON.stringify(buildErrorPayload(normalizedSymbol, error)),
      {
        status: isLookupError(error) ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getCachedQuoteFromSupabase(symbol: string) {
  if (!symbol) return null;

  const { data, error } = await supabase
    .from('investment_quotes_history')
    .select('symbol, price, variation, volume, source, metadata, timestamp')
    .eq('symbol', symbol.toUpperCase())
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[get-quote] Erro ao ler cache:', error);
    return null;
  }

  return data;
}
