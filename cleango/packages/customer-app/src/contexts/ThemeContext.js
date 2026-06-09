import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import { Colors, DarkColors } from '../constants/colors';
import { getTheme, setTheme } from '../services/storage';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeOverride, setThemeOverride] = useState(() => getTheme()); // 'light' | 'dark' | null

  // Effective scheme: explicit override → system → 'light'
  const effectiveScheme = themeOverride || systemScheme || 'light';
  const isDark = effectiveScheme === 'dark';
  const colors = isDark ? DarkColors : Colors;

  // Persist preference
  useEffect(() => {
    if (themeOverride) {
      setTheme(themeOverride);
    }
  }, [themeOverride]);

  const toggleTheme = useCallback(() => {
    setThemeOverride((prev) => {
      const next = (prev || systemScheme || 'light') === 'light' ? 'dark' : 'light';
      setTheme(next);
      return next;
    });
  }, [systemScheme]);

  const setExplicitTheme = useCallback((t) => {
    setThemeOverride(t);
  }, []);

  const resetToSystem = useCallback(() => {
    setThemeOverride(null);
  }, []);

  const value = {
    isDark,
    colors,
    scheme: effectiveScheme,
    themeOverride,
    toggleTheme,
    setTheme: setExplicitTheme,
    resetToSystem,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
