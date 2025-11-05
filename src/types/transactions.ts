export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  transaction_date: string;
  is_paid: boolean;
  is_recurring: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  attachment_url?: string;
  notes?: string;
  source: 'manual' | 'whatsapp' | 'import' | 'open_finance';
  whatsapp_message_id?: string;
  transfer_to_account_id?: string;
  created_at: string;
  updated_at: string;
  
  // Joins (quando buscar com relacionamentos)
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  account?: {
    id: string;
    name: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
