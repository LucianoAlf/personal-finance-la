import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockInvestments } from '@/utils/mockData';
import { formatCurrency } from '@/utils/formatters';
import { Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export function Investments() {
  const totalInvested = mockInvestments.reduce(
    (sum, inv) => sum + inv.average_price * inv.quantity,
    0
  );
  const totalCurrent = mockInvestments.reduce(
    (sum, inv) => sum + (inv.current_price || inv.average_price) * inv.quantity,
    0
  );
  const totalGain = totalCurrent - totalInvested;
  const percentGain = (totalGain / totalInvested) * 100;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock: 'Ação',
      fixed_income: 'Renda Fixa',
      fund: 'Fundo',
      crypto: 'Criptomoeda',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Investimentos"
        subtitle="Acompanhe sua carteira de investimentos"
        icon={<TrendingUp size={24} />}
        actions={
          <>
            <Button size="sm" variant="outline">
              <RefreshCw size={16} className="mr-1" />
              Atualizar Cotações
            </Button>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Novo Investimento
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Investido</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalInvested)}
              </h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Valor Atual</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalCurrent)}
              </h2>
            </CardContent>
          </Card>

          <Card className={totalGain >= 0 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Valorização</p>
              <h2 className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalGain)}
              </h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Rentabilidade</p>
              <div className="flex items-center space-x-2">
                {percentGain >= 0 ? (
                  <TrendingUp className="text-green-600" size={24} />
                ) : (
                  <TrendingDown className="text-red-600" size={24} />
                )}
                <h2 className={`text-2xl font-bold ${percentGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {percentGain.toFixed(2)}%
                </h2>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Investimentos */}
        <Card>
          <CardHeader>
            <CardTitle>Portfólio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Símbolo</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Quantidade</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Preço Médio</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Cotação</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Rentabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInvestments.map((investment) => {
                    const totalInv = investment.average_price * investment.quantity;
                    const totalCur =
                      (investment.current_price || investment.average_price) * investment.quantity;
                    const gain = totalCur - totalInv;
                    const percentG = (gain / totalInv) * 100;

                    return (
                      <tr key={investment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{getTypeLabel(investment.type)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{investment.symbol}</td>
                        <td className="py-3 px-4 text-sm text-right">{investment.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(investment.average_price)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(investment.current_price || investment.average_price)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCurrency(totalCur)}
                        </td>
                        <td
                          className={`py-3 px-4 text-sm text-right font-semibold ${
                            percentG >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {percentG >= 0 ? '+' : ''}
                          {percentG.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
