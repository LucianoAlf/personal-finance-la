import { format, isSameDay, parseISO } from 'date-fns';
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

const CATEGORY_DOT: Record<string, string> = {
  personal: 'bg-blue-500',
  work: 'bg-purple-500',
  mentoring: 'bg-amber-500',
  financial: 'bg-red-500',
  external: 'bg-gray-500',
};

const CATEGORY_BADGE: Record<string, string> = {
  personal: 'bg-blue-500/15 text-blue-400',
  work: 'bg-purple-500/15 text-purple-400',
  mentoring: 'bg-amber-500/15 text-amber-400',
  financial: 'bg-red-500/15 text-red-400',
  external: 'bg-gray-500/15 text-gray-400',
};

const CATEGORY_LABEL: Record<string, string> = {
  personal: 'Pessoal',
  work: 'Trabalho',
  mentoring: 'Mentoria',
  financial: 'Financeiro',
  external: 'Externo',
};

export function AgendaDayList({ items, focusedDay, onItemClick }: AgendaDayListProps) {
  const dayItems = items.filter((item) =>
    isSameDay(parseISO(item.display_start_at), focusedDay),
  );

  const headerLabel = format(focusedDay, "dd MMM", { locale: ptBR });
  const count = dayItems.length;

  return (
    <section className="lg:hidden" aria-label="Compromissos do dia">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
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
        <ul role="list" className="divide-y divide-border/60">
          {dayItems.map((item) => {
            const category = getAgendaItemFilterCategory(item);
            const dotClass = CATEGORY_DOT[category] ?? 'bg-slate-500';
            const badgeClass = CATEGORY_BADGE[category] ?? 'bg-slate-500/15 text-slate-300';
            const badgeLabel = CATEGORY_LABEL[category] ?? 'Outro';
            return (
              <li key={item.dedup_key} role="listitem">
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-elevated"
                >
                  <span className={cn('mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full', dotClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {item.is_read_only ? (
                        <Lock
                          className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                          aria-label="Somente leitura"
                        />
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </div>
                    ) : null}
                    <span
                      className={cn(
                        'mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        badgeClass,
                      )}
                    >
                      {badgeLabel}
                    </span>
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
