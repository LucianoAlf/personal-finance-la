import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface XPProgressBarProps {
  level: number;
  xp: number;
  xpForNextLevel: number;
  levelTitle: string;
  totalXP: number;
}

export function XPProgressBar({
  level,
  xp,
  xpForNextLevel,
  levelTitle,
  totalXP,
}: XPProgressBarProps) {
  const progress = xpForNextLevel > 0 ? (xp / xpForNextLevel) * 100 : 0;
  const xpRemaining = xpForNextLevel - xp;

  const getGradientColor = () => {
    if (progress < 33) return 'from-blue-500 to-blue-600';
    if (progress < 66) return 'from-purple-500 to-purple-600';
    return 'from-yellow-500 to-yellow-600';
  };

  const milestoneLineClass =
    progress >= 66 ? 'bg-white/25 dark:bg-white/18' : 'bg-slate-500/35 dark:bg-slate-400/28';

  return (
    <Card
      data-testid="goals-progress-xp-shell"
      className="relative overflow-hidden rounded-[28px] border border-border/70 bg-surface p-6 shadow-[0_18px_46px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="pointer-events-none absolute -left-10 top-4 h-28 w-28 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute right-[-2.5rem] top-[-1rem] h-32 w-32 rounded-full bg-info/10 blur-3xl" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-violet-500 via-primary to-sky-500 text-white shadow-[0_16px_28px_rgba(91,33,182,0.28)] ring-1 ring-white/10">
            {level}
          </div>
          <div>
            <h3 className="text-[1.85rem] font-semibold tracking-tight text-foreground">
              Nível {level}
            </h3>
            <p className="text-sm font-medium text-primary">{levelTitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1.5 text-primary">
            <Zap className="h-4 w-4 fill-current" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">
              XP Total
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {totalXP.toLocaleString('pt-BR')} XP
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            {xp.toLocaleString('pt-BR')} / {xpForNextLevel.toLocaleString('pt-BR')} XP
          </span>
          <span className="font-bold text-primary">{Math.round(progress)}%</span>
        </div>

        <div className="relative h-4 overflow-hidden rounded-full bg-surface-overlay/90 shadow-inner ring-1 ring-border/60">
          <motion.div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_10px_22px_rgba(59,130,246,0.25)]',
              getGradientColor()
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 1,
              ease: 'easeOut',
              type: 'spring',
              stiffness: 50,
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>

          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={cn('absolute top-0 bottom-0 w-px', milestoneLineClass)}
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {xpRemaining > 0 ? (
            <>
              Faltam <span className="font-bold text-primary">{xpRemaining.toLocaleString('pt-BR')} XP</span> para o próximo nível! 🚀
            </>
          ) : (
            <>Parabéns! Você atingiu o nível máximo! 👑</>
          )}
        </p>
      </div>

      {progress >= 90 && progress < 100 && (
        <motion.div
          className="mt-3 text-center text-xs font-semibold text-warning"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          🔥 Quase lá! Continue assim!
        </motion.div>
      )}
    </Card>
  );
}
