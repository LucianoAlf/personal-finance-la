import { GraduationCap } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EducationHeroProps {
  loading: boolean;
  subtitle: string;
  levelLabel: string | null;
  streakDays: number | null;
}

export function EducationHero({ loading, subtitle, levelLabel, streakDays }: EducationHeroProps) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full bg-white/30" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-2/3 bg-white/30" />
              <Skeleton className="h-4 w-full bg-white/20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta: string[] = [];
  if (levelLabel) meta.push(levelLabel);
  if (streakDays != null && streakDays > 0) {
    meta.push(`${streakDays} dia${streakDays === 1 ? '' : 's'} de sequência`);
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
      <CardContent className="p-8">
        <div className="flex items-start space-x-4 mb-2">
          <GraduationCap size={48} className="flex-shrink-0 opacity-95" aria-hidden />
          <div>
            <h2 className="text-2xl font-bold">Seu hub de educação financeira</h2>
            <p className="text-white/90 mt-1">{subtitle}</p>
            {meta.length > 0 && (
              <p className="text-white/75 text-sm mt-3">{meta.join(' · ')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
