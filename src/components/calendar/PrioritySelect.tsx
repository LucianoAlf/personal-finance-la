import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Prioridade de exibição; `none` não grava `metadata.priority` no domínio. */
export type SelectableEventPriority = 'none' | 'low' | 'medium' | 'high';

const PRIORITY_OPTIONS: { value: SelectableEventPriority; label: string }[] = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

export interface PrioritySelectProps {
  value: SelectableEventPriority;
  onChange: (next: SelectableEventPriority) => void;
  id?: string;
  label?: string;
  className?: string;
}

export function PrioritySelect({
  value,
  onChange,
  id = 'event-priority',
  label = 'Prioridade',
  className,
}: PrioritySelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as SelectableEventPriority)}>
        <SelectTrigger
          id={id}
          aria-label="Prioridade"
          className="h-10 rounded-xl border-border/60 bg-surface-elevated focus:ring-primary"
        >
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border bg-surface-overlay">
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
