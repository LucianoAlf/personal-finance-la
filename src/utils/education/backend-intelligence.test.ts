import { describe, expect, it } from 'vitest';

import {
  buildEducationIntelligenceContext,
  EducationIntelligenceDataError,
} from '../../../supabase/functions/_shared/education-intelligence.ts';
import {
  createErrorResponse,
  EducationIntelligenceHttpError,
  parseOptionalYmd,
  readRequestBody,
  resolveUserIdFromRequest,
} from '../../../supabase/functions/_shared/education-intelligence-http.ts';

function createSupabaseStub(
  tables: Record<string, Array<Record<string, unknown>>>,
  errorTables: string[] = [],
) {
  function createQuery(tableName: string) {
    let rows = [...(tables[tableName] || [])];
    let limitValue: number | null = null;
    let maybeSingleMode = false;
    let countMode = false;

    const builder = {
      select(_columns?: string, options?: { count?: 'exact'; head?: boolean }) {
        countMode = Boolean(options?.count || options?.head);
        return builder;
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return builder;
      },
      gte(column: string, value: string) {
        rows = rows.filter((row) => String(row[column] ?? '') >= value);
        return builder;
      },
      lte(column: string, value: string) {
        rows = rows.filter((row) => String(row[column] ?? '') <= value);
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        const ascending = options?.ascending !== false;
        rows = [...rows].sort((left, right) => {
          const leftValue = String(left[column] ?? '');
          const rightValue = String(right[column] ?? '');
          return ascending ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
        });
        return builder;
      },
      limit(value: number) {
        limitValue = value;
        return builder;
      },
      maybeSingle() {
        maybeSingleMode = true;
        return builder;
      },
      then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        if (errorTables.includes(tableName)) {
          return Promise.reject(new Error(`boom:${tableName}`)).then(onFulfilled, onRejected);
        }

        const outputRows = limitValue === null ? rows : rows.slice(0, limitValue);

        if (countMode) {
          return Promise.resolve({
            data: null,
            count: outputRows.length,
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (maybeSingleMode) {
          return Promise.resolve({
            data: outputRows[0] ?? null,
            error: null,
          }).then(onFulfilled, onRejected);
        }

        return Promise.resolve({
          data: outputRows,
          error: null,
        }).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from(tableName: string) {
      return createQuery(tableName);
    },
  };
}

describe('education intelligence backend quality', () => {
  it('aligns nextLessonId with the recommended track order', async () => {
    const supabase = createSupabaseStub({
      transactions: [
        {
          user_id: 'user-1',
          type: 'income',
          amount: 3000,
          transaction_date: '2026-04-03',
        },
        {
          user_id: 'user-1',
          type: 'expense',
          amount: 1000,
          transaction_date: '2026-04-05',
        },
      ],
      credit_card_transactions: [],
      credit_card_invoices: [
        {
          user_id: 'user-1',
          status: 'open',
          total_amount: 800,
          remaining_amount: 800,
          due_date: '2026-04-20',
        },
      ],
      payable_bills: [],
      financial_goals: [
        {
          user_id: 'user-1',
          name: 'Reserva de emergência',
          goal_type: 'savings',
          status: 'active',
          target_amount: 1000,
          current_amount: 900,
        },
      ],
      investment_goals: [],
      investments: [{ user_id: 'user-1', id: 'investment-1', is_active: true }],
      portfolio_snapshots: [],
      user_gamification: [{ user_id: 'user-1', current_streak: 4 }],
      badge_progress: [],
      education_tracks: [
        { id: 'track-debt', slug: 'eliminando_dividas', sort_order: 2 },
        { id: 'track-invest', slug: 'comecando_a_investir', sort_order: 3 },
      ],
      education_modules: [
        { id: 'module-debt', track_id: 'track-debt', slug: 'nucleo-divida', sort_order: 1 },
        { id: 'module-invest', track_id: 'track-invest', slug: 'primeiro-aporte', sort_order: 1 },
      ],
      education_lessons: [
        { id: 'lesson-debt-1', module_id: 'module-debt', slug: 'divida-1', sort_order: 1 },
        { id: 'lesson-invest-1', module_id: 'module-invest', slug: 'invest-1', sort_order: 1 },
      ],
      education_user_progress: [],
      investor_profile_assessments: [
        {
          user_id: 'user-1',
          profile_key: 'moderate',
          confidence: 0.8,
          effective_at: '2026-04-01T00:00:00.000Z',
          explanation: 'Perfil moderado',
          questionnaire_version: 1,
          answers: {
            version: 1,
            responses: {
              horizon: 'medium',
              drawdownComfort: 'medium',
              experience: 'some',
            },
          },
        },
      ],
      education_glossary_terms: [],
      education_daily_tips: [],
    });

    const context = await buildEducationIntelligenceContext({
      supabase,
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-07',
    });

    expect(context.journey.primaryFocus).toBe('comecando_a_investir');
    expect(context.progress?.nextLessonId).toBe('lesson-invest-1');
    expect(context.recommendedModules[0]).toEqual({
      trackSlug: 'comecando_a_investir',
      moduleSlug: 'primeiro-aporte',
    });
  });

  it('fails closed when a required query errors instead of returning a plausible empty context', async () => {
    const supabase = createSupabaseStub(
      {
        transactions: [],
        credit_card_transactions: [],
        credit_card_invoices: [],
        payable_bills: [],
        financial_goals: [],
        investment_goals: [],
        investments: [],
        portfolio_snapshots: [],
        user_gamification: [],
        badge_progress: [],
        education_tracks: [],
        education_modules: [],
        education_lessons: [],
        education_user_progress: [],
        investor_profile_assessments: [],
        education_glossary_terms: [],
        education_daily_tips: [],
      },
      ['transactions'],
    );

    await expect(
      buildEducationIntelligenceContext({
        supabase,
        userId: 'user-1',
        startDate: '2026-04-01',
        endDate: '2026-04-07',
      }),
    ).rejects.toBeInstanceOf(EducationIntelligenceDataError);
  });

  it('includes older overdue payable bills in debt-pressure analysis', async () => {
    const supabase = createSupabaseStub({
      transactions: [
        {
          user_id: 'user-1',
          type: 'income',
          amount: 2500,
          transaction_date: '2026-04-03',
        },
      ],
      credit_card_transactions: [],
      credit_card_invoices: [],
      payable_bills: [
        {
          user_id: 'user-1',
          amount: 300,
          due_date: '2025-08-10',
          status: 'overdue',
        },
      ],
      financial_goals: [],
      investment_goals: [],
      investments: [],
      portfolio_snapshots: [],
      user_gamification: [],
      badge_progress: [],
      education_tracks: [
        { id: 'track-org', slug: 'organizacao_basica', sort_order: 1 },
        { id: 'track-debt', slug: 'eliminando_dividas', sort_order: 2 },
      ],
      education_modules: [
        { id: 'module-org', track_id: 'track-org', slug: 'nucleo', sort_order: 1 },
        { id: 'module-debt', track_id: 'track-debt', slug: 'nucleo-divida', sort_order: 1 },
      ],
      education_lessons: [
        { id: 'lesson-org-1', module_id: 'module-org', slug: 'org-1', sort_order: 1 },
        { id: 'lesson-debt-1', module_id: 'module-debt', slug: 'divida-1', sort_order: 1 },
      ],
      education_user_progress: [],
      investor_profile_assessments: [],
      education_glossary_terms: [],
      education_daily_tips: [],
    });

    const context = await buildEducationIntelligenceContext({
      supabase,
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-07',
    });

    expect(context.journey.primaryFocus).toBe('eliminando_dividas');
    expect(context.learningBlockers).toContain('high_priority_debt_signals');
  });

  it('derives suitability from raw answers instead of trusting stored assessment columns', async () => {
    const supabase = createSupabaseStub({
      transactions: [
        { user_id: 'user-1', type: 'income', amount: 5000, transaction_date: '2026-04-03' },
        { user_id: 'user-1', type: 'expense', amount: 1200, transaction_date: '2026-04-04' },
      ],
      credit_card_transactions: [],
      credit_card_invoices: [],
      payable_bills: [],
      financial_goals: [
        {
          user_id: 'user-1',
          name: 'Reserva de emergência',
          goal_type: 'savings',
          status: 'active',
          target_amount: 1000,
          current_amount: 1000,
        },
      ],
      investment_goals: [],
      investments: [{ user_id: 'user-1', id: 'investment-1', is_active: true }],
      portfolio_snapshots: [],
      user_gamification: [],
      badge_progress: [],
      education_tracks: [
        { id: 'track-org', slug: 'organizacao_basica', sort_order: 1 },
        { id: 'track-invest', slug: 'comecando_a_investir', sort_order: 3 },
      ],
      education_modules: [
        { id: 'module-org', track_id: 'track-org', slug: 'nucleo', sort_order: 1 },
        { id: 'module-invest', track_id: 'track-invest', slug: 'primeiro-aporte', sort_order: 1 },
      ],
      education_lessons: [
        { id: 'lesson-org-1', module_id: 'module-org', slug: 'org-1', sort_order: 1 },
        { id: 'lesson-invest-1', module_id: 'module-invest', slug: 'invest-1', sort_order: 1 },
      ],
      education_user_progress: [],
      investor_profile_assessments: [
        {
          user_id: 'user-1',
          profile_key: 'aggressive',
          confidence: 1,
          effective_at: '2026-04-01T00:00:00.000Z',
          explanation: 'Perfil agressivo salvo pelo cliente',
          questionnaire_version: 1,
          answers: {
            version: 1,
            responses: {
              horizon: 'short',
              drawdownComfort: 'low',
              experience: 'none',
            },
          },
        },
      ],
      education_glossary_terms: [],
      education_daily_tips: [],
    });

    const context = await buildEducationIntelligenceContext({
      supabase,
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-07',
    });

    expect(context.investorProfile?.profileKey).toBe('conservative');
    expect(context.journey.recommendedTrackSlugs[0]).toBe('organizacao_basica');
    expect(context.progress?.nextLessonId).toBe('lesson-org-1');
  });

  it('rejects missing auth with a 401-shaped error', async () => {
    const req = new Request('https://example.com', { method: 'POST' });

    await expect(
      resolveUserIdFromRequest(req, {
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Authorization token missing',
    });
  });

  it('maps backend data failures to 503 responses', async () => {
    const response = createErrorResponse(
      new EducationIntelligenceDataError('Failed to load required education intelligence data'),
      { 'Access-Control-Allow-Origin': '*' },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to load required education intelligence data',
    });
  });

  it('rejects invalid JSON bodies with a 400 error', async () => {
    const req = new Request('https://example.com', {
      method: 'POST',
      body: '{invalid',
      headers: { 'content-type': 'application/json' },
    });

    await expect(readRequestBody(req)).rejects.toBeInstanceOf(EducationIntelligenceHttpError);
  });

  it('keeps optional dates strict when provided', () => {
    expect(parseOptionalYmd(undefined, 'startDate')).toBeNull();
    expect(() => parseOptionalYmd('04/07/2026', 'startDate')).toThrow(
      'startDate must use YYYY-MM-DD format when provided',
    );
    expect(() => parseOptionalYmd('2026-13-01', 'startDate')).toThrow(
      'startDate must use YYYY-MM-DD format when provided',
    );
    expect(() => parseOptionalYmd('2026-02-30', 'startDate')).toThrow(
      'startDate must use YYYY-MM-DD format when provided',
    );
  });

  it('does not leak unexpected internal error messages in generic responses', async () => {
    const response = createErrorResponse(new Error('secret db details'), {
      'Access-Control-Allow-Origin': '*',
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
  });
});
