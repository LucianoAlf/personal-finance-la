import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { CreditCardList } from '@/components/credit-cards/CreditCardList';
import { CreditCardDialog } from '@/components/credit-cards/CreditCardDialog';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog';
import { InvoicePaymentDialog } from '@/components/invoices/InvoicePaymentDialog';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatCurrency } from '@/utils/formatters';
import { Plus, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import { CreditCard as CreditCardType, CreditCardInvoice } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

export function CreditCards() {
  const {
    cardsSummary,
    loading,
    deleteCard,
    getTotalLimit,
    getTotalUsed,
    getTotalAvailable,
  } = useCreditCards();
  
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | undefined>();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<CreditCardInvoice | undefined>();

  const handleEdit = (card: CreditCardType) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleArchive = async (card: CreditCardType) => {
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
          <Button onClick={() => { 
            console.log('Botão Novo Cartão clicado');
            setSelectedCard(undefined); 
            setDialogOpen(true);
            console.log('Dialog state atualizado para true');
          }}>
            <Plus size={16} className="mr-1" />
            Novo Cartão
          </Button>
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
          onAddNew={() => { setSelectedCard(undefined); setDialogOpen(true); }}
        />

        {/* Seção de Faturas */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Faturas</h2>
          <InvoiceList />
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
    </div>
  );
}
