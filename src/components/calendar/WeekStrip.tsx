import { eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface WeekStripProps {
  anchor: Date;
  items: AgendaItem[];
  focusedDay: Date;
  onDayFocus: (day: Date) => void;
}

const CATEGORY_DOT: Record<string, string> = {
  personal: 'bg-blue-500',
  work: 'bg-purple-500',
  mentoring: 'bg-amber-500',
  financial: 'bg-red-500',
  external: 'bg-slate-500',
};

const LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function WeekStrip({ anchor, items, focusedDay, onDayFocus }: WeekStripProps) {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  const end = endOfWeek(anchor, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const dotByDay = new Map<string, string>();
  for (const item of items) {
    const key = format(parseISO(item.display_start_at), 'yyyy-MM-dd');
    if (dotByDay.has(key)) continue;
    const cls = CATEGORY_DOT[getAgendaItemFilterCategory(item)] ?? 'bg-slate-500';
    dotByDay.set(key, cls);
  }

  return (
    <div
      role="tablist"
      aria-label="Dias da semana"
      className="grid grid-cols-7 gap-1 border-b border-border/60 px-2 py-2 lg:hidden"
    >
      {days.map((day, i) => {
        const key = format(day, 'yyyy-MM-dd');
        const dot = dotByDay.get(key);
        const isToday = isSameDay(day, today);
        const isFocused = isSameDay(day, focusedDay);
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
            aria-current={isFocused ? 'date' : undefined}
            onClick={() => onDayFocus(day)}
            className="flex flex-col items-center gap-1 rounded-xl py-1 transition-colors"
          >
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              {LABELS[i]}
            </span>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                isToday && 'bg-primary text-primary-foreground',
                !isToday && isFocused && 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/40',
                !isToday && !isFocused && 'text-foreground',
              )}
            >
              {format(day, 'd')}
            </span>
            {dot ? (
              <span
                data-testid="week-dot"
                className={cn('h-1 w-1 rounded-full', dot)}
              />
            ) : (
              <span className="h-1 w-1" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
