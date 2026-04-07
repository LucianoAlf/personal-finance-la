import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { EducationAnaSection, EducationIntelligenceFullContext } from '@/utils/education/intelligence-contract';
import type { EducationMentoringMemory } from '@/utils/education/education-ana-narrative';
import type {
  EducationCatalogLesson,
  EducationCatalogModule,
  EducationCatalogTrack,
  EducationUserProgressRow,
  LessonProgressStatus,
} from '@/utils/education/view-model';

export interface EducationGlossaryTermRow {
  slug: string;
  term: string;
  short_definition: string;
  extended_text: string | null;
  tags: string[];
  sort_order: number;
}

export interface EducationCatalogBundle {
  tracks: EducationCatalogTrack[];
  modules: EducationCatalogModule[];
  lessons: EducationCatalogLesson[];
  progressRows: EducationUserProgressRow[];
  glossaryTerms: EducationGlossaryTermRow[];
}

export interface ExistingEducationProgressRow {
  id: string;
  status: LessonProgressStatus;
  started_at: string | null;
  completed_at: string | null;
}

type LessonProgressWritePlan =
  | {
      kind: 'insert';
      values: {
        user_id: string;
        lesson_id: string;
        status: LessonProgressStatus;
        started_at: string | null;
        completed_at: string | null;
        last_viewed_at: string;
      };
    }
  | {
      kind: 'update';
      id: string;
      values: {
        status?: LessonProgressStatus;
        started_at?: string | null;
        completed_at?: string | null;
        last_viewed_at: string;
      };
    };

export function getEducationIntelligenceQueryKey(userId: string | undefined) {
  return ['education-intelligence', userId] as const;
}

export function getEducationCatalogQueryKey(userId: string | undefined) {
  return ['education-catalog', userId] as const;
}

export function getAnaEducationInsightsQueryKey(userId: string | undefined) {
  return ['ana-education-insights', userId] as const;
}

export interface AnaEducationInsightsPayload {
  ana: EducationAnaSection;
  mentoringMemory: EducationMentoringMemory;
  usedAi: boolean;
  deterministicAudit: {
    recommendedTrack: string | null;
    recommendedNextLessonId: string | null;
    suitabilityBlockedClasses: string[];
    dailyTipReason: string | null;
    learningBlockers: string[];
    behavioralWarnings: string[];
  };
}

export function planLessonProgressWrite(
  existing: ExistingEducationProgressRow | null,
  action: 'start' | 'complete',
  userId: string,
  lessonId: string,
  now: string,
): LessonProgressWritePlan {
  if (action === 'start') {
    if (existing?.id) {
      if (existing.status === 'completed') {
        return {
          kind: 'update',
          id: existing.id,
          values: {
            last_viewed_at: now,
          },
        };
      }

      return {
        kind: 'update',
        id: existing.id,
        values: {
          status: 'in_progress',
          started_at: existing.started_at ?? now,
          completed_at: null,
          last_viewed_at: now,
        },
      };
    }

    return {
      kind: 'insert',
      values: {
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress',
        started_at: now,
        completed_at: null,
        last_viewed_at: now,
      },
    };
  }

  const startedAt = existing?.started_at ?? now;
  if (existing?.id) {
    return {
      kind: 'update',
      id: existing.id,
      values: {
        status: 'completed',
        started_at: startedAt,
        completed_at: existing.completed_at ?? now,
        last_viewed_at: now,
      },
    };
  }

  return {
    kind: 'insert',
    values: {
      user_id: userId,
      lesson_id: lessonId,
      status: 'completed',
      started_at: startedAt,
      completed_at: now,
      last_viewed_at: now,
    },
  };
}

