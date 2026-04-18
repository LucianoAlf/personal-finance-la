import type {
  ReconciliationImportMode,
  ReconciliationImportPreview,
  ReconciliationImportRequest,
  ReconciliationImportRowInput,
} from '@/types/reconciliation';

interface ManualDraft {
  description: string;
  amount: string;
  date: string;
  accountName: string;
}

interface BuildPreviewInput {
  source: ReconciliationImportMode;
  request: ReconciliationImportRequest | null;
  note: string;
}

export interface PreparedReconciliationImport {
  request: ReconciliationImportRequest | null;
  preview: ReconciliationImportPreview;
}

const dateAliases = ['data', 'date', 'posted date', 'transaction date', 'data lancamento'];
const amountAliases = ['valor', 'amount', 'valor rs', 'value', 'valor brl', 'amount brl'];
const descriptionAliases = [
  'descricao',
  'description',
  'historico',
  'memo',
  'narrative',
  'detalhe',
  'title',
  'titulo',
  'lancamento',
];
const externalIdAliases = ['id', 'external id', 'transaction id', 'reference', 'referencia', 'end to end id'];

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === separator && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectSeparator(line: string): string {
  const candidates = ['\t', ';', ','];
  const ranked = candidates
    .map((separator) => ({
      separator,
      count: line.split(separator).length - 1,
    }))
    .sort((a, b) => b.count - a.count);

  return ranked[0]?.count ? ranked[0].separator : '\t';
}

function normalizeHeaderMatch(value: string): string {
  return normalizeLabel(value).replace(/\b(r|rs|brl)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAmount(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const negative = trimmed.includes('-') || /\(.*\)/.test(trimmed);
  let sanitized = trimmed.replace(/[^\d,.-]/g, '');
  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      sanitized = sanitized.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    sanitized = sanitized.replace(',', '.');
  }

  sanitized = sanitized.replace(/(?!^)-/g, '');
  const parsed = Number.parseFloat(sanitized);
  if (!Number.isFinite(parsed)) return null;
  return Number((negative ? -Math.abs(parsed) : parsed).toFixed(2));
}

function normalizeDate(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = trimmed.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})$/);
  if (brMatch) {
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${year}-${brMatch[2]}-${brMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createBatchId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildPreview({ source, request, note }: BuildPreviewInput): PreparedReconciliationImport {
  return {
    request,
    preview: {
      source,
      itemCount: request?.rows.length ?? 0,
      note,
      readyToImport: Boolean(request?.rows.length),
    },
  };
}

function matchHeader(headers: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map(normalizeHeaderMatch);

  return (
    headers.find((header) => {
      const normalizedHeader = normalizeHeaderMatch(header);
      return normalizedAliases.some(
        (alias) =>
          normalizedHeader === alias ||
          normalizedHeader.includes(alias) ||
          alias.includes(normalizedHeader),
      );
    }) ?? null
  );
}

function mapHeaders(headers: string[]) {
  const date = matchHeader(headers, dateAliases);
  const amount = matchHeader(headers, amountAliases);
  const description = matchHeader(headers, descriptionAliases);
  const externalId = matchHeader(headers, externalIdAliases);

  if (!date || !amount || !description) {
    return null;
  }

  return {
    date,
    amount,
    description,
    external_id: externalId ?? undefined,
  };
}

function buildRowsFromMappedData(input: {
  rows: Record<string, string>[];
  source: ReconciliationImportRequest['source'];
  accountName: string;
  batchId: string;
}): { rows: ReconciliationImportRowInput[]; invalidCount: number } {
  if (input.rows.length === 0) {
    return { rows: [], invalidCount: 0 };
  }

  const headers = Object.keys(input.rows[0]);
  const columnMap = mapHeaders(headers);
  if (!columnMap) {
    return { rows: [], invalidCount: input.rows.length };
  }

  const prepared: ReconciliationImportRowInput[] = [];
  let invalidCount = 0;

  for (const row of input.rows) {
    const date = normalizeDate(row[columnMap.date] ?? '');
    const amount = parseAmount(row[columnMap.amount] ?? '');
    const description = (row[columnMap.description] ?? '').trim();

    if (!date || amount === null || !description) {
      invalidCount += 1;
      continue;
    }

    prepared.push({
      source_item_id: input.batchId,
      external_id: columnMap.external_id ? (row[columnMap.external_id] ?? '').trim() || null : null,
      account_name: input.accountName,
      external_account_id: null,
      internal_account_id: null,
      amount,
      date,
      description,
      raw_description: description,
    });
  }

  return { rows: prepared, invalidCount };
}

function parseTableLikeText(rawText: string): Record<string, string>[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const separator = detectSeparator(lines[0]);
  const headerCells = parseDelimitedLine(lines[0], separator);
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const values = parseDelimitedLine(line, separator);
    return headerCells.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? '';
      return accumulator;
    }, {});
  });
}

