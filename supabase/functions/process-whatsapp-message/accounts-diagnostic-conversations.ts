import type {
  AccountsDiagnosticAnomalyType,
  AccountsObservationPresentation,
} from './accounts-response-templates.ts';
import {
  templateAccountsDiagnosticClarifyingQuestion,
  templateAccountsDiagnosticConclusion,
  templateAccountsDiagnosticDefer,
  templateAccountsDiagnosticQuestion,
} from './accounts-response-templates.ts';

export type AccountsDiagnosticSource =
  | 'passive_listing'
  | 'explicit_health_check'
  | 'direct_diagnostic_prompt';

export type AccountsDiagnosticState =
  | 'IDLE'
  | 'OBSERVATION_SHOWN'
  | 'DIAGNOSIS_INVITED'
  | 'DIAGNOSIS_ACTIVE'
  | 'DIAGNOSIS_CLARIFYING'
  | 'DIAGNOSIS_CONCLUDED'
  | 'DIAGNOSIS_DEFERRED';

export type AccountsDiagnosticReplyKind =
  | 'paid_already'
  | 'still_open'
  | 'value_missing'
  | 'already_settled'
  | 'no_longer_applies'
  | 'missing_payment_date'
  | 'missing_paid_amount'
  | 'missing_both'
  | 'account_still_active'
  | 'account_inactive'
  | 'not_sure'
  | 'defer'
  | 'unknown';

export interface AccountsDiagnosticContextData {
  step: 'accounts_diagnostic';
  diagnosisState: AccountsDiagnosticState;
  anomalyType: AccountsDiagnosticAnomalyType;
  billId?: string | null;
  accountId?: string | null;
  questionKey: string;
  hypothesisOptions: string[];
  surfacedAt: string;
  source: AccountsDiagnosticSource;
  anomaly: AccountsObservationPresentation;
  availableAnomalies?: AccountsObservationPresentation[];
}

