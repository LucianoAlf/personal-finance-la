/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGoalsActiveTab } from '../useGoalsActiveTab';

const KEY = 'metas-active-tab';

describe('useGoalsActiveTab', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "savings" when nothing is stored', () => {
    const { result } = renderHook(() => useGoalsActiveTab());
    expect(result.current[0]).toBe('savings');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'progress');
    const { result } = renderHook(() => useGoalsActiveTab());
    expect(result.current[0]).toBe('progress');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useGoalsActiveTab('config'));
    expect(result.current[0]).toBe('config');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useGoalsActiveTab());
    act(() => result.current[1]('investments'));
    expect(window.localStorage.getItem(KEY)).toBe('investments');
    expect(result.current[0]).toBe('investments');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useGoalsActiveTab('spending'));
    expect(result.current[0]).toBe('spending');
  });
});
