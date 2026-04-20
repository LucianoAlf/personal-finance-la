import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, FileText, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvoices } from '@/hooks/useInvoices';
import { cn } from '@/lib/utils';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';

import { InvoiceCard } from './InvoiceCard';

interface InvoiceListProps {
  cardId?: string;
  loading?: boolean;
  highlightedInvoiceId?: string | null;
  onViewDetails?: (invoiceId: string) => void;
  onPayInvoice?: (invoiceId: string) => void;
}

const filterButtonClass = (
  active: boolean,
  tone: 'default' | 'danger' = 'default',
) =>
  cn(
    'h-11 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors',
    active
      ? tone === 'danger'
        ? 'border-danger/30 bg-danger/12 text-danger'
        : 'border-primary/25 bg-primary/12 text-foreground'
      : 'border-border/70 bg-surface/72 text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
  );

const mobilePillClass = (active: boolean, tone: 'default' | 'danger' = 'default') =>
  cn(
    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors',
    active
      ? tone === 'danger'
        ? 'border-danger/30 bg-danger/12 text-danger'
        : 'border-primary/25 bg-primary text-primary-foreground'
      : 'border-border/70 bg-surface/72 text-muted-foreground hover:bg-surface-elevated',
  );

const mobilePillCountClass = (active: boolean) =>
  cn(
    'rounded-full px-1.5 py-px text-[10px] font-semibold',
    active
      ? 'bg-white/20 text-primary-foreground'
      : 'bg-background/80 text-muted-foreground ring-1 ring-border/60',
  );

