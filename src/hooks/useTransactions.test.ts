import { describe, expect, it } from 'vitest';

import {
  buildCreditCardTransactionTagMap,
  mapCreditCardTransactionRow,
} from '@/utils/transactions/creditCardLedgerMapping';

describe('useTransactions credit-card hydration helpers', () => {
  it('groups fetched credit-card tag rows by transaction id', () => {
    expect(
      buildCreditCardTransactionTagMap([
        {
          credit_card_transaction_id: 'cc-1',
          tag: { id: 'tag-1', name: 'Mercado', color: '#111111' },
        },
        {
          credit_card_transaction_id: 'cc-1',
          tag: { id: 'tag-2', name: 'Casa', color: '#222222' },
        },
        {
          credit_card_transaction_id: 'cc-2',
          tag: { id: 'tag-3', name: 'Viagem', color: '#333333' },
        },
      ]),
    ).toEqual({
      'cc-1': [
        { id: 'tag-1', name: 'Mercado', color: '#111111' },
        { id: 'tag-2', name: 'Casa', color: '#222222' },
      ],
      'cc-2': [{ id: 'tag-3', name: 'Viagem', color: '#333333' }],
    });
  });

  it('hydrates unified credit-card rows with their existing tags', () => {
    const mapped = mapCreditCardTransactionRow(
      {
        id: 'cc-1',
        user_id: 'user-1',
        category_id: 'cat-1',
        amount: 120,
        description: 'Supermercado',
        purchase_date: '2026-04-07',
        created_at: '2026-04-07T10:00:00.000Z',
        credit_card_id: 'card-1',
        invoice_id: 'inv-1',
        is_installment: false,
        is_parent_installment: false,
        installment_number: null,
        total_installments: null,
        installment_group_id: null,
        total_amount: 120,
        category: { id: 'cat-1', name: 'Mercado', icon: 'ShoppingBasket', color: '#ef4444' },
        credit_card: { id: 'card-1', name: 'Nubank', color: '#9333ea' },
        invoice: { reference_month: '2026-04-01' },
      },
      {
        'cc-1': [{ id: 'tag-1', name: 'Essencial', color: '#111111' }],
      },
    );

    expect(mapped.tags).toEqual([{ id: 'tag-1', name: 'Essencial', color: '#111111' }]);
    expect(mapped.account).toEqual({ id: 'card-1', name: '💳 Nubank' });
    expect(mapped.payment_method).toBe('credit');
  });
});
