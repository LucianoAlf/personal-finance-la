import { describe, expect, it } from 'vitest';

import {
  buildEducationIntelligenceFullContext,
  createEmptyEducationContext,
  type EducationIntelligenceFullContext,
  type EducationIntelligenceMetrics,
} from '@/utils/education/intelligence-contract';
import type { BadgeProgress } from '@/types/database.types';

import {
  buildAnaMentorshipPresentation,
  buildDailyTipPresentation,
  buildEducationHeroSubtitle,
  buildGroupedGamificationAchievementsForEducation,
  buildJourneyRows,
  buildProgressSummaryLines,
  filterGlossaryTermsForSearch,
  hasResolvedTrustedInvestorProfile,
  getEducationLessonPresentation,
  mapGamificationAchievementsForEducation,
  shouldPromptInvestorProfileReview,
  shouldShowEducationFirstRunEmptyState,
  shouldShowInvestorProfileQuestionnaire,
  shouldShowGenericRecommendationNotice,
  type EducationCatalogLesson,
  type EducationCatalogModule,
  type EducationCatalogTrack,
  type EducationUserProgressRow,
} from '@/utils/education/view-model';

function metrics(overrides: Partial<EducationIntelligenceMetrics> = {}): EducationIntelligenceMetrics {
  return {
    referenceDate: '2026-04-07',
    periodStart: '2026-03-08',
    periodEnd: '2026-04-07',
    transactionCount: 0,
    bankIncomeTotal: 0,
    bankExpenseTotal: 0,
    cardExpenseTotal: 0,
    overduePayableCount: 0,
    overdueInvoiceCount: 0,
    creditCardOutstanding: 0,
    financialGoalCount: 0,
    emergencyReserveProgress: null,
    activeInvestmentCount: 0,
    activeInvestmentGoalCount: 0,
    portfolioSnapshotCount: 0,
    gamificationStreakDays: null,
    badgeUnlockedCount: 0,
    completedLessonCount: 0,
    totalLessonCount: 0,
    nextLessonId: null,
    investorAssessment: null,
    glossaryTermSlugs: [],
    dailyTip: null,
    ...overrides,
  };
}

function fullContextFromMetrics(m: EducationIntelligenceMetrics): EducationIntelligenceFullContext {
  return buildEducationIntelligenceFullContext(m, '2026-04-07T12:00:00.000Z');
}

const track: EducationCatalogTrack = {
  id: 't1',
  slug: 'organizacao_basica',
  title: 'Organização Básica',
  description: 'Desc',
  sortOrder: 1,
};

const mod: EducationCatalogModule = {
  id: 'm1',
  slug: 'nucleo',
  title: 'Núcleo',
  description: null,
  trackId: 't1',
  sortOrder: 1,
};

const lessons: EducationCatalogLesson[] = [
  {
    id: 'L1',
    slug: 'l1',
    title: 'Lição 1',
    summary: null,
    moduleId: 'm1',
    sortOrder: 1,
  },
  {
    id: 'L2',
    slug: 'l2',
    title: 'Lição 2',
    summary: null,
    moduleId: 'm1',
    sortOrder: 2,
  },
];

const track2: EducationCatalogTrack = {
  id: 't2',
  slug: 'eliminando_dividas',
  title: 'Eliminando Dívidas',
  description: 'Desc 2',
  sortOrder: 2,
};

const mod2: EducationCatalogModule = {
  id: 'm2',
  slug: 'renegociacao',
  title: 'Renegociação',
  description: null,
  trackId: 't2',
  sortOrder: 1,
};

const lessons2: EducationCatalogLesson[] = [
  {
    id: 'L3',
    slug: 'l3',
    title: 'Lição 3',
    summary: null,
    moduleId: 'm2',
    sortOrder: 1,
  },
];

