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

// Cores visuais para seletor
export const COLOR_OPTIONS = [
  { key: 'blue', name: 'Azul', color: '#3b82f6' },
  { key: 'green', name: 'Verde', color: '#10b981' },
  { key: 'orange', name: 'Laranja', color: '#f59e0b' },
  { key: 'purple', name: 'Roxo', color: '#8b5cf6' },
  { key: 'red', name: 'Vermelho', color: '#ef4444' },
  { key: 'pink', name: 'Rosa', color: '#ec4899' },
  { key: 'cyan', name: 'Ciano', color: '#06b6d4' },
  { key: 'yellow', name: 'Amarelo', color: '#eab308' },
] as const;

export const ACCOUNT_ICONS = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Wallet,
  investment: TrendingUp,
  credit_card: CreditCard,
} as const;