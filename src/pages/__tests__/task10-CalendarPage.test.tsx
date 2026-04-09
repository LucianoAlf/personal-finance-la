/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CalendarPage } from '../CalendarPage';
import type { AgendaItem } from '@/types/calendar.types';

const mockNavigate = vi.fn();
let mockAgendaItems: AgendaItem[] = [];
const mockRefetch = vi.fn();
const mockRequestTickTickSync = vi.fn((_payload: unknown) => Promise.resolve());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { full_name: 'Test', avatar_url: null },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    userSettings: {
      display_name: 'Test',
      avatar_url: null,
      updated_at: '2026-04-07T00:00:00.000Z',
    },
  }),
}));

vi.mock('@/hooks/useCalendarAgenda', () => ({
  useCalendarAgenda: () => ({
    data: mockAgendaItems,
    isLoading: false,
    refetch: mockRefetch,
  }),
}));

vi.mock('@/lib/ticktick-sync', () => ({
  requestTickTickSync: (payload: unknown) => mockRequestTickTickSync(payload),
}));

function baseItem(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'e1',
    dedup_key: 'k1',
    display_start_at: '2026-04-09T09:00:00',
    display_end_at: '2026-04-09T10:00:00',
    title: 'Event',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: '/c',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockAgendaItems = [];
  mockRefetch.mockReset();
  mockRequestTickTickSync.mockReset();
  mockRequestTickTickSync.mockResolvedValue(undefined);
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.scrollIntoView = function () {};
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCalendarPage() {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="task10-calendar-page-theme">
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function setupUser() {
  return userEvent.setup();
}

function formatDateKeyForUi(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

describe('Task 10 / CalendarPage orchestration', () => {
  it('requests an immediate TickTick sync when the page mounts', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(mockRequestTickTickSync).toHaveBeenCalledWith({ reason: 'calendar-page-open' });
    });
  });

  it('opens ownership choice dialog when header Novo is clicked', async () => {
    const user = setupUser();
    renderCalendarPage();
    await user.click(screen.getByRole('button', { name: /novo evento/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('ownership-choice-agenda')).toBeTruthy();
    expect(screen.getByTestId('ownership-choice-financial')).toBeTruthy();
  });

  it('navigates to /contas with novo=1 when financial is chosen in the page chooser', async () => {
    const user = setupUser();
    renderCalendarPage();
    await user.click(screen.getByRole('button', { name: /novo evento/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByTestId('ownership-choice-financial'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/contas?novo=1');
    });
  });

  it('Task 10: day view empty day Criar evento opens the same ownership chooser as week/month', async () => {
    const user = setupUser();
    renderCalendarPage();
    await user.click(screen.getByRole('radio', { name: /^dia$/i }));
    await screen.findByText(/dia livre/i);
    const createBtn = await screen.findByRole('button', { name: /criar evento/i });
    await user.click(createBtn);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('ownership-choice-agenda')).toBeTruthy();
    expect(screen.getByTestId('ownership-choice-financial')).toBeTruthy();
  });

  it('Task 10: category filtering hides and re-shows matching agenda items', async () => {
    const user = setupUser();
    mockAgendaItems = [
      baseItem({ dedup_key: 'personal', title: 'Personal focus', badge: 'personal' }),
      baseItem({
        dedup_key: 'work',
        title: 'Work sync',
        badge: 'work',
        display_start_at: '2026-04-09T11:00:00',
        display_end_at: '2026-04-09T12:00:00',
      }),
    ];

    renderCalendarPage();
    await user.click(screen.getByRole('radio', { name: /^dia$/i }));

    await screen.findByRole('button', { name: /personal focus/i });
    await screen.findByRole('button', { name: /work sync/i });

    await user.click(screen.getByRole('button', { name: /^trabalho$/i }));
    expect(screen.queryByRole('button', { name: /work sync/i })).toBeNull();
    expect(screen.getByRole('button', { name: /personal focus/i })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^trabalho$/i }));
    await screen.findByRole('button', { name: /work sync/i });
  });

  it('Task 10: extra filters can narrow the agenda to external-only items', async () => {
    const user = setupUser();
    mockAgendaItems = [
      baseItem({ dedup_key: 'personal', title: 'Personal focus', badge: 'personal' }),
      baseItem({
        dedup_key: 'external',
        title: 'TickTick dinner',
        badge: 'external',
        is_read_only: true,
        supports_reschedule: false,
        supports_complete: false,
        display_start_at: '2026-04-09T11:00:00',
        display_end_at: '2026-04-09T12:00:00',
      }),
    ];

    renderCalendarPage();
    await user.click(screen.getByRole('radio', { name: /^dia$/i }));

    await screen.findByRole('button', { name: /personal focus/i });
    await screen.findByRole('button', { name: /ticktick dinner/i });

    await user.click(screen.getByRole('button', { name: /mais filtros/i }));
    await user.click(screen.getByRole('button', { name: /apenas externos/i }));

    expect(screen.queryByRole('button', { name: /personal focus/i })).toBeNull();
    expect(screen.getByRole('button', { name: /ticktick dinner/i })).toBeTruthy();
  });

  it('Task 10: choosing agenda from the page chooser opens CreateEventDialog with embedded chooser suppressed', async () => {
    const user = setupUser();
    renderCalendarPage();

    await user.click(screen.getByRole('button', { name: /novo evento/i }));
    await user.click(screen.getByTestId('ownership-choice-agenda'));

    await waitFor(() => {
      expect(screen.queryByText(/o que você está criando/i)).toBeNull();
    });
    expect(screen.getByLabelText(/título/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /criar compromisso/i })).toBeTruthy();
  });

  it('Task 10: week slot -> agenda choice carries date and hour prefill into the dialog', async () => {
    const user = setupUser();
    const { container } = renderCalendarPage();

    await user.click(screen.getByRole('radio', { name: /^semana$/i }));

    await waitFor(() => {
      expect(container.querySelector('[data-week-empty-slot][data-hour="14"]')).toBeTruthy();
    });
    const slot = container.querySelector('[data-week-empty-slot][data-hour="14"]') as HTMLElement;
    expect(slot).toBeTruthy();
    const dateKey = slot.getAttribute('data-week-empty-slot');
    expect(dateKey).toBeTruthy();
    await user.click(slot);
    await user.click(screen.getByTestId('ownership-choice-agenda'));

    await waitFor(() => {
      expect(screen.queryByText(/o que você está criando/i)).toBeNull();
    });
    expect(screen.getByText(formatDateKeyForUi(dateKey!))).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /início — hora/i }).textContent).toContain('14h');
    expect(screen.getByRole('combobox', { name: /fim — hora/i }).textContent).toContain('15h');
  });
});
