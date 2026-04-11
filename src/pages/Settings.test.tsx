/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Settings } from './Settings';

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
    </div>
  ),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    loading: false,
  }),
}));

vi.mock('@/components/settings/GeneralSettings', () => ({
  GeneralSettings: () => <div>general-settings</div>,
}));

vi.mock('@/components/settings/AIProviderSettings', () => ({
  AIProviderSettings: () => <div>ai-settings</div>,
}));

vi.mock('@/components/settings/NotificationsSettings', () => ({
  NotificationsSettings: () => <div>notifications-settings</div>,
}));

vi.mock('@/components/settings/IntegrationsSettings', () => ({
  IntegrationsSettings: () => <div>integrations-settings</div>,
}));

vi.mock('@/components/settings/WebhooksSettings', () => ({
  WebhooksSettings: () => <div>webhooks-settings</div>,
}));

describe('Settings page shell', () => {
  it('uses the shared full-width content wrapper instead of a centered container clamp', () => {
    render(
      <MemoryRouter initialEntries={['/configuracoes']}>
        <Settings />
      </MemoryRouter>,
    );

    const pageContent = screen.getByTestId('app-page-content');

    expect(pageContent.className).toContain('w-full');
    expect(pageContent.className).toContain('px-6');
    expect(pageContent.className).not.toContain('container');
    expect(pageContent.className).not.toContain('max-w-7xl');
  });

  it('uses the same premium tabs rail semantics as the major app pages', () => {
    render(
      <MemoryRouter initialEntries={['/configuracoes']}>
        <Settings />
      </MemoryRouter>,
    );

    const tabsList = screen.getAllByRole('tablist')[0];
    const activeTab = screen.getAllByRole('tab', { name: /geral/i })[0];

    expect(tabsList.className).toContain('rounded-[1.4rem]');
    expect(tabsList.className).toContain('border-border/70');
    expect(tabsList.className).toContain('bg-card/95');
    expect(activeTab.className).toContain('rounded-[1rem]');
    expect(activeTab.className).toContain('data-[state=active]:bg-surface');
    expect(activeTab.className).toContain('data-[state=active]:ring-primary/15');
  });
});
