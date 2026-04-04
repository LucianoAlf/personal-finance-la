// =====================================================
// EDGE FUNCTION: Sincronizar preços de investimentos
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAPI_API_KEY = Deno.env.get('BRAPI_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Investment {
  id: string;
  ticker: string;
  type: string;
  category: string;
  current_price: number | null;
}

interface SyncResult {
  updated: number;
  errors: number;
  skipped: number;
  duration: string;
  details: Array<{
    ticker: string;
    status: 'success' | 'error' | 'skipped';
    price?: number;
    error?: string;
  }>;
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('[Sync] Iniciando sincronização de preços...');

  try {
    // 1. Buscar investimentos ativos
    const { data: investments, error: fetchError } = await supabase
      .from('investments')
      .select('id, ticker, type, category, current_price')
      .eq('is_active', true)
      .not('ticker', 'is', null);

    if (fetchError) {
      throw new Error(`Erro ao buscar investimentos: ${fetchError.message}`);
    }

    if (!investments || investments.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum investimento ativo encontrado',
          updated: 0,
          errors: 0,
          skipped: 0,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[Sync] Encontrados ${investments.length} investimentos ativos`);

    // 2. Agrupar por tipo
    const byType = {
      stock: investments.filter((i) => i.type === 'stock' || i.category === 'stock'),
      crypto: investments.filter((i) => i.type === 'crypto' || i.category === 'crypto'),
      treasury: investments.filter((i) => i.type === 'treasury' || i.category === 'fixed_income'),
    };

    const result: SyncResult = {
      updated: 0,
      errors: 0,
      skipped: 0,
      duration: '',
      details: [],
    };

    // 3. Sincronizar stocks (B3 + FIIs) em batch de 10
    if (byType.stock.length > 0) {
      console.log(`[Sync] Sincronizando ${byType.stock.length} ações/FIIs...`);
      await syncStocks(byType.stock, result);
    }

    // 4. Sincronizar crypto
    if (byType.crypto.length > 0) {
      console.log(`[Sync] Sincronizando ${byType.crypto.length} criptomoedas...`);
      await syncCrypto(byType.crypto, result);
    }

    // 5. Sincronizar tesouro
    if (byType.treasury.length > 0) {
      console.log(`[Sync] Sincronizando ${byType.treasury.length} títulos do tesouro...`);
      await syncTreasury(byType.treasury, result);
    }

    // 6. Calcular duração
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    result.duration = `${duration}s`;

    console.log(
      `[Sync] Concluído: ${result.updated} atualizados, ${result.errors} erros, ${result.skipped} ignorados em ${result.duration}`
    );

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[Sync] Erro fatal:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        updated: 0,
        errors: 0,
        skipped: 0,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ============= SYNC STOCKS (BRAPI) =============
async function syncStocks(investments: Investment[], result: SyncResult) {
  // Batch de 10 tickers
  const batches: Investment[][] = [];
  for (let i = 0; i < investments.length; i += 10) {
    batches.push(investments.slice(i, i + 10));
  }

  for (const batch of batches) {
    const tickers = batch.map((inv) => inv.ticker).join(',');
    const url = `https://brapi.dev/api/quote/${tickers}${BRAPI_API_KEY ? `?token=${BRAPI_API_KEY}` : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      for (const inv of batch) {
        const quote = data.results?.find(
          (r: any) => r.symbol.toUpperCase() === inv.ticker.toUpperCase()
        );

        if (quote && quote.regularMarketPrice) {
          await updateInvestmentPrice(inv.id, quote.regularMarketPrice, 'brapi', result);
          result.details.push({
            ticker: inv.ticker,
            status: 'success',
            price: quote.regularMarketPrice,
          });
        } else {
          result.skipped++;
          result.details.push({
            ticker: inv.ticker,
            status: 'skipped',
            error: 'Cotação não disponível',
          });
        }
      }
    } catch (error) {
      console.error(`[BrAPI] Erro no batch ${tickers}:`, error);
      batch.forEach((inv) => {
        result.errors++;
        result.details.push({
          ticker: inv.ticker,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      });
    }
  }
}

// ============= SYNC CRYPTO (COINGECKO) =============
async function syncCrypto(investments: Investment[], result: SyncResult) {
  const cryptoMap: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    SOL: 'solana',
  };

  const coinIds = investments
    .map((inv) => cryptoMap[inv.ticker.toUpperCase()] || inv.ticker.toLowerCase())
    .join(',');

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=brl`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    for (const inv of investments) {
      const coinId = cryptoMap[inv.ticker.toUpperCase()] || inv.ticker.toLowerCase();
      const price = data[coinId]?.brl;

      if (price) {
        await updateInvestmentPrice(inv.id, price, 'coingecko', result);
        result.details.push({
          ticker: inv.ticker,
          status: 'success',
          price,
        });
      } else {
        result.skipped++;
        result.details.push({
          ticker: inv.ticker,
          status: 'skipped',
          error: 'Cotação não disponível',
        });
      }
    }
  } catch (error) {
    console.error('[CoinGecko] Erro:', error);
    investments.forEach((inv) => {
      result.errors++;
      result.details.push({
        ticker: inv.ticker,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    });
  }
}

// ============= SYNC TREASURY (TESOURO DIRETO) =============
async function syncTreasury(investments: Investment[], result: SyncResult) {
  try {
    const url =
      'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const bonds = data.TrsrBdTradgList || [];

    for (const inv of investments) {
      const bond = bonds.find((b: any) =>
        b.TrsrBd.nm.toLowerCase().includes(inv.ticker.toLowerCase())
      );

      if (bond) {
        const price = bond.TrsrSales?.prcAftn || bond.TrsrSales?.prcMorn || 0;
        if (price > 0) {
          await updateInvestmentPrice(inv.id, price, 'tesouro', result);
          result.details.push({
            ticker: inv.ticker,
            status: 'success',
            price,
          });
        } else {
          result.skipped++;
          result.details.push({
            ticker: inv.ticker,
            status: 'skipped',
            error: 'Preço zero',
          });
        }
      } else {
        result.skipped++;
        result.details.push({
          ticker: inv.ticker,
          status: 'skipped',
          error: 'Título não encontrado',
        });
      }
    }
  } catch (error) {
    console.error('[Tesouro] Erro:', error);
    investments.forEach((inv) => {
      result.errors++;
      result.details.push({
        ticker: inv.ticker,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    });
  }
}

// ============= UPDATE HELPER =============
async function updateInvestmentPrice(
  investmentId: string,
  price: number,
  source: string,
  result: SyncResult
) {
  try {
    // Atualizar investment (trigger recalcula current_value e return_percentage)
    const { error: updateError } = await supabase
      .from('investments')
      .update({
        current_price: price,
        last_price_update: new Date().toISOString(),
      })
      .eq('id', investmentId);

    if (updateError) throw updateError;

    result.updated++;
  } catch (error) {
    console.error(`[Update] Erro ao atualizar ${investmentId}:`, error);
    result.errors++;
  }
}
