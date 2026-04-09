import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Wallet,
  ArrowLeftRight,
  DollarSign,
  Landmark,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountDialog, type AccountFormData } from '@/components/accounts/AccountDialog';
import { DeleteAccountDialog } from '@/components/accounts/DeleteAccountDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';

import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/formatters';
import type { Account } from '@/types/accounts';

interface SummaryMetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  accent?: 'brand' | 'bank' | 'wallet';
}

const summaryAccentStyles: Record<NonNullable<SummaryMetricCardProps['accent']>, string> = {
  brand:
    'border-primary/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.08)_38%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(15,23,42,0)_70%)]',
  bank:
    'border-sky-500/15 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0)_72%)]',
  wallet:
    'border-emerald-500/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0)_72%)]',
};

const summaryIconAccentStyles: Record<NonNullable<SummaryMetricCardProps['accent']>, string> = {
  brand:
    'border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)]',
  bank:
    'border-sky-500/20 bg-sky-600 text-white shadow-[0_14px_28px_rgba(59,130,246,0.22)]',
  wallet:
    'border-emerald-500/20 bg-emerald-600 text-white shadow-[0_14px_28px_rgba(16,185,129,0.22)]',
};

const primaryButtonClass =
  'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

const SummaryMetricCard: React.FC<SummaryMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  accent = 'brand',
}) => (
  <Card
    className={`group relative overflow-hidden rounded-[28px] border bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)] ${summaryAccentStyles[accent]}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground [font-variant-numeric:tabular-nums] sm:text-[1.9rem]">
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] border dark:border-white/10 ${summaryIconAccentStyles[accent]}`}
      >
        <Icon size={20} />
      </div>
    </div>
  </Card>
);

