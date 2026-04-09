/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BadgesDisplay } from './BadgesDisplay';

vi.mock('@/hooks/useGamification', () => ({
  useGamification: () => ({
    badges: [
      { badge_id: 'savings-1', unlocked: true, tier: 'bronze', progress: 1 },
      { badge_id: 'goals-1', unlocked: false, tier: 'silver', progress: 0 },
    ],
    loading: false,
    refreshBadges: vi.fn(),
  }),
}));

describe('BadgesDisplay', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders premium conquest cards and category progress', () => {
    const { container } = render(<BadgesDisplay />);

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain('bg-card/95');
    expect(screen.getByText('Suas Conquistas')).not.toBeNull();
    expect(screen.getByText('Economia')).not.toBeNull();
  });
});
