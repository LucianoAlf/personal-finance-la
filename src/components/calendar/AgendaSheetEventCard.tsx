import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { CheckCircle2, Clock, Flag, Globe, Lock } from 'lucide-react';
import type { AgendaItem } from '@/types/calendar.types';
import {
  getAgendaItemPresentation,
  getBadgeStyle,
  getItemIndicator,
  isFinancialAgendaItem,
} from './calendar-utils';
import { AgendaHoverTooltip } from './AgendaHoverTooltip';

function agendaSheetStatusLabel(status: string): string | null {
  if (status === 'completed') return 'Concluído';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'pending' || status === 'scheduled' || status === 'confirmed') return 'Pendente';
  if (status === 'overdue') return 'Atrasado';
  if (status === 'partial') return 'Parcial';
  return null;
}

function agendaSheetPriorityLabel(priority: string | null | undefined): string | null {
  if (!priority) return null;
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Média';
  if (priority === 'low') return 'Baixa';
  return priority;
}

function agendaSheetSyncLabel(provider: string | null | undefined, status: string | null | undefined): string | null {
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

export function AgendaSheetEventCard({
  item,
  onClick,
  testIdPrefix,
}: {
  item: AgendaItem;
  onClick: (item: AgendaItem) => void;
  testIdPrefix: string;
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
  const statusLine = agendaSheetStatusLabel(item.status);
  const tags = getAgendaTickTickTags(item.metadata);
  const priorityLabel = agendaSheetPriorityLabel(metadata?.priority as string | undefined);
  const syncLabel = agendaSheetSyncLabel(
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
        data-testid={`${testIdPrefix}-item-${item.dedup_key}`}
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.95rem] font-semibold leading-snug text-foreground">{item.title}</p>
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
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

          {detailText && (
            <p
              className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
              data-testid={`${testIdPrefix}-description-${item.dedup_key}`}
            >
              {detailText}
            </p>
          )}

          <div
            className="flex flex-wrap items-center gap-1.5"
            data-testid={`${testIdPrefix}-chips-${item.dedup_key}`}
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

          <div
            className="flex flex-col gap-1.5 border-t border-border/20 pt-2.5"
            data-testid={`${testIdPrefix}-meta-${item.dedup_key}`}
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

          {tags.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-1.5 border-t border-border/20 pt-2.5"
              data-testid={`${testIdPrefix}-details-${item.dedup_key}`}
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
