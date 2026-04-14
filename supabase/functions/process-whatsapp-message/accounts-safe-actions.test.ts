import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  buildPendingAccountsSafeAction,
  buildSafeActionPreviewFromDiagnosis,
  getSafeActionEligibility,
  isExpiredSafeActionPreview,
  parseSafeActionConfirmation,
} from './accounts-safe-actions.ts';

const overdue = {
  type: 'overdue_without_settlement',
  severity: 'S1',
  billId: 'bill-1',
  description: 'Celular (1/12)',
  providerName: null,
  amount: 99,
  dueDate: '2026-04-05',
  status: 'pending',
  statusLabel: 'Pendente',
  diagnosticNote: "A conta 'Celular (1/12)' venceu em 05/04 e ainda nao tem pagamento registrado.",
} as const;

const zeroedBill = {
  type: 'zeroed_bill',
  severity: 'S2',
  billId: 'bill-2',
  description: 'Internet Casa 7 Link',
  providerName: null,
  amount: 0,
  dueDate: '2026-04-25',
  status: 'pending',
  statusLabel: 'Pendente',
  diagnosticNote: "A conta 'Internet Casa 7 Link' com vencimento em 25/04 esta com valor zerado.",
} as const;

const paidInconsistent = {
  type: 'paid_inconsistent',
  severity: 'S3',
  billId: 'bill-3',
  description: 'Plano de saude',
  providerName: null,
  amount: 320,
  dueDate: '2026-04-09',
  status: 'paid',
  statusLabel: 'Paga',
  diagnosticNote: "A conta 'Plano de saude' esta marcada como paga, mas o registro esta incompleto.",
} as const;

const zeroBalanceAccount = {
  type: 'zero_balance_account',
  severity: 'S5',
  billId: null,
  accountId: 'account-1',
  description: 'NuConta',
  providerName: null,
  amount: 0,
  dueDate: null,
  status: 'active',
  statusLabel: 'Saldo zerado',
  diagnosticNote: "A conta bancaria 'NuConta' esta com saldo zerado.",
} as const;

Deno.test('getSafeActionEligibility returns exactly one coherent action for each supported conclusion', () => {
  const cases = [
    {
      anomaly: overdue,
      diagnosticConclusion: { kind: 'paid_already' },
      resolvedFields: { paid_at: '2026-04-11', paid_amount: 99 },
      expected: { eligible: true, actionType: 'mark_as_paid' },
    },
    {
      anomaly: overdue,
      diagnosticConclusion: { kind: 'still_open' },
      resolvedFields: { new_due_date: '2026-04-20' },
      expected: { eligible: true, actionType: 'reschedule_due_date' },
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'value_missing' },
      resolvedFields: { amount: 120 },
      expected: { eligible: true, actionType: 'update_amount' },
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'already_settled' },
      resolvedFields: { paid_at: '2026-04-10', paid_amount: 120 },
      expected: { eligible: true, actionType: 'mark_as_paid' },
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'no_longer_applies' },
      resolvedFields: { is_recurring: false },
      expected: { eligible: true, actionType: 'cancel_one_off_bill' },
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'no_longer_applies' },
      resolvedFields: { is_recurring: true },
      expected: { eligible: true, actionType: 'disable_recurrence' },
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'current_occurrence_only' },
      resolvedFields: { is_recurring: true },
      expected: { eligible: true, actionType: 'cancel_current_occurrence' },
    },
    {
      anomaly: paidInconsistent,
      diagnosticConclusion: { kind: 'missing_paid_amount' },
      resolvedFields: { paid_amount: 320 },
      expected: { eligible: true, actionType: 'update_paid_amount' },
    },
    {
      anomaly: paidInconsistent,
      diagnosticConclusion: { kind: 'missing_payment_date' },
      resolvedFields: { paid_at: '2026-04-10' },
      expected: { eligible: true, actionType: 'update_paid_at' },
    },
    {
      anomaly: paidInconsistent,
      diagnosticConclusion: { kind: 'missing_both' },
      resolvedFields: { paid_amount: 320, paid_at: '2026-04-10' },
      expected: { eligible: true, actionType: 'update_paid_record' },
    },
    {
      anomaly: zeroBalanceAccount,
      diagnosticConclusion: { kind: 'account_still_active' },
      resolvedFields: { current_balance: 5221 },
      expected: { eligible: true, actionType: 'adjust_account_balance' },
    },
    {
      anomaly: zeroBalanceAccount,
      diagnosticConclusion: { kind: 'account_inactive' },
      resolvedFields: {},
      expected: { eligible: true, actionType: 'deactivate_account' },
    },
  ] as const;

  for (const testCase of cases) {
    assertEquals(
      getSafeActionEligibility(testCase),
      testCase.expected,
    );
  }
});

