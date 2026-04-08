import {
  createEmptyReportContext,
  type ReportBalanceSheetBucket,
  type ReportBalanceSheetHistoryPoint,
  type ReportBalanceSheetSection,
  type ReportCashflowSection,
  type ReportCashflowSeriesPoint,
  type ReportGoalProgressItem,
  type ReportGoalsSection,
  type ReportIntelligenceContext,
  type ReportInvestmentOpportunitySignal,
  type ReportInvestmentsSection,
  type ReportObligationsSection,
  type ReportOverviewSection,
  type ReportSectionQuality,
  type ReportSpendingCategory,
  type ReportSpendingSection,
  type ReportSpendingTagStat,
  type ReportAnaSection,
} from '../../../src/utils/reports/intelligence-contract.ts';
import {
  buildInvestmentIntelligenceContext,
  type InvestmentIntelligenceContext,
} from './investment-intelligence.ts';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  current_balance: number | null;
  include_in_total: boolean | null;
  is_active?: boolean | null;
}

interface TransactionRow {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number | null;
  transaction_date: string;
  category_id: string | null;
  description?: string | null;
  is_paid?: boolean | null;
  payment_method?: string | null;
  credit_card_id?: string | null;
  category?: { name?: string | null } | null;
  transaction_tags?: Array<{ tag?: { id?: string | null; name?: string | null } | null }> | null;
}

interface CreditCardTransactionRow {
  id: string;
  amount: number | null;
  purchase_date: string;
  category_id: string | null;
  invoice?: { reference_month?: string | null } | null;
  category?: { name?: string | null } | null;
  credit_card_transaction_tags?: Array<{ tag?: { id?: string | null; name?: string | null } | null }> | null;
}

interface CreditCardRow {
  id: string;
  name: string;
  credit_limit: number | null;
  available_limit: number | null;
}

interface CreditCardInvoiceRow {
  id: string;
  status: string | null;
  total_amount: number | null;
  remaining_amount: number | null;
  due_date: string | null;
  reference_month: string | null;
}

interface PortfolioSnapshotRow {
  id: string;
  snapshot_date: string;
  total_assets: number | null;
  total_liabilities: number | null;
  net_worth: number | null;
  asset_breakdown: unknown;
  liability_breakdown: unknown;
}

interface FinancialGoalRow {
  id: string;
  name: string;
  goal_type: string;
  status: string;
  target_amount: number | null;
  current_amount: number | null;
  deadline: string | null;
  period_end: string | null;
}

interface PayableBillRow {
  id: string;
  amount: number | null;
  due_date: string;
  status: string | null;
}

interface BillAnalytics {
  totals?: {
    pending_count?: number;
    overdue_count?: number;
    pending_amount?: number;
  };
  forecast?: {
    next_month_prediction?: number;
  };
}

type Settled<T> = PromiseSettledResult<T>;

const SECTION_COMPLETE: ReportSectionQuality['completeness'] = 'complete';
const SECTION_PARTIAL: ReportSectionQuality['completeness'] = 'partial';
const SECTION_UNAVAILABLE: ReportSectionQuality['completeness'] = 'unavailable';

