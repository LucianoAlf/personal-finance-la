import type { ReactNode } from 'react';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export const reportsSectionCardClass =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:shadow-[0_22px_52px_rgba(2,6,23,0.28)]';

export function ReportsSectionHeading({
  title,
  metaLabel,
  partial = false,
  titleIcon,
  subtitle,
}: {
  title: string;
  metaLabel: string;
  partial?: boolean;
  titleIcon?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {titleIcon ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              {titleIcon}
            </div>
          ) : null}
          <div>
            <CardTitle className="text-[1.7rem] font-semibold tracking-tight text-foreground">
              {title}
            </CardTitle>
            {subtitle ? (
              <CardDescription className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </div>
      <span
        className={cn(
          'inline-flex w-fit shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-[0.08em] shadow-sm',
          partial
            ? 'border-amber-400/25 bg-amber-500/12 text-amber-200 dark:text-amber-100'
            : 'border-emerald-400/25 bg-emerald-500/12 text-emerald-200 dark:text-emerald-100',
        )}
      >
        {metaLabel}
      </span>
    </div>
  );
}

export function ReportsSummaryMetric({
  label,
  value,
  helper,
  accent = 'default',
}: {
  label: string;
  value: string;
  helper?: string;
  accent?: 'default' | 'positive' | 'danger' | 'primary';
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-surface/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-surface-elevated/62">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight',
          accent === 'default' && 'text-foreground',
          accent === 'positive' && 'text-emerald-400',
          accent === 'danger' && 'text-rose-400',
          accent === 'primary' && 'text-primary',
        )}
      >
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function ReportsSoftPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[26px] border border-border/70 bg-surface/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:bg-surface-elevated/55',
        className,
      )}
    >
      {title ? <p className="mb-4 text-sm font-semibold text-foreground">{title}</p> : null}
      {children}
    </div>
  );
}

export function ReportsHint({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-[22px] border px-4 py-3 text-sm leading-6',
        tone === 'default' &&
          'border-border/70 bg-surface/68 text-muted-foreground dark:bg-surface-elevated/52',
        tone === 'warning' &&
          'border-amber-400/20 bg-amber-500/8 text-amber-100/90 dark:text-amber-50',
      )}
    >
      {children}
    </div>
  );
}
