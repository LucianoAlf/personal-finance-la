import { describe, expect, it } from 'vitest';

import {
  inferCanonicalCategoryNameFromTransactionText,
  inferCategoryNameForPayableBillDescription,
  mapLabelHintToCanonicalCategoryName,
  normalizeUserText,
} from '../../../supabase/functions/_shared/canonical-categorization.ts';

describe('canonical backend categorization (pure helpers)', () => {
  it('normalizes user text (case, accents, whitespace)', () => {
    expect(normalizeUserText('  Água  e  Luz  ')).toBe('agua e luz');
  });

  it('maps LLM slugs and Open Finance labels to Portuguese names', () => {
    expect(mapLabelHintToCanonicalCategoryName('food', 'expense')).toBe('Alimentação');
    expect(mapLabelHintToCanonicalCategoryName('salary', 'income')).toBe('Salário');
    expect(mapLabelHintToCanonicalCategoryName('gas_station', 'expense')).toBe('Transporte');
  });

  it('infers expense categories from phrases (plan harness cases)', () => {
    expect(inferCanonicalCategoryNameFromTransactionText(['mercado 120'], 120)).toBe('Alimentação');
    expect(mapLabelHintToCanonicalCategoryName('salary', 'income')).toBe('Salário');
    expect(inferCanonicalCategoryNameFromTransactionText(['tv 2000 em 10x no Nubank'], 2000)).toBe(
      'Eletrodomésticos',
    );
  });

  it('infers payable bill categories from description regexes', () => {
    expect(inferCategoryNameForPayableBillDescription('Netflix 55 dia 17')).toBe('Assinaturas');
    expect(inferCategoryNameForPayableBillDescription('luz 150')).toBe('Contas de Consumo');
    expect(inferCategoryNameForPayableBillDescription('xyz misc')).toBe('Outros');
  });

  it('keeps shopping labels equivalent across LLM and Open Finance', () => {
    expect(mapLabelHintToCanonicalCategoryName('shopping', 'expense')).toBe('Compras');
  });

  it('keeps bills and utilities labels equivalent across sources', () => {
    expect(mapLabelHintToCanonicalCategoryName('bills', 'expense')).toBe('Contas de Consumo');
    expect(mapLabelHintToCanonicalCategoryName('utilities', 'expense')).toBe('Contas de Consumo');
    expect(mapLabelHintToCanonicalCategoryName('water', 'expense')).toBe('Contas de Consumo');
  });

  it('keeps water semantics aligned across text and payable bill paths', () => {
    expect(inferCanonicalCategoryNameFromTransactionText(['agua 85'], 85)).toBe('Contas de Consumo');
    expect(inferCategoryNameForPayableBillDescription('água 85 dia 10')).toBe('Contas de Consumo');
  });

  it('preserves intentional bottled water special case for small expenses', () => {
    expect(inferCanonicalCategoryNameFromTransactionText(['agua 6'], 6)).toBe('Alimentação');
  });
});
