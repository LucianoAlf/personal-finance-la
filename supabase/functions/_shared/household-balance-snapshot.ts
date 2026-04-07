export interface HouseholdSnapshotAccount {
  id: string;
  type: string;
  current_balance: number | null;
  include_in_total: boolean | null;
  is_active?: boolean | null;
}

export interface HouseholdSnapshotInvestment {
  id: string;
  current_value: number | null;
  total_invested: number | null;
}

export interface HouseholdSnapshotPayableBill {
  id: string;
  amount: number | null;
  status: string | null;
  due_date?: string | null;
}

export interface HouseholdSnapshotCreditCard {
  id: string;
  credit_limit: number | null;
  available_limit: number | null;
}

export interface HouseholdBalanceSnapshot {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: Array<{ label: string; amount: number; share: number }>;
  liabilityBreakdown: Array<{ label: string; amount: number; share: number }>;
}

export function buildHouseholdBalanceSnapshot({
  referenceDate,
  accounts,
  investments,
  payableBills,
  creditCards,
}: {
  referenceDate?: string;
  accounts: HouseholdSnapshotAccount[];
  investments: HouseholdSnapshotInvestment[];
  payableBills: HouseholdSnapshotPayableBill[];
  creditCards: HouseholdSnapshotCreditCard[];
}): HouseholdBalanceSnapshot {
  const assetBuckets = new Map<string, number>();

  for (const account of accounts) {
    if (!shouldIncludeAccount(account)) continue;
    if (account.type === 'investment') continue;

    const balance = toNumber(account.current_balance);
    if (balance <= 0) continue;

    assetBuckets.set(
      getAccountBucketLabel(account.type),
      (assetBuckets.get(getAccountBucketLabel(account.type)) || 0) + balance,
    );
  }

  const investmentAssets = investments.reduce(
    (sum, investment) => sum + resolveInvestmentCurrentValue(investment),
    0,
  );
  if (investmentAssets > 0) {
    assetBuckets.set('Investimentos', (assetBuckets.get('Investimentos') || 0) + investmentAssets);
  }

  const payableBillsAmount = payableBills
    .filter((bill) => isBillOutstandingForReferenceDate(bill, referenceDate))
    .reduce((sum, bill) => sum + toNumber(bill.amount), 0);
  const creditCardUsed = creditCards.reduce(
    (sum, card) => sum + Math.max(0, toNumber(card.credit_limit) - toNumber(card.available_limit)),
    0,
  );

  const liabilityBuckets = new Map<string, number>();
  if (payableBillsAmount > 0) {
    liabilityBuckets.set('Contas a pagar', payableBillsAmount);
  }
  if (creditCardUsed > 0) {
    liabilityBuckets.set('Cartões de crédito', creditCardUsed);
  }

  const totalAssets = round(sumMapValues(assetBuckets));
  const totalLiabilities = round(sumMapValues(liabilityBuckets));

  return {
    totalAssets,
    totalLiabilities,
    netWorth: round(totalAssets - totalLiabilities),
    assetBreakdown: toBucketArray(assetBuckets, totalAssets),
    liabilityBreakdown: toBucketArray(liabilityBuckets, totalLiabilities),
  };
}

function isBillOutstandingForReferenceDate(
  bill: HouseholdSnapshotPayableBill,
  referenceDate?: string,
) {
  if (bill.status !== 'pending' && bill.status !== 'overdue') {
    return false;
  }

  if (!referenceDate || !bill.due_date) {
    return true;
  }

  return bill.due_date <= referenceDate;
}

function shouldIncludeAccount(account: HouseholdSnapshotAccount) {
  if (account.include_in_total === false) {
    return false;
  }

  if (account.is_active === false) {
    return false;
  }

  return true;
}

function resolveInvestmentCurrentValue(investment: HouseholdSnapshotInvestment) {
  const currentValue = toNumber(investment.current_value);
  if (currentValue > 0) {
    return currentValue;
  }

  return toNumber(investment.total_invested);
}

function getAccountBucketLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Conta corrente',
    savings: 'Poupança',
    wallet: 'Carteira',
    investment: 'Conta investimento',
  };

  return labels[type] || 'Outros ativos';
}

function toBucketArray(
  map: Map<string, number>,
  total: number,
): Array<{ label: string; amount: number; share: number }> {
  return Array.from(map.entries())
    .map(([label, amount]) => ({
      label,
      amount: round(amount),
      share: total > 0 ? round((amount / total) * 100) : 0,
    }))
    .sort((left, right) => right.amount - left.amount);
}

function sumMapValues(map: Map<string, number>) {
  return Array.from(map.values()).reduce((sum, value) => sum + value, 0);
}

function toNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value: number) {
  return Number(value.toFixed(2));
}
