import { describe, expect, it } from 'vitest';

import { prepareCsvImport, preparePasteImport } from './reconciliation-import';

describe('reconciliation import format mapping', () => {
  it('parses a Nubank-style csv with english headers', () => {
    const prepared = prepareCsvImport(
      'nubank.csv',
      ['date,title,amount', '2026-04-14,Supermercado,-152.37'].join('\n'),
    );

    expect(prepared.request).toBeTruthy();
    expect(prepared.request?.source).toBe('csv_upload');
    expect(prepared.preview.itemCount).toBe(1);
    expect(prepared.request?.rows[0]).toMatchObject({
      account_name: 'nubank',
      amount: -152.37,
      date: '2026-04-14',
      description: 'Supermercado',
    });
  });

  it('parses an Itau-style pasted statement with lancamento and valor rs headers', () => {
    const prepared = preparePasteImport(
      ['Data\tLançamento\tValor (R$)', '15/04/2026\tPIX RECEBIDO CLIENTE\t1.234,56'].join('\n'),
    );

    expect(prepared.request).toBeTruthy();
    expect(prepared.request?.source).toBe('manual_paste');
    expect(prepared.preview.itemCount).toBe(1);
    expect(prepared.request?.rows[0]).toMatchObject({
      amount: 1234.56,
      date: '2026-04-15',
      description: 'PIX RECEBIDO CLIENTE',
    });
  });
});
