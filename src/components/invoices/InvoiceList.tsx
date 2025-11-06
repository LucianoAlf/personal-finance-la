import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceCard } from './InvoiceCard';
import { useInvoices } from '@/hooks/useInvoices';
import { useCreditCards } from '@/hooks/useCreditCards';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

interface InvoiceListProps {
  cardId?: string;
  loading?: boolean;
  highlightedInvoiceId?: string | null;
  onViewDetails?: (invoiceId: string) => void;
  onPayInvoice?: (invoiceId: string) => void;
}

export function InvoiceList({ cardId, loading: externalLoading, highlightedInvoiceId, onViewDetails, onPayInvoice }: InvoiceListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(cardId);
  const [activeTab, setActiveTab] = useState<'open' | 'paid'>('open');

  const { cards } = useCreditCards();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const isLoading = externalLoading || invoicesLoading;

  // Filtrar faturas
  const filteredInvoices = selectedCardId
    ? invoices.filter((inv) => inv.credit_card_id === selectedCardId)
    : invoices;

  // Separar por status
  const openInvoices = filteredInvoices.filter((inv) =>
    ['open', 'closed', 'overdue'].includes(inv.status)
  );
  const paidInvoices = filteredInvoices.filter((inv) => inv.status === 'paid');

  const displayInvoices = activeTab === 'open' ? openInvoices : paidInvoices;

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
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <FileText size={48} className="text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>
      <p className="text-gray-600 text-center max-w-md">
        {activeTab === 'open'
          ? 'Suas faturas abertas aparecerão aqui quando você realizar compras.'
          : 'Suas faturas pagas aparecerão aqui após o pagamento.'}
      </p>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'open' | 'paid')} className="space-y-6">
      {/* Tabs e Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="open">
            Faturas Abertas ({openInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Faturas Pagas ({paidInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Filtro por Cartão */}
        {cards.length > 1 && (
          <Select value={selectedCardId || 'all'} onValueChange={(v) => setSelectedCardId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
      <TabsContent value={activeTab} className="mt-0">
        {displayInvoices.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'open' ? 'Nenhuma fatura aberta' : 'Nenhuma fatura paga'
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
      </TabsContent>
    </Tabs>
  );
}
