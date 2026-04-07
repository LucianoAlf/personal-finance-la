import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { supabase } from '@/lib/supabase';
import type { ContentBlock } from '@/utils/education/content-blocks';
import { isValidContentBlockArray } from '@/utils/education/content-blocks';
import {
  buildLessonNavigation,
  type LessonNavigationContext,
} from '@/utils/education/lesson-navigation';

interface LessonRow {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_type: string;
  learning_objective: string | null;
  estimated_minutes: number | null;
  difficulty: string | null;
  sort_order: number;
  content_blocks: unknown;
}

export interface LessonContentData {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string | null;
  contentType: string;
  learningObjective: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  sortOrder: number;
  contentBlocks: ContentBlock[];
}

export interface LessonBreadcrumb {
  trackTitle: string;
  moduleTitle: string;
  lessonTitle: string;
}

export interface UseLessonContentResult {
  lesson: LessonContentData | null;
  navigation: LessonNavigationContext | null;
  breadcrumb: LessonBreadcrumb | null;
  isLoading: boolean;
  error: Error | null;
}

function mapLessonRow(row: LessonRow): LessonContentData {
  const blocks = isValidContentBlockArray(row.content_blocks) ? row.content_blocks : [];
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    contentType: row.content_type,
    learningObjective: row.learning_objective,
    estimatedMinutes: row.estimated_minutes,
    difficulty: row.difficulty,
    sortOrder: row.sort_order,
    contentBlocks: blocks,
  };
}

async function fetchLessonContent(lessonId: string) {
  const { data: lesson, error: lessonError } = await supabase
    .from('education_lessons')
    .select('id, module_id, slug, title, summary, content_type, learning_objective, estimated_minutes, difficulty, sort_order, content_blocks')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError) throw new Error(lessonError.message);
  if (!lesson) return null;

  const moduleId = lesson.module_id as string;

  const [siblingResult, moduleResult] = await Promise.all([
    supabase
      .from('education_lessons')
      .select('id, slug, title, module_id, sort_order')
      .eq('module_id', moduleId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('education_modules')
      .select('id, title, track_id, education_tracks(title)')
      .eq('id', moduleId)
      .maybeSingle(),
  ]);

  if (siblingResult.error) throw new Error(siblingResult.error.message);
  if (moduleResult.error) throw new Error(moduleResult.error.message);

  const siblings = (siblingResult.data ?? []).map((s) => ({
    id: s.id as string,
    slug: s.slug as string,
    title: s.title as string,
    moduleId: s.module_id as string,
    sortOrder: s.sort_order as number,
  }));

  const mod = moduleResult.data;
  const trackRecord = mod?.education_tracks as unknown as { title: string } | null;

  return {
    lesson: lesson as LessonRow,
    siblings,
    moduleTitle: (mod?.title as string) ?? '',
    trackTitle: trackRecord?.title ?? '',
  };
}

export function useLessonContent(lessonId: string | undefined): UseLessonContentResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['education', 'lesson', lessonId],
    queryFn: () => fetchLessonContent(lessonId!),
    enabled: Boolean(lessonId),
    staleTime: 10 * 60 * 1000,
  });

  const result = useMemo<Omit<UseLessonContentResult, 'isLoading' | 'error'>>(() => {
    if (!data || !data.lesson) {
      return { lesson: null, navigation: null, breadcrumb: null };
    }

    const lesson = mapLessonRow(data.lesson);
    const navigation = buildLessonNavigation(lesson.id, data.siblings);
    const breadcrumb: LessonBreadcrumb = {
      trackTitle: data.trackTitle,
      moduleTitle: data.moduleTitle,
      lessonTitle: lesson.title,
    };

    return { lesson, navigation, breadcrumb };
  }, [data]);

  return {
    ...result,
    isLoading,
    error: error as Error | null,
  };
}
