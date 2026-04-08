import { describe, expect, it } from 'vitest';
import type {
  CanonicalCategoryEntityType,
  CanonicalTaggableEntityType,
  CategoryManagerTab,
} from '@/types/categories';

import {
  getCanonicalCategoryEntityTable,
  getCanonicalCategorySource,
  getCanonicalTagEntityIdColumn,
  getCanonicalTagJunctionTable,
  getCategoryTypeForManagerTab,
  shouldTreatMasterCategoriesAsSeedOnly,
} from '@/utils/categorization/canonical-taxonomy';

describe('canonical taxonomy', () => {
  it('treats database categories as the runtime source of truth', () => {
    expect(getCanonicalCategorySource()).toBe('database');
  });

  it('maps manager tabs to real category types', () => {
    const expenseTab: CategoryManagerTab = 'expense';
    const incomeTab: CategoryManagerTab = 'income';

    expect(getCategoryTypeForManagerTab(expenseTab)).toBe('expense');
    expect(getCategoryTypeForManagerTab(incomeTab)).toBe('income');
  });

  it('preserves income type when creating or editing a category from the income manager tab', () => {
    expect(getCategoryTypeForManagerTab('income')).toBe('income');
  });

  it('marks static master categories as seed-only metadata', () => {
    expect(shouldTreatMasterCategoriesAsSeedOnly()).toBe(true);
  });

  it('maps only taggable entity types to tag junction tables', () => {
    const transaction: CanonicalTaggableEntityType = 'transaction';
    const creditCardTransaction: CanonicalTaggableEntityType = 'credit_card_transaction';
    const payableBill: CanonicalTaggableEntityType = 'payable_bill';

    expect(getCanonicalTagJunctionTable(transaction)).toBe('transaction_tags');
    expect(getCanonicalTagJunctionTable(creditCardTransaction)).toBe(
      'credit_card_transaction_tags',
    );
    expect(getCanonicalTagJunctionTable(payableBill)).toBe('bill_tags');
  });

  it('maps only taggable entity types to tag junction foreign-key column names', () => {
    const transaction: CanonicalTaggableEntityType = 'transaction';
    const creditCardTransaction: CanonicalTaggableEntityType = 'credit_card_transaction';
    const payableBill: CanonicalTaggableEntityType = 'payable_bill';

    expect(getCanonicalTagEntityIdColumn(transaction)).toBe('transaction_id');
    expect(getCanonicalTagEntityIdColumn(creditCardTransaction)).toBe(
      'credit_card_transaction_id',
    );
    expect(getCanonicalTagEntityIdColumn(payableBill)).toBe('bill_id');
  });

  it('maps category-bearing entity types to tables that own category_id', () => {
    const transaction: CanonicalCategoryEntityType = 'transaction';
    const creditCardTransaction: CanonicalCategoryEntityType = 'credit_card_transaction';
    const payableBill: CanonicalCategoryEntityType = 'payable_bill';
    const financialGoal: CanonicalCategoryEntityType = 'financial_goal';

    expect(getCanonicalCategoryEntityTable(transaction)).toBe('transactions');
    expect(getCanonicalCategoryEntityTable(creditCardTransaction)).toBe(
      'credit_card_transactions',
    );
    expect(getCanonicalCategoryEntityTable(payableBill)).toBe('payable_bills');
    expect(getCanonicalCategoryEntityTable(financialGoal)).toBe('financial_goals');
  });
});
