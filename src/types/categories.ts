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
