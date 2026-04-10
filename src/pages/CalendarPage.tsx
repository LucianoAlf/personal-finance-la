import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/cn';
import { useCalendarAgenda } from '@/hooks/useCalendarAgenda';
import { requestTickTickSync } from '@/lib/ticktick-sync';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaItemSheet } from '@/components/calendar/AgendaItemSheet';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import {
  CalendarFilters,
  type AdvancedAgendaFilters,
} from '@/components/calendar/CalendarFilters';
import {
  OwnershipPageChooserDialog,
  type EventOwnershipChoice,
} from '@/components/calendar/OwnershipChooser';
import {
  AGENDA_FILTER_CATEGORIES,
  getAgendaItemFilterCategory,
} from '@/components/calendar/calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

export type CalendarViewMode = 'month' | 'week' | 'day';

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
};

function getAgendaWindow(anchor: Date, view: CalendarViewMode) {
  switch (view) {
    case 'month': {
      const s = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
      const e = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
      return { from: s.toISOString(), to: e.toISOString() };
    }
    case 'week': {
      const s = startOfWeek(anchor, { weekStartsOn: 0 });
      const e = endOfWeek(anchor, { weekStartsOn: 0 });
      return { from: s.toISOString(), to: e.toISOString() };
    }
    case 'day':
      return {
        from: new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).toISOString(),
        to: new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59, 59).toISOString(),
      };
  }
}

function navigateDate(anchor: Date, view: CalendarViewMode, direction: 1 | -1): Date {
  const fn = direction === 1;
  switch (view) {
    case 'month':
      return fn ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case 'week':
      return fn ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
    case 'day':
      return fn ? addDays(anchor, 1) : subDays(anchor, 1);
  }
}

