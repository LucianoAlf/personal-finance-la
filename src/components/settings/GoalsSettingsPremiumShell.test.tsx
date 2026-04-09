/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FinancialSettingsCard } from './financial/FinancialSettingsCard';
import { FinancialCyclesManager } from './cycles/FinancialCyclesManager';

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value }: { value?: number[] }) => <div data-testid="mock-slider">{value?.[0] ?? 0}</div>,
}));

vi.mock('@/hooks/useCyclesManager', () => ({
  useCyclesManager: () => ({
    cyclesWithStats: [],
    activeCycles: [],
    nextCycle: null,
    loading: false,
    createCycle: vi.fn(),
    updateCycle: vi.fn(),
    deleteCycle: vi.fn(),
    toggleActive: vi.fn(),
    duplicateCycle: vi.fn(),
  }),
}));

vi.mock('./cycles/CycleDialog', () => ({
  CycleDialog: () => <div>cycle-dialog-mounted</div>,
}));

describe('Goals settings premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the financial settings card with premium surface styling', () => {
    render(
      <FinancialSettingsCard
        savingsGoal={20}
        closingDay={1}
        budgetAllocation={{ essentials: 50, investments: 20, leisure: 20, others: 10 }}
        budgetAlertThreshold={80}
        onSavingsGoalChange={vi.fn()}
        onClosingDayChange={vi.fn()}
        onBudgetAllocationChange={vi.fn()}
        onBudgetAlertThresholdChange={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const shell = screen.getByTestId('goals-settings-financial-shell');

    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('rounded-[28px]');
    expect(screen.getByText('Configurações Financeiras')).not.toBeNull();
  });

  it('renders the financial cycles manager with a premium shell and empty state', () => {
    render(<FinancialCyclesManager />);

    const shell = screen.getByTestId('goals-settings-cycles-shell');

    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('border-border/70');
    expect(screen.getByText('Nenhum ciclo criado')).not.toBeNull();
  });
});
