/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import LessonViewer from './LessonViewer';
import { LessonCallout } from '@/components/education/LessonCallout';

const lessonContentState = {
  lesson: null as unknown,
  navigation: null as unknown,
  breadcrumb: null as unknown,
  isLoading: false,
  error: new Error('not-found') as Error | null,
};

vi.mock('@/hooks/useLessonContent', () => ({
  useLessonContent: () => lessonContentState,
}));

vi.mock('@/hooks/useEducationIntelligence', () => ({
  useEducationIntelligence: () => ({
    startLesson: vi.fn(),
    completeLesson: vi.fn(),
    isSavingProgress: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/education/LessonContentRenderer', () => ({
  LessonContentRenderer: () => <div>lesson-content-mounted</div>,
}));

vi.mock('@/components/education/LessonNavigation', () => ({
  LessonNavigation: () => <div>lesson-navigation-mounted</div>,
}));

vi.mock('@/components/education/LessonProgressBar', () => ({
  LessonProgressBar: () => <div>lesson-progress-mounted</div>,
}));

describe('LessonViewer premium shell', () => {
  beforeEach(() => {
    lessonContentState.lesson = null;
    lessonContentState.navigation = null;
    lessonContentState.breadcrumb = null;
    lessonContentState.isLoading = false;
    lessonContentState.error = new Error('not-found');
  });

  it('renders corrected pt-br copy for the not-found state', () => {
    render(
      <MemoryRouter initialEntries={['/educacao/licao/lesson-404']}>
        <Routes>
          <Route path="/educacao/licao/:lessonId" element={<LessonViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Lição não encontrada')).not.toBeNull();
    expect(screen.getByText('A lição solicitada não existe ou foi removida.')).not.toBeNull();
    expect(screen.getByText('Voltar para Educação')).not.toBeNull();
  });

  it('renders lesson callouts inside the premium lesson shell instead of old blue utility boxes', () => {
    const { container } = render(
      <LessonCallout
        variant="info"
        title="Importante"
        text="Entenda a diferença entre juros simples e compostos."
      />,
    );

    expect(screen.getByText('Importante')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-surface-elevated/40');
    expect(container.firstElementChild?.className).not.toContain('bg-blue-50');
  });
});
