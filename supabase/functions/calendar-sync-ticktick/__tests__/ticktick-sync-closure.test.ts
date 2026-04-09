import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  processUnlinkedInboundTask,
  resolveInboundSyncProjectIds,
  shouldSweepLinkForRemoteDeleted,
} from '../inbound-worker';
import { processOutboundUpsertLink } from '../outbound-worker';
import {
  assertCalendarExternalLinkWriteSucceeded,
  buildOutboundRecurrenceEnrichment,
  buildCalendarEventOutboundPushObservationUpdate,
  buildCalendarEventConflictObservationUpdate,
  buildCalendarEventConflictRepairJob,
  buildHandleUpsertLinkWrite,
  buildInboundCanonicalUpdateFailureObservationUpdate,
  buildInboundHealSuccessLinkUpdate,
  buildPayableBillInboundUpdateObservationUpdate,
  buildRemoteDeletedRecoveryObservationUpdate,
  buildInboundRecurrenceMetadataMutation,
  buildInboundExtrasPersistenceResult,
  buildInboundExtrasFailureObservationUpdate,
  buildExternalPayloadHash,
  buildInboundMetadataMutation,
  buildPayableBillConflictObservationUpdate,
  buildPayableBillOutboundPushObservationUpdate,
  buildTickTickPayload,
  calendarRecurrenceRowToFields,
  DEFAULT_TICKTICK_PROJECT_ID,
  hashableFieldsForOutboundSync,
  hashableTaskFromInbound,
  isoTimestamptzToRruleUntil,
  normalizeTickTickContentFields,
  resolveTickTickProjectIdForEventKind,
  recurrenceFieldsToRrule,
  resolveInboundCalendarEventKind,
  shouldRouteInboundTaskToFinancialSurface,
  resolveInboundRecurrenceMutation,
  resolveOutboundRepeatFlagContract,
  resolveHashBasedSyncAction,
  shouldCompensateRemoteCreateAfterLinkWriteFailure,
  type CalendarEventForSync,
  type TickTickOutboundEnrichment,
  type TickTickTaskInbound,
} from '../ticktick-mapping';

function makeEvent(overrides: Partial<CalendarEventForSync> = {}): CalendarEventForSync {
  return {
    id: 'evt-001',
    title: 'Consulta smoke',
    description: null,
    start_at: '2026-04-10T12:00:00.000Z',
    end_at: '2026-04-10T13:00:00.000Z',
    all_day: false,
    timezone: 'America/Sao_Paulo',
    status: 'scheduled',
    location_text: null,
    event_kind: 'personal',
    sync_eligible: true,
    deleted_at: null,
    metadata: {},
    ...overrides,
  };
}

