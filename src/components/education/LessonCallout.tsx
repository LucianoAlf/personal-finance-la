import { Info, AlertTriangle, Lightbulb, BookOpen, type LucideIcon } from 'lucide-react';

const VARIANT_CONFIG: Record<string, { bg: string; border: string; icon: LucideIcon; iconColor: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  tip: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: Lightbulb,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  example: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    icon: BookOpen,
    iconColor: 'text-violet-600 dark:text-violet-400',
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
    <div className={`rounded-lg border-l-4 p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/80 pl-7">{text}</p>
    </div>
  );
}
