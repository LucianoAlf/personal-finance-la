/**
 * Canonical categorization — single backend path for WhatsApp, categorize-transaction, and Open Finance writers.
 *
 * ## Open Finance ingestion boundary
 * 1. Raw provider event (description, merchant, provider category code/label, amount, direction)
 * 2. `resolveCanonicalCategory()` in this module → `category_id` from `public.categories` (user + system rows)
 * 3. Optional tag suggestions from description / user profile (handled outside this file)
 * 4. Insert into `transactions` (or other ledger) with canonical `category_id`
 *
 * Static maps in `../shared/mappings.ts` are hints only; `public.categories` is the runtime source of truth.
 */

import {
  detectarCategoriaPorPalavraChave,
  LLM_TRANSACTION_CATEGORY_SLUG_TO_CANONICAL_NAME,
  NLP_CATEGORIA_MAP,
  OPEN_FINANCE_CATEGORY_LABEL_MAP,
} from '../shared/mappings.ts';

export type TransactionCategoryType = 'income' | 'expense';

export interface ResolveCanonicalCategoryInput {
  userId: string;
  transactionType: TransactionCategoryType;
  /** Free-text fragments (e.g. original command + description) for keyword heuristics */
  textSources?: string[];
  /** NLP / LLM slug, Open Finance label, or GPT display name */
  labelHint?: string;
  /** Optional amount for rules like água &lt; R$20 → Alimentação */
  amount?: number;
  /**
   * `payable_bill`: run conta-a-pagar regex rules on the first text source before global keywords.
   */
  context?: 'transaction' | 'payable_bill';
}

export type CanonicalResolutionPath =
  | 'payable_rule'
  | 'keyword'
  | 'label_map'
  | 'exact_user'
  | 'exact_system'
  | 'partial'
  | 'fallback';

export interface ResolveCanonicalCategoryResult {
  categoryId: string | null;
  categoryName: string;
  usedFallback: boolean;
  resolutionPath: CanonicalResolutionPath;
}

export function normalizeUserText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Map external labels (LLM slug, OF enum, English NLP tag) to a Portuguese canonical name candidate.
 * Unknown labels are returned trimmed so GPT-4 Portuguese names still resolve in the DB pass.
 */
export function mapLabelHintToCanonicalCategoryName(
  label: string,
  _type: TransactionCategoryType,
): string | null {
  const raw = label.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const norm = normalizeUserText(raw);

  const llm = LLM_TRANSACTION_CATEGORY_SLUG_TO_CANONICAL_NAME[lower];
  if (llm) return llm;

  const of =
    OPEN_FINANCE_CATEGORY_LABEL_MAP[lower] ||
    OPEN_FINANCE_CATEGORY_LABEL_MAP[norm] ||
    OPEN_FINANCE_CATEGORY_LABEL_MAP[lower.replace(/[\s-]+/g, '_')];
  if (of) return of;

  const nlp = NLP_CATEGORIA_MAP[lower] || NLP_CATEGORIA_MAP[norm];
  if (nlp) return nlp;

  return raw;
}

const PAYABLE_BILL_RULES: { regex: RegExp; categoria: string }[] = [
  { regex: /empr[ée]stimo|consignado/, categoria: 'Empréstimo' },
  {
    regex:
      /geladeira|fog[ãa]o|m[áa]quina de lavar|microondas|ar condicionado|tv|televis[ãa]o|freezer|lava.*lou[çc]a/,
    categoria: 'Eletrodomésticos',
  },
  {
    regex: /celular|iphone|smartphone|notebook|computador|tablet|ipad|macbook|pc|monitor/,
    categoria: 'Tecnologia',
  },
  {
    regex: /financiamento|parcela do carro|ve[íi]culo|carro|moto|im[óo]vel/,
    categoria: 'Financiamento',
  },
  {
    regex:
      /netflix|spotify|amazon|disney|hbo|globoplay|youtube|apple|deezer|paramount|prime|max|internet|telefone|celular|fibra|wifi|vivo|claro|tim|plano/,
    categoria: 'Assinaturas',
  },
  {
    regex: /luz|energia|[áa]gua|g[áa]s|enel|cpfl|cemig|sabesp|comg[áa]s|light/,
    categoria: 'Contas de Consumo',
  },
  { regex: /aluguel|condom[íi]nio|moradia/, categoria: 'Moradia' },
  { regex: /ipva|iptu|imposto|taxa|licenciamento|multa/, categoria: 'Impostos' },
  { regex: /seguro/, categoria: 'Seguros' },
  {
    regex: /plano.*sa[úu]de|hospital|m[ée]dico|consulta|unimed|amil|sa[úu]de/,
    categoria: 'Saúde',
  },
  { regex: /escola|faculdade|curso|matr[íi]cula|mensalidade/, categoria: 'Educação' },
  { regex: /academia|smartfit|smart fit|gym/, categoria: 'Esportes' },
  {
    regex: /alimenta[çc][ãa]o|mercado|supermercado|restaurante/,
    categoria: 'Alimentação',
  },
];

export function inferCategoryNameForPayableBillDescription(descricao: string): string {
  const descLower = descricao.toLowerCase();
  for (const item of PAYABLE_BILL_RULES) {
    if (item.regex.test(descLower)) return item.categoria;
  }
  return 'Outros';
}

/**
 * Keyword + special rules (TV, água por valor) aligned across transaction text and payable-bill paths.
 * Small bottled-water-like purchases intentionally stay in Alimentação; utilities stay in Contas de Consumo.
 */
