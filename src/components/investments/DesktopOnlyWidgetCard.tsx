import type { ReactNode } from 'react';
import { Monitor } from 'lucide-react';

interface DesktopOnlyWidgetCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function DesktopOnlyWidgetCard({
  title,
  description = 'Disponível no desktop',
  icon,
}: DesktopOnlyWidgetCardProps) {
  return (
    <div
      role="status"
      aria-label={`${title} — disponível apenas no desktop`}
      className="lg:hidden mx-4 my-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-surface-elevated/40 px-4 py-6 text-center"
    >
      <div className="text-2xl text-muted-foreground">{icon ?? <Monitor className="h-6 w-6" aria-hidden="true" />}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
