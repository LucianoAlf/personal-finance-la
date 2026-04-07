interface InvestmentPricingLike {
  quantity: number;
  purchase_price: number;
  current_price: number | null;
  current_value: number | null;
  total_invested: number | null;
}

interface LiveQuoteLike {
  price: number;
}

export function resolveInvestmentDisplayPrice(
  investment: InvestmentPricingLike,
  liveQuote?: LiveQuoteLike | null,
): number {
  if (liveQuote?.price && liveQuote.price > 0) {
    return liveQuote.price;
  }

  if (investment.current_price && investment.current_price > 0) {
    return investment.current_price;
  }

  if (investment.current_value && investment.quantity > 0) {
    return investment.current_value / investment.quantity;
  }

  return investment.purchase_price || 0;
}

export function resolveInvestmentDisplayValue(
  investment: InvestmentPricingLike,
  liveQuote?: LiveQuoteLike | null,
): number {
  if (liveQuote?.price && liveQuote.price > 0) {
    return liveQuote.price * investment.quantity;
  }

  if (investment.current_value && investment.current_value > 0) {
    return investment.current_value;
  }

  return resolveInvestmentDisplayPrice(investment, liveQuote) * investment.quantity;
}

export function resolveInvestmentTotalInvested(investment: InvestmentPricingLike): number {
  if (investment.total_invested && investment.total_invested > 0) {
    return investment.total_invested;
  }

  return investment.quantity * investment.purchase_price;
}
