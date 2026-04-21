/* @vitest-environment jsdom */

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateEventDialog } from '../CreateEventDialog';
import type { AgendaItem } from '@/types/calendar.types';
import {
  createCalendarEventDomain,
  setCalendarEventRecurrenceDomain,
  setCalendarEventRemindersDomain,
  updateCalendarEventDomain,
} from '@/lib/calendar-domain';
import { toast } from 'sonner';

const fromMock = vi.fn();

vi.mock('@/lib/calendar-domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/calendar-domain')>();
  return {
    ...actual,
    createCalendarEventDomain: vi.fn(),
    updateCalendarEventDomain: vi.fn(),
    setCalendarEventRecurrenceDomain: vi.fn(),
    setCalendarEventRemindersDomain: vi.fn(),
  };
});

vi.mock('@/utils/appliedUserPreferences', () => ({
  getAppliedUserPreferences: () => ({
    timezone: 'America/Fortaleza',
    language: 'pt-BR',
    theme: 'auto',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'pt-BR',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

beforeEach(() => {
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

const defaultDate = new Date('2026-04-09T12:00:00.000Z');

function baseAgendaItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'event-edit-1',
    dedup_key: 'ce:event-edit-1',
    display_start_at: '2026-04-09T09:00:00.000Z',
    display_end_at: '2026-04-09T10:00:00.000Z',
    title: 'Evento original',
    subtitle: 'Descrição original',
    status: 'scheduled',
    badge: 'work',
    edit_route: '/calendar/events/event-edit-1',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

function mockEditSupabaseLoad() {
  fromMock.mockImplementation((table: string) => {
    if (table === 'calendar_events') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'event-edit-1',
                  title: 'Evento original',
                  description: 'Descrição original',
                  event_kind: 'work',
                  start_at: '2026-04-09T09:00:00.000Z',
                  end_at: '2026-04-09T10:00:00.000Z',
                  all_day: false,
                  location_text: 'Parque',
                  metadata: {
                    priority: 'medium',
                    ticktick_tags: ['saude', 'manha'],
                  },
                },
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === 'calendar_event_recurrence_rules') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }

    if (table === 'calendar_event_reminders') {
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [{ id: 'rem-1', remind_offset_minutes: 30 }],
                error: null,
              }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table mock: ${table}`);
  });
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof CreateEventDialog>> & { onSuccess?: () => void } = {},
) {
  const onSuccess = props.onSuccess ?? vi.fn();
  return render(
    <MemoryRouter>
      <CreateEventDialog
        open
        onOpenChange={() => {}}
        defaultDate={defaultDate}
        onSuccess={onSuccess}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('CreateEventDialog', () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.mocked(createCalendarEventDomain).mockResolvedValue({
      eventId: '11111111-1111-1111-1111-111111111111',
    });
    vi.mocked(updateCalendarEventDomain).mockResolvedValue(undefined);
    vi.mocked(setCalendarEventRecurrenceDomain).mockResolvedValue(undefined);
    vi.mocked(setCalendarEventRemindersDomain).mockResolvedValue(undefined);
  });

  it('Task 10: omite o chooser de agenda vs financeiro quando hideOwnershipChooser é true', () => {
    renderDialog({ hideOwnershipChooser: true });
    expect(screen.queryByText(/o que você está criando/i)).toBeNull();
    expect(screen.getByLabelText(/título/i)).toBeTruthy();
  });

  it('envia categoria e prioridade no create e chama RPCs de recorrência e lembretes quando configurados', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/título/i), 'Daily standup');

    await user.click(screen.getByRole('combobox', { name: /categoria da agenda/i }));
    await user.click(await screen.findByRole('option', { name: /trabalho/i }));

    await user.click(screen.getByRole('combobox', { name: /^prioridade$/i }));
    await user.click(await screen.findByRole('option', { name: /^média$/i }));

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await screen.findByRole('option', { name: /^diária$/i }));

    await user.click(screen.getByRole('button', { name: /adicionar lembrete/i }));
    const reminderCombo = screen.getByRole('combobox', { name: /lembrete 1/i });
    await user.click(reminderCombo);
    await user.click(await screen.findByRole('option', { name: /1 hora antes/i }));

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(createCalendarEventDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Daily standup',
          eventKind: 'work',
          priority: 'medium',
        }),
      );
    });

    expect(setCalendarEventRecurrenceDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: '11111111-1111-1111-1111-111111111111',
        frequency: 'daily',
        intervalValue: 1,
        timezone: 'America/Fortaleza',
      }),
    );

    expect(setCalendarEventRemindersDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: '11111111-1111-1111-1111-111111111111',
        reminders: expect.arrayContaining([
          expect.objectContaining({
            remind_offset_minutes: 60,
            reminder_type: 'relative',
          }),
        ]),
      }),
    );
  });

  it('serializa tags livres do TickTick no create', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/título/i), 'Mentoria produto');
    await user.type(screen.getByLabelText(/tags do ticktick/i), 'mentoria, cliente vip,  follow-up ');

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(createCalendarEventDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mentoria produto',
          tickTickTags: ['mentoria', 'cliente vip', 'follow-up'],
        }),
      );
    });
  });

  it('serializa untilAt com instante explícito e estável para recorrência com data final', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/título/i), 'Evento com fim');

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await screen.findByRole('option', { name: /^diária$/i }));

    await user.click(screen.getByRole('combobox', { name: /término da repetição/i }));
    await user.click(await screen.findByRole('option', { name: /em uma data/i }));

    await user.type(screen.getByLabelText(/data limite/i), '2026-05-12');

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(setCalendarEventRecurrenceDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '11111111-1111-1111-1111-111111111111',
          frequency: 'daily',
          untilAt: '2026-05-13T02:59:59.000Z',
          timezone: 'America/Fortaleza',
        }),
      );
    });
  });

  it('envia recorrência anual para o domínio quando selecionada no modal', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/título/i), 'Aniversário da Clara');

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await screen.findByRole('option', { name: /^anual$/i }));

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(setCalendarEventRecurrenceDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '11111111-1111-1111-1111-111111111111',
          frequency: 'yearly',
          intervalValue: 1,
          timezone: 'America/Fortaleza',
        }),
      );
    });
  });

  it('com recorrência ativa, ainda tenta salvar lembretes e trata rejeição do domínio como aviso parcial', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(setCalendarEventRemindersDomain).mockRejectedValue(
      new Error('recurring_reminders_not_supported_v1'),
    );

    renderDialog({ onSuccess });

    await user.type(screen.getByLabelText(/título/i), 'Série com lembrete');

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await screen.findByRole('option', { name: /^semanal$/i }));

    await user.click(screen.getByRole('button', { name: /adicionar lembrete/i }));

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled();
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(createCalendarEventDomain).toHaveBeenCalled();
    expect(setCalendarEventRecurrenceDomain).toHaveBeenCalled();
    expect(setCalendarEventRemindersDomain).toHaveBeenCalled();
  });

  it('se o create funciona mas a recorrência falha, avisa parcialmente e ainda confirma sucesso do compromisso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(setCalendarEventRecurrenceDomain).mockRejectedValue(new Error('invalid_interval_value'));

    renderDialog({ onSuccess });

    await user.type(screen.getByLabelText(/título/i), 'Falha na série');

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await screen.findByRole('option', { name: /^mensal$/i }));

    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled();
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(createCalendarEventDomain).toHaveBeenCalled();
  });

  it('modo financeiro não exibe categoria da agenda e mostra encaminhamento honesto para Contas', async () => {
    const user = userEvent.setup();
    renderDialog();

    const financialRadio = screen.getByRole('radio', { name: /obrigação financeira/i });
    await user.click(financialRadio);

    expect(screen.queryByRole('combobox', { name: /categoria da agenda/i })).toBeNull();
    expect(screen.getByTestId('financial-handoff-panel')).toBeTruthy();

    const panel = screen.getByTestId('financial-handoff-panel');
    const contasLink = within(panel).getByRole('link', { name: /ir para contas/i });
    expect(contasLink.getAttribute('href')).toBe('/contas?novo=1');

    expect(screen.queryByText(/financeiro/i, { selector: '[data-slot="select-item"]' })).toBeNull();
  });

  it('mantém aviso honesto de lembretes relativos vs absolutos (paridade TickTick)', () => {
    renderDialog();
    expect(screen.getByTestId('reminder-parity-notice')).toBeTruthy();
  });

  it('limpa o formulário após sucesso ao reabrir o diálogo', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setOpen(true)}>
            reopen
          </button>
          <CreateEventDialog
            open={open}
            onOpenChange={setOpen}
            defaultDate={defaultDate}
            onSuccess={vi.fn()}
          />
        </MemoryRouter>
      );
    }

    render(<Harness />);

    await user.type(screen.getByLabelText(/título/i), 'Temporário');
    await user.click(screen.getByRole('button', { name: /criar compromisso/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /criar compromisso/i })).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: /^reopen$/i }));

    const titleInput = screen.getByLabelText(/título/i) as HTMLInputElement;
    expect(titleInput.value).toBe('');
  });

  it('limpa o formulário ao fechar sem enviar e reabrir', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setOpen(true)}>
            reopen
          </button>
          <CreateEventDialog
            open={open}
            onOpenChange={setOpen}
            defaultDate={defaultDate}
            onSuccess={vi.fn()}
          />
        </MemoryRouter>
      );
    }

    render(<Harness />);

    await user.type(screen.getByLabelText(/título/i), 'Rascunho');
    await user.click(screen.getByRole('combobox', { name: /^prioridade$/i }));
    await user.click(await screen.findByRole('option', { name: /^alta$/i }));

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /criar compromisso/i })).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: /^reopen$/i }));

    const titleInput = screen.getByLabelText(/título/i) as HTMLInputElement;
    expect(titleInput.value).toBe('');
    expect(screen.getByRole('combobox', { name: /^prioridade$/i }).textContent).toMatch(/nenhuma/i);
  });

  it('carrega evento existente e salva via updateCalendarEventDomain em modo edição', async () => {
    const user = userEvent.setup();
    mockEditSupabaseLoad();

    renderDialog({
      hideOwnershipChooser: true,
      eventToEdit: baseAgendaItem(),
    });

    await waitFor(() => {
      expect((screen.getByLabelText(/título/i) as HTMLInputElement).value).toBe('Evento original');
    });

    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Evento revisado');

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(updateCalendarEventDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-edit-1',
          title: 'Evento revisado',
          locationText: 'Parque',
          tickTickTags: ['saude', 'manha'],
          priority: 'medium',
        }),
      );
    });
  });
});
