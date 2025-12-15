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

// =====================================================
// GAMIFICAÇÃO
// =====================================================

export interface UserGamification {
  id: string;
  user_id: string;
  
  // Sistema de XP e Níveis
  level: number;
  xp: number;
  total_xp: number;
  
  // Streaks
  current_streak: number;
  best_streak: number;
  last_activity_date?: Date;
  
  // Preferências
  animations_enabled: boolean;
  sounds_enabled: boolean;
  notifications_enabled: boolean;
  
  // Metadados
  created_at: Date;
  updated_at: Date;
}

export interface BadgeProgress {
  id: string;
  user_id: string;
  badge_id: string;
  
  // Progresso e Tier
  tier: 'bronze' | 'silver' | 'gold';
  progress: number;
  target: number;
  
  // Status
  unlocked: boolean;
  unlocked_at?: Date;
  
  // Recompensas
  xp_reward: number;
  
  // Metadados
  created_at: Date;
  updated_at: Date;
}

export interface Challenge {
  id: string;
  user_id: string;
  
  // Informações do desafio
  title: string;
  description?: string;
  type: 'savings' | 'spending' | 'streak' | 'custom';
  
  // Metas
  target_value: number;
  current_value: number;
  
  // Prazo
  deadline?: Date;
  
  // Recompensas
  xp_reward: number;
  
  // Status
  status: 'active' | 'completed' | 'failed' | 'expired';
  completed_at?: Date;
  
  // Metadados
  created_at: Date;
  updated_at: Date;
}

export interface AddXPResult {
  new_level: number;
  new_xp: number;
  total_xp: number;
  leveled_up: boolean;
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

// ============================================
// FINANCIAL GOALS - Sistema Unificado de Metas
// ============================================

export type GoalType = 'savings' | 'spending_limit';
export type GoalStatus = 'active' | 'completed' | 'exceeded' | 'archived';
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

// Meta Financeira (Unificada)
export interface FinancialGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  name: string;
  icon?: string;
  target_amount: number;
  current_amount: number;
  
  // Específico para Savings (Economia)
  deadline?: Date;
  
  // Específico para Spending Limit (Controle de Gastos)
  category_id?: string;
  period_type?: PeriodType;
  period_start?: Date;
  period_end?: Date;
  
  // Gamificação
  status: GoalStatus;
  streak_count: number;
  best_streak: number;
  
  created_at: Date;
  updated_at: Date;
}

// Inputs para criar metas
export interface CreateSavingsGoalInput {
  name: string;
  icon?: string;
  target_amount: number;
  current_amount?: number;
  deadline: Date;
}

export interface CreateSpendingGoalInput {
  name: string;
  category_id: string;
  target_amount: number;
  period_type: PeriodType;
  period_start: Date;
  period_end: Date;
}

export type CreateGoalInput = CreateSavingsGoalInput | CreateSpendingGoalInput;

// Meta com informações extras (para UI)
export interface FinancialGoalWithCategory extends FinancialGoal {
  category_name?: string;
  category_icon?: string;
  percentage: number;
  remaining: number;
  days_left?: number;
}

// Progresso de meta
export interface GoalProgress {
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'exceeded';
  days_left?: number;
  average_daily?: number;
  projected_total?: number;
}

// Badge de conquista
export interface GoalBadge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlocked_at?: Date;
}

// Estatísticas de metas
export interface GoalStats {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  exceeded_goals: number;
  total_savings: number;
  best_streak: number;
  completion_rate: number;
}

// LEGACY: Manter para compatibilidade
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
  issuing_bank?: string;
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
  issuing_bank?: string;
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
  total_amount?: number; // Valor total da compra parcelada
  purchase_date: Date;
  is_installment: boolean;
  is_parent_installment?: boolean; // True se for registro pai de parcelamento
  installment_number?: number;
  total_installments?: number;
  installment_group_id?: string;
  establishment?: string;
  notes?: string;
  attachment_url?: string;
  source: TransactionSource;
  created_at: Date;
  updated_at: Date;
  // Campos da view (opcionais)
  credit_card_name?: string;
  category_name?: string;
  category_icon?: string;
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

// =====================================================
// INVESTIMENTOS - Sincronizado com tabela investments (Sprint 1)
// =====================================================
export interface Investment {
  // Campos principais
  id: string;
  user_id: string;
  type: 'stock' | 'fund' | 'treasury' | 'crypto' | 'real_estate' | 'other';
  name: string;
  ticker: string | null;
  
  // Quantidades e preços
  quantity: number;
  purchase_price: number;
  current_price: number | null;
  total_invested: number | null;
  current_value: number | null;
  
  // Metadados
  purchase_date: Date | null;
  notes: string | null;
  is_active: boolean;
  