describe('ticktick-sync-closure (outbound enrichment)', () => {
  it('buildTickTickPayload adds reminders as TRIGGER array (relative only)', () => {
    const event = makeEvent();
    const enrichment: TickTickOutboundEnrichment = {
      relativeReminderTriggers: ['TRIGGER:P0DT1H0M0S', 'TRIGGER:PT30M0S'],
    };
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, undefined, enrichment);
    expect(payload.reminders).toEqual(['TRIGGER:P0DT1H0M0S', 'TRIGGER:PT30M0S']);
  });

  it('buildTickTickPayload omits reminders when enrichment list is empty', () => {
    const event = makeEvent();
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, undefined, {
      relativeReminderTriggers: [],
    });
    expect(payload.reminders).toBeUndefined();
  });

  it('buildTickTickPayload adds repeatFlag from RRULE string', () => {
    const event = makeEvent();
    const rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU';
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, 'tid-1', {
      repeatFlag: rrule,
    });
    expect(payload.repeatFlag).toBe(rrule);
    expect(payload.id).toBe('tid-1');
  });

  it('buildTickTickPayload expresses explicit recurrence-clear intent for existing tasks', () => {
    const event = makeEvent();
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, 'tid-1', {
      explicitRepeatFlagClear: true,
    });
    expect(payload.repeatFlag).toBe('');
  });

  it('resolveOutboundRepeatFlagContract returns clear token only for explicit clear intent', () => {
    expect(resolveOutboundRepeatFlagContract({ explicitRepeatFlagClear: true })).toBe('');
    expect(resolveOutboundRepeatFlagContract({ repeatFlag: null })).toBeUndefined();
  });

  it('buildOutboundRecurrenceEnrichment only clears remote recurrence when local absence is confirmed', () => {
    expect(
      buildOutboundRecurrenceEnrichment({
        isExistingTask: true,
        recurrenceReadState: 'absent',
        repeatFlag: null,
      }),
    ).toEqual({
      repeatFlag: undefined,
      explicitRepeatFlagClear: true,
    });

    expect(
      buildOutboundRecurrenceEnrichment({
        isExistingTask: true,
        recurrenceReadState: 'error',
        repeatFlag: null,
      }),
    ).toEqual({
      repeatFlag: undefined,
      explicitRepeatFlagClear: false,
    });

    expect(
      buildOutboundRecurrenceEnrichment({
        isExistingTask: true,
        recurrenceReadState: 'present_unserializable',
        repeatFlag: null,
      }),
    ).toEqual({
      repeatFlag: undefined,
      explicitRepeatFlagClear: false,
    });
  });

  it('buildTickTickPayload adds TickTick numeric priority', () => {
    const event = makeEvent({ metadata: { priority: 'high' } });
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, undefined, {
      priority: 5,
    });
    expect(payload.priority).toBe(5);
  });

  it('buildTickTickPayload includes TickTick completion status for completed events', () => {
    const event = makeEvent({ status: 'completed' });
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);
    expect(payload.status).toBe(2);
  });

  it('buildTickTickPayload carries TickTick tags from event metadata when present', () => {
    const event = makeEvent({ metadata: { ticktick_tags: ['energia', 'casa'] } });
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);
    expect(payload.tags).toEqual(['energia', 'casa']);
  });

  it('hashableFieldsForOutboundSync matches formatted dates used in payload', () => {
    const event = makeEvent();
    const triggers = ['TRIGGER:PT1H0M0S'];
    const hf = hashableFieldsForOutboundSync({
      event,
      projectId: DEFAULT_TICKTICK_PROJECT_ID,
      relativeReminderTriggers: triggers,
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
      tickTickPriority: 3,
    });
    const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, undefined, {
      relativeReminderTriggers: triggers,
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
      priority: 3,
    });
    expect(hf.startDate).toBe(payload.startDate);
    expect(hf.dueDate).toBe(payload.dueDate);
    expect(buildExternalPayloadHash(hf)).toBe(buildExternalPayloadHash(hf));
  });

  it('hash stays aligned across outbound and inbound snapshots for description, all-day, and timezone', () => {
    const event = makeEvent({
      description: 'Bring documents',
      all_day: true,
      timezone: 'UTC',
    });
    const outbound = hashableFieldsForOutboundSync({
      event,
      projectId: 'p1',
      relativeReminderTriggers: ['TRIGGER:PT0S'],
      repeatFlag: null,
      tickTickPriority: 0,
    });
    const inbound = hashableTaskFromInbound({
      id: 'tt-2',
      title: event.title,
      content: 'Bring documents',
      startDate: String(outbound.startDate),
      dueDate: String(outbound.dueDate),
      isAllDay: true,
      timeZone: 'UTC',
      projectId: 'p1',
      status: 0,
      reminders: ['TRIGGER:PT0S'],
      priority: 0,
    });

    expect(buildExternalPayloadHash(inbound)).toBe(buildExternalPayloadHash(outbound));
  });
});

describe('ticktick-sync-closure (DB recurrence -> RRULE)', () => {
  it('calendarRecurrenceRowToFields maps until_at to RRULE UNTIL compact form', () => {
    const fields = calendarRecurrenceRowToFields({
      frequency: 'weekly',
      interval_value: 1,
      by_weekday: ['MO'],
      by_monthday: null,
      until_at: '2026-12-31T23:59:59.000Z',
      count_limit: null,
    });
    expect(fields).not.toBeNull();
    const rrule = recurrenceFieldsToRrule(fields!);
    expect(rrule).toContain('UNTIL=20261231T235959Z');
  });

  it('isoTimestamptzToRruleUntil produces valid compact UTC (matches RRULE UNTIL token)', () => {
    expect(isoTimestamptzToRruleUntil('2026-06-15T14:30:00.000Z')).toBe('20260615T143000Z');
  });
});

