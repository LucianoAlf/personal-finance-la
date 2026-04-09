/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { InvestmentDialog } from '../InvestmentDialog';
import { TransactionDialog } from '../TransactionDialog';
import { AlertDialog } from '../AlertDialog';
import { InvestmentReportDialog } from '../InvestmentReportDialog';

let mockFormValues: Record<string, any> = {};

const setMockFormValues = (values: Record<string, any>) => {
  mockFormValues = values;
};

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => undefined,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit:
      (onValid?: (data: any) => void) =>
      (event?: React.FormEvent) => {
        event?.preventDefault?.();
        if (onValid) onValid(mockFormValues);
      },
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    getValues: (field?: string) => (field ? mockFormValues[field] : undefined),
    watch: (field?: string) => (field ? mockFormValues[field] : undefined),
    reset: vi.fn(),
  }),
  Controller: ({ render }: { render: (props: any) => React.ReactNode }) =>
    render({
      field: {
        name: 'field',
        value: '',
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      },
    }),
}));

vi.mock('@/hooks/useInvestments', () => ({
  useInvestments: () => ({
    investments: [
      {
        id: 'inv-1',
        name: 'Petrobras PN',
        ticker: 'PETR4',
        current_price: 30,
        current_value: 3000,
        quantity: 100,
        purchase_price: 20,
      },
    ],
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  FormField: ({ name, render }: { name: string; render: (props: any) => React.ReactNode }) =>
    render({
      field: {
        name,
        value: mockFormValues[name] ?? '',
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      },
    }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    (props, ref) => <textarea ref={ref} {...props} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: () => <span>value</span>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button type="button" className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <div className={className} />,
}));

vi.mock('@/components/ui/date-picker-input', () => ({
  DatePickerInput: () => <div>date-picker</div>,
}));

vi.mock('@/utils/investments/contracts', () => ({
  normalizeInvestmentCategory: (category: string) => category,
}));

vi.mock('@/utils/investments/transaction-date', () => ({
  buildInvestmentTransactionDate: (date: string) => date,
}));

vi.mock('@/utils/investments/pricing', () => ({
  resolveInvestmentDisplayPrice: (investment: { current_price?: number; purchase_price?: number }) =>
    investment.current_price ?? investment.purchase_price ?? 0,
}));

vi.mock('@/utils/investmentReports', () => ({
  generateInvestmentReport: (_investments: any[], _transactions: any[], period: string, year: number, month: number) => ({
    period: {
      label: `${period}-${year}-${month}`,
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    },
    summary: {
      totalInvested: 1000,
      currentValue: 1200,
      totalReturn: 200,
      returnPercentage: 20,
    },
    performance: {
      bestPerformer: { name: 'PETR4', return: 12.34 },
      worstPerformer: { name: 'VALE3', return: -4.56 },
      avgReturn: 3.21,
    },
    dividends: {
      totalReceived: 55,
      count: 2,
      yieldOnCost: 1.23,
    },
    transactions: {
      buys: [{ id: '1' }],
      sells: [{ id: '2' }],
      dividends: [{ id: '3' }],
    },
  }),
}));

vi.mock('@/utils/pdfExport', () => ({
  exportReportToPDF: vi.fn(),
}));

describe('Investment dialogs premium shell', () => {
  beforeEach(() => {
    setMockFormValues({});
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the investment dialog premium and readable', () => {
    setMockFormValues({
      type: 'stock',
      quantity: 2,
      purchase_price: 10,
    });

    render(<InvestmentDialog open onOpenChange={vi.fn()} onSave={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Novo Investimento')).not.toBeNull();
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('rounded-[1.7rem]');
    expect(content.className).toContain('bg-card/95');
    expect(screen.getByTestId('tabs-list').className).toContain('bg-surface-elevated');
  });

  it('keeps the transaction dialog premium and localized', () => {
    setMockFormValues({
      investment_id: 'inv-1',
      transaction_type: 'buy',
      quantity: 2,
      price: 10,
      fees: 1,
      tax: 2,
      total_value: 0,
      transaction_date: '2026-04-09',
      notes: '',
    });

    render(<TransactionDialog open onOpenChange={vi.fn()} onSave={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Nova Transação')).not.toBeNull();
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('rounded-[1.7rem]');
    expect(screen.getByText('Registrar Transação')).not.toBeNull();
  });

  it('keeps the alert dialog premium and localized', () => {
    setMockFormValues({
      ticker: 'PETR4',
      alert_type: 'price_above',
      target_value: 25,
      investment_id: 'inv-1',
    });

    render(<AlertDialog open onOpenChange={vi.fn()} onSave={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Criar Alerta de Preço')).not.toBeNull();
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('rounded-[1.7rem]');
    expect(screen.getByText('Preço atual: R$ 30,00')).not.toBeNull();
  });

  it('keeps the report dialog premium and polished', () => {
    render(
      <InvestmentReportDialog investments={[]} transactions={[]} onPrefetchTransactions={vi.fn()} />
    );

    expect(screen.getByText('Relatório')).not.toBeNull();
    expect(screen.getByText('Relatório de Investimentos')).not.toBeNull();
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('rounded-[1.7rem]');
    expect(screen.getByText('Exportar PDF')).not.toBeNull();
  });
});
