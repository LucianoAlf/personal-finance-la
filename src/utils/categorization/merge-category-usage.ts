/**
 * Pure merge of category usage rows from multiple ledger tables (e.g. bank + card).
 */

export interface CategoryUsageRow {
  category_id: string | null;
  amount: number | null | undefined;
  categories?: { name: string } | null;
}

export interface MergedCategoryStat {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
}

function accumulateRow(map: Map<string, MergedCategoryStat>, row: CategoryUsageRow): void {
  if (row.category_id == null || row.category_id === '') return;

  const amount = Number(row.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const nameFromJoin = row.categories?.name?.trim();
  const resolvedName = nameFromJoin && nameFromJoin.length > 0 ? nameFromJoin : 'Sem Categoria';

  const existing = map.get(row.category_id);
  if (!existing) {
    map.set(row.category_id, {
      categoryId: row.category_id,
      categoryName: resolvedName,
      transactionCount: 1,
      totalAmount: safeAmount,
    });
    return;
  }

  existing.transactionCount += 1;
  existing.totalAmount += safeAmount;
  if (existing.categoryName === 'Sem Categoria' && resolvedName !== 'Sem Categoria') {
    existing.categoryName = resolvedName;
  }
}

export function mergeCategoryUsageFromRows(
  bankRows: CategoryUsageRow[],
  cardRows: CategoryUsageRow[],
): MergedCategoryStat[] {
  const map = new Map<string, MergedCategoryStat>();
  for (const row of bankRows) accumulateRow(map, row);
  for (const row of cardRows) accumulateRow(map, row);
  return Array.from(map.values());
}

/** Per-category counts from tables that reference category_id outside the unified transaction ledger. */
export interface CategoryAuxiliaryCountMaps {
  payableBillsByCategoryId: Map<string, number>;
  financialGoalsByCategoryId: Map<string, number>;
  legacyBudgetsByCategoryId: Map<string, number>;
}

export interface CategoryUsageWithAuxiliary extends MergedCategoryStat {
  payableBillsCount: number;
  financialGoalsCount: number;
  legacyBudgetsCount: number;
}

function addMapKeysToSet(set: Set<string>, map: Map<string, number>): void {
  for (const id of map.keys()) {
    if (id) set.add(id);
  }
}

/**
 * Unions ledger merge stats with payable bills, goals, and legacy budgets so management UI
 * can block delete or require reassignment for every dependent row.
 */
export function mergeCategoryUsageWithAuxiliaryCounts(
  merged: MergedCategoryStat[],
  auxiliary: CategoryAuxiliaryCountMaps,
): CategoryUsageWithAuxiliary[] {
  const idSet = new Set<string>();
  for (const s of merged) idSet.add(s.categoryId);
  addMapKeysToSet(idSet, auxiliary.payableBillsByCategoryId);
  addMapKeysToSet(idSet, auxiliary.financialGoalsByCategoryId);
  addMapKeysToSet(idSet, auxiliary.legacyBudgetsByCategoryId);

  const mergedById = new Map(merged.map((s) => [s.categoryId, s]));

  return [...idSet].map((categoryId) => {
    const base = mergedById.get(categoryId);
    return {
      categoryId,
      categoryName: base?.categoryName ?? '',
      transactionCount: base?.transactionCount ?? 0,
      totalAmount: base?.totalAmount ?? 0,
      payableBillsCount: auxiliary.payableBillsByCategoryId.get(categoryId) ?? 0,
      financialGoalsCount: auxiliary.financialGoalsByCategoryId.get(categoryId) ?? 0,
      legacyBudgetsCount: auxiliary.legacyBudgetsByCategoryId.get(categoryId) ?? 0,
    };
  });
}