function formatAnchorLabel(anchor: Date, view: CalendarViewMode): string {
  switch (view) {
    case 'month':
      return format(anchor, "MMMM 'de' yyyy", { locale: ptBR });
    case 'week': {
      const s = startOfWeek(anchor, { weekStartsOn: 0 });
      const e = endOfWeek(anchor, { weekStartsOn: 0 });
      return `${format(s, 'dd MMM', { locale: ptBR })} — ${format(e, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    case 'day':
      return format(anchor, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }
}

function padHour(h: number): string {
  return String(h).padStart(2, '0');
}

function hourSlotRange(hour: number): { start: string; end: string } {
  const start = `${padHour(hour)}:00`;
  if (hour >= 23) {
    return { start, end: '23:45' };
  }
  return { start, end: `${padHour(hour + 1)}:00` };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [createAgendaOpen, setCreateAgendaOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState(() => new Date());
  const [createTimePrefill, setCreateTimePrefill] = useState<{ start: string; end: string } | null>(null);
  const [hideOwnershipInCreate, setHideOwnershipInCreate] = useState(false);

  const [enabledCategories, setEnabledCategories] = useState(
    () => new Set<string>(AGENDA_FILTER_CATEGORIES),
  );
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedAgendaFilters>({
    source: 'all',
    interactivity: 'all',
    actionableOnly: false,
  });

  const window = useMemo(() => getAgendaWindow(anchor, view), [anchor, view]);
  const { data: rawItems = [], isLoading, refetch } = useCalendarAgenda(window);
  useEffect(() => {
    void (async () => {
      await requestTickTickSync({ reason: 'calendar-page-open' });
      await refetch();
    })();
  }, [refetch]);

  const handleAgendaMutationSuccess = useCallback(() => {
    void (async () => {
      await refetch();
      await requestTickTickSync({ reason: 'calendar-mutation' });
      await refetch();
    })();
  }, [refetch]);


  const items = useMemo(
    () =>
      rawItems.filter((item) => {
        const category = getAgendaItemFilterCategory(item);
        if (!enabledCategories.has(category)) return false;

        if (advancedFilters.source === 'external' && category !== 'external') return false;
        if (advancedFilters.source === 'internal' && category === 'external') return false;

        if (advancedFilters.interactivity === 'editable' && item.is_read_only) return false;
        if (advancedFilters.interactivity === 'readonly' && !item.is_read_only) return false;

        if (
          advancedFilters.actionableOnly &&
          !item.supports_reschedule &&
          !item.supports_complete
        ) {
          return false;
        }

        return true;
      }),
    [rawItems, enabledCategories, advancedFilters],
  );

  const selectedAgendaItem = useMemo(() => {
    if (!selectedItem) return null;
    return (
      rawItems.find(
        (item) =>
          item.dedup_key === selectedItem.dedup_key ||
          (item.origin_type === selectedItem.origin_type && item.origin_id === selectedItem.origin_id),
      ) ?? selectedItem
    );
  }, [rawItems, selectedItem]);

  const goToday = useCallback(() => setAnchor(new Date()), []);
  const goPrev = useCallback(() => setAnchor((a) => navigateDate(a, view, -1)), [view]);
  const goNext = useCallback(() => setAnchor((a) => navigateDate(a, view, 1)), [view]);

  const toggleCategory = useCallback((cat: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleItemClick = useCallback((item: AgendaItem) => {
    setSelectedItem(item);
  }, []);

  const handleHeaderNew = useCallback(() => {
    setCreateDefaultDate(anchor);
    setCreateTimePrefill(null);
    setHideOwnershipInCreate(false);
    setChooserOpen(true);
  }, [anchor]);

  const handleMonthDayClick = useCallback((date: Date) => {
    setAnchor(date);
    setCreateDefaultDate(date);
    setCreateTimePrefill(null);
    setHideOwnershipInCreate(false);
    setChooserOpen(true);
  }, []);

  const handleWeekEmptySlot = useCallback((date: Date, hour: number) => {
    setAnchor(date);
    setCreateDefaultDate(date);
    setCreateTimePrefill(hourSlotRange(hour));
    setHideOwnershipInCreate(false);
    setChooserOpen(true);
  }, []);

  const handleOwnershipChoice = useCallback(
    (choice: EventOwnershipChoice) => {
      if (choice === 'financial') {
        navigate('/contas?novo=1');
        return;
      }
      setHideOwnershipInCreate(true);
      setCreateAgendaOpen(true);
    },
    [navigate],
  );

  const handleCreateOpenChange = useCallback((open: boolean) => {
    setCreateAgendaOpen(open);
    if (!open) {
      setCreateTimePrefill(null);
      setHideOwnershipInCreate(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        title="Agenda"
        subtitle={formatAnchorLabel(anchor, view)}
        icon={<CalendarDays className="h-6 w-6 text-primary" />}
        actions={
          <Button
            onClick={handleHeaderNew}
            className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(var(--primary),0.35)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.45)]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v) setView(v as CalendarViewMode);
            }}
            className={cn(
              'flex w-full flex-wrap justify-start rounded-2xl border border-border/70 bg-surface p-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
              'sm:w-auto sm:flex-nowrap',
            )}
            aria-label="Visualização da agenda"
          >
            {(['month', 'week', 'day'] as const).map((v) => (
              <ToggleGroupItem key={v} value={v} aria-label={VIEW_LABELS[v]}>
                {VIEW_LABELS[v]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="rounded-xl border-border/70 bg-surface text-foreground hover:bg-surface-elevated"
            >
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                className="h-9 w-9 rounded-xl hover:bg-surface-elevated"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-foreground">
                {formatAnchorLabel(anchor, view)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goNext}
                className="h-9 w-9 rounded-xl hover:bg-surface-elevated"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>

        <CalendarFilters
          className="mb-6"
          enabledCategories={enabledCategories}
          onToggleCategory={toggleCategory}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${anchor.toISOString()}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {view === 'month' && (
              <MonthView
                anchor={anchor}
                items={items}
                isLoading={isLoading}
                onDayClick={handleMonthDayClick}
                onItemClick={handleItemClick}
              />
            )}
            {view === 'week' && (
              <WeekView
                anchor={anchor}
                items={items}
                isLoading={isLoading}
                onItemClick={handleItemClick}
                onEmptySlotClick={handleWeekEmptySlot}
              />
            )}
            {view === 'day' && (
              <DayView
                anchor={anchor}
                items={items}
                isLoading={isLoading}
                onItemClick={handleItemClick}
                onEmptySlotClick={handleWeekEmptySlot}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AgendaItemSheet
        item={selectedAgendaItem}
        open={!!selectedAgendaItem}
        onClose={() => setSelectedItem(null)}
        onMutationSuccess={handleAgendaMutationSuccess}
      />

      <OwnershipPageChooserDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onChoose={handleOwnershipChoice}
      />

      <CreateEventDialog
        open={createAgendaOpen}
        onOpenChange={handleCreateOpenChange}
        defaultDate={createDefaultDate}
        defaultStartTime={createTimePrefill?.start}
        defaultEndTime={createTimePrefill?.end}
        hideOwnershipChooser={hideOwnershipInCreate}
        onSuccess={handleAgendaMutationSuccess}
      />
    </div>
  );
}
