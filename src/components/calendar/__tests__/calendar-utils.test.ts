import { describe, expect, it } from 'vitest';
import type { CategoryStyle } from '../calendar-utils';
import {
  CATEGORY_STYLES,
  SELECTABLE_AGENDA_EVENT_KINDS,
  calculateEventPosition,
  getAgendaItemPresentation,
  getBadgeStyle,
  getCategoryStyle,
  isAgendaItemAllDay,
  isSelectableAgendaCategoryKey,
} from '../calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

function agendaItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'evt-1',
    dedup_key: 'dedup-1',
    display_start_at: '2026-04-09T09:00:00',
    display_end_at: '2026-04-09T10:00:00',
    title: 'Evento',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: '/calendar/events/evt-1',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

describe('calendar-utils / selectable agenda categories', () => {
  it('lista apenas tipos criáveis na agenda (EventKind); não inclui financial', () => {
    expect(SELECTABLE_AGENDA_EVENT_KINDS).toEqual(['personal', 'work', 'mentoring']);
    expect(SELECTABLE_AGENDA_EVENT_KINDS).not.toContain('financial');
  });

  it('isSelectableAgendaCategoryKey é falso para financial e para chaves só de badge/display', () => {
    expect(isSelectableAgendaCategoryKey('financial')).toBe(false);
    expect(isSelectableAgendaCategoryKey('external')).toBe(false);
    expect(isSelectableAgendaCategoryKey('finance')).toBe(false);
    expect(isSelectableAgendaCategoryKey('health')).toBe(false);
    expect(isSelectableAgendaCategoryKey('personal')).toBe(true);
    expect(isSelectableAgendaCategoryKey('work')).toBe(true);
    expect(isSelectableAgendaCategoryKey('mentoring')).toBe(true);
  });
});

describe('calendar-utils / getCategoryStyle', () => {
  it('exporta CATEGORY_STYLES para consumo futuro da UI com cores hex das categorias principais', () => {
    expect(CATEGORY_STYLES.personal.color).toBe('#4A90D9');
    expect(CATEGORY_STYLES.work.color).toBe('#7B68EE');
    expect(CATEGORY_STYLES.mentoring.color).toBe('#F5A623');
    expect(CATEGORY_STYLES.financial.color).toBe('#F18181');
    expect(CATEGORY_STYLES.external.color).toBe('#9CA3AF');
  });

  it('retorna estilo para categorias selecionáveis (personal, work, mentoring) com color e label', () => {
    expect(getCategoryStyle('personal')).toMatchObject({ label: 'Pessoal', color: '#4A90D9' });
    expect(getCategoryStyle('work')).toMatchObject({ label: 'Trabalho', color: '#7B68EE' });
    expect(getCategoryStyle('mentoring')).toMatchObject({ label: 'Mentoria', color: '#F5A623' });
  });

  it('inclui estilo display-only financial com label Conta sem torná-lo selecionável', () => {
    const s = getCategoryStyle('financial');
    expect(s.label).toBe('Conta');
    expect(s.color).toBe('#F18181');
    expect(s.bg).toBeTruthy();
    expect(s.text).toBeTruthy();
    expect(isSelectableAgendaCategoryKey('financial')).toBe(false);
  });

  it('inclui estilo para external (display)', () => {
    const s = getCategoryStyle('external');
    expect(s.label).toBe('Externo');
    expect(s.color).toBe('#9CA3AF');
  });

  it('null ou desconhecido usa estilo padrão', () => {
    expect(getCategoryStyle(null).label).toBe('Evento');
    expect(getCategoryStyle(null).color).toBe('#6B7280');
    expect(getCategoryStyle(null).icon).toBeTruthy();
    expect(getCategoryStyle('unknown_xyz').label).toBe('Evento');
  });

  it('expõe estilos compatíveis com CategoryStyle e sempre com icon preenchido', () => {
    const assertCategoryStyle = (style: CategoryStyle) => style;
    const styles = [
      assertCategoryStyle(CATEGORY_STYLES.personal),
      assertCategoryStyle(CATEGORY_STYLES.work),
      assertCategoryStyle(CATEGORY_STYLES.mentoring),
      assertCategoryStyle(CATEGORY_STYLES.financial),
      assertCategoryStyle(CATEGORY_STYLES.external),
      assertCategoryStyle(getCategoryStyle(null)),
    ];

    for (const style of styles) {
      expect(style.icon).toBeTruthy();
    }
  });
});

describe('calendar-utils / getBadgeStyle (compatibilidade)', () => {
  it('mantém rótulos e classes para badges de agenda existentes', () => {
    const cases: [string, string][] = [
      ['personal', 'Pessoal'],
      ['work', 'Trabalho'],
      ['health', 'Saúde'],
      ['finance', 'Financeiro'],
      ['bill', 'Conta'],
      ['bill_reminder', 'Lembrete'],
      ['cycle', 'Ciclo'],
    ];
    for (const [badge, label] of cases) {
      const s = getBadgeStyle(badge);
      expect(s.label).toBe(label);
      expect(s.bg).toMatch(/^bg-/);
      expect(s.text).toMatch(/^text-/);
    }
  });

  it('badge null continua como Evento padrão', () => {
    expect(getBadgeStyle(null).label).toBe('Evento');
  });
});

