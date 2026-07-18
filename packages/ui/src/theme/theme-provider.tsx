import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useProjectStore } from "../store/project-store";
import { BUILT_IN_THEMES, GRILLO_THEME, GRILLO_THEME_ID } from "./built-in-themes";
import { deriveAccentTokens, deriveHigherContrastTokens } from "./color-utils";
import {
  APPEARANCE_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY,
  DEFAULT_APPEARANCE_PREFERENCES,
  readAppearancePreferences,
  readCustomThemes,
  saveAppearancePreferences,
  saveCustomThemes
} from "./theme-storage";
import type {
  AppearancePreferences,
  ResolvedThemeMode,
  ThemeContrastPreference,
  ThemeDefinition,
  ThemeMode,
  ThemeMotionPreference
} from "./theme-contract";

export type { ThemeMode } from "./theme-contract";

export type ThemeContextValue = {
  theme: ThemeMode;
  resolved: ResolvedThemeMode;
  preferences: AppearancePreferences;
  themes: ThemeDefinition[];
  activeTheme: ThemeDefinition;
  selectedTheme: ThemeDefinition;
  projectThemeId: string | null;
  previewTheme: ThemeDefinition | null;
  setTheme: (theme: ThemeMode) => void;
  setContrast: (contrast: ThemeContrastPreference) => void;
  setMotion: (motion: ThemeMotionPreference) => void;
  selectTheme: (themeId: string) => void;
  setProjectTheme: (projectId: string, themeId: string | null) => void;
  saveTheme: (theme: ThemeDefinition) => void;
  deleteTheme: (themeId: string) => void;
  setPreviewTheme: (theme: ThemeDefinition | null) => void;
  resetAppearance: () => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function mediaMatches(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(query).matches ?? false;
}

function resolveSystem(): ResolvedThemeMode {
  return mediaMatches("(prefers-color-scheme: dark)") ? "dark" : "light";
}

function subscribeToMedia(query: string, onChange: (matches: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia?.(query);
  if (!media) return () => {};
  const handler = () => onChange(media.matches);
  media.addEventListener?.("change", handler);
  return () => media.removeEventListener?.("change", handler);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const projectId = useProjectStore((state) => state.bundle?.project.id ?? null);
  const projectAccent = useProjectStore((state) => state.bundle?.project.accentColor ?? null);
  const [preferences, setPreferencesState] = useState<AppearancePreferences>(() => readAppearancePreferences());
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() => readCustomThemes());
  const [previewTheme, setPreviewTheme] = useState<ThemeDefinition | null>(null);
  const [systemResolved, setSystemResolved] = useState<ResolvedThemeMode>(() => resolveSystem());
  const [systemContrastMore, setSystemContrastMore] = useState(() => mediaMatches("(prefers-contrast: more)"));
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => mediaMatches("(prefers-reduced-motion: reduce)"));

  useEffect(() => subscribeToMedia("(prefers-color-scheme: dark)", (matches) => setSystemResolved(matches ? "dark" : "light")), []);
  useEffect(() => subscribeToMedia("(prefers-contrast: more)", setSystemContrastMore), []);
  useEffect(() => subscribeToMedia("(prefers-reduced-motion: reduce)", setSystemReducedMotion), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) setPreferencesState(readAppearancePreferences());
      if (event.key === CUSTOM_THEMES_STORAGE_KEY) setCustomThemes(readCustomThemes());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const themes = useMemo(() => [...BUILT_IN_THEMES, ...customThemes], [customThemes]);
  const selectedTheme = themes.find((entry) => entry.id === preferences.selectedThemeId) ?? GRILLO_THEME;
  const projectThemeId = projectId ? preferences.projectThemeBindings[projectId] ?? null : null;
  const projectTheme = projectThemeId ? themes.find((entry) => entry.id === projectThemeId) ?? null : null;
  const activeTheme = previewTheme ?? projectTheme ?? selectedTheme;
  const resolved: ResolvedThemeMode = preferences.mode === "system" ? systemResolved : preferences.mode;

  const contrast = preferences.contrast === "system"
    ? (systemContrastMore ? "more" : "standard")
    : preferences.contrast;
  const motion = preferences.motion === "system"
    ? (systemReducedMotion ? "reduce" : "full")
    : preferences.motion;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sourceTokens = activeTheme.modes[resolved];
    const accentedTokens = projectAccent ? deriveAccentTokens(sourceTokens, projectAccent, resolved) : sourceTokens;
    const tokens = contrast === "more" ? deriveHigherContrastTokens(accentedTokens) : accentedTokens;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-id", activeTheme.id);
    root.setAttribute("data-contrast", contrast);
    root.setAttribute("data-motion", motion);
    root.style.colorScheme = resolved;
    for (const [token, value] of Object.entries(tokens)) {
      root.style.setProperty("--" + token, value);
    }
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", tokens["color-accent"]);
  }, [activeTheme, contrast, motion, projectAccent, resolved]);

  const updatePreferences = useCallback((updater: (current: AppearancePreferences) => AppearancePreferences) => {
    setPreferencesState((current) => {
      const next = updater(current);
      saveAppearancePreferences(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    updatePreferences((current) => ({ ...current, mode }));
  }, [updatePreferences]);

  const setContrast = useCallback((next: ThemeContrastPreference) => {
    updatePreferences((current) => ({ ...current, contrast: next }));
  }, [updatePreferences]);

  const setMotion = useCallback((next: ThemeMotionPreference) => {
    updatePreferences((current) => ({ ...current, motion: next }));
  }, [updatePreferences]);

  const selectTheme = useCallback((themeId: string) => {
    updatePreferences((current) => ({ ...current, selectedThemeId: themeId }));
    setPreviewTheme(null);
  }, [updatePreferences]);

  const setProjectTheme = useCallback((targetProjectId: string, themeId: string | null) => {
    updatePreferences((current) => {
      const bindings = { ...current.projectThemeBindings };
      if (themeId) bindings[targetProjectId] = themeId;
      else delete bindings[targetProjectId];
      return { ...current, projectThemeBindings: bindings };
    });
    setPreviewTheme(null);
  }, [updatePreferences]);

  const saveTheme = useCallback((theme: ThemeDefinition) => {
    setCustomThemes((current) => {
      const nextTheme = { ...theme, builtIn: false, updatedAt: new Date().toISOString() };
      const next = current.some((entry) => entry.id === nextTheme.id)
        ? current.map((entry) => entry.id === nextTheme.id ? nextTheme : entry)
        : [...current, nextTheme];
      saveCustomThemes(next);
      return next;
    });
  }, []);

  const deleteTheme = useCallback((themeId: string) => {
    if (BUILT_IN_THEMES.some((entry) => entry.id === themeId)) return;
    setCustomThemes((current) => {
      const next = current.filter((entry) => entry.id !== themeId);
      saveCustomThemes(next);
      return next;
    });
    updatePreferences((current) => ({
      ...current,
      selectedThemeId: current.selectedThemeId === themeId ? GRILLO_THEME_ID : current.selectedThemeId,
      projectThemeBindings: Object.fromEntries(
        Object.entries(current.projectThemeBindings).filter(([, value]) => value !== themeId)
      )
    }));
    setPreviewTheme((current) => current?.id === themeId ? null : current);
  }, [updatePreferences]);

  const resetAppearance = useCallback(() => {
    const next = { ...DEFAULT_APPEARANCE_PREFERENCES, projectThemeBindings: {} };
    setPreferencesState(next);
    saveAppearancePreferences(next);
    setPreviewTheme(null);
  }, []);

  const toggle = useCallback(() => {
    const effective = preferences.mode === "system" ? systemResolved : preferences.mode;
    setTheme(effective === "dark" ? "light" : "dark");
  }, [preferences.mode, setTheme, systemResolved]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: preferences.mode,
    resolved,
    preferences,
    themes,
    activeTheme,
    selectedTheme,
    projectThemeId,
    previewTheme,
    setTheme,
    setContrast,
    setMotion,
    selectTheme,
    setProjectTheme,
    saveTheme,
    deleteTheme,
    setPreviewTheme,
    resetAppearance,
    toggle
  }), [
    activeTheme,
    deleteTheme,
    preferences,
    previewTheme,
    projectThemeId,
    resolved,
    saveTheme,
    selectTheme,
    selectedTheme,
    setContrast,
    setMotion,
    setProjectTheme,
    setTheme,
    themes,
    toggle
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
