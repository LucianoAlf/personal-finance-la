import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function Reports() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Relatórios"
        subtitle="Análises detalhadas da sua vida financeira"
        actions={
          <Button size="sm">
            <Download size={16} className="mr-1" />
            Exportar PDF
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Score Financeiro</h3>
              <h2 className="text-4xl font-bold text-blue-600">78</h2>
              <p className="text-sm text-gray-600 mt-1">Muito bom!</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm text-gray-600 mb-1">Taxa de Economia</h3>
              <h2 className="text-2xl font-bold text-green-600">18.5%</h2>
              <p className="text-sm text-gray-600 mt-1">Meta: 20%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm text-gray-600 mb-1">Patrimônio Líquido</h3>
              <h2 className="text-2xl font-bold text-gray-900">R$ 32.890,50</h2>
              <p className="text-sm text-green-600 mt-1">+8.2% este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm text-gray-600 mb-1">Metas Alcançadas</h3>
              <h2 className="text-2xl font-bold text-purple-600">5</h2>
              <p className="text-sm text-gray-600 mt-1">3 em andamento</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
            <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-gray-500">Gráfico de despesas por categoria</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendências (12 meses)</h3>
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Gráfico de tendências</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução Patrimonial</h3>
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Gráfico de evolução</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
