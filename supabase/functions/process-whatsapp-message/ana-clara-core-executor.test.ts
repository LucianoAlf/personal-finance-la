import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  detectDirectAccountsDiagnosticPrompt,
  isExplicitAccountsHealthCheckRequest,
  shouldUseUnifiedExpenseQuery,
} from './ana-clara-core-executor.ts';

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

Deno.test('isExplicitAccountsHealthCheckRequest recognizes the supported contas health-check phrases', () => {
  assertEquals(isExplicitAccountsHealthCheckRequest('analisa minhas contas'), true);
  assertEquals(isExplicitAccountsHealthCheckRequest('tem algo errado nas contas?'), true);
  assertEquals(isExplicitAccountsHealthCheckRequest('faz um checkup'), true);
  assertEquals(isExplicitAccountsHealthCheckRequest('quais contas vencem hoje?'), false);
});

Deno.test('detectDirectAccountsDiagnosticPrompt recognizes follow-up diagnostic prompts without colliding with normal finance intents', () => {
  assertEquals(detectDirectAccountsDiagnosticPrompt('o que tem de errado nessas contas?'), true);
  assertEquals(detectDirectAccountsDiagnosticPrompt('qual parece ser o problema?'), true);
  assertEquals(detectDirectAccountsDiagnosticPrompt('me explica isso'), true);
  assertEquals(detectDirectAccountsDiagnosticPrompt('quero pagar a luz'), false);
});
