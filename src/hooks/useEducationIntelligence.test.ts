import { describe, expect, it } from 'vitest';

import { planLessonProgressWrite } from '@/hooks/useEducationIntelligence';

describe('planLessonProgressWrite', () => {
  it('keeps completed rows completed when starting a reviewed lesson', () => {
    const plan = planLessonProgressWrite(
      {
        id: 'progress-1',
        status: 'completed',
        started_at: '2026-04-01T10:00:00.000Z',
        completed_at: '2026-04-03T10:00:00.000Z',
      },
      'start',
      'user-1',
      'lesson-1',
      '2026-04-07T10:00:00.000Z',
    );

    expect(plan.kind).toBe('update');
    expect(plan.values).toEqual({
      last_viewed_at: '2026-04-07T10:00:00.000Z',
    });
  });

  it('clears completed_at when restarting a non-completed existing row', () => {
    const plan = planLessonProgressWrite(
      {
        id: 'progress-2',
        status: 'in_progress',
        started_at: null,
        completed_at: null,
      },
      'start',
      'user-1',
      'lesson-2',
      '2026-04-07T10:00:00.000Z',
    );

    expect(plan.kind).toBe('update');
    expect(plan.values).toEqual({
      status: 'in_progress',
      started_at: '2026-04-07T10:00:00.000Z',
      completed_at: null,
      last_viewed_at: '2026-04-07T10:00:00.000Z',
    });
  });

  it('completes a fresh lesson with consistent timestamps', () => {
    const plan = planLessonProgressWrite(
      null,
      'complete',
      'user-1',
      'lesson-3',
      '2026-04-07T10:00:00.000Z',
    );

    expect(plan.kind).toBe('insert');
    expect(plan.values).toEqual({
      user_id: 'user-1',
      lesson_id: 'lesson-3',
      status: 'completed',
      started_at: '2026-04-07T10:00:00.000Z',
      completed_at: '2026-04-07T10:00:00.000Z',
      last_viewed_at: '2026-04-07T10:00:00.000Z',
    });
  });
});
