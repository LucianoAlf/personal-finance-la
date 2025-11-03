import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Save } from 'lucide-react';

export function Planning() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Planejamento Mensal"
        subtitle="Organize seu orçamento e controle suas despesas"
        actions={
          <>
            <Button size="sm" variant="outline">
              <Copy size={16} className="mr-1" />
              Copiar Mês Anterior
            </Button>
            <Button size="sm">
              <Save size={16} className="mr-1" />
              Salvar Planejamento
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Receitas Planejadas</p>
              <h2 className="text-2xl font-bold text-green-600">R$ 4.500,00</h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Despesas Planejadas</p>
              <h2 className="text-2xl font-bold text-red-600">R$ 3.600,00</h2>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Saldo Previsto</p>
              <h2 className="text-2xl font-bold text-gray-900">R$ 900,00</h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <p className="text-sm opacity-80 mb-1">Economia Planejada</p>
              <h2 className="text-2xl font-bold">20%</h2>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orçamento por Categoria</h3>
            <div className="space-y-4">
              {[
                { name: 'Moradia', planned: 1500, actual: 1450, percent: 97 },
                { name: 'Alimentação', planned: 800, actual: 520, percent: 65 },
                { name: 'Transporte', planned: 500, actual: 380, percent: 76 },
                { name: 'Lazer', planned: 300, actual: 250, percent: 83 },
                { name: 'Saúde', planned: 500, actual: 150, percent: 30 },
              ].map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-600">
                      R$ {category.actual},00 / R$ {category.planned},00
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        category.percent > 90 ? 'bg-red-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${category.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{category.percent}% utilizado</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
