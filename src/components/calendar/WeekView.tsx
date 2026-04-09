import { useMemo } from 'react';
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

interface TimedLayoutRow {
  item: AgendaItem;
  pos: EventPosition;
  overlapStart: number;
  overlapEnd: number;
  lane: number;
  laneCount: number;
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

function buildTimedLayouts(dayItems: AgendaItem[]): TimedLayoutRow[] {
  const timed = dayItems.filter((i) => !getAgendaItemPresentation(i).allDay);
  const rows = timed
    .map((item) => getVisibleOverlapRange(item))
    .filter((row): row is Omit<TimedLayoutRow, 'lane' | 'laneCount'> => row !== null);

  const sorted = rows.sort((a, b) =>
    a.overlapStart === b.overlapStart ? a.overlapEnd - b.overlapEnd : a.overlapStart - b.overlapStart,
  );
  const laidOut: TimedLayoutRow[] = [];
  let cluster: Omit<TimedLayoutRow, 'lane' | 'laneCount'>[] = [];
  let clusterEnd = -Infinity;

  for (const entry of sorted) {
    if (cluster.length === 0 || entry.overlapStart < clusterEnd - 1e-6) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.overlapEnd);
      continue;
    }

    laidOut.push(...assignClusterLanes(cluster));
    cluster = [entry];
    clusterEnd = entry.overlapEnd;
  }

  if (cluster.length > 0) {
    laidOut.push(...assignClusterLanes(cluster));
  }

  return laidOut;
}

export function WeekView({ anchor, items, isLoading, onItemClick, onEmptySlotClick }: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const hasAnyAllDay = useMemo(
    () => weekDays.some((d) => getItemsForDay(items, d).some((item) => getAgendaItemPresentation(item).allDay)),
    [items, weekDays],
  );

  const layoutsByDayKey = useMemo(() => {
    const map = new Map<string, TimedLayoutRow[]>();
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const dayItems = getItemsForDay(items, day);
      map.set(key, buildTimedLayouts(dayItems));
    }
    return map;
  }, [items, weekDays]);

  return (
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
            return (
              <div
                key={key}
                className="min-h-[2.25rem] space-y-1 border-l border-border/25 px-1 py-1.5"
                data-week-all-day-cell={key}
              >
                {isLoading ? (
                  <div className="h-6 w-full animate-pulse rounded-md bg-muted/35" />
                ) : (
                  dayItems.map((item) => (
                    <WeekAllDayChip key={item.dedup_key} item={item} onClick={onItemClick} />
                  ))
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
                    layouts.map(({ item, pos, lane, laneCount }) => (
                      <WeekTimedEventBlock
                        key={item.dedup_key}
                        item={item}
                        pos={pos}
                        lane={lane}
                        laneCount={laneCount}
                        onClick={onItemClick}
                      />
                    ))}

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
  );
}

function WeekAllDayChip({ item, onClick }: { item: AgendaItem; onClick: (i: AgendaItem) => void }) {
  const chrome = getAgendaSemanticChrome(item.badge);
  const isDerived = item.agenda_item_type === 'derived_projection';

  return (
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
