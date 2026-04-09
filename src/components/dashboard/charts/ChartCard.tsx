import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type ChartCardHeaderTone = 'default' | 'satin-clean';

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  headerTone?: ChartCardHeaderTone;
}

export function ChartCard({
  title,
  icon: Icon,
  children,
  isEmpty = false,
  emptyMessage = 'Nenhum dado disponível',
  emptyActionLabel,
  onEmptyAction,
  headerTone = 'default',
}: ChartCardProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
      <CardHeader
        className={cn(
          'border-b border-border/70',
          headerTone === 'satin-clean'
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(243,246,251,0.96))] shadow-[inset_0_-1px_0_rgba(203,213,225,0.55)] dark:bg-[linear-gradient(135deg,rgba(140,107,255,0.16),rgba(15,23,42,0.08)_40%,rgba(15,23,42,0.86)_100%)] dark:shadow-none'
            : 'bg-[linear-gradient(135deg,rgba(140,107,255,0.16),rgba(15,23,42,0.08)_40%,rgba(15,23,42,0.86)_100%)]'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Icon size={18} className="text-primary" />
          </div>
          <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated ring-1 ring-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Icon size={32} className="text-primary/70" />
            </div>
            <p className="mb-4 text-muted-foreground">{emptyMessage}</p>
            {emptyActionLabel && onEmptyAction ? (
              <Button
                onClick={onEmptyAction}
                variant="outline"
                className="rounded-xl border-border/70 bg-surface text-foreground hover:bg-surface-elevated"
              >
                {emptyActionLabel}
              </Button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