function mapTrack(row: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
}): EducationCatalogTrack {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function mapModule(row: {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
}): EducationCatalogModule {
  return {
    id: row.id,
    trackId: row.track_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function mapLesson(row: {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string | null;
  sort_order: number;
}): EducationCatalogLesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    sortOrder: row.sort_order,
  };
}

async function fetchEducationCatalogBundle(userId: string): Promise<EducationCatalogBundle> {
  const [tracksR, modulesR, lessonsR, progressR, glossaryR] = await Promise.all([
    supabase
      .from('education_tracks')
      .select('id, slug, title, description, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('education_modules')
      .select('id, track_id, slug, title, description, sort_order')
      .order('sort_order'),
    supabase
      .from('education_lessons')
      .select('id, module_id, slug, title, summary, sort_order')
      .order('sort_order'),
    supabase.from('education_user_progress').select('lesson_id, status').eq('user_id', userId),
    supabase
      .from('education_glossary_terms')
      .select('slug, term, short_definition, extended_text, tags, sort_order')
      .order('sort_order'),
  ]);

  if (tracksR.error) throw tracksR.error;
  if (modulesR.error) throw modulesR.error;
  if (lessonsR.error) throw lessonsR.error;
  if (progressR.error) throw progressR.error;
  if (glossaryR.error) throw glossaryR.error;

  const progressRows: EducationUserProgressRow[] = (progressR.data ?? []).map(
    (r: { lesson_id: string; status: string }) => ({
      lessonId: r.lesson_id,
      status: r.status as LessonProgressStatus,
    }),
  );

  const glossaryTerms: EducationGlossaryTermRow[] = (glossaryR.data ?? []).map(
    (r: {
      slug: string;
      term: string;
      short_definition: string;
      extended_text: string | null;
      tags: string[] | null;
      sort_order: number;
    }) => ({
      slug: r.slug,
      term: r.term,
      short_definition: r.short_definition,
      extended_text: r.extended_text,
      tags: r.tags ?? [],
      sort_order: r.sort_order,
    }),
  );

  return {
    tracks: (tracksR.data ?? []).map(mapTrack),
    modules: (modulesR.data ?? []).map(mapModule),
    lessons: (lessonsR.data ?? []).map(mapLesson),
    progressRows,
    glossaryTerms,
  };
}

async function upsertLessonProgress(
  userId: string,
  lessonId: string,
  action: 'start' | 'complete',
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing, error: selErr } = await supabase
    .from('education_user_progress')
    .select('id, status, started_at, completed_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (selErr) throw selErr;
  const plan = planLessonProgressWrite(
    (existing as ExistingEducationProgressRow | null) ?? null,
    action,
    userId,
    lessonId,
    now,
  );

  if (plan.kind === 'update') {
    const { error } = await supabase
      .from('education_user_progress')
      .update(plan.values)
      .eq('id', plan.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('education_user_progress').insert(plan.values);
  if (error) throw error;
}

export function useEducationIntelligence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const intelligenceQuery = useQuery({
    queryKey: getEducationIntelligenceQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('education-intelligence', {
        body: {},
      });
      if (error) throw error;
      return data as EducationIntelligenceFullContext;
    },
    staleTime: 60 * 1000,
  });

  const anaEducationQuery = useQuery({
    queryKey: getAnaEducationInsightsQueryKey(userId),
    enabled: Boolean(userId) && Boolean(intelligenceQuery.data),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ana-education-insights', {
        body: {},
      });
      if (error) {
        console.warn('[useEducationIntelligence] ana-education-insights failed', error);
        return null;
      }
      return data as AnaEducationInsightsPayload;
    },
    staleTime: 60 * 1000,
  });

  const catalogQuery = useQuery({
    queryKey: getEducationCatalogQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchEducationCatalogBundle(userId!),
    staleTime: 60 * 1000,
  });

  const progressMutation = useMutation({
    mutationFn: async (payload: { lessonId: string; action: 'start' | 'complete' }) => {
      await upsertLessonProgress(userId!, payload.lessonId, payload.action);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getEducationIntelligenceQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: getAnaEducationInsightsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: getEducationCatalogQueryKey(userId) }),
      ]);
    },
  });

  const mergedContext = useMemo(() => {
    const base = intelligenceQuery.data;
    if (!base) return undefined;
    const payload = anaEducationQuery.data;
    if (!payload?.ana) return base;
    return {
      ...base,
      ana: payload.ana,
      quality: {
        ...base.quality,
        ana: {
          source: payload.usedAi ? ('ai_interpretation' as const) : ('internal_calculation' as const),
          completeness: 'complete' as const,
        },
      },
    };
  }, [intelligenceQuery.data, anaEducationQuery.data]);

  return {
    context: mergedContext,
    catalog: catalogQuery.data,
    isLoading: intelligenceQuery.isLoading || catalogQuery.isLoading,
    error: intelligenceQuery.error ?? catalogQuery.error,
    refetch: async () => {
      await Promise.all([
        intelligenceQuery.refetch(),
        anaEducationQuery.refetch(),
        catalogQuery.refetch(),
      ]);
    },
    startLesson: (lessonId: string) => progressMutation.mutateAsync({ lessonId, action: 'start' }),
    completeLesson: (lessonId: string) => progressMutation.mutateAsync({ lessonId, action: 'complete' }),
    isSavingProgress: progressMutation.isPending,
  };
}
