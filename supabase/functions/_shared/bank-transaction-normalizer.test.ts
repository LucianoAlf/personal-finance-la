import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { normalizeCsvTransaction, normalizePluggyTransaction } from './bank-transaction-normalizer.ts';

Deno.test('normalizePluggyTransaction separates external and internal account identity', () => {
  const normalized = normalizePluggyTransaction({
    sourceItemId: 'item-itau',
    accountId: 'pluggy-account-1',
    transaction: {
      id: 'tx-1',
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
    },
    internalAccountId: 'account-internal-itau',
  });

  assertEquals(normalized.external_account_id, 'pluggy-account-1');
  assertEquals(normalized.internal_account_id, 'account-internal-itau');
});

Deno.test('normalizeCsvTransaction maps columns and signed amount', () => {
  const n = normalizeCsvTransaction({
    user_id: 'user-1',
    account_name: 'Conta corrente',
    row: {
      Data: '2026-04-10',
      Valor: '-150,50',
      Memo: 'PADARIA',
    },
    columnMap: { date: 'Data', amount: 'Valor', description: 'Memo' },
  });

  assertEquals(n.date, '2026-04-10');
  assertEquals(n.amount, -150.5);
  assertEquals(n.description, 'PADARIA');
  assertEquals(n.source, 'csv_upload');
});
