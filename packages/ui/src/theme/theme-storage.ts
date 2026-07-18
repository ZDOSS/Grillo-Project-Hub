import { GRILLO_THEME_ID } from "./built-in-themes";
import { normalizeThemeColor } from "./color-utils";
import {
  APPEARANCE_SCHEMA_VERSION,
  THEME_COLOR_TOKENS,
  THEME_SCHEMA_VERSION,
  type AppearancePreferences,
  type ThemeColorTokens,
  type ThemeDefinition,
  type ThemeMode
} from "./theme-contract";

export const APPEARANCE_STORAGE_KEY = "gph.appearance.v2";
export const CUSTOM_THEMES_STORAGE_KEY = "gph.custom-themes.v1";
export const LEGACY_THEME_STORAGE_KEY = "gph.theme";

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  schemaVersion: APPEARANCE_SCHEMA_VERSION,
  mode: "system",
  selectedThemeId: GRILLO_THEME_ID,
  projectThemeBindings: {},
  contrast: "system",
  motion: "system"
};

function browserStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function readAppearancePreferences(storage: Storage | null = browserStorage()): AppearancePreferences {
  if (!storage) return { ...DEFAULT_APPEARANCE_PREFERENCES };
  try {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed)) {
        const bindings = isRecord(parsed.projectThemeBindings)
          ? Object.fromEntries(Object.entries(parsed.projectThemeBindings).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
          : {};
        return {
          schemaVersion: APPEARANCE_SCHEMA_VERSION,
          mode: isThemeMode(parsed.mode) ? parsed.mode : "system",
          selectedThemeId: typeof parsed.selectedThemeId === "string" ? parsed.selectedThemeId : GRILLO_THEME_ID,
          projectThemeBindings: bindings,
          contrast: parsed.contrast === "more" || parsed.contrast === "standard" ? parsed.contrast : "system",
          motion: parsed.motion === "reduce" || parsed.motion === "full" ? parsed.motion : "system"
        };
      }
    }

    const legacy = storage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (isThemeMode(legacy)) {
      return { ...DEFAULT_APPEARANCE_PREFERENCES, mode: legacy };
    }
  } catch {}
  return { ...DEFAULT_APPEARANCE_PREFERENCES };
}

export function saveAppearancePreferences(
  preferences: AppearancePreferences,
  storage: Storage | null = browserStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(preferences));
    storage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {}
}

function sanitizeTokenMap(value: unknown): ThemeColorTokens | null {
  if (!isRecord(value)) return null;
  const tokens = {} as ThemeColorTokens;
  for (const token of THEME_COLOR_TOKENS) {
    const raw = value[token];
    if (typeof raw !== "string") return null;
    const normalized = normalizeThemeColor(raw);
    if (!normalized) return null;
    tokens[token] = normalized;
  }
  return tokens;
}

export function sanitizeThemeDefinition(value: unknown): ThemeDefinition | null {
  if (!isRecord(value) || !isRecord(value.modes)) return null;
  const light = sanitizeTokenMap(value.modes.light);
  const dark = sanitizeTokenMap(value.modes.dark);
  if (!light || !dark) return null;
  const id = typeof value.id === "string" ? value.id.trim().slice(0, 100) : "";
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 80) : "";
  if (!id || !name) return null;
  const seedColor = typeof value.seedColor === "string" ? normalizeThemeColor(value.seedColor) : null;
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id,
    name,
    description: typeof value.description === "string" ? value.description.trim().slice(0, 240) : "A custom Grillo theme.",
    builtIn: false,
    seedColor,
    modes: { light, dark },
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined
  };
}

export function readCustomThemes(storage: Storage | null = browserStorage()): ThemeDefinition[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeThemeDefinition).filter((theme): theme is ThemeDefinition => theme !== null);
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: ThemeDefinition[], storage: Storage | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes.filter((theme) => !theme.builtIn)));
  } catch {}
}

export function parseImportedTheme(raw: string): ThemeDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Theme file is not valid JSON.");
  }
  const theme = sanitizeThemeDefinition(parsed);
  if (!theme) {
    throw new Error("Theme file is missing required semantic color roles or contains unsupported values.");
  }
  return theme;
}

export function exportThemeJson(theme: ThemeDefinition): string {
  return JSON.stringify({ ...theme, builtIn: false }, null, 2);
}
