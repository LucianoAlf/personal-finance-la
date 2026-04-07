import { describe, expect, it } from 'vitest';

import {
  buildInvestmentTransactionDate,
  getTransactionCalendarKey,
} from '@/utils/investments/transaction-date';

describe('investment transaction dates', () => {
  it('stores date-only inputs at noon UTC to avoid off-by-one rendering', () => {
    const result = buildInvestmentTransactionDate('2026-04-06');

    expect(result.toISOString()).toBe('2026-04-06T12:00:00.000Z');
  });

  it('builds a stable calendar key from stored transaction dates', () => {
    expect(getTransactionCalendarKey('2026-04-06T12:00:00.000Z')).toBe('2026-04-06');
  });
});
