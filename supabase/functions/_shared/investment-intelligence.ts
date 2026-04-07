import { filterInvestmentOpportunitiesBySuitability } from '../../../src/utils/education/investor-suitability.ts';
import { deriveTrustedInvestorAssessment } from './education-profile.ts';

type IntelligenceSource =
  | 'external_market'
  | 'internal_calculation'
  | 'database_state'
  | 'ai_interpretation'
  | 'unavailable';

type IntelligenceCompleteness = 'complete' | 'partial' | 'unavailable';

interface IntelligenceSectionQuality {
  source: IntelligenceSource;
  completeness: IntelligenceCompleteness;
}

interface InvestmentRow {
  id: string;
  user_id: string;
  name: string;
  ticker: string | null;
  type: string;
  category: string | null;
  quantity: number | null;
  purchase_price: number | null;
  current_price: number | null;
  total_invested: number | null;
  current_value: number | null;
  dividend_yield?: number | null;
  updated_at?: string | null;
}

interface AllocationTargetRow {
  id: string;
  asset_class: string;
  target_percentage: number;
}

interface InvestmentGoalRow {
  id: string;
  name: string;
  category: string;
  current_amount: number | null;
  target_amount: number;
  monthly_contribution: number | null;
  expected_return_rate: number | null;
  target_date: string;
  status?: string | null;
}

interface BadgeProgressRow {
  badge_id: string;
  unlocked: boolean;
}

interface UserGamificationRow {
  level: number;
  xp: number;
  total_xp: number;
  current_streak: number;
  best_streak: number;
}

interface InvestorAssessmentRow {
  profile_key: string | null;
  confidence: number | null;
  effective_at?: string | null;
  explanation?: string | null;
  questionnaire_version?: number | null;
  answers?: Record<string, unknown> | null;
}

interface BenchmarkItem {
  name: string;
  return: number;
  type: string;
}

export interface CanonicalOpportunityItem {
  ticker: string;
  type: string;
  title: string;
  description: string;
  confidenceScore: number;
  assetClass: string;
  expectedReturn: number | null;
  riskLevel: 'low' | 'medium' | 'high';
  anaSummary: string | null;
  expiresAt: string;
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
  generatedAt: string;
  fingerprint: string;
  portfolio: {
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
    investmentCount: number;
    allocation: Array<{
      assetClass: string;
      label: string;
      value: number;
      percentage: number;
      count: number;
    }>;
    topPerformers: Array<{
      ticker: string;
      returnPercentage: number;
    }>;
    concentrationPercentage: number;
    healthBreakdown: {
      diversification: number;
      concentration: number;
      returns: number;
      risk: number;
      total: number;
    };
  };
  market: {
    benchmarkPeriod: '1Y';
    benchmarks: BenchmarkItem[];
  };
  planning: {
    selectedGoal: null | {
      id: string;
      name: string;
      category: string;
      currentAmount: number;
      targetAmount: number;
      monthlyContribution: number;
      expectedReturnRate: number;
      yearsToGoal: number;
      projectedGap: number;
    };
  };
  opportunities: {
    items: CanonicalOpportunityItem[];
  };
  rebalance: {
    isBalanced: boolean;
    totalAllocated: number;
    actions: CanonicalRebalanceAction[];
  };
  gamification: {
    unlockedCount: number;
    trackedCount: number;
    level: number | null;
    xp: number | null;
    totalXp: number | null;
    currentStreak: number | null;
    bestStreak: number | null;
  };
  ana: {
    cached: boolean;
    insight: string | null;
    strengths: string[];
    warnings: string[];
    recommendations: Array<{ title: string; description: string; priority: string }>;
    nextSteps: string[];
  };
  quality: Record<string, IntelligenceSectionQuality>;
}

