import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import type { AccountsObservationAnomaly } from './accounts-diagnostic.ts';
import {
  buildSafeActionPreviewFromDiagnosticContext,
  continueAccountsDiagnosticConversation,
  createAccountsDiagnosticContextData,
  detectDirectAccountsDiagnosticPrompt,
  detectDiagnosticInterestReply,
  detectDiagnosticTopicShift,
  detectDiagnosticDeferReply,
  extractResolvedSafeActionFieldsFromDiagnosticReply,
  parseAccountsDiagnosticReply,
  selectDiagnosticTargetAnomaly,
  startAccountsDiagnosticConversation,
} from './accounts-diagnostic-conversations.ts';

const anomalies: AccountsObservationAnomaly[] = [
  {
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
  },
  {
    type: 'zeroed_bill',
    severity: 'S2',
    billId: 'bill-2',
    description: 'Netflix',
    providerName: 'Netflix',
    amount: 0,
    dueDate: '2026-04-10',
    status: 'pending',
    statusLabel: 'Pendente',
    diagnosticNote: "A conta 'Netflix' com vencimento em 10/04 esta com valor zerado.",
  },
  {
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
  },
  {
    type: 'zero_balance_account',
    severity: 'S5',
    accountId: 'account-1',
    billId: null,
    description: 'NuConta',
    providerName: null,
    amount: 0,
    dueDate: null,
    status: 'active',
    statusLabel: 'Ativa com saldo zerado',
    diagnosticNote: "A conta bancaria 'NuConta' esta com saldo zerado.",
  },
];

Deno.test('selectDiagnosticTargetAnomaly prioritizes highest severity when user does not choose', () => {
  const selected = selectDiagnosticTargetAnomaly(anomalies, null);
  assertEquals(selected?.type, 'overdue_without_settlement');
  assertEquals(selected?.description, 'Celular (1/12)');
});

Deno.test('selectDiagnosticTargetAnomaly respects explicit user choice by index and description', () => {
  assertEquals(selectDiagnosticTargetAnomaly(anomalies, 'fala da primeira')?.description, 'Celular (1/12)');
  assertEquals(selectDiagnosticTargetAnomaly(anomalies, 'me explica a da netflix')?.description, 'Netflix');
});

Deno.test('detects direct prompt, diagnostic interest, defer and topic shift replies', () => {
  assertEquals(detectDirectAccountsDiagnosticPrompt('o que tem de errado nessas contas?'), true);
  assertEquals(detectDirectAccountsDiagnosticPrompt('me explica isso'), true);
  assertEquals(detectDirectAccountsDiagnosticPrompt('quero pagar a luz'), false);

  assertEquals(detectDiagnosticInterestReply('sim'), true);
  assertEquals(detectDiagnosticInterestReply('investiga'), true);
  assertEquals(detectDiagnosticInterestReply('pode ver'), true);

  assertEquals(detectDiagnosticDeferReply('depois vejo'), true);
  assertEquals(detectDiagnosticDeferReply('deixa isso'), true);

  assertEquals(detectDiagnosticTopicShift('quanto eu tenho na nubank?'), true);
  assertEquals(detectDiagnosticTopicShift('qual a fatura do nubank esse mes?'), true);
  assertEquals(detectDiagnosticTopicShift('quanto gastei no ifood esse mes?'), true);
  assertEquals(detectDiagnosticTopicShift('quais contas vencem hoje?'), true);
  assertEquals(detectDiagnosticTopicShift('sim, mas me mostra a fatura do nubank'), true);
  assertEquals(detectDiagnosticTopicShift('foi paga. qual meu saldo?'), true);
  assertEquals(detectDiagnosticTopicShift('sim e me mostra a fatura do nubank'), true);
  assertEquals(detectDiagnosticTopicShift('nao, me mostra meu saldo'), true);
  assertEquals(detectDiagnosticTopicShift('depois vejo, qual meu saldo?'), true);
  assertEquals(detectDiagnosticTopicShift('nao, olha minha agenda amanha'), true);
  assertEquals(detectDiagnosticTopicShift('nao'), false);
  assertEquals(detectDiagnosticTopicShift('depois vejo'), false);
  assertEquals(detectDiagnosticTopicShift('foi paga'), false);
});

