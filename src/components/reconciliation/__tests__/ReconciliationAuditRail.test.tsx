/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ReconciliationAuditRail } from '../ReconciliationAuditRail';

afterEach(() => {
  cleanup();
});

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

const baseEntry = {
  user_id: 'user-1',
  confidence_at_decision: 0.91,
  bank_transaction_snapshot: {},
  system_record_snapshot: null,
  actor: 'system',
  notes: null,
  created_at: '2026-04-14T12:10:00Z',
};

describe('ReconciliationAuditRail', () => {
  it('shows visible explanation when a case auto-closes', () => {
    render(
      <ReconciliationAuditRail
        entries={[
          {
            ...baseEntry,
            id: 'audit-1',
            case_id: 'case-1',
            action: 'auto_closed',
            notes: 'underlying payable already updated externally',
          },
        ]}
      />,
    );

    expect(screen.getByText(/underlying payable already updated externally/i)).toBeTruthy();
    expect(screen.getByText(/auto/i)).toBeTruthy();
  });

  it('filters entries to the active case when activeCaseId is provided', () => {
    render(
      <ReconciliationAuditRail
        activeCaseId="case-1"
        entries={[
          {
            ...baseEntry,
            id: 'audit-1',
            case_id: 'case-1',
            action: 'confirmed',
            notes: 'confirmed-for-active',
          },
          {
            ...baseEntry,
            id: 'audit-2',
            case_id: 'case-2',
            action: 'rejected',
            notes: 'noise-from-other-case',
          },
        ]}
      />,
    );

    expect(screen.getByText(/confirmed-for-active/i)).toBeTruthy();
    expect(screen.queryByText(/noise-from-other-case/i)).toBeNull();
    expect(screen.getByText(/timeline deste caso/i)).toBeTruthy();
  });

  it('renders the per-case empty copy when the case has no audit entries yet', () => {
    render(
      <ReconciliationAuditRail
        activeCaseId="case-99"
        entries={[
          {
            ...baseEntry,
            id: 'audit-1',
            case_id: 'case-1',
            action: 'confirmed',
            notes: 'other-case-note',
          },
        ]}
      />,
    );

    expect(screen.getByText(/Nenhuma decisao registrada ainda neste caso/i)).toBeTruthy();
    expect(screen.queryByText(/other-case-note/i)).toBeNull();
  });

  it('keeps the global log behavior when no case is selected', () => {
    render(
      <ReconciliationAuditRail
        entries={[
          {
            ...baseEntry,
            id: 'audit-1',
            case_id: 'case-1',
            action: 'confirmed',
            notes: 'a',
          },
          {
            ...baseEntry,
            id: 'audit-2',
            case_id: 'case-2',
            action: 'rejected',
            notes: 'b',
          },
        ]}
      />,
    );

    expect(screen.getByText('a')).toBeTruthy();
    expect(screen.getByText('b')).toBeTruthy();
    expect(screen.queryByText(/timeline deste caso/i)).toBeNull();
  });
});
