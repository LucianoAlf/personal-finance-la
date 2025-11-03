import { create } from 'zustand';
import { User } from '@/types/database.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: '1',
    email: 'usuario@exemplo.com',
    name: 'João Silva',
    couple_mode: false,
    monthly_economy_goal: 20,
    closing_day: 5,
    created_at: new Date(),
  },
  isAuthenticated: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
