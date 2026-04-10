import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, PenTool } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { educationShellClassName, educationTonePanelClassName } from './education-shell';

interface LessonExerciseProps {
  title: string;
  instructions: string;
  hint?: string;
}

export function LessonExercise({ title, instructions, hint }: LessonExerciseProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <Card className={educationShellClassName}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PenTool className="h-5 w-5 shrink-0 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">{instructions}</p>

        {hint ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint((value) => !value)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="h-4 w-4" />
              {showHint ? 'Esconder dica' : 'Mostrar dica'}
              {showHint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showHint ? (
              <p className={cn(educationTonePanelClassName('warning'), 'mt-2 rounded-xl p-3 text-sm text-warning-foreground/95')}>
                {hint}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
