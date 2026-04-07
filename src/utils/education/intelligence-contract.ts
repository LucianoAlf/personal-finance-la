import { applyTrackSuitabilityGuardrails } from './investor-suitability.ts';

export type EducationQualitySource =
  | 'database_state'
  | 'internal_calculation'
  | 'external_market'
  | 'ai_interpretation'
  | 'unavailable';

export type EducationQualityCompleteness = 'complete' | 'partial' | 'unavailable';

export interface EducationSectionQuality {
  source: EducationQualitySource;
  completeness: EducationQualityCompleteness;
}

export const EDUCATION_INTELLIGENCE_SECTIONS = [
  'journey',
  'progress',
  'dailyTip',
  'investorProfile',
  'glossary',
  'ana',
  'quality',
] as const;

export type EducationSectionKey = (typeof EDUCATION_INTELLIGENCE_SECTIONS)[number];
export type EducationDataSectionKey = Exclude<EducationSectionKey, 'quality'>;

export interface EducationJourneySection {
  /** True when deterministic signals support a personalized learning trail. */
  hasSufficientData: boolean;
  hasPersonalizedTrail: boolean;
  recommendedTrackSlugs: string[];
  primaryFocus: string | null;
}

export interface EducationProgressSection {
  completedLessonsCount: number;
  totalLessonsAvailable: number;
  currentStreakDays: number | null;
  nextLessonId: string | null;
  hasAnyProgress: boolean;
}

export interface EducationDailyTipSection {
  tipId: string | null;
  narrativeText: string | null;
  deterministicReason: string | null;
  deliveredAt: string | null;
}

export interface EducationInvestorProfileSection {
  profileKey: string | null;
  summary: string | null;
  lastAssessmentAt: string | null;
  isComplete: boolean;
  /** When true, the client should surface the suitability questionnaire CTA. */
  needsSuitabilityQuestionnaire?: boolean;
}

export interface EducationGlossarySection {
  highlightedTermSlugs: string[];
  suggestedSearches: string[];
}

export interface EducationAnaSection {
  summary: string | null;
  insights: string[];
  recommendations: string[];
}

export interface EducationRecommendedModuleRef {
  trackSlug: string;
  moduleSlug: string;
}

export type EducationQualityMap = Record<EducationDataSectionKey, EducationSectionQuality>;

export const RENDERABLE_EDUCATION_SECTION_KEYS: Array<Exclude<EducationDataSectionKey, 'ana'>> = [
  'journey',
  'progress',
  'dailyTip',
  'investorProfile',
  'glossary',
];

export interface EducationIntelligenceContext {
  journey: EducationJourneySection;
  progress: EducationProgressSection | null;
  dailyTip: EducationDailyTipSection | null;
  investorProfile: EducationInvestorProfileSection | null;
  glossary: EducationGlossarySection | null;
  ana: EducationAnaSection | null;
  quality: EducationQualityMap;
}

/** Serializable behavior rollup used for auditing and personalization rules. */
export interface EducationBehaviorSnapshot {
  referenceDate: string;
  periodStart: string;
  periodEnd: string;
  transactionSampleSize: number;
  bankIncomeTotal: number;
  bankExpenseTotal: number;
  cardExpenseTotal: number;
  overduePayableCount: number;
  overdueInvoiceCount: number;
  creditCardOutstanding: number;
  financialGoalCount: number;
  emergencyReserveProgress: number | null;
  activeInvestmentCount: number;
  activeInvestmentGoalCount: number;
  portfolioSnapshotCount: number;
  gamificationStreakDays: number | null;
  badgeUnlockedCount: number;
  completedEducationLessons: number;
  totalEducationLessons: number;
  /** Lessons in the catalog whose `content_blocks` is a non-empty array. */
  lessonsWithContent: number;
  investorAssessmentComplete: boolean;
}

