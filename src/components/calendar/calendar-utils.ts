import { isSameDay, parseISO } from 'date-fns';
import type { AgendaItem, AgendaOriginType } from '@/types/calendar.types';

/** Keys used by calendar category filter toggles (Task 10). */
export const AGENDA_FILTER_CATEGORIES = [
  'personal',
  'work',
  'mentoring',
  'financial',
  'external',
] as const;

export type AgendaFilterCategory = (typeof AGENDA_FILTER_CATEGORIES)[number];

const FINANCIAL_ORIGINS: AgendaOriginType[] = ['payable_bill', 'bill_reminder', 'financial_cycle'];
const FINANCIAL_FALLBACK_HOUR = 9;
const FINANCIAL_FALLBACK_DURATION_HOURS = 1;

const FINANCIAL_BADGES = new Set(['bill', 'bill_reminder', 'cycle', 'financial', 'finance']);

const AGENDA_KIND_BADGES = new Set(['personal', 'work', 'mentoring']);

/**
 * Maps an agenda row to one of `AGENDA_FILTER_CATEGORIES` for sidebar filtering.
 * Financial projections always bucket as `financial`; TickTick-style rows use `external` when `badge` is `external`.
 */
export function getAgendaItemFilterCategory(item: AgendaItem): AgendaFilterCategory {
  if (FINANCIAL_ORIGINS.includes(item.origin_type)) {
    return 'financial';
  }
  const badge = item.badge?.trim() ?? '';
  if (badge === 'external') {
    return 'external';
  }
  if (FINANCIAL_BADGES.has(badge)) {
    return 'financial';
  }
  if (AGENDA_KIND_BADGES.has(badge)) {
    return badge as AgendaFilterCategory;
  }
  return 'personal';
}

export function groupItemsByDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = item.display_start_at.slice(0, 10);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export function getItemsForDay(items: AgendaItem[], day: Date): AgendaItem[] {
  return items.filter((item) => {
    const start = parseISO(item.display_start_at);
    return isSameDay(start, day);
  });
}

