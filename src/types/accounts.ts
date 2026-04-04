export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'investment' | 'credit_card';
  bank_name?: string;
  initial_balance: number;
  current_balance: number;
  color: string;
  icon: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountType = Account['type'];