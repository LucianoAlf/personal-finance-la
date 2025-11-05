import { CardBrand } from '@/types/database.types';

// Informações das bandeiras de cartão
export const CARD_BRANDS: Record<CardBrand, { name: string; color: string; icon: string }> = {
  visa: {
    name: 'Visa',
    color: '#1A1F71',
    icon: 'CreditCard',
  },
  mastercard: {
    name: 'Mastercard',
    color: '#EB001B',
    icon: 'CreditCard',
  },
  elo: {
    name: 'Elo',
    color: '#FFCB05',
    icon: 'CreditCard',
  },
  amex: {
    name: 'American Express',
    color: '#006FCF',
    icon: 'CreditCard',
  },
  hipercard: {
    name: 'Hipercard',
    color: '#D8232A',
    icon: 'CreditCard',
  },
  diners: {
    name: 'Diners Club',
    color: '#0079BE',
    icon: 'CreditCard',
  },
};

// Status de faturas
export const INVOICE_STATUS_LABELS = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
  overdue: 'Vencida',
  partial: 'Parcialmente Paga',
};

export const INVOICE_STATUS_COLORS = {
  open: 'blue',
  closed: 'orange',
  paid: 'green',
  overdue: 'red',
  partial: 'yellow',
};

// Tipos de pagamento
export const PAYMENT_TYPE_LABELS = {
  full: 'Pagamento Total',
  minimum: 'Pagamento Mínimo',
  partial: 'Pagamento Parcial',
  other: 'Outro',
};

// Cores padrão para cartões
export const DEFAULT_CARD_COLORS = [
  '#8B10AE', // Roxo (Nubank)
  '#FF6600', // Laranja (Itaú)
  '#EC0000', // Vermelho (Santander)
  '#0066CC', // Azul (Bradesco)
  '#FFCC00', // Amarelo (Banco do Brasil)
  '#00A859', // Verde (Inter)
  '#6B46C1', // Roxo escuro
  '#2563EB', // Azul
];
