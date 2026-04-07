import { describe, it, expect } from 'vitest';
import { buildLessonNavigation, getLessonUrl } from './lesson-navigation';

describe('lesson navigation', () => {
  const lessons = [
    { id: 'L1', slug: 'first', title: 'First', moduleId: 'M1', sortOrder: 1 },
    { id: 'L2', slug: 'second', title: 'Second', moduleId: 'M1', sortOrder: 2 },
    { id: 'L3', slug: 'third', title: 'Third', moduleId: 'M1', sortOrder: 3 },
  ];

  it('returns null previous for first lesson', () => {
    const nav = buildLessonNavigation('L1', lessons);
    expect(nav.previous).toBeNull();
    expect(nav.next?.id).toBe('L2');
  });

  it('returns both neighbors for middle lesson', () => {
    const nav = buildLessonNavigation('L2', lessons);
    expect(nav.previous?.id).toBe('L1');
    expect(nav.next?.id).toBe('L3');
  });

  it('returns null next for last lesson', () => {
    const nav = buildLessonNavigation('L3', lessons);
    expect(nav.previous?.id).toBe('L2');
    expect(nav.next).toBeNull();
  });

  it('returns correct position info', () => {
    const nav = buildLessonNavigation('L2', lessons);
    expect(nav.currentIndex).toBe(1);
    expect(nav.totalInModule).toBe(3);
  });

  it('builds correct lesson URL', () => {
    expect(getLessonUrl('abc-123')).toBe('/educacao/licao/abc-123');
  });
});
