import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconBox } from '@/components/shared/IconBox';
import { mockAccounts } from '@/utils/mockData';
import { formatCurrency } from '@/utils/formatters';
import { BANKS } from '@/utils/constants';
import { Plus, ArrowLeftRight, TrendingUp, Wallet, Landmark, PiggyBank, MoreVertical } from 'lucide-react';

export function Accounts() {
  const totalBalance = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const checkingTotal = mockAccounts
    .filter((acc) => acc.type === 'checking')
    .reduce((sum, acc) => sum + acc.balance, 0);
  const walletsTotal = mockAccounts
    .filter((acc) => acc.type === 'wallet')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return Landmark;
      case 'savings':
        return PiggyBank;
      case 'wallet':
        return Wallet;
      case 'investment':
        return TrendingUp;
      default:
        return Wallet;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      wallet: 'Carteira',
      investment: 'Investimento',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Contas"
        subtitle="Gerencie suas contas bancárias e carteiras"
        actions={
          <>
            <Button size="sm" variant="outline">
              <ArrowLeftRight size={16} className="mr-1" />
              Transferência
            </Button>
            <Button size="sm" variant="outline">
              Ajustar Saldo
            </Button>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Nova Conta
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <p className="text-sm opacity-80 mb-1">Saldo Total Geral</p>
              <h2 className="text-3xl font-bold">{formatCurrency(totalBalance)}</h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Contas Bancárias</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatCurrency(checkingTotal)}
              </h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Carteiras/Dinheiro</p>
              <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(walletsTotal)}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAccounts.map((account) => {
            const bank = BANKS.find((b) => b.value === account.bank);
            const Icon = getAccountIcon(account.type);

            return (
              <Card
                key={account.id}
                className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <IconBox
                      icon={Icon}
                      gradient="purple"
                      size="md"
                      className="flex-shrink-0"
                    />
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={20} className="text-gray-600" />
                    </button>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-1">{account.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {getAccountTypeLabel(account.type)} • {bank?.label || 'Outro'}
                  </p>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Saldo Atual</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {formatCurrency(account.current_balance)}
                    </h2>
                  </div>

                  <Badge variant="success">Ativa</Badge>
                </CardContent>
              </Card>
            );
          })}

          {/* Botão Nova Conta */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
              <Plus size={48} className="text-gray-400 group-hover:text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Criar Nova Conta</h3>
              <p className="text-sm text-gray-600 text-center">
                Adicione uma conta bancária ou carteira
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
