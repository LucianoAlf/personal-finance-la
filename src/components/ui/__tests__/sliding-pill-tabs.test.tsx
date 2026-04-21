/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SlidingPillTabs } from '../sliding-pill-tabs';

const TABS = [
  { value: 'a', label: 'One' },
  { value: 'b', label: 'Two' },
  { value: 'c', label: 'Three' },
];

describe('SlidingPillTabs', () => {
  afterEach(() => cleanup());

  it('renders all tabs with role="tab"', () => {
    render(<SlidingPillTabs tabs={TABS} value="a" onValueChange={vi.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the active tab via aria-selected', () => {
    render(<SlidingPillTabs tabs={TABS} value="b" onValueChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'One' }).getAttribute('aria-selected')).toBe('false');
  });

  it('calls onValueChange with the tab value when clicked', () => {
    const onChange = vi.fn();
    render(<SlidingPillTabs tabs={TABS} value="a" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Three' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('positions the pill indicator at index 0 when first tab is active', () => {
    const { container } = render(<SlidingPillTabs tabs={TABS} value="a" onValueChange={vi.fn()} />);
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(pill.style.transform).toContain('0%');
  });

  it('positions the pill indicator at index 2 when third tab is active', () => {
    const { container } = render(<SlidingPillTabs tabs={TABS} value="c" onValueChange={vi.fn()} />);
    const pill = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(pill.style.transform).toContain('200%');
  });

  it('accepts a custom ariaLabel on the tablist', () => {
    render(
      <SlidingPillTabs
        tabs={TABS}
        value="a"
        onValueChange={vi.fn()}
        ariaLabel="Custom label"
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Custom label' })).toBeTruthy();
  });
});