/** Aggregated inputs for the deterministic builder (from DB rows or tests). */
export interface EducationIntelligenceMetrics {
  referenceDate: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  bankIncomeTotal: number;
  bankExpenseTotal: number;
  cardExpenseTotal: number;
  overduePayableCount: number;
  overdueInvoiceCount: number;
  creditCardOutstanding: number;
  financialGoalCount: number;
  emergencyReserveProgress: number | null;
  activeInvestmentCount: number;
  activeInvestmentGoalCount: number;
  portfolioSnapshotCount: number;
  gamificationStreakDays: number | null;
  badgeUnlockedCount: number;
  completedLessonCount: number;
  totalLessonCount: number;
  nextLessonId: string | null;
  investorAssessment: {
    profileKey: string | null;
    confidence: number | null;
    effectiveAt: string | null;
    explanation: string | null;
  } | null;
  glossaryTermSlugs: string[];
  dailyTip: {
    id: string;
    narrativeText: string;
    deterministicReason: string;
    deliveredAt: string | null;
  } | null;
  availableModules?: EducationRecommendedModuleRef[];
  /** Count of catalog lessons with non-empty `content_blocks` (from DB). */
  lessonsWithContent?: number;
}

export type EducationIntelligenceFullContext = EducationIntelligenceContext & {
  generatedAt: string;
  behaviorSnapshot: EducationBehaviorSnapshot;
  recommendedTrack: string | null;
  recommendedModules: EducationRecommendedModuleRef[];
  learningBlockers: string[];
  nextActions: string[];
  dailyTipReason: string | null;
};

const TRACK_ORGANIZACAO = 'organizacao_basica';
const TRACK_DIVIDAS = 'eliminando_dividas';
const TRACK_INVESTIR = 'comecando_a_investir';

function isInvestorAssessmentComplete(
  row: EducationIntelligenceMetrics['investorAssessment'],
): boolean {
  if (!row?.profileKey) {
    return false;
  }
  if (row.confidence === null || row.confidence === undefined) {
    return false;
  }
  return row.confidence >= 0.35;
}

function buildRecommendedModules(
  recommendedTrackSlugs: string[],
  availableModules: EducationRecommendedModuleRef[],
): EducationRecommendedModuleRef[] {
  if (availableModules.length > 0) {
    const modulesByTrack = new Map<string, EducationRecommendedModuleRef>();
    for (const module of availableModules) {
      if (!modulesByTrack.has(module.trackSlug)) {
        modulesByTrack.set(module.trackSlug, module);
      }
    }

    return recommendedTrackSlugs
      .map((trackSlug) => modulesByTrack.get(trackSlug))
      .filter((module): module is EducationRecommendedModuleRef => Boolean(module));
  }

  return recommendedTrackSlugs.slice(0, 3).map((trackSlug) => ({
    trackSlug,
    moduleSlug: 'nucleo',
  }));
}