Deno.test('getSafeActionEligibility returns missing_required_fields when the chosen action is not fully resolved', () => {
  const cases = [
    {
      anomaly: overdue,
      diagnosticConclusion: { kind: 'paid_already' },
      resolvedFields: { paid_at: '2026-04-11' },
    },
    {
      anomaly: overdue,
      diagnosticConclusion: { kind: 'still_open' },
      resolvedFields: {},
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'value_missing' },
      resolvedFields: {},
    },
    {
      anomaly: zeroedBill,
      diagnosticConclusion: { kind: 'already_settled' },
      resolvedFields: { paid_amount: 120 },
    },
    {
      anomaly: paidInconsistent,
      diagnosticConclusion: { kind: 'missing_both' },
      resolvedFields: { paid_amount: 320 },
    },
    {
      anomaly: zeroBalanceAccount,
      diagnosticConclusion: { kind: 'account_still_active' },
      resolvedFields: {},
    },
  ] as const;

  for (const testCase of cases) {
    assertEquals(
      getSafeActionEligibility(testCase),
      { eligible: false, reason: 'missing_required_fields' },
    );
  }
});

Deno.test('getSafeActionEligibility fails closed for unconcluded, unsupported, and unknown targets', () => {
  assertEquals(
    getSafeActionEligibility({
      anomaly: overdue,
      diagnosticConclusion: { kind: 'not_sure' },
      resolvedFields: {},
    }),
    { eligible: false, reason: 'diagnosis_not_concluded' },
  );

  assertEquals(
    getSafeActionEligibility({
      anomaly: overdue,
      diagnosticConclusion: { kind: 'value_missing' },
      resolvedFields: { amount: 99 },
    }),
    { eligible: false, reason: 'unsupported_action_for_conclusion' },
  );

  assertEquals(
    getSafeActionEligibility({
      anomaly: { ...overdue, billId: null },
      diagnosticConclusion: { kind: 'paid_already' },
      resolvedFields: { paid_at: '2026-04-11', paid_amount: 99 },
    }),
    { eligible: false, reason: 'target_not_confidently_identified' },
  );

  assertEquals(
    getSafeActionEligibility({
      anomaly: { ...zeroBalanceAccount, accountId: null },
      diagnosticConclusion: { kind: 'account_inactive' },
      resolvedFields: {},
    }),
    { eligible: false, reason: 'target_not_confidently_identified' },
  );
});

