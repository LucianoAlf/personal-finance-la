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
        <Flame className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Streak de Consistência</h3>
      </div>
      {subtitle ? (
        <p className="text-xs text-gray-500 leading-snug mb-1">{subtitle}</p>
      ) : null}

      <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Streak atual</p>
            <p className="text-3xl font-bold text-orange-700">{currentStreak}</p>
            <p className="text-xs text-orange-700/80">
              {currentStreak === 1 ? 'dia seguido de atividade no app' : 'dias seguidos de atividade no app'}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 text-right shadow-sm">
            <p className="text-xs text-gray-500">Próxima marca</p>
            <p className="text-lg font-semibold text-gray-900">
              {nextMilestone ? `${nextMilestone} dias` : 'Recorde aberto'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progresso para a próxima marca</span>
            <span>{Math.round(progressToNextMilestone)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/70 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
              style={{ width: `${progressToNextMilestone}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-gray-700">
            <CalendarCheck2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Atividade de hoje</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {activeToday ? 'Registrada e já contando para o streak.' : 'Ainda não registrada hoje.'}
          </p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">Recorde</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{bestStreak}</p>
          <p className="text-xs text-gray-500">
            {bestStreak === 1 ? 'melhor dia seguido' : 'melhores dias seguidos'}
          </p>
        </div>
      </div>
    </div>
  );
}
