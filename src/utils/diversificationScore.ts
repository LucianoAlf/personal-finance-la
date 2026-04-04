// SPRINT 5: Cálculo do Score de Diversificação (0-100)
// 4 critérios: Classes de Ativos, Concentração, Número de Ativos, Geografia

export interface Investment {
  id: string;
  category: string;
  current_value: number;
  ticker?: string;
}

export interface DiversificationBreakdown {
  assetClasses: number; // 0-30 pontos
  concentration: number; // 0-30 pontos
  numAssets: number; // 0-20 pontos
  geography: number; // 0-20 pontos
}

export interface DiversificationResult {
  score: number; // 0-100
  breakdown: DiversificationBreakdown;
  recommendations: string[];
  details: {
    totalClasses: number;
    maxConcentration: number;
    maxConcentrationTicker: string;
    totalAssets: number;
    hasInternational: boolean;
  };
}

/**
 * Calcula o score de diversificação do portfólio
 * @param investments - Lista de investimentos do usuário
 * @returns Score de 0-100 com breakdown e recomendações
 */
export function calculateDiversificationScore(
  investments: Investment[]
): DiversificationResult {
  // Validação
  if (!investments || investments.length === 0) {
    return {
      score: 0,
      breakdown: {
        assetClasses: 0,
        concentration: 0,
        numAssets: 0,
        geography: 0,
      },
      recommendations: ['Comece a investir para melhorar sua diversificação'],
      details: {
        totalClasses: 0,
        maxConcentration: 0,
        maxConcentrationTicker: '',
        totalAssets: 0,
        hasInternational: false,
      },
    };
  }

  const breakdown: DiversificationBreakdown = {
    assetClasses: 0,
    concentration: 0,
    numAssets: 0,
    geography: 0,
  };

  const recommendations: string[] = [];

  // Calcular valor total
  const totalValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);

  // 1. DIVERSIFICAÇÃO POR CLASSE DE ATIVO (30 pontos)
  const classes = new Set(investments.map((inv) => inv.category)).size;
  const totalClasses = classes;

  // Classes ideais: 6 (renda_fixa, acoes_nacionais, fiis, internacional, cripto, previdencia)
  breakdown.assetClasses = Math.min((classes / 6) * 30, 30);

  if (classes < 3) {
    recommendations.push(
      `Diversifique em mais classes de ativos (atual: ${classes}, ideal: 3+)`
    );
  }

  // 2. CONCENTRAÇÃO (30 pontos) - penalizar se > 30% em um ativo
  const concentrations = investments.map((inv) => ({
    ticker: inv.ticker || inv.id.substring(0, 8),
    percentage: (inv.current_value / totalValue) * 100,
  }));

  const maxConcentration = Math.max(...concentrations.map((c) => c.percentage));
  const maxConcentrationAsset = concentrations.find(
    (c) => c.percentage === maxConcentration
  );

  // Se concentração <= 30%, ganha pontos proporcionais
  // Se concentração > 30%, perde pontos proporcionalmente
  if (maxConcentration <= 30) {
    breakdown.concentration = 30;
  } else {
    // Penalidade gradual: 50% = 15 pts, 70% = 5 pts, 100% = 0 pts
    breakdown.concentration = Math.max(0, 30 - (maxConcentration - 30) * 0.75);
  }

  if (maxConcentration > 30) {
    recommendations.push(
      `Reduzir concentração em ${maxConcentrationAsset?.ticker} (${maxConcentration.toFixed(1)}% do portfólio)`
    );
  }

  // 3. NÚMERO DE ATIVOS (20 pontos)
  const numAssets = investments.length;

  // Ideal: 10+ ativos para boa diversificação
  breakdown.numAssets = Math.min((numAssets / 10) * 20, 20);

  if (numAssets < 5) {
    recommendations.push(
      `Adicionar mais ativos ao portfólio (atual: ${numAssets}, ideal: 5+)`
    );
  }

  // 4. DIVERSIFICAÇÃO GEOGRÁFICA (20 pontos)
  const hasInternational = investments.some((inv) => inv.category === 'internacional');

  breakdown.geography = hasInternational ? 20 : 0;

  if (!hasInternational) {
    recommendations.push('Considerar exposição internacional (ETFs, BDRs, etc.)');
  }

  // CALCULAR SCORE FINAL
  const score = Math.round(
    breakdown.assetClasses +
      breakdown.concentration +
      breakdown.numAssets +
      breakdown.geography
  );

  return {
    score,
    breakdown,
    recommendations,
    details: {
      totalClasses,
      maxConcentration,
      maxConcentrationTicker: maxConcentrationAsset?.ticker || '',
      totalAssets: numAssets,
      hasInternational,
    },
  };
}

/**
 * Retorna label pt-BR para cada critério
 */
export function getDiversificationLabel(key: keyof DiversificationBreakdown): string {
  const labels: Record<keyof DiversificationBreakdown, string> = {
    assetClasses: 'Classes de Ativos',
    concentration: 'Concentração',
    numAssets: 'Número de Ativos',
    geography: 'Diversificação Geográfica',
  };

  return labels[key];
}

/**
 * Retorna pontuação máxima de cada critério
 */
export function getMaxPoints(key: keyof DiversificationBreakdown): number {
  const maxPoints: Record<keyof DiversificationBreakdown, number> = {
    assetClasses: 30,
    concentration: 30,
    numAssets: 20,
    geography: 20,
  };

  return maxPoints[key];
}

/**
 * Retorna cor baseada no score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Retorna descrição baseada no score
 */
export function getScoreDescription(score: number): string {
  if (score >= 80) return 'Excelente diversificação!';
  if (score >= 60) return 'Boa diversificação';
  if (score >= 40) return 'Diversificação moderada';
  if (score >= 20) return 'Diversificação baixa';
  return 'Portfólio concentrado';
}