export function inferCanonicalCategoryNameFromTransactionText(
  textParts: string[],
  amount?: number,
): string | null {
  const textoCompleto = textParts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!textoCompleto.trim()) return null;

  if (textoCompleto.includes('tv') || textoCompleto.includes('televisao')) {
    return 'Eletrodomésticos';
  }

  if (textoCompleto.includes('agua')) {
    if (amount !== undefined && amount < 20) return 'Alimentação';
    return 'Contas de Consumo';
  }

  return detectarCategoriaPorPalavraChave(textoCompleto);
}

/** Canonical fallback category labels in DB (expense → Outros, income → Outras Receitas). */
export function getFallbackCategoryDisplayName(type: TransactionCategoryType): string {
  return type === 'income' ? 'Outras Receitas' : 'Outros';
}

type CategoryRow = { id: string; name: string; user_id: string | null };

function pickExactOrPartial(rows: CategoryRow[], canonicalName: string): CategoryRow | null {
  const target = normalizeUserText(canonicalName);
  const userExact = rows.find((r) => r.user_id && normalizeUserText(r.name) === target);
  const sysExact = rows.find((r) => !r.user_id && normalizeUserText(r.name) === target);
  if (userExact) return userExact;
  if (sysExact) return sysExact;

  const userPartial = rows.find((r) => {
    if (!r.user_id) return false;
    const n = normalizeUserText(r.name);
    return n.includes(target) || target.includes(n);
  });
  if (userPartial) return userPartial;

  const sysPartial = rows.find((r) => {
    if (r.user_id) return false;
    const n = normalizeUserText(r.name);
    return n.includes(target) || target.includes(n);
  });
  return sysPartial ?? null;
}

function pickFallbackRow(rows: CategoryRow[], type: TransactionCategoryType): CategoryRow | null {
  const primary = normalizeUserText(getFallbackCategoryDisplayName(type));
  const userPri = rows.find((r) => r.user_id && normalizeUserText(r.name) === primary);
  const sysPri = rows.find((r) => !r.user_id && normalizeUserText(r.name) === primary);
  if (userPri) return userPri;
  if (sysPri) return sysPri;

  if (type === 'income') {
    const loose = rows.find(
      (r) =>
        normalizeUserText(r.name).includes('outras') &&
        normalizeUserText(r.name).includes('receita'),
    );
    if (loose) return loose;
  }

  const outros = rows.find((r) => normalizeUserText(r.name) === 'outros');
  return outros ?? null;
}

/**
 * Resolve a canonical `categories.id` for the user. Never embeds UUIDs; always loads from the database.
 */
export async function resolveCanonicalCategory(
  supabase: { from: (t: string) => any },
  input: ResolveCanonicalCategoryInput,
): Promise<ResolveCanonicalCategoryResult> {
  const fbName = getFallbackCategoryDisplayName(input.transactionType);
  const empty = (): ResolveCanonicalCategoryResult => ({
    categoryId: null,
    categoryName: fbName,
    usedFallback: true,
    resolutionPath: 'fallback',
  });

  const { data: rows, error } = await supabase
    .from('categories')
    .select('id, name, user_id')
    .eq('type', input.transactionType)
    .or(`user_id.is.null,user_id.eq.${input.userId}`);

  if (error || !rows?.length) {
    return empty();
  }

  let candidateName: string | null = null;
  let hintSource: 'payable_rule' | 'keyword' | 'label_map' | null = null;

  if (input.context === 'payable_bill' && input.textSources?.[0]) {
    candidateName = inferCategoryNameForPayableBillDescription(input.textSources[0]);
    hintSource = 'payable_rule';
  }

  const shouldTryKeywords = !candidateName || candidateName === 'Outros';
  if (shouldTryKeywords) {
    const fromKw = inferCanonicalCategoryNameFromTransactionText(input.textSources ?? [], input.amount);
    if (fromKw) {
      candidateName = fromKw;
      hintSource = 'keyword';
    }
  }

  if (!candidateName && input.labelHint?.trim()) {
    const mapped = mapLabelHintToCanonicalCategoryName(input.labelHint, input.transactionType);
    if (mapped) {
      candidateName = mapped;
      hintSource = 'label_map';
    }
  }

  if (!candidateName) {
    const fb = pickFallbackRow(rows, input.transactionType);
    return {
      categoryId: fb?.id ?? null,
      categoryName: fb?.name ?? fbName,
      usedFallback: true,
      resolutionPath: 'fallback',
    };
  }

  const picked = pickExactOrPartial(rows, candidateName);
  if (picked) {
    const exactMatch = normalizeUserText(picked.name) === normalizeUserText(candidateName);
    const exactUser = Boolean(picked.user_id && exactMatch);
    const exactSys = Boolean(!picked.user_id && exactMatch);
    let resolutionPath: CanonicalResolutionPath = 'partial';
    if (exactUser) resolutionPath = 'exact_user';
    else if (exactSys) resolutionPath = 'exact_system';
    else if (hintSource) resolutionPath = hintSource;
    return {
      categoryId: picked.id,
      categoryName: picked.name,
      usedFallback: false,
      resolutionPath,
    };
  }

  const fb = pickFallbackRow(rows, input.transactionType);
  return {
    categoryId: fb?.id ?? null,
    categoryName: fb?.name ?? fbName,
    usedFallback: true,
    resolutionPath: 'fallback',
  };
}
