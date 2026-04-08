/**
 * Canonical category + tag context for Ana-facing backends (WhatsApp, dashboard insights, reports).
 * Single aggregation path aligned with report spending rules (bank ledger vs cartão, sem duplicar fatura).
 */

import { getFallbackCategoryDisplayName, normalizeUserText } from './canonical-categorization.ts';
import type {
  ReportAnaSection,
  ReportSpendingCategory,
  ReportSpendingChange,
  ReportSpendingSection,
  ReportSpendingTagStat,
} from '../../../src/utils/reports/intelligence-contract.ts';

// --- Ledger row shapes (match report-intelligence selects) -----------------

export interface TaxonomyBankTransactionRow {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number | null;
  transaction_date: string;
  category_id: string | null;
  source?: string | null;
  description?: string | null;
  is_paid?: boolean | null;
  payment_method?: string | null;
  credit_card_id?: string | null;
  category?: { name?: string | null } | null;
  transaction_tags?: Array<{ tag?: { id?: string | null; name?: string | null } | null }> | null;
}

export interface TaxonomyCardTransactionRow {
  id: string;
  amount: number | null;
  purchase_date: string;
  category_id: string | null;
  source?: string | null;
  category?: { name?: string | null } | null;
  invoice?: { reference_month?: string | null } | null;
  credit_card_transaction_tags?: Array<{ tag?: { id?: string | null; name?: string | null } | null }> | null;
}

export interface CanonicalTaxonomyCategoryLine {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  sharePercent: number;
  transactionCount: number;
}

export interface CanonicalTaxonomyTagLine {
  tagId: string;
  tagName: string;
  useCount: number;
}

export interface CanonicalTaxonomyNamedRow {
  id: string;
  name: string;
  createdAt: string;
}

export interface CanonicalTaxonomyFallbackSourceLine {
  source: string;
  label: string;
  transactionCount: number;
  amount: number;
  /** Share of fallback expense amount attributed to this source bucket. */
  sharePercent: number;
}

/** Deterministic facts Ana can cite (no invented category names). */
export interface CanonicalTaxonomyContext {
  schemaVersion: 1;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  topExpenseCategories: CanonicalTaxonomyCategoryLine[];
  topIncomeCategories: CanonicalTaxonomyCategoryLine[];
  /** Expense categories with at least two lines in the window (recurrence signal). */
  topRecurringExpenseCategories: CanonicalTaxonomyCategoryLine[];
  topTags: CanonicalTaxonomyTagLine[];
  uncategorizedExpenseCount: number;
  uncategorizedExpenseSharePercent: number;
  fallbackExpenseCount: number;
  /** Share of expense lines classified under the canonical fallback expense category (e.g. Outros). */
  fallbackExpenseSharePercent: number;
  fallbackExpenseBySource: CanonicalTaxonomyFallbackSourceLine[];
  totalExpenseAmount: number;
  totalIncomeAmount: number;
  recentUserCategories: CanonicalTaxonomyNamedRow[];
  recentUserTags: CanonicalTaxonomyNamedRow[];
  /** Short PT-BR strings safe to inject into prompts. */
  deterministicHints: string[];
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMonthKey(dateValue: string): string {
  return dateValue.slice(0, 7);
}

function isMonthWithinRange(monthKey: string, startDate: string, endDate: string): boolean {
  return monthKey >= toMonthKey(startDate) && monthKey <= toMonthKey(endDate);
}

function resolveCardTransactionCompetenceMonth(transaction: TaxonomyCardTransactionRow): string {
  const referenceMonth = transaction.invoice?.reference_month;
  if (referenceMonth) {
    return toMonthKey(referenceMonth);
  }
  return toMonthKey(transaction.purchase_date);
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCreditCardPurchaseTransaction(
  transaction: Pick<TaxonomyBankTransactionRow, 'credit_card_id' | 'payment_method'>,
): boolean {
  return Boolean(transaction.credit_card_id) || transaction.payment_method === 'credit';
}

function isInvoicePaymentTransaction(transaction: Pick<TaxonomyBankTransactionRow, 'description' | 'type'>): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }
  const description = normalizeComparableText(transaction.description);
  return description.includes('pagamento de fatura') || description.includes('pagamento da fatura');
}

