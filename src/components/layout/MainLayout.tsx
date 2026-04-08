import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { useUIStore, type QuickCreateAction } from '@/store/uiStore';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { usePayableBills } from '@/hooks/usePayableBills';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { PurchaseDialog } from '@/components/credit-cards/PurchaseDialog';
import { BillDialog } from '@/components/payable-bills/BillDialog';
import type { CreateBillInput } from '@/types/payable-bills.types';
import { toast } from 'sonner';

export function MainLayout() {
  return (
    <div data-testid="app-shell" className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <Outlet />
      </main>
      <QuickCreateManager />
    </div>
  );
}

function QuickCreateManager() {
  const { activeQuickCreate, closeQuickCreate } = useUIStore();

  if (!activeQuickCreate) {
    return null;
  }

  return (
    <QuickCreateActiveManager
      activeQuickCreate={activeQuickCreate}
      closeQuickCreate={closeQuickCreate}
    />
  );
}

function QuickCreateActiveManager({
  activeQuickCreate,
  closeQuickCreate,
}: {
  activeQuickCreate: QuickCreateAction;
  closeQuickCreate: () => void;
}) {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { cardsSummary, loading: cardsLoading } = useCreditCards();

  useEffect(() => {
    if ((activeQuickCreate === 'expense' || activeQuickCreate === 'income') && !accountsLoading && accounts.length === 0) {
      toast.error('Cadastre uma conta primeiro para registrar uma transacao.');
      closeQuickCreate();
      return;
    }

    if (activeQuickCreate === 'transfer' && !accountsLoading) {
      if (accounts.length === 0) {
        toast.error('Cadastre uma conta primeiro para registrar uma transferencia.');
        closeQuickCreate();
        return;
      }

      if (accounts.length < 2) {
        toast.error('Cadastre pelo menos duas contas para fazer uma transferencia.');
        closeQuickCreate();
        return;
      }
    }

    if (activeQuickCreate === 'card-expense' && !cardsLoading && cardsSummary.length === 0) {
      toast.error('Cadastre um cartao primeiro para lancar uma despesa no cartao.');
      closeQuickCreate();
    }
  }, [activeQuickCreate, accounts, accountsLoading, cardsLoading, cardsSummary.length, closeQuickCreate]);

  if (activeQuickCreate === 'card-expense') {
    return <QuickCreatePurchaseModal open onOpenChange={() => closeQuickCreate()} />;
  }

  if (activeQuickCreate === 'payable-bill') {
    return <QuickCreateBillModal open onOpenChange={() => closeQuickCreate()} />;
  }

  return (
    <QuickCreateTransactionModal
      type={activeQuickCreate}
      open
      onOpenChange={() => closeQuickCreate()}
    />
  );
}

function QuickCreateTransactionModal({
  type,
  open,
  onOpenChange,
}: {
  type: Extract<QuickCreateAction, 'expense' | 'income' | 'transfer'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addTransaction, updateTransaction } = useTransactions();
  const queryClient = useQueryClient();

  const handleSave = async (data: any, options?: { existingEntityId?: string }) => {
    if (options?.existingEntityId) {
      await updateTransaction(options.existingEntityId, data);
      return options.existingEntityId;
    }
    const row = await addTransaction(data);
    if (!row?.id) {
      throw new Error('NÃ£o foi possÃ­vel obter o id da transaÃ§Ã£o criada');
    }
    return row.id;
  };

  const handleSaveComplete = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  return (
    <TransactionDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      onSaveComplete={handleSaveComplete}
      defaultType={type}
    />
  );
}

function QuickCreatePurchaseModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const handleSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['creditCards'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    ]);
    onOpenChange(false);
  };

  return (
    <PurchaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={handleSuccess}
    />
  );
}

function QuickCreateBillModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createBill, createInstallmentBills } = usePayableBills();

  const handleCreate = async (data: CreateBillInput) => {
    if (data.is_installment && data.installment_total && data.installment_total > 1) {
      return await createInstallmentBills({ ...data, installment_total: data.installment_total });
    }

    return await createBill(data);
  };

  return (
    <BillDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleCreate}
    />
  );
}
