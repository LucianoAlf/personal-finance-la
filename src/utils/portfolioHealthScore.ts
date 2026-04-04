// SPRINT 4 DIA 3: Portfolio Health Score Calculator
import type { Investment } from '@/types/database.types';

export interface HealthScoreBreakdown {
  total: number; // 0-100
  diversification: number; // 0-30
  allocation: number; // 0-25
  performance: number; // 0-25
  liquidity: number; // 0-20
}

export interface HealthInsight {
  level: 'excellent' | 'good' | 'warning' | 'critical';
  message: string;
  suggestions: string[];
}

/**
 * Calcula o Portfolio Health Score (0-100)
 * Baseado em 4 critérios principais
 */
export function calculatePortfolioHealthScore(
  investments: Investment[],
  targets?: Array<{ asset_class: string; target_percentage: number }>
): { breakdown: HealthScoreBreakdown; insight: HealthInsight } {
  const breakdown: HealthScoreBreakdown = {
    total: 0,
    diversification: 0,
    allocation: 0,
    performance: 0,
    liquidity: 0,
  };

  if (investments.length === 0) {
    return {
      breakdown,
      insight: {
        level: 'warning',
        message: 'Comece a investir para melhorar a saúde do seu portfólio.',
        suggestions: ['Adicione seu primeiro investimento'],
      },
    };
  }

  // 1. DIVERSIFICAÇÃO (30 pontos)
  breakdown.diversification = calculateDiversificationScore(investments);

  // 2. ALOCAÇÃO vs METAS (25 pontos)
  breakdown.allocation = calculateAllocationScore(investments, targets);

  // 3. PERFORMANCE (25 pontos)
  breakdown.performance = calculatePerformanceScore(investments);

  // 4. LIQUIDEZ (20 pontos)
  breakdown.liquidity = calculateLiquidityScore(investments);

  // Total
  breakdown.total = Math.round(
    breakdown.diversification +
      breakdown.allocation +
      breakdown.performance +
      breakdown.liquidity
  );

  // Gerar insight baseado no score
  const insight = generateInsight(breakdown, investments);

  return { breakdown, insight };
}

/**
 * 1. Diversificação (30 pontos)
 * - Número de classes de ativo diferentes
 * - Concentração máxima em um ativo
 */
function calculateDiversificationScore(investments: Investment[]): number {
  let score = 0;

  // 1.1. Número de classes de ativo (15 pontos)
  const categories = new Set(investments.map((inv) => inv.category).filter(Boolean));
  const categoryScore = Math.min((categories.size / 6) * 15, 15); // 6 categorias = 100%
  score += categoryScore;

  // 1.2. Concentração (15 pontos)
  const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  if (totalValue > 0) {
    const maxConcentration =
      Math.max(...investments.map((inv) => (inv.current_value || 0) / totalValue)) * 100;

    if (maxConcentration <= 20) {
      score += 15; // Ideal
    } else if (maxConcentration <= 30) {
      score += 10; // Bom
    } else if (maxConcentration <= 40) {
      score += 5; // Razoável
    }
    // > 40% = 0 pontos
  }

  return score;
}

/**
 * 2. Alocação vs Metas (25 pontos)
 * - Proximidade das metas estabelecidas
 */
function calculateAllocationScore(
  investments: Investment[],
  targets?: Array<{ asset_class: string; target_percentage: number }>
): number {
  if (!targets || targets.length === 0) {
    return 12; // Score neutro se não há metas
  }

  const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  if (totalValue === 0) return 0;

  // Calcular alocação atual
  const currentAllocation: Record<string, number> = {};
  investments.forEach((inv) => {
    const category = inv.category || 'outros';
    const percentage = ((inv.current_value || 0) / totalValue) * 100;
    currentAllocation[category] = (currentAllocation[category] || 0) + percentage;
  });

  // Calcular desvio médio
  let totalDeviation = 0;
  targets.forEach((target) => {
    const current = currentAllocation[target.asset_class] || 0;
    const deviation = Math.abs(target.target_percentage - current);
    totalDeviation += deviation;
  });

  const avgDeviation = totalDeviation / targets.length;

  // Score baseado no desvio
  if (avgDeviation <= 5) {
    return 25; // Excelente
  } else if (avgDeviation <= 10) {
    return 20; // Bom
  } else if (avgDeviation <= 15) {
    return 15; // Razoável
  } else if (avgDeviation <= 20) {
    return 10; // Precisa ajustar
  } else {
    return 5; // Muito desbalanceado
  }
}

