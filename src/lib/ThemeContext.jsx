import { createContext, useState, useContext, useEffect } from 'react';

const dark = {
  bg: '#0a0a0a',
  text: '#fff',
  textMid: 'rgba(255,255,255,0.75)',
  textLow: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.3)',
  border: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.14)',
  bgCard: 'rgba(255,255,255,0.04)',
  bgAlt: 'rgba(255,255,255,0.025)',
  statBg: '#111',
  inputBg: 'rgba(255,255,255,0.06)',
  navBg: 'rgba(10,10,10,0.92)',
  isDark: true,
};

const light = {
  bg: '#f5f4f0',
  text: '#111',
  textMid: 'rgba(0,0,0,0.7)',
  textLow: 'rgba(0,0,0,0.5)',
  textFaint: 'rgba(0,0,0,0.3)',
  border: 'rgba(0,0,0,0.1)',
  borderMid: 'rgba(0,0,0,0.18)',
  bgCard: '#fff',
  bgAlt: 'rgba(0,0,0,0.02)',
  statBg: '#ebe9e5',
  inputBg: '#fff',
  navBg: 'rgba(245,244,240,0.95)',
  isDark: false,
};

export const ThemeCtx = createContext({ ...dark, darkMode: true, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true);

  // Sync with Tailwind's class-based dark mode so all shadcn/ui components
  // and CSS variable consumers automatically flip too.
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const theme = darkMode ? dark : light;
  return (
    <ThemeCtx.Provider value={{ ...theme, darkMode, toggleDark: () => setDarkMode(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
