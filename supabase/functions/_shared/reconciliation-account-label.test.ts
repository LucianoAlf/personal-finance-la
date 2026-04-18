import { assertEquals, assert } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { looksLikeDesignCodename, resolveAccountLabel } from './reconciliation-account-label.ts';

Deno.test('detects Pluggy design codenames that leaked into production', () => {
  assert(looksLikeDesignCodename('ultraviolet-black'));
  assert(looksLikeDesignCodename('nu-ultra-black'));
  assert(looksLikeDesignCodename('mastercard-gold'));
  assertEquals(looksLikeDesignCodename('Conta Corrente'), false);
  assertEquals(looksLikeDesignCodename('Nubank'), false);
});

Deno.test('rejects design codenames instead of surfacing them as account labels', () => {
  const label = resolveAccountLabel({
    institutionName: 'Nubank',
    accountName: 'ultraviolet-black',
    type: 'CREDIT',
    subtype: 'CREDIT_CARD',
    number: '**** 1234',
  });

  assert(!label.toLowerCase().includes('ultraviolet-black'), `design codename should not leak: ${label}`);
  assert(label.includes('Nubank'), 'institution should drive the label');
  assert(label.includes('cartao'), 'type/subtype should resolve to cartao');
  assert(label.includes('1234'), 'final 4 digits should be surfaced');
});

Deno.test('falls back to institution + surface when Pluggy returns no usable name', () => {
  const label = resolveAccountLabel({
    institutionName: 'Mercado Pago',
    accountName: null,
    type: 'BANK',
    subtype: 'CHECKING_ACCOUNT',
    number: '0022',
  });

  assertEquals(label, 'Mercado Pago \u2022 conta corrente \u2022 final 0022');
});

Deno.test('uses marketing name when it is a real, human-friendly string', () => {
  const label = resolveAccountLabel({
    institutionName: 'Itau',
    accountName: 'Conta Itau',
    marketingName: 'Itau Uniclass',
    type: 'BANK',
    subtype: 'CHECKING_ACCOUNT',
    number: '12345',
  });

  assert(label.includes('Itau Uniclass'));
  assert(label.includes('final 2345'));
});

Deno.test('never returns an empty string so ingestion can persist NOT NULL account_name', () => {
  const label = resolveAccountLabel({});
  assertEquals(label, 'Conta sem identificacao');
});

Deno.test('keeps output ASCII-safe to match the rest of the reconciliation UI copy', () => {
  const label = resolveAccountLabel({
    institutionName: 'Nubank',
    accountName: 'Conta Corrente',
    type: 'BANK',
    subtype: 'CHECKING_ACCOUNT',
  });

  // No accented characters should be introduced by the resolver itself.
  assertEquals(/[\u00C0-\u017F]/.test(label), false);
});
