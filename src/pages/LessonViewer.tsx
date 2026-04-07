import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronRight, Clock, BarChart3, CheckCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LessonContentRenderer } from '@/components/education/LessonContentRenderer';
import { LessonNavigation } from '@/components/education/LessonNavigation';
import { LessonProgressBar } from '@/components/education/LessonProgressBar';
import { useLessonContent } from '@/hooks/useLessonContent';
import { useEducationIntelligence } from '@/hooks/useEducationIntelligence';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-4 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-12 w-48 mt-8" />
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
    if (!lessonId || !user?.id || isLoading || error || !lesson) return;
    startLesson(lessonId).catch(() => {});
  }, [lessonId, user?.id, isLoading, error, lesson]);

  useEffect(() => {
    setCompleted(false);
  }, [lessonId]);

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (error || !lesson || !breadcrumb || !navigation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Lição não encontrada</h1>
        <p className="text-muted-foreground">
          A lição solicitada não existe ou foi removida.
        </p>
        <Button asChild variant="outline">
          <Link to="/educacao">Voltar para Educação</Link>
        </Button>
      </div>
    );
  }

  const difficultyLabel = lesson.difficulty ? DIFFICULTY_LABELS[lesson.difficulty] ?? lesson.difficulty : null;
  const contentTypeLabel = CONTENT_TYPE_LABELS[lesson.contentType] ?? lesson.contentType;
  const positionLabel = `Lição ${navigation.currentIndex + 1} de ${navigation.totalInModule}`;

  const handleComplete = async () => {
    if (!lessonId) return;
    try {
      await completeLesson(lessonId);
      setCompleted(true);
      toast({ title: 'Lição concluída!', description: 'Seu progresso foi salvo.' });
    } catch {
      toast({ title: 'Erro ao concluir lição', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <>
    <LessonProgressBar />
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <Link to="/educacao" className="hover:text-foreground transition-colors">
          {breadcrumb.trackTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span>{breadcrumb.moduleTitle}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium">{positionLabel}</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lesson.title}</h1>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        {difficultyLabel && (
          <Badge variant="outline">{difficultyLabel}</Badge>
        )}
        {lesson.estimatedMinutes && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {lesson.estimatedMinutes} min
          </Badge>
        )}
        <Badge variant="secondary" className="gap-1">
          <BarChart3 className="h-3 w-3" />
          {contentTypeLabel}
        </Badge>
      </div>

      {/* Learning objective */}
      {lesson.learningObjective && (
        <p className="text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          {lesson.learningObjective}
        </p>
      )}

      {/* Lesson content */}
      <LessonContentRenderer blocks={lesson.contentBlocks} />

      {/* Actions */}
      <div className="border-t pt-6 space-y-4">
        {completed ? (
          <div className="space-y-3">
            <Button disabled className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluída
            </Button>
            {navigation.next && (
              <Button
                variant="default"
                className="gap-2"
                onClick={() => navigate(getLessonUrl(navigation.next!.id))}
              >
                Ir para próxima lição
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
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
    </>
  );
}