/** Same rules as report-intelligence `shouldIncludeTransactionInSpending`. */
export function shouldIncludeBankExpenseInTaxonomySummary(transaction: TaxonomyBankTransactionRow): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }
  if (isInvoicePaymentTransaction(transaction)) {
    return false;
  }
  return !isCreditCardPurchaseTransaction(transaction);
}

export function extractTagsFromBankLedgerRow(transaction: TaxonomyBankTransactionRow): Array<{ id: string; name: string }> {
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

export function extractTagsFromCardLedgerRow(
  transaction: TaxonomyCardTransactionRow,
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

function displayExpenseCategoryName(categoryId: string | null, rawName: string | undefined): string {
  const trimmed = (rawName ?? '').trim();
  if (!categoryId) return 'Sem categoria';
  return trimmed || 'Sem categoria';
}

function isUncategorizedExpense(categoryId: string | null, categoryName: string): boolean {
  return !categoryId || categoryName === 'Sem categoria';
}

function isFallbackExpenseCategory(categoryName: string): boolean {
  const fb = getFallbackCategoryDisplayName('expense');
  return normalizeUserText(categoryName) === normalizeUserText(fb);
}

function normalizeLedgerSource(source: string | null | undefined): { source: string; label: string } {
  const normalized = normalizeComparableText(source).replace(/\s+/g, '_');

  if (!normalized) {
    return { source: 'unknown', label: 'Não informado' };
  }

  if (normalized === 'whatsapp') {
    return { source: 'whatsapp', label: 'WhatsApp' };
  }

  if (
    normalized === 'open_finance' ||
    normalized === 'openfinance' ||
    normalized === 'pluggy' ||
    normalized === 'belvo'
  ) {
    return { source: 'open_finance', label: 'Open Finance' };
  }

  if (
    normalized === 'manual' ||
    normalized === 'app' ||
    normalized === 'dashboard' ||
    normalized === 'web' ||
    normalized === 'direct'
  ) {
    return { source: 'manual', label: 'Manual/app' };
  }

  return {
    source: normalized,
    label: source?.trim() || 'Não informado',
  };
}

function filterCardRowsForRange(
  rows: TaxonomyCardTransactionRow[],
  startDate: string,
  endDate: string,
): TaxonomyCardTransactionRow[] {
  return rows.filter((t) => isMonthWithinRange(resolveCardTransactionCompetenceMonth(t), startDate, endDate));
}

export interface LedgerTaxonomyBundle {
  spending: ReportSpendingSection | null;
  taxonomy: CanonicalTaxonomyContext;
}

function buildMonthOverMonthChanges(monthTotals: Map<string, number>): ReportSpendingChange[] {
  return Array.from(monthTotals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, amount], index, items) => {
      const previousAmount = index > 0 ? items[index - 1][1] : null;
      const changeAmount = previousAmount === null ? null : amount - previousAmount;
      const changePercentage =
        previousAmount && previousAmount > 0 ? round((changeAmount! / previousAmount) * 100) : null;

      return {
        month,
        amount: round(amount),
        previousAmount: previousAmount === null ? null : round(previousAmount),
        changeAmount: changeAmount === null ? null : round(changeAmount),
        changePercentage,
      };
    });
}

function toCanonicalCategoryLines(items: ReportSpendingCategory[]): CanonicalTaxonomyCategoryLine[] {
  return items.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    amount: item.amount,
    sharePercent: item.share,
    transactionCount: item.transactionCount,
  }));
}