export async function buildReportIntelligenceContext({
  supabase,
  userId,
  startDate,
  endDate,
  supabaseUrl,
  dataAsOfDate = getTodayDateString(),
}: {
  supabase: any;
  userId: string;
  startDate: string;
  endDate: string;
  supabaseUrl?: string;
  dataAsOfDate?: string;
}): Promise<ReportIntelligenceContext> {
  const context = createEmptyReportContext();
  const forecastEndDate = addMonthsToDate(endDate, 3);

  const [
    accountsResult,
    transactionsResult,
    cardTransactionsResult,
    creditCardsResult,
    cardInvoicesResult,
    goalsResult,
    payableBillsResult,
    billAnalyticsResult,
    portfolioSnapshotsResult,
    investmentsResult,
  ] = await Promise.allSettled([
    fetchAccounts(supabase, userId),
    fetchTransactions(supabase, userId, startDate, endDate),
    fetchCardTransactions(supabase, userId, startDate, endDate),
    fetchCreditCards(supabase, userId),
    fetchCreditCardInvoices(supabase, userId, startDate, forecastEndDate),
    fetchGoals(supabase, userId),
    fetchPayableBills(supabase, userId, startDate, forecastEndDate),
    fetchBillAnalytics(supabase, userId, startDate, endDate),
    fetchPortfolioSnapshots(supabase, userId, startDate, endDate),
    buildInvestmentIntelligenceContext({ supabase, userId, supabaseUrl }),
  ]);

  const accounts = unwrap(accountsResult, []);
  const transactions = unwrap(transactionsResult, []);
  const cardTransactions = unwrap(cardTransactionsResult, []);
  const creditCards = unwrap(creditCardsResult, []);
  const cardInvoices = unwrap(cardInvoicesResult, []);
  const goals = unwrap(goalsResult, []);
  const payableBills = unwrap(payableBillsResult, []);
  const billAnalytics = unwrap<BillAnalytics | null>(billAnalyticsResult, null);
  const portfolioSnapshots = unwrap(portfolioSnapshotsResult, []);
  const investmentContext = unwrap<InvestmentIntelligenceContext | null>(investmentsResult, null);
  const canUseLiveSnapshot = isDateSafeForLiveSnapshot(endDate, dataAsOfDate);

  const cashflow = buildCashflowSection(transactions, cardTransactions, startDate, endDate);
  const spending = buildSpendingSection(transactions, cardTransactions);
  const obligations = buildObligationsSection({
    billAnalytics,
    payableBills,
    creditCards,
    cardInvoices,
    endDate,
    dataAsOfDate,
  });
  const goalsSection = buildGoalsSection(goals, endDate);
  const investmentsSection = buildInvestmentsSection(investmentContext);
  const snapshotBackedBalanceSheet = buildBalanceSheetSectionFromSnapshots(portfolioSnapshots);
  const liveBalanceSheet = buildBalanceSheetSection({
    accounts,
    obligations,
    investments: investmentsSection,
    endDate,
    dataAsOfDate,
  });
  const balanceSheet = canUseLiveSnapshot
    ? mergeCurrentBalanceSheetWithSnapshotHistory(
        liveBalanceSheet,
        snapshotBackedBalanceSheet,
        endDate,
      )
    : snapshotBackedBalanceSheet;
  const overview = buildOverviewSection({
    cashflow,
    balanceSheet,
    goals: goalsSection,
    investmentContext,
    billAnalytics,
    payableBills,
  });
  const ana = buildAnaTaxonomyHintsFromSpending(spending);
  const hasOverviewData = Boolean(
    cashflow ||
      spending ||
      balanceSheet ||
      obligations ||
      goalsSection ||
      investmentsSection
  );
  overview.hasSufficientData = hasOverviewData;

  context.overview = overview;
  context.cashflow = cashflow;
  context.spending = spending;
  context.balanceSheet = balanceSheet;
  context.obligations = obligations;
  context.goals = goalsSection;
  context.investments = investmentsSection;
  context.ana = ana;
  context.quality = {
    overview: buildOverviewQuality(overview, cashflow, balanceSheet, goalsSection, investmentsSection),
    cashflow: buildCashflowQuality(cashflow),
    spending: buildSpendingQuality(spending),
    balanceSheet: buildBalanceSheetQuality(balanceSheet),
    obligations: buildObligationsQuality(
      obligations,
      billAnalytics,
      creditCards,
      cardInvoices,
      canUseLiveSnapshot,
    ),
    goals: buildGoalsQuality(goalsSection),
    investments: buildInvestmentsQuality(investmentsSection),
    ana: ana
      ? createQuality('internal_calculation', SECTION_PARTIAL)
      : createQuality('unavailable', SECTION_UNAVAILABLE),
  };

  return context;
}

async function fetchAccounts(supabase: any, userId: string): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, current_balance, include_in_total, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data || []) as AccountRow[];
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, type, amount, transaction_date, category_id, description, is_paid, payment_method, credit_card_id, category:categories(name), transaction_tags(tag:tags(id, name))',
    )
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  return (data || []) as TransactionRow[];
}

