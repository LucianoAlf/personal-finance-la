import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Wallet, ArrowLeftRight, DollarSign } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountDialog, type AccountFormData } from '@/components/accounts/AccountDialog';

import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/formatters';
import type { Account } from '@/types/accounts';

export const Contas: React.FC = () => {
  const { accounts, loading, error, getTotalBalance, getBalanceByType, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();

  const totalBalance = getTotalBalance();
  const bankBalance = getBalanceByType('bank');
  const walletBalance = getBalanceByType('wallet');

  // Handlers para o AccountCard
  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      toast.success('Conta arquivada com sucesso!');
    } catch (error) {
      toast.error('Erro ao arquivar conta. Tente novamente.');
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
        await addAccount(data);
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
        actions={
          <>
            <Button variant="outline" size="sm">
              <ArrowLeftRight className="mr-2" size={16} />
              Transferência
            </Button>
            <Button variant="outline" size="sm">
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
      </div>
    </div>
  );
};