export type ReportQualitySource =
  | 'database_state'
  | 'internal_calculation'
  | 'external_market'
  | 'ai_interpretation'
  | 'unavailable';

export type ReportQualityCompleteness = 'complete' | 'partial' | 'unavailable';

export interface ReportSectionQuality {
  source: ReportQualitySource;
  completeness: ReportQualityCompleteness;
}

export const REPORT_INTELLIGENCE_SECTIONS = [
  'overview',
  'cashflow',
  'spending',
  'balanceSheet',
  'obligations',
  'goals',
  'investments',
  'ana',
  'quality',
] as const;

export type ReportSectionKey = (typeof REPORT_INTELLIGENCE_SECTIONS)[number];
export type ReportDataSectionKey = Exclude<ReportSectionKey, 'quality'>;

export interface ReportOverviewSection {
  financialScore: number | null;
  savingsRate: number | null;
  netWorth: number | null;
  goalsReached: number;
  activeGoals: number;
  hasSufficientData: boolean;
}

export interface ReportCashflowSeriesPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
}

export interface ReportCashflowSection {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  monthlySeries: ReportCashflowSeriesPoint[];
  largestIncomeMonth: ReportCashflowSeriesPoint | null;
  largestExpenseMonth: ReportCashflowSeriesPoint | null;
  averageMonthlySavingsRate: number | null;
  trend: 'up' | 'down' | 'stable';
}

export interface ReportSpendingCategory {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  share: number;
  transactionCount: number;
}

export interface ReportSpendingChange {
  month: string;
  amount: number;
  previousAmount: number | null;
  changeAmount: number | null;
  changePercentage: number | null;
}

export interface ReportSpendingTagStat {
  tagId: string;
  tagName: string;
  useCount: number;
}

export interface ReportSpendingSection {
  categoryBreakdown: ReportSpendingCategory[];
  topCategories: ReportSpendingCategory[];
  monthOverMonthChanges: ReportSpendingChange[];
  uncategorizedShare: number;
  topTags: ReportSpendingTagStat[];
}

export interface ReportBalanceSheetBucket {
  label: string;
  amount: number;
  share: number;
}

export interface ReportBalanceSheetHistoryPoint {
  month: string;
  netWorth: number;
}

export interface ReportBalanceSheetSection {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  netWorthHistory: ReportBalanceSheetHistoryPoint[];
  assetBreakdown: ReportBalanceSheetBucket[];
  liabilityBreakdown: ReportBalanceSheetBucket[];
}

export interface ReportObligationsForecastPoint {
  month: string;
  amount: number;
}

export interface ReportObligationsSection {
  openBillsCount: number;
  overdueBillsCount: number;
  pendingBillsAmount: number;
  creditCardUsed: number;
  creditCardLimit: number;
  creditCardUtilization: number;
  forecastNextMonths: ReportObligationsForecastPoint[];
}

export interface ReportGoalProgressItem {
  id: string;
  name: string;
  type: string;
  status: string;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  deadline: string | null;
  onTrack: boolean | null;
}

export interface ReportGoalsSection {
  active: number;
  completed: number;
  atRisk: number;
  progressByGoal: ReportGoalProgressItem[];
  completionRate: number;
}

export interface ReportInvestmentAllocationItem {
  assetClass: string;
  label: string;
  value: number;
  percentage: number;
}

export interface ReportInvestmentOpportunitySignal {
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
}

export interface ReportInvestmentsSection {
  portfolioValue: number;
  totalReturn: number;
  allocationSummary: ReportInvestmentAllocationItem[];
  opportunitySignals: ReportInvestmentOpportunitySignal[];
  planningHighlights: string[];
}

export interface ReportAnaSection {
  summary: string | null;
  insights: string[];
  risks: string[];
  recommendations: string[];
  nextBestActions: string[];
}

export type ReportQualityMap = Record<ReportDataSectionKey, ReportSectionQuality>;
export const RENDERABLE_REPORT_SECTION_KEYS: Array<Exclude<ReportDataSectionKey, 'ana'>> = [
  'overview',
  'cashflow',
  'spending',
  'balanceSheet',
  'obligations',
  'goals',
  'investments',
] as const;

export interface ReportIntelligenceContext {
  overview: ReportOverviewSection;
  cashflow: ReportCashflowSection | null;
  spending: ReportSpendingSection | null;
  balanceSheet: ReportBalanceSheetSection | null;
  obligations: ReportObligationsSection | null;
  goals: ReportGoalsSection | null;
  investments: ReportInvestmentsSection | null;
  ana: ReportAnaSection | null;
  quality: ReportQualityMap;
}

export function isReportSectionReliable(section: ReportSectionQuality) {
  return section.source !== 'unavailable' && section.completeness === 'complete';
}

export function getReportQualityLabel(source: ReportQualitySource) {
  const labels: Record<ReportQualitySource, string> = {
    database_state: 'Dados do banco',
    internal_calculation: 'Cálculo interno',
    external_market: 'Mercado externo',
    ai_interpretation: 'Interpretação da Ana Clara',
    unavailable: 'Indisponível',
  };

  return labels[source];
}

export function createUnavailableReportSectionQuality(): ReportSectionQuality {
  return {
    source: 'unavailable',
    completeness: 'unavailable',
  };
}

export function createEmptyReportContext(): ReportIntelligenceContext {
  return {
    overview: {
      financialScore: null,
      savingsRate: null,
      netWorth: null,
      goalsReached: 0,
      activeGoals: 0,
      hasSufficientData: false,
    },
    cashflow: null,
    spending: null,
    balanceSheet: null,
    obligations: null,
    goals: null,
    investments: null,
    ana: null,
    quality: {
      overview: createUnavailableReportSectionQuality(),
      cashflow: createUnavailableReportSectionQuality(),
      spending: createUnavailableReportSectionQuality(),
      balanceSheet: createUnavailableReportSectionQuality(),
      obligations: createUnavailableReportSectionQuality(),
      goals: createUnavailableReportSectionQuality(),
      investments: createUnavailableReportSectionQuality(),
      ana: createUnavailableReportSectionQuality(),
    },
  };
}

export function hasRenderableReportData(context: ReportIntelligenceContext) {
  return Boolean(
    context.overview?.hasSufficientData ||
      RENDERABLE_REPORT_SECTION_KEYS.some((key) => {
        const quality = context.quality?.[key];
        return quality ? isReportSectionReliable(quality) : false;
      }),
  );
}
