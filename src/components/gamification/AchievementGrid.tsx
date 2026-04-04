import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Trophy, Lock } from 'lucide-react';
import type { BadgeProgress } from '@/types/database.types';
import { ACHIEVEMENTS, calculateTierProgress, TIER_CONFIG } from '@/config/achievements';

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
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Todas as Conquistas
          </h3>
        </div>
        <div className="text-sm font-semibold text-gray-600">
          {unlockedCount}/{totalCount} desbloqueadas
        </div>
      </div>

      {/* Grid de conquistas */}
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
                  relative p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 hover:scale-105 hover:shadow-lg'
                      : 'bg-gray-100 border-gray-300 opacity-60 hover:opacity-80'
                  }
                `}
              >
                {/* Ícone */}
                <div className="flex items-center justify-center mb-2">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isUnlocked ? 'bg-yellow-100 shadow-md' : 'bg-gray-200'}
                    `}
                  >
                    <Icon
                      className={`h-6 w-6 ${isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}
                    />
                  </div>
                </div>

                {/* Nome */}
                <h4 className="text-xs font-semibold text-center text-gray-900 mb-1 line-clamp-2">
                  {achievement.name}
                </h4>

                {/* Tier badges */}
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

                {/* Barra de progresso (apenas para não desbloqueadas) */}
                {!isUnlocked && achievement.progress > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-indigo-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${achievement.progress}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                      />
                    </div>
                    <p className="text-xs text-center text-gray-600 mt-1">
                      {Math.round(achievement.progress)}%
                    </p>
                  </div>
                )}

                {/* Lock icon para não desbloqueadas */}
                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                )}

                {/* Tooltip ao hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    <p className="font-semibold mb-1">{achievement.name}</p>
                    <p className="text-gray-300">{achievement.description}</p>
                    {!isUnlocked && achievement.nextTarget > 0 && (
                      <p className="text-yellow-400 mt-1">
                        Faltam: {achievement.nextTarget.toLocaleString('pt-BR')}
                      </p>
                    )}
                    {/* Seta do tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              </div>

              {/* Badge de "Novo" para conquistas recém-desbloqueadas (últimas 24h) */}
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

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-sm text-gray-600">
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
