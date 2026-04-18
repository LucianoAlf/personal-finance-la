import { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, RefreshCcw, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/layout/PageContent';
import { ReconciliationAuditRail } from '@/components/reconciliation/ReconciliationAuditRail';
import { ReconciliationCasePanel } from '@/components/reconciliation/ReconciliationCasePanel';
import { ReconciliationConnectionPanel } from '@/components/reconciliation/ReconciliationConnectionPanel';
import { ReconciliationContextRibbon } from '@/components/reconciliation/ReconciliationContextRibbon';
import { ReconciliationImportPanel } from '@/components/reconciliation/ReconciliationImportPanel';
import { ReconciliationInbox } from '@/components/reconciliation/ReconciliationInbox';
import { ReconciliationRiskStrip } from '@/components/reconciliation/ReconciliationRiskStrip';
import { ReconciliationSummaryCards } from '@/components/reconciliation/ReconciliationSummaryCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { usePayableBillsQuery } from '@/hooks/usePayableBillsQuery';
import { useReconciliationImport } from '@/hooks/useReconciliationImport';
import { useReconciliationMutations } from '@/hooks/useReconciliationMutations';
import { useReconciliationWindow } from '@/hooks/useReconciliationWindow';
import { useReconciliationWorkspaceQuery } from '@/hooks/useReconciliationWorkspaceQuery';
import { resolveDisplayAccountLabel } from '@/lib/reconciliation-account-label';
import { findTransferCandidates } from '@/lib/reconciliation-transfer-candidates';
import type { BankTransactionRow, PluggyConnectionRow, ReconciliationCaseRow } from '@/types/reconciliation';

const primaryBtn =
  'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';
const outlineBtn =
  'rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay';
const tabsListClassName =
  'grid h-auto w-full grid-cols-4 rounded-[1.2rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]';
const tabsTriggerClassName =
  'flex items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15';

type WorkspaceSection = 'resumo' | 'inbox' | 'historico' | 'conexoes';

type Hypothesis = { label: string; confidence: number };

function buildCaseContext(
  caseRow: ReconciliationCaseRow | null,
  bankTransaction: BankTransactionRow | null,
  connections: PluggyConnectionRow[],
) {
  if (!caseRow || !bankTransaction) {
    return null;
  }

  const hasHypotheses = Array.isArray(caseRow.hypotheses) && caseRow.hypotheses.length > 0;

  const priorityLabel: Record<string, string> = {
    urgent: 'urgente (atencao imediata)',
    high: 'alta (no mesmo dia)',
    medium: 'media (nesta semana)',
    low: 'baixa (pode esperar)',
    infra: 'infraestrutura (reautenticar Pluggy)',
  };

  const institutionName = bankTransaction.source_item_id
    ? connections.find((connection) => connection.item_id === bankTransaction.source_item_id)?.institution_name ?? null
    : null;

  return {
    source:
      bankTransaction.source === 'pluggy'
        ? 'Pluggy (transacao)'
        : bankTransaction.source === 'csv_upload'
          ? 'CSV'
          : bankTransaction.source === 'manual_paste'
            ? 'Colar extrato'
            : 'Manual',
    account: resolveDisplayAccountLabel({
      storedName: bankTransaction.account_name,
      institutionName,
      sourceHint: bankTransaction.source,
    }),
    window: hasHypotheses ? 'sem par no sistema' : 'pareamento direto',
    priority: priorityLabel[caseRow.priority] ?? 'media (nesta semana)',
  };
}

function ContextCard({
  activeCase,
  bankTransaction,
  connections,
}: {
  activeCase: ReconciliationCaseRow | null;
  bankTransaction: BankTransactionRow | null;
  connections: PluggyConnectionRow[];
}) {
  const context = buildCaseContext(activeCase, bankTransaction, connections);

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
      <div className="border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
        <b className="text-sm tracking-tight text-foreground">Contexto do caso</b>
      </div>
      <div className="p-3">
        {context ? (
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground">fonte</span>
            <span className="text-foreground">{context.source}</span>
            <span className="font-mono text-[11px] text-muted-foreground">conta</span>
            <span className="text-foreground">{context.account}</span>
            <span className="font-mono text-[11px] text-muted-foreground">situacao</span>
            <span className="text-foreground">{context.window}</span>
            <span className="font-mono text-[11px] text-muted-foreground">prioridade</span>
            <span className="text-foreground">{context.priority}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Selecione um caso para ver o contexto.</p>
        )}
      </div>
    </div>
  );
}

