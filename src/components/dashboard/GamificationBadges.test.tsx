/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GamificationBadges } from './GamificationBadges';

describe('GamificationBadges', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the streak badge with semantic warning tokens instead of light-mode orange fills', () => {
    render(
      <GamificationBadges
        meta={{
          dailyOverdue: [0, 0, 0, 0],
          weekly: { income: [1000], expenses: [500] },
          bills: { onTimeRate: 85, overdueCount: 0 },
        }}
      />,
    );

    const streakBadge = screen.getByText(/dias sem atraso/i).closest('div');

    expect(streakBadge?.className).toContain('bg-warning-subtle');
    expect(streakBadge?.className).toContain('text-warning');
    expect(streakBadge?.className).toContain('border-warning-border');
    expect(streakBadge?.className).not.toContain('bg-orange-100');
  });
});
