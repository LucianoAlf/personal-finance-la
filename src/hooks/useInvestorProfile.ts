import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getEducationIntelligenceQueryKey } from '@/hooks/useEducationIntelligence';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  buildAnswersPayload,
  deriveTrustedInvestorAssessment,
  INVESTOR_QUESTIONNAIRE_VERSION,
  scoreInvestorQuestionnaire,
  type TrustedInvestorAssessment,
  type InvestorQuestionnaireResponses,
} from '@/utils/education/investor-suitability';

export interface InvestorAssessmentRow {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  profile_key: string | null;
  confidence: number | null;
  effective_at: string;
  explanation: string | null;
  questionnaire_version: number | null;
  created_at: string;
}

export function useInvestorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['investor-profile-assessment', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investor_profile_assessments')
        .select('id, user_id, answers, profile_key, confidence, effective_at, explanation, questionnaire_version, created_at')
        .eq('user_id', user!.id)
        .order('effective_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InvestorAssessmentRow | null;
    },
  });

  const submitAssessment = useMutation({
    mutationFn: async (responses: InvestorQuestionnaireResponses) => {
      const score = scoreInvestorQuestionnaire(responses);
      if (!score.complete || score.profileKey === null) {
        throw new Error('Questionário incompleto');
      }
      const answers = buildAnswersPayload(responses, score);
      const effectiveAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('investor_profile_assessments')
        .insert({
          user_id: user!.id,
          answers,
          questionnaire_version: INVESTOR_QUESTIONNAIRE_VERSION,
          profile_key: score.profileKey,
          confidence: score.confidence,
          effective_at: effectiveAt,
          explanation: score.explanation,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['investor-profile-assessment', user?.id] }),
        queryClient.invalidateQueries({
          queryKey: getEducationIntelligenceQueryKey(user?.id),
          refetchType: 'active',
        }),
      ]);
    },
  });

  const trustedAssessment: TrustedInvestorAssessment | null = query.data
    ? deriveTrustedInvestorAssessment(query.data)
    : null;

  return {
    latestAssessment: query.data ?? null,
    trustedAssessment,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    submitAssessment: submitAssessment.mutateAsync,
    isSubmitting: submitAssessment.isPending,
    submitError: submitAssessment.error,
  };
}
