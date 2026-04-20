import { useMemo, useRef, useState } from 'react';
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
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Plus, CreditCard, TrendingUp, Wallet, ShoppingCart, Receipt, BarChart3, History } from 'lucide-react';
import { CreditCard as CreditCardType, CreditCardInvoice, CreditCardSummary } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export function CreditCards() {
  const primaryButtonClass =
    'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

  const secondaryButtonClass =
    'rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay';

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
  const [activeTab, setActiveTab] = useState<'cartoes' | 'faturas' | 'analises' | 'historico'>('cartoes');

  const currentMonthInvoicesSummary = useMemo(() => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    const cardsWithCurrentInvoice = cardsSummary.filter((card) => card.current_invoice_id);

    return {
      total: cardsWithCurrentInvoice.reduce((sum, card) => sum + (card.current_invoice_amount || 0), 0),
      count: cardsWithCurrentInvoice.length,
      monthName: monthNames[new Date().getMonth()],
    };
  }, [cardsSummary]);

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

  const handlePayInvoice = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);

    const { data: invoice, error } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      console.error('Invoice não encontrada:', invoiceId, error);
      toast({
        title: 'Fatura não encontrada',
        description: 'Não foi possível carregar a fatura para pagamento.',
        variant: 'destructive',
      });
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
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_30%)]" />
      <Header
        title="Cartões de Crédito"
        subtitle="Gerencie suas faturas e limites"
        icon={<CreditCard size={24} />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className={secondaryButtonClass} onClick={() => handleNewPurchase()}>
              <ShoppingCart size={16} className="mr-1" />
              Nova Compra
            </Button>
            <Button className={primaryButtonClass} onClick={() => { 
              setSelectedCard(undefined); 
              setDialogOpen(true);
            }}>
              <Plus size={16} className="mr-1" />
              Novo Cartão
            </Button>
          </div>
        }
      />

      <div className="relative space-y-4 p-4 md:space-y-6 md:p-6">
        {/* Alertas Proativos */}
        <CreditCardAlerts cards={cardsSummary} className="animate-fade-in" />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 animate-fade-in">
          <StatCard
            title="Limite Total"
            value={formatCurrency(getTotalLimit())}
            icon={CreditCard}
            gradient="blue"
            valueClassName="text-[1.4rem] sm:text-[1.52rem]"
          />
          <StatCard
            title="Limite Usado"
            value={formatCurrency(getTotalUsed())}
            icon={TrendingUp}
            gradient="orange"
            valueClassName="text-[1.4rem] sm:text-[1.52rem]"
          />
          <StatCard
            title="Limite Disponível"
            value={formatCurrency(getTotalAvailable())}
            icon={Wallet}
            gradient="green"
            valueClassName="text-[1.4rem] sm:text-[1.52rem]"
          />
          <StatCard
            title={currentMonthInvoicesSummary.count === 1 ? 'Fatura do Mês' : 'Faturas do Mês'}
            value={formatCurrency(currentMonthInvoicesSummary.total)}
            icon={Receipt}
            gradient="red"
            valueClassName="text-[1.4rem] sm:text-[1.52rem]"
            subtitle={`${currentMonthInvoicesSummary.monthName} • ${currentMonthInvoicesSummary.count} ${currentMonthInvoicesSummary.count === 1 ? 'cartão' : 'cartões'}`}
          />
        </div>

        {/* Tabs: Cartões, Faturas, Análises e Histórico */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          {/* Mobile sliding pill (< md) */}
          <TabsList
            data-mobile-tabs="true"
            className="relative mb-4 flex w-full rounded-full border border-border/70 bg-card/95 p-1 md:hidden [&::-webkit-scrollbar]:hidden"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out"
              style={{
                width: 'calc((100% - 0.5rem) / 4)',
                transform: `translateX(${
                  activeTab === 'cartoes'  ? '0%'   :
                  activeTab === 'faturas'  ? '100%' :
                  activeTab === 'analises' ? '200%' : '300%'
                })`,
              }}
            />
            <TabsTrigger
              value="cartoes"
              aria-label="Meus Cartões"
              className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <CreditCard className="h-[15px] w-[15px]" />
              <span className="text-[9px] font-bold leading-none">Cartões</span>
            </TabsTrigger>
            <TabsTrigger
              value="faturas"
              aria-label="Faturas"
              className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <Receipt className="h-[15px] w-[15px]" />
              <span className="text-[9px] font-bold leading-none">Faturas</span>
            </TabsTrigger>
            <TabsTrigger
              value="analises"
              aria-label="Análises"
              className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <BarChart3 className="h-[15px] w-[15px]" />
              <span className="text-[9px] font-bold leading-none">Análises</span>
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              aria-label="Histórico"
              className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2 bg-transparent hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <History className="h-[15px] w-[15px]" />
              <span className="text-[9px] font-bold leading-none">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Desktop tabs (≥ md) — original, untouched */}
          <TabsList className="mb-6 hidden h-auto w-full grid-cols-4 rounded-[1.4rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)] md:grid">
            <TabsTrigger value="cartoes" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
              <CreditCard className="h-4 w-4" />
              Meus Cartões
            </TabsTrigger>
            <TabsTrigger value="faturas" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
              <Receipt className="h-4 w-4" />
              Faturas
            </TabsTrigger>
            <TabsTrigger value="analises" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
              <BarChart3 className="h-4 w-4" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
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
      {dialogOpen ? (
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
      ) : null}

      {/* Dialog Detalhes da Fatura */}
      {selectedInvoiceId && (
        <InvoiceDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          invoiceId={selectedInvoiceId}
          onPayInvoice={() => {
            setDetailsDialogOpen(false);
            void handlePayInvoice(selectedInvoiceId);
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
      {purchaseDialogOpen ? (
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
      ) : null}

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
