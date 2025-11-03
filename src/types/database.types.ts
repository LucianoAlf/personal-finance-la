// Tipos do banco de dados
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  couple_mode?: boolean;
  monthly_economy_goal?: number;
  closing_day?: number;
  created_at: Date;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet' | 'investment';
  bank: string;
  balance: number;
  color: string;
  icon: string;
  include_in_total: boolean;
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  amount: number;
  date: Date;
  category_id: string;
  is_paid?: boolean;
  is_recurring?: boolean;
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  attachment_url?: string;
  notes?: string;
  created_at: Date;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  icon: string;
  color: string;
  budget?: number;
  type: 'income' | 'expense';
  created_at: Date;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  target_date: Date;
  is_shared?: boolean;
  created_at: Date;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  last_four_digits: string;
  limit: number;
  current_balance: number;
  due_date: number;
  closing_date: number;
  color: string;
  created_at: Date;
}

export interface Investment {
  id: string;
  user_id: string;
  type: 'stock' | 'fixed_income' | 'fund' | 'crypto';
  symbol: string;
  quantity: number;
  average_price: number;
  current_price?: number;
  institution?: string;
  created_at: Date;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string; // YYYY-MM
  planned_amount: number;
  actual_amount: number;
  created_at: Date;
}
