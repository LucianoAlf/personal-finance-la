import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { EventKind } from '@/types/calendar.types';
import { cn } from '@/lib/utils';
import { SELECTABLE_AGENDA_EVENT_KINDS, getCategoryStyle } from '@/components/calendar/calendar-utils';

export interface CategorySelectProps {
  value: EventKind;
  onChange: (next: EventKind) => void;
  id?: string;
  label?: string;
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  id = 'agenda-category',
  label = 'Categoria',
  className,
}: CategorySelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as EventKind)}>
        <SelectTrigger
          id={id}
          aria-label="Categoria da agenda"
          className="h-10 rounded-xl border-border/60 bg-surface-elevated focus:ring-primary"
        >
          <SelectValue placeholder="Escolha a categoria" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border bg-surface-overlay">
          {SELECTABLE_AGENDA_EVENT_KINDS.map((kind) => {
            const style = getCategoryStyle(kind);
            return (
              <SelectItem key={kind} value={kind} className="rounded-lg">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: style.color }}
                    aria-hidden
                  />
                  {style.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
