import { AlertTriangle, BookOpen, Info, Lightbulb, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const VARIANT_CONFIG: Record<
  string,
  {
    accent: string;
    icon: LucideIcon;
    iconClassName: string;
  }
> = {
  info: {
    accent: 'border-info-border/80',
    icon: Info,
    iconClassName: 'text-info',
  },
  warning: {
    accent: 'border-warning-border/80',
    icon: AlertTriangle,
    iconClassName: 'text-warning',
  },
  tip: {
    accent: 'border-success-border/80',
    icon: Lightbulb,
    iconClassName: 'text-success',
  },
  example: {
    accent: 'border-violet-500/30',
    icon: BookOpen,
    iconClassName: 'text-violet-300',
  },
};

interface LessonCalloutProps {
  variant: 'info' | 'warning' | 'tip' | 'example';
  title: string;
  text: string;
}

export function LessonCallout({ variant, title, text }: LessonCalloutProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 bg-surface-elevated/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        config.accent,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-border/60 bg-surface-elevated/60">
          <Icon className={cn('h-4.5 w-4.5 shrink-0', config.iconClassName)} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
      </div>
      <p className="pl-11 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
