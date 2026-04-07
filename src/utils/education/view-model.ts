export { getLessonUrl } from './lesson-navigation';
import { generateInsight, getAchievementById, isCanonicalAchievementId, TIER_CONFIG } from '@/config/achievements';
import type { BadgeProgress } from '@/types/database.types';
import {
  isEducationSectionReliable,
  type EducationIntelligenceContext,
  type EducationIntelligenceFullContext,
} from '@/utils/education/intelligence-contract';

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface EducationCatalogTrack {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export interface EducationCatalogModule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  trackId: string;
  sortOrder: number;
}

export interface EducationCatalogLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  moduleId: string;
  sortOrder: number;
}

export interface EducationUserProgressRow {
  lessonId: string;
  status: LessonProgressStatus;
}

export type EducationModuleJourneyStatus = 'not_started' | 'in_progress' | 'completed';

export interface EducationModuleJourneyRow {
  moduleId: string;
  trackSlug: string;
  moduleSlug: string;
  title: string;
  description: string | null;
  totalLessonCount: number;
  completedLessonCount: number;
  moduleStatus: EducationModuleJourneyStatus;
  firstIncompleteLessonId: string | null;
  isRecommended: boolean;
}

export interface EducationTrackJourneyRow {
  trackSlug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  modules: EducationModuleJourneyRow[];
}

export interface EducationAchievementTile {
  id: string;
  name: string;
  unlocked: boolean;
  tier: 'bronze' | 'silver' | 'gold';
  progress: number;
  target: number;
}

export interface AchievementTierRoadmapEntry {
  tier: 'bronze' | 'silver' | 'gold';
  label: string;
  target: number;
  xpReward: number;
  unlocked: boolean;
}

export interface GroupedEducationAchievementTile {
  id: string;
  name: string;
  category: string;
  description: string;
  currentTier: 'bronze' | 'silver' | 'gold' | null;
  nextTier: 'bronze' | 'silver' | 'gold' | null;
  currentTierUnlocked: boolean;
  progress: number;
  target: number;
  roadmap: AchievementTierRoadmapEntry[];
  insight: string | null;
}

export interface EducationLessonPresentation {
  statusLabel: string;
  primaryActionLabel: string | null;
  primaryAction: 'start' | 'complete' | null;
}

export interface EducationAnaMentorshipPresentation {
  focusTitle: string;
  reasonWhy: string;
  nextStepTitle: string | null;
  attentionItems: string[];
  recommendationItems: string[];
}

export function shouldShowGenericRecommendationNotice(context: EducationIntelligenceFullContext): boolean {
  return !context.journey.hasSufficientData;
}

export function shouldShowEducationFirstRunEmptyState(
  context: EducationIntelligenceFullContext,
  progressRows: EducationUserProgressRow[],
): boolean {
  if (context.journey.hasSufficientData) {
    return false;
  }
  if (progressRows.some((r) => r.status !== 'not_started')) {
    return false;
  }
  const p = context.progress;
  if ((p?.completedLessonsCount ?? 0) > 0) {
    return false;
  }
  return true;
}

export function shouldPromptInvestorProfileReview(
  lastAssessmentAt: string | null,
  nowIso: string = new Date().toISOString(),
  reviewWindowDays: number = 180,
): boolean {
  if (!lastAssessmentAt) {
    return false;
  }

  const lastTs = new Date(lastAssessmentAt).getTime();
  const nowTs = new Date(nowIso).getTime();
  if (Number.isNaN(lastTs) || Number.isNaN(nowTs) || nowTs <= lastTs) {
    return false;
  }

  const elapsedDays = (nowTs - lastTs) / (1000 * 60 * 60 * 24);
  return elapsedDays >= reviewWindowDays;
}

export function shouldShowInvestorProfileQuestionnaire(input: {
  isLoading: boolean;
  hasTrustedProfile: boolean;
  forceOpen: boolean;
  reviewRequired: boolean;
}): boolean {
  if (input.isLoading) {
    return false;
  }

  if (!input.hasTrustedProfile) {
    return true;
  }

  return input.forceOpen || input.reviewRequired;
}

export function hasResolvedTrustedInvestorProfile(input: {
  canonicalProfileKey: string | null | undefined;
  assessmentProfileKey: string | null | undefined;
}): boolean {
  return Boolean(input.canonicalProfileKey || input.assessmentProfileKey);
}

