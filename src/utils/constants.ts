export const BANKS = [
  { value: 'nubank', label: 'Nubank', color: '#8B10AE' },
  { value: 'itau', label: 'Itaú', color: '#FF6600' },
  { value: 'bradesco', label: 'Bradesco', color: '#CC092F' },
  { value: 'santander', label: 'Santander', color: '#EC0000' },
  { value: 'bb', label: 'Banco do Brasil', color: '#FFF200' },
  { value: 'caixa', label: 'Caixa', color: '#0066B3' },
  { value: 'c6', label: 'C6 Bank', color: '#000000' },
  { value: 'inter', label: 'Inter', color: '#FF7A00' },
  { value: 'picpay', label: 'PicPay', color: '#11C76F' },
  { value: 'other', label: 'Outro', color: '#6B7280' },
];

export const CARD_BRANDS = [
  { value: 'visa', label: 'Visa', color: '#1A1F71' },
  { value: 'mastercard', label: 'Mastercard', color: '#EB001B' },
  { value: 'elo', label: 'Elo', color: '#FFED00' },
  { value: 'amex', label: 'American Express', color: '#006FCF' },
  { value: 'hipercard', label: 'Hipercard', color: '#D32027' },
];

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  WALLET: 'wallet',
  INVESTMENT: 'investment',
} as const;

export const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

export const GRADIENT_COLORS = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  orange: 'from-orange-500 to-orange-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  indigo: 'from-indigo-500 to-indigo-600',
};
