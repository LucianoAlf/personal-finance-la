import { Badge } from '@/components/ui/badge';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { isReconciliationDebugEnabled, maskIdentifier } from '@/lib/reconciliation-debug';
import type { PluggyConnectionRow } from '@/types/reconciliation';

interface ReconciliationConnectionPanelProps {
  connections: PluggyConnectionRow[];
  isLoading?: boolean;
  title?: string;
}

export function ReconciliationConnectionPanel({
  connections,
  isLoading = false,
  title = 'Status de conexão',
}: ReconciliationConnectionPanelProps) {
  const { formatDateTime } = useUserPreferences();
  const staleConnections = connections.filter((connection) => connection.status !== 'UPDATED');
  const debugEnabled = isReconciliationDebugEnabled();

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
      <div className="border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
        <b className="text-sm tracking-tight text-foreground">{title}</b>
      </div>
      <div className="space-y-3 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando conexões…</p>
        ) : connections.length === 0 ? (
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground">pluggy</span>
            <span className="text-foreground">não configurado</span>
            <span className="font-mono text-[11px] text-muted-foreground">webhookUrl</span>
            <span className="font-mono text-foreground">null</span>
            <span className="font-mono text-[11px] text-muted-foreground">modo</span>
            <span className="text-foreground">polling + pg_cron</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-surface-elevated/25 px-3 py-2 text-xs text-muted-foreground">
              {staleConnections.length > 0
                ? `${staleConnections.length} item(ns) stale estao operando com cap de confianca e exigem reautenticacao.`
                : 'Todas as conexoes Pluggy estao atualizadas dentro do threshold configurado.'}
            </div>
            {connections.map((connection) => {
              const isHealthy = connection.status === 'UPDATED';
              return (
                <div key={connection.id} className="rounded-xl border border-border/50 bg-surface-elevated/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">{connection.institution_name}</div>
                    <Badge variant={isHealthy ? 'success' : 'warning'}>{isHealthy ? 'OK' : 'stale'}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
                    <span className="font-mono text-[11px] text-muted-foreground">ultima sync</span>
                    <span className="text-foreground">{connection.last_synced_at ? formatDateTime(connection.last_synced_at) : '\u2014'}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">threshold</span>
                    <span className="text-foreground">{connection.staleness_threshold_hours}h</span>
                    <span className="font-mono text-[11px] text-muted-foreground">efeito</span>
                    <span className={isHealthy ? 'text-foreground' : 'text-amber-300'}>
                      {isHealthy ? 'matching sem penalidade' : 'cap de confianca ativo'}
                    </span>
                    {debugEnabled ? (
                      <>
                        <span className="font-mono text-[11px] text-muted-foreground">item_id</span>
                        <span className="font-mono text-foreground">{maskIdentifier(connection.item_id)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
              <span className="font-mono text-[11px] text-muted-foreground">webhookUrl</span>
              <span className="font-mono text-foreground">null</span>
              <span className="font-mono text-[11px] text-muted-foreground">modo</span>
              <span className="text-foreground">polling + pg_cron</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
