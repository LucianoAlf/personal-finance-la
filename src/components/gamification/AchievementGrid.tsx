import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Trophy, Lock } from 'lucide-react';
import type { BadgeProgress } from '@/types/database.types';
import { ACHIEVEMENTS, calculateTierProgress, TIER_CONFIG } from '@/config/achievements';
import { cn } from '@/lib/cn';

interface AchievementGridProps {
  badges: BadgeProgress[];
}

export function AchievementGrid({ badges }: AchievementGridProps) {
  // Agrupar conquistas por badge_id
  const groupedAchievements = ACHIEVEMENTS.map(achievement => {
    const userBadges = badges.filter(
      a => a.badge_id === achievement.id
    );

    // Encontrar o tier mais alto desbloqueado
    const unlockedTiers = userBadges
      .filter(a => a.unlocked)
      .map(a => a.tier);

    const highestUnlockedTier = unlockedTiers.includes('gold')
      ? 'gold'
      : unlockedTiers.includes('silver')
      ? 'silver'
      : unlockedTiers.includes('bronze')
      ? 'bronze'
      : null;

    // Pegar progresso do próximo tier
    const nextTierBadge = userBadges.find(a => !a.unlocked);
    const progress = nextTierBadge
      ? calculateTierProgress(
          achievement,
          nextTierBadge.progress,
          highestUnlockedTier
        )
      : {
          // Sem registros para este badge: começar do zero mirando o tier bronze
          percentage: 0,
          nextTarget: achievement.tiers.find(t => t.tier === 'bronze')?.target ?? 0,
          nextTier: 'bronze' as const,
        };

    return {
      ...achievement,
      highestUnlockedTier,
      isUnlocked: highestUnlockedTier !== null,
      progress: progress.percentage,
      nextTarget: progress.nextTarget,
      nextTier: progress.nextTier,
      userBadges,
    };
  });

  const unlockedCount = groupedAchievements.filter(a => a.isUnlocked).length;
  const totalCount = groupedAchievements.length;

  return (
    <Card
      data-testid="goals-progress-achievement-grid-shell"
      className="rounded-[28px] border border-border/70 bg-surface p-6 shadow-[0_18px_44px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Todas as Conquistas
          </h3>
        </div>
        <div className="rounded-full border border-border/60 bg-surface-elevated/70 px-3 py-1 text-sm font-semibold text-muted-foreground">
          {unlockedCount}/{totalCount} desbloqueadas
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {groupedAchievements.map((achievement, index) => {
          const Icon = achievement.icon;
          const tierConfig = achievement.highestUnlockedTier
            ? TIER_CONFIG[achievement.highestUnlockedTier]
            : achievement.nextTier
            ? TIER_CONFIG[achievement.nextTier]
            : TIER_CONFIG.bronze;

          const isUnlocked = achievement.isUnlocked;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <div
                className={`
                  relative p-4 rounded-[22px] border transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
                  ${
                    isUnlocked
                      ? 'border-warning/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.16),rgba(15,23,42,0.03))] hover:scale-[1.02] hover:shadow-[0_18px_32px_rgba(250,204,21,0.12)]'
                      : 'border-border/70 bg-surface-elevated/70 hover:border-primary/15'
                  }
                `}
              >
                <div className="flex items-center justify-center mb-2">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border shadow-md',
                      isUnlocked
                        ? 'border-warning/25 bg-warning/12'
                        : 'border-border/70 bg-background/75'
                    )}
                  >
                    <Icon
                      className={cn('h-6 w-6', isUnlocked ? 'text-warning' : 'text-muted-foreground')}
                    />
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-center text-foreground mb-1 line-clamp-2">
                  {achievement.name}
                </h4>

                <div className="flex items-center justify-center gap-1 mb-2">
                  {achievement.tiers.map((tier) => {
                    const isThisTierUnlocked = achievement.userBadges.some(
                      a => a.tier === tier.tier && a.unlocked
                    );
                    return (
                      <span
                        key={tier.tier}
                        className={`text-sm ${
                          isThisTierUnlocked ? 'opacity-100' : 'opacity-30 grayscale'
                        }`}
                      >
                        {tier.emoji}
                      </span>
                    );
                  })}
                </div>

                {!isUnlocked && achievement.progress > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-surface-overlay/85 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${achievement.progress}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {Math.round(achievement.progress)}%
                    </p>
                  </div>
                )}

                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="relative bg-popover text-popover-foreground text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg ring-1 ring-border/70">
                    <p className="font-semibold mb-1">{achievement.name}</p>
                    <p className="text-muted-foreground">{achievement.description}</p>
                    {!isUnlocked && achievement.nextTarget > 0 && (
                      <p className="text-warning mt-1">
                        Faltam: {achievement.nextTarget.toLocaleString('pt-BR')}
                      </p>
                    )}
                    <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border/70 bg-popover" />
                  </div>
                </div>
              </div>

              {isUnlocked &&
                achievement.userBadges.some(
                  a =>
                    a.unlocked &&
                    a.unlocked_at &&
                    new Date(a.unlocked_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ) && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    NOVO!
                  </motion.div>
                )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border/60 text-center">
        <p className="text-sm text-muted-foreground">
          {unlockedCount < totalCount ? (
            <>
              Continue progredindo para desbloquear mais{' '}
              <span className="font-bold">{totalCount - unlockedCount}</span>{' '}
              {totalCount - unlockedCount === 1 ? 'conquista' : 'conquistas'}! 🚀
            </>
          ) : (
            <>🎉 Parabéns! Você desbloqueou todas as conquistas!</>
          )}
        </p>
      </div>
    </Card>
  );
}
