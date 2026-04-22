/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GamificationMobileLayout, type Achievement } from '../GamificationMobileLayout';

const achievements: Achievement[] = [
  { id: 'a1', icon: '🎯', name: 'Primeira meta', unlocked: true },
  { id: 'a2', icon: '🔥', name: '7 dias', unlocked: true },
  { id: 'a3', icon: '💰', name: 'R$ 1k', unlocked: true },
  { id: 'a4', icon: '🏔️', name: '30 dias', unlocked: false },
];

const baseProps = {
  level: 7,
  levelName: 'Disciplinado',
  xp: 2345,
  xpToNextLevel: 655,
  xpProgressPct: 65,
  streakDays: 14,
  achievements,
};

describe('GamificationMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders the level and level name', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/nível 7/i)).toBeTruthy();
    expect(screen.getByText(/disciplinado/i)).toBeTruthy();
  });

  it('renders the XP amount and XP to next level', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/2\.?345 xp/i)).toBeTruthy();
    expect(screen.getByText(/655 XP até o próximo/i)).toBeTruthy();
  });

  it('renders the streak in days', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/14 dias/i)).toBeTruthy();
  });

  it('renders achievements with unlocked vs locked styling', () => {
    const { container } = render(<GamificationMobileLayout {...baseProps} />);
    const unlocked = container.querySelectorAll('[data-testid="achievement"][data-unlocked="true"]');
    const locked = container.querySelectorAll('[data-testid="achievement"][data-unlocked="false"]');
    expect(unlocked.length).toBe(3);
    expect(locked.length).toBe(1);
  });

  it('renders the heatmap desktop-only placeholder', () => {
    render(<GamificationMobileLayout {...baseProps} />);
    expect(screen.getByText(/heatmap/i)).toBeTruthy();
    expect(screen.getByText(/desktop/i)).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GamificationMobileLayout {...baseProps} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
