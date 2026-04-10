import type { CSSProperties, ReactNode, SVGProps } from 'react';

import { AlertTriangle } from 'lucide-react';

import { CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const reportsShellClassName =
  'rounded-[32px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

export const reportsPanelClassName =
  'rounded-[24px] border border-border/60 bg-surface-elevated/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

export const reportsSubtlePanelClassName =
  'rounded-[22px] border border-border/60 bg-surface-elevated/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]';

export const reportsDashedPanelClassName =
  'rounded-[24px] border border-dashed border-border/60 bg-surface-elevated/25 p-4';

export const reportsTooltipClassName =
  'rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl';

export const reportsChartTooltipProps: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
  cursor: SVGProps<SVGElement>;
} = {
  contentStyle: {
    borderRadius: 18,
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(15, 23, 42, 0.96)',
    color: 'rgb(248, 250, 252)',
    boxShadow: '0 18px 40px rgba(2, 6, 23, 0.35)',
    backdropFilter: 'blur(18px)',
  },
  labelStyle: {
    color: 'rgb(248, 250, 252)',
    fontWeight: 600,
    marginBottom: 6,
  },
  itemStyle: {
    color: 'rgb(226, 232, 240)',
    fontSize: 12,
  },
  cursor: {
    stroke: 'rgba(148, 163, 184, 0.24)',
    strokeWidth: 1,
  },
};

export function ReportsSectionHeading({
  title,
  description,
  metaLabel,
  partial = false,
  icon,
}: {
  title: string;
  description: string;
  metaLabel: string;
  partial?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <CardTitle className="flex items-center gap-3 text-[1.7rem] font-semibold tracking-tight text-foreground">
          {icon ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated/50 text-primary">
              {icon}
            </span>
          ) : null}
          <span>{title}</span>
        </CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
      </div>

      <ReportsMetaBadge label={metaLabel} partial={partial} />
    </div>
  );
}

export function ReportsMetaBadge({
  label,
  partial = false,
}: {
  label: string;
  partial?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium shadow-sm',
        partial
          ? 'border-amber-500/35 bg-amber-500/12 text-amber-200'
          : 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200',
      )}
    >
      {label}
    </span>
  );
}

export function ReportsMetricTile({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'default' | 'positive' | 'negative' | 'violet';
}) {
  const valueClassName =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-400'
        : tone === 'violet'
          ? 'text-violet-300'
          : 'text-foreground';

  return (
    <div className={reportsPanelClassName}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-3 text-[2rem] font-semibold tracking-tight', valueClassName)}>{value}</p>
      {caption ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

export function ReportsInsightNotice({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-[24px] border p-4 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
        tone === 'danger'
          ? 'border-rose-500/25 bg-rose-500/10 text-rose-100'
          : tone === 'warning'
            ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
            : 'border-border/60 bg-surface-elevated/35 text-muted-foreground',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

export function ReportsBulletList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className={reportsPanelClassName}>
      <p className="mb-3 text-base font-semibold tracking-tight text-foreground">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {items.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function formatReportsAxisCurrency(value: number) {
  return value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`;
}
