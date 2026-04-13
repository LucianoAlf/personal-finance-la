import { describe, expect, it } from 'vitest';

import {
  templateAccountsHealthCheckReport,
  templateAccountsDiagnosticClarifyingQuestion,
  templateAccountsDiagnosticConclusion,
  templateAccountsDiagnosticDefer,
  templateAccountsDiagnosticInvitation,
  templateAccountsDiagnosticQuestion,
  templatePassiveAccountsDiagnosticAppendix,
} from '../accounts-response-templates.ts';

const anomalies = [
  {
    type: 'overdue_without_settlement' as const,
    severity: 'S1' as const,
    billId: 'bill-1',
    description: 'Aluguel',
    providerName: null,
    amount: 1500,
    dueDate: '2026-04-01',
    status: 'pending' as const,
    statusLabel: 'Pendente',
    diagnosticNote: "A conta 'Aluguel' venceu em 01/04 e ainda nao tem pagamento registrado.",
  },
  {
    type: 'zeroed_bill' as const,
    severity: 'S2' as const,
    billId: 'bill-2',
    description: 'Streaming',
    providerName: 'Netflix',
    amount: 0,
    dueDate: '2026-04-03',
    status: 'overdue' as const,
    statusLabel: 'Vencida',
    diagnosticNote: "A conta 'Streaming' (Netflix) com vencimento em 03/04 esta com valor zerado.",
  },
  {
    type: 'zeroed_bill' as const,
    severity: 'S2' as const,
    billId: 'bill-3',
    description: 'Celular',
    providerName: 'Vivo',
    amount: null,
    dueDate: '2026-04-04',
    status: 'pending' as const,
    statusLabel: 'Pendente',
    diagnosticNote: "A conta 'Celular' (Vivo) com vencimento em 04/04 esta com valor zerado.",
  },
  {
    type: 'zeroed_bill' as const,
    severity: 'S2' as const,
    billId: 'bill-4',
    description: 'Gas',
    providerName: 'Naturgy',
    amount: 0,
    dueDate: '2026-04-05',
    status: 'pending' as const,
    statusLabel: 'Pendente',
    diagnosticNote: "A conta 'Gas' (Naturgy) com vencimento em 05/04 esta com valor zerado.",
  },
];

describe('accounts-response-templates', () => {
  it('renders passive appendix in fixed semantic order and caps listing anomalies at 3', () => {
    const msg = templatePassiveAccountsDiagnosticAppendix(anomalies);

    expect(msg).toContain('Notei alguns pontos que merecem atenção:');
    expect(msg).toContain("e mais 1 itens que merecem atencao. Diga 'analisa minhas contas' para ver tudo.");
    expect(msg).toContain('⚠️ *Aluguel*');
    expect(msg).toContain('💰 R$ 1.500,00');
    expect(msg).toContain('💰 Valor atual: R$ 0,00');
    expect(msg).toContain('💰 Valor: não informado');
    expect(msg).toContain('📅 Vencimento: 01/04');
    expect(msg).toContain('📊 Status: Pendente');
    expect(msg).toContain("💬 A conta 'Aluguel' venceu em 01/04 e ainda nao tem pagamento registrado.");

    const titleIndex = msg.indexOf('⚠️ *Aluguel*');
    const amountIndex = msg.indexOf('💰 R$ 1.500,00');
    const dueDateIndex = msg.indexOf('📅 Vencimento: 01/04');
    const statusIndex = msg.indexOf('📊 Status: Pendente');
    const noteIndex = msg.indexOf("💬 A conta 'Aluguel' venceu em 01/04 e ainda nao tem pagamento registrado.");

    expect(amountIndex).toBeGreaterThan(titleIndex);
    expect(dueDateIndex).toBeGreaterThan(amountIndex);
    expect(statusIndex).toBeGreaterThan(dueDateIndex);
    expect(noteIndex).toBeGreaterThan(statusIndex);
    expect(msg).not.toContain('*Gas*');
  });

  it('renders explicit health check with all anomalies grouped by severity', () => {
    const msg = templateAccountsHealthCheckReport([
      ...anomalies,
      {
        type: 'paid_inconsistent' as const,
        severity: 'S3' as const,
        billId: 'bill-5',
        description: 'Plano de saude',
        providerName: null,
        amount: 320,
        dueDate: '2026-04-06',
        status: 'paid' as const,
        statusLabel: 'Paga',
        diagnosticNote: "A conta 'Plano de saude' esta marcada como paga, mas o registro esta incompleto.",
      },
      {
        type: 'zero_balance_account' as const,
        severity: 'S5' as const,
        billId: null,
        accountId: 'account-1',
        description: 'NuConta',
        providerName: null,
        amount: 0,
        dueDate: null,
        status: 'active' as const,
        statusLabel: 'Saldo zerado',
        diagnosticNote: "A conta bancaria 'NuConta' esta com saldo zerado.",
      },
    ]);

    expect(msg).toContain('🩺 *Checkup das contas*');
    expect(msg).toContain('Encontrei alguns pontos que merecem atenção:');
    expect(msg).toContain('🔴 *Mais urgentes* (1)');
    expect(msg).toContain('🟠 *Importantes* (4)');
    expect(msg).toContain('🟡 *Pode revisar depois* (1)');
    expect(msg).not.toContain('S1');
    expect(msg).not.toContain('S2');
    expect(msg).toContain('*Aluguel*');
    expect(msg).toContain('*Streaming*');
    expect(msg).toContain('*Celular*');
    expect(msg).toContain('*Gas*');
    expect(msg).toContain('*Plano de saude*');
    expect(msg).toContain('*NuConta*');
    expect(msg).not.toContain('e mais 1 itens');
  });

  it('freezes the approved passive appendix wording for the first anomaly block', () => {
    expect(templatePassiveAccountsDiagnosticAppendix(anomalies)).toContain(
      [
        'Notei alguns pontos que merecem atenção:',
        '',
        '⚠️ *Aluguel*',
        '💰 R$ 1.500,00',
        '📅 Vencimento: 01/04',
        '📊 Status: Pendente',
        "💬 A conta 'Aluguel' venceu em 01/04 e ainda nao tem pagamento registrado.",
      ].join('\n'),
    );
  });

  it('renders invitation, focused question, clarification, conclusion and defer templates', () => {
    expect(templateAccountsDiagnosticInvitation()).toContain(
      'Se quiser, eu posso te ajudar a entender o que pode estar acontecendo na mais urgente.',
    );

    expect(templateAccountsDiagnosticQuestion(anomalies[0], {
      hypothesisLine: 'Pode ser que ela ja tenha sido paga e so faltou registrar, ou que ainda esteja em aberto.',
      questionLine: 'O que aconteceu nesse caso?',
    })).toContain('Minha leitura aqui:');

    expect(templateAccountsDiagnosticClarifyingQuestion(
      'ela foi paga e faltou registrar, ou ainda esta pendente?',
    )).toContain('So pra eu ler isso direito:');

    expect(templateAccountsDiagnosticConclusion(
      'essa conta ja foi paga e o sistema ficou sem esse registro.',
    )).toContain('Entao a leitura mais provavel aqui e:');

    expect(templateAccountsDiagnosticDefer()).toContain(
      'Deixo isso sinalizado aqui como um ponto que vale revisar depois.',
    );
  });
});
