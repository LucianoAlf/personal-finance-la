/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AlertsCardList, type InvestmentAlertItem } from '../AlertsCardList';

function makeAlert(overrides: Partial<InvestmentAlertItem> = {}): InvestmentAlertItem {
  return {
    id: 'a1',
    ticker: 'PETR4',
    description: 'PETR4 > R$ 40',
    subtitle: 'Criado há 3 dias',
    active: true,
    ...overrides,
  };
}

describe('AlertsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no alerts', () => {
    render(
      <AlertsCardList
        alerts={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/nenhum alerta/i)).toBeTruthy();
  });

  it('renders one card per alert with description and subtitle', () => {
    render(
      <AlertsCardList
        alerts={[
          makeAlert(),
          makeAlert({ id: 'a2', ticker: 'HGLG11', description: 'HGLG11 < R$ 120', subtitle: 'Disparado ontem' }),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('PETR4 > R$ 40')).toBeTruthy();
    expect(screen.getByText('HGLG11 < R$ 120')).toBeTruthy();
    expect(screen.getByText(/criado há 3 dias/i)).toBeTruthy();
  });

  it('shows the active section header with count', () => {
    render(
      <AlertsCardList
        alerts={[makeAlert(), makeAlert({ id: 'a2' }), makeAlert({ id: 'a3', active: false })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/ativos · 2/i)).toBeTruthy();
  });

  it('fires onEdit when the Edit menu item is tapped', () => {
    const onEdit = vi.fn();
    const alert = makeAlert();
    render(
      <AlertsCardList
        alerts={[alert]}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /editar.*PETR4/i }));
    expect(onEdit).toHaveBeenCalledWith(alert);
  });

  it('fires onDelete when the Delete menu item is tapped', () => {
    const onDelete = vi.fn();
    const alert = makeAlert();
    render(
      <AlertsCardList
        alerts={[alert]}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /remover.*PETR4/i }));
    expect(onDelete).toHaveBeenCalledWith('a1');
  });
});