function buildDeterministicHints(ctx: CanonicalTaxonomyContext): string[] {
  const hints: string[] = [];
  for (const c of ctx.topExpenseCategories.slice(0, 3)) {
    if (c.amount <= 0) continue;
    hints.push(
      `Despesa "${c.categoryName}": R$ ${c.amount.toFixed(2)} (${c.sharePercent}% do período, ${c.transactionCount} lançamento(s)).`,
    );
  }
  for (const c of ctx.topIncomeCategories.slice(0, 3)) {
    if (c.amount <= 0) continue;
    hints.push(
      `Receita "${c.categoryName}": R$ ${c.amount.toFixed(2)} (${c.sharePercent}% das entradas no período, ${c.transactionCount} lançamento(s)).`,
    );
  }
  if (ctx.uncategorizedExpenseCount > 0) {
    hints.push(
      `${ctx.uncategorizedExpenseCount} despesa(s) sem categoria no período (${ctx.uncategorizedExpenseSharePercent}% do valor).`,
    );
  }
  if (ctx.fallbackExpenseCount > 0) {
    hints.push(
      `${ctx.fallbackExpenseCount} despesa(s) na categoria de fallback "${getFallbackCategoryDisplayName('expense')}" (${ctx.fallbackExpenseSharePercent}% do valor) — revisar taxonomia pode melhorar relatórios.`,
    );
  }
  for (const sourceLine of ctx.fallbackExpenseBySource.slice(0, 3)) {
    hints.push(
      `Fallback por origem: ${sourceLine.label} responde por ${sourceLine.transactionCount} despesa(s) e ${sourceLine.sharePercent}% do valor classificado em "${getFallbackCategoryDisplayName('expense')}".`,
    );
  }
  for (const t of ctx.topTags.slice(0, 5)) {
    if (t.useCount > 0) {
      hints.push(`Tag "${t.tagName}" aparece em ${t.useCount} despesa(s) (conta + cartão) no período.`);
    }
  }
  for (const c of ctx.recentUserCategories.slice(0, 3)) {
    hints.push(`Categoria criada recentemente: "${c.name}" (${c.createdAt.slice(0, 10)}).`);
  }
  for (const t of ctx.recentUserTags.slice(0, 3)) {
    hints.push(`Tag criada recentemente: "${t.name}" (${t.createdAt.slice(0, 10)}).`);
  }
  return hints;
}

/**
 * Core aggregation: same expense/tag/category rules as `report-intelligence` spending section,
 * plus income breakdown and canonical taxonomy metadata.
 */
