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

// ============================================
// CREDIT CARDS - Sistema Completo
// ============================================

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners';
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue' | 'partial';
export type PaymentType = 'full' | 'minimum' | 'partial' | 'other';
export type TransactionSource = 'manual' | 'whatsapp' | 'import' | 'open_finance';

// Cartão de Crédito
export interface CreditCard {
  id: string;
  user_id: string;
  account_id?: string;
  name: string;
  brand: CardBrand;
  last_four_digits: string;
  credit_limit: number;
  available_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  icon: string;
  is_active: boolean;
  is_archived: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCreditCardInput {
  name: string;
  brand: CardBrand;
  last_four_digits: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
  icon?: string;
  notes?: string;
}

export interface UpdateCreditCardInput extends Partial<CreateCreditCardInput> {
  is_active?: boolean;
  is_archived?: boolean;
}

// Fatura de Cartão
export interface CreditCardInvoice {
  id: string;
  credit_card_id: string;
  user_id: string;
  reference_month: Date;
  closing_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  payment_date?: Date;
  payment_account_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInvoiceInput {
  credit_card_id: string;
  reference_month: Date;
  closing_date: Date;
  due_date: Date;
}

export interface InvoiceFilters {
  cardId?: string;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
}

// Transação de Cartão
export interface CreditCardTransaction {
  id: string;
  credit_card_id: string;
  invoice_id?: string;
  user_id: string;
  category_id?: string;
  description: string;
  amount: number;
  purchase_date: Date;
  is_installment: boolean;
  installment_number?: number;
  total_installments?: number;
  installment_group_id?: string;
  establishment?: string;
  notes?: string;
  attachment_url?: string;
  source: TransactionSource;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCreditCardTransactionInput {
  credit_card_id: string;
  description: string;
  amount: number;
  purchase_date: Date;
  category_id?: string;
  establishment?: string;
  notes?: string;
}

export interface CreateInstallmentInput extends CreateCreditCardTransactionInput {
  total_installments: number;
}

export interface InstallmentPlan {
  installment_number: number;
  amount: number;
  due_date: Date;
  invoice_month: Date;
}

// Pagamento de Fatura
export interface CreditCardPayment {
  id: string;
  invoice_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'total' | 'minimum' | 'partial';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  invoice_id: string;
  account_id?: string;
  amount: number;
  payment_date?: Date;
  payment_type: PaymentType;
  notes?: string;
}

// Views - Dados Agregados
export interface CreditCardSummary extends CreditCard {
  current_invoice_id?: string;
  current_invoice_amount?: number;
  current_due_date?: Date;
  current_invoice_status?: InvoiceStatus;
  next_invoice_id?: string;
  next_invoice_amount?: number;
  next_due_date?: Date;
  used_limit: number;
  usage_percentage: number;
  total_transactions: number;
  paid_invoices_count: number;
}

export interface InvoiceDetailed extends CreditCardInvoice {
  card_name: string;
  brand: CardBrand;
  last_four_digits: string;
  transaction_count: number;
  payment_count: number;
  transactions_sum: number;
  payments_sum: number;
  is_overdue: boolean;
  days_until_due: number;
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
