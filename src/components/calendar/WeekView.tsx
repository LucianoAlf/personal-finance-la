import { useMemo, useState } from 'react';
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import {
  getAgendaItemPresentation,
  getItemsForDay,
  getHourFromISO,
  getAgendaSemanticChrome,
  calculateEventPosition,
  type EventPosition,
} from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgendaHoverTooltip } from './AgendaHoverTooltip';

interface WeekViewProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading: boolean;
  onItemClick: (item: AgendaItem) => void;
  /** Hour is the row start hour (e.g. 14 → 14:00); creation UIs should treat as hour-level precision only. */
  onEmptySlotClick?: (date: Date, hour: number) => void;
}

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 24;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);
const ROW_HEIGHT_REM = 3.5;
const TOTAL_TIMELINE_REM = (DAY_END_HOUR - DAY_START_HOUR) * ROW_HEIGHT_REM;
const MAX_VISIBLE_WEEK_ALL_DAY = 4;
const MAX_VISIBLE_WEEK_TIMED_CLUSTER = 4;

interface TimedLayoutRow {
  item: AgendaItem;
  pos: EventPosition;
  overlapStart: number;
  overlapEnd: number;
  lane: number;
  laneCount: number;
}

type WeekTimedRenderItem =
  | { kind: 'event'; row: TimedLayoutRow }
  | {
      kind: 'overflow';
      dayKey: string;
      timeLabel: string;
      items: AgendaItem[];
      hiddenItems: AgendaItem[];
      pos: EventPosition;
      lane: number;
      laneCount: number;
    };

interface WeekListSheetState {
  day: Date;
  itemKeys: string[];
}

function getVisibleOverlapRange(item: AgendaItem): Omit<TimedLayoutRow, 'lane' | 'laneCount'> | null {
  const presentation = getAgendaItemPresentation(item);
  const pos = calculateEventPosition(presentation.startAt, presentation.endAt, DAY_START_HOUR, false, {
    dayEndHour: DAY_END_HOUR,
    minHeightSlots: 0.5,
  });
  if (!pos.isVisible) return null;

  const start = parseISO(presentation.startAt);
  const startH = getHourFromISO(presentation.startAt);

  let endH = startH + 1;
  if (presentation.endAt) {
    const end = parseISO(presentation.endAt);
    if (isSameDay(start, end)) {
      endH = getHourFromISO(presentation.endAt);
    } else if (end.getTime() > start.getTime()) {
      endH = DAY_END_HOUR;
    }
  }

  const overlapStart = Math.max(startH, DAY_START_HOUR);
  const overlapEnd = Math.min(endH, DAY_END_HOUR);
  if (overlapEnd <= overlapStart) return null;

  return { item, pos, overlapStart, overlapEnd };
}

function assignClusterLanes(cluster: Omit<TimedLayoutRow, 'lane' | 'laneCount'>[]): TimedLayoutRow[] {
  const laneEnds: number[] = [];
  let maxLaneCount = 0;

  return cluster.map((entry) => {
    const lane = laneEnds.findIndex((end) => end <= entry.overlapStart + 1e-6);
    if (lane === -1) {
      laneEnds.push(entry.overlapEnd);
      maxLaneCount = Math.max(maxLaneCount, laneEnds.length);
      return {
        ...entry,
        lane: laneEnds.length - 1,
        laneCount: 0,
      };
    }

    laneEnds[lane] = entry.overlapEnd;
    return {
      ...entry,
      lane,
      laneCount: 0,
    };
  }).map((entry) => ({
    ...entry,
    laneCount: Math.max(1, maxLaneCount),
  }));
}

