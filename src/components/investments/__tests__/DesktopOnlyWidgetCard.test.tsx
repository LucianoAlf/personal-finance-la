/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DesktopOnlyWidgetCard } from '../DesktopOnlyWidgetCard';

describe('DesktopOnlyWidgetCard', () => {
  afterEach(() => cleanup());

  it('renders the provided title', () => {
    render(<DesktopOnlyWidgetCard title="Heatmap de performance" />);
    expect(screen.getByText('Heatmap de performance')).toBeTruthy();
  });

  it('renders the default "Disponível no desktop" description', () => {
    render(<DesktopOnlyWidgetCard title="X" />);
    expect(screen.getByText(/disponível no desktop/i)).toBeTruthy();
  });

  it('renders a custom description when provided', () => {
    render(<DesktopOnlyWidgetCard title="X" description="Abra um notebook para ver o gráfico completo" />);
    expect(screen.getByText(/abra um notebook/i)).toBeTruthy();
  });

  it('has role="status" with an aria-label', () => {
    const { container } = render(<DesktopOnlyWidgetCard title="X" />);
    const root = container.querySelector('[role="status"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toMatch(/apenas no desktop/i);
  });
});
