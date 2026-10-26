import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('fleetdash_theme') as Theme | null;
  return saved || 'dark'; // Default to sleek command-center dark mode
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  effectiveTheme: getStoredTheme() === 'system' ? getSystemTheme() : (getStoredTheme() as 'light' | 'dark'),
  setTheme: (theme: Theme) => {
    localStorage.setItem('fleetdash_theme', theme);
    const effective = theme === 'system' ? getSystemTheme() : theme;
    
    if (effective === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    set({ theme, effectiveTheme: effective });
  },
  toggleTheme: () => {
    const current = get().effectiveTheme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

// Initialize theme class immediately
if (typeof window !== 'undefined') {
  const initial = getStoredTheme();
  const effective = initial === 'system' ? getSystemTheme() : initial;
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