Deno.test('parseAccountsDiagnosticReply interprets the minimum supported answer shapes', () => {
  assertEquals(parseAccountsDiagnosticReply('foi paga', 'overdue_without_settlement').kind, 'paid_already');
  assertEquals(parseAccountsDiagnosticReply('ainda está em aberto', 'overdue_without_settlement').kind, 'still_open');
  assertEquals(parseAccountsDiagnosticReply('valor não informado', 'zeroed_bill').kind, 'value_missing');
  assertEquals(parseAccountsDiagnosticReply('já foi quitada', 'zeroed_bill').kind, 'already_settled');
  assertEquals(parseAccountsDiagnosticReply('essa conta nao se aplica mais', 'zeroed_bill').kind, 'no_longer_applies');
  assertEquals(parseAccountsDiagnosticReply('essa conta não se aplica mais', 'zeroed_bill').kind, 'no_longer_applies');
  assertEquals(parseAccountsDiagnosticReply('cancela só essa ocorrência', 'zeroed_bill').kind, 'current_occurrence_only');
  assertEquals(parseAccountsDiagnosticReply('somente essa ocorrencia', 'zeroed_bill').kind, 'current_occurrence_only');
  assertEquals(parseAccountsDiagnosticReply('não sei', 'zeroed_bill').kind, 'not_sure');
  assertEquals(parseAccountsDiagnosticReply('depois vejo', 'zeroed_bill').kind, 'defer');
});

Deno.test('startAccountsDiagnosticConversation opens one focused question from passive listing', () => {
  const result = startAccountsDiagnosticConversation({
    anomalies,
    source: 'passive_listing',
  });

  assertEquals(result.nextState, 'DIAGNOSIS_ACTIVE');
  assertEquals(result.contextData.anomalyType, 'overdue_without_settlement');
  assertStringIncludes(result.message, 'Notei um ponto que merece atencao:');
  assertStringIncludes(result.message, 'O que aconteceu nesse caso?');
});

Deno.test('startAccountsDiagnosticConversation keeps the paid inconsistent hypothesis line natural and shorter', () => {
  const result = startAccountsDiagnosticConversation({
    anomalies: [anomalies[2]],
    source: 'direct_diagnostic_prompt',
  });

  assertStringIncludes(
    result.message,
    'Pode ser que tenha ficado faltando a data, o valor pago, ou os dois.',
  );
});

Deno.test('continueAccountsDiagnosticConversation concludes, clarifies, defers and abandons cleanly', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: anomalies[0],
    source: 'explicit_health_check',
  });

  const concluded = continueAccountsDiagnosticConversation(activeContext, 'foi paga');
  assertEquals(concluded.nextState, 'DIAGNOSIS_CONCLUDED');
  assertStringIncludes(concluded.message, 'essa conta ja foi paga e o sistema ficou sem esse registro');
  assertEquals(concluded.contextData.diagnosticConclusion?.kind, 'paid_already');
  assertStringIncludes(
    concluded.contextData.diagnosticConclusion?.text ?? '',
    'essa conta ja foi paga e o sistema ficou sem esse registro',
  );

  const clarifying = continueAccountsDiagnosticConversation(activeContext, 'acho que sim');
  assertEquals(clarifying.nextState, 'DIAGNOSIS_CLARIFYING');
  assertStringIncludes(clarifying.message, 'So pra eu ler isso direito');

  const deferred = continueAccountsDiagnosticConversation(activeContext, 'depois vejo');
  assertEquals(deferred.nextState, 'DIAGNOSIS_DEFERRED');
  assertStringIncludes(deferred.message, 'vale revisar depois');

  const abandoned = continueAccountsDiagnosticConversation(activeContext, 'quanto eu tenho na nubank?');
  assertEquals(abandoned.nextState, 'IDLE');
  assertEquals(abandoned.message, '');
});

