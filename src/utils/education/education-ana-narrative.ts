import type {
  EducationAnaSection,
  EducationIntelligenceFullContext,
} from './intelligence-contract.ts';
import {
  EDUCATION_TRACK_COMECANDO_INVESTIR,
  getBlockedRecommendationClasses,
} from './investor-suitability.ts';

/** Auditable mentoring snapshot (persisted fields + derived facts). */
export interface EducationMentoringMemory {
  previousPrimaryTrackSlug: string | null;
  trailSwitch: null | {
    from: string;
    to: string;
    reasonCodes: string[];
    switchedAt: string;
  };
  stalledModuleSlug: string | null;
  recentAdviceSent: Array<{
    deterministicReason: string;
    narrativeExcerpt: string;
    channel: string;
    createdAt: string | null;
  }>;
  completedLessonsCount: number;
  lessonsInProgressCount: number;
}

const TRAIL_SWITCH_PREFIX = 'audit:trail_switch|';

export function parseTrailSwitchAudits(learningGaps: string[]): EducationMentoringMemory['trailSwitch'] {
  const rows = learningGaps.filter((g) => g.startsWith(TRAIL_SWITCH_PREFIX));
  if (rows.length === 0) return null;
  const latest = rows[rows.length - 1];
  const payload = latest.slice(TRAIL_SWITCH_PREFIX.length);
  const parts = payload.split('|');
  const [switchedAt, from, to, reasonJoined] = parts;
  if (!switchedAt || !from || !to) return null;
  const reasonCodes = (reasonJoined || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { from, to, reasonCodes, switchedAt };
}

export function formatTrailSwitchAudit(
  switchedAt: string,
  from: string,
  to: string,
  reasonCodes: string[],
): string {
  return `${TRAIL_SWITCH_PREFIX}${switchedAt}|${from}|${to}|${reasonCodes.join(',')}`;
}

export function buildEducationMentoringMemoryFromParts(input: {
  profileCurrentStage: string | null;
  profileLearningGaps: string[];
  recentTips: Array<{
    deterministicReason: string;
    narrativeText: string;
    channel: string;
    createdAt: string | null;
  }>;
  stalledModuleSlug: string | null;
  completedLessonsCount: number;
  lessonsInProgressCount: number;
  /** When non-null, overrides parsing learning_gaps for trail switch. */
  explicitTrailSwitch?: EducationMentoringMemory['trailSwitch'];
}): EducationMentoringMemory {
  const trailSwitch = input.explicitTrailSwitch ?? parseTrailSwitchAudits(input.profileLearningGaps);
  return {
    previousPrimaryTrackSlug: input.profileCurrentStage,
    trailSwitch,
    stalledModuleSlug: input.stalledModuleSlug,
    recentAdviceSent: input.recentTips.map((t) => ({
      deterministicReason: t.deterministicReason,
      narrativeExcerpt: t.narrativeText.slice(0, 120),
      channel: t.channel,
      createdAt: t.createdAt,
    })),
    completedLessonsCount: input.completedLessonsCount,
    lessonsInProgressCount: input.lessonsInProgressCount,
  };
}

const NEXT_ACTION_COPY: Record<string, string> = {
  resolve_overdue_obligations: 'Priorize regularizar obrigações vencidas antes de avançar em novos temas.',
  establish_emergency_reserve: 'Fortaleça a reserva de emergência antes de aumentar exposição a risco.',
  complete_investor_profile_questionnaire: 'Complete o questionário de perfil do investidor para liberar recomendações adequadas.',
};

function recommendationLinesFromNextActions(nextActions: string[]): string[] {
  const lines: string[] = [];
  for (const code of nextActions) {
    const line = NEXT_ACTION_COPY[code];
    if (line) lines.push(line);
  }
  return lines;
}

/** Drops investment-forward mentorship lines when suitability blocks aggressive nudges. */
export function filterAnaRecommendationsForSuitability(
  recommendations: string[],
  profileKey: string | null,
  assessmentComplete: boolean,
  primaryTrack: string | null,
): string[] {
  const blocked = getBlockedRecommendationClasses(profileKey, assessmentComplete);
  if (!blocked.includes('high_risk_investment_nudge')) {
    return recommendations;
  }
  if (primaryTrack === EDUCATION_TRACK_COMECANDO_INVESTIR && assessmentComplete && profileKey !== 'conservative') {
    return recommendations;
  }
  return recommendations.filter((line) => {
    const aggressive =
      /aportes agressivos|renda variável agressiva|priorize\s+ações|na bolsa agora|crypto|alavancagem|bitcoin/i.test(
        line,
      );
    return !aggressive;
  });
}

function behavioralWarningInsights(full: EducationIntelligenceFullContext): string[] {
  const out: string[] = [];
  if (full.learningBlockers.includes('high_priority_debt_signals')) {
    out.push('Sinal objetivo: há contas ou faturas em atraso — a trilha prioriza dívidas.');
  }
  if (full.learningBlockers.includes('emergency_reserve_before_risk_assets')) {
    out.push(
      'Sinal objetivo: reserva de emergência baixa com exposição a investimentos — reforçamos organização antes de risco.',
    );
  }
  return out;
}

/**
 * Deterministic Ana copy owns tracks, guardrails, tip reason, and warnings.
 * Safe when AI is down; suitability cannot be overridden here.
 */
export function buildDeterministicEducationAnaSection(
  full: EducationIntelligenceFullContext,
  memory: EducationMentoringMemory,
): EducationAnaSection {
  const profileKey = full.investorProfile?.profileKey ?? null;
  const assessmentComplete = Boolean(full.investorProfile?.isComplete);
  const primary = full.recommendedTrack ?? full.journey.primaryFocus;
  const blocked = getBlockedRecommendationClasses(profileKey, assessmentComplete);

  if (!full.journey.hasSufficientData) {
    const summary =
      'Bem-vindo ao hub de educação financeira. Use a trilha padrão de organização básica enquanto você começa a registrar dados; ' +
      'não personalizamos o percurso com base em histórico até termos sinais mínimos de atividade no app.';
    return {
      summary,
      insights: [
        'Modo onboarding: recomendações genéricas seguras até haver dados suficientes.',
        memory.completedLessonsCount > 0
          ? `Você já concluiu ${memory.completedLessonsCount} aula(s); continue no seu ritmo.`
          : 'Quando houver progresso nas aulas, aparecerá aqui o que você já cobriu.',
      ],
      recommendations: [NEXT_ACTION_COPY.complete_investor_profile_questionnaire].filter(Boolean) as string[],
    };
  }

  const insights: string[] = [
    `Trilha recomendada (determinística): ${primary ?? 'não definida'}.`,
    ...(full.progress?.nextLessonId
      ? [`Próxima aula sugerida pelo motor: id ${full.progress.nextLessonId}.`]
      : []),
    ...behavioralWarningInsights(full),
  ];

  if (full.dailyTipReason) {
    insights.push(`Última dica registrada (motivo canônico): ${full.dailyTipReason}.`);
  }

  if (memory.stalledModuleSlug) {
    insights.push(
      `Módulo com aula em andamento há mais tempo (estagnação provável): ${memory.stalledModuleSlug}.`,
    );
  }

  if (memory.recentAdviceSent.length > 0) {
    insights.push(
      `Dicas recentes já enviadas (canais auditáveis): ${memory.recentAdviceSent
        .map((t) => t.deterministicReason)
        .join(', ')}.`,
    );
  }

  if (memory.trailSwitch) {
    const ts = memory.trailSwitch;
    insights.push(
      `Ajuste de trilha registrado em ${ts.switchedAt}: de "${ts.from}" para "${ts.to}" ` +
        `por motivos: ${ts.reasonCodes.join(', ') || 'registro auditável'}.`,
    );
  }

  if (blocked.length > 0) {
    insights.push(
      `Perfis e guardrails ativos bloqueiam classes de recomendação: ${blocked.join(', ')}.`,
    );
  }

  let summary =
    `Com base nos seus dados atuais, o foco principal de estudo é a trilha "${primary ?? 'organização'}". ` +
    `Seguimos a ordem canônica do motor de educação; a Ana Clara só reforça o tom, sem alterar trilha, aula sugerida ou regras de adequação.`;

  if (memory.trailSwitch) {
    summary += ` A trilha foi atualizada após mudança de comportamento (${memory.trailSwitch.reasonCodes.join(', ') || 'motivos registrados'}).`;
  }

  const recommendations = filterAnaRecommendationsForSuitability(
    recommendationLinesFromNextActions(full.nextActions),
    profileKey,
    assessmentComplete,
    primary,
  );

  return {
    summary,
    insights,
    recommendations,
  };
}

/**
 * AI may append encouragement only; deterministic facts stay authoritative.
 */
export function mergeAnaEducationAiPolish(
  deterministic: EducationAnaSection,
  polish: { encouragement?: string | null } | null | undefined,
): EducationAnaSection {
  if (!polish?.encouragement?.trim()) {
    return deterministic;
  }
  return {
    ...deterministic,
    summary: `${deterministic.summary}\n\n${polish.encouragement.trim()}`,
  };
}
