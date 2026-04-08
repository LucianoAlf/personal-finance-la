/**
 * Canonical taxonomy contract (frontend).
 *
 * The database `categories` table is the runtime source of truth for category taxonomy.
 * `src/constants/master-categories.ts` is seed/reference metadata only; do not treat it
 * as authoritative for persisted category data.
 */

import type {
  CanonicalCategorySource,
  CanonicalCategoryEntityType,
  CanonicalTaggableEntityType,
  CategoryManagerTab,
  CategoryType,
} from '@/types/categories';

export type {
  CanonicalCategoryAssignmentInput,
  CanonicalCategorySource,
  CanonicalCategoryEntityType,
  CanonicalTaggableEntityType,
  CategoryManagerTab,
} from '@/types/categories';
export type { CanonicalTagAssignmentInput } from '@/types/tags';

export type CanonicalTagJunctionTable =
  | 'transaction_tags'
  | 'credit_card_transaction_tags'
  | 'bill_tags';

export type CanonicalTagEntityIdColumn =
  | 'transaction_id'
  | 'credit_card_transaction_id'
  | 'bill_id';

export type CanonicalCategoryEntityTable =
  | 'transactions'
  | 'credit_card_transactions'
  | 'payable_bills'
  | 'financial_goals';

/** Column storing the category FK on entity tables (shared name across supported tables). */
export const CANONICAL_CATEGORY_ID_COLUMN = 'category_id' as const;

export function getCanonicalCategorySource(): CanonicalCategorySource {
  return 'database';
}

export function getCategoryTypeForManagerTab(tab: CategoryManagerTab): CategoryType {
  return tab === 'income' ? 'income' : 'expense';
}

export function shouldTreatMasterCategoriesAsSeedOnly(): boolean {
  return true;
}

/** Supabase table name for tag junction rows for this entity kind. */
export function getCanonicalTagJunctionTable(
  entityType: CanonicalTaggableEntityType,
): CanonicalTagJunctionTable {
  switch (entityType) {
    case 'transaction':
      return 'transaction_tags';
    case 'credit_card_transaction':
      return 'credit_card_transaction_tags';
    case 'payable_bill':
      return 'bill_tags';
  }
}

/** FK column on the tag junction table pointing at the entity row. */
export function getCanonicalTagEntityIdColumn(
  entityType: CanonicalTaggableEntityType,
): CanonicalTagEntityIdColumn {
  switch (entityType) {
    case 'transaction':
      return 'transaction_id';
    case 'credit_card_transaction':
      return 'credit_card_transaction_id';
    case 'payable_bill':
      return 'bill_id';
  }
}

/** Table that owns `category_id` for this entity kind. */
export function getCanonicalCategoryEntityTable(
  entityType: CanonicalCategoryEntityType,
): CanonicalCategoryEntityTable {
  switch (entityType) {
    case 'transaction':
      return 'transactions';
    case 'credit_card_transaction':
      return 'credit_card_transactions';
    case 'payable_bill':
      return 'payable_bills';
    case 'financial_goal':
      return 'financial_goals';
  }
}
