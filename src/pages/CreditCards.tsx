import { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { CreditCardList } from '@/components/credit-cards/CreditCardList';
import { CreditCardDialog } from '@/components/credit-cards/CreditCardDialog';
import { CreditCardDetailsDialog } from '@/components/credit-cards/CreditCardDetailsDialog';
import { PurchaseDialog } from '@/components/credit-cards/PurchaseDialog';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import { InvoicePaymentDialog } from '@/components/invoices/InvoicePaymentDialog';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatCurrency } from '@/utils/formatters';
import { Plus, CreditCard, TrendingUp, Wallet, ShoppingCart } from 'lucide-react';
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
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
        </div>

        {/* Lista de Cartões */}
        <CreditCardList
          cards={cardsSummary}
          loading={loading}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onAddNew={() => { setSelectedCard(undefined); setDialogOpen(true); }}
        />

        {/* Seção de Faturas */}
        <div ref={invoicesRef} className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Faturas</h2>
          <InvoiceList 
            highlightedInvoiceId={highlightedInvoiceId}
            onViewDetails={handleViewInvoiceDetails}
            onPayInvoice={handlePayInvoice}
          />
        </div>
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
    </div>
  );
}
