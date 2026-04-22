/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CreateGoalDialog } from './CreateGoalDialog';
import { EditGoalDialog } from './EditGoalDialog';
import { AddValueDialog } from './AddValueDialog';

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => undefined,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({ name: 'field', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() }),
    handleSubmit: () => (event?: React.FormEvent) => event?.preventDefault?.(),
    formState: { errors: {}, isSubmitting: false },
    setValue: vi.fn(),
    watch: (field?: string) => {
      if (field === 'type') return 'savings';
      if (field === 'amount') return 0;
      if (field === 'period_type') return 'monthly';
      return undefined;
    },
    reset: vi.fn(),
  }),
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div>calendar-mounted</div>,
}));

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioGroupItem: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} type="radio" {...props} />),
}));

vi.mock('@/hooks/useGoals', () => ({
  useGoals: () => ({
    createSavingsGoal: vi.fn(),
    createSpendingGoal: vi.fn(),
    updateGoal: vi.fn(),
    addToSavingsGoal: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'cat-1', name: 'Alimentação', type: 'expense', color: '#22c55e', icon: 'Utensils' },
    ],
  }),
}));

vi.mock('./GoalProgress', () => ({
  GoalProgress: () => <div>goal-progress-mounted</div>,
}));

describe('Goals dialogs premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the create goal dialog with premium shell styling', () => {
    render(<CreateGoalDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText('Nova Meta Financeira')).not.toBeNull();
    expect(screen.getByTestId('rd-root')).not.toBeNull();
  });

  it('renders the edit goal dialog with premium shell styling', () => {
    render(
      <EditGoalDialog
        open
        onOpenChange={vi.fn()}
        goal={{
          id: 'goal-1',
          goal_type: 'savings',
          name: 'Viagem Europa',
          target_amount: 10000,
          deadline: '2026-12-31',
        } as any}
      />,
    );

    expect(screen.getByText('Editar Meta')).not.toBeNull();
    expect(screen.getByTestId('rd-root')).not.toBeNull();
  });

  it('renders the add value dialog with premium progress panels', () => {
    render(
      <AddValueDialog
        open
        onOpenChange={vi.fn()}
        goal={{
          id: 'goal-1',
          name: 'Viagem Europa',
          current_amount: 500,
          target_amount: 1000,
          percentage: 50,
        } as any}
      />,
    );

    expect(screen.getByText(/Adicionar Valor/i)).not.toBeNull();
    expect(screen.getByText('goal-progress-mounted')).not.toBeNull();
    expect(screen.getByTestId('rd-root')).not.toBeNull();
  });
});
