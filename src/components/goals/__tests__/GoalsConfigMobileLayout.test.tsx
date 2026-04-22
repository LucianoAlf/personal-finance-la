/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalsConfigMobileLayout } from '../GoalsConfigMobileLayout';

describe('GoalsConfigMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders empty state when no sections', () => {
    render(<GoalsConfigMobileLayout sections={[]} />);
    expect(screen.getByText(/nenhuma configuração/i)).toBeTruthy();
  });

  it('renders each section with its title', () => {
    render(
      <GoalsConfigMobileLayout
        sections={[
          { id: 's1', title: 'Renda mensal', children: <div>Renda content</div> },
          { id: 's2', title: 'Ciclos financeiros', children: <div>Ciclos content</div> },
        ]}
      />,
    );
    expect(screen.getByText('Renda mensal')).toBeTruthy();
    expect(screen.getByText('Ciclos financeiros')).toBeTruthy();
  });

  it('opens sections marked as defaultOpen', () => {
    const { container } = render(
      <GoalsConfigMobileLayout
        sections={[
          { id: 's1', title: 'Renda', defaultOpen: true, children: <div>Renda content</div> },
          { id: 's2', title: 'Ciclos', children: <div>Ciclos content</div> },
        ]}
      />,
    );
    const detailsList = container.querySelectorAll('details');
    expect(detailsList[0].hasAttribute('open')).toBe(true);
    expect(detailsList[1].hasAttribute('open')).toBe(false);
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GoalsConfigMobileLayout sections={[]} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
