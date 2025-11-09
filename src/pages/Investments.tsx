import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentPrices } from '@/hooks/useInvestmentPrices';
import { PriceUpdater } from '@/components/investments/PriceUpdater';
import { MarketStatus } from '@/components/investments/MarketStatus';
import { formatCurrency } from '@/utils/formatters';
import { Plus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export function Investments() {
  const { investments, loading, refresh } = useInvestments();

  // Preparar items para buscar cotações
  const priceItems = investments.map((inv) => ({
    ticker: inv.ticker || inv.name,
    type: inv.type === 'stock' || inv.type === 'real_estate'
      ? ('stock' as const)
      : inv.type === 'crypto'
      ? ('crypto' as const)
      : ('treasury' as const),
    investmentId: inv.id,
  }));

  // Hook de cotações em tempo real
  const {
    quotes,
    loading: quotesLoading,
    lastUpdate,
    refresh: refreshPrices,
  } = useInvestmentPrices({
    items: priceItems,
    autoRefresh: true,
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando investimentos...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (investments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Investimentos"
          subtitle="Acompanhe sua carteira de investimentos"
          icon={<TrendingUp size={24} />}
          actions={
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Novo Investimento
            </Button>
          }
        />
        <div className="p-6">
          <Card className="p-12 text-center">
            <div className="mb-4">
              <TrendingUp size={48} className="mx-auto text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum investimento cadastrado</h3>
            <p className="text-gray-600 mb-6">
              Comece a construir seu portfólio adicionando seu primeiro investimento
            </p>
            <Button>
              <Plus size={16} className="mr-2" />
              Adicionar Primeiro Investimento
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Calcular totais (usando campos do banco)
  const totalInvested = investments.reduce(
    (sum, inv) => sum + (inv.total_invested || 0),
    0
  );
  const totalCurrent = investments.reduce(
    (sum, inv) => sum + (inv.current_value || inv.total_invested || 0),
    0
  );
  const totalGain = totalCurrent - totalInvested;
  const percentGain = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock: 'Ação',
      fund: 'Fundo',
      treasury: 'Tesouro Direto',
      crypto: 'Criptomoeda',
      real_estate: 'Imóveis',
      other: 'Outro',
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
          <div className="flex items-center gap-3">
            <MarketStatus />
            <PriceUpdater
              onRefresh={refreshPrices}
              lastUpdate={lastUpdate}
              loading={quotesLoading}
            />
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Novo Investimento
            </Button>
          </div>
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
                  {investments.map((investment) => {
                    const totalInv = investment.total_invested || 0;
                    const totalCur = investment.current_value || investment.total_invested || 0;
                    const gain = totalCur - totalInv;
                    const percentG = totalInv > 0 ? (gain / totalInv) * 100 : 0;

                    return (
                      <tr key={investment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{getTypeLabel(investment.type)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{investment.ticker || investment.name}</td>
                        <td className="py-3 px-4 text-sm text-right">{investment.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(investment.purchase_price)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(investment.current_price || investment.purchase_price)}
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
