import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateEventDialog } from './CreateEventDialog';
import {
  Clock,
  MapPin,
  Lock,
  Trash2,
  CheckCircle2,
  CalendarClock,
  ArrowUpRight,
  XCircle,
  Repeat,
  Globe,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getBadgeStyle, getCategoryStyle, getItemIndicator } from './calendar-utils';
import { setCalendarEventStatusDomain } from '@/lib/calendar-domain';
import { toast } from 'sonner';
import type { AgendaItem } from '@/types/calendar.types';

interface AgendaItemSheetProps {
  item: AgendaItem | null;
  open: boolean;
  onClose: () => void;
  onMutationSuccess: () => void;
}

export function AgendaItemSheet({ item, open, onClose, onMutationSuccess }: AgendaItemSheetProps) {
  if (!item) return null;
  const [editOpen, setEditOpen] = useState(false);

  const metadata = item.metadata as Record<string, unknown> | null;
  const badge = getBadgeStyle(item.badge);
  const indicator = getItemIndicator(item.agenda_item_type);
  const isDerived = item.agenda_item_type === 'derived_projection';
  const startDate = parseISO(item.display_start_at);
  const endDate = item.display_end_at ? parseISO(item.display_end_at) : null;
  const location = metadata?.location_text as string | undefined;
  const amount = metadata?.amount as number | undefined;
  const providerName = metadata?.provider_name as string | undefined;
  const eventKind = (metadata?.event_kind as string | undefined) ?? item.badge;
  const categoryStyle = getCategoryStyle(eventKind);
  const priority = (metadata?.priority as string | undefined) ?? null;
  const isRecurring =
    metadata?.is_recurring === true ||
    typeof metadata?.recurrence_frequency === 'string' ||
    typeof metadata?.series_frequency === 'string';
  const syncProvider = (metadata?.sync_provider as string | undefined) ?? null;
  const syncStatus = (metadata?.sync_status as string | undefined) ?? null;
  const syncLabel = formatSyncLabel(syncProvider, syncStatus);
  const priorityLabel = formatPriorityLabel(priority);
  const tickTickTags = Array.isArray(metadata?.ticktick_tags)
    ? metadata.ticktick_tags.map((value) => String(value).trim()).filter((value) => value.length > 0)
    : [];

  const handleComplete = async () => {
    if (!item.supports_complete || isDerived) return;
    try {
      await setCalendarEventStatusDomain(item.origin_id, 'completed');
      toast.success('Compromisso concluído');
      onMutationSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao concluir compromisso');
    }
  };

  const handleCancel = async () => {
    if (isDerived) return;
    try {
      await setCalendarEventStatusDomain(item.origin_id, 'cancelled');
      toast.success('Compromisso cancelado');
      onMutationSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar compromisso');
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="w-full border-l-0 bg-surface sm:max-w-md" side="right">
        {/* Accent bar */}
        <div className={cn('absolute left-0 top-0 h-full w-1.5 rounded-l-lg', isDerived ? 'bg-muted-foreground/30' : indicator.dot.replace('bg-', 'bg-'))} />

        <SheetHeader className="pl-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold', badge.bg, badge.text)}>
              {badge.label}
            </span>
            {isDerived && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[0.65rem] font-medium text-muted-foreground">
                <Lock className="h-3 w-3" /> Somente leitura
              </span>
            )}
            {item.status === 'completed' && (
              <Badge variant="outline" className="gap-1 border-success/30 text-success">
                <CheckCircle2 className="h-3 w-3" /> Concluído
              </Badge>
            )}
            {item.status === 'cancelled' && (
              <Badge variant="outline" className="gap-1 border-danger/30 text-danger">
                <XCircle className="h-3 w-3" /> Cancelado
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl font-bold text-foreground">{item.title}</SheetTitle>
          {item.subtitle && (
            <SheetDescription className="text-sm text-muted-foreground">
              {item.subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-5 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                categoryStyle.bg,
                categoryStyle.text,
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryStyle.color }} />
              {categoryStyle.label}
            </span>

            {priorityLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-border/50">
                <Flag className="h-3 w-3 text-muted-foreground" />
                Prioridade: {priorityLabel}
              </span>
            )}

            {isRecurring && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-border/50">
                <Repeat className="h-3 w-3 text-muted-foreground" />
                Recorrente
              </span>
            )}

            {syncLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border/50">
                <Globe className="h-3 w-3" />
                {syncLabel}
              </span>
            )}
          </div>

          {/* Date/time */}
          <DetailRow icon={<Clock className="h-4 w-4 text-primary" />} label="Quando">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="capitalize">
                {format(startDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {format(startDate, 'HH:mm')}
                {endDate && <> — {format(endDate, 'HH:mm')}</>}
              </span>
            </div>
          </DetailRow>

          {/* Location */}
          {location && (
            <DetailRow icon={<MapPin className="h-4 w-4 text-primary" />} label="Local">
              <span>{location}</span>
            </DetailRow>
          )}

          {/* Financial metadata (derived) */}
          {amount !== undefined && (
            <DetailRow icon={<CalendarClock className="h-4 w-4 text-warning" />} label="Valor">
              <span className="font-semibold tabular-nums">
                R$ {Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {providerName && <span className="text-muted-foreground"> — {providerName}</span>}
            </DetailRow>
          )}

          {tickTickTags.length > 0 && (
            <DetailRow icon={<Globe className="h-4 w-4 text-primary" />} label="Tags do TickTick">
              <div className="flex flex-wrap gap-2">
                {tickTickTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-border/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}

          {/* Info for read-only derived items */}
          {isDerived && (
            <div className="rounded-xl border border-border/60 bg-surface-elevated/50 p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Este item é uma projeção de uma conta/fatura e não pode ser editado diretamente na agenda.
                Para alterar dados, valor ou vencimento, acesse a página de Contas a Pagar.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start gap-2 rounded-xl py-2.5"
                asChild
              >
                <Link to="/contas-pagar">
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                  Ir para Contas a Pagar
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Actions for canonical events */}
        {!isDerived && item.status !== 'cancelled' && (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-border/40 pl-4 pt-5">
            <Button
              onClick={() => setEditOpen(true)}
              variant="outline"
              className="gap-2 rounded-xl"
            >
              <CalendarClock className="h-4 w-4" />
              Editar
            </Button>
            {item.supports_complete && item.status !== 'completed' && (
              <Button
                onClick={handleComplete}
                variant="outline"
                className="gap-2 rounded-xl border-success/30 text-success hover:bg-success-subtle"
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir
              </Button>
            )}
            <Button
              onClick={handleCancel}
              variant="outline"
              className="gap-2 rounded-xl border-danger/30 text-danger hover:bg-danger-subtle"
            >
              <Trash2 className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <CreateEventDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      defaultDate={startDate}
      onSuccess={() => {
        onMutationSuccess();
        onClose();
      }}
      hideOwnershipChooser
      eventToEdit={item}
    />
    </>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated ring-1 ring-border/40">
        {icon}
      </div>
      <div>
        <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function formatPriorityLabel(priority: string | null): string | null {
  if (!priority) return null;
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Média';
    case 'low':
      return 'Baixa';
    default:
      return priority;
  }
}

function formatSyncLabel(provider: string | null, status: string | null): string | null {
  if (!provider) return null;

  const providerLabel =
    provider === 'ticktick'
      ? 'TickTick'
      : provider === 'google_calendar'
        ? 'Google Calendar'
        : provider;

  switch (status) {
    case 'synced':
      return `${providerLabel} - Sincronizado`;
    case 'pending':
      return `${providerLabel} - Pendente`;
    case 'remote_deleted':
      return `${providerLabel} - Removido do provider`;
    case 'failed':
      return `${providerLabel} - Falha na sincronização`;
    default:
      return providerLabel;
  }
}
