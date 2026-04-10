/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { EducationHero } from './EducationHero';
import { EducationInvestorProfileCard } from './EducationInvestorProfileCard';
import { EducationProgressSection } from './EducationProgressSection';
import { EducationAnaMentorshipCard } from './EducationAnaMentorshipCard';

describe('Education premium shell', () => {
  it('renders the hero as a premium learning hub surface without the old purple gradient shell', () => {
    const { container } = render(
      <EducationHero
        loading={false}
        subtitle="Trilha sugerida pelo seu contexto financeiro atual."
        levelLabel="Iniciante"
        streakDays={2}
      />,
    );

    expect(screen.getByText('Seu hub de educação financeira')).not.toBeNull();
    expect(screen.getByText('Iniciante · 2 dias de sequência')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-card/95');
    expect(container.firstElementChild?.className).not.toContain('from-purple-500');
  });

  it('renders profile and progress sections with the premium surface family and corrected pt-br copy', () => {
    const { container } = render(
      <div>
        <EducationInvestorProfileCard
          loading={false}
          section={{
            profileKey: 'balanced',
            needsSuitabilityQuestionnaire: false,
            summary: 'Perfil derivado do questionário.',
            lastAssessmentAt: '2026-04-07T00:00:00.000Z',
            isComplete: true,
          }}
          questionnaireVersion={1}
          onOpenQuestionnaire={vi.fn()}
        />
        <EducationProgressSection
          loading={false}
          section={{
            completedLessonsCount: 1,
            totalLessonsAvailable: 15,
            currentStreakDays: 1,
            nextLessonId: 'lesson-2',
            hasAnyProgress: true,
          }}
          summaryLines={['Lições concluídas: 1 de 15.']}
          nextLessonTitle="Mínimo obrigatório vs aceleração"
          onContinueNextLesson={vi.fn()}
          continueDisabled={false}
        />
      </div>,
    );

    expect(screen.getByText('Perfil de investidor')).not.toBeNull();
    expect(screen.getByText('Versão 1')).not.toBeNull();
    expect(screen.getByText(/Última avaliação:/)).not.toBeNull();
    expect(screen.getByText('Seu progresso')).not.toBeNull();
    expect(screen.getByText('Continuar lição sugerida')).not.toBeNull();
    expect(container.innerHTML).toContain('bg-card/95');
  });

  it('renders Ana Clara mentorship as a premium card instead of the old pastel mentor block', () => {
    const { container } = render(
      <MemoryRouter>
        <EducationAnaMentorshipCard
          loading={false}
          presentation={{
            focusTitle: 'Eliminando Dívidas',
            reasonWhy: 'O foco principal é regularizar obrigações vencidas.',
            attentionItems: ['Há contas ou faturas em atraso.'],
            recommendationItems: ['Fortaleça a reserva antes de aumentar exposição a risco.'],
            nextStepTitle: 'Mínimo obrigatório vs aceleração',
          }}
          nextLessonId="lesson-2"
          qualityLabel="Interpretação da Ana Clara"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ana Clara — mentoria educacional')).not.toBeNull();
    expect(screen.getByText('Foco da semana')).not.toBeNull();
    expect(screen.getByText('Abrir próxima aula')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-card/95');
    expect(container.firstElementChild?.className).not.toContain('from-violet-50');
  });
});
