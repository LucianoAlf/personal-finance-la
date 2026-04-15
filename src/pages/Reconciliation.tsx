import { useState } from 'react';
import { ShieldCheck, Upload, ClipboardPaste, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/layout/PageContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReconciliationWorkspaceQuery } from '@/hooks/useReconciliationWorkspaceQuery';
import type {
  PluggyConnectionRow,
  ReconciliationAuditLogRow,
  ReconciliationCaseRow,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

const primaryBtn =
  'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';
const outlineBtn =
  'rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay';

type WorkspaceSection = 'resumo' | 'inbox' | 'historico' | 'conexoes';

const sectionPills: Array<{ id: WorkspaceSection; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'historico', label: 'Histórico' },
  { id: 'conexoes', label: 'Conexões' },
];

const filterChips = ['fonte', 'tipo', 'prioridade', 'confiança', 'conta'];

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
  medium: 'Média',
  low: 'Baixa',
  infra: 'Infraestrutura / Conexão',
};

const priorityBadgeVariant: Record<string, 'danger' | 'warning' | 'info' | 'outline' | 'secondary'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'outline',
  infra: 'secondary',
};

function formatDivergenceType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDivergenceBadge(t: string): string {
  const map: Record<string, string> = {
    unmatched_bank_transaction: 'sem match',
    pending_bill_paid_in_bank: 'pago no banco',
    amount_mismatch: 'valor divergente',
    date_mismatch: 'data divergente',
    balance_mismatch: 'saldo divergente',
    possible_duplicate: 'duplicidade',
    stale_connection: 'conexão',
    unclassified_transaction: 'sem classificação',
  };
  return map[t] ?? t;
}

function groupCasesByPriority(cases: ReconciliationCaseRow[]): Array<{ priority: string; cases: ReconciliationCaseRow[] }> {
  const groups = new Map<string, ReconciliationCaseRow[]>();
  for (const c of cases) {
    const list = groups.get(c.priority) ?? [];
    list.push(c);
    groups.set(c.priority, list);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (priorityOrder[a] ?? 99) - (priorityOrder[b] ?? 99))
    .map(([priority, items]) => ({ priority, cases: items }));
}

function RiskStrip({ connections }: { connections: PluggyConnectionRow[] }) {
  if (connections.length === 0) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-5 py-3.5 text-sm shadow-sm backdrop-blur"
    >
      <div>
        <span className="font-semibold text-amber-50">Risco estrutural: conexão Pluggy stale</span>
        <p className="mt-1 text-xs text-amber-200/80">
          {connections.map((c) => c.institution_name).join(', ')} sem sync há mais de 48h.
          Matches e saldos podem ficar defasados até reautenticar o item.
        </p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 rounded-xl border-amber-500/40 text-amber-100 hover:bg-amber-500/15">
        Reautenticar item
      </Button>
    </div>
  );
}