function lessonEffectiveStatus(lessonId: string, progressByLessonId: Map<string, LessonProgressStatus>): LessonProgressStatus {
  return progressByLessonId.get(lessonId) ?? 'not_started';
}

function isLessonDone(status: LessonProgressStatus): boolean {
  return status === 'completed';
}

function moduleAggregate(
  lessonIds: string[],
  progressByLessonId: Map<string, LessonProgressStatus>,
): {
  completedLessonCount: number;
  moduleStatus: EducationModuleJourneyStatus;
  firstIncompleteLessonId: string | null;
} {
  const statuses = lessonIds.map((id) => lessonEffectiveStatus(id, progressByLessonId));
  const completedLessonCount = statuses.filter((s) => s === 'completed').length;
  const total = lessonIds.length;
  let moduleStatus: EducationModuleJourneyStatus = 'not_started';
  if (total > 0 && completedLessonCount === total) {
    moduleStatus = 'completed';
  } else if (completedLessonCount > 0 || statuses.some((s) => s === 'in_progress' || s === 'skipped')) {
    moduleStatus = 'in_progress';
  }
  const firstIncompleteLessonId =
    lessonIds.find((id) => !isLessonDone(lessonEffectiveStatus(id, progressByLessonId))) ?? null;
  return { completedLessonCount, moduleStatus, firstIncompleteLessonId };
}

export function buildJourneyRows(input: {
  context: EducationIntelligenceFullContext;
  tracks: EducationCatalogTrack[];
  modules: EducationCatalogModule[];
  lessons: EducationCatalogLesson[];
  progressByLessonId: Map<string, LessonProgressStatus>;
}): EducationTrackJourneyRow[] {
  const { context, tracks, modules, lessons, progressByLessonId } = input;
  const recommendedTrackByConcreteModuleOrder = new Map<string, number>();
  for (const [index, moduleRef] of context.recommendedModules.entries()) {
    if (!recommendedTrackByConcreteModuleOrder.has(moduleRef.trackSlug)) {
      recommendedTrackByConcreteModuleOrder.set(moduleRef.trackSlug, index);
    }
  }
  const recommendedTrackOrder = new Map<string, number>(
    context.journey.recommendedTrackSlugs.map((slug, index) => [slug, index] as const),
  );
  const recommendedModuleOrder = new Map<string, number>(
    context.recommendedModules.map((m, index) => [`${m.trackSlug}::${m.moduleSlug}`, index] as const),
  );
  const recommended = new Set(
    context.recommendedModules.map((m) => `${m.trackSlug}::${m.moduleSlug}`),
  );

  const sortedTracks = [...tracks].sort((a, b) => {
    const aConcrete = recommendedTrackByConcreteModuleOrder.get(a.slug);
    const bConcrete = recommendedTrackByConcreteModuleOrder.get(b.slug);
    if (aConcrete !== undefined || bConcrete !== undefined) {
      if (aConcrete === undefined) return 1;
      if (bConcrete === undefined) return -1;
      if (aConcrete !== bConcrete) return aConcrete - bConcrete;
    }

    const aRecommended = recommendedTrackOrder.get(a.slug);
    const bRecommended = recommendedTrackOrder.get(b.slug);
    if (aRecommended !== undefined || bRecommended !== undefined) {
      if (aRecommended === undefined) return 1;
      if (bRecommended === undefined) return -1;
      if (aRecommended !== bRecommended) return aRecommended - bRecommended;
    }
    return a.sortOrder - b.sortOrder;
  });
  const modulesByTrack = new Map<string, EducationCatalogModule[]>();
  for (const m of modules) {
    const list = modulesByTrack.get(m.trackId) ?? [];
    list.push(m);
    modulesByTrack.set(m.trackId, list);
  }

  const lessonsByModule = new Map<string, EducationCatalogLesson[]>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  }
  for (const list of lessonsByModule.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return sortedTracks.map((trackRow) => {
    const trackMods = [...(modulesByTrack.get(trackRow.id) ?? [])].sort((a, b) => {
      const aKey = `${trackRow.slug}::${a.slug}`;
      const bKey = `${trackRow.slug}::${b.slug}`;
      const aRecommended = recommendedModuleOrder.get(aKey);
      const bRecommended = recommendedModuleOrder.get(bKey);
      if (aRecommended !== undefined || bRecommended !== undefined) {
        if (aRecommended === undefined) return 1;
        if (bRecommended === undefined) return -1;
        if (aRecommended !== bRecommended) return aRecommended - bRecommended;
      }
      return a.sortOrder - b.sortOrder;
    });
    const moduleRows: EducationModuleJourneyRow[] = trackMods.map((mod) => {
      const modLessons = lessonsByModule.get(mod.id) ?? [];
      const lessonIds = modLessons.map((l) => l.id);
      const { completedLessonCount, moduleStatus, firstIncompleteLessonId } = moduleAggregate(
        lessonIds,
        progressByLessonId,
      );
      const key = `${trackRow.slug}::${mod.slug}`;
      return {
        moduleId: mod.id,
        trackSlug: trackRow.slug,
        moduleSlug: mod.slug,
        title: mod.title,
        description: mod.description,
        totalLessonCount: lessonIds.length,
        completedLessonCount,
        moduleStatus,
        firstIncompleteLessonId,
        isRecommended: recommended.has(key),
      };
    });
    return {
      trackSlug: trackRow.slug,
      title: trackRow.title,
      description: trackRow.description,
      sortOrder: trackRow.sortOrder,
      modules: moduleRows,
    };
  });
}

