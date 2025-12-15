import { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCardList } from '@/components/credit-cards/CreditCardList';
import { CreditCardDialog } from '@/components/credit-cards/CreditCardDialog';
import { CreditCardDetailsDialog } from '@/components/credit-cards/CreditCardDetailsDialog';
import { PurchaseDialog } from '@/components/credit-cards/PurchaseDialog';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import { InvoicePaymentDialog } from '@/components/invoices/InvoicePaymentDialog';
import { InvoiceHistory } from '@/components/invoices/InvoiceHistory';
import { DeleteInvoiceDialog } from '@/components/invoices/DeleteInvoiceDialog';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';
import { CreditCardAlerts } from '@/components/credit-cards/CreditCardAlerts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvoices } from '@/hooks/useInvoices';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Plus, CreditCard, TrendingUp, Wallet, ShoppingCart, Receipt, BarChart3, History } from 'lucide-react';
import { CreditCard as CreditCardType, CreditCardInvoice, CreditCardSummary } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

export function CreditCards() {
  const {
    cardsSummary,
    loading,
    deleteCard,
    getTotalLimit,
    getTotalUsed,
    getTotalAvailable,
    fetchCards,
    fetchCardsSummary,
  } = useCreditCards();

  const { invoices, invoicesDetailed, getCurrentMonthInvoicesTotal } = useInvoices();
  const { formatCurrency } = useUserPreferences();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [cardDetailsDialogOpen, setCardDetailsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | undefined>();
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<CreditCardSummary | undefined>();
  const [selectedCardIdForPurchase, setSelectedCardIdForPurchase] = useState<string | undefined>();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<CreditCardInvoice | undefined>();
  const [highlightedInvoiceId, setHighlightedInvoiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const invoicesRef = useRef<HTMLDivElement>(null);

  const handleEdit = (card: CreditCardSummary) => {
    setSelectedCard(card as any);
    setDialogOpen(true);
  };

  const handleViewDetails = (card: CreditCardSummary) => {
    setSelectedCardForDetails(card);
    setCardDetailsDialogOpen(true);
  };

  const handleNewPurchase = (cardId?: string) => {
    setSelectedCardIdForPurchase(cardId);
    setPurchaseDialogOpen(true);
  };

  const handleViewInvoiceDetails = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setDetailsDialogOpen(true);
  };

  const handlePayInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    
    // Buscar invoice e card completos
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      console.error('Invoice não encontrada:', invoiceId);
      return;
    }
    
    const card = cardsSummary.find(c => c.id === invoice.credit_card_id);
    if (!card) {
      console.error('Card não encontrado:', invoice.credit_card_id);
      return;
    }
    
    setSelectedInvoice(invoice);
    setSelectedCard(card as any);
    setPaymentDialogOpen(true);
  };

  const handleArchive = async (card: CreditCardSummary) => {
    const success = await deleteCard(card.id);
    if (success) {
      toast({
        title: 'Cartão arquivado',
        description: 'O cartão foi arquivado com sucesso.',
      });
    }
  };

  const handleDelete = async (card: CreditCardType) => {
    const success = await deleteCard(card.id);
    if (success) {
      toast({
        title: 'Cartão excluído',
        description: 'O cartão foi excluído com sucesso.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Cartões de Crédito"
        subtitle="Gerencie suas faturas e limites"
        icon={<CreditCard size={24} />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleNewPurchase()}>
              <ShoppingCart size={16} className="mr-1" />
              Nova Compra
            </Button>
            <Button onClick={() => { 
              setSelectedCard(undefined); 
              setDialogOpen(true);
            }}>
              <Plus size={16} className="mr-1" />
              Novo Cartão
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Alertas Proativos */}
        <CreditCardAlerts cards={cardsSummary} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
          <StatCard
            title="Limite Total"
            value={formatCurrency(getTotalLimit())}
            icon={CreditCard}
            gradient="blue"
          />
          <StatCard
            title="Limite Usado"
            value={formatCurrency(getTotalUsed())}
            icon={TrendingUp}
            gradient="orange"
          />
          <StatCard
            title="Limite Disponível"
            value={formatCurrency(getTotalAvailable())}
            icon={Wallet}
            gradient="green"
          />
          <StatCard
            title={getCurrentMonthInvoicesTotal().count === 1 ? 'Fatura do Mês' : 'Faturas do Mês'}
            value={formatCurrency(getCurrentMonthInvoicesTotal().total)}
            icon={Receipt}
            gradient="red"
            subtitle={`${getCurrentMonthInvoicesTotal().monthName} • ${getCurrentMonthInvoicesTotal().count} ${getCurrentMonthInvoicesTotal().count === 1 ? 'cartão' : 'cartões'}`}
          />
        </div>

        {/* Tabs: Cartões, Faturas, Análises e Histórico */}
        <Tabs defaultValue="cartoes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="cartoes" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Meus Cartões
            </TabsTrigger>
            <TabsTrigger value="faturas" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Faturas
            </TabsTrigger>
            <TabsTrigger value="analises" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tab: Cartões */}
          <TabsContent value="cartoes" className="space-y-4">
            <CreditCardList
              cards={cardsSummary}
              loading={loading}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onPayInvoice={(card) => {
                if (card.current_invoice_id) {
                  handlePayInvoice(card.current_invoice_id);
                }
              }}
              onAddNew={() => { setSelectedCard(undefined); setDialogOpen(true); }}
            />
          </TabsContent>

          {/* Tab: Faturas */}
          <TabsContent value="faturas" className="space-y-4">
            <div ref={invoicesRef}>
              <InvoiceList 
                highlightedInvoiceId={highlightedInvoiceId}
                onViewDetails={handleViewInvoiceDetails}
                onPayInvoice={handlePayInvoice}
              />
            </div>
          </TabsContent>

          {/* Tab: Análises */}
          <TabsContent value="analises" className="space-y-4">
            <AnalyticsTab />
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="historico" className="space-y-4">
            <InvoiceHistory 
              onEditInvoice={(id) => handleViewInvoiceDetails(id)}
              onDeleteInvoice={(id) => {
                setInvoiceToDelete(id);
                setDeleteDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Criar/Editar Cartão */}
      <CreditCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={selectedCard}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedCard(undefined);
          // Atualiza a lista imediatamente após criar/editar
          fetchCards();
          fetchCardsSummary();
        }}
      />

      {/* Dialog Detalhes da Fatura */}
      {selectedInvoiceId && (
        <InvoiceDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          invoiceId={selectedInvoiceId}
          onPayInvoice={() => {
            setDetailsDialogOpen(false);
            setPaymentDialogOpen(true);
          }}
        />
      )}

      {/* Dialog Pagamento de Fatura */}
      {selectedInvoice && selectedCard && (
        <InvoicePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoice={selectedInvoice}
          card={selectedCard}
          onSuccess={() => {
            setPaymentDialogOpen(false);
            setSelectedInvoice(undefined);
          }}
        />
      )}

      {/* Dialog Nova Compra */}
      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        cardId={selectedCardIdForPurchase}
        onSuccess={(result) => {
          setPurchaseDialogOpen(false);
          setSelectedCardIdForPurchase(undefined);
          // Refetch imediato como fallback ao realtime
          fetchCards();
          fetchCardsSummary();
          
          // Destacar fatura e fazer scroll
          if (result?.invoiceId) {
            setHighlightedInvoiceId(result.invoiceId);
            setTimeout(() => {
              invoicesRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }, 100);
            setTimeout(() => setHighlightedInvoiceId(null), 3000);
          }
        }}
      />

      {/* Dialog Detalhes do Cartão */}
      {selectedCardForDetails && (
        <CreditCardDetailsDialog
          open={cardDetailsDialogOpen}
          onOpenChange={setCardDetailsDialogOpen}
          card={selectedCardForDetails as any}
        />
      )}

      {/* Dialog Excluir Fatura */}
      {invoiceToDelete && (
        <DeleteInvoiceDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setInvoiceToDelete(null);
          }}
          invoiceId={invoiceToDelete}
          onSuccess={() => {
            setInvoiceToDelete(null);
            fetchCards();
            fetchCardsSummary();
          }}
        />
      )}
    </div>
  );
}
