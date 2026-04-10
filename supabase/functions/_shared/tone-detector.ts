/**
 * Passive tone detector — analyzes user messages and adapts Ana Clara's
 * communication_style in agent_identity over time.
 *
 * NOT a classifier that runs on every message. Accumulates signal over
 * multiple messages and only updates when confident about a shift.
 *
 * Tone categories (combinable):
 *   formal | informal | swear_ok | humor | direct | verbose | affectionate
 */

export interface ToneSignals {
  hasSwearWords: boolean;
  hasSlang: boolean;
  hasEmojis: boolean;
  hasFormalGreeting: boolean;
  hasHumor: boolean;
  hasAffection: boolean;
  avgWordLength: number;
  messageLength: number;
}

export interface ToneProfile {
  formality: 'formal' | 'neutral' | 'informal';
  swearOk: boolean;
  humor: boolean;
  affectionate: boolean;
  directness: 'direct' | 'neutral' | 'verbose';
}

const SWEAR_WORDS = [
  'porra', 'caralho', 'merda', 'foda', 'fodase', 'foda-se',
  'cacete', 'pqp', 'vsf', 'krl', 'mds', 'puts', 'viado',
  'piranha', 'desgraça', 'disgraça', 'fdp',
];

const SLANG_WORDS = [
  'coé', 'coe', 'mano', 'mana', 'véi', 'vei', 'tlg',
  'tmj', 'blz', 'vlw', 'flw', 'suave', 'de boa',
  'bora', 'aeee',
];

const SLANG_REGEX = [
  /\btô\b/, /\btá\b/, /\bné\b/, /\bpô\b/, /\bpo\b/, /\baí\b/,
  /kkkk+/, /haha/, /hehe/, /rsrs/,
];

const FORMAL_PATTERNS = [
  'bom dia', 'boa tarde', 'boa noite', 'por gentileza',
  'por favor', 'gostaria', 'poderia', 'seria possível',
  'prezado', 'prezada', 'atenciosamente', 'obrigado',
  'obrigada', 'agradeço',
];

const HUMOR_PATTERNS = [
  'kkk', 'haha', 'hehe', 'rsrs', '😂', '🤣', '😆',
  'zoeira', 'zueira', 'brincadeira', 'sacanagem',
];

const AFFECTION_PATTERNS = [
  'aninha', 'querida', 'linda', 'amor', 'fofa',
  'obrigadão', 'valeu demais', 'te amo', '❤️', '🥰', '😘',
];

export function detectToneSignals(message: string): ToneSignals {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = lower.split(/\s+/).filter(Boolean);

  const hasSlang =
    SLANG_WORDS.some((w) => lower.includes(w)) ||
    SLANG_REGEX.some((r) => r.test(lower));

  return {
    hasSwearWords: SWEAR_WORDS.some((w) => lower.includes(w)),
    hasSlang,
    hasEmojis: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(message),
    hasFormalGreeting: FORMAL_PATTERNS.some((p) => lower.includes(p)),
    hasHumor: HUMOR_PATTERNS.some((p) => lower.includes(p)),
    hasAffection: AFFECTION_PATTERNS.some((p) => lower.includes(p)),
    avgWordLength: words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0,
    messageLength: message.length,
  };
}

export function deriveToneProfile(signals: ToneSignals): ToneProfile {
  let formality: ToneProfile['formality'] = 'neutral';
  if (signals.hasFormalGreeting && !signals.hasSlang && !signals.hasSwearWords) {
    formality = 'formal';
  } else if (signals.hasSlang || signals.hasSwearWords) {
    formality = 'informal';
  }

  let directness: ToneProfile['directness'] = 'neutral';
  if (signals.messageLength < 15) {
    directness = 'direct';
  } else if (signals.messageLength > 200 && signals.avgWordLength > 5) {
    directness = 'verbose';
  }

  return {
    formality,
    swearOk: signals.hasSwearWords,
    humor: signals.hasHumor,
    affectionate: signals.hasAffection,
    directness,
  };
}

/**
 * Merge a new tone profile into the existing communication_style string.
 * The existing style acts as accumulated knowledge; new signals adjust it.
 * Returns null if no meaningful change detected (avoid unnecessary DB writes).
 */
export function mergeToneIntoStyle(
  existingStyle: string | undefined,
  newProfile: ToneProfile,
): string | null {
  const parts = new Set(
    (existingStyle || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  let changed = false;

  const applyTag = (condition: boolean, tag: string, antiTags?: string[]) => {
    if (condition && !parts.has(tag)) {
      parts.add(tag);
      if (antiTags) antiTags.forEach((a) => parts.delete(a));
      changed = true;
    }
  };

  applyTag(newProfile.formality === 'informal', 'informal', ['formal']);
  applyTag(newProfile.formality === 'formal', 'formal', ['informal']);
  applyTag(newProfile.swearOk, 'palavrao liberado');
  applyTag(newProfile.humor, 'humor');
  applyTag(newProfile.affectionate, 'carinhoso');
  applyTag(newProfile.directness === 'direct', 'direto', ['detalhista']);
  applyTag(newProfile.directness === 'verbose', 'detalhista', ['direto']);

  if (!changed) return null;

  return Array.from(parts).join(', ');
}

/**
 * Full pipeline: analyze message, merge into existing style, return updated
 * style string or null if no update needed.
 */
export function analyzeAndMergeTone(
  message: string,
  existingStyle?: string,
): string | null {
  const signals = detectToneSignals(message);
  const profile = deriveToneProfile(signals);
  return mergeToneIntoStyle(existingStyle, profile);
}
