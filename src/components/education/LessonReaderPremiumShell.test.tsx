/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { LessonContentRenderer } from './LessonContentRenderer';
import { LessonChecklist } from './LessonChecklist';
import { LessonExercise } from './LessonExercise';
import { LessonSummary } from './LessonSummary';
import { LessonNavigation } from './LessonNavigation';

describe('Lesson reader premium shell', () => {
  it('renders lesson content and supporting blocks with corrected PT-BR copy and premium surfaces', () => {
    const { container } = render(
      <MemoryRouter>
        <div className="space-y-6">
          <LessonContentRenderer
            blocks={[
              {
                type: 'heading',
                level: 2,
                text: 'Como organizar seu fluxo',
              },
              {
                type: 'paragraph',
                text: 'Organize entradas, saídas e decisões de revisão do mês com clareza.',
              },
              {
                type: 'summary',
                points: ['Você aprendeu a separar contas operacionais das metas.'],
              },
              {
                type: 'next_step',
                text: 'Continue para a próxima lição quando quiser aprofundar este tema.',
                lesson_slug: 'proxima-licao',
              },
            ]}
          />
          <LessonChecklist
            title="Checklist da lição"
            items={[
              {
                id: 'item-1',
                label: 'Separar contas do dia a dia das metas.',
                help: 'Isso evita misturar gasto operacional e planejamento.',
              },
            ]}
          />
          <LessonExercise
            title="Exercício prático"
            instructions="Anote as três próximas decisões financeiras que dependem de clareza no fluxo."
            hint="Comece pelas decisões que vencem antes."
          />
          <LessonSummary
            points={['Você aprendeu a distinguir fluxo operacional de planejamento de metas.']}
          />
          <LessonNavigation
            previous={null}
            next={null}
            currentIndex={0}
            totalInModule={3}
          />
        </div>
      </MemoryRouter>,
    );

    expect(screen.getByText('Como organizar seu fluxo')).not.toBeNull();
    expect(screen.getByText('Próxima')).not.toBeNull();
    expect(screen.getByText('Checklist da lição')).not.toBeNull();
    expect(screen.getByText('0 de 1 concluídos')).not.toBeNull();
    expect(screen.getByText('Exercício prático')).not.toBeNull();
    expect(screen.getByText('Mostrar dica')).not.toBeNull();
    expect(screen.getAllByText('O que você aprendeu').length).toBeGreaterThan(0);
    expect(screen.getByText('Lição 1 de 3')).not.toBeNull();
    expect(screen.getByText('Voltar à trilha')).not.toBeNull();
    expect(container.innerHTML).toContain('bg-card/95');
    expect(container.innerHTML).not.toContain('border-dashed');
    expect(container.innerHTML).not.toContain('bg-muted/50');
  });

  it('renders the empty lesson-content state with corrected PT-BR copy', () => {
    render(<LessonContentRenderer blocks={[]} />);

    expect(screen.getByText('Conteúdo desta lição será exibido aqui.')).not.toBeNull();
  });
});
