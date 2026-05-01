'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
} | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function getPreferredDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getPreferredDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function setThemeCookie(resolved: 'light' | 'dark') {
  document.cookie = `themeResolved=${resolved};path=/;max-age=31536000;SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');

  // resolved is derived from mode + system preference
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Initialize: read stored preference, apply theme
  useEffect(() => {
    const stored = localStorage.getItem('themeMode') as ThemeMode | null;
    const initialMode: ThemeMode = stored ?? 'system';
    setModeState(initialMode);
    const r = resolveTheme(initialMode);
    setResolved(r);
    applyTheme(r);
    setThemeCookie(r);
  }, []);

  // Listen for system preference changes (only matters when mode === 'system')
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        const r = getPreferredDark() ? 'dark' : 'light';
        setResolved(r);
        applyTheme(r);
        setThemeCookie(r);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem('themeMode', next);
    const r = resolveTheme(next);
    setResolved(r);
    applyTheme(r);
    setThemeCookie(r);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
