import type { ReactElement } from 'react';
import type { AgendaItem } from '@/types/calendar.types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AgendaHoverTooltip({
  item,
  children,
}: {
  item: AgendaItem;
  children: ReactElement;
}) {
  const location = (item.metadata as Record<string, unknown> | null)?.location_text as string | undefined;
  const subtitle = item.subtitle?.trim() || null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[18rem] border-border/60 bg-popover px-3 py-2 text-popover-foreground"
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">{item.title}</p>
          {subtitle ? <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p> : null}
          {location ? <p className="text-[0.7rem] text-muted-foreground">{location}</p> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