export interface AccountsDiagnosticTransition {
  message: string;
  nextState: AccountsDiagnosticState;
  contextData: AccountsDiagnosticContextData;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getQuestionKey(anomalyType: AccountsDiagnosticAnomalyType): string {
  switch (anomalyType) {
    case 'overdue_without_settlement':
      return 'overdue_primary_question';
    case 'zeroed_bill':
      return 'zeroed_bill_primary_question';
    case 'paid_inconsistent':
      return 'paid_inconsistent_primary_question';
    case 'zero_balance_account':
      return 'zero_balance_account_primary_question';
  }
}

function getHypothesisOptions(anomalyType: AccountsDiagnosticAnomalyType): string[] {
  switch (anomalyType) {
    case 'overdue_without_settlement':
      return ['paid_already', 'still_open', 'not_sure'];
    case 'zeroed_bill':
      return ['value_missing', 'already_settled', 'no_longer_applies', 'not_sure'];
    case 'paid_inconsistent':
      return ['missing_payment_date', 'missing_paid_amount', 'missing_both', 'not_sure'];
    case 'zero_balance_account':
      return ['account_still_active', 'account_inactive', 'not_sure'];
  }
}

function getQuestionCopy(anomaly: AccountsObservationPresentation): {
  hypothesisLine: string;
  questionLine: string;
  clarifyingLine: string;
} {
  switch (anomaly.type) {
    case 'overdue_without_settlement':
      return {
        hypothesisLine: 'Pode ser que ela ja tenha sido paga e so faltou registrar, ou que ainda esteja em aberto.',
        questionLine: 'O que aconteceu nesse caso?',
        clarifyingLine: 'ela foi paga e faltou registrar, ou ainda esta pendente?',
      };
    case 'zeroed_bill':
      return {
        hypothesisLine: 'Pode ser que o valor ainda nao tenha sido informado, ou que essa conta ja tenha sido quitada.',
        questionLine: 'O que aconteceu nesse caso?',
        clarifyingLine: 'o valor ainda nao foi informado, ou essa conta ja foi quitada?',
      };
    case 'paid_inconsistent':
      return {
        hypothesisLine: 'Pode ser que tenha ficado faltando a data, o valor pago, ou os dois.',
        questionLine: 'O que ficou faltando nesse registro?',
        clarifyingLine: 'faltou a data do pagamento, o valor pago, ou os dois?',
      };
    case 'zero_balance_account':
      return {
        hypothesisLine: 'Pode ser que essa conta ainda esteja ativa e o saldo so esteja desatualizado, ou que ela ja nao esteja em uso.',
        questionLine: 'Essa conta ainda esta ativa no seu dia a dia?',
        clarifyingLine: 'essa conta ainda esta ativa, ou ja ficou parada?',
      };
  }
}

function getConclusion(kind: AccountsDiagnosticReplyKind): string {
  switch (kind) {
    case 'paid_already':
      return 'essa conta ja foi paga e o sistema ficou sem esse registro.';
    case 'still_open':
      return 'essa conta provavelmente continua em aberto segundo o que voce me contou.';
    case 'value_missing':
      return 'essa conta parece estar ativa, mas o valor ainda nao foi informado no sistema.';
    case 'already_settled':
      return 'essa conta provavelmente ja foi quitada, e o sistema ainda nao reflete isso por completo.';
    case 'no_longer_applies':
      return 'essa conta parece nao fazer mais sentido no seu fluxo atual.';
    case 'missing_payment_date':
      return 'o pagamento parece registrado, mas a data ficou faltando.';
    case 'missing_paid_amount':
      return 'o pagamento parece registrado, mas o valor pago ficou faltando.';
    case 'missing_both':
      return 'o pagamento parece ter acontecido, mas ficaram faltando a data e o valor pago.';
    case 'account_still_active':
      return 'essa conta parece seguir ativa, e o saldo zerado pode ser um retrato desatualizado.';
    case 'account_inactive':
      return 'essa conta parece estar inativa de proposito, entao o saldo zerado pode nao ser um problema real.';
    case 'not_sure':
      return 'ainda nao tenho sinal suficiente para fechar a leitura com seguranca.';
    default:
      return 'a leitura ainda ficou inconclusiva.';
  }
}

function getSeverityWeight(severity: AccountsObservationPresentation['severity']): number {
  switch (severity) {
    case 'S1':
      return 1;
    case 'S2':
      return 2;
    case 'S3':
      return 3;
    case 'S5':
      return 5;
  }
}

function getDueWeight(dueDate: string | null): number {
  return dueDate ? new Date(`${dueDate}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

export function detectDirectAccountsDiagnosticPrompt(text: string): boolean {
  const command = normalize(text);
  return (
    command.includes('o que tem de errado nessas contas') ||
    command.includes('qual parece ser o problema') ||
    command.includes('me explica isso') ||
    command.includes('me explica essas contas') ||
    command.includes('me explica essas inconsistencias')
  );
}

export function detectDiagnosticInterestReply(text: string): boolean {
  const command = normalize(text);
  return ['sim', 'investiga', 'pode ver', 'o que houve', 'qual delas', 'vamos ver', 'fala da mais urgente']
    .some((pattern) => command.includes(pattern));
}

export function detectDiagnosticDeferReply(text: string): boolean {
  const command = normalize(text);
  return ['depois vejo', 'deixa isso', 'deixa', 'vejo depois'].some((pattern) => command.includes(pattern));
}

export function detectDiagnosticTopicShift(text: string): boolean {
  const command = normalize(text);
  if (detectDiagnosticInterestReply(command) || detectDiagnosticDeferReply(command)) return false;
  if (command.includes('foi paga') || command.includes('em aberto') || command.includes('quitada')) return false;
  return (
    command.includes('quanto eu tenho') ||
    command.includes('saldo') ||
    command.includes('gastei') ||
    command.includes('recebi') ||
    command.includes('pagar ')
  );
}

export function parseAccountsDiagnosticReply(
  text: string,
  anomalyType: AccountsDiagnosticAnomalyType,
): { kind: AccountsDiagnosticReplyKind } {
  const command = normalize(text);

  if (detectDiagnosticDeferReply(command)) return { kind: 'defer' };
  if (command === 'nao sei' || command === 'não sei') return { kind: 'not_sure' };

  switch (anomalyType) {
    case 'overdue_without_settlement':
      if (command.includes('foi paga') || command.includes('ja foi paga') || command.includes('quitada')) {
        return { kind: 'paid_already' };
      }
      if (command.includes('em aberto') || command.includes('pendente')) {
        return { kind: 'still_open' };
      }
      return { kind: 'unknown' };
    case 'zeroed_bill':
      if (command.includes('valor nao informado') || command.includes('valor não informado')) {
        return { kind: 'value_missing' };
      }
      if (command.includes('ja foi quitada') || command.includes('foi quitada') || command.includes('ja foi paga')) {
        return { kind: 'already_settled' };
      }
      if (command.includes('nao vale mais') || command.includes('não vale mais') || command.includes('nao existe mais')) {
        return { kind: 'no_longer_applies' };
      }
      return { kind: 'unknown' };
    case 'paid_inconsistent':
      if (command.includes('os dois')) return { kind: 'missing_both' };
      if (command.includes('data')) return { kind: 'missing_payment_date' };
      if (command.includes('valor')) return { kind: 'missing_paid_amount' };
      return { kind: 'unknown' };
    case 'zero_balance_account':
      if (command.includes('ainda ativa') || command.includes('continua ativa') || command.includes('sim')) {
        return { kind: 'account_still_active' };
      }
      if (command.includes('nao uso mais') || command.includes('não uso mais') || command.includes('inativa')) {
        return { kind: 'account_inactive' };
      }
      return { kind: 'unknown' };
  }
}

export function selectDiagnosticTargetAnomaly(
  anomalies: AccountsObservationPresentation[],
  userText: string | null,
): AccountsObservationPresentation | null {
  if (anomalies.length === 0) return null;

  const ordered = [...anomalies].sort((left, right) => {
    const severityDiff = getSeverityWeight(left.severity) - getSeverityWeight(right.severity);
    if (severityDiff !== 0) return severityDiff;
    return getDueWeight(left.dueDate) - getDueWeight(right.dueDate);
  });

  if (!userText) return ordered[0];

  const command = normalize(userText);
  if (command.includes('primeira') || command.includes('mais urgente')) return ordered[0];

  const byDescription = ordered.find((anomaly) => normalize(anomaly.description).includes(command.replace('me explica a da ', '')));
  if (byDescription) return byDescription;

  return ordered[0];
}

export function detectDiagnosticTargetSelectionReply(
  anomalies: AccountsObservationPresentation[],
  userText: string,
): boolean {
  const command = normalize(userText);
  if (command.includes('primeira') || command.includes('mais urgente')) return true;

  return anomalies.some((anomaly) => {
    const description = normalize(anomaly.description);
    return description.includes(command.replace('me explica a da ', '').trim());
  });
}

export function createAccountsDiagnosticContextData(params: {
  anomaly: AccountsObservationPresentation;
  source: AccountsDiagnosticSource;
  state?: AccountsDiagnosticState;
  availableAnomalies?: AccountsObservationPresentation[];
}): AccountsDiagnosticContextData {
  return {
    step: 'accounts_diagnostic',
    diagnosisState: params.state ?? 'DIAGNOSIS_ACTIVE',
    anomalyType: params.anomaly.type,
    billId: params.anomaly.billId,
    accountId: params.anomaly.accountId ?? null,
    questionKey: getQuestionKey(params.anomaly.type),
    hypothesisOptions: getHypothesisOptions(params.anomaly.type),
    surfacedAt: new Date().toISOString(),
    source: params.source,
    anomaly: params.anomaly,
    availableAnomalies: params.availableAnomalies,
  };
}

export function createAccountsDiagnosticInvitationContext(params: {
  anomalies: AccountsObservationPresentation[];
  source: AccountsDiagnosticSource;
}): AccountsDiagnosticContextData | null {
  const anomaly = selectDiagnosticTargetAnomaly(params.anomalies, null);
  if (!anomaly) return null;

  return createAccountsDiagnosticContextData({
    anomaly,
    source: params.source,
    state: 'DIAGNOSIS_INVITED',
    availableAnomalies: params.anomalies,
  });
}

export function startAccountsDiagnosticConversation(params: {
  anomalies: AccountsObservationPresentation[];
  source: AccountsDiagnosticSource;
  userText?: string | null;
}): AccountsDiagnosticTransition {
  const anomaly = selectDiagnosticTargetAnomaly(params.anomalies, params.userText ?? null);
  if (!anomaly) {
    const empty = createAccountsDiagnosticContextData({
      anomaly: {
        type: 'overdue_without_settlement',
        severity: 'S1',
        billId: null,
        description: 'Conta',
        providerName: null,
        amount: null,
        dueDate: null,
        status: 'pending',
        statusLabel: 'Sem diagnostico',
        diagnosticNote: 'Nao encontrei uma anomalia valida para investigar agora.',
      },
      source: params.source,
      state: 'IDLE',
      availableAnomalies: [],
    });
    return {
      message: 'Nao encontrei um ponto diagnostico claro para investigar agora.',
      nextState: 'IDLE',
      contextData: empty,
    };
  }

  const copy = getQuestionCopy(anomaly);
  const contextData = createAccountsDiagnosticContextData({
    anomaly,
    source: params.source,
    state: 'DIAGNOSIS_ACTIVE',
    availableAnomalies: params.anomalies,
  });

  return {
    message: templateAccountsDiagnosticQuestion(anomaly, copy),
    nextState: 'DIAGNOSIS_ACTIVE',
    contextData,
  };
}

export function continueAccountsDiagnosticConversation(
  context: AccountsDiagnosticContextData,
  userText: string,
): AccountsDiagnosticTransition {
  if (detectDiagnosticDeferReply(userText)) {
    return {
      message: templateAccountsDiagnosticDefer(),
      nextState: 'DIAGNOSIS_DEFERRED',
      contextData: { ...context, diagnosisState: 'DIAGNOSIS_DEFERRED' },
    };
  }

  if (detectDiagnosticTopicShift(userText)) {
    return {
      message: '',
      nextState: 'IDLE',
      contextData: { ...context, diagnosisState: 'IDLE' },
    };
  }

  const parsed = parseAccountsDiagnosticReply(userText, context.anomalyType);
  if (parsed.kind === 'unknown') {
    return {
      message: templateAccountsDiagnosticClarifyingQuestion(getQuestionCopy(context.anomaly).clarifyingLine),
      nextState: 'DIAGNOSIS_CLARIFYING',
      contextData: { ...context, diagnosisState: 'DIAGNOSIS_CLARIFYING' },
    };
  }

  return {
    message: templateAccountsDiagnosticConclusion(getConclusion(parsed.kind)),
    nextState: parsed.kind === 'defer' ? 'DIAGNOSIS_DEFERRED' : 'DIAGNOSIS_CONCLUDED',
    contextData: {
      ...context,
      diagnosisState: parsed.kind === 'defer' ? 'DIAGNOSIS_DEFERRED' : 'DIAGNOSIS_CONCLUDED',
    },
  };
}
