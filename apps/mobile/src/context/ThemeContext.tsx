import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS } from '../lib/theme/tokens';

const STORAGE_KEY = '@ceylonify/darkMode';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  error: string;
  success: string;
  iconMuted: string;
  divider: string;
  inputBackground: string;
};

const LIGHT_COLORS: ThemeColors = {
  background: TOKENS.colors.backgroundLight,
  surface: TOKENS.colors.cardSurface,
  text: TOKENS.colors.textPrimary,
  textMuted: TOKENS.colors.mutedText,
  border: TOKENS.colors.border,
  primary: TOKENS.colors.primary,
  error: TOKENS.colors.error,
  success: TOKENS.colors.success,
  iconMuted: TOKENS.colors.mutedText,
  divider: '#F3F4F6',
  inputBackground: TOKENS.colors.backgroundLight,
};

const DARK_COLORS: ThemeColors = {
  background: TOKENS.colors.backgroundDark,
  surface: TOKENS.colors.navy,
  text: TOKENS.colors.textOnDark,
  textMuted: '#94A3B8',
  border: '#1E293B',
  primary: TOKENS.colors.primary,
  error: TOKENS.colors.error,
  success: TOKENS.colors.success,
  iconMuted: '#94A3B8',
  divider: '#1E293B',
  inputBackground: '#0F172A',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ThemeColors;
  ready: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'true') setIsDark(true);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  const toggleDarkMode = useCallback(async () => {
    await setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo(
    () => ({ isDark, colors, ready, setDarkMode, toggleDarkMode }),
    [isDark, colors, ready, setDarkMode, toggleDarkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
