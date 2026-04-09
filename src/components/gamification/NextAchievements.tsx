import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp, Lightbulb, Flame } from 'lucide-react';
import type { BadgeProgress } from '@/types/database.types';
import { ACHIEVEMENTS, calculateTierProgress, TIER_CONFIG, generateInsight } from '@/config/achievements';

interface NextAchievementsProps {
  badges: BadgeProgress[];
}

interface BadgeWithProgress extends BadgeProgress {
  name: string;
  description: string;
  icon: any;
  progressPercentage: number;
  nextTarget: number;
  nextTier: 'bronze' | 'silver' | 'gold' | null;
}

export function NextAchievements({ badges }: NextAchievementsProps) {
  const badgesWithProgress: BadgeWithProgress[] = ACHIEVEMENTS
    .map((achievement) => {
      const achievementBadges = badges.filter((badge) => badge.badge_id === achievement.id);
      const unlockedTiers = achievementBadges
        .filter((badge) => badge.unlocked)
        .map((badge) => badge.tier);

      const highestUnlockedTier = unlockedTiers.includes('gold')
        ? 'gold'
        : unlockedTiers.includes('silver')
        ? 'silver'
        : unlockedTiers.includes('bronze')
        ? 'bronze'
        : null;

      const nextTierRow = achievementBadges.find((badge) => !badge.unlocked);
      const currentProgress = Number(nextTierRow?.progress || 0);
      const { percentage, nextTarget, nextTier } = calculateTierProgress(
        achievement,
        currentProgress,
        highestUnlockedTier
      );

      if (!nextTier) return null;

      return {
        id: nextTierRow?.id || `${achievement.id}-${nextTier}`,
        user_id: nextTierRow?.user_id || '',
        badge_id: achievement.id,
        tier: nextTier,
        progress: currentProgress,
        target: nextTarget,
        unlocked: false,
        unlocked_at: nextTierRow?.unlocked_at || null,
        xp_reward: nextTierRow?.xp_reward || achievement.tiers.find((tier) => tier.tier === nextTier)?.xp_reward || 0,
        created_at: nextTierRow?.created_at || new Date().toISOString(),
        updated_at: nextTierRow?.updated_at || new Date().toISOString(),
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        progressPercentage: percentage,
        nextTarget,
        nextTier,
      } as BadgeWithProgress;
    })
    .filter((achievement): achievement is BadgeWithProgress => achievement !== null)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 3);

  if (badgesWithProgress.length === 0) {
    return (
      <Card
        data-testid="goals-progress-next-achievements-shell"
        className="rounded-[28px] border border-border/70 bg-surface p-6 shadow-[0_18px_44px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Próximas Conquistas</h3>
            <p className="text-sm text-muted-foreground">Continue evoluindo no seu ritmo.</p>
          </div>
        </div>
        <p className="rounded-2xl border border-dashed border-border/70 bg-surface-elevated/65 px-5 py-8 text-center text-sm text-muted-foreground">
          Continue usando o app para desbloquear conquistas! 🎯
        </p>
      </Card>
    );
  }

  return (
    <Card
      data-testid="goals-progress-next-achievements-shell"
      className="rounded-[28px] border border-border/70 bg-surface p-6 shadow-[0_18px_44px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Próximas Conquistas</h3>
          <p className="text-sm text-muted-foreground">Os próximos desbloqueios mais perto de acontecer.</p>
        </div>
      </div>

      <div className="space-y-4">
        {badgesWithProgress.map((badge, index) => {
          const Icon = badge.icon;
          const tierConfig = badge.nextTier ? TIER_CONFIG[badge.nextTier] : null;

          const insight = generateInsight(
            { badge_id: badge.badge_id, progress: badge.progress, nextTarget: badge.nextTarget },
            ACHIEVEMENTS.find(a => a.id === badge.badge_id)!
          );

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-start gap-3 rounded-[22px] border border-border/70 bg-surface-elevated/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-surface-elevated">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border bg-background/70 shadow-sm"
                  style={
                    tierConfig
                      ? {
                          color: tierConfig.color,
                          borderColor: `${tierConfig.color}33`,
                          backgroundColor: `${tierConfig.color}14`,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {badge.name}
                    </h4>
                    {tierConfig && (
                      <span className="text-xs">{tierConfig.emoji}</span>
                    )}
                  </div>
                  <p className="mb-2 text-xs leading-5 text-muted-foreground">{badge.description}</p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {badge.progress.toLocaleString('pt-BR')} / {badge.nextTarget.toLocaleString('pt-BR')}
                      </span>
                      <span className="font-bold text-primary">
                        {Math.round(badge.progressPercentage)}%
                      </span>
                    </div>

                    <div className="relative h-2 rounded-full overflow-hidden bg-surface-overlay/85">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-violet-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${badge.progressPercentage}%` }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                          delay: index * 0.1,
                        }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Faltam{' '}
                      <span className="font-semibold text-primary">
                        {(badge.nextTarget - badge.progress).toLocaleString('pt-BR')}
                      </span>{' '}
                      para desbloquear
                    </p>

                    {insight && (
                      <div className="mt-2 rounded-xl border border-info/20 bg-info/8 px-3 py-2">
                        <p className="text-xs text-info flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          {insight}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Badge de "Quase lá" para conquistas > 80% */}
              {badge.progressPercentage >= 80 && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  <Flame className="h-3 w-3 inline mr-1" />
                  Quase!
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border/60 pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Continue progredindo para desbloquear mais conquistas! 🚀
        </p>
      </div>
    </Card>
  );
}
