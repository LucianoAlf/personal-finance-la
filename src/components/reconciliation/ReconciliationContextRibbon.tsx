import { AlertTriangle, CalendarRange, CheckCircle2, Clock, Database, Inbox, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  RECONCILIATION_WINDOW_PRESETS,
  type ReconciliationWindowPreset,
} from '@/hooks/useReconciliationWindow';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';
import type {
  PluggyConnectionRow,
  ReconciliationWindow,
  ReconciliationWindowPresetId,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

interface ReconciliationContextRibbonProps {
  window: ReconciliationWindow;
  activePresetId: ReconciliationWindowPresetId;
  onChangePreset: (presetId: ReconciliationWindowPresetId) => void;
  summary: ReconciliationWorkspaceSummary | null;
  connections: PluggyConnectionRow[];
  isPending?: boolean;
  isWindowLoading?: boolean;
  onSyncNow?: () => void;
  isSyncPending?: boolean;
}

/**
 * Unified context ribbon for the reconciliation workspace.
 *
 * Replaces the separate `ReconciliationWindowSelector` + `ReconciliationHealthStrip`
 * stack that was showing "Janela aplicada" twice and burning ~160px of vertical
 * real estate with two full-width cards. Here we collapse both roles into one
 * dense block with two internal tiers:
 *   - Tier 1 (top): window chip + preset radios + sync button + historical warning
 *   - Tier 2 (bottom): inline stats (sync age, ingestion, pending, connection health)
 *
 * Stale-connection risk surfaces as an inline amber badge on tier 2 instead of
 * consuming a whole KPI card in the summary deck below.
 */
export function ReconciliationContextRibbon({
  window,
  activePresetId,
  onChangePreset,
  summary,
  connections,
  isPending = false,
  isWindowLoading = false,
  onSyncNow,
  isSyncPending = false,
}: ReconciliationContextRibbonProps) {
  const { formatDate } = useUserPreferences();
  const health = summary?.ingestionHealth ?? null;
  const hasConnections = connections.length > 0;
  const staleConnections = summary?.staleConnections ?? 0;
  const hasStaleConnection = staleConnections > 0;
  const isHistoricalMode = activePresetId === 'all_time';
  const lastSyncIso = health?.lastPluggySyncAt ?? null;

  const toneBorder = hasStaleConnection
    ? 'border-amber-500/35'
    : isHistoricalMode
      ? 'border-amber-500/25'
      : 'border-border/70';
  const toneBg = hasStaleConnection
    ? 'bg-[linear-gradient(90deg,rgba(255,176,32,0.06),rgba(255,93,93,0.03))]'
    : 'bg-surface/92';

  return (
    <section
      aria-label="Contexto da conciliacao"
      className={cn(
        'rounded-[1.4rem] border shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]',
        toneBorder,
        toneBg,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CalendarRange size={16} className="text-primary" />
          <span className="font-semibold text-foreground">Janela</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {isWindowLoading ? 'carregando...' : window.label}
          </span>
          {window.startDate ? (
            <span className="text-[11px] text-muted-foreground">
              desde {formatBrDate(window.startDate)}
            </span>
          ) : null}
          {isHistoricalMode ? (
            <span
              role="note"
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300"
            >
              <AlertTriangle size={12} />
              modo historico
            </span>
          ) : null}
          {hasStaleConnection ? (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle size={12} />
              {staleConnections} conexao{staleConnections === 1 ? '' : 'oes'} em risco
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Presets de janela" className="flex flex-wrap gap-1.5">
            {RECONCILIATION_WINDOW_PRESETS.map((preset: ReconciliationWindowPreset) => {
              const isActive = preset.id === activePresetId;
              return (
                <Button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  size="sm"
                  variant="ghost"
                  onClick={() => onChangePreset(preset.id)}
                  className={cn(
                    'rounded-full border px-3 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                    preset.historical && !isActive && 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10',
                  )}
                  title={preset.helper}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          {onSyncNow ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncPending}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  isSyncPending
                    ? 'border-border/60 bg-surface-elevated text-muted-foreground'
                    : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
                )}
              >
                {isSyncPending ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
              {isSyncPending ? (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock size={12} />
                  lock ativo
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/40 px-4 py-2.5 text-[11px]">
        <StatInline
          icon={<CheckCircle2 size={12} className={lastSyncIso ? 'text-emerald-500' : 'text-muted-foreground'} />}
          label="Sync util"
          value={
            isPending
              ? '\u2014'
              : lastSyncIso
                ? `${relativeFrom(lastSyncIso)} \u2022 ${formatDate(new Date(lastSyncIso))}`
                : 'nunca sincronizou'
          }
          helper={
            hasConnections
              ? `${connections.length} conexao${connections.length === 1 ? '' : 'oes'} Pluggy`
              : 'sem conexoes Pluggy'
          }
        />
        <StatDivider />
        <StatInline
          icon={<Database size={12} className="text-primary" />}
          label="Ingestao"
          value={isPending ? '\u2014' : `${health?.inScopeCount ?? 0} / ${health?.totalIngested ?? 0}`}
          helper={
            health && health.outOfScopeCount > 0
              ? `${health.outOfScopeCount} fora do escopo`
              : 'tudo na janela'
          }
        />
        <StatDivider />
        <StatInline
          icon={<Inbox size={12} className="text-sky-500" />}
          label="Pendentes"
          value={isPending ? '\u2014' : `${health?.pendingInScope ?? 0}`}
          helper={
            health
              ? `${health.reconciledInScope} conciliados \u2022 ${health.archivedInScope} arquivados`
              : 'aguardando'
          }
        />
        <StatDivider />
        <StatInline
          icon={
            <AlertTriangle
              size={12}
              className={hasStaleConnection ? 'text-amber-500' : 'text-muted-foreground'}
            />
          }
          label="Conexoes"
          value={
            isPending
              ? '\u2014'
              : hasStaleConnection
                ? `${staleConnections} em risco`
                : hasConnections
                  ? 'todas saudaveis'
                  : 'sem Pluggy'
          }
          helper={
            hasStaleConnection
              ? 'reautentique para restaurar confianca'
              : hasConnections
                ? 'matching usa confianca nao capada'
                : 'apenas CSV / colar'
          }
          tone={hasStaleConnection ? 'warning' : 'default'}
        />
        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock size={12} className="text-muted-foreground" />
          {isHistoricalMode
            ? 'historico: fora do fluxo do dia a dia'
            : window.startDate
              ? `operacao default: desde ${formatBrDate(window.startDate)}`
              : ''}
        </span>
      </div>
    </section>
  );
}

function StatDivider() {
  return <span aria-hidden className="hidden h-4 w-px bg-border/60 md:inline-block" />;
}

function StatInline({
  icon,
  label,
  value,
  helper,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      {icon}
      <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold',
          tone === 'warning' ? 'text-amber-600 dark:text-amber-300' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {helper ? <span className="text-muted-foreground">{helper}</span> : null}
    </span>
  );
}

function formatBrDate(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '\u2014';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function relativeFrom(iso: string | null | undefined): string {
  if (!iso) return 'nunca sincronizou';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'sem data de sync';
  const deltaMs = Date.now() - then;
  const deltaMin = Math.floor(deltaMs / 60000);
  if (deltaMin < 1) return 'agora';
  if (deltaMin < 60) return `ha ${deltaMin} min`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `ha ${deltaHr}h`;
  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay === 1) return 'ontem';
  return `ha ${deltaDay}d`;
}