export async function buildInvestmentIntelligenceContext({
  supabase,
  userId,
  supabaseUrl,
}: {
  supabase: any;
  userId: string;
  supabaseUrl?: string;
}): Promise<InvestmentIntelligenceContext> {
  const [
    { data: investmentsData },
    { data: targetsData },
    { data: goalsData },
    { data: badgesData },
    { data: gamificationData },
    { data: cachedAnaData },
    { data: investorAssessmentData },
  ] = await Promise.all([
    supabase
      .from('investments')
      .select('id, user_id, name, ticker, type, category, quantity, purchase_price, current_price, total_invested, current_value, dividend_yield, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('investment_allocation_targets')
      .select('id, asset_class, target_percentage')
      .eq('user_id', userId)
      .order('asset_class'),
    supabase
      .from('investment_goals')
      .select('id, name, category, current_amount, target_amount, monthly_contribution, expected_return_rate, target_date, status')
      .eq('user_id', userId)
      .order('target_date'),
    supabase
      .from('badge_progress')
      .select('badge_id, unlocked')
      .eq('user_id', userId),
    supabase
      .from('user_gamification')
      .select('level, xp, total_xp, current_streak, best_streak')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('ana_insights_cache')
      .select('insights, expires_at')
      .eq('user_id', userId)
      .eq('insight_type', 'investment')
      .maybeSingle(),
    supabase
      .from('investor_profile_assessments')
      .select('profile_key, confidence, effective_at, explanation, questionnaire_version, answers')
      .eq('user_id', userId)
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const investments = (investmentsData || []) as InvestmentRow[];
  const targets = (targetsData || []) as AllocationTargetRow[];
  const goals = (goalsData || []) as InvestmentGoalRow[];
  const badges = (badgesData || []) as BadgeProgressRow[];
  const profile = (gamificationData || null) as UserGamificationRow | null;
  const investorAssessment = (investorAssessmentData || null) as InvestorAssessmentRow | null;
  const trustedInvestorAssessment = deriveTrustedInvestorAssessment(investorAssessment);
  const benchmarks = supabaseUrl ? await fetchBenchmarksSnapshot(supabaseUrl) : [];

  const totalInvested = investments.reduce((sum, investment) => sum + resolveTotalInvested(investment), 0);
  const currentValue = investments.reduce((sum, investment) => sum + resolveCurrentValue(investment), 0);
  const totalReturn = currentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const allocationMap = new Map<string, { value: number; count: number }>();
  const performerList: Array<{ ticker: string; returnPercentage: number }> = [];

  for (const investment of investments) {
    const bucket = toAllocationBucket(investment.category, investment.type);
    const current = resolveCurrentValue(investment);
    const invested = resolveTotalInvested(investment);
    const gainPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;

    const aggregate = allocationMap.get(bucket) || { value: 0, count: 0 };
    aggregate.value += current;
    aggregate.count += 1;
    allocationMap.set(bucket, aggregate);

    performerList.push({
      ticker: investment.ticker || investment.name,
      returnPercentage: gainPct,
    });
  }

  const allocation = Array.from(allocationMap.entries()).map(([assetClass, data]) => ({
    assetClass,
    label: formatAssetClass(assetClass),
    value: data.value,
    percentage: currentValue > 0 ? (data.value / currentValue) * 100 : 0,
    count: data.count,
  }));

  const concentrationPercentage = allocation.reduce((max, item) => Math.max(max, item.percentage), 0);
  const healthBreakdown = buildHealthBreakdown({
    allocation,
    returnPercentage,
    concentrationPercentage,
  });

  const selectedGoal = selectPrimaryGoal(goals, currentValue);
  const rebalance = buildRebalance(actionsInputFromAllocation(allocation), targets, currentValue);
  const opportunities = filterInvestmentOpportunitiesBySuitability(
    buildDeterministicOpportunities({
      allocation,
      investments,
      currentValue,
      concentrationPercentage,
    }),
    trustedInvestorAssessment.profileKey,
    trustedInvestorAssessment.questionnaireComplete,
  );
  const anaCache = extractAnaCache(cachedAnaData);

  const context: InvestmentIntelligenceContext = {
    generatedAt: new Date().toISOString(),
    fingerprint: '',
    portfolio: {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      investmentCount: investments.length,
      allocation,
      topPerformers: performerList.sort((a, b) => b.returnPercentage - a.returnPercentage).slice(0, 3),
      concentrationPercentage,
      healthBreakdown,
    },
    market: {
      benchmarkPeriod: '1Y',
      benchmarks,
    },
    planning: {
      selectedGoal,
    },
    opportunities: {
      items: opportunities,
    },
    rebalance,
    gamification: {
      unlockedCount: badges.filter((badge) => badge.unlocked).length,
      trackedCount: badges.length,
      level: profile?.level ?? null,
      xp: profile?.xp ?? null,
      totalXp: profile?.total_xp ?? null,
      currentStreak: profile?.current_streak ?? null,
      bestStreak: profile?.best_streak ?? null,
    },
    ana: anaCache,
    quality: {
      portfolio: {
        source: 'database_state',
        completeness: 'complete',
      },
      market: {
        source: benchmarks.length > 0 ? 'external_market' : 'unavailable',
        completeness: benchmarks.length >= 3 ? 'complete' : benchmarks.length > 0 ? 'partial' : 'unavailable',
      },
      planning: {
        source: selectedGoal ? 'internal_calculation' : 'unavailable',
        completeness: selectedGoal ? 'complete' : 'unavailable',
      },
      opportunities: {
        source: 'internal_calculation',
        completeness: 'complete',
      },
      rebalance: {
        source: targets.length > 0 ? 'internal_calculation' : 'unavailable',
        completeness: targets.length > 0 ? 'complete' : 'unavailable',
      },
      gamification: {
        source: badges.length > 0 || profile ? 'database_state' : 'unavailable',
        completeness: badges.length > 0 || profile ? 'complete' : 'unavailable',
      },
      ana: {
        source: anaCache.cached ? 'ai_interpretation' : 'unavailable',
        completeness: anaCache.cached ? 'partial' : 'unavailable',
      },
    },
  };

  context.fingerprint = stableStringify({
    portfolio: context.portfolio,
    market: context.market,
    planning: context.planning,
    opportunities: context.opportunities,
    rebalance: context.rebalance,
    gamification: context.gamification,
  });

  return context;
}

async function fetchBenchmarksSnapshot(supabaseUrl: string): Promise<BenchmarkItem[]> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-benchmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ period: '1Y' }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.benchmarks) ? data.benchmarks : [];
  } catch (_) {
    return [];
  }
}

