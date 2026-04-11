/**
 * Configuração modo grupo Ana Clara — defaults da spec + merge com ana_clara_config (DB).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type ParticipantRule =
  | { kind: 'phone'; value: string }
  | { kind: 'name_contains'; value: string };

export interface AnaClaraGroupRuntimeConfig {
  is_enabled: boolean;
  enabled_group_jids: string[];
  group_label: string;
  allowed_participants: ParticipantRule[];
  agent_trigger_names: string[];
  dismiss_phrases: string[];
  group_session_timeout_minutes: number;
  group_memory_hours_back: number;
  group_memory_max_messages: number;
  group_memory_retention_days: number;
  auto_process_receipts: boolean;
  auto_execute_high_confidence_bill_payments: boolean;
}

const DEFAULT_CONFIG: AnaClaraGroupRuntimeConfig = {
  is_enabled: true,
  enabled_group_jids: ['5521981278047-1555326211@g.us'],
  group_label: 'CONTAS E COMPROVANTES',
  allowed_participants: [
    { kind: 'phone', value: '5521981278047' },
    { kind: 'phone', value: '5521966950296' },
    { kind: 'name_contains', value: 'alfredo' },
  ],
  agent_trigger_names: [
    'ana clara',
    'aninha',
    'clara',
    'clarinha',
  ],
  dismiss_phrases: [
    'valeu ana clara',
    'obrigado aninha',
    'obrigada aninha',
    'valeu clarinha',
    'obrigado clara',
    'obrigada clara',
    'fechou aninha',
    'pode dormir ana clara',
  ],
  group_session_timeout_minutes: 5,
  group_memory_hours_back: 72,
  group_memory_max_messages: 80,
  group_memory_retention_days: 14,
  auto_process_receipts: true,
  auto_execute_high_confidence_bill_payments: true,
};

export function mergeConfig(raw: Record<string, unknown> | null): AnaClaraGroupRuntimeConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const g = raw as Record<string, unknown>;
  return {
    is_enabled: typeof g.is_enabled === 'boolean' ? g.is_enabled : DEFAULT_CONFIG.is_enabled,
    enabled_group_jids: Array.isArray(g.enabled_group_jids)
      ? (g.enabled_group_jids as string[]).filter(Boolean)
      : DEFAULT_CONFIG.enabled_group_jids,
    group_label: typeof g.group_label === 'string' ? g.group_label : DEFAULT_CONFIG.group_label,
    allowed_participants: Array.isArray(g.allowed_participants)
      ? (g.allowed_participants as ParticipantRule[])
      : DEFAULT_CONFIG.allowed_participants,
    agent_trigger_names: Array.isArray(g.agent_trigger_names)
      ? (g.agent_trigger_names as string[]).map((s) => String(s).toLowerCase())
      : DEFAULT_CONFIG.agent_trigger_names,
    dismiss_phrases: Array.isArray(g.dismiss_phrases)
      ? (g.dismiss_phrases as string[]).map((s) => String(s).toLowerCase())
      : DEFAULT_CONFIG.dismiss_phrases,
    group_session_timeout_minutes:
      typeof g.group_session_timeout_minutes === 'number'
        ? g.group_session_timeout_minutes
        : DEFAULT_CONFIG.group_session_timeout_minutes,
    group_memory_hours_back:
      typeof g.group_memory_hours_back === 'number'
        ? g.group_memory_hours_back
        : DEFAULT_CONFIG.group_memory_hours_back,
    group_memory_max_messages:
      typeof g.group_memory_max_messages === 'number'
        ? g.group_memory_max_messages
        : DEFAULT_CONFIG.group_memory_max_messages,
    group_memory_retention_days:
      typeof g.group_memory_retention_days === 'number'
        ? g.group_memory_retention_days
        : DEFAULT_CONFIG.group_memory_retention_days,
    auto_process_receipts:
      typeof g.auto_process_receipts === 'boolean'
        ? g.auto_process_receipts
        : DEFAULT_CONFIG.auto_process_receipts,
    auto_execute_high_confidence_bill_payments:
      typeof g.auto_execute_high_confidence_bill_payments === 'boolean'
        ? g.auto_execute_high_confidence_bill_payments
        : DEFAULT_CONFIG.auto_execute_high_confidence_bill_payments,
  };
}

export async function loadAnaClaraGroupConfig(
  supabase: SupabaseClient,
  userId: string,
): Promise<AnaClaraGroupRuntimeConfig> {
  const { data, error } = await supabase
    .from('ana_clara_config')
    .select('is_enabled, config')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[ana-clara-group-config] load failed:', error.message);
    return { ...DEFAULT_CONFIG };
  }

  if (!data) {
    return { ...DEFAULT_CONFIG };
  }

  const base = mergeConfig((data.config as Record<string, unknown>) ?? {});
  return {
    ...base,
    is_enabled: data.is_enabled !== false && base.is_enabled,
  };
}

export function normalizeForTriggerMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function groupSessionPhoneKey(groupJid: string): string {
  return groupJid.replace(/@g\.us$/i, '').replace(/\D/g, '');
}

export function isParticipantAllowed(
  participantPhone: string,
  participantName: string | null | undefined,
  rules: ParticipantRule[],
): boolean {
  const phoneDigits = participantPhone.replace(/\D/g, '');
  const nameNorm = participantName ? normalizeForTriggerMatch(participantName) : '';
  for (const r of rules) {
    if (r.kind === 'phone') {
      const v = r.value.replace(/\D/g, '');
      if (
        v &&
        (phoneDigits === v || phoneDigits.endsWith(v) || v.endsWith(phoneDigits))
      ) {
        return true;
      }
    } else if (r.kind === 'name_contains' && nameNorm) {
      if (nameNorm.includes(normalizeForTriggerMatch(r.value))) return true;
    }
  }
  return false;
}

export function textContainsAgentTrigger(text: string, triggers: string[]): boolean {
  const n = normalizeForTriggerMatch(text);
  return triggers.some((trigger) => {
    const t = escapeRegExp(normalizeForTriggerMatch(trigger).trim());
    if (!t) return false;

    const directPatterns = [
      new RegExp(`^@?${t}(?:$|[\\s,!.?;:])`, 'i'),
      new RegExp(`^(?:oi|ola|fala|ei|opa|hey|e ai)\\s+@?${t}(?:$|[\\s,!.?;:])`, 'i'),
    ];

    return directPatterns.some((pattern) => pattern.test(n));
  });
}

export function isDismissPhrase(text: string, phrases: string[]): boolean {
  const n = normalizeForTriggerMatch(text);
  return phrases.some((p) => n.includes(normalizeForTriggerMatch(p)));
}

export function isEnabledGroupJid(groupJid: string, enabled: string[]): boolean {
  const g = groupJid.trim().toLowerCase();
  return enabled.some((j) => j.trim().toLowerCase() === g);
}
