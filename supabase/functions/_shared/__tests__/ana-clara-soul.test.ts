import { describe, expect, it } from 'vitest';

import {
  buildSoulAboutSystem,
  buildSoulFallbackReply,
  buildSoulGreeting,
  DEFAULT_AUTONOMY,
  DEFAULT_SOUL,
  resolvePreferredFirstName,
  buildSoulPromptBlock,
} from '../ana-clara-soul';

describe('ana-clara-soul', () => {
  it('prefers first_name from user context over fallback name', () => {
    expect(
      resolvePreferredFirstName({ first_name: 'Alf', display_name: 'Luciano Alf' }, 'Luciano'),
    ).toBe('Alf');
  });

  it('builds a direct greeting instead of generic helpdesk text', () => {
    const greeting = buildSoulGreeting(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano', {
      firstContactToday: true,
      userMessage: 'oi aninha',
    });

    expect(greeting).toContain('Alf');
    expect(greeting).not.toMatch(/como posso te ajudar hoje|no que posso ajudar/i);
  });

  it('mirrors "coé" when the user greets with "coé"', () => {
    const greeting = buildSoulGreeting(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano', {
      userMessage: 'coé aninha',
    });

    expect(greeting).toMatch(/co[eé]/i);
  });

  it('does not force emoji when allowEmoji is false', () => {
    const greeting = buildSoulGreeting(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano', {
      userMessage: 'oi',
      allowEmoji: false,
    });

    expect(greeting).not.toContain('🙋🏻‍♀️');
  });

  it('includes emoji by default', () => {
    const greeting = buildSoulGreeting(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano', {
      firstContactToday: true,
    });

    expect(greeting).toContain('🙋🏻‍♀️');
  });

  it('builds an about-system reply without greeting prefix', () => {
    const reply = buildSoulAboutSystem(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano');

    expect(reply).toContain('Alf');
    expect(reply).toContain('sem papo de robô');
    expect(reply).not.toMatch(/^(Coé|Fala|E aí|Oi),/);
  });

  it('builds a direct fallback reply without greeting prefix', () => {
    const reply = buildSoulFallbackReply(DEFAULT_SOUL, { first_name: 'Alf' }, 'Luciano');

    expect(reply).toContain('Alf');
    expect(reply).not.toMatch(/como posso te ajudar|no que posso ajudar/i);
    expect(reply).toContain('não peguei direito');
  });

  it('injects an override section into the soul prompt block', () => {
    const block = buildSoulPromptBlock(DEFAULT_SOUL, { first_name: 'Alf' }, DEFAULT_AUTONOMY);

    expect(block).toContain('OVERRIDE DE PERSONALIDADE');
    expect(block).toContain('PRIORIDADE');
  });

  it('injects tone adaptation instructions when communication_style has palavrao liberado', () => {
    const block = buildSoulPromptBlock(
      DEFAULT_SOUL,
      { first_name: 'Alf', communication_style: 'informal, palavrao liberado' },
      DEFAULT_AUTONOMY,
    );

    expect(block).toContain('ADAPTAR TOM');
    expect(block).toContain('palavrões');
  });

  it('injects formal tone instructions for formal users', () => {
    const block = buildSoulPromptBlock(
      DEFAULT_SOUL,
      { first_name: 'Maria', communication_style: 'formal' },
      DEFAULT_AUTONOMY,
    );

    expect(block).toContain('ADAPTAR TOM');
    expect(block).toContain('formal');
  });
});