export function mapGamificationAchievementsForEducation(badges: BadgeProgress[]): EducationAchievementTile[] {
  return badges
    .filter((b) => isCanonicalAchievementId(b.badge_id))
    .map((b) => {
      const def = getAchievementById(b.badge_id);
      return {
        id: b.badge_id,
        name: def?.name ?? b.badge_id,
        unlocked: b.unlocked,
        tier: b.tier,
        progress: b.progress,
        target: b.target,
      };
    });
}

const TIER_ORDER: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold'];

function tierRank(tier: 'bronze' | 'silver' | 'gold'): number {
  return TIER_ORDER.indexOf(tier);
}

export function buildGroupedGamificationAchievementsForEducation(
  badges: BadgeProgress[],
): GroupedEducationAchievementTile[] {
  const canonical = badges.filter((b) => isCanonicalAchievementId(b.badge_id));
  const byId = new Map<string, BadgeProgress[]>();

  for (const badge of canonical) {
    const list = byId.get(badge.badge_id) ?? [];
    list.push(badge);
    byId.set(badge.badge_id, list);
  }

  return Array.from(byId.entries())
    .map(([badgeId, badgeRows]) => {
      const def = getAchievementById(badgeId);
      const unlockedRows = badgeRows.filter((row) => row.unlocked);
      const currentUnlockedRow =
        unlockedRows.length > 0
          ? [...unlockedRows].sort((a, b) => tierRank(b.tier) - tierRank(a.tier))[0]
          : null;
      const nextTier = currentUnlockedRow
        ? (currentUnlockedRow.tier === 'gold' ? null : TIER_ORDER[tierRank(currentUnlockedRow.tier) + 1])
        : 'bronze';
      const nextRow = nextTier ? badgeRows.find((row) => row.tier === nextTier) ?? null : null;
      const fallbackPendingRow =
        nextRow ??
        [...badgeRows].sort((a, b) => tierRank(a.tier) - tierRank(b.tier))[0];

      const unlockedTiers = new Set(unlockedRows.map((r) => r.tier));
      const roadmap: AchievementTierRoadmapEntry[] = (def?.tiers ?? [])
        .filter((t) => t.xp_reward > 0)
        .map((t) => ({
          tier: t.tier,
          label: TIER_CONFIG[t.tier].label,
          target: t.target,
          xpReward: t.xp_reward,
          unlocked: unlockedTiers.has(t.tier),
        }));

      const displayProgress = (nextRow ?? fallbackPendingRow)?.progress ?? 0;
      const displayTarget = (nextRow ?? fallbackPendingRow)?.target ?? 0;
      const insight = def && nextTier
        ? generateInsight({ badge_id: badgeId, progress: displayProgress, nextTarget: displayTarget }, def)
        : null;

      return {
        id: badgeId,
        name: def?.name ?? badgeId,
        category: def?.category ?? 'special',
        description: def?.description ?? '',
        currentTier: currentUnlockedRow?.tier ?? null,
        nextTier,
        currentTierUnlocked: Boolean(currentUnlockedRow),
        progress: displayProgress,
        target: displayTarget,
        roadmap,
        insight,
      } satisfies GroupedEducationAchievementTile;
    })
    .sort((a, b) => {
      if (a.currentTierUnlocked !== b.currentTierUnlocked) {
        return a.currentTierUnlocked ? -1 : 1;
      }
      if (a.currentTier && b.currentTier && a.currentTier !== b.currentTier) {
        return tierRank(b.currentTier) - tierRank(a.currentTier);
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });
}

export function getEducationLessonPresentation(
  status: LessonProgressStatus,
): EducationLessonPresentation {
  switch (status) {
    case 'completed':
      return {
        statusLabel: 'Concluída',
        primaryActionLabel: null,
        primaryAction: null,
      };
    case 'in_progress':
      return {
        statusLabel: 'Em andamento',
        primaryActionLabel: 'Marcar concluída',
        primaryAction: 'complete',
      };
    case 'skipped':
      return {
        statusLabel: 'Pausada',
        primaryActionLabel: 'Retomar',
        primaryAction: 'start',
      };
    case 'not_started':
    default:
      return {
        statusLabel: 'Não iniciada',
        primaryActionLabel: 'Iniciar',
        primaryAction: 'start',
      };
  }
}

export function buildDailyTipPresentation(context: EducationIntelligenceContext): {
  narrativeText: string;
  deterministicReason: string;
  deliveredAt: string | null;
} | null {
  const tip = context.dailyTip;
  const q = context.quality.dailyTip;
  if (!tip?.narrativeText || !isEducationSectionReliable(q)) {
    return null;
  }
  return {
    narrativeText: tip.narrativeText,
    deterministicReason: tip.deterministicReason ?? '',
    deliveredAt: tip.deliveredAt,
  };
}

export function filterGlossaryTermsForSearch<T extends { slug: string; term: string; short_definition: string }>(
  terms: T[],
  rawQuery: string,
): T[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return terms;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  return terms.filter((t) => {
    const hay = `${t.slug} ${t.term} ${t.short_definition}`.toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}

export function buildEducationHeroSubtitle(
  context: EducationIntelligenceFullContext,
  trackTitleBySlug: Record<string, string>,
): string {
  if (context.journey.hasSufficientData && context.journey.primaryFocus) {
    const title = trackTitleBySlug[context.journey.primaryFocus] ?? context.journey.primaryFocus;
    return `Trilha sugerida pelo seu contexto financeiro atual: ${title}.`;
  }
  return 'Enquanto você registra mais hábitos e dados, mostramos uma trilha inicial do catálogo oficial. Quanto mais você usa o app, mais personalizada fica a ordem dos módulos.';
}

export function buildProgressSummaryLines(context: EducationIntelligenceFullContext): string[] {
  const lines: string[] = [];
  const p = context.progress;
  if (p && p.totalLessonsAvailable > 0) {
    lines.push(
      `Lições concluídas: ${p.completedLessonsCount} de ${p.totalLessonsAvailable}.`,
    );
  }
  if (p?.currentStreakDays != null && p.currentStreakDays > 0) {
    lines.push(`Sequência de estudos (dias): ${p.currentStreakDays}.`);
  }
  if (context.learningBlockers.length > 0) {
    lines.push('Há sinais financeiros que pedem atenção antes de aprofundar em alguns temas.');
  }
  return lines;
}

export function buildAnaMentorshipPresentation(
  context: EducationIntelligenceFullContext,
  trackTitleBySlug: Record<string, string>,
  nextLessonTitle: string | null,
): EducationAnaMentorshipPresentation | null {
  if (!context.ana?.summary) {
    return null;
  }

  const focusTitle = context.journey.primaryFocus
    ? (trackTitleBySlug[context.journey.primaryFocus] ?? context.journey.primaryFocus)
    : 'Sua próxima etapa';

  return {
    focusTitle,
    reasonWhy: context.ana.summary,
    nextStepTitle: nextLessonTitle,
    attentionItems: context.ana.insights.slice(0, 3),
    recommendationItems: context.ana.recommendations.slice(0, 3),
  };
}
