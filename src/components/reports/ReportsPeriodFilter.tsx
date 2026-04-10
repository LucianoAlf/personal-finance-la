import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  REPORTS_PERIOD_PRESETS,
  REPORTS_PERIOD_PRESET_LABELS,
  type ReportsPeriodPreset,
} from '@/hooks/useReportsIntelligence';

interface ReportsPeriodFilterProps {
  value: ReportsPeriodPreset;
  onChange: (preset: ReportsPeriodPreset) => void;
  periodLabel: string;
  disabled?: boolean;
}

export function ReportsPeriodFilter({
  value,
  onChange,
  periodLabel,
  disabled = false,
}: ReportsPeriodFilterProps) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:shadow-[0_20px_48px_rgba(2,6,23,0.26)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Período do relatório
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">{periodLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {REPORTS_PERIOD_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={value === preset ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                'min-w-24 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all',
                value === preset
                  ? 'border-primary/30 bg-primary/15 text-primary shadow-[0_12px_30px_rgba(139,92,246,0.18)]'
                  : 'border-border/70 bg-surface/75 text-muted-foreground hover:bg-surface-elevated hover:text-foreground dark:bg-surface-elevated/65',
              )}
            >
              {REPORTS_PERIOD_PRESET_LABELS[preset]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