Deno.test('buildSafeActionPreviewFromDiagnosis creates field-accurate payloads for supported actions', () => {
  const previewExpiresAt = '2026-04-11T18:00:00.000Z';

  const cases = [
    {
      params: {
        anomaly: overdue,
        diagnosticConclusion: {
          kind: 'paid_already',
          text: 'essa conta ja foi paga e o sistema ficou sem esse registro.',
        },
        diagnosticSource: 'explicit_health_check' as const,
        resolvedFields: { paid_at: '2026-04-11', paid_amount: 99 },
        previewExpiresAt,
      },
      expected: {
        actionType: 'mark_as_paid',
        targetType: 'payable_bill',
        targetId: 'bill-1',
        before: { status: 'pending', paid_amount: null, paid_at: null },
        after: { status: 'paid', paid_amount: 99, paid_at: '2026-04-11' },
        renderedLines: [
          '• status: Pendente -> Paga',
          '• paid_amount: vazio -> R$ 99,00',
          '• paid_at: vazio -> 11/04',
        ],
      },
    },
    {
      params: {
        anomaly: overdue,
        diagnosticConclusion: {
          kind: 'still_open',
          text: 'essa conta provavelmente continua em aberto segundo o que voce me contou.',
        },
        diagnosticSource: 'explicit_health_check' as const,
        resolvedFields: { new_due_date: '2026-04-20' },
        previewExpiresAt,
      },
      expected: {
        actionType: 'reschedule_due_date',
        targetType: 'payable_bill',
        targetId: 'bill-1',
        before: { due_date: '2026-04-05' },
        after: { due_date: '2026-04-20' },
        renderedLines: ['• due_date: 05/04 -> 20/04'],
      },
    },
    {
      params: {
        anomaly: zeroedBill,
        diagnosticConclusion: {
          kind: 'value_missing',
          text: 'essa conta parece estar ativa, mas o valor ainda nao foi informado no sistema.',
        },
        diagnosticSource: 'explicit_health_check' as const,
        resolvedFields: { amount: 120 },
        previewExpiresAt,
      },
      expected: {
        actionType: 'update_amount',
        targetType: 'payable_bill',
        targetId: 'bill-2',
        before: { amount: 0 },
        after: { amount: 120 },
        renderedLines: ['• amount: R$ 0,00 -> R$ 120,00'],
      },
    },
    {
      params: {
        anomaly: zeroedBill,
        diagnosticConclusion: {
          kind: 'no_longer_applies',
          text: 'essa conta parece nao fazer mais sentido no seu fluxo atual.',
        },
        diagnosticSource: 'explicit_health_check' as const,
        resolvedFields: { is_recurring: false },
        previewExpiresAt,
      },
      expected: {
        actionType: 'cancel_one_off_bill',
        targetType: 'payable_bill',
        targetId: 'bill-2',
        before: { status: 'pending' },
        after: { status: 'cancelled' },
        renderedLines: ['• status: Pendente -> Cancelada'],
      },
    },
    {
      params: {
        anomaly: zeroedBill,
        diagnosticConclusion: {
          kind: 'no_longer_applies',
          text: 'essa conta parece nao fazer mais sentido no seu fluxo atual.',
        },
        diagnosticSource: 'explicit_health_check' as const,
        resolvedFields: { is_recurring: true, next_occurrence_date: '2026-05-25' },
        previewExpiresAt,
      },
      expected: {
        actionType: 'disable_recurrence',
        targetType: 'payable_bill',
        targetId: 'bill-2',
        before: { is_recurring: true, next_occurrence_date: '2026-05-25' },
        after: { is_recurring: false, next_occurrence_date: null },
        renderedLines: [
          '• is_recurring: Sim -> Nao',
          '• next_occurrence_date: 25/05 -> vazio',
        ],
      },
    },
    {
      params: {
        anomaly: paidInconsistent,
        diagnosticConclusion: {
          kind: 'missing_paid_amount',
          text: 'o pagamento parece registrado, mas o valor pago ficou faltando.',
        },
        diagnosticSource: 'direct_diagnostic_prompt' as const,
        resolvedFields: { paid_amount: 320 },
        previewExpiresAt,
      },
      expected: {
        actionType: 'update_paid_amount',
        targetType: 'payable_bill',
        targetId: 'bill-3',
        before: { paid_amount: null },
        after: { paid_amount: 320 },
        renderedLines: ['• paid_amount: vazio -> R$ 320,00'],
      },
    },
    {
      params: {
        anomaly: paidInconsistent,
        diagnosticConclusion: {
          kind: 'missing_payment_date',
          text: 'o pagamento parece registrado, mas a data ficou faltando.',
        },
        diagnosticSource: 'direct_diagnostic_prompt' as const,
        resolvedFields: { paid_at: '2026-04-10' },
        previewExpiresAt,
      },
      expected: {
        actionType: 'update_paid_at',
        targetType: 'payable_bill',
        targetId: 'bill-3',
        before: { paid_at: null },
        after: { paid_at: '2026-04-10' },
        renderedLines: ['• paid_at: vazio -> 10/04'],
      },
    },
    {
      params: {
        anomaly: paidInconsistent,
        diagnosticConclusion: {
          kind: 'missing_both',
          text: 'o pagamento parece ter acontecido, mas ficaram faltando a data e o valor pago.',
        },
        diagnosticSource: 'direct_diagnostic_prompt' as const,
        resolvedFields: { paid_amount: 320, paid_at: '2026-04-10' },
        previewExpiresAt,
      },
      expected: {
        actionType: 'update_paid_record',
        targetType: 'payable_bill',
        targetId: 'bill-3',
        before: { paid_amount: null, paid_at: null },
        after: { paid_amount: 320, paid_at: '2026-04-10' },
        renderedLines: [
          '• paid_amount: vazio -> R$ 320,00',
          '• paid_at: vazio -> 10/04',
        ],
      },
    },
    {
      params: {
        anomaly: zeroBalanceAccount,
        diagnosticConclusion: {
          kind: 'account_still_active',
          text: 'essa conta parece seguir ativa, e o saldo zerado pode ser um retrato desatualizado.',
        },
        diagnosticSource: 'passive_listing' as const,
        resolvedFields: { current_balance: 5221 },
        previewExpiresAt,
      },
      expected: {
        actionType: 'adjust_account_balance',
        targetType: 'account',
        targetId: 'account-1',
        before: { current_balance: 0 },
        after: { current_balance: 5221 },
        renderedLines: ['• current_balance: R$ 0,00 -> R$ 5.221,00'],
      },
    },
  ] as const;

  for (const testCase of cases) {
    const preview = buildSafeActionPreviewFromDiagnosis(testCase.params);

    assertEquals(preview?.actionType, testCase.expected.actionType);
    assertEquals(preview?.targetType, testCase.expected.targetType);
    assertEquals(preview?.targetId, testCase.expected.targetId);
    assertEquals(preview?.before, testCase.expected.before);
    assertEquals(preview?.after, testCase.expected.after);
    assertEquals(preview?.previewExpiresAt, previewExpiresAt);
    assertEquals(preview?.diagnosticBasis.source, testCase.params.diagnosticSource);
    assertEquals(preview?.confirmationPrompt.includes('Confirma? (sim/nao)'), true);
    for (const renderedLine of testCase.expected.renderedLines) {
      assertStringIncludes(preview?.confirmationPrompt ?? '', renderedLine);
    }
  }
});