describe('ticktick-sync-closure (hash-based inbound)', () => {
  const taskBase: TickTickTaskInbound = {
    id: 'tt-1',
    title: 'Meet',
    startDate: '2026-04-10T12:00:00+0000',
    dueDate: '2026-04-10T13:00:00+0000',
    projectId: 'p1',
    status: 0,
    repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
    reminders: ['TRIGGER:PT1H0M0S'],
    priority: 5,
  };

  it('hashableTaskFromInbound preserves fields for hashing', () => {
    const h = hashableTaskFromInbound(taskBase);
    expect(h.repeatFlag).toContain('RRULE');
    expect(h.reminders).toHaveLength(1);
    expect(h.priority).toBe(5);
  });

  it('buildExternalPayloadHash is stable for identical snapshots', () => {
    const a = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const b = buildExternalPayloadHash(hashableTaskFromInbound({ ...taskBase }));
    expect(a).toBe(b);
  });

  it('buildExternalPayloadHash changes when reminders differ', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(
      hashableTaskFromInbound({ ...taskBase, reminders: ['TRIGGER:PT30M0S'] }),
    );
    expect(h1).not.toBe(h2);
  });

  it('buildExternalPayloadHash changes when description differs', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(
      hashableTaskFromInbound({ ...taskBase, content: 'different description' }),
    );
    expect(h1).not.toBe(h2);
  });

  it('hashableTaskFromInbound preserves combined content and desc when both exist', () => {
    const combined = hashableTaskFromInbound({
      ...taskBase,
      content: 'Primary body',
      desc: 'Secondary notes',
    });
    expect(combined.content).toBe('Primary body\n\nSecondary notes');
  });

  it('normalizeTickTickContentFields keeps desc-only payloads from duplicating description', () => {
    expect(normalizeTickTickContentFields({ desc: 'Secondary notes' })).toEqual({
      content: undefined,
      desc: 'Secondary notes',
    });
  });

  it('buildExternalPayloadHash changes when all-day differs', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(hashableTaskFromInbound({ ...taskBase, isAllDay: true }));
    expect(h1).not.toBe(h2);
  });

  it('buildExternalPayloadHash changes when timezone differs', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(
      hashableTaskFromInbound({ ...taskBase, timeZone: 'UTC' }),
    );
    expect(h1).not.toBe(h2);
  });

  it('buildExternalPayloadHash changes when TickTick task moves to another project/list', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(
      hashableTaskFromInbound({ ...taskBase, projectId: 'p2' }),
    );
    expect(h1).not.toBe(h2);
  });

  it('buildExternalPayloadHash changes when completion state changes', () => {
    const h1 = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const h2 = buildExternalPayloadHash(hashableTaskFromInbound({ ...taskBase, status: 2 }));
    expect(h1).not.toBe(h2);
  });

  it('resolveHashBasedSyncAction treats null storedHash as remote changed', () => {
    const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    expect(
      resolveHashBasedSyncAction({
        storedHash: null,
        currentHash,
        localUpdatedAt: '2026-04-01T00:00:00.000Z',
        lastSyncedAt: '2026-04-02T00:00:00.000Z',
      }),
    ).toBe('inbound_update');
  });

  it('resolveHashBasedSyncAction returns no_change when hash matches and local not ahead of sync', () => {
    const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    expect(
      resolveHashBasedSyncAction({
        storedHash: currentHash,
        currentHash,
        localUpdatedAt: '2026-04-01T00:00:00.000Z',
        lastSyncedAt: '2026-04-02T00:00:00.000Z',
      }),
    ).toBe('no_change');
  });

  it('resolveHashBasedSyncAction retries inbound when partial_failed requires healing for same snapshot', () => {
    const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    expect(
      resolveHashBasedSyncAction({
        storedHash: currentHash,
        currentHash,
        localUpdatedAt: '2026-04-01T00:00:00.000Z',
        lastSyncedAt: '2026-04-02T00:00:00.000Z',
        forceRemoteRetry: true,
      }),
    ).toBe('inbound_update');
  });

  it('resolveHashBasedSyncAction returns outbound_push when only local changed', () => {
    const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    expect(
      resolveHashBasedSyncAction({
        storedHash: currentHash,
        currentHash,
        localUpdatedAt: '2026-04-10T00:00:00.000Z',
        lastSyncedAt: '2026-04-01T00:00:00.000Z',
      }),
    ).toBe('outbound_push');
  });

  it('resolveHashBasedSyncAction returns conflict when both sides changed', () => {
    const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(taskBase));
    const otherHash = buildExternalPayloadHash(
      hashableTaskFromInbound({ ...taskBase, title: 'Other' }),
    );
    expect(
      resolveHashBasedSyncAction({
        storedHash: currentHash,
        currentHash: otherHash,
        localUpdatedAt: '2026-04-10T00:00:00.000Z',
        lastSyncedAt: '2026-04-01T00:00:00.000Z',
      }),
    ).toBe('conflict');
  });
});

