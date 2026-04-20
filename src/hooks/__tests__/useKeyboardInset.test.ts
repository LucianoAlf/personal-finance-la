/* @vitest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInset } from '../useKeyboardInset';

interface FakeVV {
  height: number;
  offsetTop: number;
  dispatchEvent: (event: Event) => void;
  addEventListener: (type: string, fn: EventListener) => void;
  removeEventListener: (type: string, fn: EventListener) => void;
}

function makeFakeVisualViewport(height: number, offsetTop = 0): FakeVV {
  const target = new EventTarget();
  return {
    height,
    offsetTop,
    dispatchEvent: (e) => target.dispatchEvent(e),
    addEventListener: (type, fn) => target.addEventListener(type, fn),
    removeEventListener: (type, fn) => target.removeEventListener(type, fn),
  };
}

describe('useKeyboardInset', () => {
  let originalVV: unknown;

  beforeEach(() => {
    originalVV = (window as unknown as { visualViewport?: VisualViewport }).visualViewport;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV });
  });

  it('returns 0 when visualViewport is not available', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('returns 0 when viewport heights match', () => {
    const fake = makeFakeVisualViewport(800, 0);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('returns the gap when keyboard opens', () => {
    const fake = makeFakeVisualViewport(800, 0);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      fake.height = 500;
      fake.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(300);
  });

  it('clamps negative gaps to 0', () => {
    const fake = makeFakeVisualViewport(900, 50);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('cleans up listeners on unmount', () => {
    const fake = makeFakeVisualViewport(800, 0);
    const removeSpy = vi.spyOn(fake, 'removeEventListener');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { unmount } = renderHook(() => useKeyboardInset());
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});
