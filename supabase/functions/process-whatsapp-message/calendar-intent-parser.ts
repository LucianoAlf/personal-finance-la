// calendar-intent-parser.ts — Intent detection and entity extraction for calendar commands

export type CalendarIntentType = 'create' | 'list' | 'reschedule' | 'cancel' | 'set_reminder' | 'unknown';

export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  dateHint?: string;
  timeHint?: string;
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number };
}

const CALENDAR_KEYWORDS = [
  'agenda', 'compromisso', 'compromissos', 'reunião', 'reuniao',
  'lembrete', 'lembra', 'lembrar', 'remarcar', 'remarco',
  'cancelar compromisso', 'cancelar reunião', 'cancelar reuniao',
  'evento', 'agendar', 'agendamento',
];

const FINANCIAL_COUNTER_PATTERNS = [
  /\b(pagar|pagamento|pago|vencer|vence|vencimento|fatura|boleto)\b/i,
  /\b(aluguel|condom[ií]nio|luz|[áa]gua|internet|telefone|celular|g[aá]s)\b/i,
  /\b(netflix|spotify|disney|iptu|ipva|seguro|mensalidade|assinatura)\b/i,
  /\b(conta|contas)\s+(de|do|da)\b/i,
  /\bdia\s*\d+\b/i,
  /\btodo\s*m[eê]s\b/i,
  /\bmensal\b/i,
  /\brecorrente\b/i,
  /\br\$\s*\d+\b/i,
  /\d+[\.,]?\d*\s*(reais?|real)\b/i,
];

const CREATE_PATTERNS = [
  /\b(tenho|marcar?|agendar?|cri(?:ar?|e)|novo|nova)\b/i,
  /\bcompromisso\b/i,
];

const LIST_PATTERNS = [
  /\b(agenda|o que tenho|meus compromissos|minha agenda|compromissos)\b/i,
  /\b(o que (eu )?tenho)\b.*\b(hoje|amanh[aã])\b/i,
  /\b(essa semana|esta semana|hoje|amanhã|próximos dias)\b.*\b(agenda|compromisso)/i,
];

const CANCEL_PATTERNS = [
  /\bcancelar?\b/i,
];

const RESCHEDULE_PATTERNS = [
  /\b(remarcar?|adiar?|mover?|mudar)\b/i,
];

const REMINDER_OFFSET_MAP: Array<{ pattern: RegExp; minutes: number }> = [
  { pattern: /meia hora antes/i, minutes: 30 },
  { pattern: /uma hora antes/i, minutes: 60 },
  { pattern: /1\s*h(?:ora)?\s*antes/i, minutes: 60 },
  { pattern: /15\s*min(?:utos?)?\s*antes/i, minutes: 15 },
  { pattern: /30\s*min(?:utos?)?\s*antes/i, minutes: 30 },
  { pattern: /10\s*min(?:utos?)?\s*antes/i, minutes: 10 },
  { pattern: /2\s*horas?\s*antes/i, minutes: 120 },
  { pattern: /1\s*dia\s*antes/i, minutes: 1440 },
];

/** "a cada N …" must be checked before fixed phrases like "todo dia". */
const RECURRENCE_EVERY_N: Array<{
  pattern: RegExp;
  frequency: 'daily' | 'weekly' | 'monthly';
}> = [
  { pattern: /\ba\s+cada\s+(\d+)\s*semanas?\b/i, frequency: 'weekly' },
  { pattern: /\ba\s+cada\s+(\d+)\s*dias?\b/i, frequency: 'daily' },
  { pattern: /\ba\s+cada\s+(\d+)\s*m[eê]s(?:es)?\b/i, frequency: 'monthly' },
];

const RECURRENCE_FIXED: Array<{
  pattern: RegExp;
  hint: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number };
}> = [
  { pattern: /\btodos\s+os\s+dias\b/i, hint: { frequency: 'daily' } },
  { pattern: /\btodo\s+dia\b/i, hint: { frequency: 'daily' } },
  { pattern: /\btodas\s+as\s+semanas\b/i, hint: { frequency: 'weekly' } },
  { pattern: /\btoda\s+semana\b/i, hint: { frequency: 'weekly' } },
  { pattern: /\btodo\s+m[eê]s\b/i, hint: { frequency: 'monthly' } },
];

export function isCalendarIntent(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const lower = text.toLowerCase().trim();
  if (/\b(o que (eu )?tenho)\b.*\b(hoje|amanh[aã])\b/i.test(lower)) return true;
  const hasCalendarKeyword = CALENDAR_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasCalendarKeyword) return false;

  // Ownership guardrail: if the phrase looks like a financial obligation/reminder,
  // let it continue through the existing payable-bills / NLP pipeline.
  if (FINANCIAL_COUNTER_PATTERNS.some((pattern) => pattern.test(lower))) {
    return false;
  }

  return true;
}

export function parseCalendarIntent(text: string): CalendarParsedIntent {
  const lower = text.toLowerCase().trim();

  const reminderOffsetMinutes = extractReminderOffset(lower);

  if (CANCEL_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'cancel', rawText: text, reminderOffsetMinutes };
  }

  if (RESCHEDULE_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'reschedule', rawText: text, reminderOffsetMinutes };
  }

  // List patterns must be checked BEFORE create, because "o que tenho" contains
  // "tenho" which also matches CREATE_PATTERNS.
  if (LIST_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'list', rawText: text };
  }

  if (CREATE_PATTERNS.some((p) => p.test(lower)) || reminderOffsetMinutes !== undefined) {
    const recurrenceHint = extractRecurrenceHint(lower);
    const title = extractTitle(lower);
    return { intent: 'create', title, rawText: text, reminderOffsetMinutes, recurrenceHint };
  }

  if (lower.includes('agenda') || lower.includes('compromisso')) {
    return { intent: 'list', rawText: text };
  }

  return { intent: 'unknown', rawText: text };
}

function extractReminderOffset(text: string): number | undefined {
  for (const { pattern, minutes } of REMINDER_OFFSET_MAP) {
    if (pattern.test(text)) return minutes;
  }
  return undefined;
}

function extractRecurrenceHint(text: string):
  | { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number }
  | undefined {
  for (const { pattern, frequency } of RECURRENCE_EVERY_N) {
    const m = pattern.exec(text);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1) {
        return { frequency, interval: n };
      }
    }
  }
  for (const { pattern, hint } of RECURRENCE_FIXED) {
    if (pattern.test(text)) return { ...hint };
  }
  return undefined;
}

function extractTitle(text: string): string {
  let title = text;

  const removePatterns = [
    /^(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\s*/i,
    /\b(tenho|marcar|agendar|criar|novo|nova)\s*/gi,
    /\b(às?\s*\d{1,2}h?\d{0,2})\b/gi,
    /\b(me\s+lembra.*$)/i,
    /\b(meia hora antes|uma hora antes|\d+\s*min(?:utos?)?\s*antes|\d+\s*horas?\s*antes)/gi,
    /^(compromisso|reunião|reuniao|evento)\s*/i,
    /\b(a\s+cada\s+\d+\s*(?:semanas?|dias?|m[eê]s(?:es)?))\b/gi,
    /\b(todos\s+os\s+dias|todo\s+dia)\b/gi,
    /\b(todas\s+as\s+semanas|toda\s+semana)\b/gi,
    /\b(todo\s+m[eê]s)\b/gi,
  ];

  for (const pattern of removePatterns) {
    title = title.replace(pattern, '').trim();
  }

  title = title.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

  return title || 'Compromisso';
}
