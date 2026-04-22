/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { InvestmentGoalDialog } from './InvestmentGoalDialog';
import { ContributionDialog } from './ContributionDialog';
import { CycleDialog } from '@/components/settings/cycles/CycleDialog';

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => undefined,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({ name: 'field', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() }),
    handleSubmit: (_onValid?: (data: any) => void, _onInvalid?: (errors: any) => void) => (event?: React.FormEvent) =>
      event?.preventDefault?.(),
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    watch: (field?: string) => {
      if (field === 'category') return 'general';
      if (field === 'target_amount') return 10000;
      if (field === 'current_amount') return 0;
      if (field === 'monthly_contribution') return 500;
      if (field === 'expected_return_rate') return 8;
      if (field === 'start_date') return '2026-04-09';
      if (field === 'target_date') return '2030-04-09';
      if (field === 'linked_investments') return [];
      if (field === 'auto_invest') return false;
      if (field === 'notify_contribution') return false;
      if (field === 'type') return 'salary';
      if (field === 'icon') return 'Salário';
      if (field === 'color') return '#3b82f6';
      if (field === 'notify_start') return false;
      if (field === 'active') return true;
      if (field === 'priority') return 'medium';
      return undefined;
    },
    reset: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => <textarea ref={ref} {...props} />),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: () => <button type="button">switch</button>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <button type="button">checkbox</button>,
}));

vi.mock('@/components/ui/date-picker-input', () => ({
  DatePickerInput: () => <div>date-picker-input-mounted</div>,
}));

vi.mock('@/components/investments/InvestmentPlanningCalculator', () => ({
  InvestmentPlanningCalculator: () => <div>investment-planner-mounted</div>,
}));

vi.mock('@/hooks/useInvestmentsQuery', () => ({
  useInvestmentsQuery: () => ({
    investments: [],
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

describe('Investment and cycle dialogs premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the investment goal dialog with premium shell and tokenized tabs', () => {
    render(<InvestmentGoalDialog open onOpenChange={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    expect(screen.getByText(/Nova Meta de Investimento/i)).not.toBeNull();
    expect(screen.getByTestId('rd-root')).not.toBeNull();

    const tabsList = screen.getByTestId('tabs-list');
    expect(tabsList.className).toContain('bg-surface-elevated');
  });

  it('renders the contribution dialog with premium shell and preview panel', () => {
    render(
      <ContributionDialog
        open
        onOpenChange={vi.fn()}
        goal={{
          id: 'goal-1',
          name: 'Aposentadoria',
          current_amount: 10000,
          target_amount: 50000,
        } as any}
        onSave={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.getAllByText('Registrar Aporte').length).toBeGreaterThan(0);
    expect(screen.getByTestId('rd-root')).not.toBeNull();
  });

  it('renders the cycle dialog with premium shell and tokenized tabs', () => {
    render(<CycleDialog open onOpenChange={vi.fn()} onSave={vi.fn().mockResolvedValue(true)} />);

    expect(screen.getByText('Informações Básicas')).not.toBeNull();
    const content = screen.getByTestId('dialog-content');
    expect(content.className).toContain('bg-card/95');
    expect(content.className).toContain('border-border/70');

    const tabsList = screen.getByTestId('tabs-list');
    expect(tabsList.className).toContain('bg-surface-elevated');
  });
});
