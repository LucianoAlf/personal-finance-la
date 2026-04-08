import { describe, expect, it } from 'vitest';

import {
  buildLedgerTaxonomyBundle,
  buildReportAnaSectionFromTaxonomy,
  loadCanonicalTaxonomyContext,
  mapTaxonomyToWhatsAppTopCategories,
  shouldIncludeBankExpenseInTaxonomySummary,
} from '../../../supabase/functions/_shared/canonical-tag-context.ts';

describe('canonical tag / taxonomy context', () => {
  it('excludes bank rows that are credit-card purchases from expense taxonomy', () => {
    expect(
      shouldIncludeBankExpenseInTaxonomySummary({
        id: 'a',
        type: 'expense',
        amount: 100,
        transaction_date: '2026-04-01',
        category_id: 'c1',
        credit_card_id: 'card-1',
        payment_method: null,
        category: { name: 'Compras' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeBankExpenseInTaxonomySummary({
        id: 'b',
        type: 'expense',
        amount: 100,
        transaction_date: '2026-04-01',
        category_id: 'c1',
        credit_card_id: null,
        payment_method: 'credit',
        category: { name: 'Compras' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeBankExpenseInTaxonomySummary({
        id: 'c',
        type: 'expense',
        amount: 100,
        transaction_date: '2026-04-01',
        category_id: 'c1',
        credit_card_id: null,
        payment_method: 'debit',
        category: { name: 'Alimentação' },
      }),
    ).toBe(true);
  });

  it('excludes invoice payment bank rows from expense taxonomy (no double-count with card)', () => {
    expect(
      shouldIncludeBankExpenseInTaxonomySummary({
        id: 'inv',
        type: 'expense',
        amount: 500,
        transaction_date: '2026-04-10',
        category_id: 'c1',
        description: 'Pagamento de fatura',
        credit_card_id: null,
        payment_method: 'pix',
        category: { name: 'Transferências' },
      }),
    ).toBe(false);
  });

  it('aggregates bank + card expenses, tags, uncategorized and fallback signals', () => {
    const { spending, taxonomy } = buildLedgerTaxonomyBundle(
      [
        {
          id: 't1',
          type: 'expense',
          amount: 100,
          transaction_date: '2026-04-05',
          category_id: 'c-alim',
          credit_card_id: null,
          payment_method: 'pix',
          category: { name: 'Alimentação' },
          transaction_tags: [{ tag: { id: 'tag-1', name: 'mercado' } }],
        },
        {
          id: 't1b',
          type: 'expense',
          amount: 50,
          transaction_date: '2026-04-08',
          category_id: 'c-alim',
          credit_card_id: null,
          payment_method: 'pix',
          category: { name: 'Alimentação' },
          transaction_tags: [],
        },
        {
          id: 't2',
          type: 'expense',
          amount: 40,
          transaction_date: '2026-04-06',
          category_id: null,
          credit_card_id: null,
          payment_method: 'pix',
          category: null,
        },
        {
          id: 't3',
          type: 'income',
          amount: 1000,
          transaction_date: '2026-04-01',
          category_id: 'c-sal',
          category: { name: 'Salário' },
        },
      ],
      [
        {
          id: 'cc1',
          amount: 200,
          purchase_date: '2026-04-07',
          category_id: 'c-out',
          category: { name: 'Outros' },
          invoice: { reference_month: '2026-04-01' },
          credit_card_transaction_tags: [{ tag: { id: 'tag-1', name: 'mercado' } }],
        },
      ],
      '2026-04-01',
      '2026-04-30',
      { generatedAt: '2026-04-07T12:00:00.000Z' },
    );

    expect(spending).not.toBeNull();
    expect(spending!.topTags[0]?.tagName).toBe('mercado');
    expect(spending!.topTags[0]?.useCount).toBe(2);
    expect(taxonomy.totalExpenseAmount).toBe(390);
    expect(taxonomy.uncategorizedExpenseCount).toBe(1);
    expect(taxonomy.fallbackExpenseCount).toBe(1);
    expect(taxonomy.topIncomeCategories[0]?.categoryName).toBe('Salário');
    expect(taxonomy.topExpenseCategories.some((c) => c.categoryName === 'Alimentação')).toBe(true);
    expect(taxonomy.topExpenseCategories.some((c) => c.categoryName === 'Outros')).toBe(true);
    expect(
      taxonomy.topRecurringExpenseCategories.some(
        (c) => c.categoryName === 'Alimentação' && c.transactionCount >= 2,
      ),
    ).toBe(true);

    const whatsappTop = mapTaxonomyToWhatsAppTopCategories(taxonomy, 2);
    expect(whatsappTop).toHaveLength(2);
    expect(whatsappTop[0]!.percentual + whatsappTop[1]!.percentual).toBeLessThanOrEqual(100);

    const ana = buildReportAnaSectionFromTaxonomy(taxonomy);
    expect(ana).not.toBeNull();
    expect(ana!.insights.some((line) => line.includes('mercado'))).toBe(true);
    expect(ana!.insights.some((line) => line.toLowerCase().includes('sem categoria'))).toBe(true);
  });

  it('breaks fallback usage down by source when ledger rows expose source metadata', () => {
    const { taxonomy } = buildLedgerTaxonomyBundle(
      [
        {
          id: 't-whatsapp',
          type: 'expense',
          amount: 120,
          transaction_date: '2026-04-05',
          category_id: 'c-out',
          source: 'whatsapp',
          credit_card_id: null,
          payment_method: 'pix',
          category: { name: 'Outros' },
        },
        {
          id: 't-open-finance',
          type: 'expense',
          amount: 80,
          transaction_date: '2026-04-06',
          category_id: 'c-out',
          source: 'open_finance',
          credit_card_id: null,
          payment_method: 'debit',
          category: { name: 'Outros' },
        },
        {
          id: 't-manual',
          type: 'expense',
          amount: 50,
          transaction_date: '2026-04-07',
          category_id: 'c-out',
          source: 'manual',
          credit_card_id: null,
          payment_method: 'pix',
          category: { name: 'Outros' },
        },
      ],
      [],
      '2026-04-01',
      '2026-04-30',
      { generatedAt: '2026-04-07T12:00:00.000Z' },
    );

    expect(taxonomy.fallbackExpenseBySource).toEqual([
      {
        source: 'whatsapp',
        label: 'WhatsApp',
        transactionCount: 1,
        amount: 120,
        sharePercent: 48,
      },
      {
        source: 'open_finance',
        label: 'Open Finance',
        transactionCount: 1,
        amount: 80,
        sharePercent: 32,
      },
      {
        source: 'manual',
        label: 'Manual/app',
        transactionCount: 1,
        amount: 50,
        sharePercent: 20,
      },
    ]);
  });

  it('loads taxonomy context without depending on transactions.credit_card_id in Supabase selects', async () => {
    const fakeSupabase = {
      from(table: string) {
        const state: { columns?: string } = {};
        const chain = {
          select(columns: string) {
            state.columns = columns;
            return chain;
          },
          eq() {
            return chain;
          },
          gte() {
            return chain;
          },
          lte() {
            return chain;
          },
          order() {
            if (table === 'transactions') {
              if (state.columns?.includes('credit_card_id')) {
                return Promise.resolve({
                  data: null,
                  error: {
                    code: '42703',
                    message: 'column transactions.credit_card_id does not exist',
                  },
                });
              }

              return Promise.resolve({
                data: [
                  {
                    id: 'tx-1',
                    type: 'expense',
                    amount: 90,
                    transaction_date: '2026-04-10',
                    category_id: 'cat-1',
                    payment_method: 'pix',
                    category: { name: 'Mercado' },
                    transaction_tags: [],
                  },
                ],
                error: null,
              });
            }

            if (table === 'credit_card_transactions') {
              return Promise.resolve({
                data: [],
                error: null,
              });
            }

            return Promise.resolve({ data: [], error: null });
          },
        };

        return chain;
      },
    };

    const taxonomy = await loadCanonicalTaxonomyContext({
      supabase: fakeSupabase,
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      includeRecentCreations: false,
    });

    expect(taxonomy.totalExpenseAmount).toBe(90);
    expect(taxonomy.topExpenseCategories[0]?.categoryName).toBe('Mercado');
  });
});
