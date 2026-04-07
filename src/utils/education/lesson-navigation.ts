export interface LessonRef {
  id: string;
  slug: string;
  title: string;
}

export interface LessonNavigationContext {
  previous: LessonRef | null;
  next: LessonRef | null;
  currentIndex: number;
  totalInModule: number;
}

export function buildLessonNavigation(
  currentLessonId: string,
  moduleLessons: Array<{ id: string; slug: string; title: string; moduleId: string; sortOrder: number }>,
): LessonNavigationContext {
  const sorted = [...moduleLessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) {
    return { previous: null, next: null, currentIndex: -1, totalInModule: sorted.length };
  }
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const nxt = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  return {
    previous: prev ? { id: prev.id, slug: prev.slug, title: prev.title } : null,
    next: nxt ? { id: nxt.id, slug: nxt.slug, title: nxt.title } : null,
    currentIndex: idx,
    totalInModule: sorted.length,
  };
}

export function getLessonUrl(lessonId: string): string {
  return `/educacao/licao/${lessonId}`;
}
