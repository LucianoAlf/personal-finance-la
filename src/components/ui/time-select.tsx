import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/cn';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));

function buildMinuteOptions(step: number, currentMinute: string) {
  const safeStep = Number.isFinite(step) && step > 0 && step <= 60 ? Math.floor(step) : 15;
  const generated = Array.from({ length: Math.ceil(60 / safeStep) }, (_, index) =>
    String(index * safeStep).padStart(2, '0'),
  ).filter((value, index, values) => Number(value) < 60 && values.indexOf(value) === index);

  if (currentMinute && !generated.includes(currentMinute)) {
    return [...generated, currentMinute].sort((left, right) => Number(left) - Number(right));
  }

  return generated;
}

function parseValue(value: string, minuteOptions: string[]): { h: string; m: string } {
  const [h, m = '00'] = value.split(':');
  const hour = HOURS.includes(h) ? h : '09';
  const minute = minuteOptions.includes(m) ? m : minuteOptions[0] ?? '00';
  return { h: hour, m: minute };
}

interface TimeSelectProps {
  id?: string;
  label: string;
  value: string;
  onChange: (hhMm: string) => void;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
  hideLabel?: boolean;
  ariaLabel?: string;
}

/**
 * Horário no design system (Select Radix), sem input nativo type="time".
 */
export function TimeSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  minuteStep = 15,
  hideLabel = false,
  ariaLabel,
}: TimeSelectProps) {
  const currentMinute = value.split(':')[1] ?? '00';
  const minuteOptions = buildMinuteOptions(minuteStep, currentMinute);
  const { h, m } = parseValue(value, minuteOptions);
  const accessibleLabel = ariaLabel ?? label;

  const setPart = (part: 'h' | 'm', next: string) => {
    const nextHour = part === 'h' ? next : h;
    const nextMinute = part === 'm' ? next : m;
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {!hideLabel && label ? (
        <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <div className="flex items-center gap-2">
        <Select value={h} onValueChange={(nextValue) => setPart('h', nextValue)} disabled={disabled}>
          <SelectTrigger
            id={id}
            className="h-10 flex-1 rounded-xl border-border/60 bg-surface-elevated text-foreground tabular-nums focus:ring-primary"
            aria-label={`${accessibleLabel} — hora`}
          >
            <SelectValue placeholder="Hora" />
          </SelectTrigger>
          <SelectContent className="max-h-60 rounded-xl border-border/70 bg-surface-overlay">
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
        <Select value={m} onValueChange={(nextValue) => setPart('m', nextValue)} disabled={disabled}>
          <SelectTrigger
            className="h-10 w-[5.5rem] rounded-xl border-border/60 bg-surface-elevated text-foreground tabular-nums focus:ring-primary"
            aria-label={`${accessibleLabel} — minutos`}
          >
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent className="max-h-60 rounded-xl border-border/70 bg-surface-overlay">
            {minuteOptions.map((minute) => (
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
