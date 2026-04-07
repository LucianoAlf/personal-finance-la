import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, Star } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getEducationLessonPresentation,
  getLessonUrl,
  type EducationCatalogLesson,
  type EducationTrackJourneyRow,
  type LessonProgressStatus,
} from '@/utils/education/view-model';

interface EducationJourneySectionProps {
  loading: boolean;
  trackRows: EducationTrackJourneyRow[];
  lessonsByModuleId: Record<string, EducationCatalogLesson[]>;
  lessonProgress: Map<string, LessonProgressStatus>;
  showGenericNotice: boolean;
  isSaving: boolean;
  onStartLesson: (lessonId: string) => Promise<void>;
  onCompleteLesson: (lessonId: string) => Promise<void>;
}

function statusBadge(moduleStatus: EducationTrackJourneyRow['modules'][0]['moduleStatus']) {
  if (moduleStatus === 'completed') {
    return <Badge variant="success">Concluído</Badge>;
  }
  if (moduleStatus === 'in_progress') {
    return <Badge variant="info">Em progresso</Badge>;
  }
  return <Badge variant="outline">Não iniciado</Badge>;
}

export function EducationJourneySection({
  loading,
  trackRows,
  lessonsByModuleId,
  lessonProgress,
  showGenericNotice,
  isSaving,
  onStartLesson,
  onCompleteLesson,
}: EducationJourneySectionProps) {
  const navigate = useNavigate();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string, currentIsOpen: boolean) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !currentIsOpen }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Trilha de aprendizado</h3>
      {showGenericNotice && (
        <Alert>
          <AlertDescription>
            As ordens sugeridas ainda são genéricas: faltam dados suficientes sobre seu uso financeiro no app. Continue
            registrando movimentações e metas para personalizar este painel.
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {trackRows.map((track) => (
          <div key={track.trackSlug}>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">{track.title}</h4>
            {track.description && <p className="text-sm text-gray-600 mb-3">{track.description}</p>}
            <div className="space-y-3">
              {track.modules.map((mod) => {
                const lessons = lessonsByModuleId[mod.moduleId] ?? [];
                const pct =
                  mod.totalLessonCount > 0
                    ? Math.round((mod.completedLessonCount / mod.totalLessonCount) * 100)
                    : 0;
                const isOpen = openModules[mod.moduleId] ?? mod.moduleStatus !== 'not_started';
                const borderClass =
                  mod.moduleStatus === 'completed'
                    ? 'border-l-4 border-green-500'
                    : mod.moduleStatus === 'in_progress'
                      ? 'border-l-4 border-blue-500'
                      : 'border-l-4 border-gray-300';

                const primaryLessonId =
                  mod.firstIncompleteLessonId ?? lessons[0]?.id ?? null;

                return (
                  <Card key={mod.moduleId} className={borderClass}>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          {mod.moduleStatus === 'completed' ? (
                            <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={24} aria-hidden />
                          ) : mod.moduleStatus === 'in_progress' ? (
                            <BookOpen className="text-blue-500 flex-shrink-0 mt-0.5" size={24} aria-hidden />
                          ) : (
                            <Circle className="text-gray-400 flex-shrink-0 mt-0.5" size={24} aria-hidden />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{mod.title}</h4>
                              {mod.isRecommended && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star size={12} /> Sugerido
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {mod.completedLessonCount}/{mod.totalLessonCount} lições ({pct}%)
                            </p>
                            <div className="mt-2">{statusBadge(mod.moduleStatus)}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {mod.moduleStatus === 'completed' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleModule(mod.moduleId, isOpen)}
                            >
                              {isOpen ? (
                                <>
                                  <ChevronDown size={16} className="mr-1" /> Ocultar lições
                                </>
                              ) : (
                                <>
                                  <ChevronRight size={16} className="mr-1" /> Revisar lições
                                </>
                              )}
                            </Button>
                          )}
                          {mod.moduleStatus === 'in_progress' && primaryLessonId && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => { onStartLesson(primaryLessonId); navigate(getLessonUrl(primaryLessonId)); }}
                            >
                              Continuar módulo
                            </Button>
                          )}
                          {mod.moduleStatus === 'not_started' && primaryLessonId && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => { onStartLesson(primaryLessonId); navigate(getLessonUrl(primaryLessonId)); }}
                            >
                              Começar módulo
                            </Button>
                          )}
                          {(mod.moduleStatus === 'in_progress' || mod.moduleStatus === 'not_started') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleModule(mod.moduleId, isOpen)}
                            >
                              {isOpen ? 'Ocultar lições' : 'Ver lições'}
                            </Button>
                          )}
                        </div>
                      </div>
                      {isOpen && lessons.length > 0 && (
                        <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                          {lessons.map((lesson) => {
                            const st = lessonProgress.get(lesson.id) ?? 'not_started';
                            const presentation = getEducationLessonPresentation(st);
                            return (
                              <li
                                key={lesson.id}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm"
                              >
                                <div>
                                  <Link
                                    to={getLessonUrl(lesson.id)}
                                    className="font-medium text-gray-900 hover:text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    {lesson.title}
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </Link>
                                  {lesson.summary && (
                                    <p className="text-gray-600 text-xs mt-0.5">{lesson.summary}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">{presentation.statusLabel}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {presentation.primaryAction === 'start' && presentation.primaryActionLabel && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isSaving}
                                      onClick={() => { onStartLesson(lesson.id); navigate(getLessonUrl(lesson.id)); }}
                                    >
                                      {presentation.primaryActionLabel}
                                    </Button>
                                  )}
                                  {presentation.primaryAction === 'complete' && presentation.primaryActionLabel && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isSaving}
                                      onClick={() => onCompleteLesson(lesson.id)}
                                    >
                                      {presentation.primaryActionLabel}
                                    </Button>
                                  )}
                                  {st === 'completed' && (
                                    <span className="text-xs text-green-700 self-center">Concluída</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