export function buildEducationIntelligenceFullContext(
  metrics: EducationIntelligenceMetrics,
  generatedAtIso: string = new Date().toISOString(),
): EducationIntelligenceFullContext {
  const debtPressure =
    metrics.overduePayableCount > 0 ||
    metrics.overdueInvoiceCount > 0;

  const reserveWeak =
    metrics.emergencyReserveProgress === null || metrics.emergencyReserveProgress < 0.25;
  const hasInvestingExposure =
    metrics.activeInvestmentCount > 0 || metrics.activeInvestmentGoalCount > 0;
  const reserveBeforeRisk = hasInvestingExposure && reserveWeak;

  const learningBlockers: string[] = [];
  if (debtPressure) {
    learningBlockers.push('high_priority_debt_signals');
  }
  if (reserveBeforeRisk) {
    learningBlockers.push('emergency_reserve_before_risk_assets');
  }

  const nextActions: string[] = [];
  if (debtPressure) {
    nextActions.push('resolve_overdue_obligations');
  }
  if (reserveBeforeRisk) {
    nextActions.push('establish_emergency_reserve');
  }

  const assessmentComplete = isInvestorAssessmentComplete(metrics.investorAssessment);
  const needsQuestionnaire = !assessmentComplete;
  if (needsQuestionnaire) {
    nextActions.push('complete_investor_profile_questionnaire');
  }

  let recommendedTrackSlugs: string[] = [];
  if (debtPressure) {
    recommendedTrackSlugs = [TRACK_DIVIDAS, TRACK_ORGANIZACAO, TRACK_INVESTIR];
  } else if (reserveBeforeRisk) {
    recommendedTrackSlugs = [TRACK_ORGANIZACAO, TRACK_DIVIDAS, TRACK_INVESTIR];
  } else if (hasInvestingExposure && !reserveWeak) {
    recommendedTrackSlugs = [TRACK_INVESTIR, TRACK_ORGANIZACAO, TRACK_DIVIDAS];
  } else if (
    metrics.transactionCount < 3 &&
    metrics.financialGoalCount === 0 &&
    metrics.completedLessonCount === 0 &&
    !debtPressure
  ) {
    recommendedTrackSlugs = [TRACK_ORGANIZACAO];
  } else {
    recommendedTrackSlugs = [TRACK_ORGANIZACAO, TRACK_INVESTIR, TRACK_DIVIDAS];
  }

  recommendedTrackSlugs = [...new Set(recommendedTrackSlugs)];

  recommendedTrackSlugs = applyTrackSuitabilityGuardrails(
    metrics.investorAssessment?.profileKey ?? null,
    assessmentComplete,
    recommendedTrackSlugs,
  );

  const hasSufficientData =
    metrics.transactionCount >= 3 ||
    metrics.financialGoalCount > 0 ||
    metrics.completedLessonCount > 0 ||
    debtPressure ||
    metrics.activeInvestmentCount > 0 ||
    assessmentComplete;

  const primaryFocus = recommendedTrackSlugs[0] ?? null;
  const recommendedModules = buildRecommendedModules(
    recommendedTrackSlugs,
    metrics.availableModules || [],
  );

  const behaviorSnapshot: EducationBehaviorSnapshot = {
    referenceDate: metrics.referenceDate,
    periodStart: metrics.periodStart,
    periodEnd: metrics.periodEnd,
    transactionSampleSize: metrics.transactionCount,
    bankIncomeTotal: metrics.bankIncomeTotal,
    bankExpenseTotal: metrics.bankExpenseTotal,
    cardExpenseTotal: metrics.cardExpenseTotal,
    overduePayableCount: metrics.overduePayableCount,
    overdueInvoiceCount: metrics.overdueInvoiceCount,
    creditCardOutstanding: metrics.creditCardOutstanding,
    financialGoalCount: metrics.financialGoalCount,
    emergencyReserveProgress: metrics.emergencyReserveProgress,
    activeInvestmentCount: metrics.activeInvestmentCount,
    activeInvestmentGoalCount: metrics.activeInvestmentGoalCount,
    portfolioSnapshotCount: metrics.portfolioSnapshotCount,
    gamificationStreakDays: metrics.gamificationStreakDays,
    badgeUnlockedCount: metrics.badgeUnlockedCount,
    completedEducationLessons: metrics.completedLessonCount,
    totalEducationLessons: metrics.totalLessonCount,
    lessonsWithContent: metrics.lessonsWithContent ?? 0,
    investorAssessmentComplete: assessmentComplete,
  };

  const journeyQuality: EducationSectionQuality = hasSufficientData
    ? { source: 'internal_calculation', completeness: 'complete' }
    : { source: 'unavailable', completeness: 'unavailable' };

  let progress: EducationProgressSection | null = null;
  let progressQuality: EducationSectionQuality = createUnavailableEducationSectionQuality();
  if (metrics.totalLessonCount > 0) {
    progress = {
      completedLessonsCount: metrics.completedLessonCount,
      totalLessonsAvailable: metrics.totalLessonCount,
      currentStreakDays: metrics.gamificationStreakDays,
      nextLessonId: metrics.nextLessonId,
      hasAnyProgress:
        metrics.completedLessonCount > 0 || metrics.nextLessonId !== null,
    };
    progressQuality = { source: 'database_state', completeness: 'complete' };
  }

  let dailyTip: EducationDailyTipSection | null = null;
  let dailyTipQuality: EducationSectionQuality = createUnavailableEducationSectionQuality();
  if (metrics.dailyTip) {
    dailyTip = {
      tipId: metrics.dailyTip.id,
      narrativeText: metrics.dailyTip.narrativeText,
      deterministicReason: metrics.dailyTip.deterministicReason,
      deliveredAt: metrics.dailyTip.deliveredAt,
    };
    dailyTipQuality = { source: 'database_state', completeness: 'complete' };
  }

  const investorProfile: EducationInvestorProfileSection = {
    profileKey: metrics.investorAssessment?.profileKey ?? null,
    summary: metrics.investorAssessment?.explanation ?? null,
    lastAssessmentAt: metrics.investorAssessment?.effectiveAt ?? null,
    isComplete: assessmentComplete,
    ...(needsQuestionnaire ? { needsSuitabilityQuestionnaire: true } : {}),
  };

  const investorQuality: EducationSectionQuality =
    assessmentComplete
      ? { source: 'database_state', completeness: 'complete' }
      : { source: 'database_state', completeness: 'partial' };

  let glossary: EducationGlossarySection | null = null;
  let glossaryQuality: EducationSectionQuality = createUnavailableEducationSectionQuality();
  if (metrics.glossaryTermSlugs.length > 0) {
    glossary = {
      highlightedTermSlugs: metrics.glossaryTermSlugs.slice(0, 8),
      suggestedSearches: metrics.glossaryTermSlugs.slice(0, 3),
    };
    glossaryQuality = { source: 'database_state', completeness: 'complete' };
  }

  return {
    journey: {
      hasSufficientData,
      hasPersonalizedTrail: hasSufficientData && recommendedTrackSlugs.length > 0,
      recommendedTrackSlugs,
      primaryFocus,
    },
    progress,
    dailyTip,
    investorProfile,
    glossary,
    ana: null,
    quality: {
      journey: journeyQuality,
      progress: progressQuality,
      dailyTip: dailyTipQuality,
      investorProfile: investorQuality,
      glossary: glossaryQuality,
      ana: createUnavailableEducationSectionQuality(),
    },
    generatedAt: generatedAtIso,
    behaviorSnapshot,
    recommendedTrack: primaryFocus,
    recommendedModules,
    learningBlockers,
    nextActions,
    dailyTipReason: metrics.dailyTip?.deterministicReason ?? null,
  };
}