describe('calendar-utils / calculateEventPosition', () => {
  it('calcula topSlots e heightSlots para evento dentro da grade', () => {
    const pos = calculateEventPosition('2026-04-09T09:00:00', '2026-04-09T10:30:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBeCloseTo(3, 5);
    expect(pos.heightSlots).toBeCloseTo(1.5, 5);
  });

  it('recorta início quando o evento começa antes da grade', () => {
    const pos = calculateEventPosition('2026-04-09T04:00:00', '2026-04-09T07:00:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBe(0);
    expect(pos.heightSlots).toBeCloseTo(1, 5);
  });

  it('recorta fim na última hora visível', () => {
    const pos = calculateEventPosition('2026-04-09T22:30:00', '2026-04-10T02:00:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.heightSlots).toBeCloseTo(1.5, 5);
  });

  it('evento inteiro antes da grade: não visível', () => {
    const pos = calculateEventPosition('2026-04-09T02:00:00', '2026-04-09T03:00:00', 6);
    expect(pos.isVisible).toBe(false);
    expect(pos.topSlots).toBe(0);
    expect(pos.heightSlots).toBe(0);
  });

  it('sem display_end_at usa duração mínima de 1 slot para altura', () => {
    const pos = calculateEventPosition('2026-04-09T12:00:00', null, 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.heightSlots).toBeCloseTo(1, 5);
  });

  it('clamps altura mínima em 0.5 slots para evento muito curto', () => {
    const pos = calculateEventPosition('2026-04-09T09:00:00', '2026-04-09T09:15:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.heightSlots).toBeGreaterThanOrEqual(0.5);
  });

  it('usa altura mínima para evento cronometrado com duração zero dentro da grade', () => {
    const pos = calculateEventPosition('2026-04-09T09:00:00', '2026-04-09T09:00:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBeCloseTo(3, 5);
    expect(pos.heightSlots).toBeCloseTo(0.5, 5);
  });

  it('usa altura mínima para evento de duração zero exatamente no início visível da grade', () => {
    const pos = calculateEventPosition('2026-04-09T06:00:00', '2026-04-09T06:00:00', 6);
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBe(0);
    expect(pos.heightSlots).toBeCloseTo(0.5, 5);
  });

  it('allDay retorna topSlots=-1 para ser tratado fora da grade horária', () => {
    const pos = calculateEventPosition('2026-04-09T10:00:00', '2026-04-09T18:00:00', 6, true);
    expect(pos.isVisible).toBe(false);
    expect(pos.topSlots).toBe(-1);
    expect(pos.heightSlots).toBe(0);
  });

  it('escala topSlots e heightSlots com slotsPerHour customizado', () => {
    const pos = calculateEventPosition('2026-04-09T09:00:00', '2026-04-09T10:30:00', 6, false, {
      slotsPerHour: 4,
    });
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBeCloseTo(12, 5);
    expect(pos.heightSlots).toBeCloseTo(6, 5);
  });

  it('respeita minHeightSlots customizado para eventos muito curtos', () => {
    const pos = calculateEventPosition('2026-04-09T09:00:00', '2026-04-09T09:10:00', 6, false, {
      minHeightSlots: 1.25,
    });
    expect(pos.isVisible).toBe(true);
    expect(pos.heightSlots).toBe(1.25);
  });

  it('recorta usando dayEndHour customizado', () => {
    const pos = calculateEventPosition('2026-04-09T20:00:00', '2026-04-09T22:00:00', 6, false, {
      dayEndHour: 21,
    });
    expect(pos.isVisible).toBe(true);
    expect(pos.topSlots).toBeCloseTo(14, 5);
    expect(pos.heightSlots).toBeCloseTo(1, 5);
  });
});

describe('calendar-utils / isAgendaItemAllDay', () => {
  it('returns true for explicit all-day metadata', () => {
    expect(
      isAgendaItemAllDay(
        agendaItem({
          metadata: { all_day: true },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for null end dates', () => {
    expect(
      isAgendaItemAllDay(
        agendaItem({
          display_end_at: null,
        }),
      ),
    ).toBe(true);
  });

  it('returns true for same-day spans from midnight through end-of-day', () => {
    expect(
      isAgendaItemAllDay(
        agendaItem({
          display_start_at: '2026-04-09T00:00:00',
          display_end_at: '2026-04-09T23:59:59',
          metadata: null,
        }),
      ),
    ).toBe(true);
  });

  it('returns false for normal timed events', () => {
    expect(
      isAgendaItemAllDay(
        agendaItem({
          display_start_at: '2026-04-09T09:00:00',
          display_end_at: '2026-04-09T10:00:00',
        }),
      ),
    ).toBe(false);
  });
});

describe('calendar-utils / getAgendaItemPresentation', () => {
  it('keeps regular timed events unchanged', () => {
    expect(
      getAgendaItemPresentation(
        agendaItem({
          display_start_at: '2026-04-09T14:00:00',
          display_end_at: '2026-04-09T15:30:00',
        }),
      ),
    ).toEqual({
      startAt: '2026-04-09T14:00:00',
      endAt: '2026-04-09T15:30:00',
      allDay: false,
    });
  });

  it('renders financial all-day projections at 09:00 instead of day-long', () => {
    expect(
      getAgendaItemPresentation(
        agendaItem({
          origin_type: 'payable_bill',
          badge: 'financial',
          display_start_at: '2026-04-09T00:00:00',
          display_end_at: '2026-04-09T23:59:59',
        }),
      ),
    ).toEqual({
      startAt: '2026-04-09T09:00:00',
      endAt: '2026-04-09T10:00:00',
      allDay: false,
    });
  });
});
