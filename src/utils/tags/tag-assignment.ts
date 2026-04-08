import type { SupabaseClient } from '@supabase/supabase-js';

import type { CanonicalTaggableEntityType } from '@/types/categories';
import type { Transaction } from '@/types/transactions';
import type { CanonicalTagAssignmentInput } from '@/types/tags';
import {
  getCanonicalTagEntityIdColumn,
  getCanonicalTagJunctionTable,
  type CanonicalTagJunctionTable,
} from '@/utils/categorization/canonical-taxonomy';

export type { CanonicalTagJunctionTable };

/**
 * Resolves the Supabase junction table name for tag rows for this entity kind.
 * @see getCanonicalTagJunctionTable — kept as the plan-facing API name for Task 4.
 */
export function getTagAssignmentTarget(input: {
  entityType: CanonicalTaggableEntityType;
}): CanonicalTagJunctionTable {
  return getCanonicalTagJunctionTable(input.entityType);
}

/** Whether a unified list row should persist tags on bank `transaction_tags` or card `credit_card_transaction_tags`. */
export function getTaggableEntityTypeForTransactionRow(
  transaction: Transaction | undefined,
): CanonicalTaggableEntityType {
  if (!transaction) return 'transaction';
  if (transaction.credit_card_id) return 'credit_card_transaction';
  if (transaction.payment_method === 'credit') return 'credit_card_transaction';
  return 'transaction';
}

export function getTransactionWriteTarget(
  transaction: Transaction | undefined,
  pendingCreatedEntityId: string | null,
):
  | { mode: 'create'; entityType: 'transaction' }
  | { mode: 'update'; entityId: string; entityType: CanonicalTaggableEntityType } {
  if (transaction) {
    return {
      mode: 'update',
      entityId: transaction.id,
      entityType: getTaggableEntityTypeForTransactionRow(transaction),
    };
  }

  if (pendingCreatedEntityId) {
    return {
      mode: 'update',
      entityId: pendingCreatedEntityId,
      entityType: 'transaction',
    };
  }

  return {
    mode: 'create',
    entityType: 'transaction',
  };
}

/** Replace all tag links for a canonical entity (correct junction table + FK column). */
export async function replaceCanonicalTagAssignments(
  client: SupabaseClient,
  input: CanonicalTagAssignmentInput,
): Promise<void> {
  const table = getCanonicalTagJunctionTable(input.entityType);
  const idCol = getCanonicalTagEntityIdColumn(input.entityType);

  const { error: deleteError } = await client.from(table).delete().eq(idCol, input.entityId);
  if (deleteError) throw deleteError;

  if (input.tagIds.length === 0) return;

  const rows = input.tagIds.map((tagId) => ({
    [idCol]: input.entityId,
    tag_id: tagId,
  }));

  const { error: insertError } = await client.from(table).insert(rows);
  if (insertError) throw insertError;
}
