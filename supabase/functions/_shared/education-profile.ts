/**
 * Investor suitability helpers for Edge Functions (WhatsApp + education pipeline).
 * Scoring rules live in src/utils/education/investor-suitability.ts (single source of truth).
 */

import {
  buildAnswersPayload,
  deriveTrustedInvestorAssessment,
  getBlockedRecommendationClasses,
  INVESTOR_QUESTIONNAIRE_VERSION,
  scoreInvestorQuestionnaire,
  type InvestorQuestionnaireResponses,
} from '../../../src/utils/education/investor-suitability.ts';

export {
  buildAnswersPayload,
  deriveTrustedInvestorAssessment,
  getBlockedRecommendationClasses,
  INVESTOR_QUESTIONNAIRE_VERSION,
  scoreInvestorQuestionnaire,
  type InvestorQuestionnaireResponses,
};

export interface InvestorAssessmentDbRow {
  profile_key: string | null;
  confidence: number | null;
  effective_at: string | null;
  explanation: string | null;
  questionnaire_version?: number | null;
  answers?: Record<string, unknown> | null;
}

/** Structured facts for LLM context (JSON-serializable, no UI copy). */
export interface InvestorSuitabilityWhatsAppFacts {
  current_profile_key: string | null;
  confidence: number | null;
  last_assessed_at: string | null;
  questionnaire_version: number | null;
  assessment_complete: boolean;
  blocked_recommendation_classes: string[];
}

export function buildWhatsAppSuitabilityFacts(row: InvestorAssessmentDbRow | null): InvestorSuitabilityWhatsAppFacts {
  const trusted = deriveTrustedInvestorAssessment(row);

  return {
    current_profile_key: trusted.profileKey,
    confidence: trusted.confidence,
    last_assessed_at: trusted.effectiveAt,
    questionnaire_version: trusted.questionnaireVersion,
    assessment_complete: trusted.questionnaireComplete,
    blocked_recommendation_classes: trusted.blockedRecommendationClasses,
  };
}

export function formatWhatsAppSuitabilityFactsBlock(facts: InvestorSuitabilityWhatsAppFacts): string {
  return `\n## PERFIL DE INVESTIDOR (dados determinísticos — respeitar guardrails)\n${JSON.stringify(facts, null, 2)}\n`;
}
