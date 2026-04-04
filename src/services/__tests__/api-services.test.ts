// =====================================================
// TESTES DOS SERVIÇOS DE API
// =====================================================

import { brapiService } from '../brapi.service';
import { coinGeckoService } from '../coingecko.service';
import { tesouroDiretoService } from '../tesouro.service';
import { bancoCentralService } from '../bcb.service';

/**
 * Testes manuais - Execute no console do navegador
 */

// ============= BRAPI =============
export async function testBrapi() {
  console.log('🧪 Testando BrAPI...\n');

  // Teste 1: Cotação única
  console.log('1️⃣ Cotação PETR4:');
  const petr4 = await brapiService.getQuote('PETR4');
  console.log(petr4);

  // Teste 2: Cotações em lote
  console.log('\n2️⃣ Cotações em lote:');
  const bulk = await brapiService.getBulkQuotes(['PETR4', 'VALE3', 'HGLG11']);
  console.log(bulk);

  // Teste 3: Mercado aberto?
  console.log('\n3️⃣ Mercado aberto?', brapiService.isMarketOpen());

  return { petr4, bulk };
}

// ============= COINGECKO =============
export async function testCoinGecko() {
  console.log('🧪 Testando CoinGecko...\n');

  // Teste 1: Preço BTC
  console.log('1️⃣ Preço Bitcoin:');
  const btc = await coinGeckoService.getPrice('bitcoin', 'brl');
  console.log(btc);

  // Teste 2: Preços em lote
  console.log('\n2️⃣ Preços em lote:');
  const bulk = await coinGeckoService.getBulkPrices(['bitcoin', 'ethereum'], 'brl');
  console.log(bulk);

  // Teste 3: Conversão símbolo
  console.log('\n3️⃣ Conversão BTC → bitcoin:');
  const coinId = coinGeckoService.getCoinId('BTC');
  console.log(coinId);

  return { btc, bulk };
}

// ============= TESOURO DIRETO =============
export async function testTesouro() {
  console.log('🧪 Testando Tesouro Direto...\n');

  // Teste 1: Todos os títulos
  console.log('1️⃣ Todos os títulos:');
  const all = await tesouroDiretoService.getAllBonds();
  console.log(all);

  // Teste 2: Buscar por nome
  console.log('\n2️⃣ Tesouro IPCA+:');
  const ipca = await tesouroDiretoService.getBondByName('IPCA+ 2029');
  console.log(ipca);

  // Teste 3: Simulação
  console.log('\n3️⃣ Simulação R$ 10.000 por 12 meses a 6% a.a.:');
  const sim = tesouroDiretoService.simulateInvestment(3450, 10000, 6, 12);
  console.log(sim);

  return { all, ipca, sim };
}

// ============= BANCO CENTRAL =============
export async function testBCB() {
  console.log('🧪 Testando Banco Central...\n');

  // Teste 1: Dólar
  console.log('1️⃣ Cotação Dólar:');
  const usd = await bancoCentralService.getDollarQuote();
  console.log(usd);

  // Teste 2: SELIC
  console.log('\n2️⃣ Taxa SELIC:');
  const selic = await bancoCentralService.getSelicRate();
  console.log(selic);

  // Teste 3: Todos indicadores
  console.log('\n3️⃣ Todos indicadores:');
  const all = await bancoCentralService.getAllIndicators();
  console.log(all);

  return { usd, selic, all };
}

// ============= TESTE COMPLETO =============
export async function testAllServices() {
  console.log('🚀 TESTANDO TODOS OS SERVIÇOS\n');
  console.log('='.repeat(50));

  try {
    const brapi = await testBrapi();
    console.log('\n' + '='.repeat(50));

    const coingecko = await testCoinGecko();
    console.log('\n' + '='.repeat(50));

    const tesouro = await testTesouro();
    console.log('\n' + '='.repeat(50));

    const bcb = await testBCB();
    console.log('\n' + '='.repeat(50));

    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS!');

    return { brapi, coingecko, tesouro, bcb };
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    throw error;
  }
}

// Exportar para uso no console
if (typeof window !== 'undefined') {
  (window as any).testAPI = {
    testBrapi,
    testCoinGecko,
    testTesouro,
    testBCB,
    testAllServices,
  };

  console.log('💡 Testes disponíveis no console:');
  console.log('   window.testAPI.testBrapi()');
  console.log('   window.testAPI.testCoinGecko()');
  console.log('   window.testAPI.testTesouro()');
  console.log('   window.testAPI.testBCB()');
  console.log('   window.testAPI.testAllServices()');
}
