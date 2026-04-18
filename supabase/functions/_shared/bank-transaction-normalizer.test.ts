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

Deno.test('normalizePluggyTransaction swaps design codenames for institution-based labels', () => {
  const normalized = normalizePluggyTransaction({
    sourceItemId: 'item-nu',
    accountId: 'pluggy-account-2',
    accountName: 'ultraviolet-black',
    institutionName: 'Nubank',
    accountType: 'CREDIT',
    accountSubtype: 'CREDIT_CARD',
    accountNumber: '****1234',
    transaction: {
      id: 'tx-2',
      amount: -120,
      date: '2026-04-11',
      description: 'PIX TO JOHN',
    },
    internalAccountId: null,
  });

  if (normalized.account_name.toLowerCase().includes('ultraviolet-black')) {
    throw new Error(`raw pluggy design codename leaked into account_name: ${normalized.account_name}`);
  }
  assertEquals(normalized.account_name.includes('Nubank'), true);
  assertEquals(normalized.account_name.includes('1234'), true);
});

Deno.test('normalizePluggyTransaction marks pre-window rows as out_of_scope', () => {
  const normalized = normalizePluggyTransaction({
    sourceItemId: 'item-nu',
    accountId: 'pluggy-account-3',
    institutionName: 'Nubank',
    transaction: {
      id: 'tx-3',
      amount: -50,
      date: '2025-12-02',
      description: 'ASSINATURA',
    },
    internalAccountId: null,
    windowStart: '2026-04-01',
  });

  assertEquals(normalized.out_of_scope, true);
});

Deno.test('normalizePluggyTransaction keeps in-window rows in scope', () => {
  const normalized = normalizePluggyTransaction({
    sourceItemId: 'item-nu',
    accountId: 'pluggy-account-4',
    institutionName: 'Nubank',
    transaction: {
      id: 'tx-4',
      amount: -50,
      date: '2026-04-15',
      description: 'ASSINATURA',
    },
    internalAccountId: null,
    windowStart: '2026-04-01',
  });

  assertEquals(normalized.out_of_scope, false);
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
