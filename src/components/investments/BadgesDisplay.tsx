import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, RefreshCw } from 'lucide-react';
import { ACHIEVEMENTS, calculateTierProgress, TIER_CONFIG } from '@/config/achievements';
import { useGamification } from '@/hooks/useGamification';

export function BadgesDisplay() {
  const { badges, loading, refreshBadges } = useGamification();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Suas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryLabels = {
    savings: 'Economia',
    spending: 'Controle de gastos',
    streak: 'Consistência',
    goals: 'Metas',
    special: 'Especiais',
  };

  const achievements = ACHIEVEMENTS.map((achievement) => {
    const achievementBadges = badges.filter((badge) => badge.badge_id === achievement.id);
    const unlockedTiers = achievementBadges.filter((badge) => badge.unlocked).map((badge) => badge.tier);
    const highestUnlockedTier = unlockedTiers.includes('gold')
      ? 'gold'
      : unlockedTiers.includes('silver')
      ? 'silver'
      : unlockedTiers.includes('bronze')
      ? 'bronze'
      : null;
    const nextTierBadge = achievementBadges.find((badge) => !badge.unlocked);
    const progress = calculateTierProgress(
      achievement,
      Number(nextTierBadge?.progress || 0),
      highestUnlockedTier
    );

    return {
      ...achievement,
      highestUnlockedTier,
      nextTier: progress.nextTier,
      percentage: progress.percentage,
      progressValue: Number(nextTierBadge?.progress || 0),
      nextTarget: progress.nextTarget,
    };
  });

  const unlockedCount = achievements.filter((achievement) => achievement.highestUnlockedTier !== null).length;

  const byCategory = Object.entries(categoryLabels).map(([key, label]) => {
    const categoryAchievements = achievements.filter((achievement) => achievement.category === key);
    const unlocked = categoryAchievements.filter((achievement) => achievement.highestUnlockedTier !== null).length;

    return {
      key,
      label,
      unlocked,
      total: categoryAchievements.length,
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Suas Conquistas
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {unlockedCount}/{ACHIEVEMENTS.length} conquistas oficiais desbloqueadas
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshBadges} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byCategory.map((category) => (
            <div key={category.key} className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">{category.label}</span>
                <span className="font-semibold">{category.unlocked}/{category.total}</span>
              </div>
              <Progress value={category.total > 0 ? (category.unlocked / category.total) * 100 : 0} className="h-2" />
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            const tierVisual = achievement.highestUnlockedTier
              ? TIER_CONFIG[achievement.highestUnlockedTier]
              : achievement.nextTier
              ? TIER_CONFIG[achievement.nextTier]
              : TIER_CONFIG.bronze;

            return (
              <div
                key={achievement.id}
                className={`rounded-xl border p-4 transition-all ${
                  achievement.highestUnlockedTier ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-3">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{achievement.name}</p>
                      <span className="text-sm">{tierVisual.emoji}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {achievement.progressValue.toLocaleString('pt-BR')} / {achievement.nextTarget.toLocaleString('pt-BR')}
                    </span>
                    <span className="font-semibold text-foreground">{Math.round(achievement.percentage)}%</span>
                  </div>
                  <Progress value={achievement.percentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