  // SPRINT 1: Campos novos
  category: 'fixed_income' | 'stock' | 'reit' | 'fund' | 'crypto' | 'international' | null;
  subcategory: string | null;
  dividend_yield: number | null;
  maturity_date: Date | null;
  annual_rate: number | null;
  last_price_update: Date | null;
  status: 'active' | 'sold' | 'matured';
  account_id: string | null;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Input para criar novo investimento
export interface CreateInvestmentInput {
  type: Investment['type'];
  name: string;
  ticker?: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  purchase_date?: Date;
  notes?: string;
}

// Input para atualizar investimento existente
export interface UpdateInvestmentInput {
  name?: string;
  ticker?: string;
  quantity?: number;
  purchase_price?: number;
  current_price?: number;
  purchase_date?: Date;
  notes?: string;
  is_active?: boolean;
  // Sprint 1
  category?: Investment['category'];
  subcategory?: string;
  dividend_yield?: number;
  maturity_date?: Date;
  annual_rate?: number;
  status?: Investment['status'];
  account_id?: string;
}

// =====================================================
// SPRINT 1: NOVAS INTERFACES
// =====================================================

// Investment Accounts (Corretoras/Bancos)
export interface InvestmentAccount {
  id: string;
  user_id: string;
  name: string;
  institution_name: string | null;
  account_type: 'brokerage' | 'bank' | 'crypto_exchange' | 'other';
  currency: 'BRL' | 'USD' | 'EUR';
  account_number: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountInput {
  name: string;
  institution_name?: string;
  account_type: InvestmentAccount['account_type'];
  currency?: InvestmentAccount['currency'];
  account_number?: string;
}

export interface UpdateAccountInput {
  name?: string;
  institution_name?: string;
  account_type?: InvestmentAccount['account_type'];
  account_number?: string;
  is_active?: boolean;
}

// Investment Transactions (Histórico)
export interface InvestmentTransaction {
  id: string;
  investment_id: string | null;
  user_id: string;
  transaction_type: 'buy' | 'sell' | 'dividend' | 'interest' | 'fee' | 'split' | 'bonus';
  quantity: number | null;
  price: number | null;
  total_value: number;
  fees: number;
  tax: number;
  transaction_date: Date;
  notes: string | null;
  created_at: Date;
}

export interface CreateTransactionInput {
  investment_id?: string;
  transaction_type: InvestmentTransaction['transaction_type'];
  quantity?: number;
  price?: number;
  total_value: number;
  fees?: number;
  tax?: number;
  transaction_date: Date;
  notes?: string;
}

// Allocation Targets (Metas de Alocação)
export interface InvestmentAllocationTarget {
  id: string;
  user_id: string;
  asset_class: string;
  target_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAllocationTargetInput {
  asset_class: string;
  target_percentage: number;
}

export interface UpdateAllocationTargetInput {
  target_percentage?: number;
}

// Quotes History (Cache de Cotações)
export interface InvestmentQuoteHistory {
  id: string;
  symbol: string;
  price: number;
  variation: number | null;
  volume: number | null;
  source: 'brapi' | 'coingecko' | 'tesouro' | 'bcb' | 'manual';
  timestamp: Date;
  metadata: Record<string, any> | null;
}

// Market Opportunities (Ana Clara)
export interface MarketOpportunity {
  id: string;
  user_id: string;
  ticker: string;
  opportunity_type: 'buy_opportunity' | 'sell_signal' | 'dividend_alert' | 'price_target' | 'sector_rotation';
  title: string;
  description: string | null;
  current_price: number | null;
  target_price: number | null;
  expected_return: number | null;
  ana_clara_insight: string | null;
  confidence_score: number | null;
  expires_at: Date | null;
  is_active: boolean;
  is_dismissed: boolean;
  dismissed_at: Date | null;
  created_at: Date;
}

// Portfolio Metrics
export interface PortfolioMetrics {
  diversification_score: number;
  portfolio_health_score: number;
  total_dividends: number;
  rebalancing_needed: boolean;
  concentration_risk: 'BAIXO' | 'MÉDIO' | 'ALTO';
  asset_allocation: Record<string, number>;
}

// Portfolio Summary (View)
export interface PortfolioSummary {
  user_id: string;
  total_assets: number;
  total_invested: number;
  current_value: number;
  total_return: number;
  return_percentage: number;
  categories_count: number;
  accounts_count: number;
  last_updated: Date;
}

// Investment Performance (View)
export interface InvestmentPerformance {
  user_id: string;
  category: string;
  asset_count: number;
  total_value: number;
  total_invested: number;
  total_return: number;
  avg_return_pct: number;
  avg_dividend_yield: number | null;
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

// =====================================================
// BADGES SYSTEM (SPRINT 4)
// =====================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'investment' | 'engagement' | 'performance';
  condition_type: string;
  condition_value: Record<string, any>;
  created_at: Date;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: Date;
  created_at: Date;
}

export interface UserBadgeDetailed extends UserBadge {
  name: string;
  description: string;
  icon: string;
  category: 'investment' | 'engagement' | 'performance';
}
