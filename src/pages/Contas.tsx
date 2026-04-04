import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Wallet, ArrowLeftRight, DollarSign } from 'lucide-react';

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

export const Contas: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, loading, error, fetchAccounts, getTotalBalance, getBalanceByType, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { addTransaction } = useTransactions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [accountToAdjustId, setAccountToAdjustId] = useState<string>('');
  const [newBalance, setNewBalance] = useState<string>('');
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
  const walletBalance = getBalanceByType(['cash']);
  const accountToAdjust = useMemo(
    () => accounts.find((account) => account.id === accountToAdjustId) || null,
    [accountToAdjustId, accounts]
  );
  const transferFromAccount = useMemo(
    () => accounts.find((account) => account.id === transferFromAccountId) || null,
    [transferFromAccountId, accounts]
  );
  const transferToOptions = useMemo(
    () => accounts.filter((account) => account.id !== transferFromAccountId),
    [accounts, transferFromAccountId]
  );

  // Handlers para o AccountCard
  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (account) {
      setAccountToDelete(account);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    
    try {
      await deleteAccount(accountToDelete.id);
      toast.success('Conta excluída com sucesso!');
      setAccountToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir conta. Tente novamente.');
    }
  };

  const handleArchive = async (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    
    if (!confirm(`Tem certeza que deseja arquivar a conta "${account.name}"? Ela ficará inativa mas seus dados serão mantidos.`)) {
      return;
    }
    
    try {
      await updateAccount(id, { is_active: false });
      toast.success('Conta arquivada com sucesso!');
    } catch (error) {
      toast.error('Erro ao arquivar conta. Tente novamente.');
    }
  };

  const handleViewTransactions = (accountId: string) => {
    // Redirecionar para página de transações com filtro por conta
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
      toast.error('Informe um saldo valido para a conta.');
      return;
    }

    try {
      setIsAdjustingBalance(true);
      await updateAccount(accountToAdjust.id, { 
        current_balance: parsedBalance,
      });
      await fetchAccounts();
      toast.success('Saldo ajustado com sucesso!');
      setAdjustBalanceDialogOpen(false);
      setAccountToAdjustId('');
      setNewBalance('');
      setAdjustmentNote('');
    } catch (error) {
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
      toast.error('Cadastre pelo menos duas contas para realizar uma transferencia.');
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
      toast.error('Informe um valor valido para a transferencia.');
      return;
    }

    const sourceAccount = accounts.find((account) => account.id === transferFromAccountId);
    const destinationAccount = accounts.find((account) => account.id === transferToAccountId);

    if (!sourceAccount || !destinationAccount) {
      toast.error('Nao foi possivel localizar as contas selecionadas.');
      return;
    }

    if (Number(sourceAccount.current_balance) < parsedAmount) {
      toast.error('Saldo insuficiente na conta de origem.');
      return;
    }

    const description = transferDescription.trim() || `Transferencia para ${destinationAccount.name}`;
    const expectedSourceBalance = Number(sourceAccount.current_balance) - parsedAmount;
    const expectedDestinationBalance = Number(destinationAccount.current_balance) + parsedAmount;

    try {
      setIsSubmittingTransfer(true);
      await addTransaction({
        type: 'transfer',
        account_id: transferFromAccountId,
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

      if (refreshedAccountsError) {
        throw refreshedAccountsError;
      }

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

        if (sourceUpdateError) {
          throw sourceUpdateError;
        }

        const { error: destinationUpdateError } = await supabase
          .from('accounts')
          .update({
            current_balance: expectedDestinationBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transferToAccountId);

        if (destinationUpdateError) {
          throw destinationUpdateError;
        }
      }

      await fetchAccounts();

      toast.success('Transferencia realizada com sucesso!');
      setTransferDialogOpen(false);
      setTransferFromAccountId('');
      setTransferToAccountId('');
      setTransferAmount('');
      setTransferDescription('');
      setTransferDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao transferir saldo:', error);
      toast.error('Erro ao realizar transferencia. Tente novamente.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Handler para salvar conta (criar ou editar)
  const handleSave = async (data: AccountFormData) => {
    try {
      if (selectedAccount) {
        // Editar conta existente
        await updateAccount(selectedAccount.id, data);
        toast.success('Conta atualizada com sucesso!');
      } else {
        // Criar nova conta
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
    } catch (error) {
      toast.error('Erro ao salvar conta. Tente novamente.');
    }
  };

  // Handler para abrir dialog de nova conta
  const handleNewAccount = () => {
    setSelectedAccount(undefined);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando contas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Contas"
        subtitle="Gerencie suas contas bancárias e carteiras"
        icon={<Wallet size={24} />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleOpenTransferDialog}>
              <ArrowLeftRight className="mr-2" size={16} />
              Transferência
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenAdjustBalanceDialog}>
              <DollarSign className="mr-2" size={16} />
              Ajustar Saldo
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              size="sm" 
              onClick={handleNewAccount}
            >
              <Plus className="mr-2" size={16} />
              Nova Conta
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Saldo Total Geral */}
          <Card className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <div>
              <h3 className="text-sm font-medium text-white/80">Saldo Total Geral</h3>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
          </Card>

          {/* Card 2: Contas Bancárias */}
          <Card className="p-6 bg-white border border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Contas Bancárias</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(bankBalance)}</p>
            </div>
          </Card>

          {/* Card 3: Carteira/Dinheiro */}
          <Card className="p-6 bg-white border border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Carteira/Dinheiro</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(walletBalance)}</p>
            </div>
          </Card>
        </div>

        {/* Seção "Suas Contas" */}
        <div>
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{ gridAutoRows: '1fr' }}
          >
            {/* Mapear accounts */}
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

            {/* Card "+ Criar Nova Conta" */}
            <Card 
              className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group h-full min-h-[320px]"
              onClick={handleNewAccount}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-3">
                <Plus
                  size={48}
                  className="text-gray-400 group-hover:text-purple-500"
                />
                <h3 className="text-lg font-semibold text-gray-700">Criar Nova Conta</h3>
                <p className="text-sm text-gray-500">Adicione uma conta bancária ou carteira</p>
              </CardContent>
            </Card>
          </div>

          {/* Mensagem quando não há contas */}
          {accounts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wallet size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma conta encontrada</p>
              <p className="text-sm">Crie sua primeira conta para começar a gerenciar suas finanças</p>
            </div>
          )}
        </div>

        {/* Dialog para criar/editar conta */}
        <AccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={selectedAccount}
          onSave={handleSave}
        />

        {/* Dialog de confirmação de exclusão */}
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
            <DialogHeader>
              <DialogTitle>Ajustar Saldo</DialogTitle>
              <DialogDescription>
                Atualize manualmente o saldo atual de uma conta existente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta</label>
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
                <p className="text-sm text-muted-foreground">
                  Saldo atual: <strong>{formatCurrency(accountToAdjust.current_balance)}</strong>
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Novo saldo</label>
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
                <label className="text-sm font-medium">Observacao opcional</label>
                <Textarea
                  value={adjustmentNote}
                  onChange={(event) => setAdjustmentNote(event.target.value)}
                  placeholder="Ex: saldo conciliado com extrato bancario"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustBalanceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmAdjustBalance}
                className="bg-purple-600 hover:bg-purple-700"
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
            <DialogHeader>
              <DialogTitle>Transferência</DialogTitle>
              <DialogDescription>
                Mova saldo entre contas sem sair desta tela.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conta origem</label>
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
                      Saldo disponivel: {formatCurrency(transferFromAccount.current_balance)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Conta destino</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor</label>
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
                  <label className="text-sm font-medium">Data</label>
                  <DatePickerInput
                    value={transferDate}
                    onChange={(value) => setTransferDate(value)}
                    placeholder="Selecione a data da transferencia"
                    disableFuture={true}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descricao opcional</label>
                <Textarea
                  value={transferDescription}
                  onChange={(event) => setTransferDescription(event.target.value)}
                  placeholder="Ex: transferencia para reserva de emergencia"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleTransfer}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isSubmittingTransfer}
              >
                {isSubmittingTransfer ? 'Transferindo...' : 'Confirmar transferencia'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};