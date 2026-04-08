import { describe, expect, it } from 'vitest';

import {
  mergeCategoryUsageFromRows,
  mergeCategoryUsageWithAuxiliaryCounts,
  type CategoryUsageRow,
} from './merge-category-usage';

describe('mergeCategoryUsageFromRows', () => {
  it('aggregates bank and card rows per category_id', () => {
    const cat = 'cat-1';
    const bank: CategoryUsageRow[] = [
      { category_id: cat, amount: 100, categories: { name: 'Food' } },
      { category_id: cat, amount: 50, categories: { name: 'Food' } },
    ];
    const card: CategoryUsageRow[] = [
      { category_id: cat, amount: 30, categories: { name: 'Food' } },
    ];

    const result = mergeCategoryUsageFromRows(bank, card);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      categoryId: cat,
      categoryName: 'Food',
      transactionCount: 3,
      totalAmount: 180,
    });
  });

  it('skips rows without category_id', () => {
    const rows: CategoryUsageRow[] = [
      { category_id: null, amount: 999, categories: null },
      { category_id: 'x', amount: 1, categories: { name: 'A' } },
    ];
    expect(mergeCategoryUsageFromRows(rows, [])).toHaveLength(1);
  });

  it('keeps separate stats per category', () => {
    const merged = mergeCategoryUsageFromRows(
      [{ category_id: 'a', amount: 10, categories: { name: 'A' } }],
      [{ category_id: 'b', amount: 20, categories: { name: 'B' } }],
    );
    expect(merged).toHaveLength(2);
  });
});

describe('mergeCategoryUsageWithAuxiliaryCounts', () => {
  it('adds bill, goal, and legacy budget counts and includes categories only on auxiliary tables', () => {
    const merged = mergeCategoryUsageFromRows(
      [{ category_id: 'a', amount: 10, categories: { name: 'A' } }],
      [],
    );
    const auxiliary = {
      payableBillsByCategoryId: new Map<string, number>([
        ['a', 2],
        ['b', 1],
      ]),
      financialGoalsByCategoryId: new Map<string, number>([['b', 3]]),
      legacyBudgetsByCategoryId: new Map<string, number>([['c', 1]]),
    };

    const result = mergeCategoryUsageWithAuxiliaryCounts(merged, auxiliary);
    const byId = Object.fromEntries(result.map((r) => [r.categoryId, r]));

    expect(byId.a).toMatchObject({
      transactionCount: 1,
      payableBillsCount: 2,
      financialGoalsCount: 0,
      legacyBudgetsCount: 0,
    });
    expect(byId.b).toMatchObject({
      transactionCount: 0,
      categoryName: '',
      payableBillsCount: 1,
      financialGoalsCount: 3,
    });
    expect(byId.c).toMatchObject({
      transactionCount: 0,
      legacyBudgetsCount: 1,
    });
  });
});
