export type AccountsDiagnosticSeverity = 'S1' | 'S2' | 'S3' | 'S5';

export type AccountsDiagnosticAnomalyType =
  | 'overdue_without_settlement'
  | 'zeroed_bill'
  | 'paid_inconsistent'
  | 'zero_balance_account';

export interface AccountsObservationPresentation {
  type: AccountsDiagnosticAnomalyType;
  severity: AccountsDiagnosticSeverity;
  billId: string | null;
  accountId?: string | null;
  description: string;
  providerName: string | null;
  amount: number | null;
  dueDate: string | null;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled' | 'active';
  statusLabel: string;
  diagnosticNote: string;
}

function formatCurrency(value: number | null): string {
  if (value == null) return 'não informado';
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${formatted}`;
}

function renderAmountLine(anomaly: AccountsObservationPresentation): string {
  if (anomaly.type === 'zero_balance_account') {
    if (anomaly.amount == null) return '💰 Saldo atual: não informado';
    return `💰 Saldo atual: ${formatCurrency(anomaly.amount)}`;
  }

  if (anomaly.type === 'zeroed_bill') {
    if (anomaly.amount == null) return '💰 Valor: não informado';
    return `💰 Valor atual: ${formatCurrency(anomaly.amount)}`;
  }

  return `💰 ${formatCurrency(anomaly.amount)}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function templateAccountsObservationBlock(anomaly: AccountsObservationPresentation): string {
  if (anomaly.type === 'zero_balance_account') {
    return [
      `🏦 *${anomaly.description}*`,
      renderAmountLine(anomaly),
      `📊 Status: ${anomaly.statusLabel}`,
      `💬 ${anomaly.diagnosticNote}`,
    ].join('\n');
  }

  const lines = [
    `⚠️ *${anomaly.description}*`,
    renderAmountLine(anomaly),
  ];

  if (anomaly.dueDate) {
    lines.push(`📅 Vencimento: ${formatDate(anomaly.dueDate)}`);
  }

  lines.push(`📊 Status: ${anomaly.statusLabel}`);
  lines.push(`💬 ${anomaly.diagnosticNote}`);

  return lines.join('\n');
}

function mapSeverityBucket(severity: AccountsDiagnosticSeverity): 'urgent' | 'important' | 'later' {
  if (severity === 'S1') return 'urgent';
  if (severity === 'S5') return 'later';
  return 'important';
}

function renderSeverityHeading(bucket: 'urgent' | 'important' | 'later', count: number): string {
  if (bucket === 'urgent') return `🔴 *Mais urgentes* (${count})`;
  if (bucket === 'important') return `🟠 *Importantes* (${count})`;
  return `🟡 *Pode revisar depois* (${count})`;
}

export function templatePassiveAccountsDiagnosticAppendix(
  anomalies: AccountsObservationPresentation[],
): string {
  if (anomalies.length === 0) return '';

  const visible = anomalies.slice(0, 3);
  const hiddenCount = anomalies.length - visible.length;

  let message = '\n\n---\nNotei alguns pontos que merecem atenção:\n\n';
  message += visible.map(templateAccountsObservationBlock).join('\n\n');

  if (hiddenCount > 0) {
    message += `\n\n`;
    message += `e mais ${hiddenCount} itens que merecem atencao. Diga 'analisa minhas contas' para ver tudo.`;
  }

  return message;
}

export function templateAccountsHealthCheckReport(
  anomalies: AccountsObservationPresentation[],
): string {
  if (anomalies.length === 0) {
    return `🩺 *Checkup das contas*\n\nNao notei anomalias nas suas contas agora.`;
  }

  const groups = new Map<'urgent' | 'important' | 'later', AccountsObservationPresentation[]>();

  for (const anomaly of anomalies) {
    const bucket = mapSeverityBucket(anomaly.severity);
    const current = groups.get(bucket) ?? [];
    current.push(anomaly);
    groups.set(bucket, current);
  }

  const sections: string[] = ['🩺 *Checkup das contas*', '', 'Encontrei alguns pontos que merecem atenção:'];

  for (const bucket of ['urgent', 'important', 'later'] as const) {
    const items = groups.get(bucket);
    if (!items?.length) continue;

    sections.push('');
    sections.push(renderSeverityHeading(bucket, items.length));
    sections.push('');
    sections.push(items.map(templateAccountsObservationBlock).join('\n\n'));
  }

  return sections.join('\n');
}

export function templateAccountsDiagnosticInvitation(): string {
  return [
    'Notei alguns pontos que merecem atencao.',
    '',
    'Se quiser, eu posso te ajudar a entender o que pode estar acontecendo na mais urgente.',
  ].join('\n');
}

export function templateAccountsDiagnosticQuestion(
  anomaly: AccountsObservationPresentation,
  copy: {
    hypothesisLine: string;
    questionLine: string;
  },
): string {
  return [
    'Notei um ponto que merece atencao:',
    '',
    templateAccountsObservationBlock(anomaly),
    '',
    'Minha leitura aqui:',
    copy.hypothesisLine,
    '',
    copy.questionLine,
  ].join('\n');
}

export function templateAccountsDiagnosticClarifyingQuestion(question: string): string {
  return [
    'Entendi. So pra eu ler isso direito:',
    '',
    question,
  ].join('\n');
}

export function templateAccountsDiagnosticConclusion(conclusion: string): string {
  return [
    'Entendi.',
    '',
    'Entao a leitura mais provavel aqui e:',
    conclusion,
  ].join('\n');
}

export function templateAccountsDiagnosticDefer(): string {
  return [
    'Perfeito.',
    '',
    'Deixo isso sinalizado aqui como um ponto que vale revisar depois.',
  ].join('\n');
}

export interface AccountsSafeActionPreviewTemplateInput {
  title: string;
  changes: string[];
  effectSummary: string;
}

function joinTemplateSections(sections: string[]): string {
  return sections.join('\n');
}

export function templateAccountsSafeActionPreview(
  input: AccountsSafeActionPreviewTemplateInput,
): string {
  return joinTemplateSections([
    'Notei um ajuste seguro que eu posso fazer:',
    '',
    input.title,
    '',
    ...input.changes,
    '',
    `Efeito esperado: ${input.effectSummary}`,
    '',
    'Confirma? (sim/nao)',
  ]);
}

export function templateAccountsSafeActionSuccess(
  appliedChanges: string[],
  effectLines: string[],
): string {
  return joinTemplateSections([
    'Pronto.',
    '',
    'Ficou assim:',
    ...appliedChanges,
    '',
    'Efeito no sistema:',
    ...effectLines,
  ]);
}

export function templateAccountsSafeActionDecline(): string {
  return joinTemplateSections([
    'Perfeito.',
    '',
    'Nao alterei nada nessa conta.',
  ]);
}

export function templateAccountsSafeActionDefer(): string {
  return joinTemplateSections([
    'Perfeito.',
    '',
    'Nao alterei nada agora. Se quiser, a gente retoma isso depois.',
  ]);
}

export function templateAccountsSafeActionAbort(): string {
  return joinTemplateSections([
    'Parei essa acao antes de alterar o sistema, porque o contexto mudou ou o dado ja nao bate mais com o preview anterior.',
    '',
    'Se quiser, eu monto um preview novo.',
  ]);
}

export function templateAccountsSafeActionFailure(): string {
  return joinTemplateSections([
    'Nao consegui concluir essa alteracao com seguranca.',
    '',
    'Prefiro nao te dizer que deu certo antes de conferir o estado final.',
  ]);
}
