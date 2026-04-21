import { differenceInMinutes, format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface AgendaDayListProps {
  items: AgendaItem[];
  focusedDay: Date;
  onItemClick: (item: AgendaItem) => void;
}

const CATEGORY_CARD: Record<string, string> = {
  personal: 'bg-blue-500/10 border-l-blue-500 hover:bg-blue-500/15',
  work: 'bg-purple-500/10 border-l-purple-500 hover:bg-purple-500/15',
  mentoring: 'bg-amber-500/10 border-l-amber-500 hover:bg-amber-500/15',
  financial: 'bg-red-500/10 border-l-red-500 hover:bg-red-500/15',
  external: 'bg-slate-500/10 border-l-slate-500 hover:bg-slate-500/15',
};

const CATEGORY_BADGE: Record<string, string> = {
  personal: 'bg-blue-500/20 text-blue-300',
  work: 'bg-purple-500/20 text-purple-300',
  mentoring: 'bg-amber-500/20 text-amber-300',
  financial: 'bg-red-500/20 text-red-300',
  external: 'bg-slate-500/20 text-slate-300',
};

const CATEGORY_LABEL: Record<string, string> = {
  personal: 'Pessoal',
  work: 'Trabalho',
  mentoring: 'Mentoria',
  financial: 'Financeiro',
  external: 'Externo',
};

function isAllDay(item: AgendaItem): boolean {
  if (!item.display_end_at) return false;
  const minutes = differenceInMinutes(parseISO(item.display_end_at), parseISO(item.display_start_at));
  return minutes >= 23 * 60;
}

function formatTimeRange(item: AgendaItem): string | null {
  if (isAllDay(item)) return 'Todo o dia';
  const start = parseISO(item.display_start_at);
  if (!item.display_end_at) return format(start, 'HH:mm');
  const end = parseISO(item.display_end_at);
  return `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
}

export function AgendaDayList({ items, focusedDay, onItemClick }: AgendaDayListProps) {
  const dayItems = items.filter((item) =>
    isSameDay(parseISO(item.display_start_at), focusedDay),
  );

  const headerLabel = format(focusedDay, "EEE, dd 'de' MMM", { locale: ptBR });
  const count = dayItems.length;

  return (
    <section className="lg:hidden" aria-label="Compromissos do dia">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="text-sm font-semibold capitalize text-foreground">{headerLabel}</h2>
        {count > 0 ? (
          <span className="text-xs text-muted-foreground">
            {count === 1 ? '1 compromisso' : `${count} compromissos`}
          </span>
        ) : null}
      </header>

      {count === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum compromisso neste dia.
        </div>
      ) : (
        <ul role="list" className="space-y-2 px-4 pb-4">
          {dayItems.map((item) => {
            const category = getAgendaItemFilterCategory(item);
            const cardClass = CATEGORY_CARD[category] ?? 'bg-slate-500/10 border-l-slate-500 hover:bg-slate-500/15';
            const badgeClass = CATEGORY_BADGE[category] ?? 'bg-slate-500/20 text-slate-300';
            const badgeLabel = CATEGORY_LABEL[category] ?? 'Outro';
            const timeLabel = formatTimeRange(item);
            return (
              <li key={item.dedup_key} role="listitem">
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border-l-[3px] px-3 py-3 text-left transition-colors',
                    cardClass,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      {item.is_read_only ? (
                        <Lock
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                          aria-label="Somente leitura"
                        />
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {timeLabel ? (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {timeLabel}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          badgeClass,
                        )}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
