// SPRINT 5: Hook para buscar benchmarks do mercado (CDI, IPCA, IBOV)
// SPRINT 5.1: Atualizado para buscar dados reais via Edge Function
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Benchmark {
  name: string;
  return: number; // Retorno percentual no período
  type: 'fixed_income' | 'inflation' | 'equity' | 'crypto' | 'commodity';
}

type Period = '1M' | '3M' | '6M' | '1Y';

/**
 * Hook para buscar benchmarks do mercado
 * SPRINT 5.1: Atualizado para buscar dados reais via Edge Function
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

  useEffect(() => {
    async function fetchBenchmarks() {
      try {
        // Buscar dados reais via Edge Function
        const { data, error: invokeError } = await supabase.functions.invoke('fetch-benchmarks', {
          body: { period },
        });

        if (invokeError) throw invokeError;
        
        if (data && data.benchmarks) {
          setBenchmarks(data.benchmarks);
        } else {
          throw new Error('Dados inválidos recebidos');
        }
      } catch (err) {
        console.error('Erro ao buscar benchmarks:', err);
        setBenchmarks([]);
      }
    }

    fetchBenchmarks();
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