function resolveTotalInvested(investment: InvestmentRow) {
  if (typeof investment.total_invested === 'number' && !Number.isNaN(investment.total_invested)) {
    return investment.total_invested;
  }

  return Number(investment.quantity || 0) * Number(investment.purchase_price || 0);
}

function resolveCurrentValue(investment: InvestmentRow) {
  if (typeof investment.current_value === 'number' && !Number.isNaN(investment.current_value)) {
    return investment.current_value;
  }

  return Number(investment.quantity || 0) * Number(investment.current_price || investment.purchase_price || 0);
}

function toAllocationBucket(category: string | null, type: string) {
  switch (category) {
    case 'fixed_income':
    case 'renda_fixa':
      return 'renda_fixa';
    case 'stock':
    case 'acoes_nacionais':
      return 'acoes_nacionais';
    case 'reit':
    case 'fiis':
      return 'fiis';
    case 'international':
    case 'internacional':
      return 'internacional';
    case 'crypto':
    case 'cripto':
      return 'cripto';
    case 'pension':
    case 'previdencia':
      return 'previdencia';
    default:
      break;
  }

  switch (type) {
    case 'treasury':
      return 'renda_fixa';
    case 'real_estate':
      return 'fiis';
    case 'crypto':
      return 'cripto';
    case 'stock':
      return 'acoes_nacionais';
    default:
      return 'outros';
  }
}

function formatAssetClass(assetClass: string) {
  const labels: Record<string, string> = {
    renda_fixa: 'Renda Fixa',
    acoes_nacionais: 'Ações Nacionais',
    fiis: 'FIIs',
    internacional: 'Internacional',
    cripto: 'Criptomoedas',
    previdencia: 'Previdência',
    outros: 'Outros',
  };

  return labels[assetClass] || assetClass;
}

