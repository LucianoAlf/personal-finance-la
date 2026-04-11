// calendar-intent-parser.ts — Intent detection and entity extraction for calendar commands

export type CalendarIntentType = 'create' | 'list' | 'reschedule' | 'cancel' | 'set_reminder' | 'unknown';

export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  reminderOffsetsMinutes?: number[];
  dateHint?: string;
  timeHint?: string;
  queryWindow?: 'today' | 'tomorrow' | 'week';
  titleFilter?: string;
  weekdayHint?: number;
  startTime?: string;
  endTime?: string;
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
  /\b(quais\s+sao\s+as\s+minhas?\s+mentorias?)\b/i,
  /\b(tem\s+um\s+compromisso)\b.*\b(hoje|amanh[aã])\b/i,
  /\b(que\s+dia(\s+que)?\s+eu\s+tenho)\b.*\bcompromisso\b/i,
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
  { pattern: /um\s*dia\s*antes/i, minutes: 1440 },
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
  const lower = normalizeCalendarText(text);
  if (/\b(o que (eu )?tenho)\b.*\b(hoje|amanh[aã])\b/i.test(lower)) return true;
  if (/\b(quais\s+sao\s+as\s+minhas?\s+mentorias?)\b/i.test(lower)) return true;
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
  const lower = normalizeCalendarText(text);

  const reminderOffsetsMinutes = extractReminderOffsets(lower);
  const reminderOffsetMinutes = reminderOffsetsMinutes[0];
  const queryWindow = extractQueryWindow(lower);
  const titleFilter = extractTitleFilter(lower);
  const weekdayHint = extractWeekdayHint(lower);
  const timeRange = extractTimeRange(lower);
  const startTime = timeRange?.startTime ?? extractPrimaryStartTime(lower);
  const endTime = timeRange?.endTime ?? (startTime ? addOneHour(startTime) : undefined);
  const isImperativeAgendaCreate = /\bagenda\s+(um|uma|o|a|esse|essa|meu|minha)\b/i.test(lower);

  if (CANCEL_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'cancel', rawText: text, reminderOffsetMinutes, reminderOffsetsMinutes };
  }

  if (RESCHEDULE_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'reschedule', rawText: text, reminderOffsetMinutes, reminderOffsetsMinutes };
  }

  // List patterns must be checked BEFORE create, because "o que tenho" contains
  // "tenho" which also matches CREATE_PATTERNS.
  if (!isImperativeAgendaCreate && LIST_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'list', rawText: text, queryWindow, titleFilter };
  }

  if (isImperativeAgendaCreate || CREATE_PATTERNS.some((p) => p.test(lower)) || reminderOffsetMinutes !== undefined) {
    const recurrenceHint = extractRecurrenceHint(lower);
    const title = extractTitle(lower);
    return {
      intent: 'create',
      title,
      rawText: text,
      reminderOffsetMinutes,
      reminderOffsetsMinutes,
      recurrenceHint,
      queryWindow,
      weekdayHint,
      startTime,
      endTime,
    };
  }

  if (lower.includes('agenda') || lower.includes('compromisso')) {
    return { intent: 'list', rawText: text, queryWindow, titleFilter };
  }

  return { intent: 'unknown', rawText: text };
}