describe('ticktick-sync-closure (inbound clearing semantics)', () => {
  it('resolveInboundRecurrenceMutation clears recurrence when repeatFlag is absent', () => {
    expect(resolveInboundRecurrenceMutation({})).toEqual({ action: 'clear' });
  });

  it('resolveInboundRecurrenceMutation parses repeatFlag when present', () => {
    expect(
      resolveInboundRecurrenceMutation({ repeatFlag: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO' }),
    ).toEqual({
      action: 'set',
      fields: {
        frequency: 'weekly',
        interval_value: 1,
        by_weekday: ['MO'],
        by_monthday: null,
        until_at: null,
        count_limit: null,
      },
    });
  });

  it('buildInboundMetadataMutation clears priority when omitted or reset to zero', () => {
    expect(buildInboundMetadataMutation({})).toEqual({
      set: {},
      unset: ['priority', 'ticktick_tags'],
    });
    expect(buildInboundMetadataMutation({ priority: 0 })).toEqual({
      set: {},
      unset: ['priority', 'ticktick_tags'],
    });
  });

  it('buildInboundMetadataMutation sets mapped priority label when provided', () => {
    expect(buildInboundMetadataMutation({ priority: 5 })).toEqual({
      set: { priority: 'high' },
      unset: ['ticktick_tags'],
    });
  });

  it('buildInboundMetadataMutation stores TickTick tags when present', () => {
    expect(buildInboundMetadataMutation({ priority: 0, tags: ['energia', 'casa'] })).toEqual({
      set: { ticktick_tags: ['energia', 'casa'] },
      unset: ['priority'],
    });
  });

  it('buildInboundRecurrenceMetadataMutation marks unsupported RRULE imports and clears stale marker otherwise', () => {
    expect(
      buildInboundRecurrenceMetadataMutation({
        action: 'unsupported',
        repeatFlag: 'RRULE:FREQ=MONTHLY;BYSETPOS=2;BYDAY=TU',
      }),
    ).toEqual({
      set: {
        ticktick_rrule_import_status: 'unsupported_v1',
        ticktick_rrule_unsupported_raw: 'RRULE:FREQ=MONTHLY;BYSETPOS=2;BYDAY=TU',
      },
      unset: [],
    });

    expect(
      buildInboundRecurrenceMetadataMutation({
        action: 'clear',
      }),
    ).toEqual({
      set: {},
      unset: ['ticktick_rrule_import_status', 'ticktick_rrule_unsupported_raw'],
    });
  });
});

describe('ticktick-sync-closure (conservative worker helpers)', () => {
  it('assertCalendarExternalLinkWriteSucceeded throws when link mutation failed', () => {
    expect(() =>
      assertCalendarExternalLinkWriteSucceeded('upsert', 'duplicate key value violates unique constraint'),
    ).toThrow('calendar_external_event_links_upsert_failed');
  });

  it('buildInboundExtrasPersistenceResult marks failed extra steps', () => {
    expect(
      buildInboundExtrasPersistenceResult({
        recurrenceOk: false,
        remindersOk: true,
        metadataOk: false,
      }),
    ).toEqual({
      success: false,
      failedSteps: ['recurrence', 'metadata'],
    });
  });

  it('buildInboundExtrasFailureObservationUpdate keeps link baseline unresolved', () => {
    const update = buildInboundExtrasFailureObservationUpdate(
      '2026-04-10T12:00:00.000Z',
      'hash-current',
      '2026-04-10T12:05:00.000Z',
      ['recurrence', 'metadata'],
    );
    expect(update).toEqual({
      sync_status: 'partial_failed',
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_synced_at: '2026-04-10T12:05:00.000Z',
      external_payload_hash: 'hash-current',
      last_error: 'inbound_extras_persist_failed:recurrence,metadata',
    });
  });

  it('buildInboundHealSuccessLinkUpdate clears partial_failed markers after a successful heal', () => {
    const update = buildInboundHealSuccessLinkUpdate(
      '2026-04-10T12:00:00.000Z',
      'hash-current',
      'list-123',
      '2026-04-10T12:05:00.000Z',
    );
    expect(update).toEqual({
      sync_status: 'synced',
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_synced_at: '2026-04-10T12:05:00.000Z',
      external_list_id: 'list-123',
      external_payload_hash: 'hash-current',
      last_error: null,
    });
  });

  it('buildHandleUpsertLinkWrite preserves existing bidirectional sync_direction', () => {
    const update = buildHandleUpsertLinkWrite({
      eventId: 'evt-1',
      taskId: 'tt-1',
      listId: 'list-1',
      outboundHash: 'hash-1',
      observedAt: '2026-04-10T12:05:00.000Z',
      existingSyncDirection: 'bidirectional',
    });
    expect(update.sync_direction).toBe('bidirectional');
  });

  it('buildHandleUpsertLinkWrite defaults new outbound links to outbound sync_direction', () => {
    const update = buildHandleUpsertLinkWrite({
      eventId: 'evt-1',
      taskId: 'tt-1',
      listId: 'list-1',
      outboundHash: 'hash-1',
      observedAt: '2026-04-10T12:05:00.000Z',
      existingSyncDirection: null,
    });
    expect(update.sync_direction).toBe('outbound');
  });

  it('buildRemoteDeletedRecoveryObservationUpdate keeps recovery unresolved until later success path', () => {
    const update = buildRemoteDeletedRecoveryObservationUpdate('2026-04-10T12:00:00.000Z');
    expect(update).toEqual({
      sync_status: 'remote_deleted',
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'remote_deleted_recovery_pending_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('buildInboundCanonicalUpdateFailureObservationUpdate keeps inbound canonical write failures visible without acknowledging sync', () => {
    const update = buildInboundCanonicalUpdateFailureObservationUpdate(
      '2026-04-10T12:00:00.000Z',
      'calendar_event',
      'write failed',
    );
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'inbound_calendar_event_update_failed:write failed',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('resolveInboundCalendarEventKind defaults unmapped lists to external', () => {
    expect(
      resolveInboundCalendarEventKind({
        mappedEventKind: undefined,
        currentEventKind: 'personal',
        remoteTitle: 'Reunião com cliente',
      }),
    ).toBe('external');
  });

  it('resolveInboundCalendarEventKind preserves existing calendar ownership for financial-looking remotes', () => {
    expect(
      resolveInboundCalendarEventKind({
        mappedEventKind: 'financial',
        currentEventKind: 'work',
        remoteTitle: 'Reunião com cliente',
      }),
    ).toBe('work');
    expect(
      resolveInboundCalendarEventKind({
        mappedEventKind: 'external',
        currentEventKind: 'mentoring',
        remoteTitle: 'Pagar boleto',
      }),
    ).toBe('mentoring');
  });

  it('shouldRouteInboundTaskToFinancialSurface routes neutral titles on financial-mapped projects to payable_bills', () => {
    expect(
      shouldRouteInboundTaskToFinancialSurface({
        mappedEventKind: 'financial',
        remoteTitle: 'Consulta com cliente',
      }),
    ).toBe(true);
    expect(
      shouldRouteInboundTaskToFinancialSurface({
        mappedEventKind: 'external',
        remoteTitle: 'Consulta com cliente',
      }),
    ).toBe(false);
  });

  it('shouldCompensateRemoteCreateAfterLinkWriteFailure only compensates fresh creates', () => {
    expect(shouldCompensateRemoteCreateAfterLinkWriteFailure(false)).toBe(true);
    expect(shouldCompensateRemoteCreateAfterLinkWriteFailure(true)).toBe(false);
  });

  it('buildCalendarEventOutboundPushObservationUpdate leaves event outbound repair unresolved', () => {
    const update = buildCalendarEventOutboundPushObservationUpdate('2026-04-10T12:00:00.000Z');
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'calendar_event_outbound_repair_pending_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('buildCalendarEventConflictRepairJob makes the repair idempotency key conflict-instance-specific', () => {
    const a = buildCalendarEventConflictRepairJob({
      userId: 'user-1',
      eventId: 'evt-1',
      externalObjectId: 'tt-1',
      currentHash: 'hash-a',
      remoteModified: '2026-04-10T12:00:00.000Z',
      runAfterIso: '2026-04-10T12:05:00.000Z',
    });
    const b = buildCalendarEventConflictRepairJob({
      userId: 'user-1',
      eventId: 'evt-1',
      externalObjectId: 'tt-1',
      currentHash: 'hash-b',
      remoteModified: '2026-04-10T12:00:00.000Z',
      runAfterIso: '2026-04-10T12:05:00.000Z',
    });

    expect(a.idempotency_key).not.toBe(b.idempotency_key);
    expect(a.idempotency_key).toContain('hash-a');
    expect(a.idempotency_key).toContain('2026-04-10T12:00:00.000Z');
  });

  it('buildCalendarEventConflictObservationUpdate leaves the link unresolved', () => {
    const update = buildCalendarEventConflictObservationUpdate('2026-04-10T12:00:00.000Z');
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'calendar_event_conflict_repair_pending_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('buildPayableBillOutboundPushObservationUpdate only records observational metadata', () => {
    const update = buildPayableBillOutboundPushObservationUpdate('2026-04-10T12:00:00.000Z');
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'payable_bill_outbound_sync_not_supported_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('buildPayableBillConflictObservationUpdate leaves conflict unresolved without fake parity', () => {
    const update = buildPayableBillConflictObservationUpdate('2026-04-10T12:00:00.000Z');
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      last_error: 'payable_bill_conflict_unresolved_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });

  it('buildPayableBillInboundUpdateObservationUpdate keeps financial-linked remote edits observational only', () => {
    const update = buildPayableBillInboundUpdateObservationUpdate('2026-04-10T12:00:00.000Z', 'list-2');
    expect(update).toEqual({
      last_remote_updated_at: '2026-04-10T12:00:00.000Z',
      external_list_id: 'list-2',
      last_error: 'payable_bill_inbound_update_not_supported_v1',
    });
    expect('last_synced_at' in update).toBe(false);
    expect('external_payload_hash' in update).toBe(false);
  });
});

describe('ticktick-sync-closure (index wiring)', () => {
  it('index.ts checks calendar event update errors before advancing link baselines', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toMatch(
      /const\s+\{\s*error:\s*eventUpdateError\s*\}\s*=\s*await\s+supabase[\s\S]*?from\('calendar_events'\)[\s\S]*?if\s*\(eventUpdateError\)/,
    );
  });

  it('index.ts allows recurrence set to drop existing reminders before reapplying remote reminders', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toMatch(
      /if\s*\(recurrenceMutation\.action === 'set'\)[\s\S]*?set_calendar_event_recurrence[\s\S]*?p_confirm_drop_reminders:\s*true/,
    );
  });

  it('index.ts persists derived event_kind during existing-link calendar inbound updates', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toMatch(/const\s+inboundEventKind\s*=\s*resolveInboundCalendarEventKind\(/);
    expect(source).toMatch(/from\('calendar_events'\)[\s\S]*?update\(\{[\s\S]*?event_kind:\s*inboundEventKind/);
  });

  it('index.ts treats payable bill inbound updates as observational link updates', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toMatch(
      /if\s*\(action === 'inbound_update'\)\s*\{[\s\S]*?buildPayableBillInboundUpdateObservationUpdate\(/,
    );
  });

  it('index.ts routes new neutral tasks on financial-mapped projects to the financial path', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    expect(source).toMatch(/processUnlinkedInboundTask\(\{/);
    expect(source).toMatch(/onRouteFinancial:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?routeFinancialInboundTickTick/);
  });
});

describe('ticktick-sync-closure (worker behavior)', () => {
  it('resolves outbound project ids deterministically from event kind', () => {
    expect(resolveTickTickProjectIdForEventKind('personal', DEFAULT_TICKTICK_PROJECT_ID)).toBe('643c0518525047536b6594d0');
    expect(resolveTickTickProjectIdForEventKind('work', DEFAULT_TICKTICK_PROJECT_ID)).toBe('643c0518525047536b6594d1');
    expect(resolveTickTickProjectIdForEventKind('mentoring', DEFAULT_TICKTICK_PROJECT_ID)).toBe('67fbc6398f08b12415f506c4');
    expect(resolveTickTickProjectIdForEventKind('financial', DEFAULT_TICKTICK_PROJECT_ID)).toBe('67158c51db647de6536f46dc');
    expect(resolveTickTickProjectIdForEventKind('unknown', DEFAULT_TICKTICK_PROJECT_ID)).toBe('643c0518525047536b6594d0');
  });

  it('syncs all visible TickTick lists when no explicit list mappings exist', () => {
    expect(
      resolveInboundSyncProjectIds({
        defaultProjectId: 'default-list',
        ticktickDefaultListMappings: null,
        visibleProjectIds: ['list-a', 'list-b', 'list-c'],
      }),
    ).toEqual(['list-a', 'list-b', 'list-c']);
  });

  it('routes neutral-title tasks on financial-mapped projects to payable_bills instead of calendar_events', async () => {
    const task: TickTickTaskInbound = {
      id: 'tt-fin-1',
      title: 'Consulta com cliente',
      projectId: 'fin-list',
      startDate: '2026-04-10T12:00:00+0000',
      dueDate: '2026-04-10T13:00:00+0000',
      status: 0,
    };

    let routedFinancial = 0;
    let createdCalendar = 0;

    await processUnlinkedInboundTask({
      task,
      userId: 'user-1',
      config: {
        ticktick_default_list_mappings: {
          'fin-list': { event_kind: 'financial' },
        },
      },
      onRouteFinancial: async () => {
        routedFinancial += 1;
      },
      onCreateCalendarEvent: async () => {
        createdCalendar += 1;
      },
    });

    expect(routedFinancial).toBe(1);
    expect(createdCalendar).toBe(0);
  });

  it('suspends normal outbound upsert flow for remote_deleted links', async () => {
    let updated = 0;
    let created = 0;

    const result = await processOutboundUpsertLink({
      existingLink: {
        external_object_id: 'tt-1',
        external_list_id: 'list-1',
        sync_status: 'remote_deleted',
      },
      onUpdateExisting: async () => {
        updated += 1;
        return { id: 'tt-1', projectId: 'list-1' };
      },
      onCreateNew: async () => {
        created += 1;
        return { id: 'tt-2', projectId: 'list-2' };
      },
    });

    expect(result).toEqual({ kind: 'suspended_remote_deleted' });
    expect(updated).toBe(0);
    expect(created).toBe(0);
  });

  it('does not sweep a link as remote_deleted when that project data fetch failed', () => {
    expect(
      shouldSweepLinkForRemoteDeleted({
        externalListId: 'mentoring-list',
        syncedProjectIds: new Set(['work-list', 'mentoring-list']),
        successfulProjectIds: new Set(['work-list']),
      }),
    ).toBe(false);
  });
});
