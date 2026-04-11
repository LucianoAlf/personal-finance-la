/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CreateCategoryDialog } from './CreateCategoryDialog';

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
  }),
}));

describe('CreateCategoryDialog', () => {
  it('keeps the dialog constrained to the viewport height', () => {
    render(
      <CreateCategoryDialog open onOpenChange={vi.fn()} categoryType="expense" />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-h-[80vh]');
    expect(dialog.className).toContain('overflow-y-auto');
  });
});
