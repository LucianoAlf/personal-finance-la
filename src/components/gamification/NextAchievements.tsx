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
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Próximas Conquistas</h3>
        </div>
        <p className="text-sm text-gray-600 text-center py-4">
          Continue usando o app para desbloquear conquistas! 🎯
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Próximas Conquistas</h3>
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:border-indigo-300 transition-all">
                {/* Ícone */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200"
                >
                  <Icon className="h-5 w-5 text-gray-700" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {badge.name}
                    </h4>
                    {tierConfig && (
                      <span className="text-xs">{tierConfig.emoji}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{badge.description}</p>

                  {/* Barra de progresso */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {badge.progress.toLocaleString('pt-BR')} / {badge.nextTarget.toLocaleString('pt-BR')}
                      </span>
                      <span className="font-bold text-indigo-600">
                        {Math.round(badge.progressPercentage)}%
                      </span>
                    </div>

                    {/* Barra */}
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-indigo-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${badge.progressPercentage}%` }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                          delay: index * 0.1,
                        }}
                      />
                    </div>

                    {/* Texto de incentivo */}
                    <p className="text-xs text-gray-500">
                      Faltam{' '}
                      <span className="font-semibold text-indigo-600">
                        {(badge.nextTarget - badge.progress).toLocaleString('pt-BR')}
                      </span>{' '}
                      para desbloquear
                    </p>

                    {insight && (
                      <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 border-l-4 border-blue-500">
                        <p className="text-xs text-blue-800 flex items-center gap-2">
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

      {/* Footer motivacional */}
      <div className="mt-4 pt-4 border-t text-center">
        <p className="text-xs text-gray-600">
          Continue progredindo para desbloquear mais conquistas! 🚀
        </p>
      </div>
    </Card>
  );
}