export function Reconciliation() {
  const windowState = useReconciliationWindow();
  const { data, isPending, isError, error } = useReconciliationWorkspaceQuery({
    window: windowState.window,
  });
  const { accounts } = useAccountsQuery();
  const { bills } = usePayableBillsQuery();
  const { applyDecision, syncPluggy } = useReconciliationMutations();
  const importState = useReconciliationImport();

  const [activeSection, setActiveSection] = useState<WorkspaceSection>('inbox');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const cases = data?.cases ?? [];
  const bankTransactions = data?.bankTransactions ?? [];
  const connections = data?.connections ?? [];
  const auditEntries = data?.auditEntries ?? [];
  const staleConnections: PluggyConnectionRow[] = connections.filter((item) => item.status !== 'UPDATED');

  useEffect(() => {
    if (!activeCaseId && cases.length > 0) {
      setActiveCaseId(cases[0].id);
      return;
    }

    if (activeCaseId && !cases.some((item) => item.id === activeCaseId)) {
      setActiveCaseId(cases[0]?.id ?? null);
    }
  }, [activeCaseId, cases]);

  const activeCase = useMemo(
    () => cases.find((item) => item.id === activeCaseId) ?? null,
    [activeCaseId, cases],
  );

  const activeBankTransaction = useMemo(
    () => bankTransactions.find((item) => item.id === activeCase?.bank_transaction_id) ?? null,
    [activeCase, bankTransactions],
  );

  const matchedPayableBill = useMemo(() => {
    if (!activeCase || activeCase.matched_record_type !== 'payable_bill') return null;
    return bills.find((item: any) => item.id === activeCase.matched_record_id) ?? null;
  }, [activeCase, bills]);

  const matchedAccount = useMemo(() => {
    if (!activeBankTransaction?.internal_account_id) return null;
    return accounts.find((item) => item.id === activeBankTransaction.internal_account_id) ?? null;
  }, [accounts, activeBankTransaction]);

  const handleSyncPluggy = async () => {
    try {
      await syncPluggy.mutateAsync();
      toast.success('Sincronizacao Pluggy concluida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sincronizar Pluggy.');
    }
  };

  const handleConfirm = async () => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'confirm',
        confirmationSource: 'workspace',
      });
      toast.success('Conciliacao confirmada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao confirmar conciliacao.');
    }
  };

  const handleReject = async () => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'reject',
        reason: 'Rejeitado manualmente pela central de conciliacao.',
      });
      toast.success('Match rejeitado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao rejeitar match.');
    }
  };

  const handleDefer = async () => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'defer',
        reason: 'Adiado para revisao posterior.',
      });
      toast.success('Caso adiado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao adiar caso.');
    }
  };

  const handleRequestContext = () => {
    importState.setMode('manual');
    setActiveSection('conexoes');
    toast.info('Abra o painel de ingestao para registrar o contexto da resposta.');
  };

  const handleViewWeakCandidates = () => {
    const hypotheses = ((activeCase?.hypotheses as Hypothesis[] | undefined) ?? []);
    toast.info(
      hypotheses.length > 0
        ? hypotheses.map((item) => `${Math.round(item.confidence * 100)}% ${item.label}`).join(' - ')
        : 'Ainda nao ha candidatos fracos materializados para este caso.',
    );
  };

  const handleMarkUnreconciliable = async () => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'reject',
        reason: 'Marcado como nao conciliavel neste momento.',
      });
      toast.success('Caso marcado como nao conciliavel agora.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao marcar caso.');
    }
  };

  const transferCandidates = useMemo(() => {
    if (!activeBankTransaction) return [];
    return findTransferCandidates({
      primary: activeBankTransaction,
      pool: bankTransactions,
    });
  }, [activeBankTransaction, bankTransactions]);

  const handleMarkTransfer = async (counterpartBankTransactionId: string | null) => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'mark_transfer',
        counterpartBankTransactionId: counterpartBankTransactionId ?? undefined,
      });
      toast.success(
        counterpartBankTransactionId
          ? 'Transferencia interna pareada.'
          : 'Lado marcado como transferencia. Quando a contraparte chegar, pareie para fechar o par.',
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Falha ao marcar transferencia interna.',
      );
    }
  };

  const handleIgnoreTransaction = async (reason: string | null) => {
    if (!activeCase) return;
    try {
      await applyDecision.mutateAsync({
        caseId: activeCase.id,
        action: 'ignore',
        reason: reason ?? undefined,
      });
      toast.success('Lancamento arquivado como nao reconhecido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao ignorar lancamento.');
    }
  };

  return (
    <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as WorkspaceSection)}>
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[18rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_70%)] lg:block" />

        <Header
          title="Central de Conciliacao"
          subtitle="Compare sistema vs banco e resolva divergencias com contexto"
          icon={<ShieldCheck size={24} />}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="min-w-[280px] max-w-[340px] flex-1">
                <TabsList className={tabsListClassName} aria-label="Secoes">
                  <TabsTrigger value="resumo" className={tabsTriggerClassName}>Resumo</TabsTrigger>
                  <TabsTrigger value="inbox" className={tabsTriggerClassName}>Inbox</TabsTrigger>
                  <TabsTrigger value="historico" className={tabsTriggerClassName}>Historico</TabsTrigger>
                  <TabsTrigger value="conexoes" className={tabsTriggerClassName}>Conexoes</TabsTrigger>
                </TabsList>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={outlineBtn}
                onClick={() => {
                  importState.setMode('paste');
                  setActiveSection('conexoes');
                }}
              >
                <ClipboardPaste size={16} className="mr-1.5" />
                Colar extrato
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={outlineBtn}
                onClick={() => {
                  importState.setMode('csv');
                  setActiveSection('conexoes');
                }}
              >
                <Upload size={16} className="mr-1.5" />
                Upload CSV
              </Button>
              <Button type="button" className={`${primaryBtn} px-4`} size="sm" onClick={handleSyncPluggy} disabled={syncPluggy.isPending}>
                <RefreshCcw size={16} className="mr-1.5" />
                {syncPluggy.isPending ? 'Sincronizando...' : 'Sincronizar Pluggy'}
              </Button>
            </div>
          }
        />

        <PageContent className="space-y-4 py-6">
          {isError ? (
            <Card className="rounded-[1.4rem] border-amber-500/35 bg-[linear-gradient(90deg,rgba(255,176,32,0.12),rgba(255,93,93,0.06))] shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <CardContent className="space-y-2 px-5 py-4">
                <div className="text-sm font-semibold text-foreground">Infraestrutura da conciliacao indisponivel</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : 'A consulta falhou antes de carregar os dados da Phase 4.'}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Verifique schema remoto da Phase 4, secrets `PLUGGY_*` e o wiring do poller antes de tratar isso como
                  "sem dados".
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <ReconciliationRiskStrip connections={staleConnections} onReauthenticate={() => setActiveSection('conexoes')} />

              <ReconciliationContextRibbon
                window={windowState.window}
                activePresetId={windowState.presetId}
                onChangePreset={windowState.setPresetId}
                summary={data?.summary ?? null}
                connections={connections}
                isPending={isPending}
                isWindowLoading={windowState.isLoading}
                onSyncNow={handleSyncPluggy}
                isSyncPending={syncPluggy.isPending}
              />

              <ReconciliationSummaryCards summary={data?.summary ?? null} isPending={isPending} />

              <TabsContent value="resumo" className="mt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <ReconciliationImportPanel state={importState} />
              <div className="space-y-3">
                <ReconciliationConnectionPanel connections={connections} isLoading={isPending} title="Conexoes e saude" />
                <ReconciliationAuditRail entries={auditEntries.slice(0, 8)} isLoading={isPending} title="Ultimos eventos" />
              </div>
            </div>
              </TabsContent>

              <TabsContent value="inbox" className="mt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
              <ReconciliationInbox
                cases={cases}
                bankTransactions={bankTransactions}
                connections={connections}
                activeCaseId={activeCaseId}
                onSelectCase={setActiveCaseId}
                isLoading={isPending}
              />

              <ReconciliationCasePanel
                activeCase={activeCase}
                bankTransaction={activeBankTransaction}
                matchedPayableBill={matchedPayableBill}
                matchedAccount={matchedAccount}
                connections={connections}
                transferCandidates={transferCandidates}
                isLoading={isPending}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onDefer={handleDefer}
                onRequestContext={handleRequestContext}
                onViewWeakCandidates={handleViewWeakCandidates}
                onMarkUnreconciliable={handleMarkUnreconciliable}
                onMarkTransfer={handleMarkTransfer}
                onIgnoreTransaction={handleIgnoreTransaction}
                onOpenConnections={() => setActiveSection('conexoes')}
                decisionPending={applyDecision.isPending}
              />

              <aside className="space-y-3" aria-label="Lateral">
                <ContextCard activeCase={activeCase} bankTransaction={activeBankTransaction} connections={connections} />
                <ReconciliationAuditRail
                  entries={auditEntries}
                  isLoading={isPending}
                  activeCaseId={activeCaseId}
                  emptyMessage={
                    activeCaseId
                      ? 'Nenhuma decisao registrada ainda neste caso. As acoes ficam aqui assim que voce confirmar, rejeitar ou adiar.'
                      : undefined
                  }
                />
                {/*
                  Connection panel only renders on the right rail when infra
                  actually needs attention (stale connection) or the active case
                  itself is infra-flavored. Otherwise it's chrome that competes
                  with Contexto + Timeline for the operator's eyes.
                */}
                {staleConnections.length > 0 || activeCase?.divergence_type === 'stale_connection' ? (
                  <ReconciliationConnectionPanel connections={connections} isLoading={isPending} />
                ) : null}
              </aside>
            </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <ReconciliationAuditRail entries={auditEntries} isLoading={isPending} expanded title="Historico completo" />
              <div className="space-y-3">
                <ContextCard activeCase={activeCase} bankTransaction={activeBankTransaction} connections={connections} />
                <ReconciliationConnectionPanel connections={connections} isLoading={isPending} title="Conexoes relacionadas" />
              </div>
            </div>
              </TabsContent>

              <TabsContent value="conexoes" className="mt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <ReconciliationImportPanel state={importState} />
              <div className="space-y-3">
                <ReconciliationConnectionPanel connections={connections} isLoading={isPending} title="Status e saude das conexoes" />
                <Card className="rounded-[1.4rem] border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
                  <CardContent className="px-4 py-4">
                    <div className="text-sm font-semibold text-foreground">Pipeline</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      CSV, colar extrato, manual e Pluggy convergem para o mesmo pipeline: normalizacao - matching - casos - decisao auditada.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
              </TabsContent>
            </>
          )}
        </PageContent>
      </div>
    </Tabs>
  );
}
