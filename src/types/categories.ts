export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  keywords?: string[];
}

export type CategoryType = 'income' | 'expense';

/** Runtime source of truth for the category taxonomy is the Postgres `categories` table, not static seed lists. */
export type CanonicalCategorySource = 'database';

/** Category manager UI tabs in the live Categories page. */
export type CategoryManagerTab = 'expense' | 'income';

/** Entity kinds that carry `category_id` in Supabase. */
export type CanonicalCategoryEntityType =
  | 'transaction'
  | 'credit_card_transaction'
  | 'payable_bill'
  | 'financial_goal';

/** Entity kinds that can be assigned tags through junction tables. */
export type CanonicalTaggableEntityType =
  | 'transaction'
  | 'credit_card_transaction'
  | 'payable_bill';

/** Payload for updating `category_id` on the entity row identified by `entityType` + `entityId`. */
export interface CanonicalCategoryAssignmentInput {
  entityType: CanonicalCategoryEntityType;
  entityId: string;
  categoryId: string | null;
}
