import { Lightbulb } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      <Card className="border-l-4 border-yellow-500">
        <CardContent className="p-6 space-y-3">
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
    <Card className="border-l-4 border-yellow-500">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Lightbulb className="text-yellow-500 flex-shrink-0" size={32} aria-hidden />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Dica do hub educacional</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{narrativeText}</p>
            {deterministicReason && (
              <p className="text-xs text-gray-500 mt-3">
                Motivo determinístico: <code className="bg-gray-100 px-1 rounded">{deterministicReason}</code>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