function buildHealthBreakdown({
  allocation,
  returnPercentage,
  concentrationPercentage,
}: {
  allocation: Array<{ percentage: number }>;
  returnPercentage: number;
  concentrationPercentage: number;
}) {
  const categoryCount = allocation.filter((item) => item.percentage > 0).length;
  const diversification = Math.min(30, categoryCount * 6);

  let concentration = 0;
  if (concentrationPercentage <= 20) concentration = 25;
  else if (concentrationPercentage <= 30) concentration = 18;
  else if (concentrationPercentage <= 40) concentration = 10;

  let returns = 0;
  if (returnPercentage >= 15) returns = 25;
  else if (returnPercentage >= 10) returns = 20;
  else if (returnPercentage >= 5) returns = 15;
  else if (returnPercentage >= 0) returns = 10;
  else if (returnPercentage >= -5) returns = 5;

  const risk = concentrationPercentage <= 30 ? 20 : concentrationPercentage <= 50 ? 10 : 0;
  const total = Math.round(diversification + concentration + returns + risk);

  return {
    diversification,
    concentration,
    returns,
    risk,
    total,
  };
}

function selectPrimaryGoal(goals: InvestmentGoalRow[], currentValue: number) {
  const goal = [...goals]
    .filter((item) => item.status !== 'completed')
    .sort((a, b) => a.target_date.localeCompare(b.target_date))[0];

  if (!goal) return null;

  const currentAmount = Number(goal.current_amount ?? currentValue);
  const targetAmount = Number(goal.target_amount || 0);
  const yearsToGoal = Math.max(1, new Date(goal.target_date).getFullYear() - new Date().getFullYear());

  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    currentAmount,
    targetAmount,
    monthlyContribution: Number(goal.monthly_contribution || 0),
    expectedReturnRate: Number(goal.expected_return_rate || 0),
    yearsToGoal,
    projectedGap: Math.max(0, targetAmount - currentAmount),
  };
}

function actionsInputFromAllocation(allocation: Array<{ assetClass: string; percentage: number; value: number }>) {
  return allocation.map((item) => ({
    assetClass: item.assetClass,
    percentage: item.percentage,
    value: item.value,
  }));
}

function buildRebalance(
  currentAllocation: Array<{ assetClass: string; percentage: number; value: number }>,
  targets: AllocationTargetRow[],
  totalValue: number,
) {
  if (targets.length === 0 || totalValue <= 0) {
    return {
      isBalanced: false,
      totalAllocated: targets.reduce((sum, target) => sum + Number(target.target_percentage || 0), 0),
      actions: [] as CanonicalRebalanceAction[],
    };
  }

  const currentMap = new Map(currentAllocation.map((item) => [item.assetClass, item]));
  const actions: CanonicalRebalanceAction[] = [];
  const threshold = 5;

  for (const target of targets) {
    const current = currentMap.get(target.asset_class);
    const currentPct = current?.percentage || 0;
    const targetPct = Number(target.target_percentage || 0);
    const diff = targetPct - currentPct;

    if (Math.abs(diff) > threshold) {
      actions.push({
        assetClass: formatAssetClass(target.asset_class),
        action: diff > 0 ? 'BUY' : 'SELL',
        amount: (Math.abs(diff) / 100) * totalValue,
        percentage: Math.abs(diff),
        currentPercentage: currentPct,
        targetPercentage: targetPct,
        reason: `Alocação atual: ${currentPct.toFixed(1)}%, Meta: ${targetPct.toFixed(1)}%`,
      });
    }
  }

  return {
    isBalanced: actions.length === 0,
    totalAllocated: targets.reduce((sum, target) => sum + Number(target.target_percentage || 0), 0),
    actions: actions.sort((a, b) => b.percentage - a.percentage),
  };
}

