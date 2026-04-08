/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateCategoryDialog } from './CreateCategoryDialog';

const addCategory = vi.fn().mockResolvedValue({ id: 'new' });
const updateCategory = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    addCategory,
    updateCategory,
  }),
}));

describe('CreateCategoryDialog', () => {
  beforeEach(() => {
    addCategory.mockClear();
    updateCategory.mockClear();
  });

  it('persists category type from manager tab when creating', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CreateCategoryDialog
        open
        onOpenChange={onOpenChange}
        categoryType="income"
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'Salário extra');
    await user.click(screen.getByRole('button', { name: /criar categoria/i }));

    await waitFor(() => {
      expect(addCategory).toHaveBeenCalled();
    });

    expect(addCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'income',
        name: 'Salário extra',
      }),
    );
  });
});
