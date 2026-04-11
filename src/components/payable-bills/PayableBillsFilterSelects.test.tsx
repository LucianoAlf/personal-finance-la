/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PeriodFilter } from './PeriodFilter';
import { BillSortSelect } from './BillSortSelect';
import { BillCategoryFilter } from './BillCategoryFilter';

beforeEach(() => {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.scrollIntoView = function () {};
  const testGlobal = globalThis as typeof globalThis & {
    CSS?: { escape?: (value: string) => string };
  };
  if (!testGlobal.CSS) {
    (testGlobal as any).CSS = {
      escape: (value: string) => value,
    };
  } else if (!testGlobal.CSS.escape) {
    testGlobal.CSS.escape = (value: string) => value;
  }
});

afterEach(() => {
  cleanup();
});

describe('PayableBills filter selects', () => {
  it('uses the premium solid surface for the period dropdown', async () => {
    const user = userEvent.setup();

    render(<PeriodFilter value="this_month" onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));

    const listbox = await waitFor(() => screen.getByRole('listbox'));

    expect(listbox.className).toContain('bg-surface-overlay');
    expect(listbox.className).not.toContain('bg-popover/98');
  });

  it('uses the premium solid surface for the category dropdown', async () => {
    const user = userEvent.setup();

    render(
      <BillCategoryFilter
        categories={[
          {
            id: 'cat-1',
            user_id: 'user-1',
            name: 'Alimentação',
            type: 'expense',
            parent_id: null,
            color: '#f97316',
            icon: 'UtensilsCrossed',
            is_default: false,
            created_at: '2026-04-10T00:00:00.000Z',
            keywords: [],
          },
        ]}
        value="all"
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox'));

    const listbox = await waitFor(() => screen.getByRole('listbox'));

    expect(listbox.className).toContain('bg-surface-overlay');
    expect(listbox.className).not.toContain('bg-popover/98');
  });

  it('uses the premium solid surface for the sort dropdown', async () => {
    const user = userEvent.setup();

    render(<BillSortSelect value="due_soon" onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));

    const listbox = await waitFor(() => screen.getByRole('listbox'));

    expect(listbox.className).toContain('bg-surface-overlay');
    expect(listbox.className).not.toContain('bg-popover/98');
  });
});