export function countNonEmptyLines(text: string): number {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export function prepareManualImport(manualDraft: ManualDraft): PreparedReconciliationImport {
  const description = manualDraft.description.trim();
  const amount = parseAmount(manualDraft.amount);
  const date = normalizeDate(manualDraft.date);
  const accountName = manualDraft.accountName.trim() || 'Lancamento manual';

  if (!description || amount === null || !date) {
    return buildPreview({
      source: 'manual',
      request: null,
      note: 'Preencha descricao, valor e data para gerar o preview.',
    });
  }

  return buildPreview({
    source: 'manual',
    request: {
      source: 'manual_entry',
      rows: [
        {
          source_item_id: null,
          external_id: null,
          account_name: accountName,
          external_account_id: null,
          internal_account_id: null,
          amount,
          date,
          description,
          raw_description: description,
        },
      ],
    },
    note: 'Lancamento manual pronto para entrar no pipeline de conciliacao.',
  });
}

export function preparePasteImport(pasteText: string): PreparedReconciliationImport {
  const lineCount = countNonEmptyLines(pasteText);
  if (lineCount === 0) {
    return buildPreview({
      source: 'paste',
      request: null,
      note: 'Cole linhas do extrato para gerar um preview.',
    });
  }

  const mappedRows = parseTableLikeText(pasteText);
  const batchId = createBatchId('paste');
  const { rows, invalidCount } = buildRowsFromMappedData({
    rows: mappedRows,
    source: 'manual_paste',
    accountName: 'Extrato colado',
    batchId,
  });

  if (rows.length === 0) {
    return buildPreview({
      source: 'paste',
      request: null,
      note: 'Nao consegui mapear data, descricao e valor nas linhas coladas. Use cabecalhos como Data, Descricao e Valor.',
    });
  }

  const skippedNote =
    invalidCount > 0 ? ` ${invalidCount} linha(s) foram ignoradas por dados incompletos.` : '';

  return buildPreview({
    source: 'paste',
    request: { source: 'manual_paste', rows },
    note: `${rows.length} linha(s) prontas para importacao.${skippedNote}`,
  });
}

export function prepareCsvImport(fileName: string, csvText: string): PreparedReconciliationImport {
  const mappedRows = parseTableLikeText(csvText);
  const batchId = createBatchId('csv');
  const { rows, invalidCount } = buildRowsFromMappedData({
    rows: mappedRows,
    source: 'csv_upload',
    accountName: fileName.replace(/\.[^.]+$/, '') || 'CSV importado',
    batchId,
  });

  if (rows.length === 0) {
    return buildPreview({
      source: 'csv',
      request: null,
      note: `${fileName} nao tem um mapeamento reconhecido. Garanta colunas de Data, Descricao e Valor.`,
    });
  }

  const skippedNote =
    invalidCount > 0 ? ` ${invalidCount} linha(s) foram ignoradas por dados incompletos.` : '';

  return buildPreview({
    source: 'csv',
    request: { source: 'csv_upload', rows },
    note: `${fileName} pronto para importacao com ${rows.length} linha(s).${skippedNote}`,
  });
}
