/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let mockSettingsState: any;

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettingsState,
}));

vi.mock('./DayOfWeekSelector', () => ({
  DayOfWeekSelector: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('./MultipleDaysSelector', () => ({
  MultipleDaysSelector: ({ label }: { label: string }) => <div>{label}</div>,
}));

import { NotificationsSettings } from './NotificationsSettings';

describe('NotificationsSettings', () => {
  beforeEach(() => {
    mockSettingsState = {
      loading: false,
      notificationPreferences: null,
      updateNotificationPreferences: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('syncs loaded preferences into the visible toggles after initial render', () => {
    const { rerender } = render(<NotificationsSettings />);

    expect(screen.getByRole('switch', { name: /e-mail/i }).getAttribute('aria-checked')).toBe(
      'true',
    );

    mockSettingsState = {
      ...mockSettingsState,
      notificationPreferences: {
        email_enabled: false,
        push_enabled: false,
        whatsapp_enabled: true,
        do_not_disturb_enabled: false,
        do_not_disturb_start_time: '22:00',
        do_not_disturb_end_time: '08:00',
        do_not_disturb_days_of_week: [0, 1, 2, 3, 4, 5, 6],
        daily_summary_enabled: false,
        daily_summary_time: '20:00',
        daily_summary_days_of_week: [1, 2, 3, 4, 5],
        weekly_summary_enabled: false,
        weekly_summary_day_of_week: 0,
        weekly_summary_days_of_week: [0],
        weekly_summary_time: '09:00',
        monthly_summary_enabled: false,
        monthly_summary_day_of_month: 1,
        monthly_summary_days_of_month: [1],
        monthly_summary_time: '09:00',
        bill_reminders_enabled: true,
        bill_reminders_days_before: 3,
        bill_reminders_days_before_array: [3, 1, 0],
        bill_reminders_time: '09:00',
        budget_alerts_enabled: true,
        budget_alert_threshold_percentage: 80,
        budget_alert_thresholds: [80, 100],
        budget_alert_cooldown_hours: 24,
        goal_milestones_enabled: true,
        goal_milestone_percentages: [25, 50, 75, 100],
        achievements_enabled: true,
        ana_tips_enabled: true,
        ana_tips_frequency: 'daily',
        ana_tips_time: '10:00',
        ana_tips_day_of_week: 1,
        ana_tips_day_of_month: 1,
        overdue_bill_alerts_enabled: true,
        overdue_bill_alert_days: [1, 3, 7],
        low_balance_alerts_enabled: false,
        low_balance_threshold: 100,
        large_transaction_alerts_enabled: false,
        large_transaction_threshold: 1000,
        investment_summary_enabled: false,
        investment_summary_frequency: 'weekly',
        investment_summary_day_of_week: 5,
        investment_summary_time: '18:00',
      },
    };

    rerender(<NotificationsSettings />);

    expect(screen.getByRole('switch', { name: /e-mail/i }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(screen.getByRole('switch', { name: /notificações push/i }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(screen.getByRole('switch', { name: /whatsapp/i }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });
});
