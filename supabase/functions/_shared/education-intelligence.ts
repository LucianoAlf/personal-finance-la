import {
  buildEducationIntelligenceFullContext,
  type EducationIntelligenceFullContext,
  type EducationIntelligenceMetrics,
  type EducationRecommendedModuleRef,
} from '../../../src/utils/education/intelligence-contract.ts';
import { deriveTrustedInvestorAssessment } from './education-profile.ts';

interface TransactionRow {
  type: 'income' | 'expense' | 'transfer';
  amount: number | null;
  transaction_date: string;
}

interface CreditCardTransactionRow {
  amount: number | null;
  purchase_date: string;
  invoice?: { reference_month?: string | null } | null;
}

interface CreditCardInvoiceRow {
  status: string | null;
  total_amount: number | null;
  remaining_amount: number | null;
  due_date: string | null;
}

interface PayableBillRow {
  amount: number | null;
  due_date: string;
  status: string | null;
}

interface FinancialGoalRow {
  name: string;
  goal_type: string;
  status: string;
  target_amount: number | null;
  current_amount: number | null;
}

interface InvestmentGoalRow {
  status: string | null;
}

interface EducationLessonRow {
  id: string;
  module_id: string;
  slug: string;
  sort_order: number;
  content_blocks: unknown;
}

interface EducationModuleRow {
  id: string;
  track_id: string;
  slug: string;
  sort_order: number;
}

interface EducationTrackRow {
  id: string;
  slug: string;
  sort_order: number;
}

interface EducationProgressRow {
  lesson_id: string;
  status: string;
}

interface InvestorAssessmentRow {
  profile_key: string | null;
  confidence: number | null;
  effective_at: string | null;
  explanation: string | null;
  questionnaire_version?: number | null;
  answers?: Record<string, unknown> | null;
}

interface DailyTipRow {
  id: string;
  narrative_text: string;
  deterministic_reason: string;
  delivered_at: string | null;
}

type Settled<T> = PromiseSettledResult<T>;

export class EducationIntelligenceDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'EducationIntelligenceDataError';

    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function isMonthWithinRange(monthKey: string, startDate: string, endDate: string): boolean {
  return monthKey >= toMonthKey(startDate) && monthKey <= toMonthKey(endDate);
}

function resolveCardTransactionCompetenceMonth(transaction: CreditCardTransactionRow): string {
  const referenceMonth = transaction.invoice?.reference_month;
  if (referenceMonth) {
    return toMonthKey(referenceMonth);
  }
  return toMonthKey(transaction.purchase_date);
}

function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultPeriodEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

function unwrapOptional<T>(result: Settled<T>, fallback: T): T {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  console.error('[education-intelligence] fetch failed', result.reason);
  return fallback;
}

function emergencyReserveProgress(goals: FinancialGoalRow[]): number | null {
  const active = goals.filter((g) => g.status !== 'archived');
  const savings = active.filter((g) => g.goal_type === 'savings');
  const targeted = savings.filter((g) =>
    /reserva|emerg(ê|e)ncia|fundo|emergency/i.test(g.name || ''),
  );
  const pool = targeted.length > 0 ? targeted : savings;
  let best: number | null = null;
  for (const g of pool) {
    const t = toNumber(g.target_amount);
    if (t <= 0) continue;
    const ratio = Math.min(1, toNumber(g.current_amount) / t);
    best = best === null ? ratio : Math.max(best, ratio);
  }
  return best;
}

function lessonOrderingKey(
  lesson: EducationLessonRow,
  moduleById: Map<string, EducationModuleRow>,
  trackById: Map<string, EducationTrackRow>,
): [number, number, number] {
  const mod = moduleById.get(lesson.module_id);
  if (!mod) return [999, 999, lesson.sort_order];
  const track = trackById.get(mod.track_id);
  return [track?.sort_order ?? 999, mod.sort_order, lesson.sort_order];
}

function getLessonTrackSlug(
  lesson: EducationLessonRow,
  moduleById: Map<string, EducationModuleRow>,
  trackById: Map<string, EducationTrackRow>,
): string | null {
  const module = moduleById.get(lesson.module_id);
  if (!module) return null;
  return trackById.get(module.track_id)?.slug ?? null;
}