Deno.test('buildSafeActionPreviewFromDiagnosis fails closed for disable_recurrence when next occurrence is unknown', () => {
  const preview = buildSafeActionPreviewFromDiagnosis({
    anomaly: zeroedBill,
    diagnosticConclusion: {
      kind: 'no_longer_applies',
      text: 'essa conta parece nao fazer mais sentido no seu fluxo atual.',
    },
    diagnosticSource: 'explicit_health_check',
    resolvedFields: { is_recurring: true },
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview, null);
});

Deno.test('buildSafeActionPreviewFromDiagnosis keeps recurring bill actions on payable_bill while separating current-only from future-stop semantics', () => {
  const disablePreview = buildSafeActionPreviewFromDiagnosis({
    anomaly: zeroedBill,
    diagnosticConclusion: {
      kind: 'no_longer_applies',
      text: 'essa conta parece nao fazer mais sentido no seu fluxo atual.',
    },
    diagnosticSource: 'explicit_health_check',
    resolvedFields: { is_recurring: true, next_occurrence_date: '2026-05-25' },
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });
  const currentOnlyPreview = buildSafeActionPreviewFromDiagnosis({
    anomaly: zeroedBill,
    diagnosticConclusion: {
      kind: 'current_occurrence_only',
      text: 'essa ocorrencia atual nao se aplica mais, mas as proximas devem continuar.',
    },
    diagnosticSource: 'explicit_health_check',
    resolvedFields: { is_recurring: true, next_occurrence_date: '2026-05-25' },
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(disablePreview?.actionType, 'disable_recurrence');
  assertEquals(disablePreview?.targetType, 'payable_bill');
  assertEquals(currentOnlyPreview?.actionType, 'cancel_current_occurrence');
  assertEquals(currentOnlyPreview?.targetType, 'payable_bill');
  assertEquals(currentOnlyPreview?.before, { status: 'pending' });
  assertEquals(currentOnlyPreview?.after, { status: 'cancelled' });
  assertStringIncludes(currentOnlyPreview?.confirmationPrompt ?? '', '• status: Pendente -> Cancelada');
});

Deno.test('buildSafeActionPreviewFromDiagnosis renders deactivate_account preview values in user-facing language', () => {
  const preview = buildSafeActionPreviewFromDiagnosis({
    anomaly: zeroBalanceAccount,
    diagnosticConclusion: {
      kind: 'account_inactive',
      text: 'essa conta parece estar inativa de proposito, entao o saldo zerado pode nao ser um problema real.',
    },
    diagnosticSource: 'explicit_health_check',
    resolvedFields: {},
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview?.actionType, 'deactivate_account');
  assertStringIncludes(preview?.confirmationPrompt ?? '', '• is_active: Sim -> Nao');
});

Deno.test('buildSafeActionPreviewFromDiagnosis returns null when the diagnosis is not actionable', () => {
  assertEquals(
    buildSafeActionPreviewFromDiagnosis({
      anomaly: overdue,
      diagnosticConclusion: {
        kind: 'paid_already',
        text: 'essa conta ja foi paga e o sistema ficou sem esse registro.',
      },
      diagnosticSource: 'explicit_health_check',
      resolvedFields: { paid_amount: 99 },
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
    }),
    null,
  );

  assertEquals(
    buildSafeActionPreviewFromDiagnosis({
      anomaly: zeroedBill,
      diagnosticConclusion: {
        kind: 'not_sure',
        text: 'ainda nao tenho sinal suficiente para fechar a leitura com seguranca.',
      },
      diagnosticSource: 'explicit_health_check',
      resolvedFields: { amount: 120 },
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
    }),
    null,
  );
});

Deno.test('buildPendingAccountsSafeAction captures field-accurate before and after without confirmation fields', () => {
  const pending = buildPendingAccountsSafeAction({
    anomaly: overdue,
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05', status: 'pending' },
    after: { due_date: '2026-04-20' },
    effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    diagnosticBasis: {
      conclusionKey: 'still_open',
      conclusionText: 'essa conta continua em aberto segundo o usuario',
      source: 'explicit_health_check',
    },
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)' de 05/04 para 20/04. Confirma? (sim/nao)",
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(pending.actionType, 'reschedule_due_date');
  assertEquals(pending.before.due_date, '2026-04-05');
  assertEquals(pending.after.due_date, '2026-04-20');
  assertEquals(typeof pending.idempotencyKey, 'string');
  assertEquals(pending.confirmationSource, undefined);
  assertEquals(pending.confirmationText, undefined);
  assertEquals(pending.confirmedAt, undefined);
});

Deno.test('buildPendingAccountsSafeAction snapshots before, after, and diagnostic basis', () => {
  const before = { due_date: '2026-04-05', status: 'pending' };
  const after = { due_date: '2026-04-20' };
  const diagnosticBasis = {
    conclusionKey: 'still_open',
    conclusionText: 'essa conta continua em aberto segundo o usuario',
    source: 'explicit_health_check' as const,
  };

  const pending = buildPendingAccountsSafeAction({
    anomaly: overdue,
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before,
    after,
    effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    diagnosticBasis,
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)' de 05/04 para 20/04. Confirma? (sim/nao)",
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  before.due_date = '2099-01-01';
  after.due_date = '2099-02-01';
  diagnosticBasis.conclusionText = 'mutado depois';

  assertEquals(pending.before.due_date, '2026-04-05');
  assertEquals(pending.after.due_date, '2026-04-20');
  assertEquals(pending.diagnosticBasis.conclusionText, 'essa conta continua em aberto segundo o usuario');
});

Deno.test('parseSafeActionConfirmation separates explicit yes, defer, decline, and ambiguity', () => {
  assertEquals(parseSafeActionConfirmation('sim').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('confirmo').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('sim, confirmo').kind, 'confirm');
  assertEquals(parseSafeActionConfirmation('depois vejo').kind, 'defer');
  assertEquals(parseSafeActionConfirmation('nao').kind, 'decline');
  assertEquals(parseSafeActionConfirmation('ok, pode fazer').kind, 'ambiguous');
  assertEquals(parseSafeActionConfirmation('acho que sim').kind, 'ambiguous');
});

Deno.test('isExpiredSafeActionPreview expires by time', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T19:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: true,
      sameContext: true,
    }),
    true,
  );
});

Deno.test('isExpiredSafeActionPreview expires when the before snapshot no longer matches', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T17:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: false,
      sameContext: true,
    }),
    true,
  );
});

Deno.test('isExpiredSafeActionPreview expires when context has shifted', () => {
  assertEquals(
    isExpiredSafeActionPreview({
      now: '2026-04-11T17:00:00.000Z',
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
      beforeSnapshotStillMatches: true,
      sameContext: false,
    }),
    true,
  );
});
