import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockCreditCards } from '@/utils/mockData';
import { formatCurrency } from '@/utils/formatters';
import { Plus, DollarSign, CreditCard } from 'lucide-react';

export function CreditCards() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Cartões de Crédito"
        subtitle="Gerencie suas faturas e limites"
        icon={<CreditCard size={24} />}
        actions={
          <>
            <Button size="sm" variant="outline">
              <DollarSign size={16} className="mr-1" />
              Pagar Fatura
            </Button>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Novo Cartão
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCreditCards.map((card) => {
            const percentUsed = (card.current_balance / card.limit) * 100;
            const isHighUsage = percentUsed > 80;

            return (
              <Card
                key={card.id}
                className="hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div
                  className="h-48 p-6 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-t-lg flex flex-col justify-between"
                  style={{ backgroundColor: card.color }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase">{card.brand}</span>
                    <Badge
                      variant={
                        card.current_balance > 0 ? 'warning' : 'success'
                      }
                      className="bg-white/20 text-white"
                    >
                      {card.current_balance > 0 ? 'Fatura Aberta' : 'Paga'}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm opacity-80 mb-1">{card.name}</p>
                    <p className="text-xl font-mono">•••• •••• •••• {card.last_four_digits}</p>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fatura Atual</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {formatCurrency(card.current_balance)}
                    </h3>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Limite Utilizado</span>
                      <span
                        className={
                          isHighUsage ? 'text-red-600 font-semibold' : 'text-gray-900'
                        }
                      >
                        {percentUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isHighUsage ? 'bg-red-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Limite: {formatCurrency(card.limit)}
                    </p>
                  </div>

                  <div className="pt-4 border-t flex items-center justify-between text-sm">
                    <span className="text-gray-600">Vencimento</span>
                    <span className="font-semibold">{card.due_date}/01</span>
                  </div>

                  <Button className="w-full" variant="outline">
                    Ver Detalhes da Fatura
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Botão Novo Cartão */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[350px]">
              <Plus size={48} className="text-gray-400 group-hover:text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Adicionar Cartão</h3>
              <p className="text-sm text-gray-600 text-center">
                Cadastre um novo cartão de crédito
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
