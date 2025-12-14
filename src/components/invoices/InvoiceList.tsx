import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceCard } from './InvoiceCard';
import { useInvoices } from '@/hooks/useInvoices';
import { useCreditCards } from '@/hooks/useCreditCards';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle2, CreditCard, Package, AlertTriangle } from 'lucide-react';

interface InvoiceListProps {
  cardId?: string;
  loading?: boolean;
  highlightedInvoiceId?: string | null;
  onViewDetails?: (invoiceId: string) => void;
  onPayInvoice?: (invoiceId: string) => void;
}

export function InvoiceList({ cardId, loading: externalLoading, highlightedInvoiceId, onViewDetails, onPayInvoice }: InvoiceListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(cardId);
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'overdue' | 'paid'>('open');

  const { cards } = useCreditCards();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const isLoading = externalLoading || invoicesLoading;

  // Filtrar faturas
  const filteredInvoices = selectedCardId
    ? invoices.filter((inv) => inv.credit_card_id === selectedCardId)
    : invoices;

  // Separar por status
  const openInvoices = filteredInvoices.filter((inv) => inv.status === 'open');
  const closedInvoices = filteredInvoices.filter((inv) => inv.status === 'closed');
  const overdueInvoices = filteredInvoices.filter((inv) => inv.status === 'overdue');
  const paidInvoices = filteredInvoices.filter((inv) => inv.status === 'paid');

  // Selecionar faturas baseado na aba ativa
  const getDisplayInvoices = () => {
    switch (activeTab) {
      case 'open': return openInvoices;
      case 'closed': return closedInvoices;
      case 'overdue': return overdueInvoices;
      case 'paid': return paidInvoices;
      default: return openInvoices;
    }
  };
  const displayInvoices = getDisplayInvoices();

  // Encontrar cartão para cada fatura
  const getCardForInvoice = (invoiceCardId: string) => {
    return cards.find((c) => c.id === invoiceCardId);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'open': return 'Suas faturas abertas aparecerão aqui quando você realizar compras.';
      case 'closed': return 'Faturas fechadas aguardando pagamento aparecerão aqui.';
      case 'overdue': return 'Você não tem faturas vencidas. Continue assim!';
      case 'paid': return 'Suas faturas pagas aparecerão aqui após o pagamento.';
      default: return '';
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <FileText size={48} className="text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>
      <p className="text-gray-600 text-center max-w-md">
        {getEmptyMessage()}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filtros Modernos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Filtros de Status */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'open' ? 'default' : 'outline'}
            onClick={() => setActiveTab('open')}
            className="flex items-center gap-2"
            size="sm"
          >
            <Clock className="h-4 w-4" />
            Abertas
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {openInvoices.length}
            </span>
          </Button>
          <Button
            variant={activeTab === 'closed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('closed')}
            className="flex items-center gap-2"
            size="sm"
          >
            <Package className="h-4 w-4" />
            Fechadas
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {closedInvoices.length}
            </span>
          </Button>
          {overdueInvoices.length > 0 && (
            <Button
              variant={activeTab === 'overdue' ? 'destructive' : 'outline'}
              onClick={() => setActiveTab('overdue')}
              className="flex items-center gap-2"
              size="sm"
            >
              <AlertTriangle className="h-4 w-4" />
              Vencidas
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-600">
                {overdueInvoices.length}
              </span>
            </Button>
          )}
          <Button
            variant={activeTab === 'paid' ? 'default' : 'outline'}
            onClick={() => setActiveTab('paid')}
            className="flex items-center gap-2"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Pagas
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
              {paidInvoices.length}
            </span>
          </Button>
        </div>

        {/* Filtro por Cartão */}
        {cards.length > 1 && (
          <Select value={selectedCardId || 'all'} onValueChange={(v) => setSelectedCardId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <CreditCard className="h-4 w-4 mr-2" />
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
        )}
      </div>

      {/* Lista de Faturas */}
      <div>
        {displayInvoices.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'open' ? 'Nenhuma fatura aberta' : 
              activeTab === 'closed' ? 'Nenhuma fatura fechada' :
              activeTab === 'overdue' ? 'Nenhuma fatura vencida' :
              'Nenhuma fatura paga'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
}
