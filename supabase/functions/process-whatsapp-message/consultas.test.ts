import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { extrairPeriodoDoTexto } from './consultas.ts';

Deno.test('extrairPeriodoDoTexto parses written month counts', () => {
  assertEquals(
    extrairPeriodoDoTexto('quanto paguei nos últimos três meses de iFood?'),
    { tipo: 'ultimos_meses', quantidade: 3 },
  );
});

Deno.test('extrairPeriodoDoTexto recognizes week that passed phrasing', () => {
  assertEquals(
    extrairPeriodoDoTexto('quanto gastei nessa semana que passou?'),
    { tipo: 'semana_passada' },
  );
});

Deno.test('extrairPeriodoDoTexto recognizes tomorrow queries', () => {
  assertEquals(
    extrairPeriodoDoTexto('quais contas de amanhã?'),
    { tipo: 'amanha' },
  );
});

Deno.test('extrairPeriodoDoTexto recognizes next month phrasing', () => {
  assertEquals(
    extrairPeriodoDoTexto('quais contas no mês que vem?'),
    { tipo: 'proximo_mes' },
  );
});
