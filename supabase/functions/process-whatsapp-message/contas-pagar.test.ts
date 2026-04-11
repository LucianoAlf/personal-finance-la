import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { resolveContasDoMesReference, resolveContasVencendoWindow } from './contas-pagar.ts';

Deno.test('resolveContasVencendoWindow uses today window when command asks for hoje', () => {
  assertEquals(
    resolveContasVencendoWindow({ comando_original: 'tem conta pra pagar hoje?' }),
    { startOffsetDays: 0, endOffsetDays: 0, label: 'hoje' },
  );
});

Deno.test('resolveContasVencendoWindow uses tomorrow window when command asks for amanha', () => {
  assertEquals(
    resolveContasVencendoWindow({ comando_original: 'o que vence amanhã?' }),
    { startOffsetDays: 1, endOffsetDays: 1, label: 'amanha' },
  );
});

Deno.test('resolveContasVencendoWindow keeps default 7-day range when no specific day is requested', () => {
  assertEquals(
    resolveContasVencendoWindow({ comando_original: 'tem conta pra pagar essa semana?' }),
    { startOffsetDays: 0, endOffsetDays: 7, label: 'proximos_dias' },
  );
});

Deno.test('resolveContasVencendoWindow supports written upcoming day ranges', () => {
  assertEquals(
    resolveContasVencendoWindow({ comando_original: 'quais as contas dos próximos quatro dias?' }),
    { startOffsetDays: 0, endOffsetDays: 4, label: 'proximos_dias' },
  );
});

Deno.test('resolveContasDoMesReference moves month queries to next month when requested', () => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  assertEquals(
    resolveContasDoMesReference({ comando_original: 'quais as contas no mês que vem?' }),
    { mes: nextMonth.getMonth(), ano: nextMonth.getFullYear() },
  );
});
