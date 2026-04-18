import type { Account } from '@/types/accounts';
import type { PayableBill } from '@/types/payable-bills.types';
import type { BankTransactionRow, ReconciliationCaseRow } from '@/types/reconciliation';

export type CaseNarrativeMode = 'strong_match' | 'contextual_decision' | 'infra_attention';

export interface CaseNarrative {
  mode: CaseNarrativeMode;
  title: string;
  headerSubtitle: string;
  bankSideType: string | null;
  anaHunch: string;
  reasoning: string;
  contextualQuestion: string | null;
  needFromYou: string;
  resolutionSummary: string;
  resolutionAlternatives: string;
  primaryActionLabel: string;
}

export interface BankDescriptionClassification {
  label: string;
  bankSideType: string;
  kind: 'pix' | 'transfer' | 'debit' | 'boleto' | 'card' | 'withdrawal' | 'generic';
}

/**
 * Classify a raw bank description into a human operator-friendly label, so the
 * workspace no longer shows "Unmatched bank transaction" for 2500 cases and can
 * ask a divergence-aware question (PIX vs TED vs débito vs boleto, etc.).
 */
export function classifyBankDescription(
  description: string | null | undefined,
): BankDescriptionClassification {
  const normalized = (description ?? '').toLowerCase();

  if (/pix\s*(enviado|pago|saida|sa\u00edda)|pix\s+para/.test(normalized)) {
    return { label: 'PIX enviado', bankSideType: 'transfer\u00eancia instant\u00e2nea (PIX)', kind: 'pix' };
  }
  if (/pix\s*(recebido|entrada)/.test(normalized)) {
    return { label: 'PIX recebido', bankSideType: 'transfer\u00eancia instant\u00e2nea (PIX)', kind: 'pix' };
  }
  if (/pix/.test(normalized)) {
    return { label: 'Movimento PIX', bankSideType: 'transfer\u00eancia instant\u00e2nea (PIX)', kind: 'pix' };
  }
  if (/\bted\b|\bdoc\b|transfer[eê]ncia/.test(normalized)) {
    return { label: 'Transfer\u00eancia banc\u00e1ria', bankSideType: 'transfer\u00eancia banc\u00e1ria', kind: 'transfer' };
  }
  if (/debito automatico|deb\.? automatico|d[ée]bito autom[aá]tico/.test(normalized)) {
    return { label: 'D\u00e9bito autom\u00e1tico', bankSideType: 'd\u00e9bito autom\u00e1tico', kind: 'debit' };
  }
  if (/boleto|cobran[cç]a/.test(normalized)) {
    return { label: 'Pagamento de boleto', bankSideType: 'boleto banc\u00e1rio', kind: 'boleto' };
  }
  if (/fatura|cart[aã]o/.test(normalized)) {
    return { label: 'Pagamento de fatura', bankSideType: 'pagamento de fatura', kind: 'card' };
  }
  if (/saque|atm/.test(normalized)) {
    return { label: 'Saque', bankSideType: 'saque em dinheiro', kind: 'withdrawal' };
  }

  return { label: 'Movimento banc\u00e1rio', bankSideType: 'movimento banc\u00e1rio', kind: 'generic' };
}

export interface CaseNarrativeInput {
  caseRow: ReconciliationCaseRow;
  bankTransaction: BankTransactionRow | null;
  matchedPayableBill: PayableBill | null;
  matchedAccount: Account | null;
  formatCurrency: (value: number) => string;
  formatDate: (value: string) => string;
  /**
   * Pre-resolved human-friendly account label. When provided, the narrative
   * will use it verbatim instead of the raw `bank_transaction.account_name`
   * field (which may contain Pluggy design codenames like "ultraviolet-black").
   * Pass the output of `resolveDisplayAccountLabel` or an account resolver
   * from the component boundary to keep the narrative source-agnostic.
   */
  displayAccountLabel?: string | null;
}

