import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TimeSelect } from '@/components/ui/time-select';
import { CategorySelect } from '@/components/calendar/CategorySelect';
import {
  PrioritySelect,
  type SelectableEventPriority,
} from '@/components/calendar/PrioritySelect';
import {
  RecurrenceSelector,
  DEFAULT_RECURRENCE_CONFIG,
  type RecurrenceConfig,
} from '@/components/calendar/RecurrenceSelector';
import { ReminderList, type ReminderEntry } from '@/components/calendar/ReminderList';
import {
  OwnershipChooser,
  type EventOwnershipChoice,
} from '@/components/calendar/OwnershipChooser';
import { CalendarDays, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  createCalendarEventDomain,
  updateCalendarEventDomain,
  mapCalendarDomainRpcError,
  setCalendarEventRecurrenceDomain,
  setCalendarEventRemindersDomain,
  type SetCalendarEventRecurrenceDomainInput,
} from '@/lib/calendar-domain';
import { supabase } from '@/lib/supabase';
import { getAppliedUserPreferences } from '@/utils/appliedUserPreferences';
import type { AgendaItem, EventKind, EventPriority } from '@/types/calendar.types';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  onSuccess: () => void;
  /** Calendar page already ran the ownership modal; skip redundant ownership fieldset. */
  hideOwnershipChooser?: boolean;
  /** Optional hour-level prefill (e.g. week grid); minutes default to :00 via TimeSelect. */
  defaultStartTime?: string;
  defaultEndTime?: string;
  eventToEdit?: AgendaItem | null;
}

interface CalendarEventEditRow {
  id: string;
  title: string;
  description: string | null;
  event_kind: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location_text: string | null;
  metadata: Record<string, unknown> | null;
}

interface CalendarEventRecurrenceRow {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  until_at: string | null;
  count_limit: number | null;
}

interface CalendarEventReminderRow {
  id: string;
  remind_offset_minutes: number;
}

function timeToMinutes(hhMm: string): number {
  const [h, m] = hhMm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function priorityForDomain(value: SelectableEventPriority): EventPriority | undefined {
  if (value === 'none') return undefined;
  return value;
}

function parseTickTickTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function recurrenceConfigFromRow(
  row: CalendarEventRecurrenceRow | null,
): RecurrenceConfig {
  if (!row) return { ...DEFAULT_RECURRENCE_CONFIG };

  return {
    frequency: row.frequency,
    interval: row.interval_value ?? 1,
    byWeekday: row.by_weekday ?? [],
    byMonthday: row.by_monthday ?? [],
    endType: row.until_at ? 'date' : row.count_limit ? 'count' : 'never',
    endDate: row.until_at ? format(parseISO(row.until_at), 'yyyy-MM-dd') : undefined,
    endCount: row.count_limit ?? undefined,
  };
}

function parseDateOnly(dateOnly: string): [number, number, number] {
  const [year, month, day] = dateOnly.split('-').map((value) => parseInt(value, 10));
  return [year, month, day];
}

function getTimeZoneLocalParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: lookup('hour'),
    minute: lookup('minute'),
    second: lookup('second'),
  };
}

function buildExplicitEndOfDayInstant(dateOnly: string, timeZone: string): string {
  const [year, month, day] = parseDateOnly(dateOnly);
  const desiredUtcEquivalent = Date.UTC(year, month - 1, day, 23, 59, 59);
  let candidate = new Date(desiredUtcEquivalent);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = getTimeZoneLocalParts(candidate, timeZone);
    const actualUtcEquivalent = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const diffMs = desiredUtcEquivalent - actualUtcEquivalent;
    if (diffMs === 0) {
      return candidate.toISOString();
    }
    candidate = new Date(candidate.getTime() + diffMs);
  }

  return candidate.toISOString();
}

function buildRecurrenceDomainInput(
  eventId: string,
  config: RecurrenceConfig,
  tz: string,
): SetCalendarEventRecurrenceDomainInput {
  if (config.frequency === 'none') {
    throw new Error('Recorrência inválida.');
  }

  let untilAt: string | null = null;
  let countLimit: number | null = null;
  if (config.endType === 'date' && config.endDate?.trim()) {
    untilAt = buildExplicitEndOfDayInstant(config.endDate.trim(), tz);
  } else if (config.endType === 'count') {
    countLimit = config.endCount ?? null;
  }

  const byWeekday =
    config.frequency === 'weekly' && config.byWeekday.length > 0 ? config.byWeekday : null;
  const byMonthday =
    config.frequency === 'monthly' && config.byMonthday.length > 0 ? config.byMonthday : null;

  return {
    eventId,
    frequency: config.frequency,
    intervalValue: config.interval,
    byWeekday,
    byMonthday,
    untilAt,
    countLimit,
    timezone: tz,
    startsAt: null,
  };
}

