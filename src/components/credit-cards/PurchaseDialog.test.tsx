/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PurchaseDialog } from './PurchaseDialog';

const {
  createPurchaseMock,
  toastMock,
  fetchCardsMock,
  fetchCardsSummaryMock,
  fetchInvoicesMock,
  replaceCanonicalTagAssignmentsMock,
} = vi.hoisted(() => ({
  createPurchaseMock: vi.fn(),
  toastMock: vi.fn(),
  fetchCardsMock: vi.fn(),
  fetchCardsSummaryMock: vi.fn(),
  fetchInvoicesMock: vi.fn(),
  replaceCanonicalTagAssignmentsMock: vi.fn(),
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="responsive-dialog-mock">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><button type="button" onClick={onClose}>Fechar</button><span>{title}</span></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./PurchaseForm', () => ({
  PurchaseForm: (props: {
    onSubmit: (data: any, selectedTags: string[]) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          props.onSubmit(
            {
              credit_card_id: 'card-1',
              description: 'Mercado',
              amount: 120,
              purchase_date: '2026-04-07',
              category_id: 'cat-1',
              installments: 1,
            },
            ['tag-1'],
          )
        }
      >
        Submit purchase
      </button>
      <button type="button" onClick={props.onCancel}>
        Cancel purchase
      </button>
    </div>
  ),
}));

vi.mock('@/hooks/useCreditCardTransactions', () => ({
  useCreditCardTransactions: () => ({
    createPurchase: createPurchaseMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    fetchCards: fetchCardsMock,
    fetchCardsSummary: fetchCardsSummaryMock,
  }),
}));

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: () => ({
    fetchInvoices: fetchInvoicesMock,
  }),
}));

vi.mock('@/utils/tags/tag-assignment', () => ({
  replaceCanonicalTagAssignments: replaceCanonicalTagAssignmentsMock,
}));

describe('PurchaseDialog', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    createPurchaseMock.mockReset();
    toastMock.mockReset();
    fetchCardsMock.mockReset();
    fetchCardsSummaryMock.mockReset();
    fetchInvoicesMock.mockReset();
    replaceCanonicalTagAssignmentsMock.mockReset();
  });

  it('renders a readable portuguese title without mojibake', () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} cardId="card-1" />);

    expect(screen.getByText('Nova Compra no Cartão')).not.toBeNull();
  });

  it('keeps the dialog open and reuses created transaction ids when tag persistence fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    createPurchaseMock.mockResolvedValue({
      success: true,
      invoiceId: 'inv-1',
      transactionIds: ['tx-1'],
    });
    replaceCanonicalTagAssignmentsMock
      .mockRejectedValueOnce(new Error('tag insert failed'))
      .mockResolvedValueOnce(undefined);

    render(
      <PurchaseDialog open={true} onOpenChange={onOpenChange} onSuccess={onSuccess} cardId="card-1" />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit purchase' }));

    expect(createPurchaseMock).toHaveBeenCalledTimes(1);
    expect(replaceCanonicalTagAssignmentsMock).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(fetchCardsMock).not.toHaveBeenCalled();
    expect(fetchCardsSummaryMock).not.toHaveBeenCalled();
    expect(fetchInvoicesMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Submit purchase' }));

    expect(createPurchaseMock).toHaveBeenCalledTimes(1);
    expect(replaceCanonicalTagAssignmentsMock).toHaveBeenCalledTimes(2);
    expect(replaceCanonicalTagAssignmentsMock).toHaveBeenLastCalledWith(
      expect.anything(),
      {
        entityType: 'credit_card_transaction',
        entityId: 'tx-1',
        tagIds: ['tag-1'],
      },
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledWith({
      success: true,
      invoiceId: 'inv-1',
      transactionIds: ['tx-1'],
    });
    expect(fetchCardsMock).toHaveBeenCalledTimes(1);
    expect(fetchCardsSummaryMock).toHaveBeenCalledTimes(1);
    expect(fetchInvoicesMock).toHaveBeenCalledTimes(1);
  });
});
