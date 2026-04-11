/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { CalendarPage } from './CalendarPage';

vi.mock('@/components/layout/Header', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
    </div>
  ),
}));

vi.mock('@/hooks/useCalendarAgenda', () => ({
  useCalendarAgenda: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/ticktick-sync', () => ({
  requestTickTickSync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/components/calendar/MonthView', () => ({
  MonthView: () => <div>month-view</div>,
}));

vi.mock('@/components/calendar/WeekView', () => ({
  WeekView: () => <div>week-view</div>,
}));

vi.mock('@/components/calendar/DayView', () => ({
  DayView: () => <div>day-view</div>,
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

describe('CalendarPage layout shell', () => {
  it('uses the shared full-width content wrapper instead of a centered max-width clamp', () => {
    render(
      <MemoryRouter initialEntries={['/agenda']}>
        <CalendarPage />
      </MemoryRouter>,
    );

    const pageContent = screen.getByTestId('app-page-content');

    expect(pageContent.className).toContain('w-full');
    expect(pageContent.className).toContain('px-6');
    expect(pageContent.className).not.toContain('mx-auto');
    expect(pageContent.className).not.toContain('max-w-7xl');
  });
});
