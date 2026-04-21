import { differenceInMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface DayViewMobileProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading?: boolean;
  onItemClick: (item: AgendaItem) => void;
  onEmptySlotClick?: (date: Date, hour: number) => void;
}

const CATEGORY_EV_BG: Record<string, string> = {
  personal: 'bg-blue-500/15 text-blue-200 border-l-blue-500',
  work: 'bg-purple-500/15 text-purple-200 border-l-purple-500',
  mentoring: 'bg-amber-500/15 text-amber-200 border-l-amber-500',
  financial: 'bg-red-500/15 text-red-200 border-l-red-500',
  external: 'bg-slate-500/15 text-slate-200 border-l-slate-500',
};

const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function isAllDay(item: AgendaItem): boolean {
  if (!item.display_end_at) return false;
  const start = parseISO(item.display_start_at);
  const end = parseISO(item.display_end_at);
  const minutes = differenceInMinutes(end, start);
  return minutes >= 23 * 60; // 23h+ considered all-day
}

export function DayViewMobile({
  anchor,
  items,
  onItemClick,
  onEmptySlotClick,
}: DayViewMobileProps) {
  const dayStart = startOfDay(anchor);
  const nowRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const showNowLine = isSameDay(anchor, today);
  const nowMinutesFromStart = showNowLine
    ? (today.getHours() - START_HOUR) * 60 + today.getMinutes()
    : -1;

  useEffect(() => {
    if (nowRef.current && typeof nowRef.current.scrollIntoView === 'function') {
      nowRef.current.scrollIntoView({ block: 'center' });
    }
  }, []);

  const dayItems = items.filter((item) => isSameDay(parseISO(item.display_start_at), anchor));
  const allDayItems = dayItems.filter(isAllDay);
  const timedItems = dayItems.filter((item) => !isAllDay(item));

  return (
    <div className="lg:hidden">
      <div
        data-testid="all-day-band"
        className={cn(
          'border-b border-border/60 px-4 py-2',
          allDayItems.length === 0 && 'hidden',
        )}
      >
        {allDayItems.map((item) => (
          <button
            key={item.dedup_key}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-200"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{item.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">Todo o dia</span>
          </button>
        ))}
      </div>

      <div className="relative">
        {HOURS.map((hour) => (
          <button
            key={hour}
            type="button"
            data-testid="hour-slot"
            onClick={() => {
              if (onEmptySlotClick) {
                const slot = new Date(dayStart);
                slot.setHours(hour, 0, 0, 0);
                onEmptySlotClick(slot, hour);
              }
            }}
            className="flex w-full items-start gap-3 border-t border-border/40 px-4 py-1 text-left"
            style={{ minHeight: '60px' }}
          >
            <span className="w-10 flex-shrink-0 pt-1 text-right text-[11px] text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </span>
            <span className="flex-1" />
          </button>
        ))}

        <div className="pointer-events-none absolute inset-0">
          {timedItems.map((item) => {
            const start = parseISO(item.display_start_at);
            const end = item.display_end_at ? parseISO(item.display_end_at) : start;
            const minutesFromStart = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
            const durationMin = Math.max(30, differenceInMinutes(end, start));
            if (minutesFromStart < 0) return null;
            const top = minutesFromStart; // 1px per minute — 60px/hour
            const height = durationMin;
            const category = getAgendaItemFilterCategory(item);
            const cls = CATEGORY_EV_BG[category] ?? 'bg-slate-500/15 text-slate-200 border-l-slate-500';
            return (
              <button
                key={item.dedup_key}
                type="button"
                onClick={() => onItemClick(item)}
                className={cn(
                  'pointer-events-auto absolute left-14 right-4 overflow-hidden rounded-md border-l-2 px-2 py-1 text-left text-xs',
                  cls,
                )}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="truncate text-[10px] opacity-75">
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                </div>
              </button>
            );
          })}

          {showNowLine && nowMinutesFromStart >= 0 ? (
            <div
              ref={nowRef}
              data-testid="current-time-line"
              className="pointer-events-none absolute left-0 right-0 flex items-center gap-2"
              style={{ top: `${nowMinutesFromStart}px` }}
            >
              <span className="ml-12 h-2 w-2 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
