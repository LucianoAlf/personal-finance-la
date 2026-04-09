import { CalendarCheck2, Flame, Trophy } from 'lucide-react';

interface StreakHeatmapProps {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string | Date | null;
  subtitle?: string;
}

export function StreakHeatmap({ currentStreak, bestStreak, lastActivityDate, subtitle }: StreakHeatmapProps) {
  const today = new Date().toISOString().slice(0, 10);
  const normalizedLastActivityDate = lastActivityDate instanceof Date
    ? lastActivityDate.toISOString().slice(0, 10)
    : lastActivityDate ?? null;
  const activeToday = normalizedLastActivityDate === today;
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((milestone) => milestone > currentStreak) ?? null;
  const progressToNextMilestone = nextMilestone
    ? Math.min(100, (currentStreak / nextMilestone) * 100)
    : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning shadow-sm">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Streak de Consistência</h3>
          <p className="text-sm text-muted-foreground">Ritmo e frequência da sua evolução.</p>
        </div>
      </div>
      {subtitle ? (
        <p className="text-xs text-muted-foreground leading-snug mb-1">{subtitle}</p>
      ) : null}

      <div
        data-testid="goals-progress-streak-current"
        className="rounded-[24px] border border-warning/20 bg-surface-elevated p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Streak atual</p>
            <p className="text-3xl font-bold text-warning">{currentStreak}</p>
            <p className="text-xs text-warning/85">
              {currentStreak === 1 ? 'dia seguido de atividade no app' : 'dias seguidos de atividade no app'}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-right shadow-sm">
            <p className="text-xs text-muted-foreground">Próxima marca</p>
            <p className="text-lg font-semibold text-foreground">
              {nextMilestone ? `${nextMilestone} dias` : 'Recorde aberto'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso para a próxima marca</span>
            <span>{Math.round(progressToNextMilestone)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-overlay/85 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
              style={{ width: `${progressToNextMilestone}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          data-testid="goals-progress-streak-record"
          className="rounded-[20px] border border-border/70 bg-surface-elevated p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="flex items-center gap-2 text-foreground">
            <CalendarCheck2 className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">Atividade de hoje</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeToday ? 'Registrada e já contando para o streak.' : 'Ainda não registrada hoje.'}
          </p>
        </div>

        <div className="rounded-[20px] border border-border/70 bg-surface-elevated p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 text-foreground">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Recorde</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{bestStreak}</p>
          <p className="text-xs text-muted-foreground">
            {bestStreak === 1 ? 'melhor dia seguido' : 'melhores dias seguidos'}
          </p>
        </div>
      </div>
    </div>
  );
}
