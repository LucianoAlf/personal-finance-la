import { useMemo } from 'react';

import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { ReconciliationAuditLogRow } from '@/types/reconciliation';

interface ReconciliationAuditRailProps {
  entries: ReconciliationAuditLogRow[];
  isLoading?: boolean;
  title?: string;
  expanded?: boolean;
  /**
   * When true, the component refuses to show the global audit stream until a
   * case is selected. Useful in the inbox side rail where dumping the global
   * log is visually misleading and can create giant page scroll after batch
   * operations like the reset archive.
   */
  requireActiveCase?: boolean;
  inactiveMessage?: string;
  /**
   * When provided, the rail filters entries down to the specific case timeline.
   * Without this, the rail behaves as a global decision log, which visually suggests
   * the right rail is a timeline of the selected case when it is not. Keeping this
   * optional preserves the global view for the Historico tab.
   */
  activeCaseId?: string | null;
  /**
   * Optional hint rendered when a case is selected but has no audit entries yet.
   * Lets the rail stay useful ("no decisions yet on this case") instead of empty.
   */
  emptyMessage?: string;
}

const dotColor: Record<string, string> = {
  linked: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(53,208,127,0.12)]',
  confirmed: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(53,208,127,0.12)]',
  auto_closed: 'bg-amber-500 shadow-[0_0_0_4px_rgba(255,176,32,0.10)]',
  rejected: 'bg-red-500 shadow-[0_0_0_4px_rgba(255,93,93,0.10)]',
  deferred: 'bg-sky-500 shadow-[0_0_0_4px_rgba(56,189,248,0.10)]',
  classified: 'bg-primary shadow-[0_0_0_4px_rgba(139,92,246,0.10)]',
};

const actionLabel: Record<string, string> = {
  linked: 'Match confirmado',
  confirmed: 'Confirmado',
  auto_closed: 'Auto-close',
  rejected: 'Match rejeitado',
  deferred: 'Caso adiado',
  classified: 'Classificado para contexto',
};

export function ReconciliationAuditRail({
  entries,
  isLoading = false,
  title = 'Timeline / audit trail',
  expanded = false,
  requireActiveCase = false,
  inactiveMessage,
  activeCaseId = null,
  emptyMessage,
}: ReconciliationAuditRailProps) {
  const { formatDateTime } = useUserPreferences();

  const visibleEntries = useMemo(() => {
    if (requireActiveCase && !activeCaseId) return [];
    if (!activeCaseId) return entries;
    return entries.filter((entry) => entry.case_id === activeCaseId);
  }, [entries, activeCaseId, requireActiveCase]);

  const emptyCopy = requireActiveCase && !activeCaseId
    ? (inactiveMessage ?? 'Selecione um caso para ver a timeline.')
    : activeCaseId
    ? (emptyMessage ?? 'Nenhuma decisao registrada ainda neste caso.')
    : 'Sem entradas de auditoria ainda.';

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
      <div className="border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
        <b className="text-sm tracking-tight text-foreground">{title}</b>
        {activeCaseId ? (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            timeline deste caso
          </div>
        ) : null}
      </div>
      <div className="p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando historico...</p>
        ) : visibleEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyCopy}</p>
        ) : (
          <div className={`space-y-3 ${expanded ? 'max-h-[560px] overflow-y-auto pr-1' : ''}`}>
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="flex gap-2.5">
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor[entry.action] ?? 'bg-white/25 shadow-[0_0_0_4px_rgba(255,255,255,0.05)]'}`} />
                <div>
                  <div className="text-sm text-foreground">{actionLabel[entry.action] ?? entry.action}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {entry.actor} &bull; {formatDateTime(entry.created_at)}
                  </div>
                  {entry.notes ? (
                    <p className={`mt-1 text-xs ${entry.action === 'auto_closed' ? 'text-amber-200' : 'text-muted-foreground'}`}>
                      {entry.notes}
                    </p>
                  ) : entry.action === 'auto_closed' ? (
                    <p className="mt-1 text-xs text-amber-200">Caso fechado automaticamente com justificativa auditada.</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
