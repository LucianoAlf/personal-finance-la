/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { Education } from './Education';

vi.mock('@/components/layout/Header', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/education/EducationHero', () => ({
  EducationHero: () => <div>education-hero-mounted</div>,
}));

vi.mock('@/components/education/EducationInvestorProfileCard', () => ({
  EducationInvestorProfileCard: () => <div>education-profile-mounted</div>,
}));

vi.mock('@/components/education/InvestorProfileQuestionnaire', () => ({
  InvestorProfileQuestionnaire: () => <div>education-questionnaire-mounted</div>,
}));

vi.mock('@/components/education/EducationProgressSection', () => ({
  EducationProgressSection: () => <div>education-progress-mounted</div>,
}));

vi.mock('@/components/education/EducationAnaMentorshipCard', () => ({
  EducationAnaMentorshipCard: () => <div>education-ana-mounted</div>,
}));

vi.mock('@/components/education/EducationJourneySection', () => ({
  EducationJourneySection: () => <div>education-journey-mounted</div>,
}));

vi.mock('@/components/education/EducationAchievementsSection', () => ({
  EducationAchievementsSection: () => <div>education-achievements-mounted</div>,
}));

vi.mock('@/components/education/EducationDailyTipCard', () => ({
  EducationDailyTipCard: () => <div>education-tip-mounted</div>,
}));

vi.mock('@/components/education/EducationGlossarySection', () => ({
  EducationGlossarySection: () => <div>education-glossary-mounted</div>,
}));

vi.mock('@/components/education/EducationEmptyState', () => ({
  EducationEmptyState: () => <div>education-empty-mounted</div>,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useEducationIntelligence', () => ({
  useEducationIntelligence: () => ({
    context: null,
    catalog: { tracks: [], modules: [], lessons: [], progressRows: [], glossaryTerms: [] },
    isLoading: false,
    error: null,
    startLesson: vi.fn(),
    completeLesson: vi.fn(),
    isSavingProgress: false,
  }),
}));

vi.mock('@/hooks/useGamification', () => ({
  useGamification: () => ({
    loading: false,
    levelTitle: 'Iniciante',
    profile: { current_streak: 1 },
    badges: [],
  }),
}));

vi.mock('@/hooks/useInvestorProfile', () => ({
  useInvestorProfile: () => ({
    latestAssessment: null,
    trustedAssessment: null,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Education page shell', () => {
  it('renders the hub inside the semantic premium shell instead of the old gray page background', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/educacao']}>
        <Education />
      </MemoryRouter>,
    );

    expect(screen.getByText('Educação Financeira')).not.toBeNull();
    expect(screen.getByText('Aprenda a cuidar melhor do seu dinheiro')).not.toBeNull();
    expect(screen.getByText('education-hero-mounted')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('bg-background');
  });
});
