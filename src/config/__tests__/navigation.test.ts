import { describe, expect, it } from 'vitest';
import {
  primaryMenuItems,
  moreMenuItems,
  quickCreateItems,
  bottomNavItems,
} from '../navigation';

describe('navigation config', () => {
  it('exposes exactly 11 primary menu items', () => {
    expect(primaryMenuItems).toHaveLength(11);
  });

  it('every primary item has path, label, and icon', () => {
    for (const item of primaryMenuItems) {
      expect(item.path).toMatch(/^\//);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTypeOf('object');
    }
  });

  it('exposes the 3 "more" menu items', () => {
    expect(moreMenuItems.map((i) => i.path)).toEqual(['/tags', '/categorias', '/configuracoes']);
  });

  it('exposes the 5 quick-create actions', () => {
    expect(quickCreateItems.map((i) => i.action)).toEqual([
      'expense',
      'income',
      'card-expense',
      'transfer',
      'payable-bill',
    ]);
  });

  it('bottomNavItems is exactly 5 entries with the ana-clara in position 3', () => {
    expect(bottomNavItems).toHaveLength(5);
    expect(bottomNavItems[2].kind).toBe('ana-clara');
    expect(bottomNavItems[4].kind).toBe('more');
  });

  it('bottomNavItems route entries point to existing primaryMenuItems', () => {
    const paths = new Set(primaryMenuItems.map((i) => i.path));
    for (const entry of bottomNavItems) {
      if (entry.kind === 'route') {
        expect(paths.has(entry.path)).toBe(true);
      }
    }
  });
});
