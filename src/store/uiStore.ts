import { create } from 'zustand';

export type QuickCreateAction =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'card-expense'
  | 'payable-bill';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  anaCoachOpen: boolean;
  setAnaCoachOpen: (open: boolean) => void;
  activeQuickCreate: QuickCreateAction | null;
  openQuickCreate: (action: QuickCreateAction) => void;
  closeQuickCreate: () => void;
  moreSheetOpen: boolean;
  setMoreSheetOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  anaCoachOpen: false,
  setAnaCoachOpen: (open) => set({ anaCoachOpen: open }),
  activeQuickCreate: null,
  openQuickCreate: (action) => set({ activeQuickCreate: action }),
  closeQuickCreate: () => set({ activeQuickCreate: null }),
  moreSheetOpen: false,
  setMoreSheetOpen: (open) => set({ moreSheetOpen: open }),
}));
