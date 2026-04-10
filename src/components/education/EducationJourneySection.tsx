import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  Sparkles,
  Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  getEducationLessonPresentation,
  getLessonUrl,
  type EducationCatalogLesson,
  type EducationTrackJourneyRow,
  type LessonProgressStatus,
} from '@/utils/education/view-model';
import {
  educationBodyClassName,
  educationHeadingClassName,
  educationPanelClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
  educationTonePanelClassName,
} from './education-shell';

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

type ModuleStatus = EducationTrackJourneyRow['modules'][number]['moduleStatus'];

function statusBadge(moduleStatus: ModuleStatus) {
  if (moduleStatus === 'completed') {
    return <Badge variant="success">Concluído</Badge>;
  }
  if (moduleStatus === 'in_progress') {
    return <Badge variant="info">Em progresso</Badge>;
  }
  return <Badge variant="outline">Não iniciado</Badge>;
}

function ModuleIcon({ status }: { status: ModuleStatus }) {
  if (status === 'completed') {
    return (
      <div
        className={cn(
          educationTonePanelClassName('emerald'),
          'flex h-11 w-11 items-center justify-center rounded-[18px]',
        )}
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-100" />
      </div>
    );
  }

  if (status === 'in_progress') {
    return (
      <div
        className={cn(
          educationTonePanelClassName('violet'),
          'flex h-11 w-11 items-center justify-center rounded-[18px]',
        )}
      >
        <BookOpen className="h-5 w-5 text-violet-100" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        educationSubtlePanelClassName,
        'flex h-11 w-11 items-center justify-center rounded-[18px]',
      )}
    >
      <Circle className="h-5 w-5 text-muted-foreground" />
    </div>
  );
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

  const toggleModule = (moduleId: string, isOpen: boolean) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !isOpen }));
  };

  const handleStartAndNavigate = async (lessonId: string) => {
    await onStartLesson(lessonId);
    navigate(getLessonUrl(lessonId));
  };

  if (loading) {
    return (
      <section className="space-y-5">
        <Skeleton className="h-7 w-48" />
        {[1, 2].map((i) => (
          <Card key={i} className={educationShellClassName}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  if (trackRows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h3 className={educationHeadingClassName}>Trilha de aprendizado</h3>
        <p className={educationBodyClassName}>
          Sua jornada continua organizada por módulos, com próximos passos claros e progresso por lição.
        </p>
      </div>

      {showGenericNotice ? (
        <div className={cn(educationTonePanelClassName('info'), 'flex items-start gap-3 px-4 py-3.5')}>
          <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 text-info-foreground" />
          <p className="text-sm leading-relaxed text-info-foreground/90">
            As ordens sugeridas ainda são genéricas: faltam dados suficientes sobre seu uso financeiro no app.
            Continue registrando movimentações e metas para personalizar este painel.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {trackRows.map((track) => (
          <div key={track.trackSlug} className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {track.title}
              </h4>
              {track.description ? <p className={educationBodyClassName}>{track.description}</p> : null}
            </div>

            <div className="space-y-3">
              {track.modules.map((mod) => {
                const lessons = lessonsByModuleId[mod.moduleId] ?? [];
                const percent =
                  mod.totalLessonCount > 0
                    ? Math.round((mod.completedLessonCount / mod.totalLessonCount) * 100)
                    : 0;
                const isOpen = openModules[mod.moduleId] ?? mod.moduleStatus !== 'not_started';
                const primaryLessonId = mod.firstIncompleteLessonId ?? lessons[0]?.id ?? null;
                const shellBorderClass =
                  mod.moduleStatus === 'completed'
                    ? 'border-emerald-500/35'
                    : mod.moduleStatus === 'in_progress'
                      ? 'border-violet-500/35'
                      : 'border-border/70';

                return (
                  <Card
                    key={mod.moduleId}
                    className={cn(educationShellClassName, shellBorderClass, 'overflow-hidden')}
                  >
                    <CardContent className="space-y-5 p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <ModuleIcon status={mod.moduleStatus} />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-semibold tracking-tight text-foreground">{mod.title}</h4>
                              {mod.isRecommended ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 bg-violet-500/15 text-violet-100"
                                >
                                  <Star size={12} /> Sugerido
                                </Badge>
                              ) : null}
                            </div>

                            <p className={cn(educationBodyClassName, 'mt-1')}>
                              {mod.completedLessonCount}/{mod.totalLessonCount} lições ({percent}%)
                            </p>

                            <div className="mt-2">{statusBadge(mod.moduleStatus)}</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {mod.moduleStatus === 'completed' ? (
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
                          ) : null}

                          {mod.moduleStatus === 'in_progress' && primaryLessonId ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => void handleStartAndNavigate(primaryLessonId)}
                            >
                              Continuar módulo
                            </Button>
                          ) : null}

                          {mod.moduleStatus === 'not_started' && primaryLessonId ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => void handleStartAndNavigate(primaryLessonId)}
                            >
                              Começar módulo
                            </Button>
                          ) : null}

                          {(mod.moduleStatus === 'in_progress' || mod.moduleStatus === 'not_started') ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleModule(mod.moduleId, isOpen)}
                            >
                              {isOpen ? 'Ocultar lições' : 'Ver lições'}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {isOpen && lessons.length > 0 ? (
                        <ul className={cn(educationPanelClassName, 'space-y-2 border-border/70 p-4')}>
                          {lessons.map((lesson) => {
                            const status = lessonProgress.get(lesson.id) ?? 'not_started';
                            const presentation = getEducationLessonPresentation(status);

                            return (
                              <li
                                key={lesson.id}
                                className={cn(
                                  educationSubtlePanelClassName,
                                  'flex flex-col gap-2 border-border/50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
                                )}
                              >
                                <div className="min-w-0">
                                  <Link
                                    to={getLessonUrl(lesson.id)}
                                    className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                                  >
                                    {lesson.title}
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </Link>

                                  {lesson.summary ? (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{lesson.summary}</p>
                                  ) : null}

                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {presentation.statusLabel}
                                  </p>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                  {presentation.primaryAction === 'start' && presentation.primaryActionLabel ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isSaving}
                                      onClick={() => void handleStartAndNavigate(lesson.id)}
                                    >
                                      {presentation.primaryActionLabel}
                                    </Button>
                                  ) : null}

                                  {presentation.primaryAction === 'complete' && presentation.primaryActionLabel ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isSaving}
                                      onClick={() => void onCompleteLesson(lesson.id)}
                                    >
                                      {presentation.primaryActionLabel}
                                    </Button>
                                  ) : null}

                                  {status === 'completed' ? (
                                    <span className="self-center text-xs font-medium text-emerald-400">
                                      Concluída
                                    </span>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
