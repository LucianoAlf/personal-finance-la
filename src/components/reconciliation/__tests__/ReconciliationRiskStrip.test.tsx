/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReconciliationRiskStrip } from '../ReconciliationRiskStrip';

describe('ReconciliationRiskStrip', () => {
  it('shows stale connection risk and CTA', () => {
    const onReauthenticate = vi.fn();

    render(
      <ReconciliationRiskStrip
        connections={[
          {
            id: 'conn-1',
            user_id: 'u-1',
            item_id: 'item-1',
            institution_name: 'Santander',
            status: 'OUTDATED',
            last_synced_at: null,
            staleness_threshold_hours: 48,
            created_at: '',
            updated_at: '',
          },
        ]}
        onReauthenticate={onReauthenticate}
      />,
    );

    expect(screen.getByText(/Risco estrutural/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Reautenticar item/i));
    expect(onReauthenticate).toHaveBeenCalled();
  });
});