export function getHourFromISO(iso: string): number {
  const d = parseISO(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export function isFinancialAgendaItem(item: AgendaItem): boolean {
  if (FINANCIAL_ORIGINS.includes(item.origin_type)) return true;
  const badge = item.badge?.trim() ?? '';
  return FINANCIAL_BADGES.has(badge);
}

export function isAgendaItemAllDay(item: AgendaItem): boolean {
  if (item.display_end_at === null) return true;
  if (Boolean(item.metadata?.all_day)) return true;

  const start = parseISO(item.display_start_at);
  const end = parseISO(item.display_end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  if (!isSameDay(start, end)) return false;

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const endSeconds = end.getSeconds();

  return startMinutes === 0 && (endMinutes > 23 * 60 + 58 || (endMinutes === 23 * 60 + 58 && endSeconds >= 59));
}

export interface AgendaItemPresentation {
  startAt: string;
  endAt: string | null;
  allDay: boolean;
}

function buildIsoAtHour(sourceIso: string, hour: number): string {
  return `${sourceIso.slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00`;
}

export function getAgendaItemPresentation(item: AgendaItem): AgendaItemPresentation {
  const allDay = isAgendaItemAllDay(item);
  if (allDay && isFinancialAgendaItem(item)) {
    return {
      startAt: buildIsoAtHour(item.display_start_at, FINANCIAL_FALLBACK_HOUR),
      endAt: buildIsoAtHour(item.display_start_at, FINANCIAL_FALLBACK_HOUR + FINANCIAL_FALLBACK_DURATION_HOURS),
      allDay: false,
    };
  }

  return {
    startAt: item.display_start_at,
    endAt: item.display_end_at,
    allDay,
  };
}

/** Tipos de evento que o usuário pode escolher ao criar compromisso (alinha a `EventKind` em `calendar.types`). */
export const SELECTABLE_AGENDA_EVENT_KINDS = ['personal', 'work', 'mentoring'] as const;

export type SelectableAgendaEventKind = (typeof SELECTABLE_AGENDA_EVENT_KINDS)[number];

export function isSelectableAgendaCategoryKey(key: string): key is SelectableAgendaEventKind {
  return (SELECTABLE_AGENDA_EVENT_KINDS as readonly string[]).includes(key);
}

/** Estilo visual de categoria/badge. `financial` e `external` são apenas para exibição/filtro. */
export interface CategoryStyle {
  color: string;
  bg: string;
  text: string;
  label: string;
  icon: string;
  border?: string;
}

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  color: '#6B7280',
  bg: 'bg-muted',
  text: 'text-muted-foreground',
  label: 'Evento',
  icon: 'CalendarDays',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  personal: {
    color: '#4A90D9',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'Pessoal',
    icon: 'User',
  },
  work: {
    color: '#7B68EE',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    label: 'Trabalho',
    icon: 'Briefcase',
  },
  mentoring: {
    color: '#F5A623',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Mentoria',
    icon: 'GraduationCap',
  },
  health: {
    color: '#22C55E',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    label: 'Saúde',
    icon: 'HeartPulse',
  },
  finance: {
    color: '#F59E0B',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Financeiro',
    icon: 'Wallet',
  },
  bill: {
    color: '#F18181',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    label: 'Conta',
    icon: 'Receipt',
  },
  bill_reminder: {
    color: '#EAB308',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    label: 'Lembrete',
    icon: 'Bell',
  },
  cycle: {
    color: '#06B6D4',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    label: 'Ciclo',
    icon: 'RefreshCw',
  },
  financial: {
    color: '#F18181',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    label: 'Conta',
    icon: 'DollarSign',
    border: 'border border-dashed border-warning/50',
  },
  external: {
    color: '#9CA3AF',
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-300',
    label: 'Externo',
    icon: 'Globe',
    border: 'border border-gray-300 dark:border-gray-700',
  },
};

export function getCategoryStyle(categoryKey: string | null | undefined): CategoryStyle {
  if (categoryKey == null || categoryKey === '') {
    return DEFAULT_CATEGORY_STYLE;
  }
  return CATEGORY_STYLES[categoryKey] ?? DEFAULT_CATEGORY_STYLE;
}

/** Compatível com `badge` retornado pela janela de agenda; delega para o mapa de categorias. */
export function getBadgeStyle(badge: string | null): CategoryStyle {
  return getCategoryStyle(badge);
}

export interface AgendaSemanticChrome {
  accentColor: string;
  borderColor: string;
  backgroundColor: string;
}

function hexToRgb(color: string): [number, number, number] {
  const normalized = color.replace('#', '').trim();
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const int = Number.parseInt(expanded, 16);
  if (!Number.isFinite(int) || expanded.length !== 6) {
    return [107, 114, 128];
  }

  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbaFromHex(color: string, alpha: number): string {
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getAgendaSemanticChrome(categoryKey: string | null | undefined): AgendaSemanticChrome {
  const category = getCategoryStyle(categoryKey);
  return {
    accentColor: category.color,
    borderColor: rgbaFromHex(category.color, 0.24),
    backgroundColor: rgbaFromHex(category.color, 0.12),
  };
}

const ORIGIN_INDICATOR: Record<string, { dot: string; border: string }> = {
  canonical_event: { dot: 'bg-primary', border: 'border-primary/30' },
  derived_projection: { dot: 'bg-muted-foreground/50', border: 'border-dashed border-border/60' },
};

export function getItemIndicator(itemType: string) {
  return ORIGIN_INDICATOR[itemType] ?? ORIGIN_INDICATOR.canonical_event;
}

export interface EventPosition {
  topSlots: number;
  heightSlots: number;
  isVisible: boolean;
}

const DEFAULT_TIMED_DURATION_H = 1;
const DEFAULT_DAY_END_H = 24;
const DEFAULT_SLOTS_PER_HOUR = 1;
const DEFAULT_MIN_HEIGHT_SLOTS = 0.5;

function getEndHourForTimelineColumn(
  displayStartAt: string,
  displayEndAt: string | null,
  defaultDurationHours: number,
  dayEndHour: number,
): number {
  const start = parseISO(displayStartAt);
  const startH = getHourFromISO(displayStartAt);
  if (!displayEndAt) {
    return startH + defaultDurationHours;
  }
  const end = parseISO(displayEndAt);
  if (isSameDay(start, end)) {
    return getHourFromISO(displayEndAt);
  }
  if (end.getTime() > start.getTime()) {
    return dayEndHour;
  }
  return startH + defaultDurationHours;
}

export interface CalculateEventPositionOptions {
  dayEndHour?: number;
  slotsPerHour?: number;
  minHeightSlots?: number;
}

export function calculateEventPosition(
  startIso: string,
  endIso: string | null,
  dayStartHour: number,
  allDay = false,
  options: CalculateEventPositionOptions = {},
): EventPosition {
  if (allDay) {
    return { topSlots: -1, heightSlots: 0, isVisible: false };
  }

  const {
    dayEndHour = DEFAULT_DAY_END_H,
    slotsPerHour = DEFAULT_SLOTS_PER_HOUR,
    minHeightSlots = DEFAULT_MIN_HEIGHT_SLOTS,
  } = options;

  const startH = getHourFromISO(startIso);
  const endH = getEndHourForTimelineColumn(
    startIso,
    endIso,
    DEFAULT_TIMED_DURATION_H,
    dayEndHour,
  );

  const visStart = Math.max(startH, dayStartHour);
  const visEnd = Math.min(endH, dayEndHour);

  if (visEnd < visStart || endH < dayStartHour || startH >= dayEndHour) {
    return { topSlots: 0, heightSlots: 0, isVisible: false };
  }

  const rawHeightSlots = (visEnd - visStart) * slotsPerHour;

  return {
    topSlots: (visStart - dayStartHour) * slotsPerHour,
    heightSlots: Math.max(rawHeightSlots, minHeightSlots),
    isVisible: true,
  };
}
