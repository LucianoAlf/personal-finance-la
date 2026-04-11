import { describe, expect, it } from 'vitest';

import {
  applyStaleFactDecay,
  calculateReinforcementConfidence,
  getReinforcementEligibleTypes,
  shouldReinforceMemoryType,
} from '../agent-memory-reinforcement';

describe('agent-memory-reinforcement', () => {
  describe('getReinforcementEligibleTypes', () => {
    it('keeps stage 1 rollout limited to preferences', () => {
      expect(getReinforcementEligibleTypes('stage1')).toEqual(['preference']);
    });

    it('expands stage 2 rollout to preferences, patterns, and decisions', () => {
      expect(getReinforcementEligibleTypes('stage2')).toEqual([
        'preference',
        'pattern',
        'decision',
      ]);
    });
  });

  describe('shouldReinforceMemoryType', () => {
    it('allows only preference during stage 1', () => {
      expect(shouldReinforceMemoryType('preference', 'stage1')).toBe(true);
      expect(shouldReinforceMemoryType('pattern', 'stage1')).toBe(false);
      expect(shouldReinforceMemoryType('decision', 'stage1')).toBe(false);
    });

    it('allows preference, pattern, and decision during stage 2', () => {
      expect(shouldReinforceMemoryType('preference', 'stage2')).toBe(true);
      expect(shouldReinforceMemoryType('pattern', 'stage2')).toBe(true);
      expect(shouldReinforceMemoryType('decision', 'stage2')).toBe(true);
      expect(shouldReinforceMemoryType('lesson', 'stage2')).toBe(false);
    });
  });

  describe('calculateReinforcementConfidence', () => {
    it('uses predictable confidence steps as reinforcement grows', () => {
      expect(calculateReinforcementConfidence(1)).toBe(0.6);
      expect(calculateReinforcementConfidence(2)).toBe(0.72);
      expect(calculateReinforcementConfidence(3)).toBe(0.82);
      expect(calculateReinforcementConfidence(4)).toBe(0.9);
      expect(calculateReinforcementConfidence(8)).toBe(0.9);
    });
  });

  describe('applyStaleFactDecay', () => {
    it('decays stale preference confidence after 30 days', () => {
      const now = new Date('2026-04-10T12:00:00.000Z');
      const stale = new Date('2026-02-01T12:00:00.000Z');

      expect(
        applyStaleFactDecay({
          memoryType: 'preference',
          confidence: 0.82,
          lastReinforcedAt: stale.toISOString(),
          now,
        }),
      ).toBe(0.74);
    });

    it('does not decay decision memories', () => {
      const now = new Date('2026-04-10T12:00:00.000Z');
      const stale = new Date('2026-02-01T12:00:00.000Z');

      expect(
        applyStaleFactDecay({
          memoryType: 'decision',
          confidence: 0.82,
          lastReinforcedAt: stale.toISOString(),
          now,
        }),
      ).toBe(0.82);
    });

    it('respects the minimum confidence floor', () => {
      const now = new Date('2026-04-10T12:00:00.000Z');
      const stale = new Date('2025-12-01T12:00:00.000Z');

      expect(
        applyStaleFactDecay({
          memoryType: 'pattern',
          confidence: 0.38,
          lastReinforcedAt: stale.toISOString(),
          now,
        }),
      ).toBe(0.35);
    });

    it('keeps recent memories unchanged', () => {
      const now = new Date('2026-04-10T12:00:00.000Z');
      const fresh = new Date('2026-04-01T12:00:00.000Z');

      expect(
        applyStaleFactDecay({
          memoryType: 'preference',
          confidence: 0.72,
          lastReinforcedAt: fresh.toISOString(),
          now,
        }),
      ).toBe(0.72);
    });
  });
});