function resolveNextLessonId(
  lessons: EducationLessonRow[],
  moduleById: Map<string, EducationModuleRow>,
  trackById: Map<string, EducationTrackRow>,
  completedLessonIds: Set<string>,
  preferredTrackSlugs: string[] = [],
): string | null {
  const ordered = [...lessons].sort((a, b) => {
    const ka = lessonOrderingKey(a, moduleById, trackById);
    const kb = lessonOrderingKey(b, moduleById, trackById);
    for (let i = 0; i < 3; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return a.id.localeCompare(b.id);
  });

  for (const trackSlug of preferredTrackSlugs) {
    const nextInTrack = ordered.find(
      (lesson) =>
        !completedLessonIds.has(lesson.id) &&
        getLessonTrackSlug(lesson, moduleById, trackById) === trackSlug,
    );

    if (nextInTrack) {
      return nextInTrack.id;
    }
  }

  const nextOverall = ordered.find((lesson) => !completedLessonIds.has(lesson.id));
  return nextOverall?.id ?? null;
}

function buildAvailableModules(
  modules: EducationModuleRow[],
  trackById: Map<string, EducationTrackRow>,
): EducationRecommendedModuleRef[] {
  return [...modules]
    .sort((left, right) => {
      const leftTrackOrder = trackById.get(left.track_id)?.sort_order ?? 999;
      const rightTrackOrder = trackById.get(right.track_id)?.sort_order ?? 999;

      if (leftTrackOrder !== rightTrackOrder) {
        return leftTrackOrder - rightTrackOrder;
      }

      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }

      return left.id.localeCompare(right.id);
    })
    .flatMap((module) => {
      const trackSlug = trackById.get(module.track_id)?.slug;

      if (!trackSlug) {
        return [];
      }

      return [{ trackSlug, moduleSlug: module.slug }];
    });
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, transaction_date')
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
    .select('amount, purchase_date, invoice:credit_card_invoices(reference_month)')
    .eq('user_id', userId)
    .lte('purchase_date', endDate)
    .order('purchase_date', { ascending: true });

  if (error) throw error;
  return ((data || []) as CreditCardTransactionRow[]).filter((row) =>
    isMonthWithinRange(resolveCardTransactionCompetenceMonth(row), startDate, endDate),
  );
}

async function fetchCreditCardInvoicesOpen(
  supabase: any,
  userId: string,
): Promise<CreditCardInvoiceRow[]> {
  const { data, error } = await supabase
    .from('credit_card_invoices')
    .select('status, total_amount, remaining_amount, due_date')
    .eq('user_id', userId)
    .order('due_date', { ascending: false })
    .limit(120);

  if (error) throw error;
  return ((data || []) as CreditCardInvoiceRow[]).filter((row) => row.status !== 'paid');
}

