// src/contexts/ThemeContext.tsx
// Context para gerenciar tema dark/light/auto do sistema

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  hydrateTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'auto',
  storageKey = 'pf-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Tentar carregar do localStorage
    const stored = localStorage.getItem(storageKey);
    return (stored as Theme) || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Função para resolver tema (auto -> light/dark baseado em SO)
  const resolveTheme = useCallback((themeValue: Theme): ResolvedTheme => {
    if (themeValue === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  }, []);

  // Aplicar tema no HTML
  const applyTheme = useCallback((themeValue: Theme) => {
    const resolved = resolveTheme(themeValue);
    const root = window.document.documentElement;

    // Remover classes antigas
    root.classList.remove('light', 'dark');

    // Adicionar nova classe
    root.classList.add(resolved);

    // Atualizar meta theme-color para mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolved === 'dark' ? '#0f172a' : '#ffffff'
      );
    }

    setResolvedTheme(resolved);
  }, [resolveTheme]);

  const updateTheme = useCallback((newTheme: Theme, persist: boolean) => {
    setThemeState(newTheme);
    if (persist) {
      localStorage.setItem(storageKey, newTheme);
    }
    applyTheme(newTheme);
  }, [applyTheme, storageKey]);

  // Setar tema (salva no localStorage e aplica)
  const setTheme = useCallback((newTheme: Theme) => {
    updateTheme(newTheme, true);
  }, [updateTheme]);

  // Hidratar tema vindo do backend e alinhar cache local
  const hydrateTheme = useCallback((newTheme: Theme) => {
    updateTheme(newTheme, true);
  }, [updateTheme]);

  // Aplicar tema inicial
  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  // Listener para mudanças de preferência do SO (quando tema = auto)
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      applyTheme('auto');
    };

    // Listener moderno
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [applyTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, hydrateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export type { Theme, ResolvedTheme };
