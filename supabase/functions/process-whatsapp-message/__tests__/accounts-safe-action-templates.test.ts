import { describe, expect, it } from 'vitest';

import {
  templateAccountsSafeActionAbort,
  templateAccountsSafeActionDecline,
  templateAccountsSafeActionDefer,
  templateAccountsSafeActionFailure,
  templateAccountsSafeActionPreview,
  templateAccountsSafeActionSuccess,
} from '../accounts-response-templates.ts';

describe('accounts safe action templates', () => {
  it('renders the exact preview for reschedule_due_date', () => {
    const msg = templateAccountsSafeActionPreview({
      title: "Vou reagendar o vencimento da conta 'Celular (1/12)'.",
      changes: ['• due_date: 05/04 -> 20/04'],
      effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    });

    expect(msg).toBe([
      'Notei um ajuste seguro que eu posso fazer:',
      '',
      "Vou reagendar o vencimento da conta 'Celular (1/12)'.",
      '',
      '• due_date: 05/04 -> 20/04',
      '',
      'Efeito esperado: Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
      '',
      'Confirma? (sim/nao)',
    ].join('\n'));
  });

  it('renders the exact preview for mark_as_paid', () => {
    const msg = templateAccountsSafeActionPreview({
      title: "Vou marcar a conta 'Celular (1/12)' como paga.",
      changes: [
        '• status: pending -> paid',
        '• paid_amount: nao informado -> R$ 99,00',
        '• paid_at: nao informado -> 11/04',
      ],
      effectSummary: 'Essa conta sai da lista de pendentes e passa a constar como quitada.',
    });

    expect(msg).toBe([
      'Notei um ajuste seguro que eu posso fazer:',
      '',
      "Vou marcar a conta 'Celular (1/12)' como paga.",
      '',
      '• status: pending -> paid',
      '• paid_amount: nao informado -> R$ 99,00',
      '• paid_at: nao informado -> 11/04',
      '',
      'Efeito esperado: Essa conta sai da lista de pendentes e passa a constar como quitada.',
      '',
      'Confirma? (sim/nao)',
    ].join('\n'));
  });

  it('renders the exact preview for update_paid_record', () => {
    const msg = templateAccountsSafeActionPreview({
      title: "Vou completar o registro da conta 'Academia'.",
      changes: [
        '• paid_amount: nao informado -> R$ 120,00',
        '• paid_at: nao informado -> 10/04',
      ],
      effectSummary: 'O registro pago continua pago, mas agora fica completo.',
    });

    expect(msg).toBe([
      'Notei um ajuste seguro que eu posso fazer:',
      '',
      "Vou completar o registro da conta 'Academia'.",
      '',
      '• paid_amount: nao informado -> R$ 120,00',
      '• paid_at: nao informado -> 10/04',
      '',
      'Efeito esperado: O registro pago continua pago, mas agora fica completo.',
      '',
      'Confirma? (sim/nao)',
    ].join('\n'));
  });

  it('renders the exact preview for deactivate_account', () => {
    const msg = templateAccountsSafeActionPreview({
      title: "Vou desativar a conta 'NuConta'.",
      changes: ['• is_active: true -> false'],
      effectSummary:
        'Ela deixa de aparecer nas listas de contas ativas, sai das leituras de saldo diagnostico de contas ativas, e o historico continua preservado.',
    });

    expect(msg).toBe([
      'Notei um ajuste seguro que eu posso fazer:',
      '',
      "Vou desativar a conta 'NuConta'.",
      '',
      '• is_active: true -> false',
      '',
      'Efeito esperado: Ela deixa de aparecer nas listas de contas ativas, sai das leituras de saldo diagnostico de contas ativas, e o historico continua preservado.',
      '',
      'Confirma? (sim/nao)',
    ].join('\n'));
  });

  it('renders success, decline, defer, abort, and failure variants', () => {
    expect(templateAccountsSafeActionSuccess(
      ['• due_date: 05/04 -> 20/04'],
      ['• ela volta a vencer em 20/04'],
    )).toBe([
      'Pronto.',
      '',
      'Ficou assim:',
      '• due_date: 05/04 -> 20/04',
      '',
      'Efeito no sistema:',
      '• ela volta a vencer em 20/04',
    ].join('\n'));
    expect(templateAccountsSafeActionDecline()).toBe([
      'Perfeito.',
      '',
      'Nao alterei nada nessa conta.',
    ].join('\n'));
    expect(templateAccountsSafeActionDefer()).toBe([
      'Perfeito.',
      '',
      'Nao alterei nada agora. Se quiser, a gente retoma isso depois.',
    ].join('\n'));
    expect(templateAccountsSafeActionAbort()).toBe([
      'Parei essa acao antes de alterar o sistema, porque o contexto mudou ou o dado ja nao bate mais com o preview anterior.',
      '',
      'Se quiser, eu monto um preview novo.',
    ].join('\n'));
    expect(templateAccountsSafeActionFailure()).toBe([
      'Nao consegui concluir essa alteracao com seguranca.',
      '',
      'Prefiro nao te dizer que deu certo antes de conferir o estado final.',
    ].join('\n'));
  });
});
