/**
 * Deterministic investor suitability scoring and education/investment guardrails.
 * Shared by the app view-model tests, Edge helpers, and WhatsApp context.
 */

export const INVESTOR_QUESTIONNAIRE_VERSION = 1;
export const SUPPORTED_INVESTOR_QUESTIONNAIRE_VERSIONS = [INVESTOR_QUESTIONNAIRE_VERSION] as const;

export const EDUCATION_TRACK_COMECANDO_INVESTIR = 'comecando_a_investir';
export const EDUCATION_TRACK_ORGANIZACAO = 'organizacao_basica';
export const EDUCATION_TRACK_DIVIDAS = 'eliminando_dividas';

export type InvestorHorizon = 'short' | 'medium' | 'long';
export type InvestorDrawdownComfort = 'low' | 'medium' | 'high';
export type InvestorExperience = 'none' | 'some' | 'advanced';

/** Raw questionnaire answers (persisted inside assessments.answers.responses). */
export interface InvestorQuestionnaireResponses {
  horizon?: InvestorHorizon;
  drawdownComfort?: InvestorDrawdownComfort;
  experience?: InvestorExperience;
}

export interface NormalizedInvestorQuestionnaire {
  horizon: InvestorHorizon;
  drawdownComfort: InvestorDrawdownComfort;
  experience: InvestorExperience;
  scoreSum: number;
}

/** DB `investor_profile_assessments.profile_key` values (migration CHECK). */
export type InvestorProfileKey =
  | 'conservative'
  | 'moderate'
  | 'balanced'
  | 'growth'
  | 'aggressive';

export interface SuitabilityScoreResult {
  complete: boolean;
  profileKey: InvestorProfileKey | null;
  confidence: number;
  explanation: string;
  normalized: NormalizedInvestorQuestionnaire | null;
}

export interface StoredInvestorAssessmentShape {
  answers?: unknown;
  questionnaire_version?: number | null;
  profile_key?: string | null;
  confidence?: number | null;
  effective_at?: string | null;
  explanation?: string | null;
}

export interface TrustedInvestorAssessment {
  profileKey: InvestorProfileKey | null;
  confidence: number | null;
  effectiveAt: string | null;
  explanation: string | null;
  questionnaireVersion: number | null;
  questionnaireComplete: boolean;
  rawResponses: InvestorQuestionnaireResponses | null;
  normalized: NormalizedInvestorQuestionnaire | null;
  blockedRecommendationClasses: string[];
}

function horizonPoints(h: InvestorHorizon | undefined): number {
  if (h === 'short') return 1;
  if (h === 'medium') return 2;
  if (h === 'long') return 3;
  return 0;
}

function drawdownPoints(d: InvestorDrawdownComfort | undefined): number {
  if (d === 'low') return 1;
  if (d === 'medium') return 2;
  if (d === 'high') return 3;
  return 0;
}

function experiencePoints(e: InvestorExperience | undefined): number {
  if (e === 'none') return 1;
  if (e === 'some') return 2;
  if (e === 'advanced') return 3;
  return 0;
}

function mapSumToProfileKey(sum: number): InvestorProfileKey {
  if (sum <= 4) return 'conservative';
  if (sum <= 6) return 'moderate';
  if (sum === 7) return 'balanced';
  if (sum === 8) return 'growth';
  return 'aggressive';
}

function buildExplanation(normalized: NormalizedInvestorQuestionnaire, profileKey: InvestorProfileKey): string {
  return [
    `Soma=${normalized.scoreSum} (horizonte=${normalized.horizon}, oscilação=${normalized.drawdownComfort}, experiência=${normalized.experience}).`,
    `Perfil derivado: ${profileKey}.`,
    `Versão do questionário: ${INVESTOR_QUESTIONNAIRE_VERSION}.`,
  ].join(' ');
}

function isHorizon(value: unknown): value is InvestorHorizon {
  return value === 'short' || value === 'medium' || value === 'long';
}