async function fetchPayableBillsForDebtAnalysis(
  supabase: any,
  userId: string,
): Promise<PayableBillRow[]> {
  const { data, error } = await supabase
    .from('payable_bills')
    .select('amount, due_date, status')
    .eq('user_id', userId)
    .order('due_date', { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data || []) as PayableBillRow[];
}

async function fetchFinancialGoals(supabase: any, userId: string): Promise<FinancialGoalRow[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('name, goal_type, status, target_amount, current_amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FinancialGoalRow[];
}

async function fetchInvestmentGoals(supabase: any, userId: string): Promise<InvestmentGoalRow[]> {
  const { data, error } = await supabase
    .from('investment_goals')
    .select('status')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as InvestmentGoalRow[];
}

async function fetchActiveInvestmentsCount(supabase: any, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('investments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  return count ?? 0;
}

async function fetchPortfolioSnapshotCount(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('portfolio_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate);

  if (error) throw error;
  return count ?? 0;
}

async function fetchGamification(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as { current_streak: number } | null;
}

async function fetchBadgeUnlockedCount(supabase: any, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('badge_progress')
    .select('unlocked')
    .eq('user_id', userId);

  if (error) throw error;
  const rows = (data || []) as Array<{ unlocked: boolean }>;
  return rows.filter((r) => r.unlocked).length;
}

async function fetchEducationCatalog(supabase: any): Promise<{
  lessons: EducationLessonRow[];
  modules: EducationModuleRow[];
  moduleById: Map<string, EducationModuleRow>;
  trackById: Map<string, EducationTrackRow>;
}> {
  const [{ data: tracks, error: e1 }, { data: modules, error: e2 }, { data: lessons, error: e3 }] =
    await Promise.all([
      supabase.from('education_tracks').select('id, slug, sort_order').order('sort_order'),
      supabase.from('education_modules').select('id, track_id, slug, sort_order').order('sort_order'),
      supabase
        .from('education_lessons')
        .select('id, module_id, slug, sort_order, content_blocks')
        .order('sort_order'),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  const moduleById = new Map<string, EducationModuleRow>(
    ((modules || []) as EducationModuleRow[]).map((module) => [module.id, module]),
  );
  const trackById = new Map<string, EducationTrackRow>(
    ((tracks || []) as EducationTrackRow[]).map((track) => [track.id, track]),
  );

  return {
    lessons: (lessons || []) as EducationLessonRow[],
    modules: (modules || []) as EducationModuleRow[],
    moduleById,
    trackById,
  };
}

async function fetchEducationProgress(
  supabase: any,
  userId: string,
): Promise<EducationProgressRow[]> {
  const { data, error } = await supabase
    .from('education_user_progress')
    .select('lesson_id, status')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as EducationProgressRow[];
}

async function fetchInvestorAssessment(
  supabase: any,
  userId: string,
): Promise<InvestorAssessmentRow | null> {
  const { data, error } = await supabase
    .from('investor_profile_assessments')
    .select('profile_key, confidence, effective_at, explanation, questionnaire_version, answers')
    .eq('user_id', userId)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as InvestorAssessmentRow | null;
}

async function fetchGlossarySlugs(supabase: any): Promise<string[]> {
  const { data, error } = await supabase
    .from('education_glossary_terms')
    .select('slug')
    .order('sort_order')
    .limit(40);

  if (error) throw error;
  return ((data || []) as Array<{ slug: string }>).map((r) => r.slug).filter(Boolean);
}

async function fetchLatestDailyTip(supabase: any, userId: string): Promise<DailyTipRow | null> {
  const { data, error } = await supabase
    .from('education_daily_tips')
    .select('id, narrative_text, deterministic_reason, delivered_at')
    .eq('user_id', userId)
    .eq('channel', 'in_app')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as DailyTipRow | null;
}

function summarizeTransactions(transactions: TransactionRow[]) {
  let bankIncomeTotal = 0;
  let bankExpenseTotal = 0;
  for (const t of transactions) {
    if (t.type === 'income') bankIncomeTotal += toNumber(t.amount);
    else if (t.type === 'expense') bankExpenseTotal += toNumber(t.amount);
  }
  return { bankIncomeTotal, bankExpenseTotal, transactionCount: transactions.length };
}

function summarizeCardExpenses(cardTx: CreditCardTransactionRow[]) {
  let cardExpenseTotal = 0;
  for (const t of cardTx) {
    cardExpenseTotal += toNumber(t.amount);
  }
  return { cardExpenseTotal, cardCount: cardTx.length };
}

function analyzeInvoices(invoices: CreditCardInvoiceRow[], referenceDate: string) {
  let creditCardOutstanding = 0;
  let overdueInvoiceCount = 0;
  for (const inv of invoices) {
    const remaining = toNumber(inv.remaining_amount);
    const fallback = toNumber(inv.total_amount);
    const open = remaining > 0 ? remaining : inv.status !== 'paid' ? fallback : 0;
    if (open > 0) {
      creditCardOutstanding += open;
    }
    const due = inv.due_date || '';
    if (due && due < referenceDate && open >= 1) {
      overdueInvoiceCount += 1;
    }
  }
  return { creditCardOutstanding, overdueInvoiceCount };
}

function analyzePayables(bills: PayableBillRow[], referenceDate: string) {
  let overduePayableCount = 0;
  for (const b of bills) {
    if (b.status === 'overdue' || (b.due_date < referenceDate && b.status !== 'paid')) {
      overduePayableCount += 1;
    }
  }
  return { overduePayableCount };
}

export async function buildEducationIntelligenceContext({
  supabase,
  userId,
  startDate: startDateInput,
  endDate: endDateInput,
}: {
  supabase: any;
  userId: string;
  startDate?: string;
  endDate?: string;
}): Promise<EducationIntelligenceFullContext> {
  const periodEnd = endDateInput && /^\d{4}-\d{2}-\d{2}$/.test(endDateInput) ? endDateInput : defaultPeriodEnd();
  const periodStart =
    startDateInput && /^\d{4}-\d{2}-\d{2}$/.test(startDateInput)
      ? startDateInput
      : addDaysYmd(periodEnd, -30);

  if (periodStart > periodEnd) {
    throw new Error('startDate must be less than or equal to endDate');
  }

  let requiredData: [
    TransactionRow[],
    CreditCardTransactionRow[],
    CreditCardInvoiceRow[],
    PayableBillRow[],
    FinancialGoalRow[],
    InvestmentGoalRow[],
    number,
    number,
    { current_streak: number } | null,
    number,
    {
      lessons: EducationLessonRow[];
      modules: EducationModuleRow[];
      moduleById: Map<string, EducationModuleRow>;
      trackById: Map<string, EducationTrackRow>;
    },
    EducationProgressRow[],
    InvestorAssessmentRow | null,
  ];

  try {
    requiredData = await Promise.all([
      fetchTransactions(supabase, userId, periodStart, periodEnd),
      fetchCardTransactions(supabase, userId, periodStart, periodEnd),
      fetchCreditCardInvoicesOpen(supabase, userId),
      fetchPayableBillsForDebtAnalysis(supabase, userId),
      fetchFinancialGoals(supabase, userId),
      fetchInvestmentGoals(supabase, userId),
      fetchActiveInvestmentsCount(supabase, userId),
      fetchPortfolioSnapshotCount(supabase, userId, periodStart, periodEnd),
      fetchGamification(supabase, userId),
      fetchBadgeUnlockedCount(supabase, userId),
      fetchEducationCatalog(supabase),
      fetchEducationProgress(supabase, userId),
      fetchInvestorAssessment(supabase, userId),
    ]);
  } catch (error) {
    throw new EducationIntelligenceDataError(
      'Failed to load required education intelligence data',
      { cause: error },
    );
  }

  const [glossaryResult, tipResult] = await Promise.allSettled([
    fetchGlossarySlugs(supabase),
    fetchLatestDailyTip(supabase, userId),
  ]);

  const [
    transactions,
    cardTx,
    invoices,
    payables,
    financialGoals,
    investmentGoals,
    activeInvestmentCount,
    portfolioSnapshotCount,
    gamification,
    badgeUnlockedCount,
    catalog,
    educationProgress,
    assessment,
  ] = requiredData;
  const glossarySlugs = unwrapOptional(glossaryResult, []);
  const latestTip = unwrapOptional(tipResult, null);

  const { bankIncomeTotal, bankExpenseTotal, transactionCount: bankTxCount } =
    summarizeTransactions(transactions);
  const { cardExpenseTotal, cardCount } = summarizeCardExpenses(cardTx);
  const { creditCardOutstanding, overdueInvoiceCount } = analyzeInvoices(invoices, periodEnd);
  const { overduePayableCount } = analyzePayables(payables, periodEnd);

  const completedLessonIds = new Set(
    educationProgress.filter((p) => p.status === 'completed').map((p) => p.lesson_id),
  );
  const completedLessonCount = completedLessonIds.size;
  const totalLessonCount = catalog.lessons.length;
  const lessonsWithContent = catalog.lessons.filter((lesson) => {
    const hasContent =
      lesson.content_blocks !== null &&
      Array.isArray(lesson.content_blocks) &&
      (lesson.content_blocks as unknown[]).length > 0;
    return hasContent;
  }).length;
  const activeInvestmentGoalCount = investmentGoals.filter(
    (g) => g.status !== 'archived' && g.status !== 'completed',
  ).length;
  const trustedAssessment = deriveTrustedInvestorAssessment(assessment);

  const baseMetrics: EducationIntelligenceMetrics = {
    referenceDate: periodEnd,
    periodStart,
    periodEnd,
    transactionCount: bankTxCount + cardCount,
    bankIncomeTotal,
    bankExpenseTotal,
    cardExpenseTotal,
    overduePayableCount,
    overdueInvoiceCount,
    creditCardOutstanding,
    financialGoalCount: financialGoals.filter((g) => g.status !== 'archived').length,
    emergencyReserveProgress: emergencyReserveProgress(financialGoals),
    activeInvestmentCount,
    activeInvestmentGoalCount,
    portfolioSnapshotCount,
    gamificationStreakDays: gamification?.current_streak ?? null,
    badgeUnlockedCount,
    completedLessonCount,
    totalLessonCount,
    nextLessonId: null,
    investorAssessment: trustedAssessment.questionnaireComplete
      ? {
          profileKey: trustedAssessment.profileKey,
          confidence: trustedAssessment.confidence,
          effectiveAt: trustedAssessment.effectiveAt,
          explanation: trustedAssessment.explanation,
        }
      : {
          profileKey: trustedAssessment.profileKey,
          confidence: trustedAssessment.confidence,
          effectiveAt: trustedAssessment.effectiveAt,
          explanation: trustedAssessment.explanation,
        },
    glossaryTermSlugs: glossarySlugs,
    dailyTip: latestTip
      ? {
          id: latestTip.id,
          narrativeText: latestTip.narrative_text,
          deterministicReason: latestTip.deterministic_reason,
          deliveredAt: latestTip.delivered_at,
        }
      : null,
    availableModules: buildAvailableModules(catalog.modules, catalog.trackById),
    lessonsWithContent,
  };

  const generatedAt = new Date().toISOString();
  const provisionalContext = buildEducationIntelligenceFullContext(baseMetrics, generatedAt);
  const nextLessonId = resolveNextLessonId(
    catalog.lessons,
    catalog.moduleById,
    catalog.trackById,
    completedLessonIds,
    provisionalContext.journey.recommendedTrackSlugs,
  );

  return buildEducationIntelligenceFullContext(
    {
      ...baseMetrics,
      nextLessonId,
    },
    generatedAt,
  );
}
