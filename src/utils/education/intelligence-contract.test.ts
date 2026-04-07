import { describe, expect, it } from 'vitest';

import {
  buildDeterministicEducationAnaSection,
  buildEducationMentoringMemoryFromParts,
  filterAnaRecommendationsForSuitability,
  mergeAnaEducationAiPolish,
} from '@/utils/education/education-ana-narrative';
import {
  buildEducationIntelligenceFullContext,
  createEmptyEducationContext,
  getEducationQualityLabel,
  hasRenderableEducationData,
  isEducationSectionReliable,
  type EducationIntelligenceContext,
  type EducationIntelligenceMetrics,
} from '@/utils/education/intelligence-contract';

function emptyMetrics(overrides: Partial<EducationIntelligenceMetrics> = {}): EducationIntelligenceMetrics {
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

describe('education intelligence contract', () => {
  it('marks sections reliable only when complete and non-unavailable', () => {
    expect(
      isEducationSectionReliable({
        source: 'database_state',
        completeness: 'complete',
      })
    ).toBe(true);

    expect(
      isEducationSectionReliable({
        source: 'unavailable',
        completeness: 'unavailable',
      })
    ).toBe(false);
  });

  it('provides quality labels for every education quality source', () => {
    expect(getEducationQualityLabel('database_state')).toBe('Dados do banco');
    expect(getEducationQualityLabel('internal_calculation')).toBe('Cálculo interno');
    expect(getEducationQualityLabel('external_market')).toBe('Mercado externo');
    expect(getEducationQualityLabel('ai_interpretation')).toBe('Interpretação da Ana Clara');
    expect(getEducationQualityLabel('unavailable')).toBe('Indisponível');
  });

  it('treats the hub as renderable when journey has sufficient data', () => {
    const context = {
      ...createEmptyEducationContext(),
      journey: {
        hasSufficientData: true,
        hasPersonalizedTrail: true,
        recommendedTrackSlugs: ['organizacao_basica'],
        primaryFocus: 'organizacao_basica',
      },
      quality: {
        ...createEmptyEducationContext().quality,
        journey: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(true);
  });

  it('does not render the hub when journey has data but journey quality is unreliable', () => {
    const context = {
      ...createEmptyEducationContext(),
      journey: {
        hasSufficientData: true,
        hasPersonalizedTrail: true,
        recommendedTrackSlugs: ['organizacao_basica'],
        primaryFocus: 'organizacao_basica',
      },
      quality: {
        ...createEmptyEducationContext().quality,
        journey: { source: 'internal_calculation', completeness: 'partial' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('treats the hub as renderable when at least one strong non-ana section has payload and reliable data', () => {
    const context = {
      ...createEmptyEducationContext(),
      progress: {
        completedLessonsCount: 3,
        totalLessonsAvailable: 15,
        currentStreakDays: 2,
        nextLessonId: 'lesson-4',
        hasAnyProgress: true,
      },
      quality: {
        ...createEmptyEducationContext().quality,
        progress: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(true);
  });

  it('uses the canonical daily tip narrative field compatible with the database schema', () => {
    const context = {
      ...createEmptyEducationContext(),
      dailyTip: {
        tipId: 'tip-1',
        narrativeText: 'Revise seus gastos fixos antes de aumentar o primeiro aporte.',
        deterministicReason: 'high_fixed_expenses',
        deliveredAt: '2026-04-07T09:00:00.000Z',
      },
      quality: {
        ...createEmptyEducationContext().quality,
        dailyTip: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(context.dailyTip?.narrativeText).toBe(
      'Revise seus gastos fixos antes de aumentar o primeiro aporte.'
    );
    expect(hasRenderableEducationData(context)).toBe(true);
  });

  it('treats the hub as non-renderable when journey is weak and all sections are unreliable', () => {
    const context = {
      ...createEmptyEducationContext(),
      quality: {
        ...createEmptyEducationContext().quality,
        journey: { source: 'unavailable', completeness: 'unavailable' },
        progress: { source: 'internal_calculation', completeness: 'partial' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not treat ana alone as enough to render education', () => {
    const base = createEmptyEducationContext();
    const context = {
      ...base,
      ana: {
        summary: 'Narrativa sem base determinística suficiente.',
        insights: [],
        recommendations: [],
      },
      quality: {
        ...base.quality,
        ana: { source: 'ai_interpretation', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not treat quality metadata alone as enough when the deterministic payload is null', () => {
    const context = {
      ...createEmptyEducationContext(),
      quality: {
        ...createEmptyEducationContext().quality,
        progress: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not render progress when reliable quality exists but the payload is effectively empty', () => {
    const context = {
      ...createEmptyEducationContext(),
      progress: {
        completedLessonsCount: 0,
        totalLessonsAvailable: 15,
        currentStreakDays: null,
        nextLessonId: null,
        hasAnyProgress: false,
      },
      quality: {
        ...createEmptyEducationContext().quality,
        progress: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not render daily tip when reliable quality exists but narrative text is empty', () => {
    const context = {
      ...createEmptyEducationContext(),
      dailyTip: {
        tipId: 'tip-1',
        narrativeText: null,
        deterministicReason: 'high_fixed_expenses',
        deliveredAt: '2026-04-07T09:00:00.000Z',
      },
      quality: {
        ...createEmptyEducationContext().quality,
        dailyTip: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not render investor profile when reliable quality exists but the payload is effectively empty', () => {
    const context = {
      ...createEmptyEducationContext(),
      investorProfile: {
        profileKey: null,
        summary: null,
        lastAssessmentAt: null,
        isComplete: false,
      },
      quality: {
        ...createEmptyEducationContext().quality,
        investorProfile: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('does not render glossary when reliable quality exists but the payload is effectively empty', () => {
    const context = {
      ...createEmptyEducationContext(),
      glossary: {
        highlightedTermSlugs: [],
        suggestedSearches: [],
      },
      quality: {
        ...createEmptyEducationContext().quality,
        glossary: { source: 'database_state', completeness: 'complete' },
      },
    } as EducationIntelligenceContext;

    expect(hasRenderableEducationData(context)).toBe(false);
  });

  it('creates distinct unavailable quality objects per section', () => {
    const context = createEmptyEducationContext();

    expect(context.quality.journey).not.toBe(context.quality.progress);
    expect(context.quality.progress).not.toBe(context.quality.dailyTip);
  });

  it('requires the canonical education sections used by UI and exports', () => {
    const sections = [
      'journey',
      'progress',
      'dailyTip',
      'investorProfile',
      'glossary',
      'ana',
      'quality',
    ];

    const context = createEmptyEducationContext();

    expect(Object.keys(context)).toEqual(expect.arrayContaining(sections));
    expect(context.quality.journey).toEqual({
      source: 'unavailable',
      completeness: 'unavailable',
    });
    expect(context.dailyTip).toBeNull();
  });
});

describe('education intelligence deterministic builder', () => {
  it('treats first-run users with no financial data as journey-insufficient', () => {
    const ctx = buildEducationIntelligenceFullContext(emptyMetrics(), '2026-04-07T12:00:00.000Z');

    expect(ctx.journey.hasSufficientData).toBe(false);
    expect(ctx.quality.journey.completeness).toBe('unavailable');
    expect(ctx.dailyTip).toBeNull();
    expect(ctx.quality.dailyTip.completeness).toBe('unavailable');
    expect(ctx.glossary).toBeNull();
    expect(ctx.quality.glossary.completeness).toBe('unavailable');
  });

  it('routes indebted users to the debt learning track first', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({ overduePayableCount: 1 }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.journey.primaryFocus).toBe('eliminando_dividas');
    expect(ctx.recommendedTrack).toBe('eliminando_dividas');
    expect(ctx.journey.recommendedTrackSlugs[0]).toBe('eliminando_dividas');
    expect(ctx.learningBlockers).toContain('high_priority_debt_signals');
    expect(ctx.nextActions).toContain('resolve_overdue_obligations');
  });

  it('fails safe and avoids equity-first education when suitability is missing', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({
        transactionCount: 8,
        creditCardOutstanding: 1600,
        overdueInvoiceCount: 0,
        activeInvestmentCount: 1,
        emergencyReserveProgress: 0.8,
      }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.journey.primaryFocus).toBe('organizacao_basica');
    expect(ctx.journey.recommendedTrackSlugs[0]).toBe('organizacao_basica');
    expect(ctx.learningBlockers).not.toContain('high_priority_debt_signals');
    expect(ctx.nextActions).toContain('complete_investor_profile_questionnaire');
  });

  it('blocks risky investing education until emergency reserve is adequate when user already invests', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({
        transactionCount: 10,
        activeInvestmentCount: 1,
        emergencyReserveProgress: 0.1,
      }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.learningBlockers).toContain('emergency_reserve_before_risk_assets');
    expect(ctx.journey.recommendedTrackSlugs[0]).toBe('organizacao_basica');
    expect(ctx.journey.primaryFocus).not.toBe('comecando_a_investir');
  });

  it('surfaces incomplete suitability as a questionnaire CTA without UI copy', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({
        transactionCount: 5,
        investorAssessment: {
          profileKey: null,
          confidence: null,
          effectiveAt: null,
          explanation: null,
        },
      }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.investorProfile?.needsSuitabilityQuestionnaire).toBe(true);
    expect(ctx.investorProfile?.isComplete).toBe(false);
    expect(ctx.nextActions).toContain('complete_investor_profile_questionnaire');
    expect(ctx.quality.investorProfile.completeness).toBe('partial');
  });

  it('omits glossary and daily tip cleanly when unavailable', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({
        transactionCount: 5,
        glossaryTermSlugs: [],
        dailyTip: null,
      }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.glossary).toBeNull();
    expect(ctx.quality.glossary.source).toBe('unavailable');
    expect(ctx.dailyTip).toBeNull();
    expect(ctx.dailyTipReason).toBeNull();
  });

  it('uses a structured recommendedModules contract', () => {
    const ctx = buildEducationIntelligenceFullContext(
      emptyMetrics({
        transactionCount: 5,
        availableModules: [
          { trackSlug: 'organizacao_basica', moduleSlug: 'nucleo' },
          { trackSlug: 'comecando_a_investir', moduleSlug: 'primeiros-passos' },
        ],
      }),
      '2026-04-07T12:00:00.000Z',
    );

    expect(ctx.recommendedModules[0]).toEqual({
      trackSlug: 'organizacao_basica',
      moduleSlug: 'nucleo',
    });
  });
});

describe('Ana education narrative (deterministic + suitability)', () => {
  it('keeps deterministic copy when AI polish is unavailable', () => {
    const full = buildEducationIntelligenceFullContext(emptyMetrics({ transactionCount: 5 }), '2026-04-07T12:00:00.000Z');
    const memory = buildEducationMentoringMemoryFromParts({
      profileCurrentStage: 'organizacao_basica',
      profileLearningGaps: [],
      recentTips: [],
      stalledModuleSlug: null,
      completedLessonsCount: 1,
      lessonsInProgressCount: 0,
    });
    const det = buildDeterministicEducationAnaSection(full, memory);
    const merged = mergeAnaEducationAiPolish(det, null);
    expect(merged).toEqual(det);
  });

  it('does not surface aggressive investment wording when suitability blocks it', () => {
    const filtered = filterAnaRecommendationsForSuitability(
      ['Priorize ações e crypto agora', 'Complete o questionário de perfil do investidor para liberar recomendações adequadas.'],
      'conservative',
      true,
      'organizacao_basica',
    );
    expect(filtered.some((l) => /priorize\s+ações|crypto|bitcoin/i.test(l))).toBe(false);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('uses onboarding mentorship for first-run users without fabricated personalization', () => {
    const full = buildEducationIntelligenceFullContext(emptyMetrics(), '2026-04-07T12:00:00.000Z');
    const memory = buildEducationMentoringMemoryFromParts({
      profileCurrentStage: null,
      profileLearningGaps: [],
      recentTips: [],
      stalledModuleSlug: null,
      completedLessonsCount: 0,
      lessonsInProgressCount: 0,
    });
    const ana = buildDeterministicEducationAnaSection(full, memory);
    expect(ana.summary.toLowerCase()).toMatch(/não personalizamos|trilha padrão/);
    expect(ana.summary.toLowerCase()).not.toMatch(/vimos que você|seu histórico mostra/);
  });

  it('reflects behavior-triggered trail switch in narrative when audit memory is present', () => {
    const full = buildEducationIntelligenceFullContext(
      emptyMetrics({ overduePayableCount: 1, transactionCount: 5 }),
      '2026-04-07T12:00:00.000Z',
    );
    const memory = buildEducationMentoringMemoryFromParts({
      profileCurrentStage: 'organizacao_basica',
      profileLearningGaps: [],
      recentTips: [],
      stalledModuleSlug: null,
      completedLessonsCount: 2,
      lessonsInProgressCount: 0,
      explicitTrailSwitch: {
        from: 'organizacao_basica',
        to: 'eliminando_dividas',
        reasonCodes: ['high_priority_debt_signals'],
        switchedAt: '2026-04-07T12:00:00.000Z',
      },
    });
    const ana = buildDeterministicEducationAnaSection(full, memory);
    const joined = `${ana.summary} ${ana.insights.join(' ')}`;
    expect(joined).toMatch(/A trilha foi atualizada|Ajuste de trilha registrado/);
    expect(joined).toMatch(/high_priority_debt_signals|dívida/);
  });
});
