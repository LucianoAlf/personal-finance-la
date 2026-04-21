import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface MonthGridMobileProps {
  anchor: Date;
  items: AgendaItem[];
  focusedDay: Date;
  onDayFocus: (day: Date) => void;
  onMonthChange: (newAnchor: Date) => void;
  isLoading?: boolean;
}

const CATEGORY_DOT: Record<string, string> = {
  personal: 'bg-blue-500',
  work: 'bg-purple-500',
  mentoring: 'bg-amber-500',
  financial: 'bg-red-500',
  external: 'bg-slate-500',
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthGridMobile({
  anchor,
  items,
  focusedDay,
  onDayFocus,
  onMonthChange,
}: MonthGridMobileProps) {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  let allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  // Pad to exactly 42 days (6 weeks × 7 days)
  while (allDays.length < 42) {
    const lastDay = allDays[allDays.length - 1];
    const nextDay = new Date(lastDay);
    nextDay.setDate(nextDay.getDate() + 1);
    allDays.push(nextDay);
  }
  const days = allDays.slice(0, 42);
  const today = new Date();

  const dotsByDayKey = new Map<string, string[]>();
  for (const item of items) {
    const key = format(parseISO(item.display_start_at), 'yyyy-MM-dd');
    const arr = dotsByDayKey.get(key) ?? [];
    const cls = CATEGORY_DOT[getAgendaItemFilterCategory(item)] ?? 'bg-slate-500';
    if (!arr.includes(cls) && arr.length < 3) arr.push(cls);
    dotsByDayKey.set(key, arr);
  }

  const handleClick = (day: Date) => {
    if (!isSameMonth(day, anchor)) onMonthChange(day);
    onDayFocus(day);
  };

  return (
    <div className="lg:hidden" role="grid" aria-label="Calendário mensal">
      <div className="grid grid-cols-7 border-b border-border/60 px-1">
        {WEEKDAYS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="py-1 text-center text-[10px] font-semibold uppercase text-muted-foreground"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dots = dotsByDayKey.get(key) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, today);
          const isFocused = isSameDay(day, focusedDay);
          const ariaLabel = format(day, "d 'de' MMMM", { locale: ptBR });
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={ariaLabel}
              aria-current={isFocused ? 'date' : undefined}
              onClick={() => handleClick(day)}
              className={cn(
                'flex min-h-[48px] flex-col items-center gap-1 border-b border-border/40 py-1 transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                isFocused && 'bg-primary/10',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-primary text-primary-foreground font-semibold',
                  isFocused && !isToday && 'ring-2 ring-primary/60',
                )}
              >
                {format(day, 'd')}
              </span>
              {dots.length > 0 ? (
                <span className="flex gap-0.5">
                  {dots.map((cls, i) => (
                    <span
                      key={i}
                      data-testid="day-dot"
                      className={cn('h-1 w-1 rounded-full', cls)}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