async function fetchCardTransactions(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CreditCardTransactionRow[]> {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .select(
      'id, amount, purchase_date, category_id, category:categories(name), invoice:credit_card_invoices(reference_month), credit_card_transaction_tags(tag:tags(id, name))',
    )
    .eq('user_id', userId)
    .lte('purchase_date', endDate)
    .order('purchase_date', { ascending: true });

  if (error) throw error;
  return ((data || []) as CreditCardTransactionRow[]).filter((transaction) =>
    isMonthWithinRange(resolveCardTransactionCompetenceMonth(transaction), startDate, endDate),
  );
}

async function fetchCreditCards(supabase: any, userId: string): Promise<CreditCardRow[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name, credit_limit, available_limit')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('name');

  if (error) throw error;
  return (data || []) as CreditCardRow[];
}

async function fetchCreditCardInvoices(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CreditCardInvoiceRow[]> {
  const { data, error } = await supabase
    .from('credit_card_invoices')
    .select('id, status, total_amount, remaining_amount, due_date, reference_month')
    .eq('user_id', userId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []) as CreditCardInvoiceRow[];
}

async function fetchGoals(supabase: any, userId: string): Promise<FinancialGoalRow[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('id, name, goal_type, status, target_amount, current_amount, deadline, period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FinancialGoalRow[];
}

async function fetchPortfolioSnapshots(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<PortfolioSnapshotRow[]> {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select(
      'id, snapshot_date, total_assets, total_liabilities, net_worth, asset_breakdown, liability_breakdown',
    )
    .eq('user_id', userId)
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: true });

  if (error) throw error;
  return (data || []) as PortfolioSnapshotRow[];
}

async function fetchPayableBills(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<PayableBillRow[]> {
  const { data, error } = await supabase
    .from('payable_bills')
    .select('id, amount, due_date, status')
    .eq('user_id', userId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []) as PayableBillRow[];
}

async function fetchBillAnalytics(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<BillAnalytics | null> {
  const { data, error } = await supabase.rpc('get_bill_analytics', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return (data || null) as BillAnalytics | null;
}

function buildCashflowSection(
  transactions: TransactionRow[],
  cardTransactions: CreditCardTransactionRow[],
  startDate: string,
  endDate: string,
): ReportCashflowSection | null {
  const months = enumerateMonths(startDate, endDate);
  const monthMap = new Map<string, ReportCashflowSeriesPoint>(
    months.map((month) => [
      month,
      { month, income: 0, expenses: 0, net: 0, savingsRate: null },
    ]),
  );

  for (const transaction of transactions) {
    const month = toMonthKey(transaction.transaction_date);
    const bucket = monthMap.get(month);
    if (!bucket) continue;

    if (transaction.type === 'income') {
      bucket.income += toNumber(transaction.amount);
    } else if (shouldCountTransactionInBankMonthCashflow(transaction)) {
      bucket.expenses += toNumber(transaction.amount);
    }
  }

  const monthlySeries = Array.from(monthMap.values()).map((point) => {
    const net = point.income - point.expenses;
    return {
      ...point,
      net,
      savingsRate: point.income > 0 ? round((net / point.income) * 100) : null,
    };
  });

  const incomeTotal = monthlySeries.reduce((sum, point) => sum + point.income, 0);
  const expenseTotal = monthlySeries.reduce((sum, point) => sum + point.expenses, 0);
  const netTotal = incomeTotal - expenseTotal;
  const monthsWithActivity = monthlySeries.filter((point) => point.income > 0 || point.expenses > 0);

  if (monthsWithActivity.length === 0) {
    return null;
  }

  const savingsRates = monthlySeries
    .map((point) => point.savingsRate)
    .filter((value): value is number => value !== null);

  const firstNet = monthsWithActivity[0]?.net ?? 0;
  const lastNet = monthsWithActivity[monthsWithActivity.length - 1]?.net ?? 0;

  return {
    incomeTotal: round(incomeTotal),
    expenseTotal: round(expenseTotal),
    netTotal: round(netTotal),
    monthlySeries,
    largestIncomeMonth: [...monthsWithActivity].sort((a, b) => b.income - a.income)[0] || null,
    largestExpenseMonth: [...monthsWithActivity].sort((a, b) => b.expenses - a.expenses)[0] || null,
    averageMonthlySavingsRate: savingsRates.length > 0 ? round(average(savingsRates)) : null,
    trend: classifyTrend(firstNet, lastNet),
  };
}

function extractTagsFromBankLedgerRow(transaction: TransactionRow): Array<{ id: string; name: string }> {
  const rows = transaction.transaction_tags;
  if (!rows?.length) return [];
  const out: Array<{ id: string; name: string }> = [];
  for (const row of rows) {
    const t = row?.tag;
    if (t?.id) {
      out.push({ id: t.id, name: (t.name ?? '').trim() || 'Tag' });
    }
  }
  return out;
}

function extractTagsFromCardLedgerRow(
  transaction: CreditCardTransactionRow,
): Array<{ id: string; name: string }> {
  const rows = transaction.credit_card_transaction_tags;
  if (!rows?.length) return [];
  const out: Array<{ id: string; name: string }> = [];
  for (const row of rows) {
    const t = row?.tag;
    if (t?.id) {
      out.push({ id: t.id, name: (t.name ?? '').trim() || 'Tag' });
    }
  }
  return out;
}

function buildSpendingSection(
  transactions: TransactionRow[],
  cardTransactions: CreditCardTransactionRow[],
): ReportSpendingSection | null {
  const expenseEntries = [
    ...transactions
      .filter(shouldIncludeTransactionInSpending)
      .map((transaction) => ({
        amount: toNumber(transaction.amount),
        categoryId: transaction.category_id,
        categoryName: transaction.category?.name?.trim() || 'Sem categoria',
        month: toMonthKey(transaction.transaction_date),
      })),
    ...cardTransactions.map((transaction) => ({
      amount: toNumber(transaction.amount),
      categoryId: transaction.category_id,
      categoryName: transaction.category?.name?.trim() || 'Sem categoria',
      month: resolveCardTransactionCompetenceMonth(transaction),
    })),
  ].filter((entry) => entry.amount > 0);

  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  if (totalExpenses <= 0) {
    return null;
  }

  const categoryMap = new Map<string, ReportSpendingCategory>();
  const monthTotals = new Map<string, number>();
  let uncategorizedTotal = 0;

  for (const entry of expenseEntries) {
    const key = `${entry.categoryId || 'uncategorized'}:${entry.categoryName}`;
    const existing = categoryMap.get(key) || {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      amount: 0,
      share: 0,
      transactionCount: 0,
    };

    existing.amount += entry.amount;
    existing.transactionCount += 1;
    categoryMap.set(key, existing);

    monthTotals.set(entry.month, (monthTotals.get(entry.month) || 0) + entry.amount);

    if (!entry.categoryId || entry.categoryName === 'Sem categoria') {
      uncategorizedTotal += entry.amount;
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values())
    .map((item) => ({
      ...item,
      amount: round(item.amount),
      share: round((item.amount / totalExpenses) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthOverMonthChanges = Array.from(monthTotals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, amount], index, items) => {
      const previousAmount = index > 0 ? items[index - 1][1] : null;
      const changeAmount = previousAmount === null ? null : amount - previousAmount;
      const changePercentage =
        previousAmount && previousAmount > 0
          ? round((changeAmount! / previousAmount) * 100)
          : null;

      return {
        month,
        amount: round(amount),
        previousAmount: previousAmount === null ? null : round(previousAmount),
        changeAmount: changeAmount === null ? null : round(changeAmount),
        changePercentage,
      };
    });

  const tagCounts = new Map<string, ReportSpendingTagStat>();
  const bumpTagUsage = (tags: Array<{ id: string; name: string }>) => {
    for (const tag of tags) {
      const cur = tagCounts.get(tag.id) ?? {
        tagId: tag.id,
        tagName: tag.name,
        useCount: 0,
      };
      cur.useCount += 1;
      tagCounts.set(tag.id, cur);
    }
  };

  for (const t of transactions) {
    if (!shouldIncludeTransactionInSpending(t)) continue;
    const ledgerTags = extractTagsFromBankLedgerRow(t);
    if (ledgerTags.length) bumpTagUsage(ledgerTags);
  }
  for (const t of cardTransactions) {
    if (toNumber(t.amount) <= 0) continue;
    const ledgerTags = extractTagsFromCardLedgerRow(t);
    if (ledgerTags.length) bumpTagUsage(ledgerTags);
  }

  const topTags = [...tagCounts.values()].sort((a, b) => b.useCount - a.useCount).slice(0, 10);

  return {
    categoryBreakdown,
    topCategories: categoryBreakdown.slice(0, 5),
    monthOverMonthChanges,
    uncategorizedShare: round((uncategorizedTotal / totalExpenses) * 100),
    topTags,
  };
}

function buildAnaTaxonomyHintsFromSpending(spending: ReportSpendingSection | null): ReportAnaSection | null {
  const top = spending?.topTags?.filter((t) => t.useCount > 0) ?? [];
  if (top.length === 0) return null;
  return {
    summary: null,
    insights: top.slice(0, 5).map(
      (t) =>
        `Tag "${t.tagName}" em ${t.useCount} despesa${t.useCount === 1 ? '' : 's'} no período (conta e cartão).`,
    ),
    risks: [],
    recommendations: [],
    nextBestActions: [],
  };
}

export function buildBalanceSheetSection({
  accounts,
  obligations,
  investments,
  endDate,
  dataAsOfDate,
}: {
  accounts: AccountRow[];
  obligations: ReportObligationsSection | null;
  investments: ReportInvestmentsSection | null;
  endDate: string;
  dataAsOfDate: string;
}): ReportBalanceSheetSection | null {
  if (!isDateSafeForLiveSnapshot(endDate, dataAsOfDate)) {
    return null;
  }

  const assetBuckets = new Map<string, number>();
  let liquidAssets = 0;

  for (const account of accounts) {
    if (account.include_in_total === false || account.is_active === false) continue;
    if (account.type === 'investment') continue;

    const balance = toNumber(account.current_balance);
    if (balance <= 0) continue;

    liquidAssets += balance;
    assetBuckets.set(getAccountBucketLabel(account.type), (assetBuckets.get(getAccountBucketLabel(account.type)) || 0) + balance);
  }

  const investmentAssets = investments?.portfolioValue || 0;
  if (investmentAssets > 0) {
    assetBuckets.set('Investimentos', (assetBuckets.get('Investimentos') || 0) + investmentAssets);
  }

  const totalAssets = liquidAssets + investmentAssets;
  const liabilitiesMap = new Map<string, number>();
  const pendingBillsAmount = obligations?.pendingBillsAmount || 0;
  const creditCardUsed = obligations?.creditCardUsed || 0;

  if (pendingBillsAmount > 0) liabilitiesMap.set('Contas a pagar', pendingBillsAmount);
  if (creditCardUsed > 0) liabilitiesMap.set('Cartões de crédito', creditCardUsed);

  const totalLiabilities = pendingBillsAmount + creditCardUsed;
  const netWorth = totalAssets - totalLiabilities;

  if (totalAssets <= 0 && totalLiabilities <= 0) {
    return null;
  }

  const assetBreakdown = toBucketArray(assetBuckets, totalAssets);
  const liabilityBreakdown = toBucketArray(liabilitiesMap, totalLiabilities);

  return {
    totalAssets: round(totalAssets),
    totalLiabilities: round(totalLiabilities),
    netWorth: round(netWorth),
    netWorthHistory: [{ month: toMonthKey(endDate), netWorth: round(netWorth) }],
    assetBreakdown,
    liabilityBreakdown,
  };
}

function buildBalanceSheetSectionFromSnapshots(
  snapshots: PortfolioSnapshotRow[],
): ReportBalanceSheetSection | null {
  const validSnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.snapshot_date &&
      snapshot.net_worth !== null &&
      snapshot.total_assets !== null &&
      snapshot.total_liabilities !== null,
  );
  if (validSnapshots.length === 0) {
    return null;
  }

  const latestSnapshot = validSnapshots[validSnapshots.length - 1];
  const historyByMonth = new Map<string, ReportBalanceSheetHistoryPoint>();

  for (const snapshot of validSnapshots) {
    historyByMonth.set(toMonthKey(snapshot.snapshot_date), {
      month: toMonthKey(snapshot.snapshot_date),
      netWorth: round(toNumber(snapshot.net_worth)),
    });
  }

  return {
    totalAssets: round(toNumber(latestSnapshot.total_assets)),
    totalLiabilities: round(toNumber(latestSnapshot.total_liabilities)),
    netWorth: round(toNumber(latestSnapshot.net_worth)),
    netWorthHistory: Array.from(historyByMonth.values()).sort((left, right) =>
      left.month.localeCompare(right.month),
    ),
    assetBreakdown: normalizeSnapshotBuckets(
      latestSnapshot.asset_breakdown,
      toNumber(latestSnapshot.total_assets),
    ),
    liabilityBreakdown: normalizeSnapshotBuckets(
      latestSnapshot.liability_breakdown,
      toNumber(latestSnapshot.total_liabilities),
    ),
  };
}

function mergeCurrentBalanceSheetWithSnapshotHistory(
  liveBalanceSheet: ReportBalanceSheetSection | null,
  snapshotBalanceSheet: ReportBalanceSheetSection | null,
  endDate: string,
): ReportBalanceSheetSection | null {
  if (!liveBalanceSheet) {
    return snapshotBalanceSheet;
  }

  if (!snapshotBalanceSheet) {
    return liveBalanceSheet;
  }

  const historyMap = new Map<string, ReportBalanceSheetHistoryPoint>(
    snapshotBalanceSheet.netWorthHistory.map((point) => [point.month, point]),
  );
  historyMap.set(toMonthKey(endDate), {
    month: toMonthKey(endDate),
    netWorth: liveBalanceSheet.netWorth,
  });

  return {
    ...liveBalanceSheet,
    netWorthHistory: Array.from(historyMap.values()).sort((left, right) =>
      left.month.localeCompare(right.month),
    ),
  };
}

export function buildObligationsSection({
  billAnalytics,
  payableBills,
  creditCards,
  cardInvoices,
  endDate,
  dataAsOfDate,
}: {
  billAnalytics: BillAnalytics | null;
  payableBills: PayableBillRow[];
  creditCards: CreditCardRow[];
  cardInvoices: CreditCardInvoiceRow[];
  endDate: string;
  dataAsOfDate: string;
}): ReportObligationsSection | null {
  const periodBills = payableBills.filter((bill) => bill.due_date <= endDate);
  const rawPendingBillsCount = periodBills.filter((bill) => bill.status === 'pending').length;
  const rawOverdueBillsCount = periodBills.filter((bill) => bill.status === 'overdue').length;
  const analyticsPendingBillsCount = readOptionalNumber(billAnalytics?.totals?.pending_count);
  const analyticsOverdueBillsCount = readOptionalNumber(billAnalytics?.totals?.overdue_count);
  const openBillsCount =
    analyticsPendingBillsCount !== null && analyticsOverdueBillsCount !== null
      ? analyticsPendingBillsCount + analyticsOverdueBillsCount
      : rawPendingBillsCount + rawOverdueBillsCount;
  const overdueBillsCount = analyticsOverdueBillsCount ?? rawOverdueBillsCount;
  const pendingBillsAmount =
    toNumber(billAnalytics?.totals?.pending_amount) ||
    round(
      periodBills
        .filter((bill) => bill.status === 'pending' || bill.status === 'overdue')
        .reduce((sum, bill) => sum + toNumber(bill.amount), 0),
    );

  const canUseLiveCardSnapshot = isDateSafeForLiveSnapshot(endDate, dataAsOfDate);
  const creditCardLimit = canUseLiveCardSnapshot
    ? round(creditCards.reduce((sum, card) => sum + toNumber(card.credit_limit), 0))
    : 0;
  const creditCardUsed = canUseLiveCardSnapshot
    ? round(
        creditCards.reduce(
          (sum, card) => sum + Math.max(0, toNumber(card.credit_limit) - toNumber(card.available_limit)),
          0,
        ),
      )
    : 0;
  const creditCardUtilization =
    creditCardLimit > 0 ? round((creditCardUsed / creditCardLimit) * 100) : 0;

  const forecastMap = new Map<string, number>();
  for (const bill of payableBills) {
    if (bill.due_date <= endDate) continue;
    if (bill.status === 'paid') continue;
    const month = toMonthKey(bill.due_date);
    forecastMap.set(month, (forecastMap.get(month) || 0) + toNumber(bill.amount));
  }

  for (const invoice of cardInvoices) {
    if (!invoice.due_date || invoice.due_date <= endDate) continue;
    if (invoice.status === 'paid') continue;
    const month = toMonthKey(invoice.due_date);
    forecastMap.set(
      month,
      (forecastMap.get(month) || 0) +
        resolveInvoiceOutstandingAmount(invoice),
    );
  }

  const forecastNextMonths = Array.from(forecastMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 3)
    .map(([month, amount]) => ({ month, amount: round(amount) }));

  if (
    openBillsCount === 0 &&
    overdueBillsCount === 0 &&
    pendingBillsAmount === 0 &&
    creditCardLimit === 0 &&
    creditCardUsed === 0 &&
    forecastNextMonths.length === 0
  ) {
    const nextMonthPrediction = round(toNumber(billAnalytics?.forecast?.next_month_prediction));
    if (nextMonthPrediction <= 0) {
      return null;
    }

    return {
      openBillsCount: 0,
      overdueBillsCount: 0,
      pendingBillsAmount: 0,
      creditCardUsed: 0,
      creditCardLimit: 0,
      creditCardUtilization: 0,
      forecastNextMonths: [
        { month: addMonthsToMonthKey(toMonthKey(endDate), 1), amount: nextMonthPrediction },
      ],
    };
  }

  return {
    openBillsCount,
    overdueBillsCount,
    pendingBillsAmount,
    creditCardUsed,
    creditCardLimit,
    creditCardUtilization,
    forecastNextMonths,
  };
}

function buildGoalsSection(goals: FinancialGoalRow[], reportReferenceDate: string): ReportGoalsSection | null {
  if (goals.length === 0) {
    return null;
  }

  const activeGoals = goals.filter((goal) => goal.status === 'active' || goal.status === 'exceeded');
  const completedGoals = goals.filter((goal) => goal.status === 'completed');
  const atRiskGoals = activeGoals.filter((goal) => isGoalAtRisk(goal, reportReferenceDate));

  const progressByGoal: ReportGoalProgressItem[] = goals.slice(0, 10).map((goal) => {
    const targetAmount = toNumber(goal.target_amount);
    const currentAmount = toNumber(goal.current_amount);
    const progressPercentage = targetAmount > 0 ? round((currentAmount / targetAmount) * 100) : 0;
    return {
      id: goal.id,
      name: goal.name,
      type: goal.goal_type,
      status: goal.status,
      currentAmount: round(currentAmount),
      targetAmount: round(targetAmount),
      progressPercentage,
      remainingAmount: round(Math.max(0, targetAmount - currentAmount)),
      deadline: goal.deadline || goal.period_end,
      onTrack: goal.status === 'completed' ? true : goal.status === 'exceeded' ? false : progressPercentage >= 80,
    };
  });

  return {
    active: activeGoals.length,
    completed: completedGoals.length,
    atRisk: atRiskGoals.length,
    progressByGoal,
    completionRate: goals.length > 0 ? round((completedGoals.length / goals.length) * 100) : 0,
  };
}

function buildInvestmentsSection(
  investmentContext: InvestmentIntelligenceContext | null,
): ReportInvestmentsSection | null {
  if (!investmentContext || investmentContext.portfolio.investmentCount === 0) {
    return null;
  }

  const planningHighlights: string[] = [];
  if (investmentContext.planning.selectedGoal) {
    planningHighlights.push(
      `Meta foco: ${investmentContext.planning.selectedGoal.name} com gap projetado de R$ ${formatMoney(investmentContext.planning.selectedGoal.projectedGap)}.`,
    );
  }

  investmentContext.rebalance.actions.slice(0, 2).forEach((action) => {
    planningHighlights.push(
      `${action.action === 'BUY' ? 'Aporte sugerido' : 'Redução sugerida'} em ${action.assetClass}: R$ ${formatMoney(action.amount)}.`,
    );
  });

  return {
    portfolioValue: round(investmentContext.portfolio.currentValue),
    totalReturn: round(investmentContext.portfolio.totalReturn),
    allocationSummary: investmentContext.portfolio.allocation.map((item) => ({
      assetClass: item.assetClass,
      label: item.label,
      value: round(item.value),
      percentage: round(item.percentage),
    })),
    opportunitySignals: investmentContext.opportunities.items.map<ReportInvestmentOpportunitySignal>((item) => ({
      title: item.title,
      description: item.description,
      riskLevel: item.riskLevel,
      confidenceScore: item.confidenceScore,
    })),
    planningHighlights,
  };
}

export function buildOverviewSection({
  cashflow,
  balanceSheet,
  goals,
  investmentContext,
  billAnalytics,
  payableBills,
}: {
  cashflow: ReportCashflowSection | null;
  balanceSheet: ReportBalanceSheetSection | null;
  goals: ReportGoalsSection | null;
  investmentContext: InvestmentIntelligenceContext | null;
  billAnalytics: BillAnalytics | null;
  payableBills: PayableBillRow[];
}): ReportOverviewSection {
  const scoreParts: number[] = [];

  if (cashflow?.averageMonthlySavingsRate !== null && cashflow?.averageMonthlySavingsRate !== undefined) {
    scoreParts.push(clamp(50 + cashflow.averageMonthlySavingsRate * 2, 0, 100));
  }

  const overdueBillsCount = resolveOverdueBillsCount(billAnalytics, payableBills);
  const hasOverdueBillsEvidence =
    readOptionalNumber(billAnalytics?.totals?.overdue_count) !== null || payableBills.length > 0;
  if (hasOverdueBillsEvidence && overdueBillsCount !== null) {
    scoreParts.push(overdueBillsCount === 0 ? 100 : clamp(100 - overdueBillsCount * 15, 0, 100));
  }

  if (goals) {
    scoreParts.push(clamp(goals.completionRate, 0, 100));
  }

  if (investmentContext && investmentContext.portfolio.investmentCount > 0) {
    scoreParts.push(clamp(investmentContext.portfolio.healthBreakdown.total, 0, 100));
  }

  if (balanceSheet) {
    scoreParts.push(balanceSheet.netWorth >= 0 ? 75 : 35);
  }

  return {
    financialScore: scoreParts.length > 0 ? Math.round(average(scoreParts)) : null,
    savingsRate: cashflow?.averageMonthlySavingsRate ?? null,
    netWorth: balanceSheet?.netWorth ?? null,
    goalsReached: goals?.completed ?? 0,
    activeGoals: goals?.active ?? 0,
    hasSufficientData: Boolean(cashflow || balanceSheet || goals || investmentContext),
  };
}

function buildOverviewQuality(
  overview: ReportOverviewSection,
  cashflow: ReportCashflowSection | null,
  balanceSheet: ReportBalanceSheetSection | null,
  goals: ReportGoalsSection | null,
  investments: ReportInvestmentsSection | null,
): ReportSectionQuality {
  const availableSections = [cashflow, balanceSheet, goals, investments].filter(Boolean).length;
  if (!overview.hasSufficientData || availableSections === 0) {
    return createQuality('unavailable', SECTION_UNAVAILABLE);
  }

  return createQuality(
    'internal_calculation',
    availableSections >= 2 && overview.financialScore !== null ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function buildCashflowQuality(section: ReportCashflowSection | null): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);
  return createQuality(
    'internal_calculation',
    section.monthlySeries.length >= 2 ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function buildSpendingQuality(section: ReportSpendingSection | null): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);
  return createQuality(
    'internal_calculation',
    section.categoryBreakdown.length > 0 ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function buildBalanceSheetQuality(section: ReportBalanceSheetSection | null): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);
  return createQuality(
    'internal_calculation',
    section.netWorthHistory.length >= 2 ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function buildObligationsQuality(
  section: ReportObligationsSection | null,
  billAnalytics: BillAnalytics | null,
  creditCards: CreditCardRow[],
  cardInvoices: CreditCardInvoiceRow[],
  cardSnapshotSafe: boolean,
): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);

  const hasBillsData =
    Boolean(billAnalytics) || section.openBillsCount > 0 || section.pendingBillsAmount > 0;
  const hasCardsData =
    cardInvoices.length > 0 || (cardSnapshotSafe && (creditCards.length > 0 || section.creditCardLimit > 0));

  return createQuality(
    'internal_calculation',
    hasBillsData && hasCardsData ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function buildGoalsQuality(section: ReportGoalsSection | null): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);
  return createQuality('database_state', section.progressByGoal.length > 0 ? SECTION_COMPLETE : SECTION_PARTIAL);
}

function buildInvestmentsQuality(section: ReportInvestmentsSection | null): ReportSectionQuality {
  if (!section) return createQuality('unavailable', SECTION_UNAVAILABLE);
  return createQuality(
    'internal_calculation',
    section.allocationSummary.length > 0 ? SECTION_COMPLETE : SECTION_PARTIAL,
  );
}

function createQuality(
  source: ReportSectionQuality['source'],
  completeness: ReportSectionQuality['completeness'],
): ReportSectionQuality {
  return { source, completeness };
}

function unwrap<T>(result: Settled<T>, fallback: T): T {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  console.warn('[report-intelligence] section fetch failed', result.reason);
  return fallback;
}

function toNumber(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function readOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function classifyTrend(first: number, last: number): 'up' | 'down' | 'stable' {
  if (last > first + 1) return 'up';
  if (last < first - 1) return 'down';
  return 'stable';
}

function enumerateMonths(startDate: string, endDate: string): string[] {
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const months: string[] = [];

  cursor.setDate(1);
  end.setDate(1);

  while (cursor <= end) {
    months.push(toMonthKey(cursor.toISOString()));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function toMonthKey(dateValue: string): string {
  return dateValue.slice(0, 7);
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDateSafeForLiveSnapshot(reportEndDate: string, dataAsOfDate: string): boolean {
  return reportEndDate === dataAsOfDate;
}

function isMonthWithinRange(monthKey: string, startDate: string, endDate: string): boolean {
  return monthKey >= toMonthKey(startDate) && monthKey <= toMonthKey(endDate);
}

function addMonthsToDate(dateValue: string, months: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addMonthsToMonthKey(monthKey: string, months: number): string {
  const date = new Date(`${monthKey}-01T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 7);
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

function toBucketArray(map: Map<string, number>, total: number): ReportBalanceSheetBucket[] {
  return Array.from(map.entries())
    .map(([label, amount]) => ({
      label,
      amount: round(amount),
      share: total > 0 ? round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function normalizeSnapshotBuckets(
  value: unknown,
  total: number,
): ReportBalanceSheetBucket[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const label = String(record.label || '').trim();
      const amount = round(toNumber(record.amount));
      const share =
        record.share !== null && record.share !== undefined
          ? round(toNumber(record.share))
          : total > 0
            ? round((amount / total) * 100)
            : 0;

      if (!label) {
        return null;
      }

      return {
        label,
        amount,
        share,
      };
    })
    .filter((item): item is ReportBalanceSheetBucket => Boolean(item))
    .sort((left, right) => right.amount - left.amount);
}

function resolveInvoiceOutstandingAmount(invoice: CreditCardInvoiceRow): number {
  const remaining = toNumber(invoice.remaining_amount);
  if (remaining > 0) return remaining;
  return toNumber(invoice.total_amount);
}

function resolveCardTransactionCompetenceMonth(transaction: CreditCardTransactionRow): string {
  const referenceMonth = transaction.invoice?.reference_month;
  if (referenceMonth) {
    return toMonthKey(referenceMonth);
  }

  return toMonthKey(transaction.purchase_date);
}

function shouldCountTransactionInBankMonthCashflow(transaction: TransactionRow): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }

  if (isInvoicePaymentTransaction(transaction)) {
    return true;
  }

  if (isCreditCardPurchaseTransaction(transaction)) {
    return false;
  }

  return Boolean(transaction.is_paid);
}

function shouldIncludeTransactionInSpending(transaction: TransactionRow): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }

  if (isInvoicePaymentTransaction(transaction)) {
    return false;
  }

  return !isCreditCardPurchaseTransaction(transaction);
}

function isCreditCardPurchaseTransaction(
  transaction: Pick<TransactionRow, 'credit_card_id' | 'payment_method'>,
): boolean {
  return Boolean(transaction.credit_card_id) || transaction.payment_method === 'credit';
}

function isInvoicePaymentTransaction(transaction: Pick<TransactionRow, 'description' | 'type'>): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }

  const description = normalizeComparableText(transaction.description);
  return description.includes('pagamento de fatura') || description.includes('pagamento da fatura');
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isGoalAtRisk(goal: FinancialGoalRow, reportReferenceDate: string): boolean {
  const targetAmount = toNumber(goal.target_amount);
  const currentAmount = toNumber(goal.current_amount);
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  if (goal.goal_type === 'spending_limit') {
    return progress >= 80 || goal.status === 'exceeded';
  }

  const deadline = goal.deadline || goal.period_end;
  if (!deadline) {
    return progress < 50;
  }

  const daysRemaining = Math.ceil(
    (
      new Date(`${deadline}T12:00:00`).getTime() -
      new Date(`${reportReferenceDate}T12:00:00`).getTime()
    ) /
      (1000 * 60 * 60 * 24),
  );

  return daysRemaining <= 60 && progress < 75;
}

function resolveOverdueBillsCount(
  billAnalytics: BillAnalytics | null,
  payableBills: PayableBillRow[],
): number | null {
  const analyticsCount = readOptionalNumber(billAnalytics?.totals?.overdue_count);
  if (analyticsCount !== null) {
    return analyticsCount;
  }

  if (payableBills.length === 0) {
    return null;
  }

  return payableBills.filter((bill) => bill.status === 'overdue').length;
}

function formatMoney(value: number): string {
  return round(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
