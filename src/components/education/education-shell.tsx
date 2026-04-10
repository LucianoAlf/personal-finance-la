import { cn } from '@/lib/utils';

export const educationShellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.14)] backdrop-blur-sm dark:shadow-[0_20px_50px_rgba(2,6,23,0.28)]';

export const educationPanelClassName =
  'rounded-[24px] border border-border/60 bg-surface-elevated/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

export const educationSubtlePanelClassName =
  'rounded-[20px] border border-border/60 bg-surface-elevated/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]';

export const educationDashedPanelClassName =
  'rounded-[24px] border border-dashed border-border/60 bg-surface-elevated/25';

export const educationTooltipClassName =
  'rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl';

export const educationHeadingClassName = 'text-2xl font-semibold tracking-tight text-foreground';

export const educationBodyClassName = 'text-sm leading-relaxed text-muted-foreground';

export function educationTonePanelClassName(tone: 'violet' | 'emerald' | 'info' | 'warning') {
  return cn(
    educationSubtlePanelClassName,
    tone === 'violet' && 'border-violet-500/25 bg-violet-500/10',
    tone === 'emerald' && 'border-emerald-500/25 bg-emerald-500/10',
    tone === 'info' && 'border-info-border/80 bg-info-subtle/40',
    tone === 'warning' && 'border-warning-border/80 bg-warning-subtle/45',
  );
}