export function isEducationSectionReliable(section: EducationSectionQuality) {
  return section.source !== 'unavailable' && section.completeness === 'complete';
}

export function getEducationQualityLabel(source: EducationQualitySource) {
  const labels: Record<EducationQualitySource, string> = {
    database_state: 'Dados do banco',
    internal_calculation: 'Cálculo interno',
    external_market: 'Mercado externo',
    ai_interpretation: 'Interpretação da Ana Clara',
    unavailable: 'Indisponível',
  };

  return labels[source];
}

export function createUnavailableEducationSectionQuality(): EducationSectionQuality {
  return {
    source: 'unavailable',
    completeness: 'unavailable',
  };
}

export function createEmptyEducationContext(): EducationIntelligenceContext {
  return {
    journey: {
      hasSufficientData: false,
      hasPersonalizedTrail: false,
      recommendedTrackSlugs: [],
      primaryFocus: null,
    },
    progress: null,
    dailyTip: null,
    investorProfile: null,
    glossary: null,
    ana: null,
    quality: {
      journey: createUnavailableEducationSectionQuality(),
      progress: createUnavailableEducationSectionQuality(),
      dailyTip: createUnavailableEducationSectionQuality(),
      investorProfile: createUnavailableEducationSectionQuality(),
      glossary: createUnavailableEducationSectionQuality(),
      ana: createUnavailableEducationSectionQuality(),
    },
  };
}

function hasRenderableEducationSectionPayload(
  key: Exclude<EducationDataSectionKey, 'ana'>,
  context: EducationIntelligenceContext
) {
  if (key === 'journey') {
    return context.journey.hasSufficientData;
  }

  if (key === 'progress') {
    const section = context.progress;
    return Boolean(
      section &&
        (section.hasAnyProgress ||
          section.completedLessonsCount > 0 ||
          section.nextLessonId !== null)
    );
  }

  if (key === 'dailyTip') {
    return Boolean(context.dailyTip?.narrativeText);
  }

  if (key === 'investorProfile') {
    const section = context.investorProfile;
    return Boolean(
      section &&
        (section.needsSuitabilityQuestionnaire ||
          section.isComplete ||
          section.profileKey !== null ||
          section.summary !== null ||
          section.lastAssessmentAt !== null)
    );
  }

  return Boolean(
    context.glossary &&
      (context.glossary.highlightedTermSlugs.length > 0 ||
        context.glossary.suggestedSearches.length > 0)
  );
}

export function hasRenderableEducationData(context: EducationIntelligenceContext) {
  return RENDERABLE_EDUCATION_SECTION_KEYS.some((key) => {
    const quality = context.quality?.[key];

    if (!quality || !isEducationSectionReliable(quality)) {
      return false;
    }

    return hasRenderableEducationSectionPayload(key, context);
  });
}
