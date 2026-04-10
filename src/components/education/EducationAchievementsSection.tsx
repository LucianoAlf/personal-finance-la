import { useMemo, useState } from 'react';

import { ChevronDown, ChevronUp, Lock, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getAchievementById, TIER_CONFIG } from '@/config/achievements';
import { cn } from '@/lib/utils';
import type { BadgeProgress } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import {
  buildGroupedGamificationAchievementsForEducation,
  type AchievementTierRoadmapEntry,
  type GroupedEducationAchievementTile,
} from '@/utils/education/view-model';
import {
  educationBodyClassName,
  educationHeadingClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
  educationTonePanelClassName,
} from './education-shell';

interface EducationAchievementsSectionProps {
  badges: BadgeProgress[];
  loading: boolean;
}

const MONETARY_CATEGORIES = new Set(['savings', 'special']);

function formatTarget(target: number, category: string): string {
  if (MONETARY_CATEGORIES.has(category) && target >= 100) {
    return formatCurrency(target);
  }

  return target.toLocaleString('pt-BR');
}

function TierRoadmap({
  roadmap,
  category,
  currentTier,
}: {
  roadmap: AchievementTierRoadmapEntry[];
  category: string;
  currentTier: 'bronze' | 'silver' | 'gold' | null;
}) {
  return (
    <div className="space-y-2">
      {roadmap.map((entry) => {
        const isCurrent = entry.tier === currentTier;
        const isUnlocked = entry.unlocked;

        return (
          <div
            key={entry.tier}
            className={cn(
              'flex items-center gap-3 rounded-[16px] border px-3 py-2 text-sm',
              isUnlocked
                ? 'border-violet-500/30 bg-violet-500/12 text-violet-100'
                : isCurrent
                  ? 'border-border/70 bg-surface-elevated/35 text-foreground'
                  : 'border-border/60 bg-surface-elevated/18 text-muted-foreground',
            )}
          >
            <div className="flex min-w-[72px] items-center gap-2">
              {isUnlocked ? (
                <Trophy size={14} className="text-violet-300" aria-hidden />
              ) : (
                <Lock size={14} className="text-muted-foreground" aria-hidden />
              )}
              <span className="font-medium" style={{ color: TIER_CONFIG[entry.tier].color }}>
                {entry.label}
              </span>
            </div>

            <span className="flex-1 text-xs">Meta: {formatTarget(entry.target, category)}</span>
            <span className="text-xs text-muted-foreground">+{entry.xpReward} XP</span>
          </div>
        );
      })}
    </div>
  );
}

function AchievementCard({ tile }: { tile: GroupedEducationAchievementTile }) {
  const [expanded, setExpanded] = useState(false);
  const def = getAchievementById(tile.id);
  const Icon = def?.icon;
  const currentTierLabel = tile.currentTier ? TIER_CONFIG[tile.currentTier].label : null;
  const nextTierLabel = tile.nextTier ? TIER_CONFIG[tile.nextTier].label : null;
  const progressValue = tile.target > 0 ? Math.min(100, Math.round((tile.progress / tile.target) * 100)) : 0;
  const isComplete = !tile.nextTier;

  return (
    <Card
      className={cn(
        educationShellClassName,
        'transition-all',
        tile.currentTierUnlocked ? 'border-violet-400/35' : 'border-border/70',
        expanded && 'shadow-[0_18px_35px_rgba(2,6,23,0.22)]',
      )}
    >
      <CardContent className="space-y-4 p-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div
                className={cn(
                  tile.currentTierUnlocked ? educationTonePanelClassName('violet') : educationSubtlePanelClassName,
                  'shrink-0 rounded-[18px] p-2.5',
                )}
              >
                <Icon
                  size={20}
                  className={tile.currentTierUnlocked ? 'text-violet-100' : 'text-muted-foreground'}
                  aria-hidden
                />
              </div>
            ) : null}

            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">{tile.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tile.description}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {currentTierLabel ? (
              <Badge
                variant="secondary"
                style={{ borderColor: TIER_CONFIG[tile.currentTier!].color }}
              >
                {currentTierLabel}
              </Badge>
            ) : (
              <Badge variant="outline">Em progresso</Badge>
            )}
            {expanded ? (
              <ChevronUp size={16} className="text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" aria-hidden />
            )}
          </div>
        </button>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{isComplete ? 'Todas as fases conquistadas' : `Próximo: ${nextTierLabel}`}</span>
            <span className="tabular-nums">
              {formatTarget(tile.progress, tile.category)}/{formatTarget(tile.target, tile.category)}
            </span>
          </div>
          <Progress value={isComplete ? 100 : progressValue} className="h-2" />
        </div>

        {!isComplete && tile.insight ? (
          <p className={cn(educationTonePanelClassName('violet'), 'px-2.5 py-1.5 text-xs leading-relaxed text-violet-100')}>
            {tile.insight}
          </p>
        ) : null}

        {expanded ? (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Roadmap de tiers
              </p>
              <TierRoadmap
                roadmap={tile.roadmap}
                category={tile.category}
                currentTier={tile.currentTier}
              />
            </div>
            {isComplete ? (
              <p className={cn(educationTonePanelClassName('emerald'), 'rounded-xl px-2.5 py-1.5 text-xs text-emerald-100')}>
                Parabéns! Você completou todos os degraus desta conquista.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EducationAchievementsSection({ badges, loading }: EducationAchievementsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const tiles = useMemo(() => buildGroupedGamificationAchievementsForEducation(badges), [badges]);
  const visibleTiles = showAll ? tiles : tiles.slice(0, 6);

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-7 w-44" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className={educationShellClassName}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={educationHeadingClassName}>Suas conquistas</h3>
          <p className={educationBodyClassName}>
            Clique em qualquer conquista para ver o roadmap completo de tiers e o que falta para avançar.
          </p>
        </div>

        {tiles.length > 6 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? 'Mostrar menos' : `Ver todas (${tiles.length})`}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleTiles.map((tile) => (
          <AchievementCard key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
