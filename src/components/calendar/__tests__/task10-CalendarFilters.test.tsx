/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarFilters, type AdvancedAgendaFilters } from '../CalendarFilters';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Task 10 / CalendarFilters category toggles', () => {
  function advancedFilters(overrides: Partial<AdvancedAgendaFilters> = {}): AdvancedAgendaFilters {
    return {
      source: 'all',
      interactivity: 'all',
      actionableOnly: false,
      ...overrides,
    };
  }

  it('renders inline category chips plus the extra filters trigger', () => {
    const enabled = new Set(['personal', 'work', 'mentoring', 'financial', 'external']);
    render(
      <CalendarFilters
        enabledCategories={enabled}
        onToggleCategory={vi.fn()}
        advancedFilters={advancedFilters()}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /pessoal/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /trabalho/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /mentoria/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /financeiro/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /externo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /mais filtros/i })).toBeTruthy();
  });

  it('calls onToggleCategory when a category is toggled', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const enabled = new Set(['personal', 'work', 'mentoring', 'financial', 'external']);
    render(
      <CalendarFilters
        enabledCategories={enabled}
        onToggleCategory={onToggle}
        advancedFilters={advancedFilters()}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /pessoal/i }));
    expect(onToggle).toHaveBeenCalledWith('personal');
  });

  it('opens extra filters and lets the user choose an external-only source filter', async () => {
    const user = userEvent.setup();
    const onAdvancedFiltersChange = vi.fn();
    const enabled = new Set(['personal', 'work', 'mentoring', 'financial', 'external']);

    render(
      <CalendarFilters
        enabledCategories={enabled}
        onToggleCategory={vi.fn()}
        advancedFilters={advancedFilters()}
        onAdvancedFiltersChange={onAdvancedFiltersChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /mais filtros/i }));
    await user.click(screen.getByRole('button', { name: /apenas externos/i }));

    expect(onAdvancedFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'external' }),
    );
  });
});
