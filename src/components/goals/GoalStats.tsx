import { Card } from '@/components/ui/card';
import { Target, CheckCircle2, AlertCircle, Flame, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { GoalStats as GoalStatsType } from '@/types/database.types';

interface GoalStatsProps {
  stats: GoalStatsType;
}

export function GoalStats({ stats }: GoalStatsProps) {
  return (
    <Card className="p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary-600" />
        Resumo Geral
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total de metas */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{stats.total_goals}</div>
          <div className="text-sm text-gray-600 mt-1">Metas Ativas</div>
        </div>

        {/* Cumpridas */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-3xl font-bold text-green-600">{stats.completed_goals}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">Cumpridas</div>
        </div>

        {/* Próximas do limite */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-3xl font-bold text-orange-600">{stats.exceeded_goals}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">Excedidas</div>
        </div>

        {/* Melhor streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-3xl font-bold text-orange-500">{stats.best_streak}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">Melhor Streak</div>
        </div>

        {/* Total economizado */}
        <div className="text-center col-span-2 md:col-span-1">
          <div className="flex items-center justify-center gap-1">
            <PiggyBank className="h-5 w-5 text-blue-600" />
            <span className="text-2xl md:text-3xl font-bold text-blue-600">
              {formatCurrency(stats.total_savings)}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-1">Total Economizado</div>
        </div>
      </div>

      {/* Taxa de conclusão */}
      {stats.total_goals > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Taxa de Conclusão</span>
            <span className="text-lg font-bold text-primary-600">{stats.completion_rate}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion_rate}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
