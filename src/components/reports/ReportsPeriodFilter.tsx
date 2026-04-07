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
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Período do relatório</p>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
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
              className={cn('min-w-24', value === preset && 'shadow-sm')}
            >
              {REPORTS_PERIOD_PRESET_LABELS[preset]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
