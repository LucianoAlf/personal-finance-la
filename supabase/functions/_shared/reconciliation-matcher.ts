export type SourceHealth = 'healthy' | 'stale';

export interface BankTransactionForMatch {
  amount: number;
  date: string;
  description: string;
  sourceHealth: SourceHealth;
}

export interface PayableRecord {
  id: string;
  amount: number;
  due_date: string;
  description: string;
}

export interface ScoreInput {
  bankTransaction: BankTransactionForMatch;
  payables: PayableRecord[];
  transactions: unknown[];
  accounts: unknown[];
}

export interface MatchCandidate {
  recordId: string;
  recordType: 'payable_bill';
  confidence: number;
  reasoning: {
    amountExact: boolean;
    dateWindow: boolean;
    descriptionAligned: boolean;
    sourceHealthPenalty: boolean;
  };
}

export interface ScoreResult {
  bestMatch: MatchCandidate | null;
  hypotheses: Array<{ label: string; confidence: number }>;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`).getTime();
  const db = new Date(`${b}T12:00:00Z`).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / (24 * 60 * 60 * 1000);
}

export type NormalizedBankMethod =
  | 'debit_auto'
  | 'purchase'
  | 'payment'
  | 'pix_sent'
  | 'pix_received'
  | 'transfer_sent'
  | 'transfer_received'
  | 'other';

export interface NormalizedBankDescription {
  original: string;
  core: string;
  method: NormalizedBankMethod;
  isPix: boolean;
  counterpart?: string;
}

// Ordem importa: prefixos mais específicos primeiro (ex.: "COMPRA NO DEBITO"
// antes de "COMPRA"). Métodos que carregam contraparte (PIX/TED) são tratados
// depois, com captura do nome do beneficiário.
const METHOD_PREFIXES: Array<{ pattern: RegExp; method: NormalizedBankMethod; hasCounterpart?: boolean }> = [
  { pattern: /^(debito automatico|deb\s*aut(om\.?)?\.?|debito\s*autom\.?)\b\s*/i, method: 'debit_auto' },
  { pattern: /^(compra\s+no\s+debito|compra\s+debito|compra\s+cartao|compra)\b\s*/i, method: 'purchase' },
  { pattern: /^(pagamento\s+cartao|pagamento|pagto|pag\.?)\b\s*/i, method: 'payment' },
  { pattern: /^(pix\s+(enviado|transferido|env)|pix\s+out)\b\s*/i, method: 'pix_sent', hasCounterpart: true },
  { pattern: /^(pix\s+(recebido|rec|in))\b\s*/i, method: 'pix_received', hasCounterpart: true },
  {
    pattern: /^(transferencia\s+enviada|transf\s+enviada|ted|doc)\b\s*/i,
    method: 'transfer_sent',
    hasCounterpart: true,
  },
  {
    pattern: /^(transferencia\s+recebida|transf\s+recebida)\b\s*/i,
    method: 'transfer_received',
    hasCounterpart: true,
  },
];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeBankDescription(input: string): NormalizedBankDescription {
  const original = input;
  const cleaned = collapseWhitespace(stripAccents(input).toLowerCase());

  for (const entry of METHOD_PREFIXES) {
    const match = cleaned.match(entry.pattern);
    if (!match) continue;
    const rest = collapseWhitespace(cleaned.slice(match[0].length));
    const isPix = entry.method === 'pix_sent' || entry.method === 'pix_received';
    return {
      original,
      core: rest,
      method: entry.method,
      isPix,
      counterpart: entry.hasCounterpart && rest.length > 0 ? rest : undefined,
    };
  }

  return {
    original,
    core: cleaned,
    method: 'other',
    isPix: false,
  };
}

const SHORT_TOKEN_THRESHOLD = 2;

function tokenize(value: string): Set<string> {
  return new Set(
    stripAccents(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > SHORT_TOKEN_THRESHOLD),
  );
}

/** Token overlap + substring boost over normalized forms. Handles BR banking prefixes. */
export function similarity(a: string, b: string): number {
  const normA = normalizeBankDescription(a);
  const normB = normalizeBankDescription(b);
  const coreA = normA.core;
  const coreB = normB.core;
  if (!coreA.length || !coreB.length) return 0;

  if (coreA === coreB) return 1;
  if (coreA.includes(coreB) || coreB.includes(coreA)) return 0.85;

  const tokensA = tokenize(coreA);
  const tokensB = tokenize(coreB);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let inter = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) inter++;
  }
  const union = tokensA.size + tokensB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export const applySourceHealthPenalty = (confidence: number, sourceHealth: SourceHealth) =>
  sourceHealth === 'stale' ? Math.min(confidence, 0.64) : confidence;

export function scoreReconciliationCandidates(input: ScoreInput): ScoreResult {
  const bankNorm = normalizeBankDescription(input.bankTransaction.description);

  const billMatches: MatchCandidate[] = input.payables.map((bill) => {
    const amountScore = Math.abs(Math.abs(input.bankTransaction.amount) - bill.amount) <= 0.1 ? 0.5 : 0;
    const dateScore = daysBetween(input.bankTransaction.date, bill.due_date) <= 7 ? 0.2 : 0;
    const descSim = similarity(input.bankTransaction.description, bill.description);
    const descriptionScore = descSim >= 0.6 ? 0.25 : 0;

    let rawConfidence = amountScore + dateScore + descriptionScore;

    // Heurística PIX: quando a descrição do banco é PIX enviado/recebido mas
    // nenhum vínculo textual com o bill é detectado, rebaixamos o match mesmo
    // que amount/data coincidam, porque PIX com valor redondo é extremamente
    // propenso a falso positivo (ex.: 320 para "Joao S" colidindo com Amil).
    if (bankNorm.isPix && descSim < 0.3) {
      rawConfidence = Math.min(rawConfidence, 0.5);
    }

    const confidence = applySourceHealthPenalty(rawConfidence, input.bankTransaction.sourceHealth);

    return {
      recordId: bill.id,
      recordType: 'payable_bill' as const,
      confidence,
      reasoning: {
        amountExact: amountScore > 0,
        dateWindow: dateScore > 0,
        descriptionAligned: descriptionScore > 0,
        sourceHealthPenalty: input.bankTransaction.sourceHealth === 'stale',
      },
    };
  });

  const sorted = [...billMatches].sort((a, b) => b.confidence - a.confidence);
  const bestMatch = sorted[0] ?? null;

  if (!bestMatch || bestMatch.confidence < 0.5) {
    // Reforço PIX/transferência: quando a origem sinaliza movimento entre
    // pessoas/contas (PIX/TED/DOC), puxa a hipótese de transferência para cima
    // e empurra "pagamento não lançado" para baixo.
    const transferLean =
      bankNorm.method === 'pix_sent' ||
      bankNorm.method === 'pix_received' ||
      bankNorm.method === 'transfer_sent' ||
      bankNorm.method === 'transfer_received';

    const hypotheses = transferLean
      ? [
          { label: 'transferência', confidence: 0.55 },
          { label: 'pagamento não lançado', confidence: 0.2 },
          { label: 'sem match ainda', confidence: 0.25 },
        ]
      : [
          { label: 'transferência', confidence: 0.38 },
          { label: 'pagamento não lançado', confidence: 0.27 },
          { label: 'sem match ainda', confidence: 0.35 },
        ];

    return {
      bestMatch: null,
      hypotheses,
    };
  }

  return { bestMatch, hypotheses: [] };
}
