import { Button } from '@/components/ui/button';
import type { PluggyConnectionRow } from '@/types/reconciliation';

interface ReconciliationRiskStripProps {
  connections: PluggyConnectionRow[];
  onReauthenticate?: () => void;
}

export function ReconciliationRiskStrip({
  connections,
  onReauthenticate,
}: ReconciliationRiskStripProps) {
  if (connections.length === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-amber-500/35 bg-[linear-gradient(90deg,rgba(255,176,32,0.12),rgba(255,93,93,0.06))] px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
    >
      <div>
        <div className="text-sm font-semibold text-amber-50">Risco estrutural: conexão Pluggy stale</div>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
          {connections.map((item) => item.institution_name).join(', ')} sem sync há mais de 48h. Isso não é “mais um caso”:
          afeta a confiabilidade de matches e saldos até reautenticar o item.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 rounded-xl border-amber-500/50 bg-transparent text-amber-50 hover:bg-amber-500/10"
        onClick={onReauthenticate}
      >
        Reautenticar item
      </Button>
    </div>
  );
}
