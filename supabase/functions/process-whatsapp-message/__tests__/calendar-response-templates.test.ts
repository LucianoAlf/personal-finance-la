import { describe, expect, it } from 'vitest';

import {
  prettifyEventTitleForDisplay,
  templateAgendaList,
  templateCalendarCreateConfirmation,
  templateEventCreated,
} from '../calendar-response-templates.ts';

describe('calendar-response-templates', () => {
  it('renders Mike-style pending create confirmation', () => {
    const msg = templateCalendarCreateConfirmation('Reunião com coordenadores', 'segunda, 13 de abr às 11:00', {
      reminders: '1 dia antes, 1h antes',
      recurrence: 'Toda semana',
    });
    expect(msg).toContain('Criar compromisso?');
    expect(msg).toContain('Confirma? (sim/não)');
    expect(msg).toContain('📝 *Reunião com coordenadores*');
    expect(msg).toContain('🔔 1 dia antes, 1h antes');
    expect(msg).toContain('🔄 Toda semana');
  });

  it('prettifies voice-shaped coordinator title', () => {
    expect(prettifyEventTitleForDisplay('Compromisso com os meus coordenadores')).toBe(
      'Reunião com coordenadores',
    );
  });

  it('renders agenda list in Mike-style cards with local time', () => {
    const msg = templateAgendaList(
      [
        {
          agenda_item_type: 'canonical_event',
          origin_type: 'calendar_event',
          origin_id: '1',
          display_start_at: '2026-04-14T17:00:00.000Z',
          display_end_at: null,
          title: 'Mentoria de produto',
          subtitle: null,
          status: 'scheduled',
          badge: null,
          is_read_only: false,
          metadata: null,
        },
        {
          agenda_item_type: 'canonical_event',
          origin_type: 'calendar_event',
          origin_id: '2',
          display_start_at: '2026-04-14T19:30:00.000Z',
          display_end_at: null,
          title: 'Reunião com coordenadores',
          subtitle: null,
          status: 'scheduled',
          badge: null,
          is_read_only: false,
          metadata: null,
        },
      ],
      'Esta semana',
      { timeZone: 'America/Sao_Paulo' },
    );

    expect(msg).toContain('🗓️ *Agenda — Esta semana*');
    expect(msg).toContain('Achei 2 compromissos:');
    expect(msg).toContain('🔸 Terça, 14 abr às 14:00');
    expect(msg).toContain('🔸 Terça, 14 abr às 16:30');
    expect(msg).toContain('*Mentoria de produto*');
    expect(msg).toContain('*Reunião com coordenadores*');
    expect(msg).not.toContain('Total:');
  });

  it('renders event creation in Mike-style with reminders', () => {
    const msg = templateEventCreated(
      'Reunião com coordenadores',
      'segunda-feira, 13 de abril, 11:00',
      'Lembretes: 1 dia antes, 1h antes',
    );

    expect(msg).toContain('Pronto, agendei!');
    expect(msg).toContain('📝 *Reunião com coordenadores*');
    expect(msg).toContain('🔸 segunda-feira, 13 de abril, 11:00');
    expect(msg).toContain('🔔 Lembretes: 1 dia antes, 1h antes');
  });

  it('renders contextual empty state for filtered mentorias query', () => {
    const msg = templateAgendaList([], 'Esta semana', {
      titleFilterLabel: 'mentoria',
      timeZone: 'America/Sao_Paulo',
    });

    expect(msg).toContain('🗓️ *Mentorias — Esta semana*');
    expect(msg).toContain('Não achei mentorias esta semana.');
    expect(msg).not.toContain('Nenhum compromisso encontrado');
  });
});
