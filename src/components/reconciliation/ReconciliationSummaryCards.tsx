import { GitCompareArrows, ShieldCheck, Waves } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { ReconciliationWorkspaceSummary } from '@/types/reconciliation';

interface ReconciliationSummaryCardsProps {
  summary: ReconciliationWorkspaceSummary | null;
  isPending?: boolean;
}

const cardClassName =
  'rounded-[1.4rem] border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

const EMPTY_BREAKDOWN = { urgent: 0, high: 0, medium: 0, low: 0, infra: 0 } as const;

type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'infra';

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'urgente',
  high: 'alta',
  medium: 'media',
  low: 'baixa',
  infra: 'infra',
};

function pluralize(value: number, label: string): string {
  if (label === 'infra') return `${value} infra`;
  const suffix = value === 1 ? '' : 's';
  return `${value} ${label}${suffix}`;
}

function breakdownSummary(
  breakdown: ReconciliationWorkspaceSummary['priorityBreakdown'] | typeof EMPTY_BREAKDOWN,
): string {
  const parts: string[] = [];
  (Object.keys(PRIORITY_LABEL) as Priority[]).forEach((key) => {
    const value = breakdown[key] ?? 0;
    if (value > 0) parts.push(pluralize(value, PRIORITY_LABEL[key]));
  });
  return parts.length > 0 ? parts.join(' | ') : 'nada urgente';
}

/**
 * Operational KPI deck. After the Wave 2 hierarchy refactor this deck is
 * intentionally scoped to *three* cards:
 *
 *   1. Hero  - "Valor sem correspondencia" in large type, 2x span on xl.
 *   2. Pendencias - open cases with a priority breakdown strip so the urgent
 *      count stops being the universal label for everything.
 *   3. Alta confianca - suggestions currently eligible for auto-close.
 *
 * Previous versions also rendered:
 *   - "Conexoes em risco" - now surfaced as an inline amber badge inside
 *     `ReconciliationContextRibbon`; rendering a card that says "0 em risco"
 *     when everything is healthy was pure visual noise.
 *   - "Fonte ativa" - already communicated by the ribbon ("5 conexoes Pluggy"
 *     / "apenas CSV / colar"), so duplicating it here was chrome.
 */
export function ReconciliationSummaryCards({
  summary,
  isPending = false,
}: ReconciliationSummaryCardsProps) {
  const { formatCurrency } = useUserPreferences();
  const dash = '-';
  const pendingUnmatchedValue = summary?.pendingUnmatchedValue ?? 0;
  const pendingUnmatchedCount = summary?.pendingUnmatchedCount ?? 0;
  const unmatchedCount = summary?.unmatchedCount ?? 0;
  const highConfidenceCount = summary?.highConfidenceCount ?? 0;
  const priorityBreakdown = summary?.priorityBreakdown ?? EMPTY_BREAKDOWN;
  const openCases = summary?.openCases ?? 0;
  const hasPendingValue = pendingUnmatchedValue > 0;
  const breakdownLabel = breakdownSummary(priorityBreakdown);
  const totalForShare = Object.values(priorityBreakdown).reduce((acc, n) => acc + (n ?? 0), 0);

  const hasBreakdown = totalForShare > 0;
  const shareOf = (value: number) =>
    hasBreakdown ? Math.max(4, Math.round((value / totalForShare) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
      <Card className={`${cardClassName} md:col-span-3 xl:col-span-2`}>
        <CardContent className="flex flex-col gap-3 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Valor sem correspondencia
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                total em movimentos bancarios que ainda nao baterem com nada do sistema
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <GitCompareArrows className="h-5 w-5" />
            </div>
          </div>
          <div className="text-4xl font-semibold tracking-tight text-foreground">
            {isPending ? dash : formatCurrency(pendingUnmatchedValue)}
          </div>
          <div className={`text-xs ${hasPendingValue ? 'text-amber-300' : 'text-muted-foreground'}`}>
            {hasPendingValue
              ? `${pendingUnmatchedCount} movimento${pendingUnmatchedCount === 1 ? '' : 's'} bancario${pendingUnmatchedCount === 1 ? '' : 's'} aguardando pareamento`
              : 'nada pendente de pareamento'}
          </div>
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pendencias abertas</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/15 bg-sky-500/10 text-sky-300 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {isPending ? dash : `${openCases} casos`}
          </div>
          {hasBreakdown ? (
            <div className="flex h-1.5 overflow-hidden rounded-full bg-border/40" aria-hidden>
              {priorityBreakdown.urgent > 0 ? (
                <span className="block bg-red-500/70" style={{ width: `${shareOf(priorityBreakdown.urgent)}%` }} />
              ) : null}
              {priorityBreakdown.high > 0 ? (
                <span className="block bg-amber-500/70" style={{ width: `${shareOf(priorityBreakdown.high)}%` }} />
              ) : null}
              {priorityBreakdown.medium > 0 ? (
                <span className="block bg-sky-500/60" style={{ width: `${shareOf(priorityBreakdown.medium)}%` }} />
              ) : null}
              {priorityBreakdown.low > 0 ? (
                <span className="block bg-slate-400/60" style={{ width: `${shareOf(priorityBreakdown.low)}%` }} />
              ) : null}
              {priorityBreakdown.infra > 0 ? (
                <span className="block bg-violet-500/60" style={{ width: `${shareOf(priorityBreakdown.infra)}%` }} />
              ) : null}
            </div>
          ) : null}
          <div className="font-mono text-[11px] text-muted-foreground">{breakdownLabel}</div>
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Alta confianca</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-300 shadow-sm">
              <Waves className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {isPending ? dash : `${highConfidenceCount} sugestoes`}
          </div>
          <div className={`text-[11px] ${unmatchedCount > 0 ? 'text-muted-foreground' : 'text-success'}`}>
            {unmatchedCount > 0 ? `${unmatchedCount} sem match aguardam contexto` : 'auto-match: elegivel (com confirmacao)'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
