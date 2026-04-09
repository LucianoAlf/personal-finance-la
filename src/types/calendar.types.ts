// src/types/calendar.types.ts
// TypeScript interfaces for Calendar/Agenda V1 domain

// ==================== ENUMS ====================

export type CalendarEventStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

/** Categorias de agenda para UI (criação manual); não inclui rotas financeiras canônicas. */
export type EventKind = 'personal' | 'work' | 'mentoring';

export type CalendarEventSource = 'internal' | 'external';

/** Prioridade exibida/sincronizada via `metadata.priority` no evento canônico. */
export type EventPriority = 'low' | 'medium' | 'high';

/**
 * Distingue intenção de lembrete no cliente. O servidor V1 persiste apenas offsets relativos ao início;
 * `absolute` não implica paridade com provedores externos nem persistência de horário absoluto.
 */
export type ReminderType = 'relative' | 'absolute';

export type CalendarEventCreatedBy = 'user' | 'ana_clara' | 'system';

export type CalendarRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Frequências persistidas no domínio atual de agenda/recorrência. */
export type CalendarRecurrenceFrequencyV1 = CalendarRecurrenceFrequency;

/** Metadados extras em itens de agenda gerados a partir de série recorrente (`get_agenda_window`). */
export interface CalendarAgendaRecurringMetadata {
  event_id: string;
  occurrence_key: string;
  is_recurring: true;
  original_start_at: string;
  override_id: string | null;
  series_frequency: string;
}

export type CalendarReminderKind = 'default' | 'prep' | 'deadline';

export type CalendarSyncJobStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'skipped_unsupported';

export type CalendarSyncJobType = 'upsert_event' | 'upsert_occurrence_override' | 'cancel_occurrence' | 'delete_event';

export type CalendarReminderChannel = 'whatsapp' | 'email' | 'push';

export type CalendarReminderDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

// ==================== ENTITIES ====================

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_kind: string;
  domain_type: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: CalendarEventStatus;
  location_text: string | null;
  source: CalendarEventSource;
  created_by: CalendarEventCreatedBy;
  sync_eligible: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CalendarEventRecurrenceRule {
  id: string;
  event_id: string;
  frequency: CalendarRecurrenceFrequency;
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  starts_at: string;
  until_at: string | null;
  count_limit: number | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventOccurrenceOverride {
  id: string;
  event_id: string;
  occurrence_key: string;
  original_start_at: string;
  override_start_at: string | null;
  override_end_at: string | null;
  status: CalendarEventStatus | null;
  title_override: string | null;
  description_override: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventReminder {
  id: string;
  event_id: string;
  reminder_kind: CalendarReminderKind;
  remind_offset_minutes: number;
  /** Opcional: linhas legadas / futuras leituras; RPC V1 de escrita usa só offset relativo. */
  reminder_type?: ReminderType;
  channel_policy: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarExternalEventLink {
  id: string;
  event_id: string;
  provider: string;
  provider_account_id: string | null;
  external_object_id: string;
  external_list_id: string | null;
  external_parent_id: string | null;
  external_series_id: string | null;
  sync_direction: 'outbound';
  sync_status: string;
  last_synced_at: string | null;
  last_error: string | null;
  external_payload_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncJob {
  id: string;
  user_id: string;
  event_id: string;
  occurrence_override_id: string | null;
  occurrence_key: string | null;
  provider: string;
  job_type: CalendarSyncJobType;
  idempotency_key: string;
  payload_hash: string | null;
  status: CalendarSyncJobStatus;
  attempt_count: number;
  run_after: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarReminderSchedule {
  id: string;
  event_id: string;
  reminder_id: string;
  occurrence_key: string;
  fire_at: string;
  delivery_status: CalendarReminderDeliveryStatus;
  delivered_at: string | null;
  channel: CalendarReminderChannel;
  idempotency_key: string;
  created_at: string;
}

// ==================== AGENDA WINDOW ====================

export type AgendaItemType = 'canonical_event' | 'derived_projection';

export type AgendaOriginType = 'calendar_event' | 'payable_bill' | 'bill_reminder' | 'financial_cycle';

export interface AgendaItem {
  agenda_item_type: AgendaItemType;
  origin_type: AgendaOriginType;
  origin_id: string;
  dedup_key: string;
  display_start_at: string;
  display_end_at: string | null;
  title: string;
  subtitle: string | null;
  status: string;
  badge: string | null;
  edit_route: string | null;
  is_read_only: boolean;
  supports_reschedule: boolean;
  supports_complete: boolean;
  metadata: Record<string, unknown> | null;
}

// ==================== INPUT TYPES ====================

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  event_kind?: EventKind;
  domain_type?: string;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  timezone?: string;
  status?: CalendarEventStatus;
  location_text?: string;
  created_by?: CalendarEventCreatedBy;
  sync_eligible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  event_kind?: EventKind;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  status?: CalendarEventStatus;
  location_text?: string;
  sync_eligible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgendaWindowParams {
  from: string;
  to: string;
  timezone?: string;
}

export interface SetEventRemindersInput {
  event_id: string;
  reminders: Array<{
    reminder_kind?: CalendarReminderKind;
    remind_offset_minutes: number;
    channel_policy?: string;
    enabled?: boolean;
    reminder_type?: ReminderType;
  }>;
}
