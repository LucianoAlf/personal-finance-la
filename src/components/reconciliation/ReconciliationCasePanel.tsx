import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  createAccountLabelResolver,
  resolveDisplayAccountLabel,
} from '@/lib/reconciliation-account-label';
import { buildCaseNarrative } from '@/lib/reconciliation-case-narrative';
import { isReconciliationDebugEnabled, maskIdentifier } from '@/lib/reconciliation-debug';
import type { TransferCandidate } from '@/lib/reconciliation-transfer-candidates';
import type { Account } from '@/types/accounts';
import type { PayableBill } from '@/types/payable-bills.types';
import type {
  BankTransactionRow,
  PluggyConnectionRow,
  ReconciliationCaseRow,
} from '@/types/reconciliation';

interface ReconciliationCasePanelProps {
  activeCase: ReconciliationCaseRow | null;
  bankTransaction: BankTransactionRow | null;
  matchedPayableBill: PayableBill | null;
  matchedAccount: Account | null;
  connections?: PluggyConnectionRow[];
  /**
   * Counterpart candidates for "marcar como transferencia interna" action.
   * Provided by the parent because the full BankTransactionRow pool is owned
   * by the workspace query; this panel only renders them.
   */
  transferCandidates?: TransferCandidate[];
  isLoading?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onDefer?: () => void;
  onRequestContext?: () => void;
  onViewWeakCandidates?: () => void;
  onMarkUnreconciliable?: () => void;
  onOpenConnections?: () => void;
  /**
   * Called when the operator confirms "marcar como transferencia interna".
   * `counterpartBankTransactionId` is null when they confirm before picking a
   * counterpart (e.g. other leg not yet ingested); the backend records a
   * single-leg pairing that can be completed later.
   */
  onMarkTransfer?: (counterpartBankTransactionId: string | null) => void;
  /**
   * Called when the operator confirms "nao reconheco esse lancamento".
   * `reason` is optional free text captured in the dialog; null is acceptable.
   */
  onIgnoreTransaction?: (reason: string | null) => void;
  decisionPending?: boolean;
}

function getSourceLabel(bankTransaction: BankTransactionRow | null) {
  if (!bankTransaction) return 'manual|pluggy';
  if (bankTransaction.source === 'pluggy') return 'pluggy';
  if (bankTransaction.source === 'csv_upload') return 'csv';
  if (bankTransaction.source === 'manual_paste') return 'paste';
  return 'manual';
}

