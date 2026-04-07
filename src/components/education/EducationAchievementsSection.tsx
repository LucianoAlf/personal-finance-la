import { useMemo, useState } from 'react';

import { ChevronDown, ChevronUp, Lock, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getAchievementById, TIER_CONFIG } from '@/config/achievements';
import { formatCurrency } from '@/utils/formatters';
import type { BadgeProgress } from '@/types/database.types';
import {
  buildGroupedGamificationAchievementsForEducation,
  type AchievementTierRoadmapEntry,
  type GroupedEducationAchievementTile,
} from '@/utils/education/view-model';

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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              isUnlocked
                ? 'bg-violet-50 text-violet-900'
                : isCurrent
                  ? 'bg-slate-50 text-slate-700'
                  : 'text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 min-w-[72px]">
              {isUnlocked ? (
                <Trophy size={14} className="text-violet-600" aria-hidden />
              ) : (
                <Lock size={14} className="text-slate-400" aria-hidden />
              )}
              <span className="font-medium" style={{ color: TIER_CONFIG[entry.tier].color }}>
                {entry.label}
              </span>
            </div>
            <span className="flex-1 text-xs">
              Meta: {formatTarget(entry.target, category)}
            </span>
            <span className="text-xs text-slate-400">
              +{entry.xpReward} XP
            </span>
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
    <Card className={`transition-shadow ${tile.currentTierUnlocked ? 'border-violet-300' : 'border-slate-200'} ${expanded ? 'shadow-md' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <button
          type="button"
          className="flex items-start justify-between gap-3 w-full text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-3 min-w-0">
            {Icon ? (
              <div className="rounded-lg bg-violet-50 p-2 shrink-0">
                <Icon
                  size={20}
                  className={tile.currentTierUnlocked ? 'text-violet-600' : 'text-slate-400'}
                  aria-hidden
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{tile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{tile.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentTierLabel ? (
              <Badge variant="secondary" style={{ borderColor: TIER_CONFIG[tile.currentTier!].color }}>
                {currentTierLabel}
              </Badge>
            ) : (
              <Badge variant="outline">Em progresso</Badge>
            )}
            {expanded ? (
              <ChevronUp size={16} className="text-slate-400" aria-hidden />
            ) : (
              <ChevronDown size={16} className="text-slate-400" aria-hidden />
            )}
          </div>
        </button>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
            <span>
              {isComplete
                ? 'Todas as fases conquistadas'
                : `Próximo: ${nextTierLabel}`}
            </span>
            <span className="tabular-nums">
              {formatTarget(tile.progress, tile.category)}/{formatTarget(tile.target, tile.category)}
            </span>
          </div>
          <Progress value={isComplete ? 100 : progressValue} className="h-2" />
        </div>

        {!isComplete && tile.insight ? (
          <p className="text-xs text-violet-700 bg-violet-50 rounded-md px-2.5 py-1.5 leading-relaxed">
            {tile.insight}
          </p>
        ) : null}

        {expanded ? (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">Roadmap de tiers</p>
              <TierRoadmap roadmap={tile.roadmap} category={tile.category} currentTier={tile.currentTier} />
            </div>
            {isComplete ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-md px-2.5 py-1.5">
                Parabens! Voce completou todos os degraus desta conquista.
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
        <Skeleton className="h-7 w-44 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-full mt-3" />
                <Skeleton className="h-3 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Suas conquistas</h3>
          <p className="text-sm text-gray-600">
            Clique em qualquer conquista para ver o roadmap completo de tiers e o que falta para avançar.
          </p>
        </div>
        {tiles.length > 6 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? 'Mostrar menos' : `Ver todas (${tiles.length})`}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleTiles.map((tile) => (
          <AchievementCard key={tile.id} tile={tile} />
        ))}
      </div>
    </div>
  );
}