function KpiCards({ summary, isPending }: { summary: ReconciliationWorkspaceSummary | null; isPending: boolean }) {
  const s = summary;
  const dash = '—';
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Card className="rounded-2xl border-border/70 bg-surface/90 shadow-sm">
        <CardContent className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo sistema vs banco</div>
          <div className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {isPending ? dash : `R$ ${(s?.balanceDelta ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </div>
          <div className="mt-1 text-[11px] text-danger">Divergência: R$ 0,00</div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70 bg-surface/90 shadow-sm">
        <CardContent className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pendências abertas</div>
          <div className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {isPending ? dash : `${s?.openCases ?? 0} casos`}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">inbox_priority: desc</div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70 bg-surface/90 shadow-sm">
        <CardContent className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Alta confiança</div>
          <div className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {isPending ? dash : `${s?.highConfidenceCount ?? 0} sugestões`}
          </div>
          <div className="mt-1 text-[11px] text-success">auto-match: elegível (com confirmação)</div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70 bg-surface/90 shadow-sm">
        <CardContent className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Contas stale</div>
          <div className="mt-2 text-base font-semibold tabular-nums text-foreground">
            {isPending ? dash : `${s?.staleConnections ?? 0} conexão`}
          </div>
          <div className="mt-1 text-[11px] text-danger">
            {(s?.staleConnections ?? 0) > 0 ? 'última sync atrasada' : 'todas atualizadas'}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70 bg-surface/90 shadow-sm">
        <CardContent className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fonte</div>
          <div className="mt-2 text-base font-semibold text-foreground">
            {isPending ? dash : (s?.activeSources ?? []).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ')}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">source-agnostic pipeline</div>
        </CardContent>
      </Card>
    </div>
  );
}

function InboxPanel({
  cases,
  activeCaseId,
  onSelectCase,
  isPending,
}: {
  cases: ReconciliationCaseRow[];
  activeCaseId: string | null;
  onSelectCase: (id: string) => void;
  isPending: boolean;
}) {
  const grouped = groupCasesByPriority(cases);
  return (
    <section aria-label="Inbox" className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Inbox priorizada</span>
        <span className="font-mono text-[11px] text-muted-foreground">fila operacional</span>
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((label) => (
            <span key={label} className="rounded-full border border-border/60 bg-surface-elevated/30 px-2.5 py-1 text-[11px] text-muted-foreground">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-3 space-y-4">
          {isPending ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : grouped.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum caso na fila.</p>
          ) : (
            grouped.map(({ priority, cases: items }) => (
              <div key={priority}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {priorityLabel[priority] ?? priority}
                </div>
                <div className="space-y-2">
                  {items.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onSelectCase(row.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                        activeCaseId === row.id
                          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                          : 'border-border/50 bg-surface-elevated/60 hover:border-border hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityBadgeVariant[row.priority] ?? 'outline'} className="text-[11px]">
                          {priorityLabel[row.priority] ?? row.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {formatDivergenceBadge(row.divergence_type)}
                        </Badge>
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-foreground">{formatDivergenceType(row.divergence_type)}</div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        Conf. {(row.confidence * 100).toFixed(0)}% · {row.priority}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CaseWorkspacePanel({
  activeCase,
  isPending,
}: {
  activeCase: ReconciliationCaseRow | null;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <section aria-label="Caso aberto" className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Caso aberto</span>
        </div>
        <div className="flex min-h-[320px] items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </section>
    );
  }

  if (!activeCase) {
    return (
      <section aria-label="Caso aberto" className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Caso aberto</span>
          <span className="font-mono text-[11px] text-muted-foreground">banco vs sistema</span>
        </div>
        <div className="flex min-h-[320px] items-center justify-center p-6">
          <p className="text-center text-sm text-muted-foreground">
            Selecione um item na inbox para comparar banco vs sistema.
          </p>
        </div>
      </section>
    );
  }

  const confidencePercent = (activeCase.confidence * 100).toFixed(0);

  return (
    <section aria-label="Caso aberto" className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
        <div>
          <span className="text-sm font-semibold text-foreground">
            Caso aberto: {formatDivergenceType(activeCase.divergence_type)}
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          confidence: {(activeCase.confidence).toFixed(2)} · banco vs sistema
        </span>
      </div>
      <div className="space-y-3 p-4">
        {/* banco vs sistema split */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Banco</div>
            <div className="mt-2 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Saída:</span> <span className="font-semibold">—</span></div>
              <div><span className="text-muted-foreground">Data:</span> —</div>
              <div><span className="text-muted-foreground">Descrição:</span> —</div>
              <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                bank_transaction_id: {activeCase.bank_transaction_id.slice(0, 8)}…
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Sistema</div>
            <div className="mt-2 space-y-1 text-sm">
              {activeCase.matched_record_type ? (
                <>
                  <div><span className="text-muted-foreground">Tipo:</span> {activeCase.matched_record_type}</div>
                  <div><span className="text-muted-foreground">ID:</span> {activeCase.matched_record_id?.slice(0, 8) ?? '—'}…</div>
                </>
              ) : (
                <div className="text-muted-foreground">Sem match no sistema</div>
              )}
              <div><span className="text-muted-foreground">Status:</span> {activeCase.status}</div>
            </div>
          </div>
        </div>

        {/* Ana Clara + Resolução */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.25fr_0.9fr]">
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.11] to-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-400">Ana Clara (camada cognitiva)</div>
            <div className="mt-2 space-y-2 text-sm text-foreground">
              <div><span className="font-semibold">O que eu acho</span>: análise cognitiva será preenchida com dados reais.</div>
              <div><span className="font-semibold">Confiança</span>: {confidencePercent}%</div>
              {Array.isArray(activeCase.hypotheses) && activeCase.hypotheses.length > 0 ? (
                <div>
                  <span className="font-semibold">Hipóteses</span>:
                  <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs text-muted-foreground">
                    {(activeCase.hypotheses as Array<{ label: string; confidence: number }>).map((h, i) => (
                      <li key={i}>{(h.confidence * 100).toFixed(0)}% — {h.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">O que eu preciso de você</span>: confirmar se o match está correto.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-sky-400">Próxima ação (segura)</div>
            <div className="mt-2 space-y-2 text-sm text-foreground">
              <div><span className="font-semibold">Conciliar</span> transação bancária ↔ registro no sistema</div>
              <div className="text-xs text-muted-foreground">conciliar ≠ pagar; pagamento é ação separada</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
                  Confirmar conciliação
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20">
                  Rejeitar match
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl">
                  Adiar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="rounded-xl border border-dashed border-border/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold">Guardrails:</span> conciliar não é pagar · matching não vira mutação automática sem critério ·
          confiança precisa ser visível · ações sensíveis exigem confirmação · histórico/audit trail obrigatório.
        </div>
      </div>
    </section>
  );
}

function CaseContextRail({ activeCase }: { activeCase: ReconciliationCaseRow | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
      <div className="border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Contexto do caso</span>
      </div>
      <div className="p-3">
        {activeCase ? (
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground">fonte</span>
            <span className="text-foreground">—</span>
            <span className="font-mono text-[11px] text-muted-foreground">conta</span>
            <span className="text-foreground">—</span>
            <span className="font-mono text-[11px] text-muted-foreground">janela</span>
            <span className="text-foreground">últimos 14 dias</span>
            <span className="font-mono text-[11px] text-muted-foreground">risco</span>
            <span className="text-foreground">{activeCase.priority}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Selecione um caso para ver o contexto.</p>
        )}
      </div>
    </div>
  );
}

function AuditTrailRail({ entries, isPending }: { entries: ReconciliationAuditLogRow[]; isPending: boolean }) {
  const dotColor: Record<string, string> = {
    linked: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(53,208,127,0.12)]',
    confirmed: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(53,208,127,0.12)]',
    auto_closed: 'bg-amber-500 shadow-[0_0_0_4px_rgba(255,176,32,0.10)]',
    rejected: 'bg-red-500 shadow-[0_0_0_4px_rgba(255,93,93,0.10)]',
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
      <div className="border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Timeline / audit trail</span>
      </div>
      <div className="p-3">
        {isPending ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem entradas de auditoria ainda.</p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex gap-2.5">
                <div
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor[entry.action] ?? 'bg-white/25 shadow-[0_0_0_4px_rgba(255,255,255,0.05)]'}`}
                />
                <div>
                  <div className="text-sm text-foreground">{entry.action}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {entry.actor} · {new Date(entry.created_at).toLocaleString('pt-BR')}
                  </div>
                  {entry.notes ? <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.notes}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionStatusRail({ connections, isPending }: { connections: PluggyConnectionRow[]; isPending: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-sm">
      <div className="border-b border-border/50 bg-surface-elevated/50 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Status de conexão</span>
      </div>
      <div className="p-3">
        {isPending ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
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
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
            {connections.map((c) => (
              <div key={c.id} className="col-span-2 grid grid-cols-subgrid">
                <span className="font-mono text-[11px] text-muted-foreground">{c.institution_name.toLowerCase()}</span>
                <span className={`text-foreground ${c.status !== 'UPDATED' ? 'text-amber-400' : ''}`}>
                  {c.status === 'UPDATED'
                    ? `OK (sync: ${c.last_synced_at ? new Date(c.last_synced_at).toLocaleString('pt-BR') : '—'})`
                    : `stale (${c.last_synced_at ? new Date(c.last_synced_at).toLocaleString('pt-BR') : '—'})`}
                </span>
              </div>
            ))}
            <span className="font-mono text-[11px] text-muted-foreground">webhookUrl</span>
            <span className="font-mono text-foreground">null</span>
            <span className="font-mono text-[11px] text-muted-foreground">modo</span>
            <span className="text-foreground">polling + pg_cron</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Reconciliation() {
  const { data, isPending } = useReconciliationWorkspaceQuery();
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('inbox');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const staleConnections: PluggyConnectionRow[] =
    data?.connections?.filter((item) => item.status !== 'UPDATED') ?? [];

  const activeCase: ReconciliationCaseRow | null =
    data?.cases?.find((c) => c.id === activeCaseId) ?? null;

  const handleSyncPluggy = () => {
    toast.info('Sincronização Pluggy será acionada pelo agendamento do servidor (worker).');
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[18rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_70%)] lg:block" />

      <Header
        title="Central de Conciliação"
        subtitle="Compare sistema vs banco e resolva divergências com contexto"
        icon={<ShieldCheck size={24} />}
        actions={
          <div className="flex items-center gap-2">
            {/* Section pills */}
            <nav aria-label="Seções" className="mr-2 hidden items-center gap-1.5 md:flex">
              {sectionPills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveSection(pill.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activeSection === pill.id
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/60 bg-surface-elevated/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </nav>

            <Button variant="outline" size="sm" className={outlineBtn}>
              <ClipboardPaste size={16} className="mr-1.5" />
              Colar extrato
            </Button>
            <Button variant="outline" size="sm" className={outlineBtn}>
              <Upload size={16} className="mr-1.5" />
              Upload CSV
            </Button>
            <Button type="button" className={`${primaryBtn} px-4`} size="sm" onClick={handleSyncPluggy}>
              <RefreshCcw size={16} className="mr-1.5" />
              Sincronizar Pluggy
            </Button>
          </div>
        }
      />

      <PageContent className="space-y-4 py-6">
        <RiskStrip connections={staleConnections} />

        <KpiCards summary={data?.summary ?? null} isPending={isPending} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <InboxPanel
            cases={data?.cases ?? []}
            activeCaseId={activeCaseId}
            onSelectCase={setActiveCaseId}
            isPending={isPending}
          />

          <CaseWorkspacePanel activeCase={activeCase} isPending={isPending} />

          <aside className="space-y-3" aria-label="Lateral">
            <CaseContextRail activeCase={activeCase} />
            <AuditTrailRail entries={data?.auditEntries ?? []} isPending={isPending} />
            <ConnectionStatusRail connections={data?.connections ?? []} isPending={isPending} />
          </aside>
        </div>
      </PageContent>
    </div>
  );
}
