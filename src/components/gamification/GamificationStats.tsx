import { Trophy, Zap, Target, TrendingUp, Rocket, CheckCircle2, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserGamification } from '@/types/database.types';
import { getLevelTitle } from '@/hooks/useGamification';
import { cn } from '@/lib/cn';

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
    <div
      data-testid="goals-progress-stats-shell"
      className="space-y-4 rounded-[24px] border border-border/70 bg-surface-elevated p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Seu Progresso</span>
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

      <div
        data-testid="goals-progress-next-level-shell"
        className="rounded-[20px] border border-border/70 bg-background/65 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="h-4 w-4 text-info" />
          <span className="text-sm font-semibold text-foreground">Próximo Nível</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-surface-overlay/85 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-info to-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-info">{remaining.toLocaleString('pt-BR')} XP</span> para{' '}
            <span className="font-semibold text-foreground">Nível {nextLevel} - {nextTitle}</span>
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
    yellow: 'border-warning/20 bg-warning/10 text-warning',
    purple: 'border-primary/20 bg-primary/10 text-primary',
    indigo: 'border-info/20 bg-info/10 text-info',
    green: 'border-success/20 bg-success/10 text-success',
  };

  return (
    <div className={cn('rounded-[20px] border p-3 transition-all hover:scale-[1.02]', colorClasses[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold leading-6 text-foreground">{value}</div>
      {subtitle && <div className="text-xs opacity-80 text-foreground/80">{subtitle}</div>}
    </div>
  );
}
