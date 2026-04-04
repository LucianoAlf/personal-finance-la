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

// Status de faturas com descrições detalhadas
export const INVOICE_STATUS_CONFIG = {
  open: {
    label: 'Aberta',
    description: 'Período de compras em andamento',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    icon: 'ShoppingCart',
  },
  closed: {
    label: 'Fechada',
    description: 'Aguardando pagamento',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    icon: 'Clock',
  },
  due_soon: {
    label: 'Vence em breve',
    description: 'Vence nos próximos 3 dias',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    icon: 'AlertTriangle',
  },
  paid: {
    label: 'Paga',
    description: 'Fatura quitada',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    icon: 'CheckCircle',
  },
  overdue: {
    label: 'Vencida',
    description: 'Pagamento em atraso',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    icon: 'XCircle',
  },
  partial: {
    label: 'Parcial',
    description: 'Pagamento parcial realizado',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    icon: 'MinusCircle',
  },
};

// Aliases para compatibilidade
export const INVOICE_STATUS_LABELS = {
  open: INVOICE_STATUS_CONFIG.open.label,
  closed: INVOICE_STATUS_CONFIG.closed.label,
  due_soon: INVOICE_STATUS_CONFIG.due_soon.label,
  paid: INVOICE_STATUS_CONFIG.paid.label,
  overdue: INVOICE_STATUS_CONFIG.overdue.label,
  partial: INVOICE_STATUS_CONFIG.partial.label,
};

export const INVOICE_STATUS_COLORS = {
  open: INVOICE_STATUS_CONFIG.open.color,
  closed: INVOICE_STATUS_CONFIG.closed.color,
  due_soon: INVOICE_STATUS_CONFIG.due_soon.color,
  paid: INVOICE_STATUS_CONFIG.paid.color,
  overdue: INVOICE_STATUS_CONFIG.overdue.color,
  partial: INVOICE_STATUS_CONFIG.partial.color,
};

// Tipos de pagamento
export const PAYMENT_TYPE_LABELS = {
  full: 'Pagamento Total',
  minimum: 'Pagamento Mínimo',
  partial: 'Pagamento Parcial',
  other: 'Outro',
};

// Cores padrão para cartões (cobrindo todos os bancos)
export const DEFAULT_CARD_COLORS = [
  '#8A05BE', // Roxo (Nubank)
  '#FF6100', // Laranja (Itaú)
  '#EC0000', // Vermelho (Santander/Bradesco)
  '#005CA9', // Azul (Caixa)
  '#FFEF00', // Amarelo (Banco do Brasil)
  '#21C25E', // Verde (PicPay)
  '#FF7A00', // Laranja escuro (Inter)
  '#00B1EA', // Azul claro (Mercado Pago)
  '#1A1A1A', // Preto (C6)
  '#001E62', // Azul escuro (BTG)
  '#FFD100', // Amarelo ouro (XP)
  '#6B7280', // Cinza (Outro)
];