export function CreateEventDialog({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
  hideOwnershipChooser = false,
  defaultStartTime,
  defaultEndTime,
  eventToEdit = null,
}: CreateEventDialogProps) {
  const isEditMode = eventToEdit !== null;
  const [ownership, setOwnership] = useState<EventOwnershipChoice>('agenda');
  const [eventKind, setEventKind] = useState<EventKind>('personal');
  const [priority, setPriority] = useState<SelectableEventPriority>('none');
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ ...DEFAULT_RECURRENCE_CONFIG });
  const [reminders, setReminders] = useState<ReminderEntry[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [tickTickTags, setTickTickTags] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [hadExistingRecurrence, setHadExistingRecurrence] = useState(false);

  const applyLoadedEventState = useCallback(
    (
      eventRow: CalendarEventEditRow,
      recurrenceRow: CalendarEventRecurrenceRow | null,
      reminderRows: CalendarEventReminderRow[],
    ) => {
      setOwnership('agenda');
      setEventKind((eventRow.event_kind || 'personal') as EventKind);
      setPriority(((eventRow.metadata?.priority as SelectableEventPriority | undefined) ?? 'none'));
      setRecurrence(recurrenceConfigFromRow(recurrenceRow));
      setHadExistingRecurrence(recurrenceRow !== null);
      setReminders(
        reminderRows.map((row) => ({
          id: row.id,
          offsetMinutes: row.remind_offset_minutes,
        })),
      );
      setTitle(eventRow.title);
      setDescription(eventRow.description ?? '');
      setDate(format(parseISO(eventRow.start_at), 'yyyy-MM-dd'));
      setStartTime(format(parseISO(eventRow.start_at), 'HH:mm'));
      setEndTime(
        eventRow.end_at ? format(parseISO(eventRow.end_at), 'HH:mm') : format(parseISO(eventRow.start_at), 'HH:mm'),
      );
      setLocation(eventRow.location_text ?? '');
      setTickTickTags(
        Array.isArray(eventRow.metadata?.ticktick_tags)
          ? (eventRow.metadata?.ticktick_tags as unknown[])
              .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
              .join(', ')
          : '',
      );
      setAllDay(eventRow.all_day);
    },
    [],
  );

  const resetForm = useCallback(() => {
    setOwnership('agenda');
    setEventKind('personal');
    setPriority('none');
    setRecurrence({ ...DEFAULT_RECURRENCE_CONFIG });
    setReminders([]);
    setTitle('');
    setDescription('');
    setDate(format(defaultDate, 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('10:00');
    setLocation('');
    setTickTickTags('');
    setAllDay(false);
    setLoadingExisting(false);
    setHadExistingRecurrence(false);
  }, [defaultDate]);

  useEffect(() => {
    if (!open) return;

    if (!isEditMode || !eventToEdit) {
      setDate(format(defaultDate, 'yyyy-MM-dd'));
      if (hideOwnershipChooser) {
        setOwnership('agenda');
      }
      if (defaultStartTime != null && defaultStartTime !== '') {
        setStartTime(defaultStartTime);
      } else {
        setStartTime('09:00');
      }
      if (defaultEndTime != null && defaultEndTime !== '') {
        setEndTime(defaultEndTime);
      } else {
        setEndTime('10:00');
      }
      return;
    }

    let cancelled = false;
    setLoadingExisting(true);

    void (async () => {
      const eventId = eventToEdit.origin_id;
      const [{ data: eventRow, error: eventError }, { data: recurrenceRow, error: recurrenceError }, { data: reminderRows, error: reminderError }] =
        await Promise.all([
          supabase
            .from('calendar_events')
            .select('id, title, description, event_kind, start_at, end_at, all_day, location_text, metadata')
            .eq('id', eventId)
            .single<CalendarEventEditRow>(),
          supabase
            .from('calendar_event_recurrence_rules')
            .select('frequency, interval_value, by_weekday, by_monthday, until_at, count_limit')
            .eq('event_id', eventId)
            .maybeSingle<CalendarEventRecurrenceRow>(),
          supabase
            .from('calendar_event_reminders')
            .select('id, remind_offset_minutes')
            .eq('event_id', eventId)
            .order('remind_offset_minutes', { ascending: true }),
        ]);

      if (cancelled) return;
      if (eventError) {
        throw eventError;
      }
      if (recurrenceError) {
        throw recurrenceError;
      }
      if (reminderError) {
        throw reminderError;
      }

      applyLoadedEventState(
        eventRow as CalendarEventEditRow,
        (recurrenceRow as CalendarEventRecurrenceRow | null) ?? null,
        ((reminderRows as CalendarEventReminderRow[] | null) ?? []),
      );
    })()
      .catch((error) => {
        console.error('[CreateEventDialog] unable to load event for edit:', error);
        toast.error('Não foi possível carregar o compromisso para edição.');
        resetForm();
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingExisting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    defaultDate,
    hideOwnershipChooser,
    defaultStartTime,
    defaultEndTime,
    isEditMode,
    eventToEdit,
    applyLoadedEventState,
    onOpenChange,
    resetForm,
  ]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownership === 'financial') {
      return;
    }

    if (!title.trim()) {
      toast.error('Informe o título do compromisso');
      return;
    }

    if (!allDay && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      toast.error('O horário de fim deve ser depois do início.');
      return;
    }

    setSaving(true);
    let eventId: string | null = isEditMode && eventToEdit ? eventToEdit.origin_id : null;
    try {
      if (isEditMode && eventToEdit) {
        await updateCalendarEventDomain({
          eventId: eventToEdit.origin_id,
          title: title.trim(),
          description: description.trim() || null,
          date,
          startTime,
          endTime,
          allDay,
          locationText: location.trim() || null,
          eventKind,
          priority: priorityForDomain(priority),
          tickTickTags: parseTickTickTagsInput(tickTickTags),
        });
      } else {
        const created = await createCalendarEventDomain({
          title: title.trim(),
          description: description.trim() || null,
          date,
          startTime,
          endTime,
          allDay,
          locationText: location.trim() || null,
          eventKind,
          priority: priorityForDomain(priority),
          tickTickTags: parseTickTickTagsInput(tickTickTags),
        });
        eventId = created.eventId;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(
        isEditMode
          ? `Erro ao atualizar compromisso: ${mapCalendarDomainRpcError(msg)}`
          : `Erro ao criar compromisso: ${mapCalendarDomainRpcError(msg)}`,
      );
      setSaving(false);
      return;
    }

    if (!eventId) {
      toast.error('Compromisso inválido para edição.');
      setSaving(false);
      return;
    }

    const tz = getAppliedUserPreferences().timezone;
    const recurrenceActive = recurrence.frequency !== 'none';
    let recurrenceFailed = false;
    let recurrenceErrMsg = '';

    try {
      if (recurrenceActive) {
        await setCalendarEventRecurrenceDomain(buildRecurrenceDomainInput(eventId, recurrence, tz));
      } else if (isEditMode && hadExistingRecurrence) {
        await setCalendarEventRecurrenceDomain({
          eventId,
          removeRecurrence: true,
        });
      }
    } catch (err: unknown) {
      recurrenceFailed = true;
      const raw = err instanceof Error ? err.message : 'Erro desconhecido';
      recurrenceErrMsg = mapCalendarDomainRpcError(raw);
    }

    let remindersFailed = false;
    let remindersErrMsg = '';

    if (reminders.length > 0 || isEditMode) {
      try {
        await setCalendarEventRemindersDomain({
          eventId,
          reminders: reminders.map((r) => ({
            remind_offset_minutes: r.offsetMinutes,
            reminder_type: 'relative',
          })),
        });
      } catch (err: unknown) {
        remindersFailed = true;
        const raw = err instanceof Error ? err.message : 'Erro desconhecido';
        remindersErrMsg = mapCalendarDomainRpcError(raw);
      }
    }

    toast.success(isEditMode ? 'Compromisso atualizado' : 'Compromisso criado');
    if (recurrenceFailed) {
      toast.warning(
        `O compromisso foi salvo, mas a recorrência não pôde ser aplicada: ${recurrenceErrMsg}`,
      );
    }
    if (remindersFailed) {
      toast.warning(
        `O compromisso foi salvo, mas os lembretes não puderam ser aplicados: ${remindersErrMsg}`,
      );
    }

    onSuccess();
    handleOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-border/60 bg-surface p-0 shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:max-w-2xl sm:rounded-2xl">
        <div className="flex max-h-[92vh] flex-col">
        <DialogHeader className="shrink-0 border-b border-border/40 px-6 pb-4 pt-6 pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            {isEditMode ? 'Editar Compromisso' : ownership === 'financial' ? 'Obrigação financeira' : 'Novo Compromisso'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditMode
              ? 'Atualize os dados do compromisso. As alterações serão refletidas no sistema e sincronizadas com o TickTick.'
              : ownership === 'financial'
              ? 'Contas e faturas ficam no módulo financeiro, com regras próprias.'
              : 'Preencha os dados e salve. O evento ficará na sua agenda.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        <div className="space-y-4">
          {!isEditMode && !hideOwnershipChooser ? (
            <OwnershipChooser value={ownership} onChange={setOwnership} />
          ) : null}

          {loadingExisting ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-elevated/40 p-4">
              <div className="h-10 animate-pulse rounded-xl bg-muted/30" />
              <div className="h-24 animate-pulse rounded-xl bg-muted/20" />
              <div className="h-10 animate-pulse rounded-xl bg-muted/20" />
            </div>
          ) : ownership === 'financial' ? (
            <div
              data-testid="financial-handoff-panel"
              className="space-y-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"
            >
              <p className="text-sm leading-relaxed text-foreground">
                Para registrar contas a pagar, faturas de cartão ou ciclos financeiros, use o módulo{' '}
                <span className="font-medium">Contas</span>. Este diálogo não cria lançamentos
                financeiros nem categoria &quot;financeira&quot; na agenda.
              </p>
              <Button
                asChild
                className="w-full rounded-xl bg-amber-600 text-white hover:bg-amber-600/90"
              >
                <Link to="/contas?novo=1">Ir para Contas</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Título
                </Label>
                <Input
                  id="title"
                  placeholder="Ex.: Reunião com equipe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border-border/60 bg-surface-elevated focus-visible:ring-primary"
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <CategorySelect value={eventKind} onChange={setEventKind} />
                <PrioritySelect value={priority} onChange={setPriority} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes opcionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none rounded-xl border-border/60 bg-surface-elevated focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticktick-tags" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags do TickTick
                </Label>
                <Input
                  id="ticktick-tags"
                  placeholder="Ex.: mentoria, cliente vip, follow-up"
                  value={tickTickTags}
                  onChange={(e) => setTickTickTags(e.target.value)}
                  className="rounded-xl border-border/60 bg-surface-elevated focus-visible:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Separe as tags por vírgula. Elas serão espelhadas no TickTick.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3 w-3" /> Data
                </Label>
                <DatePickerInput
                  value={date}
                  onChange={(v) => setDate(v)}
                  className="w-full justify-start rounded-xl border-border/60 bg-surface-elevated font-normal text-foreground hover:bg-surface-overlay"
                  placeholder="Selecione a data"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-surface-elevated/50 px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="all-day" className="text-sm font-medium text-foreground">
                    Dia inteiro
                  </Label>
                  <p className="text-xs text-muted-foreground">Sem horários específicos neste dia</p>
                </div>
                <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} aria-label="Dia inteiro" />
              </div>

              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <TimeSelect
                    id="start-time"
                    label="Início"
                    value={startTime}
                    onChange={setStartTime}
                  />
                  <TimeSelect
                    id="end-time"
                    label="Fim"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="location" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Local
                </Label>
                <Input
                  id="location"
                  placeholder="Opcional"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-xl border-border/60 bg-surface-elevated focus-visible:ring-primary"
                />
              </div>

              <RecurrenceSelector value={recurrence} onChange={setRecurrence} />

              <ReminderList reminders={reminders} onChange={setReminders} />
              </div>

              <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-border/40 bg-surface/95 pb-1 pt-4 backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(var(--primary),0.35)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.45)]"
                >
                  {saving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Criar Compromisso'}
                </Button>
              </div>
            </form>
          )}
        </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
