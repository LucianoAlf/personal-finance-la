import { CheckCircle2, GraduationCap } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { educationShellClassName, educationTonePanelClassName } from './education-shell';

interface LessonSummaryProps {
  points: string[];
}

export function LessonSummary({ points }: LessonSummaryProps) {
  return (
    <Card className={educationShellClassName}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <span className={cn(educationTonePanelClassName('violet'), 'flex h-9 w-9 items-center justify-center rounded-[14px]')}>
            <GraduationCap className="h-4.5 w-4.5 shrink-0 text-violet-100" />
          </span>
          O que você aprendeu
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ul className="space-y-2.5">
          {points.map((point, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
