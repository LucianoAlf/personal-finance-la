import { Card } from '@/components/ui/card';
import { Trophy, Lock, Flame, Star, CheckCircle2, PiggyBank, Gem, Target } from 'lucide-react';
import type { GoalStats, FinancialGoal } from '@/types/database.types';

interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  condition: (stats: GoalStats, goals?: FinancialGoal[]) => boolean;
}

const BADGES: Badge[] = [
  {
    id: 'first_goal',
    icon: 'first_goal',
    name: 'Primeira Meta',
    description: 'Criar sua primeira meta',
    condition: (stats) => stats.total_goals >= 1,
  },
  {
    id: 'streak_3',
    icon: 'streak_3',
    name: 'Sequência de 3',
    description: '3 meses consecutivos cumprindo metas',
    condition: (stats) => stats.best_streak >= 3,
  },
  {
    id: 'streak_6',
    icon: 'streak_6',
    name: 'Sequência de 6',
    description: '6 meses consecutivos',
    condition: (stats) => stats.best_streak >= 6,
  },
  {
    id: 'streak_12',
    icon: 'streak_12',
    name: 'Ano Perfeito',
    description: '12 meses consecutivos',
    condition: (stats) => stats.best_streak >= 12,
  },
  {
    id: 'all_categories',
    icon: 'all_categories',
    name: 'Mestre do Controle',
    description: 'Metas em 10 categorias diferentes',
    condition: (stats, goals = []) => {
      const uniqueCategories = new Set(
        goals.filter(g => g.goal_type === 'spending_limit' && g.category_id)
             .map(g => g.category_id)
      );
      return uniqueCategories.size >= 10;
    },
  },
  {
    id: 'first_completed',
    icon: 'first_completed',
    name: 'Primeira Conquista',
    description: 'Completar sua primeira meta',
    condition: (stats) => stats.completed_goals >= 1,
  },
  {
    id: 'savings_10k',
    icon: 'savings_10k',
    name: 'Economista',
    description: 'Economizar R$ 10.000',
    condition: (stats) => stats.total_savings >= 10000,
  },
  {
    id: 'savings_50k',
    icon: 'savings_50k',
    name: 'Investidor',
    description: 'Economizar R$ 50.000',
    condition: (stats) => stats.total_savings >= 50000,
  },
];

interface GoalBadgesProps {
  stats: GoalStats;
  goals?: FinancialGoal[];
}

export function GoalBadges({ stats, goals = [] }: GoalBadgesProps) {
  const unlockedBadges = BADGES.filter(badge => badge.condition(stats, goals));
  const lockedBadges = BADGES.filter(badge => !badge.condition(stats, goals));

  const renderIcon = (id: string, className?: string) => {
    switch (id) {
      case 'first_goal':
        return <Target className={className} />;
      case 'streak_3':
      case 'streak_6':
        return <Flame className={className} />;
      case 'streak_12':
        return <Trophy className={className} />;
      case 'all_categories':
        return <Star className={className} />;
      case 'first_completed':
        return <CheckCircle2 className={className} />;
      case 'savings_10k':
        return <PiggyBank className={className} />;
      case 'savings_50k':
        return <Gem className={className} />;
      default:
        return <Star className={className} />;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600" />
        Conquistas ({unlockedBadges.length}/{BADGES.length})
      </h3>

      <div className="space-y-4">
        {/* Badges desbloqueados */}
        {unlockedBadges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Desbloqueadas</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-3 text-center transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-center mb-1">
                    {renderIcon(badge.icon, 'h-5 w-5 text-yellow-700')}
                  </div>
                  <div className="text-xs font-semibold text-gray-900">{badge.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges bloqueados */}
        {lockedBadges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Bloqueadas</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 text-center opacity-60"
                >
                  <div className="relative">
                    <div className="flex items-center justify-center mb-1 filter grayscale">
                      {renderIcon(badge.icon, 'h-5 w-5 text-gray-600')}
                    </div>
                    <Lock className="h-4 w-4 text-gray-500 absolute top-0 right-0" />
                  </div>
                  <div className="text-xs font-semibold text-gray-700">{badge.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensagem de incentivo */}
        {lockedBadges.length > 0 && (
          <div className="text-center text-sm text-gray-600 pt-4 border-t">
            Continue progredindo para desbloquear mais {lockedBadges.length} {lockedBadges.length === 1 ? 'conquista' : 'conquistas'}! 🚀
          </div>
        )}
      </div>
    </Card>
  );
}
