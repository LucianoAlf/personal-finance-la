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
  getBadgeStyle,
  getItemIndicator,
  isFinancialAgendaItem,
} from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Flag, Globe, Lock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgendaHoverTooltip } from './AgendaHoverTooltip';

interface MonthViewProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading: boolean;
  onDayClick: (date: Date) => void;
  onItemClick: (item: AgendaItem) => void;
}

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_CHIPS_PER_DAY = 4;

function sortMonthDayItems(dayItems: AgendaItem[]) {
  return [...dayItems].sort((left, right) => {
    const leftPresentation = getAgendaItemPresentation(left);
    const rightPresentation = getAgendaItemPresentation(right);
    const leftAllDay = leftPresentation.allDay;
    const rightAllDay = rightPresentation.allDay;
    if (leftAllDay !== rightAllDay) return leftAllDay ? -1 : 1;
    return leftPresentation.startAt.localeCompare(rightPresentation.startAt);
  });
}

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
    return sortMonthDayItems(getItemsForDay(items, dayListSheetDay));
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
          const dayItems = sortMonthDayItems(getItemsForDay(items, day));
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

function monthSheetStatusLabel(status: string): string | null {
  if (status === 'completed') return 'Concluído';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'pending' || status === 'scheduled' || status === 'confirmed') return 'Pendente';
  if (status === 'overdue') return 'Atrasado';
  if (status === 'partial') return 'Parcial';
  return null;
}

function monthSheetPriorityLabel(priority: string | null | undefined): string | null {
  if (!priority) return null;
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Média';
  if (priority === 'low') return 'Baixa';
  return priority;
}

function monthSheetSyncLabel(provider: string | null | undefined, status: string | null | undefined): string | null {
  if (!provider) return null;
  const providerLabel = provider === 'ticktick' ? 'TickTick' : provider;
  if (status === 'synced') return `${providerLabel} - Sincronizado`;
  if (status === 'pending') return `${providerLabel} - Pendente`;
  if (status === 'failed') return `${providerLabel} - Falha`;
  if (status === 'remote_deleted') return `${providerLabel} - Removido`;
  return providerLabel;
}

function getAgendaTickTickTags(metadata: Record<string, unknown> | null): string[] {
  if (!metadata || !Array.isArray(metadata.ticktick_tags)) return [];
  return (metadata.ticktick_tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
}

function normalizeComparableLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('pt-BR');
}

function MonthSheetEventCard({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick: (item: AgendaItem) => void;
}) {
  const metadata = item.metadata as Record<string, unknown> | null;
  const eventKind = (metadata?.event_kind as string | undefined) ?? item.badge;
  const badge = getBadgeStyle(eventKind);
  const indicator = getItemIndicator(item.agenda_item_type);
  const isDerived = item.agenda_item_type === 'derived_projection';
  const readOnly = item.is_read_only || isDerived;
  const isFinancial = isFinancialAgendaItem(item);

  const presentation = getAgendaItemPresentation(item);
  const dateLabel = format(parseISO(item.display_start_at), "EEEE, d 'de' MMMM", { locale: ptBR });
  const statusLine = monthSheetStatusLabel(item.status);
  const tags = getAgendaTickTickTags(item.metadata);
  const priorityLabel = monthSheetPriorityLabel(
    metadata?.priority as string | undefined,
  );
  const syncLabel = monthSheetSyncLabel(
    metadata?.sync_provider as string | undefined,
    metadata?.sync_status as string | undefined,
  );
  const location = metadata?.location_text as string | undefined;
  const detailText =
    item.subtitle && normalizeComparableLabel(item.subtitle) !== normalizeComparableLabel(statusLine)
      ? item.subtitle
      : null;

  const showTime = !presentation.allDay;
  const timeStart = showTime ? format(parseISO(presentation.startAt), 'HH:mm') : null;
  const timeEnd = showTime && presentation.endAt ? format(parseISO(presentation.endAt), 'HH:mm') : null;

  return (
    <AgendaHoverTooltip item={item}>
      <button
        type="button"
        data-testid={`month-sheet-item-${item.dedup_key}`}
        onClick={() => onClick(item)}
        className={cn(
          'group relative w-full shrink-0 overflow-hidden rounded-xl border border-border/40 px-4 py-3.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200',
          isDerived ? 'border-border/50 bg-surface-elevated/55' : 'bg-surface-elevated/80',
          'hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:translate-y-[-1px]',
        )}
      >
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-1 rounded-l-xl',
            isDerived ? 'bg-muted-foreground/35' : indicator.dot,
          )}
        />
        <div className="flex flex-col gap-2 pl-3">
        {/* Header: title + read-only badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[0.95rem] font-semibold leading-snug text-foreground">{item.title}</p>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {readOnly && (
              <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                Somente leitura
              </span>
            )}
            {item.status === 'completed' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Concluído" />
            )}
          </div>
        </div>

        {/* Description */}
        {detailText && (
          <p
            className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
            data-testid={`month-sheet-description-${item.dedup_key}`}
          >
            {detailText}
          </p>
        )}

        {/* Chips row: category + priority + sync */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-testid={`month-sheet-chips-${item.dedup_key}`}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium',
              badge.bg,
              badge.text,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {badge.label}
          </span>
          {priorityLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[0.7rem] font-medium text-foreground ring-1 ring-border/50">
              <Flag className="h-3 w-3 text-muted-foreground" />
              Prioridade: {priorityLabel}
            </span>
          )}
          {syncLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground ring-1 ring-border/50">
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              {syncLabel}
            </span>
          )}
        </div>

        {/* Date/time footer */}
        <div
          className="flex flex-col gap-1.5 border-t border-border/20 pt-2.5"
          data-testid={`month-sheet-meta-${item.dedup_key}`}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {isFinancial ? 'Vencimento' : 'Quando'}
            </span>
            <span className="capitalize text-sm font-medium text-foreground">{dateLabel}</span>
            {showTime && timeStart && (
              <span className="inline-flex items-center gap-1 tabular-nums text-sm">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                <span className="text-muted-foreground">
                  {timeStart}
                  {timeEnd ? <> — {timeEnd}</> : null}
                </span>
              </span>
            )}
            {!isFinancial && presentation.allDay && (
              <span className="inline-flex items-center gap-1 text-sm">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                <span className="text-muted-foreground">Dia inteiro</span>
              </span>
            )}
          </div>
          {(statusLine || location) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {statusLine && <span className="text-muted-foreground">{statusLine}</span>}
              {location && <span className="truncate text-muted-foreground">{location}</span>}
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5 border-t border-border/20 pt-2.5"
            data-testid={`month-sheet-details-${item.dedup_key}`}
          >
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-border/60 bg-surface-elevated/70 px-1.5 py-0 text-[0.65rem] font-normal text-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        </div>
      </button>
    </AgendaHoverTooltip>
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
