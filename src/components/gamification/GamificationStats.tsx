import { Trophy, Zap, Target, TrendingUp, Rocket, CheckCircle2, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserGamification } from '@/types/database.types';
import { getLevelTitle } from '@/hooks/useGamification';

interface GamificationStatsProps {
  profile: UserGamification | null;
  unlockedBadgesCount: number;
  totalBadges: number;
  levelTitle: string;
  xpForNextLevel: number;
  xpProgress: number;
  totalGoals: number;
  activeGoals: number;
  successRate: number;
}

export function GamificationStats({
  profile,
  unlockedBadgesCount,
  totalBadges,
  levelTitle,
  xpForNextLevel,
  xpProgress,
  totalGoals,
  activeGoals,
  successRate,
}: GamificationStatsProps) {
  const nextLevel = (profile?.level || 1) + 1;
  const nextTitle = getLevelTitle(nextLevel);
  const remaining = Math.max(0, (xpForNextLevel || 0) - (profile?.xp || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-gray-700" />
        <span className="text-sm font-semibold text-gray-700">Seu Progresso</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Trophy}
          label="Conquistas"
          value={`${unlockedBadgesCount}/${totalBadges}`}
          color="yellow"
        />
        <StatCard
          icon={Zap}
          label="Nível"
          value={`${profile?.level ?? 1}`}
          subtitle={levelTitle}
          color="purple"
        />
        <StatCard
          icon={Target}
          label="XP Total"
          value={(profile?.total_xp || 0).toLocaleString('pt-BR')}
          color="indigo"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa Sucesso"
          value={`${successRate}%`}
          color="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Metas Ativas"
          value={`${activeGoals}/${totalGoals}`}
          color="green"
        />
      </div>

      <div className="pt-3 border-t">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Próximo Nível</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">
            Faltam <span className="font-semibold text-blue-600">{remaining.toLocaleString('pt-BR')} XP</span> para{' '}
            <span className="font-semibold">Nível {nextLevel} - {nextTitle}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  color: 'yellow' | 'purple' | 'indigo' | 'green';
}

function StatCard({ icon: Icon, label, value, subtitle, color }: StatCardProps) {
  const colorClasses: Record<StatCardProps['color'], string> = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold leading-6">{value}</div>
      {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
    </div>
  );
}
