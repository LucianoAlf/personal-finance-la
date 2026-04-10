import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import {
  getItemsForDay,
  getAgendaItemPresentation,
  getAgendaSemanticChrome,
  getItemIndicator,
  sortAgendaDayItems,
} from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgendaHoverTooltip } from './AgendaHoverTooltip';
import { AgendaSheetEventCard } from './AgendaSheetEventCard';

interface MonthViewProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading: boolean;
  onDayClick: (date: Date) => void;
  onItemClick: (item: AgendaItem) => void;
}

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_CHIPS_PER_DAY = 4;

export function MonthView({ anchor, items, isLoading, onDayClick, onItemClick }: MonthViewProps) {
  const [dayListSheetDay, setDayListSheetDay] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [anchor]);

  const dayListSheetItems = useMemo(() => {
    if (!dayListSheetDay) return [];
    return sortAgendaDayItems(getItemsForDay(items, dayListSheetDay));
  }, [dayListSheetDay, items]);

  return (
    <TooltipProvider delayDuration={200}>
    <>
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border/50 bg-surface-elevated/50">
        {WEEKDAY_HEADERS.map((d) => (
          <div
            key={d}
            className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          const dayItems = sortAgendaDayItems(getItemsForDay(items, day));
          const overflow = dayItems.length > MAX_CHIPS_PER_DAY;
          const visibleItems = overflow ? dayItems.slice(0, MAX_CHIPS_PER_DAY) : dayItems;
          const hiddenItems = overflow ? dayItems.slice(MAX_CHIPS_PER_DAY) : [];

          const dayKey = format(day, 'yyyy-MM-dd');

          return (
            <div
              key={dayKey}
              data-testid={`month-day-cell-${dayKey}`}
              onClick={() => onDayClick(day)}
              className={cn(
                'group relative flex min-h-[6.5rem] cursor-pointer flex-col border-b border-r border-border/30 p-1.5 text-left transition-colors duration-150 hover:bg-surface-elevated/60 sm:min-h-[7.5rem] sm:p-2',
                !inMonth && 'bg-background/40',
                idx % 7 === 6 && 'border-r-0',
              )}
            >
              {/* Day number */}
              <div className="mb-1 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDayClick(day);
                  }}
                  aria-label={format(day, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    today && 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.4)]',
                    !today && inMonth && 'text-foreground hover:bg-surface-elevated',
                    !today && !inMonth && 'text-muted-foreground/40 hover:bg-surface-elevated/40',
                  )}
                >
                  {format(day, 'd')}
                </button>
                {dayItems.length > 0 ? (
                  <button
                    type="button"
                    data-testid={`month-day-count-${dayKey}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayListSheetDay(day);
                    }}
                    className="pt-1 text-left text-[0.58rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/80 underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                  </button>
                ) : null}
              </div>

              {/* Event chips */}
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {isLoading ? (
                  <>
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted/40" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
                  </>
                ) : (
                  <>
                    {visibleItems.map((item) => (
                      <MonthEventRow
                        key={item.dedup_key}
                        item={item}
                        onClick={onItemClick}
                      />
                    ))}
                    {overflow && hiddenItems.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            data-testid={`month-overflow-more-${dayKey}`}
                            className="mt-1 w-full text-left text-[0.62rem] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            +{hiddenItems.length} mais
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          className="max-h-64 max-w-[min(18rem,calc(100vw-2rem))] overflow-y-auto border-border/60 bg-popover p-2 text-popover-foreground"
                        >
                          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                            Também neste dia
                          </p>
                          <ul className="space-y-1 text-xs">
                            {hiddenItems.map((hi) => {
                              const pres = getAgendaItemPresentation(hi);
                              const t = pres.allDay ? 'Dia inteiro' : format(parseISO(pres.startAt), 'HH:mm');
                              return (
                                <li key={hi.dedup_key} className="truncate border-b border-border/30 pb-1 last:border-0 last:pb-0">
                                  <span className="tabular-nums text-muted-foreground">{t}</span>{' '}
                                  <span className="font-medium text-foreground">{hi.title}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </>
                )}
              </div>

              {/* Dot indicators for mobile (small screens) */}
              {!isLoading && dayItems.length > 0 && (
                <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5 sm:hidden">
                  {dayItems.slice(0, 4).map((item) => {
                    const indicator = getItemIndicator(item.agenda_item_type);
                    return (
                      <span key={item.dedup_key} className={cn('h-1 w-1 rounded-full', indicator.dot)} />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    <Sheet open={dayListSheetDay !== null} onOpenChange={(open) => !open && setDayListSheetDay(null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-border/60 bg-surface sm:max-w-md"
      >
        {dayListSheetDay ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-foreground">
                {format(dayListSheetDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {dayListSheetItems.length}{' '}
                {dayListSheetItems.length === 1 ? 'compromisso' : 'compromissos'}
              </SheetDescription>
            </SheetHeader>
            <div
              className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
              data-testid="month-day-list-sheet-body"
            >
              {dayListSheetItems.map((item) => (
                <MonthSheetEventCard
                  key={item.dedup_key}
                  item={item}
                  onClick={(i) => {
                    onItemClick(i);
                    setDayListSheetDay(null);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
    </>
    </TooltipProvider>
  );
}

function MonthSheetEventCard({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick: (item: AgendaItem) => void;
}) {
  return (
    <AgendaSheetEventCard item={item} onClick={onClick} testIdPrefix="month-sheet" />
  );
}

function MonthEventRow({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick: (item: AgendaItem) => void;
}) {
  const chrome = getAgendaSemanticChrome(item.badge);
  const isDerived = item.agenda_item_type === 'derived_projection';
  const presentation = getAgendaItemPresentation(item);
  const timeLabel = presentation.allDay ? null : format(parseISO(presentation.startAt), 'HH:mm');

  return (
    <AgendaHoverTooltip item={item}>
      <button
        type="button"
        data-testid={`month-item-${item.dedup_key}`}
        data-month-item-kind={presentation.allDay ? 'all-day' : 'timed'}
        data-agenda-chrome="semantic-border-left"
        data-agenda-accent="left"
        onClick={(e) => {
          e.stopPropagation();
          onClick(item);
        }}
        className={cn(
          'group flex w-full min-w-0 items-center gap-1 rounded-sm border border-l-4 px-1.5 py-0.5 text-left text-[0.6rem] font-medium leading-tight text-foreground transition-all sm:text-[0.64rem]',
          isDerived && 'opacity-90',
          !isDerived && 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
          'hover:brightness-[0.98] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]',
        )}
        style={{
          backgroundColor: chrome.backgroundColor,
          borderColor: chrome.borderColor,
          borderLeftColor: chrome.accentColor,
        }}
      >
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.title}</span>
        {timeLabel ? (
          <span className="shrink-0 tabular-nums text-[0.52rem] text-muted-foreground sm:text-[0.58rem]">
            {timeLabel}
          </span>
        ) : null}
      </button>
    </AgendaHoverTooltip>
  );
}
