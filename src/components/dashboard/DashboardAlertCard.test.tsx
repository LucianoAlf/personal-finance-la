/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DashboardAlertCard } from './DashboardAlertCard';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderCard(props: React.ComponentProps<typeof DashboardAlertCard>) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DashboardAlertCard {...props} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardAlertCard', () => {
  afterEach(() => cleanup());

  it('renders when overdueCount > 0', () => {
    renderCard({ overdueCount: 2, overdueAmount: 1750, topItems: [{ name: 'Aluguel', dueLabel: 'hoje' }] });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/2 contas vencidas/i)).toBeTruthy();
  });

  it('renders nothing when overdueCount is 0', () => {
    const { container } = renderCard({ overdueCount: 0, overdueAmount: 0, topItems: [] });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('uses singular "conta vencida" when count is 1', () => {
    renderCard({ overdueCount: 1, overdueAmount: 100, topItems: [] });
    expect(screen.getByText(/1 conta vencida(?!s)/i)).toBeTruthy();
  });

  it('renders an amount string formatted with R$', () => {
    renderCard({ overdueCount: 1, overdueAmount: 150.5, topItems: [] });
    expect(screen.getByText(/R\$\s?150,50/)).toBeTruthy();
  });

  it('shows up to 2 top item previews', () => {
    renderCard({
      overdueCount: 3,
      overdueAmount: 500,
      topItems: [
        { name: 'Aluguel', dueLabel: 'hoje' },
        { name: 'Luz', dueLabel: 'ontem' },
        { name: 'Gás', dueLabel: 'há 3 dias' },
      ],
    });
    expect(screen.getByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Luz')).toBeTruthy();
    expect(screen.queryByText('Gás')).toBeNull();
  });

  it('CTA navigates to /contas-pagar', () => {
    renderCard({ overdueCount: 1, overdueAmount: 100, topItems: [] });
    fireEvent.click(screen.getByRole('link', { name: /ver contas a pagar/i }));
    expect(screen.getByTestId('location').textContent).toBe('/contas-pagar');
  });

  it('is hidden on desktop (lg:hidden class)', () => {
    renderCard({ overdueCount: 1, overdueAmount: 100, topItems: [] });
    expect(screen.getByRole('alert').className).toContain('lg:hidden');
  });
});
