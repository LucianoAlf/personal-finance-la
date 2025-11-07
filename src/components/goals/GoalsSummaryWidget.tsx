import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight, TrendingUp, AlertCircle, Flame, Trophy } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { formatCurrency } from '@/utils/formatters';

export function GoalsSummaryWidget() {
  const { goals, loading, getStats } = useGoals();
  const navigate = useNavigate();
  const stats = getStats();

  const savingsGoals = goals.filter(g => g.goal_type === 'savings');
  const spendingGoals = goals.filter(g => g.goal_type === 'spending_limit');

  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const savingsPercentage = totalSavingsTarget > 0 
    ? Math.round((totalSavingsCurrent / totalSavingsTarget) * 100) 
    : 0;

  const limitsComplied = spendingGoals.filter(g => g.status === 'active').length;
  const limitsExceeded = spendingGoals.filter(g => g.status === 'exceeded').length;
  const totalSpendingGoals = spendingGoals.length;

  // Contar badges desbloqueados
  const unlockedBadges = [
    stats.total_goals >= 1,
    stats.best_streak >= 3,
    stats.best_streak >= 6,
    stats.completed_goals >= 1,
    stats.total_savings >= 10000,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-600" />
            Suas Metas
          </h3>
        </div>
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Você ainda não tem metas</p>
          <Button onClick={() => navigate('/metas')} size="sm">
            Criar Primeira Meta
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          Suas Metas
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/metas')}
          className="text-primary-600 hover:text-primary-700"
        >
          Ver Todas <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Metas de Economia */}
        {savingsGoals.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {savingsGoals.length} {savingsGoals.length === 1 ? 'meta' : 'metas'} de economia ativas
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(totalSavingsCurrent)}
              </span>
              <span className="text-sm text-blue-700">
                / {formatCurrency(totalSavingsTarget)} ({savingsPercentage}%)
              </span>
            </div>
            <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Metas de Gastos */}
        {spendingGoals.length > 0 && (
          <div className={`p-4 rounded-lg ${limitsExceeded > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-4 w-4 ${limitsExceeded > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <span className={`text-sm font-semibold ${limitsExceeded > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {limitsComplied} de {totalSpendingGoals} limites cumpridos este mês
              </span>
            </div>
            {limitsExceeded > 0 && (
              <p className="text-sm text-red-700">
                {limitsExceeded} {limitsExceeded === 1 ? 'meta excedida' : 'metas excedidas'}
              </p>
            )}
          </div>
        )}

        {/* Melhor Streak */}
        {stats.best_streak > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-gray-700">Melhor streak:</span>
            </div>
            <span className="font-bold text-orange-600">
              {stats.best_streak} {stats.best_streak === 1 ? 'mês' : 'meses'}
            </span>
          </div>
        )}

        {/* Conquistas */}
        {unlockedBadges > 0 && (
          <div className="flex items-center justify-between text-sm pt-3 border-t">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-gray-700">Conquistas desbloqueadas:</span>
            </div>
            <span className="font-bold text-yellow-600">
              {unlockedBadges}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
