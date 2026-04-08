import type { CanonicalTaggableEntityType } from './categories';

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionTag {
  id: string;
  transaction_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

export interface CreditCardTransactionTag {
  id: string;
  credit_card_transaction_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

/** Payload for tag writes routed to the correct junction table for {@link CanonicalTaggableEntityType}. */
export interface CanonicalTagAssignmentInput {
  entityType: CanonicalTaggableEntityType;
  entityId: string;
  tagIds: string[];
}
