export type IntelligenceSource =
  | 'external_market'
  | 'internal_calculation'
  | 'database_state'
  | 'ai_interpretation'
  | 'unavailable';

export type IntelligenceCompleteness = 'complete' | 'partial' | 'unavailable';

export interface IntelligenceSectionQuality {
  source: IntelligenceSource;
  completeness: IntelligenceCompleteness;
}

export interface CanonicalOpportunity {
  id?: string;
  type: string;
  title: string;
  description: string;
  confidenceScore: number;
  assetClass: string;
  expectedReturn?: number | null;
  expiresAt?: string;
  anaSummary?: string | null;
}

export interface CanonicalRebalanceAction {
  assetClass: string;
  action: 'BUY' | 'SELL';
  amount: number;
  percentage: number;
  currentPercentage: number;
  targetPercentage: number;
  reason: string;
}

export interface InvestmentIntelligenceContext {
  portfolio?: Record<string, unknown>;
  market?: Record<string, unknown>;
  planning?: Record<string, unknown>;
  opportunities?: {
    items: CanonicalOpportunity[];
  };
  rebalance?: {
    actions: CanonicalRebalanceAction[];
    isBalanced: boolean;
  };
  gamification?: Record<string, unknown>;
  ana?: Record<string, unknown>;
  quality: Record<string, IntelligenceSectionQuality>;
}

export function isMarketSectionReliable(section: IntelligenceSectionQuality) {
  return section.source === 'external_market' && section.completeness === 'complete';
}

export function getSectionProvenanceLabel(source: IntelligenceSource) {
  const labels: Record<IntelligenceSource, string> = {
    external_market: 'Mercado externo',
    internal_calculation: 'Cálculo interno',
    database_state: 'Dados do banco',
    ai_interpretation: 'Interpretação da Ana Clara',
    unavailable: 'Indisponível',
  };

  return labels[source];
}

export function summarizeQualityMatrix(context: InvestmentIntelligenceContext) {
  return Object.entries(context.quality).map(
    ([section, quality]) => `${section}:${quality.source}:${quality.completeness}`
  );
}
