import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/cn';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function parseValue(value: string): { h: string; m: string } {
  const [h, m = '00'] = value.split(':');
  const hour = HOURS.includes(h) ? h : '09';
  const minute = MINUTES.includes(m) ? m : '00';
  return { h: hour, m: minute };
}

interface TimeSelectProps {
  id?: string;
  label: string;
  value: string;
  onChange: (hhMm: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Horário no design system (Select Radix), sem input nativo type="time".
 */
export function TimeSelect({ id, label, value, onChange, disabled, className }: TimeSelectProps) {
  const { h, m } = parseValue(value);

  const setPart = (part: 'h' | 'm', next: string) => {
    const nextH = part === 'h' ? next : h;
    const nextM = part === 'm' ? next : m;
    onChange(`${nextH}:${nextM}`);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <div className="flex items-center gap-2">
        <Select value={h} onValueChange={(v) => setPart('h', v)} disabled={disabled}>
          <SelectTrigger
            id={id}
            className="h-10 flex-1 rounded-xl border-border/60 bg-surface-elevated text-foreground tabular-nums focus:ring-primary"
            aria-label={`${label} — hora`}
          >
            <SelectValue placeholder="Hora" />
          </SelectTrigger>
          <SelectContent className="max-h-60 rounded-xl border-border/60 bg-surface">
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={hour} className="tabular-nums">
                {hour}h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground" aria-hidden>
          :
        </span>
        <Select value={m} onValueChange={(v) => setPart('m', v)} disabled={disabled}>
          <SelectTrigger
            className="h-10 w-[5.5rem] rounded-xl border-border/60 bg-surface-elevated text-foreground tabular-nums focus:ring-primary"
            aria-label={`${label} — minutos`}
          >
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60 bg-surface">
            {MINUTES.map((minute) => (
              <SelectItem key={minute} value={minute} className="tabular-nums">
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
