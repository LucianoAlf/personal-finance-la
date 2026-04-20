import { describe, expect, it, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore.moreSheetOpen', () => {
  beforeEach(() => {
    useUIStore.setState({ moreSheetOpen: false });
  });

  it('defaults to false', () => {
    expect(useUIStore.getState().moreSheetOpen).toBe(false);
  });

  it('setMoreSheetOpen(true) flips it', () => {
    useUIStore.getState().setMoreSheetOpen(true);
    expect(useUIStore.getState().moreSheetOpen).toBe(true);
  });

  it('setMoreSheetOpen(false) resets', () => {
    useUIStore.getState().setMoreSheetOpen(true);
    useUIStore.getState().setMoreSheetOpen(false);
    expect(useUIStore.getState().moreSheetOpen).toBe(false);
  });
});
