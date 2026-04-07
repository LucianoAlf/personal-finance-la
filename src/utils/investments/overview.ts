type InvestmentType = 'stock' | 'fund' | 'treasury' | 'crypto' | 'real_estate' | 'other';

interface OverviewInvestmentLike {
  id: string;
  name: string;
  ticker: string | null;
  type: InvestmentType;
}

interface OverviewGoalLike {
  id: string;
  name?: string | null;
  status?: string | null;
  target_date: string;
  target_amount: number;
  monthly_contribution?: number | null;
  expected_return_rate?: number | null;
  category?: string | null;
  current_amount?: number | null;
  metrics?: {
    effective_current_amount?: number | null;
  } | null;
}

interface OverviewMetricsLike {
  currentValue: number;
}

interface BuildPlanningDefaultsInput {
  goals: OverviewGoalLike[];
  metrics: OverviewMetricsLike;
  selectedGoalId: string | null;
}

export function buildInvestmentPriceItems(investments: OverviewInvestmentLike[]) {
  return investments.map((investment) => ({
    ticker: investment.ticker || investment.name,
    type:
      investment.type === 'stock' || investment.type === 'real_estate'
        ? ('stock' as const)
        : investment.type === 'crypto'
          ? ('crypto' as const)
          : ('treasury' as const),
    investmentId: investment.id,
  }));
}

export function selectPrimaryInvestmentGoal(
  goals: OverviewGoalLike[],
  selectedGoalId: string | null,
): OverviewGoalLike | null {
  if (selectedGoalId) {
    return goals.find((goal) => goal.id === selectedGoalId) || null;
  }

  const activeGoals = goals.filter((goal) => goal.status !== 'completed');
  if (activeGoals.length === 0) return null;

  return [...activeGoals].sort((a, b) => a.target_date.localeCompare(b.target_date))[0];
}

export function buildOverviewPlanningDefaults({
  goals,
  metrics,
  selectedGoalId,
}: BuildPlanningDefaultsInput) {
  const selectedGoal = selectPrimaryInvestmentGoal(goals, selectedGoalId);
  const planningYears = selectedGoal
    ? Math.max(1, new Date(selectedGoal.target_date).getFullYear() - new Date().getFullYear())
    : 15;

  return {
    selectedGoal,
    currentAmount:
      selectedGoal?.metrics?.effective_current_amount
      ?? selectedGoal?.current_amount
      ?? metrics.currentValue,
    targetAmount: selectedGoal?.target_amount ?? 1_000_000,
    monthlyContribution: selectedGoal?.monthly_contribution ?? 1000,
    annualReturnRate: selectedGoal?.expected_return_rate ?? 8,
    desiredMonthlyIncome: selectedGoal?.category === 'retirement' ? 30000 : 0,
    planningYears,
  };
}

export function shouldRefreshOpportunityFeed({
  latestInvestmentUpdatedAt,
  latestOpportunityCreatedAt,
}: {
  latestInvestmentUpdatedAt?: string | null;
  latestOpportunityCreatedAt?: string | null;
}): boolean {
  if (!latestInvestmentUpdatedAt) return false;
  if (!latestOpportunityCreatedAt) return true;

  return new Date(latestOpportunityCreatedAt).getTime() < new Date(latestInvestmentUpdatedAt).getTime();
}