export function buildLedgerTaxonomyBundle(
  transactions: TaxonomyBankTransactionRow[],
  cardTransactions: TaxonomyCardTransactionRow[],
  startDate: string,
  endDate: string,
  options?: {
    generatedAt?: string;
    recentUserCategories?: CanonicalTaxonomyNamedRow[];
    recentUserTags?: CanonicalTaxonomyNamedRow[];
  },
): LedgerTaxonomyBundle {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const recentUserCategories = options?.recentUserCategories ?? [];
  const recentUserTags = options?.recentUserTags ?? [];

  const cardInRange = filterCardRowsForRange(cardTransactions, startDate, endDate);

  const expenseEntries: Array<{
    amount: number;
    categoryId: string | null;
    categoryName: string;
    month: string;
    source: string | null | undefined;
  }> = [
    ...transactions
      .filter(shouldIncludeBankExpenseInTaxonomySummary)
      .map((transaction) => ({
        amount: toNumber(transaction.amount),
        categoryId: transaction.category_id,
        categoryName: displayExpenseCategoryName(transaction.category_id, transaction.category?.name ?? undefined),
        month: toMonthKey(transaction.transaction_date),
        source: transaction.source,
      })),
    ...cardInRange.map((transaction) => ({
      amount: toNumber(transaction.amount),
      categoryId: transaction.category_id,
      categoryName: displayExpenseCategoryName(transaction.category_id, transaction.category?.name ?? undefined),
      month: resolveCardTransactionCompetenceMonth(transaction),
      source: transaction.source,
    })),
  ].filter((entry) => entry.amount > 0);

  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const categoryMap = new Map<string, ReportSpendingCategory>();
  const monthTotals = new Map<string, number>();
  let uncategorizedTotal = 0;
  let uncategorizedExpenseCount = 0;
  let fallbackExpenseCount = 0;
  let fallbackTotalAmount = 0;
  const fallbackBySource = new Map<string, CanonicalTaxonomyFallbackSourceLine>();

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

    if (isUncategorizedExpense(entry.categoryId, entry.categoryName)) {
      uncategorizedTotal += entry.amount;
      uncategorizedExpenseCount += 1;
    }
    if (isFallbackExpenseCategory(entry.categoryName)) {
      fallbackExpenseCount += 1;
      fallbackTotalAmount += entry.amount;
      const sourceBucket = normalizeLedgerSource(entry.source);
      const current = fallbackBySource.get(sourceBucket.source) ?? {
        source: sourceBucket.source,
        label: sourceBucket.label,
        transactionCount: 0,
        amount: 0,
        sharePercent: 0,
      };
      current.transactionCount += 1;
      current.amount += entry.amount;
      fallbackBySource.set(sourceBucket.source, current);
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values())
    .map((item) => ({
      ...item,
      amount: round(item.amount),
      share: totalExpenses > 0 ? round((item.amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthOverMonthChanges = buildMonthOverMonthChanges(monthTotals);

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
    if (!shouldIncludeBankExpenseInTaxonomySummary(t)) continue;
    const ledgerTags = extractTagsFromBankLedgerRow(t);
    if (ledgerTags.length) bumpTagUsage(ledgerTags);
  }
  for (const t of cardInRange) {
    if (toNumber(t.amount) <= 0) continue;
    const ledgerTags = extractTagsFromCardLedgerRow(t);
    if (ledgerTags.length) bumpTagUsage(ledgerTags);
  }

  const topTags = [...tagCounts.values()].sort((a, b) => b.useCount - a.useCount).slice(0, 10);

  const spending: ReportSpendingSection | null =
    totalExpenses > 0
      ? {
          categoryBreakdown,
          topCategories: categoryBreakdown.slice(0, 5),
          monthOverMonthChanges,
          uncategorizedShare: round((uncategorizedTotal / totalExpenses) * 100),
          topTags,
        }
      : null;

  const incomeMap = new Map<string, { categoryId: string | null; categoryName: string; amount: number; count: number }>();
  let totalIncomeAmount = 0;
  for (const t of transactions) {
    if (t.type !== 'income') continue;
    const amount = toNumber(t.amount);
    if (amount <= 0) continue;
    const categoryName = displayExpenseCategoryName(t.category_id, t.category?.name ?? undefined);
    const key = `${t.category_id || 'uncategorized'}:${categoryName}`;
    const cur = incomeMap.get(key) || {
      categoryId: t.category_id,
      categoryName,
      amount: 0,
      count: 0,
    };
    cur.amount += amount;
    cur.count += 1;
    incomeMap.set(key, cur);
    totalIncomeAmount += amount;
  }

  const incomeBreakdown = Array.from(incomeMap.values())
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount: round(row.amount),
      share: totalIncomeAmount > 0 ? round((row.amount / totalIncomeAmount) * 100) : 0,
      transactionCount: row.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const recurring = categoryBreakdown
    .filter((c) => c.transactionCount >= 2)
    .sort((a, b) => b.transactionCount - a.transactionCount || b.amount - a.amount)
    .slice(0, 5);

  const fallbackExpenseBySource = Array.from(fallbackBySource.values())
    .map((line) => ({
      ...line,
      amount: round(line.amount),
      sharePercent: fallbackTotalAmount > 0 ? round((line.amount / fallbackTotalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const taxonomy: CanonicalTaxonomyContext = {
    schemaVersion: 1,
    periodStart: startDate,
    periodEnd: endDate,
    generatedAt,
    topExpenseCategories: toCanonicalCategoryLines(categoryBreakdown.slice(0, 10)),
    topIncomeCategories: toCanonicalCategoryLines(incomeBreakdown.slice(0, 10)),
    topRecurringExpenseCategories: toCanonicalCategoryLines(recurring),
    topTags: topTags.map((t) => ({ tagId: t.tagId, tagName: t.tagName, useCount: t.useCount })),
    uncategorizedExpenseCount,
    uncategorizedExpenseSharePercent:
      totalExpenses > 0 ? round((uncategorizedTotal / totalExpenses) * 100) : 0,
    fallbackExpenseCount,
    fallbackExpenseSharePercent:
      totalExpenses > 0 ? round((fallbackTotalAmount / totalExpenses) * 100) : 0,
    fallbackExpenseBySource,
    totalExpenseAmount: round(totalExpenses),
    totalIncomeAmount: round(totalIncomeAmount),
    recentUserCategories,
    recentUserTags,
    deterministicHints: [],
  };

  taxonomy.deterministicHints = buildDeterministicHints(taxonomy);

  return { spending, taxonomy };
}

/** Build `ReportAnaSection` hints from canonical taxonomy (replaces ad-hoc tag-only hints). */
export function buildReportAnaSectionFromTaxonomy(taxonomy: CanonicalTaxonomyContext): ReportAnaSection | null {
  const insights: string[] = [];
  if (taxonomy.deterministicHints.length) {
    insights.push(...taxonomy.deterministicHints.slice(0, 16));
  }
  if (insights.length === 0) {
    return null;
  }
  return {
    summary: null,
    insights,
    risks: [],
    recommendations: [],
    nextBestActions: [],
  };
}

/** WhatsApp / legacy shape: top N expense categories with nome/valor/percentual. */
export function mapTaxonomyToWhatsAppTopCategories(
  taxonomy: CanonicalTaxonomyContext,
  limit = 3,
): { nome: string; valor: number; percentual: number }[] {
  const total = taxonomy.totalExpenseAmount;
  return taxonomy.topExpenseCategories.slice(0, limit).map((c) => ({
    nome: c.categoryName,
    valor: c.amount,
    percentual: total > 0 ? Math.round((c.amount / total) * 100) : 0,
  }));
}

async function fetchTaxonomyTransactions(supabase: { from: (t: string) => any }, userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, type, amount, transaction_date, category_id, source, description, is_paid, payment_method, category:categories(name), transaction_tags(tag:tags(id, name))',
    )
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  return (data || []) as TaxonomyBankTransactionRow[];
}

async function fetchTaxonomyCardTransactions(supabase: { from: (t: string) => any }, userId: string, endDate: string) {
  const { data, error } = await supabase
    .from('credit_card_transactions')
    .select(
      'id, amount, purchase_date, category_id, category:categories(name), invoice:credit_card_invoices(reference_month), credit_card_transaction_tags(tag:tags(id, name))',
    )
    .eq('user_id', userId)
    .lte('purchase_date', endDate)
    .order('purchase_date', { ascending: true });

  if (error) throw error;
  return (data || []) as TaxonomyCardTransactionRow[];
}

async function fetchRecentUserCategories(
  supabase: { from: (t: string) => any },
  userId: string,
  sinceIso: string,
): Promise<CanonicalTaxonomyNamedRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.warn('[canonical-tag-context] recent categories:', error.message);
    return [];
  }
  return (data || []).map((row: { id: string; name: string; created_at: string }) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

async function fetchRecentUserTags(
  supabase: { from: (t: string) => any },
  userId: string,
  sinceIso: string,
): Promise<CanonicalTaxonomyNamedRow[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.warn('[canonical-tag-context] recent tags:', error.message);
    return [];
  }
  return (data || []).map((row: { id: string; name: string; created_at: string }) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

/**
 * Load taxonomy context from Supabase (Ana / WhatsApp / dashboard).
 * @param includeRecentCreations — when false, skips extra queries (e.g. previous-month comparisons).
 */
export async function loadCanonicalTaxonomyContext(options: {
  supabase: { from: (t: string) => any };
  userId: string;
  startDate: string;
  endDate: string;
  includeRecentCreations?: boolean;
  recentWindowDays?: number;
  generatedAt?: string;
}): Promise<CanonicalTaxonomyContext> {
  const {
    supabase,
    userId,
    startDate,
    endDate,
    includeRecentCreations = true,
    recentWindowDays = 14,
    generatedAt,
  } = options;

  const [transactions, cardRows] = await Promise.all([
    fetchTaxonomyTransactions(supabase, userId, startDate, endDate),
    fetchTaxonomyCardTransactions(supabase, userId, endDate),
  ]);

  let recentUserCategories: CanonicalTaxonomyNamedRow[] = [];
  let recentUserTags: CanonicalTaxonomyNamedRow[] = [];

  if (includeRecentCreations) {
    const since = new Date();
    since.setDate(since.getDate() - recentWindowDays);
    const sinceIso = since.toISOString();
    [recentUserCategories, recentUserTags] = await Promise.all([
      fetchRecentUserCategories(supabase, userId, sinceIso),
      fetchRecentUserTags(supabase, userId, sinceIso),
    ]);
  }

  const { taxonomy } = buildLedgerTaxonomyBundle(transactions, cardRows, startDate, endDate, {
    generatedAt,
    recentUserCategories,
    recentUserTags,
  });

  return taxonomy;
}
