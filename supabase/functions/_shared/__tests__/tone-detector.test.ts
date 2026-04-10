import { describe, expect, it } from 'vitest';

import {
  detectToneSignals,
  deriveToneProfile,
  mergeToneIntoStyle,
  analyzeAndMergeTone,
} from '../tone-detector';

describe('tone-detector', () => {
  describe('detectToneSignals', () => {
    it('detects swear words', () => {
      const s = detectToneSignals('Porra, gastei 200 no mercado');
      expect(s.hasSwearWords).toBe(true);
    });

    it('detects slang', () => {
      const s = detectToneSignals('Coé aninha, bora ver meu saldo');
      expect(s.hasSlang).toBe(true);
    });

    it('detects formal greeting', () => {
      const s = detectToneSignals('Bom dia, Ana Clara. Poderia registrar uma despesa?');
      expect(s.hasFormalGreeting).toBe(true);
    });

    it('detects humor', () => {
      const s = detectToneSignals('Gastei tudo no bar kkkk');
      expect(s.hasHumor).toBe(true);
    });

    it('detects affection', () => {
      const s = detectToneSignals('Valeu aninha, te amo');
      expect(s.hasAffection).toBe(true);
    });

    it('detects emojis', () => {
      const s = detectToneSignals('Gastei 50 😂');
      expect(s.hasEmojis).toBe(true);
    });

    it('returns neutral for a plain message', () => {
      const s = detectToneSignals('gastei 50 no mercado');
      expect(s.hasSwearWords).toBe(false);
      expect(s.hasSlang).toBe(false);
      expect(s.hasFormalGreeting).toBe(false);
      expect(s.hasHumor).toBe(false);
    });
  });

  describe('deriveToneProfile', () => {
    it('marks informal when slang present', () => {
      const signals = detectToneSignals('Coé, bora resolver essa parada');
      const profile = deriveToneProfile(signals);
      expect(profile.formality).toBe('informal');
    });

    it('marks formal when formal greeting and no slang', () => {
      const signals = detectToneSignals('Bom dia, gostaria de registrar uma despesa por gentileza');
      const profile = deriveToneProfile(signals);
      expect(profile.formality).toBe('formal');
    });

    it('marks swearOk when swear words detected', () => {
      const signals = detectToneSignals('Porra, esqueci de pagar a conta');
      const profile = deriveToneProfile(signals);
      expect(profile.swearOk).toBe(true);
      expect(profile.formality).toBe('informal');
    });

    it('detects direct style for very short messages', () => {
      const signals = detectToneSignals('saldo nu');
      const profile = deriveToneProfile(signals);
      expect(profile.directness).toBe('direct');
    });

    it('neutral directness for normal length messages', () => {
      const signals = detectToneSignals('gastei 50 no mercado');
      const profile = deriveToneProfile(signals);
      expect(profile.directness).toBe('neutral');
    });
  });

  describe('mergeToneIntoStyle', () => {
    it('adds informal tag when missing', () => {
      const result = mergeToneIntoStyle(undefined, {
        formality: 'informal',
        swearOk: false,
        humor: false,
        affectionate: false,
        directness: 'neutral',
      });
      expect(result).toContain('informal');
    });

    it('adds swearOk tag', () => {
      const result = mergeToneIntoStyle('informal', {
        formality: 'informal',
        swearOk: true,
        humor: false,
        affectionate: false,
        directness: 'neutral',
      });
      expect(result).toContain('palavrao liberado');
    });

    it('returns null when no change needed', () => {
      const result = mergeToneIntoStyle('informal, palavrao liberado', {
        formality: 'informal',
        swearOk: true,
        humor: false,
        affectionate: false,
        directness: 'neutral',
      });
      expect(result).toBeNull();
    });

    it('replaces formal with informal when user shifts tone', () => {
      const result = mergeToneIntoStyle('formal', {
        formality: 'informal',
        swearOk: false,
        humor: false,
        affectionate: false,
        directness: 'neutral',
      });
      expect(result).toContain('informal');
      const tags = result!.split(',').map((s: string) => s.trim());
      expect(tags).not.toContain('formal');
    });

    it('accumulates multiple tags', () => {
      const result = mergeToneIntoStyle('informal', {
        formality: 'informal',
        swearOk: true,
        humor: true,
        affectionate: true,
        directness: 'direct',
      });
      expect(result).toContain('palavrao liberado');
      expect(result).toContain('humor');
      expect(result).toContain('carinhoso');
      expect(result).toContain('direto');
    });
  });

  describe('analyzeAndMergeTone', () => {
    it('detects informal swearing user from scratch', () => {
      const result = analyzeAndMergeTone('Porra, gastei 300 kkkk', undefined);
      expect(result).toContain('informal');
      expect(result).toContain('palavrao liberado');
      expect(result).toContain('humor');
    });

    it('detects formal user from scratch', () => {
      const result = analyzeAndMergeTone(
        'Bom dia, Ana Clara. Gostaria de saber meu saldo por gentileza.',
        undefined,
      );
      expect(result).toContain('formal');
      expect(result).not.toContain('palavrao liberado');
    });

    it('returns null for neutral messages when nothing new to add', () => {
      const result = analyzeAndMergeTone('gastei 50 no mercado', 'informal');
      expect(result).toBeNull();
    });

    it('adapts an existing formal user who starts swearing', () => {
      const result = analyzeAndMergeTone('Porra, esqueci de anotar', 'formal');
      expect(result).toContain('informal');
      expect(result).toContain('palavrao liberado');
      const tags = result!.split(',').map((s: string) => s.trim());
      expect(tags).not.toContain('formal');
    });
  });
});
