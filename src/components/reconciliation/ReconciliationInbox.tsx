import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/cn';
import { createAccountLabelResolver } from '@/lib/reconciliation-account-label';
import { classifyBankDescription } from '@/lib/reconciliation-case-narrative';
import type { PluggyConnectionRow, ReconciliationCaseRow } from '@/types/reconciliation';

interface ReconciliationInboxProps {
  cases: ReconciliationCaseRow[];
  bankTransactions?: Array<{
    id: string;
    source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
    account_name: string;
    source_item_id?: string | null;
    amount: number;
    date: string;
    description?: string | null;
    raw_description?: string | null;
  }>;
  connections?: PluggyConnectionRow[];
  activeCaseId: string | null;
  onSelectCase: (id: string) => void;
  isLoading?: boolean;
}

const filterChips = ['fonte', 'tipo', 'prioridade', 'confianca', 'conta'];

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  infra: 4,
};

const priorityLabel: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baixa',
  infra: 'Infraestrutura / conexao',
};

const priorityBadgeVariant: Record<string, 'danger' | 'warning' | 'info' | 'outline' | 'secondary'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'outline',
  infra: 'secondary',
};

const priorityGroupClassName: Record<string, string> = {
  urgent: 'border-l-[4px] border-l-danger border-danger-border/40 bg-danger-subtle/10',
  high: 'border-l-[4px] border-l-warning border-warning-border/40 bg-warning-subtle/10',
  medium: 'border-l-[4px] border-l-info border-info-border/40 bg-info-subtle/10',
  low: 'border-l-[4px] border-l-border bg-surface-elevated/20',
  infra: 'border-l-[4px] border-l-warning border-warning-border/30 bg-warning-subtle/5',
};

function groupCasesByPriority(cases: ReconciliationCaseRow[]) {
  const groups = new Map<string, ReconciliationCaseRow[]>();
  for (const item of cases) {
    const current = groups.get(item.priority) ?? [];
    current.push(item);
    groups.set(item.priority, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (priorityOrder[a] ?? 99) - (priorityOrder[b] ?? 99))
    .map(([priority, items]) => ({ priority, items }));
}

function formatDivergenceBadge(type: string) {
  const map: Record<string, string> = {
    unmatched_bank_transaction: 'sem match',
    pending_bill_paid_in_bank: 'pago no banco',
    amount_mismatch: 'valor divergente',
    date_mismatch: 'data divergente',
    balance_mismatch: 'saldo divergente',
    possible_duplicate: 'duplicidade',
    stale_connection: 'pluggy item',
    unclassified_transaction: 'sem classificacao',
  };
  return map[type] ?? type;
}

function formatCaseTitle(
  row: ReconciliationCaseRow,
  bankRow: { description?: string | null; raw_description?: string | null } | undefined,
) {
  const bankKind = classifyBankDescription(bankRow?.description ?? bankRow?.raw_description);

  switch (row.divergence_type) {
    case 'unmatched_bank_transaction':
      return `${bankKind.label} sem par no sistema`;
    case 'pending_bill_paid_in_bank':
      return 'Pagamento refletido no banco';
    case 'amount_mismatch':
      return 'Divergencia de valor banco x sistema';
    case 'date_mismatch':
      return 'Divergencia de data banco x sistema';
    case 'balance_mismatch':
      return 'Saldo da conta nao bate';
    case 'possible_duplicate':
      return 'Possivel duplicidade bancaria';
    case 'stale_connection':
      return 'Conexao bancaria instavel';
    case 'unclassified_transaction':
      return 'Classificacao incerta';
    default: {
      const type = row.divergence_type.replace(/_/g, ' ');
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
}

function formatSourceLabel(source: ReconciliationInboxProps['bankTransactions'][number]['source']) {
  if (source === 'pluggy') return 'pluggy';
  if (source === 'csv_upload') return 'csv';
  if (source === 'manual_paste') return 'manual';
  return 'manual';
}

export function ReconciliationInbox({
  cases,
  bankTransactions = [],
  connections = [],
  activeCaseId,
  onSelectCase,
  isLoading = false,
}: ReconciliationInboxProps) {
  const { formatCurrency, formatDate } = useUserPreferences();
  const grouped = groupCasesByPriority(cases);
  const bankTransactionsById = new Map(bankTransactions.map((item) => [item.id, item]));
  const resolveAccountLabel = useMemo(() => createAccountLabelResolver(connections), [connections]);

  const totalCases = cases.length;

  return (
    <section
      aria-label="Inbox"
      className="flex max-h-[calc(100vh-18rem)] min-h-[420px] flex-col overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)] xl:sticky xl:top-4"
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
        <b className="text-sm tracking-tight text-foreground">Inbox priorizada</b>
        <span className="font-mono text-[11px] text-muted-foreground">
          {totalCases > 0 ? `${totalCases} na fila` : 'fila operacional'}
        </span>
      </div>
      <div className="border-b border-border/40 bg-surface/80 px-3 pb-2 pt-3">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <span key={chip} className="rounded-full border border-border/60 bg-surface-elevated/25 px-2.5 py-1 text-[11px] text-muted-foreground">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3">
        <div className="space-y-3">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando inbox...</p>
          ) : grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum caso na fila.</p>
          ) : (
            grouped.map(({ priority, items }) => (
              <div key={priority} className={cn('rounded-xl border p-2.5', priorityGroupClassName[priority] ?? priorityGroupClassName.low)}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {priorityLabel[priority] ?? priority}
                </div>
                <div className="space-y-2">
                  {items.map((row) => {
                    const bankRow = bankTransactionsById.get(row.bank_transaction_id);
                    const accountLabel = bankRow
                      ? resolveAccountLabel({
                          account_name: bankRow.account_name,
                          source: bankRow.source,
                          source_item_id: bankRow.source_item_id ?? null,
                        })
                      : null;
                    const subtitle = bankRow
                      ? `${formatSourceLabel(bankRow.source)} \u2022 ${accountLabel} \u2022 ${formatCurrency(Math.abs(bankRow.amount))} \u2022 ${formatDate(bankRow.date)}`
                      : `conf. ${(row.confidence * 100).toFixed(0)}% \u2022 ${row.status}`;

                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onSelectCase(row.id)}
                        className={cn(
                          'w-full rounded-xl border border-border/60 bg-surface/70 px-3 py-2.5 text-left transition-all hover:border-border hover:bg-surface-elevated',
                          activeCaseId === row.id && 'border-primary/50 bg-primary/10 ring-1 ring-primary/20',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={priorityBadgeVariant[row.priority] ?? 'outline'} className="text-[11px]">
                            {priorityLabel[row.priority] ?? row.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[11px]">
                            {formatDivergenceBadge(row.divergence_type)}
                          </Badge>
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-foreground">{formatCaseTitle(row, bankRow)}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
