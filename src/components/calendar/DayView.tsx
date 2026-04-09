import { useMemo } from 'react';
import { format, parseISO, isSameDay, isToday as isDateToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import {
  getAgendaItemPresentation,
  getItemsForDay,
  getHourFromISO,
  getBadgeStyle,
  getItemIndicator,
} from './calendar-utils';
import { Clock, MapPin, Lock, Pencil, CheckCircle2, ArrowUpRight } from 'lucide-react';
import type { AgendaItem } from '@/types/calendar.types';

interface DayViewProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading: boolean;
  onItemClick: (item: AgendaItem) => void;
  /** Hour is the row start hour (e.g. 14 → 14:00); creation UIs should treat as hour-level precision only. */
  onEmptySlotClick?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const ROW_H = 4.5; // rem
/** When the day has no items, the primary CTA uses this hour for time prefill (same grid as first business-ish default). */
const EMPTY_DAY_DEFAULT_CREATE_HOUR = 9;

function doesTimedItemOccupyHour(item: AgendaItem, hour: number): boolean {
  const presentation = getAgendaItemPresentation(item);
  const start = parseISO(presentation.startAt);
  const startHour = getHourFromISO(presentation.startAt);

  let endHour = startHour + 1;
  if (presentation.endAt) {
    const end = parseISO(presentation.endAt);
    if (isSameDay(start, end)) {
      endHour = getHourFromISO(presentation.endAt);
    } else if (end.getTime() > start.getTime()) {
      endHour = 24;
    }
  }

  return startHour < hour + 1 && endHour > hour;
}

export function DayView({ anchor, items, isLoading, onItemClick, onEmptySlotClick }: DayViewProps) {
  const dayItems = useMemo(() => getItemsForDay(items, anchor), [items, anchor]);
  const allDayItems = useMemo(
    () => dayItems.filter((item) => getAgendaItemPresentation(item).allDay),
    [dayItems],
  );
  const timedItems = useMemo(() => dayItems.filter((i) => !allDayItems.includes(i)), [dayItems, allDayItems]);

  const isToday = isDateToday(anchor);
  const dayKey = format(anchor, 'yyyy-MM-dd');

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      {/* Day header */}
      <div className="flex items-center gap-3 border-b border-border/50 bg-surface-elevated/50 px-5 py-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold',
            isToday
              ? 'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(var(--primary),0.4)]'
              : 'bg-surface-elevated text-foreground',
          )}
        >
          {format(anchor, 'd')}
        </div>
        <div>
          <p className="text-lg font-semibold capitalize text-foreground">
            {format(anchor, 'EEEE', { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(anchor, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {dayItems.length === 0
            ? 'Sem compromissos'
            : `${dayItems.length} compromisso${dayItems.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* All-day section */}
      {allDayItems.length > 0 && (
        <div className="border-b border-border/40 px-5 py-3">
          <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Dia Inteiro
          </span>
          <div className="flex flex-wrap gap-2">
            {allDayItems.map((item) => (
              <DayEventCard key={item.dedup_key} item={item} onClick={onItemClick} compact />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative max-h-[72vh] overflow-y-auto">
        {isToday && <DayNowLine />}

        {isLoading ? (
          <div className="space-y-6 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-12 animate-pulse rounded bg-muted/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-14 animate-pulse rounded-xl bg-muted/30" />
                </div>
              </div>
            ))}
          </div>
        ) : dayItems.length === 0 ? (
          <EmptyDay
            dayKey={dayKey}
            onCreate={onEmptySlotClick ? () => onEmptySlotClick(anchor, EMPTY_DAY_DEFAULT_CREATE_HOUR) : undefined}
          />
        ) : (
          HOURS.map((hour) => {
            const hourItems = timedItems.filter((item) => doesTimedItemOccupyHour(item, hour));
            const hourIsOccupied = timedItems.some((item) => doesTimedItemOccupyHour(item, hour));

            return (
              <div
                key={hour}
                data-day-hour-row={String(hour)}
                className="grid grid-cols-[4rem_1fr] border-b border-border/15"
                style={{ minHeight: `${ROW_H}rem` }}
              >
                <div className="flex items-start justify-end pr-3 pt-1 text-xs font-medium tabular-nums text-muted-foreground">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="relative space-y-1.5 border-l border-border/20 px-3 py-1.5">
                  {onEmptySlotClick && !hourIsOccupied ? (
                    <button
                      type="button"
                      aria-label={`Criar em ${format(anchor, 'dd/MM')} às ${String(hour).padStart(2, '0')}:00`}
                      data-day-empty-slot={dayKey}
                      data-hour={String(hour)}
                      className="absolute inset-0 z-0 bg-transparent hover:bg-primary/[0.06]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmptySlotClick(anchor, hour);
                      }}
                    />
                  ) : null}
                  {hourItems.map((item) => {
                    const startsThisHour =
                      Math.floor(getHourFromISO(getAgendaItemPresentation(item).startAt)) === hour;
                    return (
                      <DayEventCard
                        key={`${item.dedup_key}-${hour}`}
                        item={item}
                        onClick={onItemClick}
                        continuation={!startsThisHour}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DayEventCard({
  item,
  onClick,
  compact = false,
  continuation = false,
}: {
  item: AgendaItem;
  onClick: (i: AgendaItem) => void;
  compact?: boolean;
  continuation?: boolean;
}) {
  const badge = getBadgeStyle(item.badge);
  const indicator = getItemIndicator(item.agenda_item_type);
  const isDerived = item.agenda_item_type === 'derived_projection';
  const presentation = getAgendaItemPresentation(item);
  const time = format(parseISO(presentation.startAt), 'HH:mm');
  const endTime = presentation.endAt ? format(parseISO(presentation.endAt), 'HH:mm') : null;
  const location = (item.metadata as Record<string, unknown> | null)?.location_text as string | undefined;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      aria-label={continuation ? `Continuação ${item.title}` : undefined}
      className={cn(
        'group relative z-[1] w-full text-left transition-all duration-200',
        continuation &&
          'rounded-lg border border-border/40 bg-surface-elevated/40 px-3 py-2 text-sm shadow-none',
        compact
          ? cn(
              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
              badge.bg,
              badge.text,
            )
          : cn(
              'relative overflow-hidden rounded-xl border p-3.5',
              isDerived
                ? 'border-border/50 bg-surface-elevated/40'
                : cn('border-border/40 bg-surface-elevated/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)]', indicator.border),
              'hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] hover:translate-y-[-1px]',
            ),
      )}
    >
      {!compact && (
        <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', isDerived ? 'bg-muted-foreground/30' : indicator.dot.replace('bg-', 'bg-'))} />
      )}

      <div className={cn(compact ? 'flex items-center gap-1.5' : 'pl-2.5')}>
        {continuation && (
          <div className="mb-1 flex items-center gap-2 pl-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Continua</span>
            {endTime ? <span className="tabular-nums">até {endTime}</span> : null}
          </div>
        )}
        {!compact && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold', badge.bg, badge.text)}>
              {badge.label}
            </span>
            {isDerived && (
              <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" /> Somente leitura
              </span>
            )}
            {item.status === 'completed' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
          </div>
        )}

        <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
          {item.title}
        </p>

        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" />
              {time}
              {endTime && <> — {endTime}</>}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
            {item.subtitle && <span>{item.subtitle}</span>}
          </div>
        )}

        {!compact && !isDerived && (
          <div className="mt-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-[0.6rem] font-medium text-primary">
              <Pencil className="h-2.5 w-2.5" /> Editar
            </span>
          </div>
        )}

        {!compact && isDerived && item.edit_route && (
          <div className="mt-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-2 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
              <ArrowUpRight className="h-2.5 w-2.5" /> Ver origem
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function DayNowLine() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < 6 || hour > 23) return null;
  const topRem = (hour - 6) * ROW_H;

  return (
    <div className="pointer-events-none absolute right-0 z-10" style={{ top: `${topRem}rem`, left: '4rem' }}>
      <div className="flex items-center">
        <div className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-danger shadow-[0_0_10px_rgba(var(--danger),0.5)]" />
        <div className="h-px flex-1 bg-danger/50" />
      </div>
    </div>
  );
}

function EmptyDay({ dayKey, onCreate }: { dayKey: string; onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated ring-1 ring-border/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <Clock className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-base font-semibold text-foreground">Dia livre</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Nenhum compromisso ou projeção para este dia. Crie um evento ou aproveite o espaço.
      </p>
      {onCreate ? (
        <button
          type="button"
          data-day-empty-create={dayKey}
          onClick={onCreate}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_14px_rgba(var(--primary),0.35)] transition hover:shadow-[0_6px_20px_rgba(var(--primary),0.45)]"
        >
          Criar evento
        </button>
      ) : null}
    </div>
  );
}
