// Mapeamento de tipos para labels em português
export const CATEGORY_TYPES = {
  income: 'Receita',
  expense: 'Despesa',
} as const;

// Mapeamento de tipos de transação
export const TRANSACTION_TYPES = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
} as const;

// Cores por tipo
export const TYPE_COLORS = {
  income: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  expense: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-600',
  },
  transfer: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
} as const;

// Tipos de recorrência
export const RECURRENCE_TYPES = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
} as const;
