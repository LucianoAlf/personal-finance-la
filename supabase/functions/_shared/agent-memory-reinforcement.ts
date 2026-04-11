import type { MemoryType } from './agent-memory.ts';

export type ReinforcementRolloutStage = 'stage1' | 'stage2';

const STAGE1_MEMORY_TYPES: MemoryType[] = ['preference'];
const STAGE2_MEMORY_TYPES: MemoryType[] = ['preference', 'pattern', 'decision'];
const DECAYABLE_MEMORY_TYPES = new Set<MemoryType>(['preference', 'pattern']);
const DECAY_AFTER_DAYS = 30;
const DECAY_STEP = 0.08;
const MIN_CONFIDENCE = 0.35;

export function getReinforcementEligibleTypes(
  stage: ReinforcementRolloutStage,
): MemoryType[] {
  return stage === 'stage2' ? [...STAGE2_MEMORY_TYPES] : [...STAGE1_MEMORY_TYPES];
}

export function shouldReinforceMemoryType(
  memoryType: MemoryType,
  stage: ReinforcementRolloutStage,
): boolean {
  return getReinforcementEligibleTypes(stage).includes(memoryType);
}

export function calculateReinforcementConfidence(
  reinforcementCount: number,
): number {
  if (reinforcementCount <= 1) return 0.6;
  if (reinforcementCount === 2) return 0.72;
  if (reinforcementCount === 3) return 0.82;
  return 0.9;
}

interface DecayInput {
  memoryType: MemoryType;
  confidence: number;
  lastReinforcedAt?: string | null;
  now?: Date;
}

export function applyStaleFactDecay({
  memoryType,
  confidence,
  lastReinforcedAt,
  now = new Date(),
}: DecayInput): number {
  if (!DECAYABLE_MEMORY_TYPES.has(memoryType) || !lastReinforcedAt) {
    return roundConfidence(confidence);
  }

  const reinforcedAt = new Date(lastReinforcedAt);
  if (Number.isNaN(reinforcedAt.getTime())) {
    return roundConfidence(confidence);
  }

  const elapsedMs = now.getTime() - reinforcedAt.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  if (elapsedDays < DECAY_AFTER_DAYS) {
    return roundConfidence(confidence);
  }

  return roundConfidence(Math.max(MIN_CONFIDENCE, confidence - DECAY_STEP));
}

function roundConfidence(value: number): number {
  return Math.round(value * 1000) / 1000;
}
