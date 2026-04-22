import { Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DesktopOnlyWidgetCard } from '@/components/investments/DesktopOnlyWidgetCard';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
}

interface GamificationMobileLayoutProps {
  level: number;
  levelName: string;
  xp: number;
  xpToNextLevel: number;
  xpProgressPct: number;
  streakDays: number;
  achievements: Achievement[];
}

export function GamificationMobileLayout({
  level,
  levelName,
  xp,
  xpToNextLevel,
  xpProgressPct,
  streakDays,
  achievements,
}: GamificationMobileLayoutProps) {
  const pct = Math.max(0, Math.min(100, xpProgressPct));
  return (
    <div className="lg:hidden space-y-3 pb-4 pt-2">
      <section className="mx-2 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/15 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-md">
            <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Nível {level} · {levelName}
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground [font-variant-numeric:tabular-nums]">
              {xp.toLocaleString('pt-BR')} XP
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {streakDays} dias de streak
            </div>
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso de XP até o próximo nível"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/40"
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {xpToNextLevel.toLocaleString('pt-BR')} XP até o próximo nível
        </div>
      </section>

      <h3 className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Conquistas
      </h3>
      <div className="grid grid-cols-4 gap-2 px-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            data-testid="achievement"
            data-unlocked={a.unlocked ? 'true' : 'false'}
            aria-label={`${a.name} — ${a.unlocked ? 'desbloqueada' : 'bloqueada'}`}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center',
              a.unlocked
                ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/15 to-blue-500/15'
                : 'border-border/40 bg-surface-elevated/40',
            )}
          >
            <span aria-hidden="true" className={cn('text-xl', !a.unlocked && 'opacity-40')}>
              {a.icon}
            </span>
            <span className="text-[9px] leading-tight text-muted-foreground line-clamp-2">{a.name}</span>
          </div>
        ))}
      </div>

      <DesktopOnlyWidgetCard title="Heatmap de streak" description="Visualização completa no desktop" />
    </div>
  );
}
