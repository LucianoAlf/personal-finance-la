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

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}
