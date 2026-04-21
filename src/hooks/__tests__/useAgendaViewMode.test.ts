/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAgendaViewMode } from '../useAgendaViewMode';

const KEY = 'agenda-view-mode';

describe('useAgendaViewMode', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "month" when nothing is stored', () => {
    const { result } = renderHook(() => useAgendaViewMode());
    expect(result.current[0]).toBe('month');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'week');
    const { result } = renderHook(() => useAgendaViewMode());
    expect(result.current[0]).toBe('week');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useAgendaViewMode('day'));
    expect(result.current[0]).toBe('day');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useAgendaViewMode());
    act(() => result.current[1]('day'));
    expect(window.localStorage.getItem(KEY)).toBe('day');
    expect(result.current[0]).toBe('day');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useAgendaViewMode('week'));
    expect(result.current[0]).toBe('week');
  });
});
