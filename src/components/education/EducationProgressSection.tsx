import { BookOpen } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { EducationProgressSection as ProgressSection } from '@/utils/education/intelligence-contract';

interface EducationProgressSectionProps {
  loading: boolean;
  section: ProgressSection | null;
  summaryLines: string[];
  nextLessonTitle: string | null;
  onContinueNextLesson: () => void;
  continueDisabled: boolean;
}

export function EducationProgressSection({
  loading,
  section,
  summaryLines,
  nextLessonTitle,
  onContinueNextLesson,
  continueDisabled,
}: EducationProgressSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!section || section.totalLessonsAvailable <= 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <BookOpen className="text-blue-600" size={22} aria-hidden />
        <CardTitle className="text-base">Seu progresso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          {summaryLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {nextLessonTitle && (
          <p className="text-sm text-gray-600">
            Próxima sugestão do hub: <span className="font-medium text-gray-900">{nextLessonTitle}</span>
          </p>
        )}
        <Button type="button" size="sm" onClick={onContinueNextLesson} disabled={continueDisabled}>
          Continuar lição sugerida
        </Button>
      </CardContent>
    </Card>
  );
}
