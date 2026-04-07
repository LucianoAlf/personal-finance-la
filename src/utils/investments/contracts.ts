import { buildInvestmentTransactionDate } from '@/utils/investments/transaction-date';

export type CanonicalInvestmentCategory =
  | 'fixed_income'
  | 'stock'
  | 'reit'
  | 'fund'
  | 'crypto'
  | 'international'
  | 'pension'
  | 'other';

type LegacyInvestmentCategory =
  | 'renda_fixa'
  | 'acoes_nacionais'
  | 'fiis'
  | 'internacional'
  | 'cripto'
  | 'previdencia'
  | 'outros';

type InvestmentType = 'stock' | 'fund' | 'treasury' | 'crypto' | 'real_estate' | 'other';

interface LedgerTransaction {
  investment_id: string;
  transaction_type: 'buy' | 'sell' | 'dividend' | 'interest' | 'fee' | 'split' | 'bonus';
  quantity?: number | null;
  price?: number | null;
  total_value: number;
}

interface InitialPositionInput {
  investmentId: string;
  userId: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

const LEGACY_TO_CANONICAL: Record<LegacyInvestmentCategory, CanonicalInvestmentCategory> = {
  renda_fixa: 'fixed_income',
  acoes_nacionais: 'stock',
  fiis: 'reit',
  internacional: 'international',
  cripto: 'crypto',
  previdencia: 'pension',
  outros: 'other',
};

const TYPE_TO_CANONICAL: Record<InvestmentType, CanonicalInvestmentCategory> = {
  treasury: 'fixed_income',
  stock: 'stock',
  real_estate: 'reit',
  fund: 'fund',
  crypto: 'crypto',
  other: 'other',
};

const CANONICAL_TO_BUCKET: Record<CanonicalInvestmentCategory, string> = {
  fixed_income: 'renda_fixa',
  stock: 'acoes_nacionais',
  reit: 'fiis',
  international: 'internacional',
  crypto: 'cripto',
  pension: 'previdencia',
  fund: 'outros',
  other: 'outros',
};

export function normalizeInvestmentCategory(
  category: string | null | undefined,
  type?: string | null,
): CanonicalInvestmentCategory {
  if (category && category in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[category as LegacyInvestmentCategory];
  }

  if (category && category in CANONICAL_TO_BUCKET) {
    return category as CanonicalInvestmentCategory;
  }

  if (type && type in TYPE_TO_CANONICAL) {
    return TYPE_TO_CANONICAL[type as InvestmentType];
  }

  return 'other';
}

export function toAllocationBucket(category: CanonicalInvestmentCategory): string {
  return CANONICAL_TO_BUCKET[category] ?? 'outros';
}

export function buildInitialPositionTransaction(input: InitialPositionInput) {
  return {
    investment_id: input.investmentId,
    user_id: input.userId,
    transaction_type: 'buy' as const,
    quantity: input.quantity,
    price: input.purchasePrice,
    total_value: input.quantity * input.purchasePrice,
    fees: 0,
    tax: 0,
    transaction_date: buildInvestmentTransactionDate(input.purchaseDate),
    notes: 'Posição inicial da carteira',
  };
}

export function calculateInvestmentStateFromTransactions(transactions: LedgerTransaction[]) {
  let quantity = 0;
  let totalInvested = 0;

  transactions.forEach((transaction) => {
    const txQuantity = Number(transaction.quantity || 0);

    if (transaction.transaction_type === 'buy') {
      quantity += txQuantity;
      totalInvested += Number(transaction.total_value || txQuantity * Number(transaction.price || 0));
      return;
    }

    if (transaction.transaction_type === 'sell') {
      if (quantity <= 0 || txQuantity <= 0) {
        return;
      }

      const averageCostBeforeSell = totalInvested / quantity;
      quantity -= txQuantity;
      totalInvested -= averageCostBeforeSell * txQuantity;
      if (quantity < 0) quantity = 0;
      if (totalInvested < 0) totalInvested = 0;
      return;
    }

    if (transaction.transaction_type === 'split' && txQuantity > 0) {
      quantity *= txQuantity;
      return;
    }

    if (transaction.transaction_type === 'bonus' && txQuantity > 0) {
      quantity += txQuantity;
    }
  });

  const averagePrice = quantity > 0 ? totalInvested / quantity : 0;

  return {
    quantity,
    totalInvested,
    averagePrice,
  };
}