describe('education view-model', () => {
  it('shows first-run empty state for a brand-new user with seeded lessons and suggested next lesson', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 0,
        financialGoalCount: 0,
        completedLessonCount: 0,
        totalLessonCount: 2,
        nextLessonId: 'L1',
      }),
    );
    const progressRows: EducationUserProgressRow[] = [];
    expect(shouldShowEducationFirstRunEmptyState(ctx, progressRows)).toBe(true);
  });

  it('does not show first-run empty state once any lesson has a persisted in-progress row', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 0,
        financialGoalCount: 0,
        completedLessonCount: 0,
        totalLessonCount: 2,
        nextLessonId: 'L1',
      }),
    );
    expect(
      shouldShowEducationFirstRunEmptyState(ctx, [{ lessonId: 'L1', status: 'in_progress' }]),
    ).toBe(false);
  });

  it('flags generic recommendation when journey has insufficient behavioral data', () => {
    const sparse = fullContextFromMetrics(
      metrics({
        transactionCount: 0,
        financialGoalCount: 0,
        completedLessonCount: 0,
      }),
    );
    expect(shouldShowGenericRecommendationNotice(sparse)).toBe(true);

    const rich = fullContextFromMetrics(
      metrics({
        transactionCount: 5,
        financialGoalCount: 1,
        completedLessonCount: 0,
      }),
    );
    expect(shouldShowGenericRecommendationNotice(rich)).toBe(false);
  });

  it('builds journey rows with recommended track and module completion math', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 5,
        financialGoalCount: 1,
        totalLessonCount: 2,
        completedLessonCount: 1,
        nextLessonId: 'L2',
        availableModules: [{ trackSlug: 'organizacao_basica', moduleSlug: 'nucleo' }],
      }),
    );
    const rows = buildJourneyRows({
      context: ctx,
      tracks: [track],
      modules: [mod],
      lessons,
      progressByLessonId: new Map([
        ['L1', 'completed'],
        ['L2', 'not_started'],
      ]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].trackSlug).toBe('organizacao_basica');
    expect(rows[0].modules[0].isRecommended).toBe(true);
    expect(rows[0].modules[0].completedLessonCount).toBe(1);
    expect(rows[0].modules[0].totalLessonCount).toBe(2);
    expect(rows[0].modules[0].firstIncompleteLessonId).toBe('L2');
    expect(rows[0].modules[0].moduleStatus).toBe('in_progress');
  });

  it('surfaces canonical recommended tracks and modules first', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 5,
        financialGoalCount: 1,
        totalLessonCount: 3,
        completedLessonCount: 0,
        nextLessonId: 'L3',
        availableModules: [{ trackSlug: 'eliminando_dividas', moduleSlug: 'renegociacao' }],
      }),
    );

    const rows = buildJourneyRows({
      context: ctx,
      tracks: [track, track2],
      modules: [mod, mod2],
      lessons: [...lessons, ...lessons2],
      progressByLessonId: new Map(),
    });

    expect(rows[0].trackSlug).toBe('eliminando_dividas');
    expect(rows[0].modules[0].moduleSlug).toBe('renegociacao');
    expect(rows[0].modules[0].isRecommended).toBe(true);
  });

  it('presents skipped lessons as paused and resumable in the journey flow', () => {
    expect(getEducationLessonPresentation('skipped')).toEqual({
      statusLabel: 'Pausada',
      primaryActionLabel: 'Retomar',
      primaryAction: 'start',
    });
    expect(getEducationLessonPresentation('not_started')).toEqual({
      statusLabel: 'Não iniciada',
      primaryActionLabel: 'Iniciar',
      primaryAction: 'start',
    });
  });

  it('maps gamification badges to education tiles using only canonical ids', () => {
    const badges = [
      {
        badge_id: 'savings_master',
        unlocked: true,
        tier: 'bronze' as const,
        progress: 10,
        target: 100,
      },
      {
        badge_id: 'fake_non_canonical',
        unlocked: false,
        tier: 'bronze' as const,
        progress: 0,
        target: 1,
      },
    ];
    const tiles = mapGamificationAchievementsForEducation(badges as unknown as BadgeProgress[]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].id).toBe('savings_master');
    expect(tiles[0].unlocked).toBe(true);
  });

  it('shows the investor questionnaire only when no trusted profile exists, when explicitly reopened, or when review is required', () => {
    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: false,
        hasTrustedProfile: false,
        forceOpen: false,
        reviewRequired: false,
      }),
    ).toBe(true);

    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: false,
        hasTrustedProfile: true,
        forceOpen: false,
        reviewRequired: false,
      }),
    ).toBe(false);

    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: false,
        hasTrustedProfile: true,
        forceOpen: true,
        reviewRequired: false,
      }),
    ).toBe(true);

    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: false,
        hasTrustedProfile: true,
        forceOpen: false,
        reviewRequired: true,
      }),
    ).toBe(true);
  });

  it('does not show the investor questionnaire while the profile state is still loading', () => {
    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: true,
        hasTrustedProfile: false,
        forceOpen: false,
        reviewRequired: false,
      }),
    ).toBe(false);
  });

  it('does not show the investor questionnaire during broader page loading even if the user already clicked to reopen it', () => {
    expect(
      shouldShowInvestorProfileQuestionnaire({
        isLoading: true,
        hasTrustedProfile: true,
        forceOpen: true,
        reviewRequired: true,
      }),
    ).toBe(false);
  });

  it('treats the canonical education context as a trusted investor-profile source even before the secondary assessment query resolves', () => {
    expect(
      hasResolvedTrustedInvestorProfile({
        canonicalProfileKey: 'moderate',
        assessmentProfileKey: null,
      }),
    ).toBe(true);
  });

  it('prompts investor profile review after the review window expires', () => {
    expect(shouldPromptInvestorProfileReview(null, '2026-10-10')).toBe(false);
    expect(shouldPromptInvestorProfileReview('2026-07-01T10:00:00.000Z', '2026-10-10')).toBe(false);
    expect(shouldPromptInvestorProfileReview('2026-03-01T10:00:00.000Z', '2026-10-10')).toBe(true);
  });

  it('groups gamification badges into one family per canonical badge with the highest unlocked tier', () => {
    const grouped = buildGroupedGamificationAchievementsForEducation([
      {
        badge_id: 'budget_ninja',
        unlocked: true,
        tier: 'bronze' as const,
        progress: 1,
        target: 1,
      },
      {
        badge_id: 'budget_ninja',
        unlocked: false,
        tier: 'silver' as const,
        progress: 2,
        target: 3,
      },
      {
        badge_id: 'consistency_king',
        unlocked: true,
        tier: 'silver' as const,
        progress: 6,
        target: 6,
      },
    ] as unknown as BadgeProgress[]);

    expect(grouped).toHaveLength(2);
    const ninja = grouped.find((g) => g.id === 'budget_ninja')!;
    expect(ninja.currentTier).toBe('bronze');
    expect(ninja.nextTier).toBe('silver');
    expect(ninja.currentTierUnlocked).toBe(true);
    expect(ninja.description).toBe('Fique abaixo do limite em todas as categorias');
    expect(ninja.roadmap).toHaveLength(3);
    expect(ninja.roadmap[0]).toEqual(
      expect.objectContaining({ tier: 'bronze', unlocked: true }),
    );
    expect(ninja.roadmap[1]).toEqual(
      expect.objectContaining({ tier: 'silver', unlocked: false }),
    );
    expect(ninja.insight).toBeTruthy();

    const king = grouped.find((g) => g.id === 'consistency_king')!;
    expect(king.currentTier).toBe('silver');
    expect(king.roadmap.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps locked achievements in progress and points them to bronze instead of marking them complete', () => {
    const grouped = buildGroupedGamificationAchievementsForEducation([
      {
        badge_id: 'emergency_fund',
        unlocked: false,
        tier: 'bronze' as const,
        progress: 0,
        target: 3000,
      },
      {
        badge_id: 'emergency_fund',
        unlocked: false,
        tier: 'silver' as const,
        progress: 0,
        target: 10000,
      },
      {
        badge_id: 'emergency_fund',
        unlocked: false,
        tier: 'gold' as const,
        progress: 0,
        target: 30000,
      },
    ] as unknown as BadgeProgress[]);

    expect(grouped).toHaveLength(1);
    const tile = grouped[0];
    expect(tile.id).toBe('emergency_fund');
    expect(tile.currentTier).toBeNull();
    expect(tile.currentTierUnlocked).toBe(false);
    expect(tile.nextTier).toBe('bronze');
    expect(tile.progress).toBe(0);
    expect(tile.target).toBe(3000);
    expect(tile.description).toBe('Construa sua reserva de segurança');
    expect(tile.roadmap).toHaveLength(3);
    expect(tile.roadmap.every((r) => !r.unlocked)).toBe(true);
    expect(tile.insight).toBeTruthy();
  });

  it('builds a premium mentorship presentation from the Ana context', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 5,
        financialGoalCount: 1,
        totalLessonCount: 10,
        completedLessonCount: 3,
        nextLessonId: 'L2',
      }),
    );

    const presentation = buildAnaMentorshipPresentation(
      {
        ...ctx,
        recommendedTrack: 'eliminando_dividas',
        journey: {
          ...ctx.journey,
          primaryFocus: 'eliminando_dividas',
        },
        ana: {
          summary: 'Você precisa consolidar primeiro a base antes de aumentar exposição a risco.',
          insights: ['Há contas vencidas em aberto.', 'Sua reserva ainda está baixa.'],
          recommendations: ['Regularize as contas vencidas.', 'Fortaleça a reserva.'],
        },
      },
      { eliminando_dividas: 'Eliminando Dívidas' },
      'Lição 2',
    );

    expect(presentation).not.toBeNull();
    expect(presentation?.focusTitle).toBe('Eliminando Dívidas');
    expect(presentation?.reasonWhy).toContain('base');
    expect(presentation?.nextStepTitle).toBe('Lição 2');
    expect(presentation?.attentionItems).toContain('Há contas vencidas em aberto.');
  });

  it('shows daily tip narrative and deterministic reason', () => {
    const base = createEmptyEducationContext();
    const tip = {
      ...base,
      dailyTip: {
        tipId: 'tip-1',
        narrativeText: 'Revise assinaturas hoje.',
        deterministicReason: 'high_discretionary_spend',
        deliveredAt: '2026-04-07',
      },
      quality: {
        ...base.quality,
        dailyTip: { source: 'database_state', completeness: 'complete' },
      },
    } as import('@/utils/education/intelligence-contract').EducationIntelligenceContext;

    const pres = buildDailyTipPresentation(tip);
    expect(pres).not.toBeNull();
    expect(pres!.narrativeText).toBe('Revise assinaturas hoje.');
    expect(pres!.deterministicReason).toBe('high_discretionary_spend');
  });

  it('filters glossary terms by search tokens across term, definition, and slug', () => {
    const terms = [
      { slug: 'cdi', term: 'CDI', short_definition: 'Taxa referência' },
      { slug: 'selic', term: 'Selic', short_definition: 'Taxa básica de juros' },
    ];
    expect(filterGlossaryTermsForSearch(terms, 'cdi')).toHaveLength(1);
    expect(filterGlossaryTermsForSearch(terms, 'referência')).toHaveLength(1);
    expect(filterGlossaryTermsForSearch(terms, 'juros básica')).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'selic' })]),
    );
    expect(filterGlossaryTermsForSearch(terms, '   ')).toHaveLength(2);
  });

  it('builds hero subtitle with track title when personalized', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        transactionCount: 5,
        financialGoalCount: 1,
      }),
    );
    const titles = { organizacao_basica: 'Organização Básica' };
    expect(buildEducationHeroSubtitle(ctx, titles)).toContain('Organização Básica');
    expect(buildEducationHeroSubtitle(ctx, titles)).toContain('contexto financeiro atual');
  });

  it('builds progress summary lines from full context', () => {
    const ctx = fullContextFromMetrics(
      metrics({
        totalLessonCount: 10,
        completedLessonCount: 3,
        nextLessonId: 'x',
        gamificationStreakDays: 4,
      }),
    );
    const lines = buildProgressSummaryLines(ctx);
    expect(lines.some((l) => l.includes('3'))).toBe(true);
    expect(lines.some((l) => l.includes('10'))).toBe(true);
    expect(lines.some((l) => l.includes('4'))).toBe(true);
  });
});
