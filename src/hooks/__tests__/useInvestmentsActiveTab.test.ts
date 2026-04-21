/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInvestmentsActiveTab } from '../useInvestmentsActiveTab';

const KEY = 'investments-active-tab';

describe('useInvestmentsActiveTab', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "portfolio" when nothing is stored', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab());
    expect(result.current[0]).toBe('portfolio');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'overview');
    const { result } = renderHook(() => useInvestmentsActiveTab());
    expect(result.current[0]).toBe('overview');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useInvestmentsActiveTab('alerts'));
    expect(result.current[0]).toBe('alerts');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab());
    act(() => result.current[1]('dividends'));
    expect(window.localStorage.getItem(KEY)).toBe('dividends');
    expect(result.current[0]).toBe('dividends');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useInvestmentsActiveTab('transactions'));
    expect(result.current[0]).toBe('transactions');
  });
});
