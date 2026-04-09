/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { XPProgressBar } from './XPProgressBar';
import { NextAchievements } from './NextAchievements';
import { AchievementGrid } from './AchievementGrid';
import { StreakHeatmap } from './StreakHeatmap';
import { GamificationStats } from './GamificationStats';

describe('Gamification premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the XP hero with a premium surface shell', () => {
    render(
      <XPProgressBar
        level={3}
        xp={68}
        xpForNextLevel={519}
        levelTitle="Iniciante"
        totalXP={450}
      />,
    );

    const shell = screen.getByTestId('goals-progress-xp-shell');

    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('rounded-[28px]');
    expect(screen.getByText('Nível 3')).not.toBeNull();
  });

  it('renders next achievements with tokenized hierarchy', () => {
    render(<NextAchievements badges={[]} />);

    const shell = screen.getByTestId('goals-progress-next-achievements-shell');

    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('border-border/70');
    expect(screen.getByText('Próximas Conquistas')).not.toBeNull();
  });

  it('renders the streak module with premium metric cards', () => {
    render(
      <StreakHeatmap
        currentStreak={1}
        bestStreak={3}
        lastActivityDate={null}
        subtitle="Resumo visual do streak."
      />,
    );

    const currentStreakCard = screen.getByTestId('goals-progress-streak-current');
    const statsCard = screen.getByTestId('goals-progress-streak-record');

    expect(currentStreakCard.className).toContain('bg-surface-elevated');
    expect(statsCard.className).toContain('bg-surface-elevated');
  });

  it('renders gamification stats with secondary premium stat cards', () => {
    render(
      <GamificationStats
        profile={{
          id: 'profile-1',
          user_id: 'user-1',
          level: 3,
          xp: 68,
          total_xp: 450,
          current_streak: 1,
          best_streak: 3,
          last_activity_date: null,
          animations_enabled: true,
          sounds_enabled: false,
          notifications_enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
        }}
        unlockedBadgesCount={2}
        totalBadges={15}
        levelTitle="Iniciante"
        xpForNextLevel={519}
        xpProgress={13}
        totalGoals={3}
        activeGoals={2}
        successRate={67}
      />,
    );

    const statsShell = screen.getByTestId('goals-progress-stats-shell');
    const nextLevelShell = screen.getByTestId('goals-progress-next-level-shell');

    expect(statsShell.className).toContain('bg-surface-elevated');
    expect(nextLevelShell.className).toContain('border-border/70');
  });

  it('renders the achievements grid with premium unlocked cards', () => {
    render(
      <AchievementGrid
        badges={[
          {
            id: 'badge-1',
            user_id: 'user-1',
            badge_id: 'savings_master',
            tier: 'bronze',
            progress: 100,
            target: 100,
            unlocked: true,
            unlocked_at: new Date(),
            xp_reward: 100,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]}
      />,
    );

    const shell = screen.getByTestId('goals-progress-achievement-grid-shell');

    expect(shell.className).toContain('bg-surface');
    expect(shell.className).toContain('border-border/70');
    expect(screen.getByText('Todas as Conquistas')).not.toBeNull();
  });
});
