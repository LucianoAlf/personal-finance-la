import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function ChartCard({
  title,
  icon: Icon,
  children,
  isEmpty = false,
  emptyMessage = 'Nenhum dado disponível',
  emptyActionLabel,
  onEmptyAction,
}: ChartCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Icon size={18} className="text-purple-600" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Icon size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">{emptyMessage}</p>
            {emptyActionLabel && onEmptyAction && (
              <Button onClick={onEmptyAction} variant="outline">
                {emptyActionLabel}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