export function buildCaseNarrative(input: CaseNarrativeInput): CaseNarrative {
  const {
    caseRow,
    bankTransaction,
    matchedPayableBill,
    matchedAccount,
    formatCurrency,
    formatDate,
    displayAccountLabel,
  } = input;
  const accountLabel =
    displayAccountLabel ??
    bankTransaction?.account_name ??
    matchedAccount?.name ??
    'Conta n\u00e3o mapeada';
  const bankDescription = classifyBankDescription(bankTransaction?.description ?? bankTransaction?.raw_description);
  const bankAmount = Math.abs(Number(bankTransaction?.amount) || 0);
  const systemAmount = Number(matchedPayableBill?.amount) || 0;
  const amountDelta = Math.abs(bankAmount - systemAmount);
  const confidencePct = `${Math.round(caseRow.confidence * 100)}%`;
  const bankDate = bankTransaction?.date ? formatDate(bankTransaction.date) : '\u2014';
  const systemDate = matchedPayableBill?.due_date ? formatDate(matchedPayableBill.due_date) : '\u2014';

  switch (caseRow.divergence_type) {
    case 'amount_mismatch':
      return {
        mode: 'contextual_decision',
        title: `Diverg\u00eancia de valor: ${accountLabel} \u00d7 ${matchedPayableBill?.description ?? 'conta ligada'}`,
        headerSubtitle: `confidence: ${caseRow.confidence.toFixed(2)} \u2022 valor banco \u2260 valor sistema`,
        bankSideType: bankDescription.bankSideType,
        anaHunch: `Encontrei um par candidato, mas os valores n\u00e3o batem: banco ${formatCurrency(bankAmount)} vs sistema ${formatCurrency(systemAmount)} (diferen\u00e7a ${formatCurrency(amountDelta)}).`,
        reasoning: 'Amount exato falhou na pontua\u00e7\u00e3o, por\u00e9m descri\u00e7\u00e3o e data se alinharam para sugerir que \u00e9 a mesma obriga\u00e7\u00e3o.',
        contextualQuestion: 'Foi pagamento parcial, juros/multa, ou o valor no sistema estava desatualizado?',
        needFromYou: 'Me diga qual valor \u00e9 o real: o lan\u00e7amento do sistema ser\u00e1 ajustado para bater com o banco.',
        resolutionSummary: 'Confirmar concilia\u00e7\u00e3o ajustando o valor do sistema para o valor efetivo do banco.',
        resolutionAlternatives: 'Alternativas: rejeitar match se forem obriga\u00e7\u00f5es diferentes \u2022 adiar at\u00e9 voc\u00ea checar o extrato oficial.',
        primaryActionLabel: 'Confirmar com valor do banco',
      };

    case 'date_mismatch':
      return {
        mode: 'contextual_decision',
        title: `Diverg\u00eancia de data: ${accountLabel} \u00d7 ${matchedPayableBill?.description ?? 'conta ligada'}`,
        headerSubtitle: `confidence: ${caseRow.confidence.toFixed(2)} \u2022 data banco \u2260 data sistema`,
        bankSideType: bankDescription.bankSideType,
        anaHunch: `Valor bate e a descri\u00e7\u00e3o alinha, mas a data fugiu da janela esperada: banco em ${bankDate} vs vencimento sistema em ${systemDate}.`,
        reasoning: 'Janela de data \u00e9 de 7 dias. Acima disso, pe\u00e7o confirma\u00e7\u00e3o humana para evitar trocar ciclos/meses diferentes.',
        contextualQuestion: 'Foi pagamento adiantado, atraso, ou \u00e9 referente a um ciclo anterior?',
        needFromYou: 'Confirma que \u00e9 o mesmo pagamento, s\u00f3 com data fora da janela.',
        resolutionSummary: 'Confirmar concilia\u00e7\u00e3o e ajustar a data de pagamento efetiva.',
        resolutionAlternatives: 'Alternativas: rejeitar match se for outro ciclo \u2022 adiar para confirmar com o banco.',
        primaryActionLabel: 'Confirmar como mesmo pagamento',
      };

    case 'possible_duplicate':
      return {
        mode: 'contextual_decision',
        title: `Poss\u00edvel duplicidade: ${accountLabel}`,
        headerSubtitle: `confidence: ${caseRow.confidence.toFixed(2)} \u2022 candidato duplicado detectado`,
        bankSideType: bankDescription.bankSideType,
        anaHunch: 'Existe outro movimento com valor e data pr\u00f3ximos. Pode ser cobran\u00e7a em duplicidade ou dois pagamentos leg\u00edtimos distintos.',
        reasoning: 'Heur\u00edstica viu mesmo valor absoluto, mesmo dia, mesma descri\u00e7\u00e3o-base, ou mesmo external_id com sinais conflitantes.',
        contextualQuestion: 'S\u00e3o dois pagamentos distintos, ou \u00e9 uma duplicidade real para estornar?',
        needFromYou: 'Escolher qual movimento concilia com o sistema e o que fazer com o outro.',
        resolutionSummary: 'Conciliar um dos movimentos e marcar o outro como duplicado para estorno.',
        resolutionAlternatives: 'Alternativas: manter ambos (se forem leg\u00edtimos) \u2022 adiar at\u00e9 confirmar com o banco.',
        primaryActionLabel: 'Escolher movimento real',
      };

    case 'unclassified_transaction':
      return {
        mode: 'contextual_decision',
        title: `Classifica\u00e7\u00e3o incerta: ${accountLabel} \u00d7 ${matchedPayableBill?.description ?? 'candidato fraco'}`,
        headerSubtitle: `confidence: ${caseRow.confidence.toFixed(2)} \u2022 descri\u00e7\u00e3o n\u00e3o alinhada`,
        bankSideType: bankDescription.bankSideType,
        anaHunch: 'Valor e data batem com um registro do sistema, mas a descri\u00e7\u00e3o do banco n\u00e3o se parece com o descritivo esperado.',
        reasoning: 'Score alto em valor e data, por\u00e9m baixo em descri\u00e7\u00e3o. Espero confirma\u00e7\u00e3o humana para n\u00e3o trocar credores.',
        contextualQuestion: 'Essa descri\u00e7\u00e3o no banco corresponde mesmo ao pagamento que o sistema registrou?',
        needFromYou: 'Confirmar se \u00e9 o mesmo credor/obriga\u00e7\u00e3o, s\u00f3 com descri\u00e7\u00e3o diferente.',
        resolutionSummary: 'Confirmar concilia\u00e7\u00e3o e aprender o padr\u00e3o de descri\u00e7\u00e3o para a pr\u00f3xima vez.',
        resolutionAlternatives: 'Alternativas: rejeitar e deixar sem match \u2022 classificar como outra categoria.',
        primaryActionLabel: 'Confirmar e aprender padr\u00e3o',
      };

    case 'pending_bill_paid_in_bank':
      return {
        mode: 'strong_match',
        title: `${accountLabel} \u00d7 ${matchedPayableBill?.description ?? 'conta a pagar'}`,
        headerSubtitle: `confidence: ${confidencePct} \u2022 auto-match forte`,
        bankSideType: bankDescription.bankSideType,
        anaHunch: `Este d\u00e9bito provavelmente corresponde \u00e0 conta "${matchedPayableBill?.description ?? 'registrada'}".`,
        reasoning: 'Valor compat\u00edvel + descri\u00e7\u00e3o alinhada + data pr\u00f3xima da janela esperada.',
        contextualQuestion: null,
        needFromYou: 'Confirmar se \u00e9 a mesma obriga\u00e7\u00e3o.',
        resolutionSummary: 'Conciliar a transa\u00e7\u00e3o banc\u00e1ria com a conta a pagar do sistema.',
        resolutionAlternatives: 'Conciliar \u2260 pagar; pagamento \u00e9 a\u00e7\u00e3o separada.',
        primaryActionLabel: 'Confirmar concilia\u00e7\u00e3o',
      };

    case 'stale_connection':
      return {
        mode: 'infra_attention',
        title: `Conex\u00e3o inst\u00e1vel: ${accountLabel}`,
        headerSubtitle: 'prioridade de infra \u2022 fonte stale',
        bankSideType: 'fonte banc\u00e1ria',
        anaHunch: 'A fonte banc\u00e1ria que origina esse movimento est\u00e1 desatualizada, ent\u00e3o minha confian\u00e7a cai independentemente do match.',
        reasoning: 'Fontes stale penalizam toda proposta de concilia\u00e7\u00e3o. Recupere a ingest\u00e3o antes de decidir o caso.',
        contextualQuestion: null,
        needFromYou: 'Reautenticar/atualizar a fonte banc\u00e1ria correspondente.',
        resolutionSummary: 'Restaurar a conex\u00e3o banc\u00e1ria antes de conciliar.',
        resolutionAlternatives: 'Alternativa: conciliar manualmente agora, aceitando o risco de dado antigo.',
        primaryActionLabel: 'Abrir conex\u00f5es',
      };

    case 'unmatched_bank_transaction':
    default: {
      const bankType = bankDescription.label;
      const question = (() => {
        switch (bankDescription.kind) {
          case 'pix':
            return 'Esse PIX foi pra pagar alguma conta do sistema, ou foi transfer\u00eancia para pessoa?';
          case 'transfer':
            return 'Essa transfer\u00eancia foi para quitar alguma obriga\u00e7\u00e3o registrada, ou foi repasse externo?';
          case 'debit':
            return 'Esse d\u00e9bito corresponde a alguma conta que voc\u00ea cadastra aqui, ou foi cobran\u00e7a recorrente fora do sistema?';
          case 'boleto':
            return 'Esse boleto corresponde a alguma conta cadastrada, ou \u00e9 pagamento pontual fora do sistema?';
          case 'card':
            return 'Essa fatura de cart\u00e3o j\u00e1 est\u00e1 registrada como conta a pagar, ou \u00e9 paga direto sem cadastro?';
          case 'withdrawal':
            return 'Esse saque foi para uso pessoal ou cobre alguma despesa espec\u00edfica do sistema?';
          default:
            return 'Esse movimento pertence a alguma obriga\u00e7\u00e3o cadastrada, ou \u00e9 despesa fora do sistema?';
        }
      })();

      return {
        mode: 'contextual_decision',
        title: `${accountLabel} \u2014 ${bankType} sem correspond\u00eancia`,
        headerSubtitle: 'confidence global: baixa \u2022 precisa contexto humano',
        bankSideType: bankDescription.bankSideType,
        anaHunch: `Esse ${bankType.toLowerCase()} sozinho n\u00e3o "gruda" em nenhuma conta a pagar com confian\u00e7a. Pode ser pagamento informal, transfer\u00eancia para terceiro, ou pagamento ainda n\u00e3o cadastrado.`,
        reasoning: 'Aus\u00eancia de candidato forte em payable_bills + descri\u00e7\u00e3o gen\u00e9rica. Movimentos desse tipo costumam ser amb\u00edguos sem regra de benefici\u00e1rio.',
        contextualQuestion: question,
        needFromYou: 'Uma confirma\u00e7\u00e3o de inten\u00e7\u00e3o. Com isso eu ajusto o pr\u00f3ximo passo: criar lan\u00e7amento, vincular a uma conta a pagar, ou marcar como transfer\u00eancia sem concilia\u00e7\u00e3o.',
        resolutionSummary: 'Tratar como "sem match" at\u00e9 voc\u00ea responder a pergunta acima.',
        resolutionAlternatives: 'Depois da resposta: registrar como despesa categorizada \u2022 vincular a payable existente \u2022 marcar como transfer\u00eancia pura.',
        primaryActionLabel: 'Responder e continuar',
      };
    }
  }
}
