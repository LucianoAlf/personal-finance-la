import { describe, expect, it } from 'vitest';

import { buildWhatsAppSuitabilityFacts } from '../../../supabase/functions/_shared/education-profile.ts';
import { buildInvestmentIntelligenceContext } from '../../../supabase/functions/_shared/investment-intelligence.ts';

function createSupabaseStub(tables: Record<string, Array<Record<string, unknown>>>) {
  function createQuery(tableName: string) {
    let rows = [...(tables[tableName] || [])];
    let limitValue: number | null = null;
    let maybeSingleMode = false;

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
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
        const outputRows = limitValue === null ? rows : rows.slice(0, limitValue);

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

describe('backend suitability derivation', () => {
  it('derives WhatsApp suitability facts from raw answers instead of trusting stored columns', () => {
    const facts = buildWhatsAppSuitabilityFacts({
      profile_key: 'aggressive',
      confidence: 1,
      effective_at: '2026-04-01T00:00:00.000Z',
      explanation: 'client wrote aggressive',
      questionnaire_version: 1,
      answers: {
        version: 1,
        responses: {
          horizon: 'short',
          drawdownComfort: 'low',
          experience: 'none',
        },
      },
    });

    expect(facts.current_profile_key).toBe('conservative');
    expect(facts.assessment_complete).toBe(true);
    expect(facts.blocked_recommendation_classes).toContain('aggressive_equity_first');
  });

  it('fails safe for missing raw answers even if stored suitability columns exist', () => {
    const facts = buildWhatsAppSuitabilityFacts({
      profile_key: 'growth',
      confidence: 0.9,
      effective_at: '2026-04-01T00:00:00.000Z',
      explanation: 'stale',
      questionnaire_version: 1,
      answers: null,
    });

    expect(facts.current_profile_key).toBeNull();
    expect(facts.assessment_complete).toBe(false);
    expect(facts.blocked_recommendation_classes).toContain('aggressive_equity_first');
    expect(facts.blocked_recommendation_classes).toContain('high_risk_investment_nudge');
  });

  it('fails safe for unsupported questionnaire versions instead of reinterpreting them as current', () => {
    const facts = buildWhatsAppSuitabilityFacts({
      profile_key: 'aggressive',
      confidence: 1,
      effective_at: '2026-04-01T00:00:00.000Z',
      explanation: 'legacy scoring',
      questionnaire_version: 99,
      answers: {
        version: 99,
        responses: {
          horizon: 'long',
          drawdownComfort: 'high',
          experience: 'advanced',
        },
      },
    });

    expect(facts.current_profile_key).toBeNull();
    expect(facts.questionnaire_version).toBe(99);
    expect(facts.assessment_complete).toBe(false);
    expect(facts.blocked_recommendation_classes).toContain('aggressive_equity_first');
  });

  it('filters medium/high risk investment nudges for unassessed users', async () => {
    const supabase = createSupabaseStub({
      investments: [
        {
          id: 'inv-1',
          user_id: 'user-1',
          name: 'PETR4',
          ticker: 'PETR4',
          type: 'stock',
          category: 'acoes_nacionais',
          is_active: true,
          quantity: 100,
          purchase_price: 100,
          current_price: 150,
          total_invested: 10000,
          current_value: 15000,
          dividend_yield: 2,
          updated_at: '2026-04-07T00:00:00.000Z',
        },
      ],
      investment_allocation_targets: [],
      investment_goals: [],
      badge_progress: [],
      user_gamification: [],
      ana_insights_cache: [],
      investor_profile_assessments: [],
    });

    const context = await buildInvestmentIntelligenceContext({
      supabase,
      userId: 'user-1',
    });

    expect(context.opportunities.items.some((item) => item.riskLevel === 'medium')).toBe(false);
    expect(context.opportunities.items.some((item) => item.riskLevel === 'high' && item.type !== 'sell_signal')).toBe(false);
    expect(context.opportunities.items.some((item) => item.type === 'sell_signal')).toBe(true);
    expect(context.opportunities.items.some((item) => item.riskLevel === 'low')).toBe(true);
  });
});