function collapseTimedCluster(
  cluster: Omit<TimedLayoutRow, 'lane' | 'laneCount'>[],
  dayKey: string,
): WeekTimedRenderItem[] {
  const assigned = assignClusterLanes(cluster);
  const first = assigned[0];
  const sameSlot =
    first != null &&
    assigned.every(
      (entry) =>
        Math.abs(entry.overlapStart - first.overlapStart) < 1e-6 &&
        Math.abs(entry.overlapEnd - first.overlapEnd) < 1e-6,
    );

  if (!sameSlot || assigned.length <= MAX_VISIBLE_WEEK_TIMED_CLUSTER) {
    return assigned.map((row) => ({ kind: 'event', row }));
  }

  const laneCount = MAX_VISIBLE_WEEK_TIMED_CLUSTER + 1;
  const visibleRows = assigned
    .slice(0, MAX_VISIBLE_WEEK_TIMED_CLUSTER)
    .map((row, lane) => ({ ...row, lane, laneCount }));
  const hiddenRows = assigned.slice(MAX_VISIBLE_WEEK_TIMED_CLUSTER);
  const timeLabel = format(parseISO(getAgendaItemPresentation(first.item).startAt), 'HH:mm');

  return [
    ...visibleRows.map((row) => ({ kind: 'event', row }) as WeekTimedRenderItem),
    {
      kind: 'overflow',
      dayKey,
      timeLabel,
      items: assigned.map((row) => row.item),
      hiddenItems: hiddenRows.map((row) => row.item),
      pos: first.pos,
      lane: MAX_VISIBLE_WEEK_TIMED_CLUSTER,
      laneCount,
    },
  ];
}

function buildTimedLayouts(dayItems: AgendaItem[], dayKey: string): WeekTimedRenderItem[] {
  const timed = dayItems.filter((i) => !getAgendaItemPresentation(i).allDay);
  const rows = timed
    .map((item) => getVisibleOverlapRange(item))
    .filter((row): row is Omit<TimedLayoutRow, 'lane' | 'laneCount'> => row !== null);

  const sorted = rows.sort((a, b) =>
    a.overlapStart === b.overlapStart ? a.overlapEnd - b.overlapEnd : a.overlapStart - b.overlapStart,
  );
  const laidOut: WeekTimedRenderItem[] = [];
  let cluster: Omit<TimedLayoutRow, 'lane' | 'laneCount'>[] = [];
  let clusterEnd = -Infinity;

  for (const entry of sorted) {
    if (cluster.length === 0 || entry.overlapStart < clusterEnd - 1e-6) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.overlapEnd);
      continue;
    }

    laidOut.push(...collapseTimedCluster(cluster, dayKey));
    cluster = [entry];
    clusterEnd = entry.overlapEnd;
  }

  if (cluster.length > 0) {
    laidOut.push(...collapseTimedCluster(cluster, dayKey));
  }

  return laidOut;
}