function isDrawdownComfort(value: unknown): value is InvestorDrawdownComfort {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isExperience(value: unknown): value is InvestorExperience {
  return value === 'none' || value === 'some' || value === 'advanced';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readStoredQuestionnaireVersion(row: StoredInvestorAssessmentShape | null): number | null {
  const explicitVersion = row?.questionnaire_version;
  if (Number.isFinite(explicitVersion)) {
    return Number(explicitVersion);
  }

  const answersRecord = asRecord(row?.answers);
  const embeddedVersion = answersRecord?.version;
  if (Number.isFinite(Number(embeddedVersion))) {
    return Number(embeddedVersion);
  }

  return null;
}

export function extractInvestorQuestionnaireResponses(
  answers: unknown,
): InvestorQuestionnaireResponses | null {
  const answersRecord = asRecord(answers);
  if (!answersRecord) {
    return null;
  }

  const responseSource = asRecord(answersRecord.responses) ?? answersRecord;
  const responses: InvestorQuestionnaireResponses = {};

  if (isHorizon(responseSource.horizon)) {
    responses.horizon = responseSource.horizon;
  }
  if (isDrawdownComfort(responseSource.drawdownComfort)) {
    responses.drawdownComfort = responseSource.drawdownComfort;
  }
  if (isExperience(responseSource.experience)) {
    responses.experience = responseSource.experience;
  }

  return Object.keys(responses).length > 0 ? responses : null;
}

/**
 * Scores the questionnaire deterministically. Incomplete answers → no profile, confidence 0.
 */
export function scoreInvestorQuestionnaire(responses: InvestorQuestionnaireResponses): SuitabilityScoreResult {
  const h = responses.horizon;
  const d = responses.drawdownComfort;
  const e = responses.experience;

  const hp = horizonPoints(h);
  const dp = drawdownPoints(d);
  const ep = experiencePoints(e);

  if (!h || !d || !e || hp === 0 || dp === 0 || ep === 0) {
    return {
      complete: false,
      profileKey: null,
      confidence: 0,
      explanation: 'Questionário incompleto: responda horizonte, tolerância a oscilação e experiência.',
      normalized: null,
    };
  }

  const scoreSum = hp + dp + ep;
  const profileKey = mapSumToProfileKey(scoreSum);
  const normalized: NormalizedInvestorQuestionnaire = {
    horizon: h,
    drawdownComfort: d,
    experience: e,
    scoreSum,
  };

  return {
    complete: true,
    profileKey,
    confidence: 1,
    explanation: buildExplanation(normalized, profileKey),
    normalized,
  };
}

/** Recommendation / nudge classes blocked for guardrails (auditable, not UI copy). */
export function getBlockedRecommendationClasses(
  profileKey: string | null,
  questionnaireComplete: boolean,
): string[] {
  if (!questionnaireComplete || !profileKey) {
    return ['aggressive_equity_first', 'high_risk_investment_nudge'];
  }
  if (profileKey === 'conservative') {
    return ['aggressive_equity_first', 'high_risk_investment_nudge'];
  }
  if (profileKey === 'moderate' || profileKey === 'balanced') {
    return ['aggressive_equity_first'];
  }
  return [];
}

/**
 * True when the learning trail would prioritize the investing track ahead of foundations
 * in a way that is inappropriate for conservative profiles.
 */
export function isAggressiveEquityFirstEducationOrder(trackSlugs: string[]): boolean {
  if (trackSlugs.length === 0) return false;
  return trackSlugs[0] === EDUCATION_TRACK_COMECANDO_INVESTIR;
}

/**
 * Reorders recommended education tracks so conservative users are not nudged into
 * equity-first learning before organização/dívidas foundations when the model would have placed investing first.
 */
export function applyTrackSuitabilityGuardrails(
  profileKey: string | null,
  questionnaireComplete: boolean,
  trackSlugs: string[],
): string[] {
  const slugs = [...trackSlugs];
  if (questionnaireComplete && profileKey !== 'conservative') {
    return slugs;
  }
  if (!isAggressiveEquityFirstEducationOrder(slugs)) {
    return slugs;
  }
  const investing = slugs.filter((s) => s === EDUCATION_TRACK_COMECANDO_INVESTIR);
  const rest = slugs.filter((s) => s !== EDUCATION_TRACK_COMECANDO_INVESTIR);
  return [...rest, ...investing];
}

export function buildAnswersPayload(
  responses: InvestorQuestionnaireResponses,
  score: SuitabilityScoreResult,
): Record<string, unknown> {
  return {
    version: INVESTOR_QUESTIONNAIRE_VERSION,
    responses,
    normalized: score.normalized,
    scored_at: 'client',
  };
}

export interface OpportunityRiskShape {
  type: string;
  riskLevel: 'low' | 'medium' | 'high';
  assetClass?: string | null;
}

export function classifyInvestmentRecommendationClass(
  item: OpportunityRiskShape,
): string | null {
  if (item.type === 'sell_signal') {
    return null;
  }

  if (item.riskLevel === 'high') {
    return 'high_risk_investment_nudge';
  }

  if (
    item.assetClass === 'acoes_nacionais' ||
    item.assetClass === 'fiis' ||
    item.assetClass === 'internacional' ||
    item.assetClass === 'cripto'
  ) {
    return 'aggressive_equity_first';
  }

  return null;
}

/** Suppresses mentorship nudges that conflict with a known conservative profile. */
export function filterInvestmentOpportunitiesBySuitability<T extends OpportunityRiskShape>(
  items: T[],
  profileKey: string | null,
  assessmentComplete: boolean,
): T[] {
  const blockedClasses = getBlockedRecommendationClasses(profileKey, assessmentComplete);

  return items.filter((item) => {
    const recommendationClass = classifyInvestmentRecommendationClass(item);
    return !recommendationClass || !blockedClasses.includes(recommendationClass);
  });
}

export function deriveTrustedInvestorAssessment(
  row: StoredInvestorAssessmentShape | null,
): TrustedInvestorAssessment {
  const questionnaireVersion = readStoredQuestionnaireVersion(row);
  const supportedVersion =
    questionnaireVersion !== null &&
    SUPPORTED_INVESTOR_QUESTIONNAIRE_VERSIONS.includes(
      questionnaireVersion as (typeof SUPPORTED_INVESTOR_QUESTIONNAIRE_VERSIONS)[number],
    );
  const rawResponses = extractInvestorQuestionnaireResponses(row?.answers);
  const score =
    supportedVersion && rawResponses
      ? scoreInvestorQuestionnaire(rawResponses)
      : {
          complete: false,
          profileKey: null,
          confidence: 0,
          explanation:
            questionnaireVersion === null
              ? 'Questionário sem versão explícita; avaliação tratada como não confiável.'
              : `Versão do questionário não suportada para derivação confiável: ${questionnaireVersion}.`,
          normalized: null,
        };

  return {
    profileKey: score.profileKey,
    confidence: score.complete ? score.confidence : null,
    effectiveAt: row?.effective_at ?? null,
    explanation: score.explanation,
    questionnaireVersion,
    questionnaireComplete: score.complete,
    rawResponses,
    normalized: score.normalized,
    blockedRecommendationClasses: getBlockedRecommendationClasses(score.profileKey, score.complete),
  };
}
