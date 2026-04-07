import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getLessonUrl } from '@/utils/education/lesson-navigation';
import type { LessonRef } from '@/utils/education/lesson-navigation';

interface LessonNavigationProps {
  previous: LessonRef | null;
  next: LessonRef | null;
  currentIndex: number;
  totalInModule: number;
}

export function LessonNavigation({ previous, next, currentIndex, totalInModule }: LessonNavigationProps) {
  return (
    <nav className="border-t pt-6 mt-8">
      <div className="flex items-center justify-between gap-2">
        {previous ? (
          <Button variant="ghost" size="sm" asChild className="gap-1.5 max-w-[40%]">
            <Link to={getLessonUrl(previous.id)}>
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{previous.title}</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Lição {currentIndex + 1} de {totalInModule}
        </span>

        {next ? (
          <Button variant="ghost" size="sm" asChild className="gap-1.5 max-w-[40%]">
            <Link to={getLessonUrl(next.id)}>
              <span className="truncate">{next.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link to="/educacao">
              <Home className="h-4 w-4 shrink-0" />
              <span>Voltar à trilha</span>
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
