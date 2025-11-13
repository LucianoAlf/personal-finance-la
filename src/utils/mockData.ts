/**
 * ⚠️ DEPRECATED - NÃO USAR EM PRODUÇÃO
 * 
 * Este arquivo contém dados mockados apenas para referência e testes.
 * 
 * ✅ USE OS HOOKS OFICIAIS AO INVÉS DESTE ARQUIVO:
 * - useAccounts() → para contas bancárias
 * - useTransactions() → para transações
 * - useCategories() → para categorias
 * - useCreditCards() → para cartões de crédito
 * - useGoals() → para metas financeiras
 * - useInvestments() → para investimentos
 * 
 * Todos os hooks estão disponíveis em: src/hooks/
 * 
 * @deprecated Use os hooks oficiais
 * @see src/hooks/useAccounts.ts
 * @see src/hooks/useTransactions.ts
 */

import { Account, Transaction, Category, CreditCard, Goal, Investment } from '@/types/database.types';

/** @deprecated Use useCategories() */
// Mock Categories
export const mockCategories: Category[] = [
  { id: '1', user_id: '1', name: 'Moradia', icon: 'Home', color: '#8b5cf6', type: 'expense', created_at: new Date() },
  { id: '2', user_id: '1', name: 'Aluguel', parent_id: '1', icon: 'Home', color: '#8b5cf6', type: 'expense', created_at: new Date() },
  { id: '3', user_id: '1', name: 'Alimentação', icon: 'UtensilsCrossed', color: '#10b981', type: 'expense', created_at: new Date() },
  { id: '4', user_id: '1', name: 'Supermercado', parent_id: '3', icon: 'ShoppingCart', color: '#10b981', type: 'expense', created_at: new Date() },
  { id: '5', user_id: '1', name: 'Restaurantes', parent_id: '3', icon: 'UtensilsCrossed', color: '#10b981', type: 'expense', created_at: new Date() },
  { id: '6', user_id: '1', name: 'Transporte', icon: 'Car', color: '#3b82f6', type: 'expense', created_at: new Date() },
  { id: '7', user_id: '1', name: 'Saúde', icon: 'Heart', color: '#ef4444', type: 'expense', created_at: new Date() },
  { id: '8', user_id: '1', name: 'Lazer', icon: 'Play', color: '#f59e0b', type: 'expense', created_at: new Date() },
  { id: '9', user_id: '1', name: 'Salário', icon: 'Wallet', color: '#10b981', type: 'income', created_at: new Date() },
  { id: '10', user_id: '1', name: 'Freelance', icon: 'Briefcase', color: '#3b82f6', type: 'income', created_at: new Date() },
];

/** @deprecated Use useAccounts() */
// Mock Accounts
export const mockAccounts: Account[] = [
  {
    id: '1',
    user_id: '1',
    name: 'Conta Corrente Itaú',
    type: 'checking',
    bank: 'itau',
    balance: 5420.50,
    color: '#FF6600',
    icon: 'Landmark',
    include_in_total: true,
    created_at: new Date(),
  },
  {
    id: '2',
    user_id: '1',
    name: 'Nubank',
    type: 'checking',
    bank: 'nubank',
    balance: 2150.00,
    color: '#8B10AE',
    icon: 'CreditCard',
    include_in_total: true,
    created_at: new Date(),
  },
  {
    id: '3',
    user_id: '1',
    name: 'Carteira',
    type: 'wallet',
    bank: 'other',
    balance: 320.00,
    color: '#6B7280',
    icon: 'Wallet',
    include_in_total: true,
    created_at: new Date(),
  },
  {
    id: '4',
    user_id: '1',
    name: 'Poupança',
    type: 'savings',
    bank: 'bb',
    balance: 8500.00,
    color: '#FFF200',
    icon: 'PiggyBank',
    include_in_total: true,
    created_at: new Date(),
  },
];