Deno.test('buildSafeActionPreviewFromDiagnosticContext bridges a concluded diagnosis into a safe action preview', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: anomalies[0],
    source: 'explicit_health_check',
  });
  const concluded = continueAccountsDiagnosticConversation(activeContext, 'foi paga');

  const preview = buildSafeActionPreviewFromDiagnosticContext({
    context: concluded.contextData,
    resolvedFields: { paid_at: '2026-04-11', paid_amount: 99 },
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview?.actionType, 'mark_as_paid');
  assertEquals(preview?.targetType, 'payable_bill');
  assertEquals(preview?.targetId, 'bill-1');
  assertEquals(preview?.before, { status: 'pending', paid_amount: null, paid_at: null });
  assertEquals(preview?.after, { status: 'paid', paid_amount: 99, paid_at: '2026-04-11' });
  assertStringIncludes(preview?.confirmationPrompt ?? '', 'Confirma? (sim/nao)');
});

Deno.test('concluded diagnosis opens a safe action preview when the reply already resolves the required fields', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: anomalies[0],
    source: 'explicit_health_check',
  });
  const userReply = 'foi paga em 11/04 por 99';
  const concluded = continueAccountsDiagnosticConversation(activeContext, userReply);
  const resolvedFields = extractResolvedSafeActionFieldsFromDiagnosticReply({
    context: concluded.contextData,
    userText: userReply,
    now: '2026-04-11T10:00:00.000Z',
  });

  assertEquals(resolvedFields, {
    paid_at: '2026-04-11',
    paid_amount: 99,
  });

  const preview = buildSafeActionPreviewFromDiagnosticContext({
    context: concluded.contextData,
    resolvedFields,
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview?.actionType, 'mark_as_paid');
  assertEquals(preview?.targetId, 'bill-1');
  assertStringIncludes(preview?.confirmationPrompt ?? '', 'Confirma? (sim/nao)');
});

Deno.test('buildSafeActionPreviewFromDiagnosticContext creates a deactivate_account preview from a concluded zero-balance account diagnosis', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: anomalies[3],
    source: 'explicit_health_check',
  });
  const concluded = continueAccountsDiagnosticConversation(activeContext, 'inativa');

  const preview = buildSafeActionPreviewFromDiagnosticContext({
    context: concluded.contextData,
    resolvedFields: {},
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview?.actionType, 'deactivate_account');
  assertEquals(preview?.targetType, 'account');
  assertEquals(preview?.targetId, 'account-1');
  assertEquals(preview?.before, { is_active: true });
  assertEquals(preview?.after, { is_active: false });
  assertStringIncludes(preview?.confirmationPrompt ?? '', '• is_active: Sim -> Nao');
});

Deno.test('buildSafeActionPreviewFromDiagnosticContext distinguishes recurring current occurrence from stop future recurrence', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: {
      ...anomalies[1],
      description: 'Netflix recorrente',
    },
    source: 'direct_diagnostic_prompt',
  });
  const concluded = continueAccountsDiagnosticConversation(activeContext, 'cancela só essa ocorrência');

  const preview = buildSafeActionPreviewFromDiagnosticContext({
    context: concluded.contextData,
    resolvedFields: {
      is_recurring: true,
      next_occurrence_date: '2026-05-10',
    },
    previewExpiresAt: '2026-04-11T18:00:00.000Z',
  });

  assertEquals(preview?.actionType, 'cancel_current_occurrence');
  assertEquals(preview?.targetType, 'payable_bill');
  assertEquals(preview?.before, { status: 'pending' });
  assertEquals(preview?.after, { status: 'cancelled' });
});

Deno.test('buildSafeActionPreviewFromDiagnosticContext returns null outside a concluded actionable state', () => {
  const activeContext = createAccountsDiagnosticContextData({
    anomaly: anomalies[1],
    source: 'explicit_health_check',
  });

  assertEquals(
    buildSafeActionPreviewFromDiagnosticContext({
      context: activeContext,
      resolvedFields: { amount: 120 },
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
    }),
    null,
  );

  const deferred = continueAccountsDiagnosticConversation(activeContext, 'depois vejo');
  assertEquals(
    buildSafeActionPreviewFromDiagnosticContext({
      context: deferred.contextData,
      resolvedFields: { amount: 120 },
      previewExpiresAt: '2026-04-11T18:00:00.000Z',
    }),
    null,
  );
});
