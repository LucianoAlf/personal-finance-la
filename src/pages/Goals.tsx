import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockGoals } from '@/utils/mockData';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Plus, Plane, Shield, Laptop, TrendingUp } from 'lucide-react';

const iconMap: Record<string, any> = {
  Plane,
  Shield,
  Laptop,
};

export function Goals() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Metas Financeiras"
        subtitle="Acompanhe seus objetivos e conquiste seus sonhos"
        actions={
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            Nova Meta
          </Button>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGoals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;
            const Icon = iconMap[goal.icon] || TrendingUp;

            const getProgressColor = (percent: number) => {
              if (percent >= 100) return 'bg-green-500';
              if (percent >= 75) return 'bg-blue-500';
              if (percent >= 50) return 'bg-yellow-500';
              if (percent >= 25) return 'bg-orange-500';
              return 'bg-red-500';
            };

            return (
              <Card
                key={goal.id}
                className="hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Icon size={28} className="text-white" />
                    </div>
                    <Badge variant={progress >= 75 ? 'success' : 'warning'}>
                      {progress.toFixed(0)}%
                    </Badge>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-4">{goal.name}</h3>

                  <div className="space-y-3 mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getProgressColor(progress)}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(goal.current_amount)}
                      </span>
                      <span className="text-gray-600">de {formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Prazo:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(goal.target_date, 'MMM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Faltam:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Aporte sugerido:</span>
                      <span className="font-medium text-purple-600">
                        {formatCurrency(remaining / 12)}/mês
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-2">
                    <Button className="flex-1" size="sm">
                      Adicionar Valor
                    </Button>
                    <Button className="flex-1" size="sm" variant="outline">
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Botão Nova Meta */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[350px]">
              <Plus size={48} className="text-gray-400 group-hover:text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Criar Nova Meta</h3>
              <p className="text-sm text-gray-600 text-center">
                Defina um objetivo financeiro e comece a economizar
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