export function InvoiceList({
  cardId,
  loading: externalLoading,
  highlightedInvoiceId,
  onViewDetails,
  onPayInvoice,
}: InvoiceListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(cardId);
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'overdue' | 'paid'>('open');

  const { cards } = useCreditCards();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const isLoading = externalLoading || invoicesLoading;

  const filteredInvoices = selectedCardId
    ? invoices.filter((invoice) => invoice.credit_card_id === selectedCardId)
    : invoices;

  const openInvoices = filteredInvoices.filter((invoice) => invoice.status === 'open');
  const closedInvoices = filteredInvoices.filter((invoice) => invoice.status === 'closed');
  const overdueInvoices = filteredInvoices.filter((invoice) => invoice.status === 'overdue');
  const paidInvoices = filteredInvoices.filter((invoice) => invoice.status === 'paid');

  const getDisplayInvoices = () => {
    const sortByClosestDueDate = (a: typeof invoices[number], b: typeof invoices[number]) =>
      parseDateOnlyAsLocal(a.due_date).getTime() - parseDateOnlyAsLocal(b.due_date).getTime();

    const sortByMostRecentFirst = (a: typeof invoices[number], b: typeof invoices[number]) =>
      parseDateOnlyAsLocal(b.reference_month).getTime() - parseDateOnlyAsLocal(a.reference_month).getTime();

    switch (activeTab) {
      case 'closed':
        return [...closedInvoices].sort(sortByClosestDueDate);
      case 'overdue':
        return [...overdueInvoices].sort(sortByClosestDueDate);
      case 'paid':
        return [...paidInvoices].sort(sortByMostRecentFirst);
      case 'open':
      default:
        return [...openInvoices].sort(sortByClosestDueDate);
    }
  };

  const displayInvoices = getDisplayInvoices();

  const getCardForInvoice = (invoiceCardId: string) => cards.find((card) => card.id === invoiceCardId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(3,8,20,0.18)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-28 rounded-xl" />
              <Skeleton className="h-11 w-28 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl lg:w-[220px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[1, 2].map((item) => (
            <Skeleton key={item} className="h-[320px] rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  const getEmptyTitle = () => {
    switch (activeTab) {
      case 'closed':
        return 'Nenhuma fatura fechada';
      case 'overdue':
        return 'Nenhuma fatura vencida';
      case 'paid':
        return 'Nenhuma fatura paga';
      case 'open':
      default:
        return 'Nenhuma fatura aberta';
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'closed':
        return 'As faturas fechadas aguardando pagamento vao aparecer aqui.';
      case 'overdue':
        return 'Voce nao tem faturas vencidas. Continue assim.';
      case 'paid':
        return 'As faturas pagas ficam disponiveis aqui para consulta.';
      case 'open':
      default:
        return 'As faturas abertas aparecem aqui assim que novas compras entram no ciclo.';
    }
  };

  const EmptyState = () => (
    <div className="rounded-[30px] border border-dashed border-border/70 bg-card/70 px-6 py-16 text-center shadow-[0_18px_42px_rgba(3,8,20,0.12)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.24)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-border/70 bg-surface-elevated/60 text-muted-foreground shadow-sm">
        <FileText className="h-7 w-7" />
      </div>
      <div className="mt-5 space-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{getEmptyTitle()}</h3>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">{getEmptyMessage()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        {/* Mobile: horizontal scroll pills (< lg) */}
        <div
          data-mobile-pills="true"
          className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden lg:hidden"
        >
          <button
            type="button"
            aria-pressed={activeTab === 'open'}
            onClick={() => setActiveTab('open')}
            className={mobilePillClass(activeTab === 'open')}
          >
            <Clock className="h-3 w-3" />
            Abertas
            <span className={mobilePillCountClass(activeTab === 'open')}>
              {openInvoices.length}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'closed'}
            onClick={() => setActiveTab('closed')}
            className={mobilePillClass(activeTab === 'closed')}
          >
            <Package className="h-3 w-3" />
            Fechadas
            <span className={mobilePillCountClass(activeTab === 'closed')}>
              {closedInvoices.length}
            </span>
          </button>
          {overdueInvoices.length > 0 ? (
            <button
              type="button"
              aria-pressed={activeTab === 'overdue'}
              onClick={() => setActiveTab('overdue')}
              className={mobilePillClass(activeTab === 'overdue', 'danger')}
            >
              <AlertTriangle className="h-3 w-3" />
              Vencidas
              <span className={mobilePillCountClass(activeTab === 'overdue')}>
                {overdueInvoices.length}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={activeTab === 'paid'}
            onClick={() => setActiveTab('paid')}
            className={mobilePillClass(activeTab === 'paid')}
          >
            <CheckCircle2 className="h-3 w-3" />
            Pagas
            <span className={mobilePillCountClass(activeTab === 'paid')}>
              {paidInvoices.length}
            </span>
          </button>
        </div>

        {/* Desktop: original filter card (>= lg) */}
        <div className="hidden lg:block">
          <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_rgba(3,8,20,0.16)] backdrop-blur-xl dark:shadow-[0_20px_48px_rgba(2,6,23,0.28)] xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('open')}
                className={filterButtonClass(activeTab === 'open')}
              >
                <Clock className="mr-2 h-4 w-4" />
                Abertas
                <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                  {openInvoices.length}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('closed')}
                className={filterButtonClass(activeTab === 'closed')}
              >
                <Package className="mr-2 h-4 w-4" />
                Fechadas
                <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                  {closedInvoices.length}
                </span>
              </Button>

              {overdueInvoices.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('overdue')}
                  className={filterButtonClass(activeTab === 'overdue', 'danger')}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Vencidas
                  <span className="ml-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold text-danger ring-1 ring-danger/20">
                    {overdueInvoices.length}
                  </span>
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('paid')}
                className={filterButtonClass(activeTab === 'paid')}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Pagas
                <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                  {paidInvoices.length}
                </span>
              </Button>
            </div>

            {cards.length > 1 ? (
              <Select
                value={selectedCardId || 'all'}
                onValueChange={(value) => setSelectedCardId(value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm hover:bg-surface-elevated focus-visible:ring-primary/20 dark:bg-surface-elevated/70 xl:w-[220px]">
                  <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Todos os Cartões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cartões</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>
      </div>

      {displayInvoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {displayInvoices.map((invoice) => {
            const card = getCardForInvoice(invoice.credit_card_id);
            if (!card) return null;

            return (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                card={card}
                isHighlighted={highlightedInvoiceId === invoice.id}
                onViewDetails={() => onViewDetails?.(invoice.id)}
                onPayInvoice={() => onPayInvoice?.(invoice.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
