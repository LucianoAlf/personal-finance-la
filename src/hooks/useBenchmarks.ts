// SPRINT 5: Hook para buscar benchmarks do mercado (CDI, IPCA, IBOV)
import { useState, useEffect } from 'react';

export interface Benchmark {
  name: string;
  return: number; // Retorno percentual no período
  type: 'fixed_income' | 'inflation' | 'equity';
}

type Period = '1M' | '3M' | '6M' | '1Y';

/**
 * Dados mock dos benchmarks
 * Em produção, esses dados viriam de APIs como:
 * - CDI: Banco Central / B3
 * - IPCA: IBGE
 * - IBOVESPA: B3 / Yahoo Finance / Alpha Vantage
 */
const MOCK_BENCHMARKS: Record<Period, Benchmark[]> = {
  '1M': [
    { name: 'CDI', return: 0.95, type: 'fixed_income' },
    { name: 'IPCA', return: 0.46, type: 'inflation' },
    { name: 'IBOVESPA', return: 2.15, type: 'equity' },
  ],
  '3M': [
    { name: 'CDI', return: 2.89, type: 'fixed_income' },
    { name: 'IPCA', return: 1.24, type: 'inflation' },
    { name: 'IBOVESPA', return: 5.32, type: 'equity' },
  ],
  '6M': [
    { name: 'CDI', return: 5.82, type: 'fixed_income' },
    { name: 'IPCA', return: 2.48, type: 'inflation' },
    { name: 'IBOVESPA', return: 8.47, type: 'equity' },
  ],
  '1Y': [
    { name: 'CDI', return: 11.75, type: 'fixed_income' },
    { name: 'IPCA', return: 4.62, type: 'inflation' },
    { name: 'IBOVESPA', return: 12.34, type: 'equity' },
  ],
};

/**
 * Hook para buscar benchmarks do mercado
 * 
 * @param period - Período para comparação ('1M', '3M', '6M', '1Y')
 * @returns Array de benchmarks com retornos no período
 * 
 * @example
 * const benchmarks = useBenchmarks('1Y');
 * // Retorna: [{ name: 'CDI', return: 11.75, type: 'fixed_income' }, ...]
 */
export function useBenchmarks(period: Period = '1Y'): Benchmark[] {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento assíncrono
    setLoading(true);

    // Em produção, aqui chamaríamos APIs reais:
    // const fetchBenchmarks = async () => {
    //   const cdi = await fetchCDI(period);
    //   const ipca = await fetchIPCA(period);
    //   const ibov = await fetchIBOVESPA(period);
    //   setBenchmarks([cdi, ipca, ibov]);
    // };

    const timer = setTimeout(() => {
      setBenchmarks(MOCK_BENCHMARKS[period]);
      setLoading(false);
    }, 300); // Simular latência de rede

    return () => clearTimeout(timer);
  }, [period]);

  return benchmarks;
}

/**
 * Hook auxiliar para retornar apenas um benchmark específico
 */
export function useBenchmark(name: 'CDI' | 'IPCA' | 'IBOVESPA', period: Period = '1Y'): number {
  const benchmarks = useBenchmarks(period);
  const benchmark = benchmarks.find((b) => b.name === name);
  return benchmark?.return || 0;
}

/**
 * Descrições dos benchmarks para tooltips
 */
export const BENCHMARK_DESCRIPTIONS: Record<string, string> = {
  CDI: 'Certificado de Depósito Interbancário - principal referência para renda fixa',
  IPCA: 'Índice de Preços ao Consumidor Amplo - inflação oficial do Brasil',
  IBOVESPA: 'Índice Bovespa - principal índice da bolsa brasileira (B3)',
};

/**
 * Retorna descrição de um benchmark
 */
export function getBenchmarkDescription(name: string): string {
  return BENCHMARK_DESCRIPTIONS[name] || '';
}
