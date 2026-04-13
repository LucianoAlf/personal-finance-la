import { describe, expect, it } from 'vitest';

import {
  prettifyEventTitleForDisplay,
  templateAgendaList,
  templateCalendarCreateConfirmation,
  templateEventCancelConfirmation,
  templateEventCreated,
  templateEventRescheduleConfirmation,
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

  it('renders participant-like first person as the active user name', () => {
    const msg = templateCalendarCreateConfirmation(
      'Reunião do time de marketing',
      'Segunda, 14 abr às 14:00',
      {
        actorDisplayName: 'Alf',
        participants: 'eu, Yuri, John e Matheus',
      },
    );

    expect(msg).toContain('👥 Alf, Yuri, John e Matheus');
    // Participants line must not keep first-person "eu" after normalization
    expect(msg).not.toMatch(/👥[^\n]*\beu\b/);
  });

  it('deduplicates the active user when self-reference and explicit name both appear', () => {
    const msg = templateCalendarCreateConfirmation(
      'Reunião do time de marketing',
      'Segunda, 14 abr às 14:00',
      {
        actorDisplayName: 'Ani',
        participants: 'Ani, eu e Jeremias',
      },
    );

    expect(msg).toContain('👥 Ani, Jeremias');
    expect(msg).not.toMatch(/👥[^\n]*Ani,\s*Ani\b/);
  });

  it('normalizes comigo, me, meu and minha as first-person participant tokens', () => {
    const comigoMsg = templateCalendarCreateConfirmation(
      'Call',
      'Hoje 10:00',
      { actorDisplayName: 'Alf', participants: 'comigo e John' },
    );
    expect(comigoMsg).toContain('👥 Alf, John');
    expect(comigoMsg).not.toMatch(/👥[^\n]*\bcomigo\b/);

    const meMsg = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Alf',
      participants: 'me, Yuri',
    });
    expect(meMsg).toContain('👥 Alf, Yuri');
    expect(meMsg).not.toMatch(/👥[^\n]*\bme\b/);

    const meuMsg = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Ani',
      participants: 'meu e Jeremias',
    });
    expect(meuMsg).toContain('👥 Ani, Jeremias');

    const minhaMsg = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Ani',
      participants: 'minha, Paulo',
    });
    expect(minhaMsg).toContain('👥 Ani, Paulo');
  });

  it('normalizes você, voce, seu and sua as the actor in participant lists', () => {
    const voceAccent = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Alf',
      participants: 'você e Marina',
    });
    expect(voceAccent).toContain('👥 Alf, Marina');
    expect(voceAccent).not.toMatch(/👥[^\n]*\bvocê\b/);

    const vocePlain = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Alf',
      participants: 'voce, Paula',
    });
    expect(vocePlain).toContain('👥 Alf, Paula');

    expect(
      templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
        actorDisplayName: 'Ani',
        participants: 'seu e Rico',
      }),
    ).toContain('👥 Ani, Rico');

    expect(
      templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
        actorDisplayName: 'Ani',
        participants: 'sua, Beto',
      }),
    ).toContain('👥 Ani, Beto');
  });

  it('collapses line breaks in participant text so the 👥 line stays single-line', () => {
    const msg = templateCalendarCreateConfirmation('Call', 'Hoje 10:00', {
      actorDisplayName: 'Alf',
      participants: 'Yuri,\ncomigo',
    });
    const line = msg.split('\n').find((l) => l.startsWith('👥'));
    expect(line).toBeDefined();
    expect(line).toBe('👥 Yuri, Alf');
    expect(line).not.toMatch(/\n/);
  });

  it('renders optional secondary lines in fixed order', () => {
    const msg = templateCalendarCreateConfirmation(
      'Reunião do time de marketing',
      'Segunda, 14 abr às 14:00',
      {
        actorDisplayName: 'Alf',
        location: 'Casa do Luciano Alf',
        participants: 'Alf, Yuri, John',
        durationText: '3h',
        reminders: '1 dia antes e 1 hora antes',
        recurrence: 'Toda semana',
      },
    );

    expect(msg).toContain('📍 Casa do Luciano Alf');
    expect(msg).toContain('👥 Alf, Yuri, John');
    expect(msg).toContain('⏱️ 3h');
    expect(msg).toContain('🔔 1 dia antes e 1 hora antes');
    expect(msg).toContain('🔄 Toda semana');

    const locationIndex = msg.indexOf('📍 Casa do Luciano Alf');
    const participantsIndex = msg.indexOf('👥 Alf, Yuri, John');
    const durationIndex = msg.indexOf('⏱️ 3h');
    const remindersIndex = msg.indexOf('🔔 1 dia antes e 1 hora antes');
    const recurrenceIndex = msg.indexOf('🔄 Toda semana');

    expect(participantsIndex).toBeGreaterThan(locationIndex);
    expect(durationIndex).toBeGreaterThan(participantsIndex);
    expect(remindersIndex).toBeGreaterThan(durationIndex);
    expect(recurrenceIndex).toBeGreaterThan(remindersIndex);
  });

  it('renders reschedule confirmation with current event block and changes block', () => {
    const msg = templateEventRescheduleConfirmation(
      {
        title: 'Reunião do time de marketing',
        whenLine: 'Seg, 14 abr às 14:00',
      },
      ['📅 Nova data: terça-feira', '🕐 Novo horário: 14:00'],
    );

    expect(msg).toContain('Achei o evento:');
    expect(msg).toContain('📌 *Reunião do time de marketing*');
    expect(msg).toContain('🕐 Seg, 14 abr às 14:00');
    expect(msg).toContain('Alterações:');
    expect(msg).toContain('📅 Nova data: terça-feira');
    expect(msg).toContain('🕐 Novo horário: 14:00');
    expect(msg).toContain('Confirma? (sim/não)');
  });

  it('renders cancel confirmation with found-event block and Cancelo prompt', () => {
    const msg = templateEventCancelConfirmation({
      title: 'Call com time',
      whenLine: 'Terça, 15 abr às 10:00',
      location: 'Escritório',
      participants: 'Alf, Yuri',
    });

    expect(msg).toContain('Achei o evento:');
    expect(msg).toContain('📌 *Call com time*');
    expect(msg).toContain('🕐 Terça, 15 abr às 10:00');
    expect(msg).toContain('📍 Escritório');
    expect(msg).toContain('👥 Alf, Yuri');
    expect(msg).toContain('Cancelo? (sim/não)');
    expect(msg).not.toContain('Alterações:');
  });

  it('applies actorDisplayName to participants in reschedule and cancel confirmations', () => {
    const event = {
      title: 'Sync',
      whenLine: 'Qua, 16 abr às 09:00',
      participants: 'você e Lu',
      actorDisplayName: 'Alf',
    };
    const rescheduleMsg = templateEventRescheduleConfirmation(event, ['🕐 Novo horário: 10:00']);
    const cancelMsg = templateEventCancelConfirmation(event);

    expect(rescheduleMsg).toContain('👥 Alf, Lu');
    expect(rescheduleMsg).not.toMatch(/👥[^\n]*\bvocê\b/);
    expect(cancelMsg).toContain('👥 Alf, Lu');
  });

  it('normalizes first-person in agenda subtitle when actor display name is provided', () => {
    const msg = templateAgendaList(
      [
        {
          agenda_item_type: 'canonical_event',
          origin_type: 'calendar_event',
          origin_id: '1',
          display_start_at: '2026-04-14T17:00:00.000Z',
          display_end_at: null,
          title: 'Call com time',
          subtitle: 'eu e Yuri',
          status: 'scheduled',
          badge: null,
          is_read_only: false,
          metadata: null,
        },
      ],
      'Hoje',
      {
        timeZone: 'America/Sao_Paulo',
        actorDisplayName: 'Alf',
      },
    );

    expect(msg).toContain('Alf, Yuri');
    expect(msg).not.toMatch(/\beu e Yuri\b/);
  });
});
