import { buildEducationIntelligenceContext } from './education-intelligence.ts';
import {
  buildDeterministicEducationAnaSection,
  buildEducationMentoringMemoryFromParts,
  formatTrailSwitchAudit,
  mergeAnaEducationAiPolish,
  parseTrailSwitchAudits,
  type EducationMentoringMemory,
} from '../../../src/utils/education/education-ana-narrative.ts';
import type { EducationIntelligenceFullContext } from '../../../src/utils/education/intelligence-contract.ts';
import {
  extractTipContent,
  extractKeyPoints,
  isValidContentBlockArray,
  type ContentBlock,
} from '../../../src/utils/education/content-blocks.ts';

export function extractLessonTipForWhatsApp(
  lessonTitle: string,
  contentBlocks: unknown,
): { tip: string; source: string } | null {
  if (!isValidContentBlockArray(contentBlocks)) return null;
  const blocks = contentBlocks as ContentBlock[];
  const tipText = extractTipContent(blocks);
  if (!tipText) return null;
  return {
    tip: tipText,
    source: `Lição: ${lessonTitle}`,
  };
}

export function extractAllKeyPointsFromLesson(contentBlocks: unknown): string[] {
  if (!isValidContentBlockArray(contentBlocks)) return [];
  return extractKeyPoints(contentBlocks as ContentBlock[]);
}

export type {
  EducationMentoringMemory,
} from '../../../src/utils/education/education-ana-narrative.ts';

export {
  buildDeterministicEducationAnaSection,
  mergeAnaEducationAiPolish,
  buildEducationMentoringMemoryFromParts,
  formatTrailSwitchAudit,
  parseTrailSwitchAudits,
};

export interface EducationMentoringWhatsAppFacts {
  recommendedTrackSlug: string | null;
  hasSufficientData: boolean;
  completedLessonsCount: number;
  stalledModuleSlug: string | null;
  recentTipReasons: string[];
  trailSwitch: EducationMentoringMemory['trailSwitch'];
  learningBlockers: string[];
}