export function WeekView({ anchor, items, isLoading, onItemClick, onEmptySlotClick }: WeekViewProps) {
  const [listSheetState, setListSheetState] = useState<WeekListSheetState | null>(null);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const hasAnyAllDay = useMemo(
    () => weekDays.some((d) => getItemsForDay(items, d).some((item) => getAgendaItemPresentation(item).allDay)),
    [items, weekDays],
  );

  const layoutsByDayKey = useMemo(() => {
    const map = new Map<string, WeekTimedRenderItem[]>();
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const dayItems = getItemsForDay(items, day);
      map.set(key, buildTimedLayouts(dayItems, key));
    }
    return map;
  }, [items, weekDays]);

  const sheetItems = useMemo(() => {
    if (!listSheetState) return [];
    const dayItems = getItemsForDay(items, listSheetState.day);
    const itemMap = new Map(dayItems.map((item) => [item.dedup_key, item]));
    return listSheetState.itemKeys
      .map((itemKey) => itemMap.get(itemKey))
      .filter((item): item is AgendaItem => Boolean(item));
  }, [listSheetState, items]);

  return (
    <TooltipProvider delayDuration={200}>
      <>
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border/50 bg-surface-elevated/50">
        <div />
        {weekDays.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="px-1 py-3 text-center">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span
                className={cn(
                  'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  today && 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.4)]',
                  !today && 'text-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {hasAnyAllDay && (
        <div
          className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b-2 border-border/50 bg-surface-elevated/30"
          data-testid="week-all-day-section"
        >
          <div className="flex items-start justify-end border-r border-border/30 pr-2 pt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-wider text-muted-foreground">
            Dia
            <br />
            inteiro
          </div>
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayItems = getItemsForDay(items, day).filter((item) => getAgendaItemPresentation(item).allDay);
            const visibleItems = dayItems.slice(0, MAX_VISIBLE_WEEK_ALL_DAY);
            const hiddenItems = dayItems.slice(MAX_VISIBLE_WEEK_ALL_DAY);
            return (
              <div
                key={key}
                className="min-h-[2.25rem] border-l border-border/25 px-1 py-1.5"
                data-week-all-day-cell={key}
              >
                {isLoading ? (
                  <div className="h-6 w-full animate-pulse rounded-md bg-muted/35" />
                ) : (
                  <>
                    {dayItems.length > 0 ? (
                      <button
                        type="button"
                        data-testid={`week-all-day-count-${key}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setListSheetState({ day, itemKeys: dayItems.map((item) => item.dedup_key) });
                        }}
                        className="mb-1 block text-left text-[0.58rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/80 underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                      </button>
                    ) : null}
                    <div className="space-y-1">
                      {visibleItems.map((item) => (
                        <WeekAllDayChip key={item.dedup_key} item={item} onClick={onItemClick} />
                      ))}
                      {hiddenItems.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              data-testid={`week-overflow-more-${key}`}
                              className="w-full text-left text-[0.62rem] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              +{hiddenItems.length} mais
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-h-64 max-w-[min(18rem,calc(100vw-2rem))] overflow-y-auto border-border/60 bg-popover p-2 text-popover-foreground"
                          >
                            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                              Também neste dia
                            </p>
                            <ul className="space-y-1 text-xs">
                              {hiddenItems.map((item) => (
                                <li key={item.dedup_key} className="truncate border-b border-border/30 pb-1 last:border-0 last:pb-0">
                                  <span className="font-medium text-foreground">{item.title}</span>
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex max-h-[70vh] overflow-y-auto">
        <div
          className="w-14 shrink-0 border-r border-border/30 bg-surface-elevated/20"
          style={{ minHeight: `${TOTAL_TIMELINE_REM}rem` }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex items-start justify-end pr-2 pt-0.5 text-[0.65rem] font-medium tabular-nums text-muted-foreground"
              style={{ minHeight: `${ROW_HEIGHT_REM}rem` }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="relative grid grid-cols-7"
            style={{ minHeight: `${TOTAL_TIMELINE_REM}rem` }}
          >
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const layouts = layoutsByDayKey.get(key) ?? [];
              return (
                <div
                  key={key}
                  data-week-timed-column={key}
                  className="relative border-l border-border/25"
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-t border-border/15"
                      style={{ minHeight: `${ROW_HEIGHT_REM}rem` }}
                    >
                      {onEmptySlotClick ? (
                        <button
                          type="button"
                          aria-label={`Criar em ${format(day, 'dd/MM')} às ${String(hour).padStart(2, '0')}:00`}
                          data-week-empty-slot={key}
                          data-hour={String(hour)}
                          className="absolute inset-0 z-0 bg-transparent hover:bg-primary/[0.06]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEmptySlotClick(day, hour);
                          }}
                        />
                      ) : null}
                    </div>
                  ))}

                  {!isLoading &&
                    layouts.map((entry) =>
                      entry.kind === 'event' ? (
                        <WeekTimedEventBlock
                          key={entry.row.item.dedup_key}
                          item={entry.row.item}
                          pos={entry.row.pos}
                          lane={entry.row.lane}
                          laneCount={entry.row.laneCount}
                          onClick={onItemClick}
                        />
                      ) : (
                        <WeekTimedOverflowBlock
                          key={`${entry.dayKey}-${entry.timeLabel}-overflow`}
                          day={day}
                          dayKey={entry.dayKey}
                          timeLabel={entry.timeLabel}
                          hiddenItems={entry.hiddenItems}
                          allItems={entry.items}
                          pos={entry.pos}
                          lane={entry.lane}
                          laneCount={entry.laneCount}
                          onOpenSheet={(itemKeys) => setListSheetState({ day, itemKeys })}
                        />
                      ),
                    )}

                  {isLoading && (
                    <div className="pointer-events-none absolute inset-x-1 top-8 space-y-2">
                      <div className="h-8 animate-pulse rounded-lg bg-muted/30" />
                      <div className="h-12 animate-pulse rounded-lg bg-muted/25" />
                    </div>
                  )}
                </div>
              );
            })}

            <NowIndicator weekDays={weekDays} />
          </div>
        </div>
      </div>
    </div>
    <Sheet open={listSheetState !== null} onOpenChange={(open) => !open && setListSheetState(null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-border/60 bg-surface sm:max-w-md"
      >
        {listSheetState ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-foreground">
                {format(listSheetState.day, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {sheetItems.length} {sheetItems.length === 1 ? 'compromisso' : 'compromissos'}
              </SheetDescription>
            </SheetHeader>
            <div
              className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
              data-testid="week-day-list-sheet-body"
            >
              {sheetItems.map((item) => (
                <WeekSheetEventCard
                  key={item.dedup_key}
                  item={item}
                  onClick={(i) => {
                    onItemClick(i);
                    setListSheetState(null);
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

function WeekAllDayChip({ item, onClick }: { item: AgendaItem; onClick: (i: AgendaItem) => void }) {
  const chrome = getAgendaSemanticChrome(item.badge);
  const isDerived = item.agenda_item_type === 'derived_projection';

  return (
    <AgendaHoverTooltip item={item}>
      <button
        type="button"
        onClick={() => onClick(item)}
        data-agenda-chrome="semantic-border-left"
        data-agenda-accent="left"
        className={cn(
          'group flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left text-[0.65rem] font-medium leading-tight text-foreground transition-all',
          isDerived && 'opacity-90',
          !isDerived && 'shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
          'hover:brightness-[0.98]',
        )}
        style={{
          backgroundColor: chrome.backgroundColor,
          borderColor: chrome.borderColor,
          borderLeftColor: chrome.accentColor,
        }}
      >
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
      </button>
    </AgendaHoverTooltip>
  );
}

function WeekSheetEventCard({ item, onClick }: { item: AgendaItem; onClick: (i: AgendaItem) => void }) {
  const chrome = getAgendaSemanticChrome(item.badge);
  const presentation = getAgendaItemPresentation(item);
  const timeLabel = presentation.allDay ? null : format(parseISO(presentation.startAt), 'HH:mm');

  return (
    <AgendaHoverTooltip item={item}>
      <button
        type="button"
        data-testid={`week-sheet-item-${item.dedup_key}`}
        onClick={() => onClick(item)}
        className="group relative w-full shrink-0 overflow-hidden rounded-xl border border-border/40 px-4 py-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:translate-y-[-1px]"
        style={{
          backgroundColor: chrome.backgroundColor,
          borderColor: chrome.borderColor,
        }}
      >
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
          style={{ backgroundColor: chrome.accentColor }}
        />
        <div className="flex items-start justify-between gap-3 pl-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.title}</span>
          {timeLabel ? (
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{timeLabel}</span>
          ) : null}
        </div>
      </button>
    </AgendaHoverTooltip>
  );
}

function WeekTimedOverflowBlock({
  day,
  dayKey,
  timeLabel,
  hiddenItems,
  allItems,
  pos,
  lane,
  laneCount,
  onOpenSheet,
}: {
  day: Date;
  dayKey: string;
  timeLabel: string;
  hiddenItems: AgendaItem[];
  allItems: AgendaItem[];
  pos: EventPosition;
  lane: number;
  laneCount: number;
  onOpenSheet: (itemKeys: string[]) => void;
}) {
  const gapPx = 3;
  const widthPct = 100 / laneCount;
  const leftPct = (lane / laneCount) * 100;
  const itemKeys = allItems.map((item) => item.dedup_key);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid={`week-timed-overflow-more-${dayKey}-${timeLabel}`}
          aria-label={`${hiddenItems.length} itens ocultos às ${timeLabel} em ${format(day, 'dd/MM')}`}
          className="absolute z-[1] min-h-[1.75rem] overflow-hidden rounded-md border border-dashed border-border/60 bg-surface-elevated px-1 py-1 text-left text-[0.62rem] font-medium leading-tight text-primary shadow-sm transition-all hover:z-[2] hover:bg-surface hover:shadow-md"
          style={{
            top: `${pos.topSlots * ROW_HEIGHT_REM}rem`,
            height: `${pos.heightSlots * ROW_HEIGHT_REM}rem`,
            left: `calc(${leftPct}% + ${gapPx}px)`,
            width: `calc(${widthPct}% - ${gapPx * 2}px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenSheet(itemKeys);
          }}
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
          Também neste horário
        </p>
        <ul className="space-y-1 text-xs">
          {hiddenItems.map((item) => (
            <li key={item.dedup_key} className="truncate border-b border-border/30 pb-1 last:border-0 last:pb-0">
              <span className="font-medium text-foreground">{item.title}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function WeekTimedEventBlock({
  item,
  pos,
  lane,
  laneCount,
  onClick,
}: {
  item: AgendaItem;
  pos: EventPosition;
  lane: number;
  laneCount: number;
  onClick: (i: AgendaItem) => void;
}) {
  const chrome = getAgendaSemanticChrome(item.badge);
  const isDerived = item.agenda_item_type === 'derived_projection';
  const presentation = getAgendaItemPresentation(item);
  const time = format(parseISO(presentation.startAt), 'HH:mm');
  const gapPx = 3;
  const widthPct = 100 / laneCount;
  const leftPct = (lane / laneCount) * 100;

  const label = `${time} ${item.title}`;

  return (
    <AgendaHoverTooltip item={item}>
      <button
        type="button"
        onClick={() => onClick(item)}
        aria-label={label}
        data-week-lane={lane}
        data-week-lane-count={laneCount}
        data-agenda-chrome="semantic-border-left"
        data-agenda-accent="left"
        className={cn(
          'absolute z-[1] flex min-h-[1.75rem] flex-col overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[0.62rem] font-medium leading-tight text-foreground shadow-sm transition-all',
          isDerived && 'opacity-90',
          'hover:z-[2] hover:brightness-[0.98] hover:shadow-md',
        )}
        style={{
          top: `${pos.topSlots * ROW_HEIGHT_REM}rem`,
          height: `${pos.heightSlots * ROW_HEIGHT_REM}rem`,
          left: `calc(${leftPct}% + ${gapPx}px)`,
          width: `calc(${widthPct}% - ${gapPx * 2}px)`,
          backgroundColor: chrome.backgroundColor,
          borderColor: chrome.borderColor,
          borderLeftColor: chrome.accentColor,
        }}
      >
        <span className="line-clamp-2 min-h-0 break-words font-semibold text-foreground">{item.title}</span>
        <span className="mt-auto shrink-0 tabular-nums text-[0.56rem] text-muted-foreground">
          {time}
        </span>
      </button>
    </AgendaHoverTooltip>
  );
}

function NowIndicator({ weekDays }: { weekDays: Date[] }) {
  const now = new Date();
  const todayIdx = weekDays.findIndex((d) => isToday(d));
  if (todayIdx === -1) return null;

  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < DAY_START_HOUR || hour >= DAY_END_HOUR) return null;

  const topRem = (hour - DAY_START_HOUR) * ROW_HEIGHT_REM;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10"
      style={{ left: `${(todayIdx / 7) * 100}%`, width: `${100 / 7}%` }}
    >
      <div className="absolute left-0 right-0 flex items-center" style={{ top: `${topRem}rem` }}>
        <div className="h-2.5 w-2.5 shrink-0 -translate-x-1/2 rounded-full bg-danger shadow-[0_0_8px_rgba(var(--danger),0.5)]" />
        <div className="h-px min-w-0 flex-1 bg-danger/60" />
      </div>
    </div>
  );
}
