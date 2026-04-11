import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { shouldUseUnifiedExpenseQuery } from './ana-clara-core-executor.ts';

Deno.test('shouldUseUnifiedExpenseQuery keeps stable weekly summaries on templates', () => {
  assertEquals(
    shouldUseUnifiedExpenseQuery({
      periodType: 'semana_atual',
      hasMethod: false,
      hasCategory: false,
      hasEstablishment: false,
    }),
    false,
  );
});

Deno.test('shouldUseUnifiedExpenseQuery sends free-period questions to unified query', () => {
  assertEquals(
    shouldUseUnifiedExpenseQuery({
      periodType: 'ultimos_meses',
      hasMethod: false,
      hasCategory: false,
      hasEstablishment: false,
    }),
    true,
  );
});

Deno.test('shouldUseUnifiedExpenseQuery sends filtered analytic questions to unified query', () => {
  assertEquals(
    shouldUseUnifiedExpenseQuery({
      periodType: 'mes_atual',
      hasMethod: false,
      hasCategory: false,
      hasEstablishment: true,
    }),
    true,
  );
});
