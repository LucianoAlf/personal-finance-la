/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { EducationJourneySection } from './EducationJourneySection';
import { EducationAchievementsSection } from './EducationAchievementsSection';
import { EducationGlossarySection } from './EducationGlossarySection';
import { EducationDailyTipCard } from './EducationDailyTipCard';
import { EducationEmptyState } from './EducationEmptyState';
import { InvestorProfileQuestionnaire } from './InvestorProfileQuestionnaire';

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvestorProfile', () => ({
  useInvestorProfile: () => ({
    latestAssessment: null,
    trustedAssessment: null,
    submitAssessment: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    isLoading: false,
  }),
}));

describe('Education learning premium shell', () => {
  it('renders the learning journey as a premium module surface with corrected PT-BR copy', () => {
    const { container } = render(
      <MemoryRouter>
        <EducationJourneySection
          loading={false}
          showGenericNotice={true}
          isSaving={false}
          trackRows={[
            {
              trackSlug: 'eliminando_dividas',
              title: 'Eliminando Dívidas',
              description: 'Ordem de pagamento, negociação e uso consciente de crédito.',
              sortOrder: 1,
              modules: [
                {
                  moduleId: 'module-1',
                  trackSlug: 'eliminando_dividas',
                  moduleSlug: 'minimo_obrigatorio',
                  title: 'Mínimo obrigatório vs aceleração',
                  description: 'Entenda por que a ordem de pagamento altera o tempo total da quitação.',
                  moduleStatus: 'in_progress',
                  isRecommended: true,
                  totalLessonCount: 5,
                  completedLessonCount: 1,
                  firstIncompleteLessonId: 'lesson-2',
                },
              ],
            },
          ]}
          lessonsByModuleId={{
            'module-1': [
              {
                id: 'lesson-2',
                slug: 'lesson-2',
                title: 'Mínimo obrigatório vs aceleração',
                summary: 'Entenda por que a ordem de pagamento altera o tempo total da quitação.',
                moduleId: 'module-1',
                sortOrder: 2,
              },
            ],
          }}
          lessonProgress={new Map([['lesson-2', 'in_progress']])}
          onStartLesson={vi.fn().mockResolvedValue(undefined)}
          onCompleteLesson={vi.fn().mockResolvedValue(undefined)}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Trilha de aprendizado')).not.toBeNull();
    expect(screen.getByText(/ordens sugeridas ainda são genéricas/i)).not.toBeNull();
    expect(screen.getAllByText('Mínimo obrigatório vs aceleração').length).toBeGreaterThan(0);
    expect(screen.getByText('1/5 lições (20%)')).not.toBeNull();
    expect(screen.getByText('Em progresso')).not.toBeNull();
    expect(screen.getByText('Continuar módulo')).not.toBeNull();
    expect(container.innerHTML).toContain('bg-card/95');
  });

  it('renders achievements, glossary, daily tip, questionnaire and empty state in the premium education family', () => {
    const { container } = render(
      <MemoryRouter>
        <div className="space-y-6">
          <EducationAchievementsSection
            loading={false}
            badges={[
              {
                id: 'badge-1',
                user_id: 'user-1',
                badge_id: 'budget_ninja',
                tier: 'bronze',
                progress: 1,
                target: 3,
                unlocked: true,
                xp_reward: 100,
                created_at: new Date('2026-04-10'),
                updated_at: new Date('2026-04-10'),
              },
            ]}
          />
          <EducationGlossarySection
            loading={false}
            terms={[
              {
                slug: 'cdi',
                term: 'CDI',
                short_definition: 'Taxa de referência usada no mercado financeiro.',
                extended_text: 'Acompanha o custo do dinheiro em operações de curto prazo.',
                tags: ['renda fixa'],
                sort_order: 1,
              },
            ]}
          />
          <EducationDailyTipCard
            loading={false}
            narrativeText="Revise assinaturas antes de avançar para novos investimentos."
            deterministicReason="high_discretionary_spend"
          />
          <InvestorProfileQuestionnaire />
          <EducationEmptyState />
        </div>
      </MemoryRouter>,
    );

    expect(screen.getByText('Suas conquistas')).not.toBeNull();
    expect(screen.getByText(/roadmap completo de tiers/i)).not.toBeNull();
    expect(screen.getByText('Próximo: Prata')).not.toBeNull();
    expect(screen.getByText('Glossário')).not.toBeNull();
    expect(screen.getByPlaceholderText('Ex.: CDI, juros, dívidas...')).not.toBeNull();
    expect(screen.getByText('Dica do hub educacional')).not.toBeNull();
    expect(screen.getByText(/Motivo determinístico:/)).not.toBeNull();
    expect(screen.getByText('Perfil de investidor')).not.toBeNull();
    expect(screen.getByText(/cálculo é determinístico/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar perfil' })).not.toBeNull();
    expect(screen.getByText('Bem-vindo à sua área de educação')).not.toBeNull();
    expect(container.innerHTML).toContain('bg-card/95');
    expect(container.innerHTML).not.toContain('border-l-4 border-yellow-500');
    expect(container.innerHTML).not.toContain('bg-violet-50/50');
  });
});
