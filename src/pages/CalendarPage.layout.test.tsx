/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {actions}
    </div>
  ),
}));

vi.mock('@/hooks/useCalendarAgenda', () => ({
  useCalendarAgenda: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));

vi.mock('@/lib/ticktick-sync', () => ({
  requestTickTickSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/calendar/MonthView', () => ({
  MonthView: () => <div data-testid="month-view-desktop" />,
}));

vi.mock('@/components/calendar/WeekView', () => ({
  WeekView: () => <div data-testid="week-view-desktop" />,
}));

vi.mock('@/components/calendar/DayView', () => ({
  DayView: () => <div data-testid="day-view-desktop" />,
}));

vi.mock('@/components/calendar/MonthGridMobile', () => ({
  MonthGridMobile: () => <div data-testid="month-grid-mobile" />,
}));

vi.mock('@/components/calendar/WeekStrip', () => ({
  WeekStrip: () => <div data-testid="week-strip-mobile" />,
}));

vi.mock('@/components/calendar/DayViewMobile', () => ({
  DayViewMobile: () => <div data-testid="day-view-mobile" />,
}));

vi.mock('@/components/calendar/AgendaDayList', () => ({
  AgendaDayList: () => <div data-testid="agenda-day-list" />,
}));

vi.mock('@/components/calendar/AgendaItemSheet', () => ({
  AgendaItemSheet: () => null,
}));

vi.mock('@/components/calendar/CreateEventDialog', () => ({
  CreateEventDialog: () => null,
}));

vi.mock('@/components/calendar/OwnershipChooser', () => ({
  OwnershipPageChooserDialog: () => null,
}));

vi.mock('@/components/calendar/CalendarFiltersSheet', () => ({
  CalendarFiltersSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="filter-sheet-open" /> : null,
}));

vi.mock('@/components/calendar/CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters-inline" />,
  AdvancedAgendaFilters: {},
}));

import { CalendarPage } from './CalendarPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  );
}

describe('CalendarPage layout', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('dual-renders month view for desktop and mobile in the DOM', () => {
    renderPage();
    expect(screen.getByTestId('month-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('month-grid-mobile')).toBeTruthy();
    expect(screen.getByTestId('agenda-day-list')).toBeTruthy();
  });

  it('opens the filter sheet when the filter button is tapped', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Filtros'));
    expect(screen.getByTestId('filter-sheet-open')).toBeTruthy();
  });

  it('persists the selected view mode via localStorage', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /^dia$/i }));
    expect(window.localStorage.getItem('agenda-view-mode')).toBe('day');
    expect(screen.getByTestId('day-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('day-view-mobile')).toBeTruthy();
  });

  it('reads the persisted view mode on mount', () => {
    window.localStorage.setItem('agenda-view-mode', 'week');
    renderPage();
    expect(screen.getByTestId('week-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('week-strip-mobile')).toBeTruthy();
  });
});