function normalizeCalendarText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extractReminderOffsets(text: string): number[] {
  const values: number[] = [];
  for (const { pattern, minutes } of REMINDER_OFFSET_MAP) {
    if (pattern.test(text) && !values.includes(minutes)) values.push(minutes);
  }
  return values.sort((a, b) => b - a);
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
    /^(eu\s+)?(tenho|quero|preciso)\s+(um|uma)\s+/i,
    /^(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\s*/i,
    /^(aninha,\s*)?agenda\s+/i,
    /\b(tenho|marcar|agendar|criar|novo|nova|quero|preciso)\s*/gi,
    /\b(um|uma)\s+/gi,
    /\bde\s+\d{1,2}(?:[:h]\d{0,2})?\s+[aà]s\s+\d{1,2}(?:[:h]\d{0,2})?\b/gi,
    /\b(?:as|às)\s*\d{1,2}(?:[:h]\d{0,2})?(?:\s*horas?)?\b/gi,
    /\b(na|no)\s+proxim[ao]s?\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)(-feira)?\b/gi,
    /\b(na|no)\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)(-feira)?\b/gi,
    /\b(me\s+lembra.*$)/i,
    /\b(me\s+lembre.*$)/i,
    /\b(meia hora antes|uma hora antes|\d+\s*min(?:utos?)?\s*antes|\d+\s*horas?\s*antes)/gi,
    /\b(um|1)\s+dia\s+antes\b/gi,
    /\b(no\s+dia)\b.*$/i,
    /^(compromisso|reunião|reuniao|evento)\s*/i,
    /\b(a\s+cada\s+\d+\s*(?:semanas?|dias?|m[eê]s(?:es)?))\b/gi,
    /\b(todos\s+os\s+dias|todo\s+dia)\b/gi,
    /\b(todas\s+as\s+semanas|toda\s+semana)\b/gi,
    /\b(todo\s+m[eê]s)\b/gi,
    /\b(da\s+manha|da\s+tarde|da\s+noite)\b/gi,
  ];

  for (const pattern of removePatterns) {
    title = title.replace(pattern, '').trim();
  }

  title = title.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

  if (/^com\b/i.test(title)) {
    title = `compromisso ${title}`;
  }

  return title ? capitalizeTitle(title) : 'Compromisso';
}

function extractQueryWindow(text: string): 'today' | 'tomorrow' | 'week' | undefined {
  if (/\b(hoje)\b/.test(text)) return 'today';
  if (/\b(amanha)\b/.test(text)) return 'tomorrow';
  if (/\b(essa semana|esta semana|semana)\b/.test(text)) return 'week';
  return undefined;
}

function extractTitleFilter(text: string): string | undefined {
  if (/\bmentorias?\b/.test(text)) return 'mentoria';
  if (/\bcoordenador(?:es)?\b/.test(text)) return 'coordenadores';
  return undefined;
}

function extractWeekdayHint(text: string): number | undefined {
  const mappings: Array<{ pattern: RegExp; weekday: number }> = [
    { pattern: /\bsegunda(?:-feira)?\b/, weekday: 1 },
    { pattern: /\bterca(?:-feira)?\b/, weekday: 2 },
    { pattern: /\bquarta(?:-feira)?\b/, weekday: 3 },
    { pattern: /\bquinta(?:-feira)?\b/, weekday: 4 },
    { pattern: /\bsexta(?:-feira)?\b/, weekday: 5 },
    { pattern: /\bsabado\b/, weekday: 6 },
    { pattern: /\bdomingo\b/, weekday: 0 },
  ];

  for (const { pattern, weekday } of mappings) {
    if (pattern.test(text)) return weekday;
  }

  return undefined;
}

function extractPrimaryStartTime(text: string): string | undefined {
  const match = text.match(/\b(?:as|às)\s*(\d{1,2})(?:(?:[:h])(\d{2}))?\s*h?(?:\s*horas?)?(?:\s+da\s+(manha|tarde|noite))?/i);
  if (!match) return undefined;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] ?? '00', 10);
  const period = match[3]?.toLowerCase();

  if (period === 'tarde' || period === 'noite') {
    if (hour < 12) hour += 12;
  }
  if (period === 'manha' && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function extractTimeRange(text: string): { startTime: string; endTime: string } | undefined {
  const match = text.match(/\bde\s+(\d{1,2})(?:(?:[:h])(\d{2}))?\s*h?\s+[aà]s\s+(\d{1,2})(?:(?:[:h])(\d{2}))?\s*h?\b/i);
  if (!match) return undefined;

  const startHour = parseInt(match[1], 10);
  const startMinute = parseInt(match[2] ?? '00', 10);
  const endHour = parseInt(match[3], 10);
  const endMinute = parseInt(match[4] ?? '00', 10);

  return {
    startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`,
  };
}

function addOneHour(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = (parseInt(hourStr, 10) + 1) % 24;
  return `${String(hour).padStart(2, '0')}:${minuteStr}:00`;
}

function capitalizeTitle(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