function buildDeterministicOpportunities({
  allocation,
  investments,
  currentValue,
  concentrationPercentage,
}: {
  allocation: Array<{ assetClass: string; percentage: number }>;
  investments: InvestmentRow[];
  currentValue: number;
  concentrationPercentage: number;
}) {
  const allocationMap = new Map(allocation.map((item) => [item.assetClass, item.percentage]));
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const opportunities: CanonicalOpportunityItem[] = [];

  const fixedIncomePct = allocationMap.get('renda_fixa') || 0;
  if (fixedIncomePct < 30) {
    opportunities.push({
      ticker: 'TESOURO_SELIC',
      type: 'buy_opportunity',
      title: 'Renda fixa abaixo do recomendado',
      description: `Sua alocação em renda fixa está em ${fixedIncomePct.toFixed(1)}%. Considere aumentar para pelo menos 30% com ativos conservadores.`,
      confidenceScore: 85,
      assetClass: 'renda_fixa',
      expectedReturn: null,
      riskLevel: 'low',
      anaSummary: 'Diversificação: aumentar renda fixa reduz volatilidade da carteira.',
      expiresAt: expiresAt.toISOString(),
    });
  }

  const fiiPct = allocationMap.get('fiis') || 0;
  if (fiiPct === 0) {
    opportunities.push({
      ticker: 'FII',
      type: 'buy_opportunity',
      title: 'Diversifique com Fundos Imobiliários',
      description: 'Você não possui FIIs no portfólio. Eles podem complementar renda passiva e diversificação.',
      confidenceScore: 75,
      assetClass: 'fiis',
      expectedReturn: 9.5,
      riskLevel: 'medium',
      anaSummary: 'Renda passiva: FIIs podem diversificar a carteira com fluxo recorrente.',
      expiresAt: expiresAt.toISOString(),
    });
  }

  if (concentrationPercentage > 30) {
    opportunities.push({
      ticker: 'PORTFOLIO',
      type: 'sell_signal',
      title: 'Atenção: Concentração alta em um ativo',
      description: `Você tem ${concentrationPercentage.toFixed(1)}% do portfólio concentrado em um único eixo. Isso aumenta o risco específico.`,
      confidenceScore: 90,
      assetClass: 'acoes_nacionais',
      expectedReturn: null,
      riskLevel: 'high',
      anaSummary: 'Risco: concentração elevada limita diversificação e aumenta volatilidade.',
      expiresAt: expiresAt.toISOString(),
    });
  }

  const internationalPct = allocationMap.get('internacional') || 0;
  if (internationalPct === 0 && currentValue > 10000) {
    opportunities.push({
      ticker: 'IVVB11',
      type: 'buy_opportunity',
      title: 'Considere exposição internacional',
      description: 'Uma parcela internacional pode reduzir risco local e ampliar diversificação geográfica.',
      confidenceScore: 70,
      assetClass: 'internacional',
      expectedReturn: null,
      riskLevel: 'medium',
      anaSummary: 'Proteção cambial: exposição internacional reduz dependência exclusiva do cenário doméstico.',
      expiresAt: expiresAt.toISOString(),
    });
  }

  const dividendAssets = investments.filter((item) => Number(item.dividend_yield || 0) > 0);
  const averageDividendYield = dividendAssets.length > 0
    ? dividendAssets.reduce((sum, item) => sum + Number(item.dividend_yield || 0), 0) / dividendAssets.length
    : 0;
  const equitiesPct = allocationMap.get('acoes_nacionais') || 0;

  if (equitiesPct > 0 && averageDividendYield > 0 && averageDividendYield < 5) {
    opportunities.push({
      ticker: 'DIVIDENDOS',
      type: 'dividend_alert',
      title: 'Aumente sua renda passiva com dividendos',
      description: `Seu dividend yield médio está em ${averageDividendYield.toFixed(1)}%. Há espaço para melhorar a renda passiva da carteira.`,
      confidenceScore: 80,
      assetClass: 'acoes_nacionais',
      expectedReturn: null,
      riskLevel: 'low',
      anaSummary: 'Renda passiva: revisar a fatia de proventos pode melhorar sustentabilidade da carteira.',
      expiresAt: expiresAt.toISOString(),
    });
  }

  return opportunities;
}

function extractAnaCache(row: any) {
  const isValid = row?.expires_at ? new Date(row.expires_at).getTime() > Date.now() : false;
  const insights = isValid ? (row?.insights || {}) : {};

  return {
    cached: Boolean(isValid && insights?.mainInsight),
    insight: insights?.mainInsight || null,
    strengths: Array.isArray(insights?.strengths) ? insights.strengths : [],
    warnings: Array.isArray(insights?.warnings) ? insights.warnings : [],
    recommendations: Array.isArray(insights?.recommendations) ? insights.recommendations : [],
    nextSteps: Array.isArray(insights?.nextSteps) ? insights.nextSteps : [],
  };
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    return Object.keys(input)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(input[key]);
        return acc;
      }, {});
  }

  return value;
}
