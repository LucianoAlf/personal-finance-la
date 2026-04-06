export type PlanningStatus = 'realista' | 'insuficiente' | 'agressivo';

export interface PlanningScenario {
  label: 'conservador' | 'base' | 'otimista';
  projectedAmount: number;
  status: PlanningStatus;
}

export interface InvestmentPlanningInput {
  currentAmount: number;
  monthlyContribution: number;
  annualReturnRate: number;
  inflationRate: number;
  annualTaxRate: number;
  annualFeeRate: number;
  yearsToGoal: number;
  targetAmountToday?: number;
  desiredMonthlyIncomeToday?: number;
  withdrawalRate: number;
}

export interface InvestmentPlanningResult {
  yearsToGoal: number;
  netAnnualReturnRate: number;
  realAnnualReturnRate: number;
  inflationFactor: number;
  targetAmountFuture: number;
  desiredMonthlyIncomeFuture: number;
  requiredCapital: number;
  projectedAmount: number;
  projectedRealAmount: number;
  requiredMonthlyContribution: number;
  currentGap: number;
  projectedGap: number;
  status: PlanningStatus;
  scenarios: PlanningScenario[];
}

export function calculateInvestmentPlan(input: InvestmentPlanningInput): InvestmentPlanningResult {
  const yearsToGoal = Math.max(1, Number(input.yearsToGoal || 0));
  const months = yearsToGoal * 12;
  const currentAmount = Math.max(0, Number(input.currentAmount || 0));
  const monthlyContribution = Math.max(0, Number(input.monthlyContribution || 0));
  const inflationRate = Math.max(0, Number(input.inflationRate || 0));
  const taxRate = Math.max(0, Number(input.annualTaxRate || 0));
  const feeRate = Math.max(0, Number(input.annualFeeRate || 0));
  const grossReturnRate = Number(input.annualReturnRate || 0);
  const withdrawalRate = Math.max(0.1, Number(input.withdrawalRate || 0));
  const netAnnualReturnRate = grossReturnRate - taxRate - feeRate;
  const inflationFactor = Math.pow(1 + inflationRate / 100, yearsToGoal);
  const realAnnualReturnRate = ((1 + netAnnualReturnRate / 100) / (1 + inflationRate / 100) - 1) * 100;
  const targetAmountFuture = Math.max(0, Number(input.targetAmountToday || 0)) * inflationFactor;
  const desiredMonthlyIncomeFuture = Math.max(0, Number(input.desiredMonthlyIncomeToday || 0)) * inflationFactor;
  const requiredCapitalForIncome = desiredMonthlyIncomeFuture > 0
    ? (desiredMonthlyIncomeFuture * 12) / (withdrawalRate / 100)
    : 0;
  const requiredCapital = Math.max(targetAmountFuture, requiredCapitalForIncome);
  const projectedAmount = projectFutureValue(currentAmount, monthlyContribution, netAnnualReturnRate, months);
  const projectedRealAmount = inflationFactor > 0 ? projectedAmount / inflationFactor : projectedAmount;
  const requiredMonthlyContribution = requiredCapital > 0
    ? solveRequiredMonthlyContribution(currentAmount, netAnnualReturnRate, months, requiredCapital)
    : 0;
  const currentGap = Math.max(0, requiredCapital - currentAmount);
  const projectedGap = Math.max(0, requiredCapital - projectedAmount);
  const scenarios: PlanningScenario[] = [
    {
      label: 'conservador',
      projectedAmount: projectFutureValue(currentAmount, monthlyContribution, netAnnualReturnRate - 2, months),
      status: classifyPlanningStatus(
        monthlyContribution,
        solveRequiredMonthlyContribution(currentAmount, netAnnualReturnRate - 2, months, requiredCapital),
        projectFutureValue(currentAmount, monthlyContribution, netAnnualReturnRate - 2, months),
        requiredCapital
      ),
    },
    {
      label: 'base',
      projectedAmount,
      status: classifyPlanningStatus(monthlyContribution, requiredMonthlyContribution, projectedAmount, requiredCapital),
    },
    {
      label: 'otimista',
      projectedAmount: projectFutureValue(currentAmount, monthlyContribution, netAnnualReturnRate + 2, months),
      status: classifyPlanningStatus(
        monthlyContribution,
        solveRequiredMonthlyContribution(currentAmount, netAnnualReturnRate + 2, months, requiredCapital),
        projectFutureValue(currentAmount, monthlyContribution, netAnnualReturnRate + 2, months),
        requiredCapital
      ),
    },
  ];

  return {
    yearsToGoal,
    netAnnualReturnRate: round(netAnnualReturnRate),
    realAnnualReturnRate: round(realAnnualReturnRate),
    inflationFactor: round(inflationFactor, 4),
    targetAmountFuture: round(targetAmountFuture),
    desiredMonthlyIncomeFuture: round(desiredMonthlyIncomeFuture),
    requiredCapital: round(requiredCapital),
    projectedAmount: round(projectedAmount),
    projectedRealAmount: round(projectedRealAmount),
    requiredMonthlyContribution: round(requiredMonthlyContribution),
    currentGap: round(currentGap),
    projectedGap: round(projectedGap),
    status: classifyPlanningStatus(monthlyContribution, requiredMonthlyContribution, projectedAmount, requiredCapital),
    scenarios: scenarios.map((scenario) => ({
      ...scenario,
      projectedAmount: round(scenario.projectedAmount),
    })),
  };
}

function projectFutureValue(
  initialAmount: number,
  monthlyContribution: number,
  annualReturnRate: number,
  months: number
): number {
  if (months <= 0) return initialAmount;

  const monthlyRate = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;
  let balance = initialAmount;

  for (let month = 0; month < months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return Math.max(0, balance);
}

function solveRequiredMonthlyContribution(
  initialAmount: number,
  annualReturnRate: number,
  months: number,
  targetAmount: number
): number {
  if (targetAmount <= initialAmount || months <= 0) return 0;

  let low = 0;
  let high = Math.max(targetAmount, 1000);

  while (projectFutureValue(initialAmount, high, annualReturnRate, months) < targetAmount) {
    high *= 2;
    if (high > targetAmount * 10) break;
  }

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const mid = (low + high) / 2;
    const projected = projectFutureValue(initialAmount, mid, annualReturnRate, months);

    if (projected >= targetAmount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

function classifyPlanningStatus(
  currentContribution: number,
  requiredContribution: number,
  projectedAmount: number,
  requiredCapital: number
): PlanningStatus {
  if (requiredCapital <= 0 || projectedAmount >= requiredCapital) {
    return 'realista';
  }

  const safeCurrentContribution = Math.max(1, currentContribution);
  const ratio = requiredContribution / safeCurrentContribution;

  if (ratio <= 1.5) {
    return 'insuficiente';
  }

  return 'agressivo';
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