export function ReconciliationCasePanel({
  activeCase,
  bankTransaction,
  matchedPayableBill,
  matchedAccount,
  connections = [],
  transferCandidates = [],
  isLoading = false,
  onConfirm,
  onReject,
  onDefer,
  onRequestContext,
  onViewWeakCandidates,
  onMarkUnreconciliable,
  onOpenConnections,
  onMarkTransfer,
  onIgnoreTransaction,
  decisionPending = false,
}: ReconciliationCasePanelProps) {
  const { formatCurrency, formatDate } = useUserPreferences();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string | null>(null);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');

  const accountLabelResolver = useMemo(
    () => createAccountLabelResolver(connections),
    [connections],
  );

  if (isLoading) {
    return (
      <section aria-label="Caso aberto" className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
          <b className="text-sm tracking-tight text-foreground">Caso aberto</b>
          <span className="font-mono text-[11px] text-muted-foreground">banco vs sistema</span>
        </div>
        <div className="flex min-h-[360px] items-center justify-center p-6 text-sm text-muted-foreground">Carregando caso...</div>
      </section>
    );
  }

  if (!activeCase) {
    return (
      <section aria-label="Caso aberto" className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <div className="flex items-center justify-between border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
          <b className="text-sm tracking-tight text-foreground">Caso aberto</b>
          <span className="font-mono text-[11px] text-muted-foreground">banco vs sistema</span>
        </div>
        <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Selecione um item na inbox para comparar banco vs sistema.
        </div>
      </section>
    );
  }

  const hypotheses = (activeCase.hypotheses as Array<{ label: string; confidence: number }> | undefined) ?? [];
  const sourceLabel = getSourceLabel(bankTransaction);
  const debugEnabled = isReconciliationDebugEnabled();
  const institutionName = bankTransaction?.source_item_id
    ? connections.find((connection) => connection.item_id === bankTransaction.source_item_id)?.institution_name ?? null
    : null;
  const displayAccountLabel = bankTransaction
    ? resolveDisplayAccountLabel({
        storedName: bankTransaction.account_name,
        institutionName,
        sourceHint: bankTransaction.source,
      })
    : null;
  const narrative = buildCaseNarrative({
    caseRow: activeCase,
    bankTransaction,
    matchedPayableBill,
    matchedAccount,
    formatCurrency,
    formatDate,
    displayAccountLabel,
  });

  const isContextual = narrative.mode === 'contextual_decision';
  const isStrong = narrative.mode === 'strong_match';
  const isInfra = narrative.mode === 'infra_attention';

  return (
    <section aria-label="Caso aberto" className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-surface-elevated/35 px-4 py-3">
        <div>
          <b className="text-sm tracking-tight text-foreground">Caso aberto: {narrative.title}</b>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            {narrative.headerSubtitle}
            {!isContextual && !isInfra ? ` \u2022 source: ${sourceLabel}` : ''}
          </div>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">banco vs sistema</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Banco</div>
            <div className="mt-2 space-y-1.5 text-sm text-foreground">
              <div><span className="text-muted-foreground">{(bankTransaction?.amount ?? 0) < 0 ? 'Saida' : 'Entrada'}:</span> <span className="font-semibold">{bankTransaction ? formatCurrency(Math.abs(bankTransaction.amount)) : '\u2014'}</span></div>
              <div><span className="text-muted-foreground">Data:</span> {bankTransaction ? formatDate(bankTransaction.date) : '\u2014'}</div>
              <div><span className="text-muted-foreground">Descricao:</span> {bankTransaction?.description ?? '\u2014'}</div>
              {narrative.bankSideType ? (
                <div><span className="text-muted-foreground">Tipo:</span> {narrative.bankSideType}</div>
              ) : null}
              <div className="pt-1 font-mono text-[11px] text-muted-foreground">
                {displayAccountLabel ?? 'conta nao identificada'}
                {debugEnabled && bankTransaction?.external_id ? ` \u2022 txId: ${maskIdentifier(bankTransaction.external_id)}` : ''}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-[rgba(12,18,32,0.55)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Sistema</div>
            <div className="mt-2 space-y-1.5 text-sm text-foreground">
              {matchedPayableBill ? (
                <>
                  <div><span className="text-muted-foreground">Conta:</span> <b>{matchedPayableBill.description}</b></div>
                  <div><span className="text-muted-foreground">Valor:</span> {formatCurrency(matchedPayableBill.amount)}</div>
                  <div><span className="text-muted-foreground">Venc.:</span> {matchedPayableBill.due_date ? formatDate(matchedPayableBill.due_date) : '\u2014'}</div>
                  <div><span className="text-muted-foreground">Status:</span> {matchedPayableBill.status ?? activeCase.status}</div>
                  {debugEnabled ? (
                    <div className="pt-1 font-mono text-[11px] text-muted-foreground">
                      payable_bill_id: {maskIdentifier(matchedPayableBill.id)}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div><span className="text-muted-foreground">Match automatico:</span> <b>nenhum</b></div>
                  <div><span className="text-muted-foreground">Contas a pagar candidatas:</span> nenhuma com valor+data alinhados</div>
                  <div><span className="text-muted-foreground">Transacoes internas:</span> nenhuma equivalente encontrada</div>
                  <div className="mt-2 rounded-lg border border-dashed border-border/40 bg-surface-elevated/15 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    Estado esperado para "sem correspondencia": o banco registra movimento, o sistema ainda nao tem lancamento que feche o par.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.12] to-[rgba(12,18,32,0.55)] p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.08em] text-emerald-400">Ana Clara</div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-foreground">O que eu acho</h4>
                <p className="leading-relaxed text-foreground/90">{narrative.anaHunch}</p>
              </div>

              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-foreground">Por que</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{narrative.reasoning}</p>
              </div>

              {isContextual && hypotheses.length > 0 ? (
                <div>
                  <h4 className="mb-1.5 text-sm font-semibold text-foreground">Hipoteses (com confianca)</h4>
                  <div className="flex flex-wrap gap-2">
                    {hypotheses.map((item) => (
                      <Badge
                        key={item.label}
                        variant={item.confidence >= 0.35 ? 'info' : 'outline'}
                        className={cn('px-3 py-1.5 text-[11px]', item.confidence >= 0.35 && 'border-primary/30 bg-primary/10 text-foreground')}
                      >
                        <strong>{Math.round(item.confidence * 100)}%</strong> &mdash; {item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {narrative.contextualQuestion ? (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-primary">Pergunta contextual</div>
                  <div className="text-sm leading-relaxed text-foreground">{narrative.contextualQuestion}</div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-foreground">O que preciso de voce</h4>
                <p className="leading-relaxed text-foreground/90">{narrative.needFromYou}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-[rgba(12,18,32,0.55)] p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-sky-400">Resolucao proposta</div>
            <div className="space-y-3 text-sm text-foreground">
              <div>{narrative.resolutionSummary}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{narrative.resolutionAlternatives}</div>

              <div className="space-y-3">
                {isStrong ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full justify-center rounded-xl border border-emerald-500/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                      onClick={onConfirm}
                      disabled={decisionPending}
                    >
                      {narrative.primaryActionLabel}
                    </Button>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          onClick={onReject}
                          disabled={decisionPending}
                        >
                          Rejeitar match
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-muted-foreground hover:text-foreground"
                          onClick={onDefer}
                          disabled={decisionPending}
                        >
                          Adiar
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}

                {isInfra ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full justify-center rounded-xl border border-amber-500/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                      onClick={onOpenConnections}
                      disabled={decisionPending}
                    >
                      {narrative.primaryActionLabel}
                    </Button>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-muted-foreground hover:text-foreground"
                        onClick={onDefer}
                        disabled={decisionPending}
                      >
                        Adiar ate reauth
                      </Button>
                    </div>
                  </>
                ) : null}

                {isContextual ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full justify-center rounded-xl border border-emerald-500/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                      onClick={onRequestContext ?? onConfirm}
                      disabled={decisionPending}
                    >
                      {narrative.primaryActionLabel}
                    </Button>

                    <div className="space-y-1.5">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                        Outras resolucoes
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {onMarkTransfer ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-sky-500/35 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                            onClick={() => {
                              setSelectedCounterpartId(transferCandidates[0]?.bankTransaction.id ?? null);
                              setTransferDialogOpen(true);
                            }}
                            disabled={decisionPending}
                          >
                            Marcar como transferencia interna
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={onViewWeakCandidates}
                          disabled={decisionPending}
                        >
                          Ver candidatos (fracos)
                        </Button>
                        {onIgnoreTransaction ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                            onClick={() => {
                              setIgnoreReason('');
                              setIgnoreDialogOpen(true);
                            }}
                            disabled={decisionPending}
                          >
                            Nao reconheco (ignorar)
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
                        onClick={onMarkUnreconciliable ?? onReject}
                        disabled={decisionPending}
                      >
                        Marcar como nao conciliavel agora
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Guardrails:</span> conciliar nao e pagar &bull; matching automatico so com criterio visivel &bull;
          confianca precisa ser visivel &bull; acoes sensiveis exigem confirmacao &bull; audit trail em toda decisao.
        </div>
      </div>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Marcar como transferencia interna</DialogTitle>
            <DialogDescription>
              Confirme qual movimento do outro lado corresponde a esta transferencia. Os dois ficam
              conciliados automaticamente e somem da inbox, sem mover nada no ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            {transferCandidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 bg-surface-elevated/20 p-3 text-muted-foreground">
                Nao encontrei na sua janela ativa outro lancamento com sinal oposto e mesmo valor
                dentro de 3 dias. Voce pode confirmar assim mesmo que a contraparte ainda vai chegar;
                esse lado ja fica marcado como transferencia e a outra ponta sera pareada quando
                aparecer.
              </div>
            ) : (
              <div className="space-y-2">
                {transferCandidates.map((candidate) => {
                  const label = accountLabelResolver(candidate.bankTransaction);
                  const selected = selectedCounterpartId === candidate.bankTransaction.id;
                  return (
                    <button
                      key={candidate.bankTransaction.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedCounterpartId(candidate.bankTransaction.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                        selected
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : 'border-border/50 hover:border-sky-500/40 hover:bg-sky-500/5',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Math.abs(candidate.bankTransaction.amount))}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatDate(candidate.bankTransaction.date)}
                          {candidate.dayDistance === 0
                            ? ' \u2022 mesmo dia'
                            : ` \u2022 ${candidate.dayDistance}d de diferenca`}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {candidate.bankTransaction.description}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{label}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {transferCandidates.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setSelectedCounterpartId(null)}
                disabled={selectedCounterpartId === null}
              >
                Nenhum desses (outra ponta ainda vai chegar)
              </Button>
            ) : (
              <div />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setTransferDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="rounded-xl border border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                onClick={() => {
                  onMarkTransfer?.(selectedCounterpartId);
                  setTransferDialogOpen(false);
                }}
                disabled={decisionPending}
              >
                {selectedCounterpartId ? 'Parear transferencia' : 'Marcar este lado como transferencia'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nao reconheco esse lancamento</DialogTitle>
            <DialogDescription>
              O caso e arquivado como nao reconhecido. A linha continua no banco para auditoria, mas
              some da inbox e dos KPIs operacionais. Use o campo abaixo para registrar o motivo (vai
              para o audit trail).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1 text-sm">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Motivo (opcional)
              </span>
              <textarea
                value={ignoreReason}
                onChange={(event) => setIgnoreReason(event.target.value)}
                rows={3}
                placeholder="ex: provavelmente estorno de uma compra antiga"
                className="min-h-[72px] rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => setIgnoreDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              onClick={() => {
                const reason = ignoreReason.trim();
                onIgnoreTransaction?.(reason.length > 0 ? reason : null);
                setIgnoreDialogOpen(false);
              }}
              disabled={decisionPending}
            >
              Confirmar como nao reconhecido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
