import { 
  Landmark, 
  PiggyBank, 
  Wallet, 
  TrendingUp, 
  CreditCard 
} from 'lucide-react';

export const ACCOUNT_TYPES = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  cash: 'Carteira',
  investment: 'Investimento',
  credit_card: 'Cartão de Crédito',
} as const;

export const ACCOUNT_COLORS = {
  checking: '#3b82f6',
  savings: '#10b981',
  cash: '#f59e0b',
  investment: '#8b5cf6',
  credit_card: '#ef4444',
} as const;

export const ACCOUNT_ICONS = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Wallet,
  investment: TrendingUp,
  credit_card: CreditCard,
} as const;