async function resolveStalledModuleSlug(supabase: any, userId: string): Promise<string | null> {
  const { data: row } = await supabase
    .from('education_user_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('last_viewed_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (!row?.lesson_id) return null;
  const { data: lesson } = await supabase
    .from('education_lessons')
    .select('module_id')
    .eq('id', row.lesson_id)
    .maybeSingle();
  if (!lesson?.module_id) return null;
  const { data: mod } = await supabase
    .from('education_modules')
    .select('slug')
    .eq('id', lesson.module_id)
    .maybeSingle();
  return mod?.slug ?? null;
}

export async function loadEducationMentoringMemoryForUser(
  supabase: any,
  userId: string,
  full: EducationIntelligenceFullContext,
  profileRow: { current_stage: string | null; learning_gaps: string[] | null } | null,
  stalledModuleSlug: string | null,
  recentTips: Array<{
    deterministic_reason: string;
    narrative_text: string;
    channel: string;
    created_at: string | null;
  }>,
): Promise<EducationMentoringMemory> {
  const prev = profileRow?.current_stage ?? null;
  const next = full.recommendedTrack;
  let explicitTrail: EducationMentoringMemory['trailSwitch'] = null;
  if (prev && next && prev !== next && full.journey.hasSufficientData) {
    explicitTrail = {
      from: prev,
      to: next,
      reasonCodes: [...full.learningBlockers],
      switchedAt: new Date().toISOString(),
    };
  } else {
    explicitTrail = parseTrailSwitchAudits(profileRow?.learning_gaps ?? []);
  }

  return buildEducationMentoringMemoryFromParts({
    profileCurrentStage: prev,
    profileLearningGaps: profileRow?.learning_gaps ?? [],
    recentTips: recentTips.map((t) => ({
      deterministicReason: t.deterministic_reason,
      narrativeText: t.narrative_text,
      channel: t.channel,
      createdAt: t.created_at,
    })),
    stalledModuleSlug,
    completedLessonsCount: full.behaviorSnapshot.completedEducationLessons,
    lessonsInProgressCount: 0,
    explicitTrailSwitch: explicitTrail,
  });
}

export async function persistEducationProfileAfterMentoring(
  supabase: any,
  userId: string,
  full: EducationIntelligenceFullContext,
  profileRow: { current_stage: string | null; learning_gaps: string[] | null } | null,
  memory: EducationMentoringMemory,
): Promise<void> {
  const nextTrack = full.recommendedTrack;
  if (!nextTrack) return;

  const gaps = [...(profileRow?.learning_gaps ?? [])];
  const prev = profileRow?.current_stage ?? null;
  if (
    memory.trailSwitch &&
    prev &&
    memory.trailSwitch.from === prev &&
    memory.trailSwitch.to === nextTrack
  ) {
    const audit = formatTrailSwitchAudit(
      memory.trailSwitch.switchedAt,
      memory.trailSwitch.from,
      memory.trailSwitch.to,
      memory.trailSwitch.reasonCodes,
    );
    gaps.push(audit);
  }

  const trimmedGaps = gaps.slice(-25);
  const { error } = await supabase.from('education_user_profile').upsert(
    {
      user_id: userId,
      current_stage: nextTrack,
      learning_gaps: trimmedGaps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('[education-renderers] profile upsert failed', error);
  }
}

export async function buildAnaEducationPayloadForUser(
  supabase: any,
  userId: string,
): Promise<{
  full: EducationIntelligenceFullContext;
  mentoringMemory: EducationMentoringMemory;
  deterministicAna: ReturnType<typeof buildDeterministicEducationAnaSection>;
}> {
  const full = await buildEducationIntelligenceContext({ supabase, userId });

  const [profileRes, tipsRes, stalledModuleSlug, inProgRes] = await Promise.all([
    supabase
      .from('education_user_profile')
      .select('current_stage, learning_gaps')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('education_daily_tips')
      .select('deterministic_reason, narrative_text, channel, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    resolveStalledModuleSlug(supabase, userId),
    supabase
      .from('education_user_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'in_progress'),
  ]);

  const profile = profileRes.data;
  const tips = tipsRes.data;
  const inProgCount = inProgRes.count ?? 0;

  const memoryBase = await loadEducationMentoringMemoryForUser(
    supabase,
    userId,
    full,
    profile ?? null,
    stalledModuleSlug,
    tips ?? [],
  );

  const mentoringMemory: EducationMentoringMemory = {
    ...memoryBase,
    lessonsInProgressCount: inProgCount ?? 0,
  };

  const deterministicAna = buildDeterministicEducationAnaSection(full, mentoringMemory);
  await persistEducationProfileAfterMentoring(supabase, userId, full, profile ?? null, mentoringMemory);

  return { full, mentoringMemory, deterministicAna };
}

export function formatEducationMentoringWhatsAppBlock(facts: EducationMentoringWhatsAppFacts): string {
  const lines = [
    '### Educação financeira (memória auditável)',
    `- Trilha recomendada (cache): ${facts.recommendedTrackSlug ?? 'não sincronizada'}`,
    `- Dados suficientes para personalizar trilha: ${facts.hasSufficientData ? 'sim' : 'não'}`,
    `- Aulas concluídas: ${facts.completedLessonsCount}`,
    facts.stalledModuleSlug ? `- Módulo possivelmente parado: ${facts.stalledModuleSlug}` : null,
    facts.recentTipReasons.length > 0
      ? `- Últimos motivos de dicas enviadas: ${facts.recentTipReasons.join(', ')}`
      : null,
    facts.trailSwitch
      ? `- Última troca de trilha: ${facts.trailSwitch.from} → ${facts.trailSwitch.to} (${facts.trailSwitch.reasonCodes.join(', ')})`
      : null,
    facts.learningBlockers.length > 0
      ? `- Bloqueios pedagógicos ativos: ${facts.learningBlockers.join(', ')}`
      : null,
  ].filter(Boolean);
  return `\n${lines.join('\n')}\n`;
}

export async function fetchEducationMentoringWhatsAppFacts(
  supabase: any,
  userId: string,
): Promise<EducationMentoringWhatsAppFacts> {
  try {
    const full = await buildEducationIntelligenceContext({ supabase, userId });
    const [{ data: profile }, { data: tips }] = await Promise.all([
      supabase
        .from('education_user_profile')
        .select('current_stage, learning_gaps')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('education_daily_tips')
        .select('deterministic_reason')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const stalledSlug = await resolveStalledModuleSlug(supabase, userId);

    const trailSwitch = parseTrailSwitchAudits(profile?.learning_gaps ?? []);

    return {
      recommendedTrackSlug: full.recommendedTrack,
      hasSufficientData: full.journey.hasSufficientData,
      completedLessonsCount: full.behaviorSnapshot.completedEducationLessons,
      stalledModuleSlug: stalledSlug,
      recentTipReasons: (tips ?? []).map((t: { deterministic_reason: string }) => t.deterministic_reason),
      trailSwitch,
      learningBlockers: [...full.learningBlockers],
    };
  } catch (e) {
    console.error('[education-renderers] fetchEducationMentoringWhatsAppFacts failed', e);
    return {
      recommendedTrackSlug: null,
      hasSufficientData: false,
      completedLessonsCount: 0,
      stalledModuleSlug: null,
      recentTipReasons: [],
      trailSwitch: null,
      learningBlockers: [],
    };
  }
}

/** Read-only snapshot for dashboard payload (does not persist mentoring profile). */
export async function buildDashboardEducationMentoringEntry(
  supabase: any,
  userId: string,
): Promise<{
  recommendedTrack: string | null;
  summaryExcerpt: string;
  learningBlockers: string[];
}> {
  const full = await buildEducationIntelligenceContext({ supabase, userId });
  const memory = buildEducationMentoringMemoryFromParts({
    profileCurrentStage: null,
    profileLearningGaps: [],
    recentTips: [],
    stalledModuleSlug: null,
    completedLessonsCount: full.behaviorSnapshot.completedEducationLessons,
    lessonsInProgressCount: 0,
  });
  const ana = buildDeterministicEducationAnaSection(full, memory);
  return {
    recommendedTrack: full.recommendedTrack,
    summaryExcerpt: ana.summary.slice(0, 280),
    learningBlockers: full.learningBlockers,
  };
}