export const Contas: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    loading,
    error,
    fetchAccounts,
    getTotalBalance,
    getBalanceByType,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts();
  const { addTransaction } = useTransactions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [accountToAdjustId, setAccountToAdjustId] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [transferFromAccountId, setTransferFromAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferDescription, setTransferDescription] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const totalBalance = getTotalBalance();
  const bankBalance = getBalanceByType(['checking', 'savings']);
  const walletBalance = getBalanceByType(['cash', 'wallet']);

  const accountToAdjust = useMemo(
    () => accounts.find((account) => account.id === accountToAdjustId) || null,
    [accountToAdjustId, accounts],
  );
  const transferFromAccount = useMemo(
    () => accounts.find((account) => account.id === transferFromAccountId) || null,
    [transferFromAccountId, accounts],
  );
  const transferToOptions = useMemo(
    () => accounts.filter((account) => account.id !== transferFromAccountId),
    [accounts, transferFromAccountId],
  );

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;

    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      await deleteAccount(accountToDelete.id);
      toast.success('Conta excluída com sucesso!');
      setAccountToDelete(null);
    } catch {
      toast.error('Erro ao excluir conta. Tente novamente.');
    }
  };

  const handleArchive = async (id: string) => {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;

    if (
      !confirm(
        `Tem certeza que deseja arquivar a conta "${account.name}"? Ela ficará inativa, mas seus dados serão mantidos.`,
      )
    ) {
      return;
    }

    try {
      await updateAccount(id, { is_active: false });
      toast.success('Conta arquivada com sucesso!');
    } catch {
      toast.error('Erro ao arquivar conta. Tente novamente.');
    }
  };

  const handleViewTransactions = (accountId: string) => {
    navigate(`/transacoes?account=${accountId}`);
  };

  const handleAdjustBalance = (account: Account) => {
    setAccountToAdjustId(account.id);
    setNewBalance(String(account.current_balance));
    setAdjustmentNote('');
    setAdjustBalanceDialogOpen(true);
  };

  const confirmAdjustBalance = async () => {
    if (!accountToAdjust) {
      toast.error('Selecione uma conta para ajustar o saldo.');
      return;
    }

    const parsedBalance = Number(newBalance);
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      toast.error('Informe um saldo válido para a conta.');
      return;
    }

    try {
      setIsAdjustingBalance(true);
      await updateAccount(accountToAdjust.id, { current_balance: parsedBalance });
      await fetchAccounts();
      toast.success('Saldo ajustado com sucesso!');
      setAdjustBalanceDialogOpen(false);
      setAccountToAdjustId('');
      setNewBalance('');
      setAdjustmentNote('');
    } catch {
      toast.error('Erro ao ajustar saldo. Tente novamente.');
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  const handleOpenAdjustBalanceDialog = () => {
    if (accounts.length === 0) {
      toast.error('Cadastre uma conta primeiro para ajustar saldo.');
      return;
    }

    const firstAccount = accounts[0];
    setAccountToAdjustId(firstAccount.id);
    setNewBalance(String(firstAccount.current_balance));
    setAdjustmentNote('');
    setAdjustBalanceDialogOpen(true);
  };

  const handleOpenTransferDialog = () => {
    if (accounts.length < 2) {
      toast.error('Cadastre pelo menos duas contas para realizar uma transferência.');
      return;
    }

    setTransferFromAccountId(accounts[0]?.id || '');
    setTransferToAccountId(accounts[1]?.id || '');
    setTransferAmount('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferDescription('');
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferFromAccountId || !transferToAccountId) {
      toast.error('Selecione a conta de origem e a conta de destino.');
      return;
    }

    if (transferFromAccountId === transferToAccountId) {
      toast.error('A conta de destino deve ser diferente da conta de origem.');
      return;
    }

    const parsedAmount = Number(transferAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor válido para a transferência.');
      return;
    }

    const sourceAccount = accounts.find((account) => account.id === transferFromAccountId);
    const destinationAccount = accounts.find((account) => account.id === transferToAccountId);

    if (!sourceAccount || !destinationAccount) {
      toast.error('Não foi possível localizar as contas selecionadas.');
      return;
    }

    if (Number(sourceAccount.current_balance) < parsedAmount) {
      toast.error('Saldo insuficiente na conta de origem.');
      return;
    }

    const description = transferDescription.trim() || `Transferência para ${destinationAccount.name}`;
    const expectedSourceBalance = Number(sourceAccount.current_balance) - parsedAmount;
    const expectedDestinationBalance = Number(destinationAccount.current_balance) + parsedAmount;

    try {
      setIsSubmittingTransfer(true);
      await addTransaction({
        type: 'transfer',
        account_id: transferFromAccountId,
        category_id: 'transfer',
        amount: parsedAmount,
        description,
        transaction_date: transferDate,
        is_paid: true,
        notes: undefined,
        source: 'manual',
        transfer_to_account_id: transferToAccountId,
        is_recurring: false,
      });

      const { data: refreshedAccounts, error: refreshedAccountsError } = await supabase
        .from('accounts')
        .select('id, current_balance')
        .in('id', [transferFromAccountId, transferToAccountId]);

      if (refreshedAccountsError) throw refreshedAccountsError;

      const refreshedSource = refreshedAccounts?.find((account) => account.id === transferFromAccountId);
      const refreshedDestination = refreshedAccounts?.find((account) => account.id === transferToAccountId);
      const triggerApplied =
        refreshedSource &&
        refreshedDestination &&
        Math.abs(Number(refreshedSource.current_balance) - expectedSourceBalance) < 0.01 &&
        Math.abs(Number(refreshedDestination.current_balance) - expectedDestinationBalance) < 0.01;

      if (!triggerApplied) {
        const { error: sourceUpdateError } = await supabase
          .from('accounts')
          .update({
            current_balance: expectedSourceBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transferFromAccountId);

        if (sourceUpdateError) throw sourceUpdateError;

        const { error: destinationUpdateError } = await supabase
          .from('accounts')
          .update({
            current_balance: expectedDestinationBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transferToAccountId);

        if (destinationUpdateError) throw destinationUpdateError;
      }

      await fetchAccounts();

      toast.success('Transferência realizada com sucesso!');
      setTransferDialogOpen(false);
      setTransferFromAccountId('');
      setTransferToAccountId('');
      setTransferAmount('');
      setTransferDescription('');
      setTransferDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao transferir saldo:', error);
      toast.error('Erro ao realizar transferência. Tente novamente.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleSave = async (data: AccountFormData) => {
    try {
      if (selectedAccount) {
        await updateAccount(selectedAccount.id, data);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await addAccount({
          name: data.name,
          type: data.type ?? 'checking',
          bank_name: data.bank_name,
          initial_balance: data.initial_balance,
          color: data.color,
          icon: data.icon,
          is_shared: data.is_shared,
          is_active: data.is_active,
        });
        toast.success('Conta criada com sucesso!');
      }
      setDialogOpen(false);
      setSelectedAccount(undefined);
    } catch {
      toast.error('Erro ao salvar conta. Tente novamente.');
    }
  };

  const handleNewAccount = () => {
    setSelectedAccount(undefined);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-2xl border border-border/70 bg-card px-6 py-4 text-lg shadow-sm">
          Carregando contas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-2xl border border-danger-border bg-danger-subtle px-6 py-4 text-danger shadow-sm">
          Erro: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[18rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_70%)] lg:block" />

      <Header
        title="Contas"
        subtitle="Gerencie suas contas bancárias e carteiras"
        icon={<Wallet size={24} />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay"
              onClick={handleOpenTransferDialog}
            >
              <ArrowLeftRight className="mr-2" size={16} />
              Transferência
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay"
              onClick={handleOpenAdjustBalanceDialog}
            >
              <DollarSign className="mr-2" size={16} />
              Ajustar Saldo
            </Button>
            <Button className={`${primaryButtonClass} px-4`} size="sm" onClick={handleNewAccount}>
              <Plus className="mr-2" size={16} />
              Nova Conta
            </Button>
          </>
        }
      />

      <div className="relative mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <SummaryMetricCard
            title="Saldo Total Geral"
            value={formatCurrency(totalBalance)}
            icon={Wallet}
            accent="brand"
          />
          <SummaryMetricCard
            title="Contas Bancárias"
            value={formatCurrency(bankBalance)}
            icon={Landmark}
            accent="bank"
          />
          <SummaryMetricCard
            title="Carteira/Dinheiro"
            value={formatCurrency(walletBalance)}
            icon={PiggyBank}
            accent="wallet"
          />
        </div>

        <div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: '1fr' }}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onViewTransactions={handleViewTransactions}
                onAdjustBalance={handleAdjustBalance}
                onDelete={handleDelete}
              />
            ))}

            <Card
              className="group h-full min-h-[320px] cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed border-border/80 bg-card/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_24px_55px_rgba(2,6,23,0.32)]"
              onClick={handleNewAccount}
            >
              <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-primary/20 bg-primary/8 text-primary transition-transform duration-300 group-hover:scale-105 group-hover:bg-primary/12">
                  <Plus size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">Criar Nova Conta</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma conta bancária ou carteira
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {accounts.length === 0 && (
            <div className="mt-6 rounded-[28px] border border-border/70 bg-card/80 px-6 py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                <Wallet size={32} />
              </div>
              <p className="mb-2 text-lg font-medium text-foreground">Nenhuma conta encontrada</p>
              <p className="text-sm text-muted-foreground">
                Crie sua primeira conta para começar a gerenciar suas finanças
              </p>
            </div>
          )}
        </div>

        <AccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={selectedAccount}
          onSave={handleSave}
        />

        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          accountName={accountToDelete?.name || ''}
        />

        <Dialog
          open={adjustBalanceDialogOpen}
          onOpenChange={(open) => {
            setAdjustBalanceDialogOpen(open);
            if (!open) {
              setAccountToAdjustId('');
              setNewBalance('');
              setAdjustmentNote('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
              <DialogTitle>Ajustar Saldo</DialogTitle>
              <DialogDescription>
                Atualize manualmente o saldo atual de uma conta existente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Conta</label>
                <Select
                  value={accountToAdjustId}
                  onValueChange={(value) => {
                    const selected = accounts.find((account) => account.id === value);
                    setAccountToAdjustId(value);
                    setNewBalance(selected ? String(selected.current_balance) : '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {accountToAdjust && (
                <div className="rounded-2xl border border-border/60 bg-surface-elevated/70 px-4 py-3 text-sm text-muted-foreground">
                  Saldo atual: <strong className="text-foreground">{formatCurrency(accountToAdjust.current_balance)}</strong>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Novo saldo</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBalance}
                  onChange={(event) => setNewBalance(event.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observação opcional</label>
                <Textarea
                  value={adjustmentNote}
                  onChange={(event) => setAdjustmentNote(event.target.value)}
                  placeholder="Ex: saldo conciliado com extrato bancário"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setAdjustBalanceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmAdjustBalance}
                className={primaryButtonClass}
                disabled={isAdjustingBalance}
              >
                {isAdjustingBalance ? 'Salvando...' : 'Confirmar ajuste'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={transferDialogOpen}
          onOpenChange={(open) => {
            setTransferDialogOpen(open);
            if (!open) {
              setTransferFromAccountId('');
              setTransferToAccountId('');
              setTransferAmount('');
              setTransferDescription('');
              setTransferDate(new Date().toISOString().split('T')[0]);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
              <DialogTitle>Transferência</DialogTitle>
              <DialogDescription>
                Mova saldo entre contas sem sair desta tela.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Conta origem</label>
                  <Select
                    value={transferFromAccountId}
                    onValueChange={(value) => {
                      setTransferFromAccountId(value);
                      if (value === transferToAccountId) {
                        const nextDestination = accounts.find((account) => account.id !== value);
                        setTransferToAccountId(nextDestination?.id || '');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {transferFromAccount && (
                    <p className="text-xs text-muted-foreground">
                      Saldo disponível: {formatCurrency(transferFromAccount.current_balance)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Conta destino</label>
                  <Select value={transferToAccountId} onValueChange={setTransferToAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferToOptions.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Data</label>
                  <DatePickerInput
                    value={transferDate}
                    onChange={(value) => setTransferDate(value)}
                    placeholder="Selecione a data da transferência"
                    disableFuture={true}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descrição opcional</label>
                <Textarea
                  value={transferDescription}
                  onChange={(event) => setTransferDescription(event.target.value)}
                  placeholder="Ex: transferência para reserva de emergência"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleTransfer}
                className={primaryButtonClass}
                disabled={isSubmittingTransfer}
              >
                {isSubmittingTransfer ? 'Transferindo...' : 'Confirmar transferência'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
