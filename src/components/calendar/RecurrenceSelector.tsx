import { useEffect, useId, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface RecurrenceConfig {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byWeekday: string[];
  byMonthday: number[];
  endType: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
}

export const DEFAULT_RECURRENCE_CONFIG: RecurrenceConfig = {
  frequency: 'none',
  interval: 1,
  byWeekday: [],
  byMonthday: [],
  endType: 'never',
};

const FREQUENCY_OPTIONS: { value: RecurrenceConfig['frequency']; label: string }[] = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

function clampInterval(n: number): number {
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(99, Math.floor(n));
}

function clampMonthDay(n: number): number {
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(31, Math.floor(n));
}

function normalizeEndState(config: RecurrenceConfig): RecurrenceConfig {
  if (config.endType === 'date') {
    return {
      ...config,
      endCount: undefined,
    };
  }

  if (config.endType === 'count') {
    return {
      ...config,
      endDate: undefined,
      endCount: config.endCount ?? 10,
    };
  }

  return {
    ...config,
    endDate: undefined,
    endCount: undefined,
  };
}

function normalizeRecurrenceConfig(config: RecurrenceConfig): RecurrenceConfig {
  if (config.frequency === 'none') {
    return {
      ...DEFAULT_RECURRENCE_CONFIG,
    };
  }

  return normalizeEndState({
    ...config,
    interval: clampInterval(config.interval),
    byWeekday: config.frequency === 'weekly' ? config.byWeekday : [],
    byMonthday:
      config.frequency === 'monthly'
        ? config.byMonthday.map((day) => clampMonthDay(day))
        : [],
  });
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function areRecurrenceConfigsEqual(left: RecurrenceConfig, right: RecurrenceConfig) {
  return (
    left.frequency === right.frequency &&
    left.interval === right.interval &&
    left.endType === right.endType &&
    left.endDate === right.endDate &&
    left.endCount === right.endCount &&
    areStringArraysEqual(left.byWeekday, right.byWeekday) &&
    areNumberArraysEqual(left.byMonthday, right.byMonthday)
  );
}

function getRecurrenceConfigSignature(config: RecurrenceConfig) {
  return JSON.stringify({
    frequency: config.frequency,
    interval: config.interval,
    byWeekday: config.byWeekday,
    byMonthday: config.byMonthday,
    endType: config.endType,
    endDate: config.endDate ?? null,
    endCount: config.endCount ?? null,
  });
}

export interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
  className?: string;
}

export function RecurrenceSelector({ value, onChange, className }: RecurrenceSelectorProps) {
  const incomingConfig = value ?? DEFAULT_RECURRENCE_CONFIG;
  const config = normalizeRecurrenceConfig(incomingConfig);
  const lastHealedSignatureRef = useRef<string | null>(null);
  const monthlyModeName = useId();

  useEffect(() => {
    if (areRecurrenceConfigsEqual(incomingConfig, config)) {
      lastHealedSignatureRef.current = null;
      return;
    }

    const signature = getRecurrenceConfigSignature(incomingConfig);
    if (lastHealedSignatureRef.current === signature) {
      return;
    }

    lastHealedSignatureRef.current = signature;
    onChange(config);
  }, [incomingConfig, config, onChange]);

  const setFrequency = (freq: string) => {
    const f = freq as RecurrenceConfig['frequency'];
    onChange(
      normalizeRecurrenceConfig({
        ...config,
        frequency: f,
      }),
    );
  };

  const setEndType = (endType: RecurrenceConfig['endType']) => {
    onChange(
      normalizeEndState({
        ...config,
        endType,
      }),
    );
  };

  const frequencySelect = (
    <div className="min-w-[160px] flex-1 space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recorrência
      </Label>
      <Select value={config.frequency} onValueChange={setFrequency}>
        <SelectTrigger
          aria-label="Recorrência"
          className="h-10 rounded-xl border-border/60 bg-surface-elevated focus:ring-primary"
        >
          <SelectValue placeholder="Recorrência" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border bg-surface-overlay">
          {FREQUENCY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (config.frequency === 'none') {
    return <div className={cn('space-y-1.5', className)}>{frequencySelect}</div>;
  }

  const domDay = config.byMonthday[0] ?? 15;

  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border border-border/60 bg-surface-elevated/40 p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-3">
        {frequencySelect}
        <div className="w-28 space-y-1.5">
          <Label
            htmlFor="recurrence-interval"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            A cada
          </Label>
          <Input
            id="recurrence-interval"
            type="number"
            min={1}
            max={99}
            inputMode="numeric"
            className="h-10 rounded-xl border-border/60 bg-surface-elevated text-center font-medium tabular-nums focus-visible:ring-primary"
            value={config.interval}
            onChange={(e) =>
              onChange(
                normalizeRecurrenceConfig({
                  ...config,
                  interval: clampInterval(parseInt(e.target.value, 10)),
                }),
              )
            }
          />
        </div>
      </div>

      {config.frequency === 'weekly' && (
        <p className="rounded-xl border border-border/40 bg-surface/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          A série seguirá o <span className="font-medium text-foreground">mesmo dia da semana</span> da data
          de início (adequado à expansão V1 da agenda).
        </p>
      )}

      {config.frequency === 'monthly' && (
        <div
          role="radiogroup"
          aria-label="Dia em cada mês"
          className="space-y-3 rounded-xl border border-border/50 bg-surface/50 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dia em cada mês
          </p>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-foreground">
            <input
              type="radio"
              name={monthlyModeName}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              checked={config.byMonthday.length === 0}
              onChange={() =>
                onChange(
                  normalizeRecurrenceConfig({
                    ...config,
                    byMonthday: [],
                  }),
                )
              }
            />
            <span>Alinhado à data inicial (sem dia fixo 1–31 no calendário gregoriano)</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-foreground">
            <input
              type="radio"
              name={monthlyModeName}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              checked={config.byMonthday.length > 0}
              onChange={() =>
                onChange(
                  normalizeRecurrenceConfig({
                    ...config,
                    byMonthday: [config.byMonthday[0] ?? 15],
                  }),
                )
              }
            />
            <span>No dia fixo do mês</span>
          </label>
          {config.byMonthday.length > 0 && (
            <div className="ml-7 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
              <Label
                htmlFor="rec-monthday-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Dia do mês
              </Label>
              <Input
                id="rec-monthday-input"
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                aria-label="Dia do mês"
                className="h-9 w-20 rounded-lg border-border/60 bg-surface-elevated text-center tabular-nums focus-visible:ring-primary"
                value={domDay}
                onChange={(e) =>
                  onChange(
                    normalizeRecurrenceConfig({
                      ...config,
                      byMonthday: [clampMonthDay(parseInt(e.target.value, 10))],
                    }),
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {config.frequency === 'yearly' && (
        <p className="rounded-xl border border-border/40 bg-surface/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          A série seguirá o <span className="font-medium text-foreground">mesmo dia e mês</span> da
          data de início, repetindo a cada ano.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-border/40 pt-3">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Termina
          </Label>
          <Select
            value={config.endType}
            onValueChange={(v) =>
              setEndType(v as RecurrenceConfig['endType'])
            }
          >
            <SelectTrigger
              aria-label="Término da repetição"
              className="h-10 rounded-xl border-border/60 bg-surface-elevated focus:ring-primary"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-surface-overlay">
              <SelectItem value="never" className="rounded-lg">
                Nunca
              </SelectItem>
              <SelectItem value="date" className="rounded-lg">
                Em uma data
              </SelectItem>
              <SelectItem value="count" className="rounded-lg">
                Após N vezes
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.endType === 'date' && (
          <div className="space-y-1.5">
            <Label
              htmlFor="recurrence-end-date"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Data limite
            </Label>
            <Input
              id="recurrence-end-date"
              type="date"
              className="h-10 rounded-xl border-border/60 bg-surface-elevated focus-visible:ring-primary"
              value={config.endDate ?? ''}
              onChange={(e) =>
                onChange(
                  normalizeEndState({
                    ...config,
                    endDate: e.target.value || undefined,
                  }),
                )
              }
            />
          </div>
        )}
        {config.endType === 'count' && (
          <div className="space-y-1.5">
            <Label
              htmlFor="recurrence-end-count"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Ocorrências
            </Label>
            <Input
              id="recurrence-end-count"
              type="number"
              min={1}
              inputMode="numeric"
              className="h-10 w-24 rounded-xl border-border/60 bg-surface-elevated text-center tabular-nums focus-visible:ring-primary"
              value={config.endCount ?? 10}
              onChange={(e) =>
                onChange(
                  normalizeEndState({
                    ...config,
                    endCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }),
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
