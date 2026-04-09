import { describe, expect, it } from 'vitest';
import type { AgendaItem } from '@/types/calendar.types';
import {
  AGENDA_FILTER_CATEGORIES,
  getAgendaItemFilterCategory,
} from '../calendar-utils';

function item(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'e1',
    dedup_key: 'k1',
    display_start_at: '2026-04-09T09:00:00',
    display_end_at: '2026-04-09T10:00:00',
    title: 'T',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: '/c',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

describe('Task 10 / getAgendaItemFilterCategory', () => {
  it('exposes five filter categories including financial and external', () => {
    expect(AGENDA_FILTER_CATEGORIES).toEqual([
      'personal',
      'work',
      'mentoring',
      'financial',
      'external',
    ]);
  });

  it('maps canonical badges personal, work, mentoring', () => {
    expect(getAgendaItemFilterCategory(item({ badge: 'personal' }))).toBe('personal');
    expect(getAgendaItemFilterCategory(item({ badge: 'work' }))).toBe('work');
    expect(getAgendaItemFilterCategory(item({ badge: 'mentoring' }))).toBe('mentoring');
  });

  it('maps external badge to external', () => {
    expect(getAgendaItemFilterCategory(item({ badge: 'external' }))).toBe('external');
  });

  it('maps payable bills, reminders, and cycles to financial', () => {
    expect(
      getAgendaItemFilterCategory(
        item({
          agenda_item_type: 'derived_projection',
          origin_type: 'payable_bill',
          badge: 'bill',
        }),
      ),
    ).toBe('financial');
    expect(
      getAgendaItemFilterCategory(
        item({
          agenda_item_type: 'derived_projection',
          origin_type: 'bill_reminder',
          badge: 'bill_reminder',
        }),
      ),
    ).toBe('financial');
    expect(
      getAgendaItemFilterCategory(
        item({
          agenda_item_type: 'derived_projection',
          origin_type: 'financial_cycle',
          badge: 'cycle',
        }),
      ),
    ).toBe('financial');
  });
});
