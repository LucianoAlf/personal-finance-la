import { useState } from 'react';
import { PenTool, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LessonExerciseProps {
  title: string;
  instructions: string;
  hint?: string;
}

export function LessonExercise({ title, instructions, hint }: LessonExerciseProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">{instructions}</p>
        {hint && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint((v) => !v)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="h-4 w-4" />
              {showHint ? 'Esconder dica' : 'Mostrar dica'}
              {showHint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            {showHint && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 mt-2">
                {hint}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