/**
 * 3. Performance (25 pontos)
 * - Retorno médio dos investimentos
 */
function calculatePerformanceScore(investments: Investment[]): number {
  const investmentsWithReturn = investments.filter(
    (inv) => inv.total_invested && inv.total_invested > 0
  );

  if (investmentsWithReturn.length === 0) return 0;

  // Calcular retorno médio ponderado
  const totalInvested = investmentsWithReturn.reduce(
    (sum, inv) => sum + (inv.total_invested || 0),
    0
  );
  const totalCurrent = investmentsWithReturn.reduce(
    (sum, inv) => sum + (inv.current_value || inv.total_invested || 0),
    0
  );

  if (totalInvested === 0) return 0;

  const avgReturn = ((totalCurrent - totalInvested) / totalInvested) * 100;

  // Score baseado no retorno
  if (avgReturn >= 15) {
    return 25; // Excelente (>15%)
  } else if (avgReturn >= 10) {
    return 20; // Muito bom (10-15%)
  } else if (avgReturn >= 5) {
    return 15; // Bom (5-10%)
  } else if (avgReturn >= 0) {
    return 10; // Positivo (0-5%)
  } else if (avgReturn >= -5) {
    return 5; // Pequena perda (0 a -5%)
  } else {
    return 0; // Perda significativa (<-5%)
  }
}

/**
 * 4. Liquidez (20 pontos)
 * - Porcentagem em ativos líquidos
 */
function calculateLiquidityScore(investments: Investment[]): number {
  const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  if (totalValue === 0) return 0;

  // Categorias líquidas: ações, FIIs, cripto
  const liquidCategories = ['acoes_nacionais', 'fiis', 'cripto', 'internacional'];
  const liquidValue = investments
    .filter((inv) => liquidCategories.includes(inv.category || ''))
    .reduce((sum, inv) => sum + (inv.current_value || 0), 0);

  const liquidityPercentage = (liquidValue / totalValue) * 100;

  // Score baseado na liquidez
  if (liquidityPercentage >= 60) {
    return 20; // Ideal (>=60%)
  } else if (liquidityPercentage >= 40) {
    return 15; // Bom (40-60%)
  } else if (liquidityPercentage >= 20) {
    return 10; // Razoável (20-40%)
  } else {
    return 5; // Baixa (<20%)
  }
}

/**
 * Gera insight baseado no score
 */
function generateInsight(
  breakdown: HealthScoreBreakdown,
  investments: Investment[]
): HealthInsight {
  const { total } = breakdown;
  const suggestions: string[] = [];

  // Sugestões baseadas em cada critério
  if (breakdown.diversification < 20) {
    suggestions.push('Diversifique em mais classes de ativos');
  }
  if (breakdown.allocation < 15) {
    suggestions.push('Ajuste sua alocação para atingir as metas');
  }
  if (breakdown.performance < 15) {
    suggestions.push('Revise investimentos com baixa performance');
  }
  if (breakdown.liquidity < 10) {
    suggestions.push('Aumente a liquidez do portfólio');
  }

  // Nível e mensagem baseados no score total
  if (total >= 80) {
    return {
      level: 'excellent',
      message: 'Parabéns! Seu portfólio está excelente e bem estruturado.',
      suggestions: suggestions.length > 0 ? suggestions : ['Continue monitorando regularmente'],
    };
  } else if (total >= 60) {
    return {
      level: 'good',
      message: 'Seu portfólio está em boa forma, mas pode melhorar.',
      suggestions,
    };
  } else if (total >= 40) {
    return {
      level: 'warning',
      message: 'Atenção! Seu portfólio precisa de ajustes importantes.',
      suggestions,
    };
  } else {
    return {
      level: 'critical',
      message: 'Seu portfólio precisa de uma reestruturação urgente.',
      suggestions,
    };
  }
}

/**
 * Retorna cor baseada no nível
 */
export function getHealthLevelColor(level: HealthInsight['level']): string {
  switch (level) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'warning':
      return 'text-amber-600';
    case 'critical':
      return 'text-red-600';
  }
}
