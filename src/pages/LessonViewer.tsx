import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, CheckCircle, ChevronRight, Clock } from 'lucide-react';

import { LessonContentRenderer } from '@/components/education/LessonContentRenderer';
import { LessonNavigation } from '@/components/education/LessonNavigation';
import { LessonProgressBar } from '@/components/education/LessonProgressBar';
import {
  educationBodyClassName,
  educationPanelClassName,
  educationShellClassName,
  educationSubtlePanelClassName,
} from '@/components/education/education-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useEducationIntelligence } from '@/hooks/useEducationIntelligence';
import { useLessonContent } from '@/hooks/useLessonContent';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getLessonUrl } from '@/utils/education/view-model';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  video: 'Vídeo',
  exercise: 'Exercício',
  quiz: 'Quiz',
  checklist: 'Checklist',
};

function LessonSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <LessonProgressBar />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className={cn(educationShellClassName, 'space-y-6 p-6')}>
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-40 w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}

export default function LessonViewer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { lesson, navigation, breadcrumb, isLoading, error } = useLessonContent(lessonId);
  const { user } = useAuth();
  const { startLesson, completeLesson, isSavingProgress } = useEducationIntelligence();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!lessonId || !user?.id || isLoading || error || !lesson) {
      return;
    }

    void Promise.resolve(startLesson(lessonId)).catch(() => {});
  }, [error, isLoading, lesson, lessonId, startLesson, user?.id]);

  useEffect(() => {
    setCompleted(false);
  }, [lessonId]);

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (error || !lesson || !breadcrumb || !navigation) {
    return (
      <div className="min-h-screen bg-background">
        <LessonProgressBar />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className={cn(educationShellClassName, 'space-y-4 p-8 text-center')}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-border/70 bg-surface-elevated/40 text-muted-foreground">
              <BookOpen className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Lição não encontrada</h1>
            <p className="text-muted-foreground">A lição solicitada não existe ou foi removida.</p>
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link to="/educacao">Voltar para Educação</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const difficultyLabel = lesson.difficulty ? DIFFICULTY_LABELS[lesson.difficulty] ?? lesson.difficulty : null;
  const contentTypeLabel = CONTENT_TYPE_LABELS[lesson.contentType] ?? lesson.contentType;
  const positionLabel = `Lição ${navigation.currentIndex + 1} de ${navigation.totalInModule}`;

  const handleComplete = async () => {
    if (!lessonId) {
      return;
    }

    try {
      await completeLesson(lessonId);
      setCompleted(true);
      toast({ title: 'Lição concluída!', description: 'Seu progresso foi salvo.' });
    } catch {
      toast({ title: 'Erro ao concluir lição', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LessonProgressBar />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className={cn(educationShellClassName, 'space-y-6 p-6 md:p-7')}>
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link to="/educacao" className="transition-colors hover:text-foreground">
              {breadcrumb.trackTitle}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span>{breadcrumb.moduleTitle}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{positionLabel}</span>
          </nav>

          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{lesson.title}</h1>

            <div className="flex flex-wrap items-center gap-2">
              {difficultyLabel ? <Badge variant="outline">{difficultyLabel}</Badge> : null}
              {lesson.estimatedMinutes ? (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {lesson.estimatedMinutes} min
                </Badge>
              ) : null}
              <Badge variant="secondary" className="gap-1">
                <BarChart3 className="h-3 w-3" />
                {contentTypeLabel}
              </Badge>
            </div>

            {lesson.learningObjective ? (
              <div className={cn(educationSubtlePanelClassName, 'p-4')}>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Objetivo da lição</p>
                <p className={cn(educationBodyClassName, 'mt-2 text-base italic')}>{lesson.learningObjective}</p>
              </div>
            ) : null}
          </div>

          <LessonContentRenderer blocks={lesson.contentBlocks} />

          <div className={cn(educationPanelClassName, 'space-y-4 border-t border-border/60 p-5')}>
            {completed ? (
              <div className="space-y-3">
                <Button disabled className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Concluída
                </Button>
                {navigation.next ? (
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => navigate(getLessonUrl(navigation.next.id))}
                  >
                    Ir para próxima lição
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button className="gap-2" disabled={isSavingProgress} onClick={handleComplete}>
                <CheckCircle className="h-4 w-4" />
                Marcar como concluída
              </Button>
            )}

            <LessonNavigation
              previous={navigation.previous}
              next={navigation.next}
              currentIndex={navigation.currentIndex}
              totalInModule={navigation.totalInModule}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
