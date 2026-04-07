import { GraduationCap, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LessonSummaryProps {
  points: string[];
}

export function LessonSummary({ points }: LessonSummaryProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
      <CardHeader className="pt-8 pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary shrink-0" />
          O que você aprendeu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
