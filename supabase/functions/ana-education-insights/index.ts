import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDefaultAIConfig, callChat } from '../_shared/ai.ts';
import {
  buildAnaEducationPayloadForUser,
  mergeAnaEducationAiPolish,
} from '../_shared/education-renderers.ts';
import type { EducationAnaSection } from '../../../src/utils/education/intelligence-contract.ts';
import { getBlockedRecommendationClasses } from '../../../src/utils/education/investor-suitability.ts';
import {
  createErrorResponse,
  EducationIntelligenceHttpError,
  readRequestBody,
  resolveUserIdFromRequest,
} from '../_shared/education-intelligence-http.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function behavioralWarningsFromFull(full: {
  learningBlockers: string[];
}): string[] {
  const w: string[] = [];
  if (full.learningBlockers.includes('high_priority_debt_signals')) {
    w.push('high_priority_debt_signals');
  }
  if (full.learningBlockers.includes('emergency_reserve_before_risk_assets')) {
    w.push('emergency_reserve_before_risk_assets');
  }
  return w;
}

function parseAiPolish(raw: string): { encouragement?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as { encouragement?: string };
    if (parsed && typeof parsed === 'object' && typeof parsed.encouragement === 'string') {
      return { encouragement: parsed.encouragement };
    }
  } catch (_) {
    return null;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new EducationIntelligenceHttpError(405, 'Method not allowed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment is not configured');
    }

    await readRequestBody(req);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserIdFromRequest(req, supabase);

    const { full, mentoringMemory, deterministicAna } = await buildAnaEducationPayloadForUser(
      supabase,
      userId,
    );

    const profileKey = full.investorProfile?.profileKey ?? null;
    const assessmentComplete = Boolean(full.investorProfile?.isComplete);

    let ana: EducationAnaSection = deterministicAna;
    let usedAi = false;

    const aiConfig = await getDefaultAIConfig(supabase, userId);
    const deterministicJson = JSON.stringify({
      summary: deterministicAna.summary,
      insights: deterministicAna.insights,
      recommendations: deterministicAna.recommendations,
    });

    if (aiConfig?.apiKey) {
      try {
        const systemPrompt =
          'Você é Ana Clara. Recebe fatos determinísticos já validados (trilha, guardrails, dicas). ' +
          'Devolva APENAS JSON válido: {"encouragement":"..."}. ' +
          'O campo encouragement é um parágrafo curto de tom/encorajamento. ' +
          'Não altere trilha, aulas, recomendações de investimento, nem contradiga guardrails. ' +
          'Não inclua markdown.';

        const userPrompt =
          'Fatos fechados (não reescreva estes itens, apenas motive o usuário):\n' +
          deterministicJson;

        const combinedSystem = (aiConfig.systemPrompt ? aiConfig.systemPrompt + '\n\n' : '') + systemPrompt;
        const raw = await callChat(
          {
            ...aiConfig,
            temperature: Math.min(1, Math.max(0, aiConfig.temperature ?? 0.5)),
            maxTokens: Math.min(400, aiConfig.maxTokens ?? 300),
          },
          [
            { role: 'system', content: combinedSystem },
            { role: 'user', content: userPrompt },
          ],
        );

        const polish = parseAiPolish(raw);
        if (polish) {
          ana = mergeAnaEducationAiPolish(deterministicAna, polish);
          usedAi = true;
        }
      } catch (e) {
        console.error('[ana-education-insights] AI polish failed, using deterministic only', e);
      }
    }

    const blockedClasses = getBlockedRecommendationClasses(profileKey, assessmentComplete);

    return new Response(
      JSON.stringify({
        ana,
        mentoringMemory,
        usedAi,
        deterministicAudit: {
          recommendedTrack: full.recommendedTrack,
          recommendedNextLessonId: full.progress?.nextLessonId ?? null,
          suitabilityBlockedClasses: blockedClasses,
          dailyTipReason: full.dailyTipReason,
          learningBlockers: full.learningBlockers,
          behavioralWarnings: behavioralWarningsFromFull(full),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[ana-education-insights] error', error);
    return createErrorResponse(error, corsHeaders);
  }
});
