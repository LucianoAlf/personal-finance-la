/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PageContent } from './PageContent';

describe('PageContent', () => {
  it('uses the shared full-width app shell spacing without centered max-width clamps', () => {
    render(<PageContent>conteudo</PageContent>);

    const content = screen.getByTestId('app-page-content');

    expect(content.className).toContain('w-full');
    expect(content.className).toContain('px-6');
    expect(content.className).toContain('lg:px-8');
    expect(content.className).not.toContain('mx-auto');
    expect(content.className).not.toContain('max-w-7xl');
    expect(content.className).not.toContain('container');
  });
});
