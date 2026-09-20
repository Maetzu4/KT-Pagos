import { createContext, useContext, useEffect, useState } from 'react';

// ─── Paleta de colores de acento disponibles ────────────────────────────────
export const ACCENT_COLORS = {
  blue:    { label: 'Azul',           value: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8' },
  red:     { label: 'Rojo',           value: '#EF4444', light: '#FCA5A5', dark: '#B91C1C' },
  emerald: { label: 'Verde Esmeralda',value: '#10B981', light: '#6EE7B7', dark: '#047857' },
  purple:  { label: 'Morado',         value: '#8B5CF6', light: '#C4B5FD', dark: '#6D28D9' },
  yellow:  { label: 'Amarillo',       value: '#F59E0B', light: '#FDE68A', dark: '#B45309' },
  orange:  { label: 'Naranja',        value: '#F97316', light: '#FDBA74', dark: '#C2410C' },
  pink:    { label: 'Rosa',           value: '#EC4899', light: '#F9A8D4', dark: '#BE185D' },
  cyan:    { label: 'Cian',           value: '#06B6D4', light: '#67E8F9', dark: '#0E7490' },
};

const ThemeContext = createContext(null);

function applyTheme(mode, accentKey) {
  const root = document.documentElement;
  const accent = ACCENT_COLORS[accentKey] || ACCENT_COLORS.blue;

  // Dark / Light mode
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // CSS variables de acento
  root.style.setProperty('--accent', accent.value);
  root.style.setProperty('--accent-color', accent.value);
  root.style.setProperty('--accent-light', accent.light);
  root.style.setProperty('--accent-dark', accent.dark);
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('kt-mode') || 'dark');
  const [accentKey, setAccentKey] = useState(() => {
    const saved = localStorage.getItem('kt-accent') || 'blue';
    // Migrate old 'mint' key to 'emerald'
    return saved === 'mint' ? 'emerald' : saved;
  });

  // Aplicar tema al montar y en cada cambio
  useEffect(() => {
    applyTheme(mode, accentKey);
  }, [mode, accentKey]);

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem('kt-mode', next);
  };

  const changeAccent = (key) => {
    setAccentKey(key);
    localStorage.setItem('kt-accent', key);
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, accentKey, changeAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
