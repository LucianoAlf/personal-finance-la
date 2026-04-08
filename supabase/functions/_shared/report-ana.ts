import type {
  ReportAnaSection,
  ReportIntelligenceContext,
  ReportSectionQuality,
} from '../../../src/utils/reports/intelligence-contract.ts';
import { getDefaultAIConfig, callChat } from './ai.ts';
import { buildDeterministicFacts } from './report-renderers.ts';

export async function buildReportAnaNarrative({
  supabase,
  userId,
  context,
  periodLabel,
}: {
  supabase: any;
  userId: string;
  context: ReportIntelligenceContext;
  periodLabel: string;
}): Promise<{ ana: ReportAnaSection | null; quality: ReportSectionQuality }> {
  const fallback = buildFallbackReportAnaSection(context);
  if (!fallback) {
    return {
      ana: null,
      quality: {
        source: 'unavailable',
        completeness: 'unavailable',
      },
    };
  }

  const aiConfig = await getDefaultAIConfig(supabase, userId);
  if (!aiConfig) {
    return {
      ana: fallback,
      quality: {
        source: 'internal_calculation',
        completeness: 'partial',
      },
    };
  }

  try {
    const deterministicFacts = buildDeterministicFacts(context);
    const response = await callChat(aiConfig, [
      {
        role: 'system',
        content:
          'Você é Ana Clara, analista financeira sênior. Responda SOMENTE em JSON válido com as chaves summary, insights, risks, recommendations e nextBestActions. Não invente dados. Baseie-se apenas nos fatos recebidos. Não repita números, percentuais ou valores monetários no summary; use o summary apenas para uma leitura qualitativa curta.',
      },
      {
        role: 'user',
        content: [
          `Período: ${periodLabel}`,
          'Fatos determinísticos do relatório:',
          ...deterministicFacts.map((fact) => `- ${fact}`),
          '',
          'Regras:',
          '- summary: 1 parágrafo curto e objetivo',
          '- insights: array com até 3 itens',
          '- risks: array com até 3 itens',
          '- recommendations: array com até 3 itens',
          '- nextBestActions: array com até 3 itens',
        ].join('\n'),
      },
    ]);

    const parsed = parseReportAnaResponse(response);
    const merged = mergeWithDeterministicFallback(parsed, fallback);
    return {
      ana: merged,
      quality: {
        source: parsed ? 'ai_interpretation' : 'internal_calculation',
        completeness: parsed ? 'complete' : 'partial',
      },
    };
  } catch (error) {
    console.error('[report-ana] failed to build AI interpretation', error);
    return {
      ana: fallback,
      quality: {
        source: 'internal_calculation',
        completeness: 'partial',
      },
    };
  }
}

export function parseReportAnaResponse(raw: string): ReportAnaSection | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<ReportAnaSection>;
    return normalizeReportAnaSection(parsed);
  } catch {
    return null;
  }
}

export function buildFallbackReportAnaSection(
  context: ReportIntelligenceContext,
): ReportAnaSection | null {
  const facts = buildDeterministicFacts(context);
  if (facts.length === 0) {
    return null;
  }

  const summary = `O patrimônio e o fluxo do período mostram um retrato consolidado do fechamento analisado: ${facts
    .slice(0, 2)
    .join(' | ')}`;

  return {
    summary,
    insights: facts.slice(0, 3),
    risks: context.obligations && context.obligations.overdueBillsCount > 0
      ? [
          `Existem ${context.obligations.overdueBillsCount} conta(s) vencida(s), o que aumenta a pressão financeira imediata.`,
        ]
      : ['Não há riscos narrativos extras além dos fatos já consolidados neste período.'],
    recommendations: context.goals && context.goals.active > 0
      ? ['Use o retrato do período para revisar metas ativas e direcionar o próximo ciclo.']
      : ['Mantenha o acompanhamento do relatório para validar a consistência do próximo fechamento.'],
    nextBestActions: [
      'Comparar o fechamento atual com o próximo snapshot consolidado.',
      'Revisar o bloco de obrigações e metas antes do próximo ciclo financeiro.',
    ],
  };
}

function mergeWithDeterministicFallback(
  parsed: ReportAnaSection | null,
  fallback: ReportAnaSection,
): ReportAnaSection {
  if (!parsed) {
    return fallback;
  }

  return {
    summary: fallback.summary,
    insights: parsed.insights.length > 0 ? parsed.insights : fallback.insights,
    risks: parsed.risks.length > 0 ? parsed.risks : fallback.risks,
    recommendations:
      parsed.recommendations.length > 0
        ? parsed.recommendations
        : fallback.recommendations,
    nextBestActions:
      parsed.nextBestActions.length > 0
        ? parsed.nextBestActions
        : fallback.nextBestActions,
  };
}

function normalizeReportAnaSection(input: Partial<ReportAnaSection>): ReportAnaSection | null {
  const summary = typeof input.summary === 'string' ? input.summary.trim() : '';
  const insights = normalizeStringList(input.insights);
  const risks = normalizeStringList(input.risks);
  const recommendations = normalizeStringList(input.recommendations);
  const nextBestActions = normalizeStringList(input.nextBestActions);

  if (!summary && insights.length === 0 && risks.length === 0 && recommendations.length === 0 && nextBestActions.length === 0) {
    return null;
  }

  return {
    summary: summary || null,
    insights,
    risks,
    recommendations,
    nextBestActions,
  };
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);
}