/** @deprecated Use useTransactions() */
// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: '1',
    user_id: '1',
    account_id: '1',
    type: 'expense',
    description: 'Supermercado Extra',
    amount: 285.40,
    date: new Date(),
    category_id: '4',
    is_paid: true,
    is_recurring: false,
    created_at: new Date(),
  },
  {
    id: '2',
    user_id: '1',
    account_id: '2',
    type: 'expense',
    description: 'Uber',
    amount: 35.50,
    date: new Date(Date.now() - 86400000),
    category_id: '6',
    is_paid: true,
    is_recurring: false,
    created_at: new Date(),
  },
  {
    id: '3',
    user_id: '1',
    account_id: '1',
    type: 'income',
    description: 'Salário',
    amount: 4500.00,
    date: new Date(Date.now() - 172800000),
    category_id: '9',
    is_paid: true,
    is_recurring: true,
    created_at: new Date(),
  },
  {
    id: '4',
    user_id: '1',
    account_id: '2',
    type: 'expense',
    description: 'Netflix',
    amount: 55.90,
    date: new Date(Date.now() - 259200000),
    category_id: '8',
    is_paid: true,
    is_recurring: true,
    recurring_frequency: 'monthly',
    created_at: new Date(),
  },
  {
    id: '5',
    user_id: '1',
    account_id: '1',
    type: 'expense',
    description: 'Aluguel',
    amount: 1500.00,
    date: new Date(Date.now() - 345600000),
    category_id: '2',
    is_paid: true,
    is_recurring: true,
    recurring_frequency: 'monthly',
    created_at: new Date(),
  },
  {
    id: '6',
    type: 'expense',
    user_id: '1',
    account_id: '1',
    description: 'Conta de Luz',
    category_id: '1',
    amount: 180.75,
    date: new Date('2024-01-05'),
    is_paid: false,
    is_recurring: true,
    created_at: new Date(),
  },
  {
    id: '7',
    type: 'expense',
    user_id: '1',
    account_id: '1',
    description: 'Seguro do Carro',
    category_id: '7',
    amount: 320.00,
    date: new Date('2024-01-04'),
    is_paid: false,
    is_recurring: true,
    created_at: new Date(),
  },
  {
    id: '8',
    type: 'income',
    user_id: '1',
    account_id: '2',
    description: 'Freelance Design',
    category_id: '10',
    amount: 800.00,
    date: new Date('2024-01-03'),
    is_paid: true,
    is_recurring: false,
    created_at: new Date(),
  },
];

/** @deprecated Use useCreditCards() */
// Mock Credit Cards
export const mockCreditCards: CreditCard[] = [
  {
    id: '1',
    user_id: '1',
    name: 'Nubank Platinum',
    brand: 'mastercard',
    last_four_digits: '4521',
    credit_limit: 5000.00,
    available_limit: 5000.00 - 1850.00,
    due_day: 15,
    closing_day: 8,
    color: '#8B10AE',
    icon: 'CreditCard',
    is_active: true,
    is_archived: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '2',
    user_id: '1',
    name: 'Itaú Gold',
    brand: 'visa',
    last_four_digits: '8932',
    credit_limit: 8000.00,
    available_limit: 8000.00 - 3420.50,
    due_day: 10,
    closing_day: 3,
    color: '#FF6600',
    icon: 'CreditCard',
    is_active: true,
    is_archived: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

/** @deprecated Use useGoals() */
// Mock Goals
export const mockGoals: Goal[] = [
  {
    id: '1',
    user_id: '1',
    name: 'Viagem para Europa',
    icon: 'Plane',
    target_amount: 30000.00,
    current_amount: 20100.00,
    target_date: new Date('2026-12-01'),
    created_at: new Date(),
  },
  {
    id: '2',
    user_id: '1',
    name: 'Reserva de Emergência',
    icon: 'Shield',
    target_amount: 18000.00,
    current_amount: 8500.00,
    target_date: new Date('2025-12-31'),
    created_at: new Date(),
  },
  {
    id: '3',
    user_id: '1',
    name: 'Novo Notebook',
    icon: 'Laptop',
    target_amount: 5000.00,
    current_amount: 3800.00,
    target_date: new Date('2025-06-30'),
    created_at: new Date(),
  },
];

/** @deprecated Use useInvestments() - NÃO USADO - Página usa useInvestments hook */
// Mock Investments
export const mockInvestments: Investment[] = [
  {
    id: '1',
    user_id: '1',
    type: 'stock',
    name: 'Petrobras PN',
    ticker: 'PETR4',
    quantity: 100,
    purchase_price: 35.20,
    current_price: 38.50,
    total_invested: 3520.00,
    current_value: 3850.00,
    purchase_date: null,
    notes: null,
    is_active: true,
    // Sprint 1 campos
    category: 'stock',
    subcategory: 'Energia',
    dividend_yield: 8.5,
    maturity_date: null,
    annual_rate: null,
    last_price_update: new Date(),
    status: 'active',
    account_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '2',
    user_id: '1',
    type: 'treasury',
    name: 'Tesouro Selic 2027',
    ticker: 'TS2027',
    quantity: 1,
    purchase_price: 5000.00,
    current_price: 5250.00,
    total_invested: 5000.00,
    current_value: 5250.00,
    purchase_date: null,
    notes: null,
    is_active: true,
    // Sprint 1 campos
    category: 'fixed_income',
    subcategory: 'Tesouro Direto',
    dividend_yield: null,
    maturity_date: new Date('2027-12-31'),
    annual_rate: 13.65,
    last_price_update: new Date(),
    status: 'active',
    account_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '3',
    user_id: '1',
    type: 'crypto',
    name: 'Bitcoin',
    ticker: 'BTC',
    quantity: 0.05,
    purchase_price: 280000.00,
    current_price: 295000.00,
    total_invested: 14000.00,
    current_value: 14750.00,
    purchase_date: null,
    notes: null,
    is_active: true,
    // Sprint 1 campos
    category: 'crypto',
    subcategory: 'Criptomoeda',
    dividend_yield: null,
    maturity_date: null,
    annual_rate: null,
    last_price_update: new Date(),
    status: 'active',
    account_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];
