import { Lightbulb } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  educationBodyClassName,
  educationHeadingClassName,
  educationShellClassName,
  educationTonePanelClassName,
} from './education-shell';

interface EducationDailyTipCardProps {
  loading: boolean;
  narrativeText: string | null;
  deterministicReason: string | null;
}

export function EducationDailyTipCard({
  loading,
  narrativeText,
  deterministicReason,
}: EducationDailyTipCardProps) {
  if (loading) {
    return (
      <Card className={educationShellClassName}>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (!narrativeText) {
    return null;
  }

  return (
    <Card className={educationShellClassName}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={cn(educationTonePanelClassName('warning'), 'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]')}>
            <Lightbulb className="h-6 w-6 text-warning-foreground" aria-hidden />
          </div>

          <div className="space-y-2">
            <h4 className={cn(educationHeadingClassName, 'text-xl')}>Dica do hub educacional</h4>
            <p className={cn(educationBodyClassName, 'whitespace-pre-wrap text-base text-foreground/85')}>
              {narrativeText}
            </p>

            {deterministicReason ? (
              <p className={cn(educationBodyClassName, 'text-xs')}>
                Motivo determinístico:{' '}
                <code className="rounded-md border border-border/60 bg-surface-elevated/40 px-1.5 py-0.5 text-foreground/85">
                  {deterministicReason}
                </code>
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
