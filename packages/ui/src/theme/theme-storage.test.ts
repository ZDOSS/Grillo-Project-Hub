import { describe, expect, it } from "vitest";
import { GRILLO_THEME, themeFromSeed } from "./built-in-themes";
import {
  APPEARANCE_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY,
  exportThemeJson,
  parseImportedTheme,
  readAppearancePreferences,
  readCustomThemes,
  saveCustomThemes
} from "./theme-storage";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, value)
  };
}

describe("theme storage", () => {
  it("migrates the legacy color mode into versioned appearance preferences", () => {
    const storage = memoryStorage({ "gph.theme": "dark" });
    expect(readAppearancePreferences(storage)).toMatchObject({ mode: "dark", selectedThemeId: "grillo-adaptive" });
  });

  it("repairs malformed preference fields without losing valid choices", () => {
    const storage = memoryStorage({
      [APPEARANCE_STORAGE_KEY]: JSON.stringify({ mode: "light", selectedThemeId: "graphite", contrast: "invalid" })
    });
    expect(readAppearancePreferences(storage)).toMatchObject({
      mode: "light",
      selectedThemeId: "graphite",
      contrast: "system",
      projectThemeBindings: {}
    });
  });

  it("round-trips custom themes and strips built-in authority", () => {
    const storage = memoryStorage();
    const custom = themeFromSeed({ id: "custom-ocean", name: "Ocean", seedColor: "#245ea8" });
    saveCustomThemes([custom, GRILLO_THEME], storage);
    expect(JSON.parse(storage.getItem(CUSTOM_THEMES_STORAGE_KEY) ?? "[]")).toHaveLength(1);
    expect(readCustomThemes(storage)[0]).toMatchObject({ id: "custom-ocean", builtIn: false });
  });

  it("accepts complete semantic theme JSON and rejects arbitrary or incomplete data", () => {
    const exported = exportThemeJson(GRILLO_THEME);
    expect(parseImportedTheme(exported)).toMatchObject({ name: "Grillo Adaptive", builtIn: false });
    expect(() => parseImportedTheme(JSON.stringify({ id: "unsafe", name: "Unsafe", modes: { light: {}, dark: {} } }))).toThrow(/semantic color roles/);
    expect(() => parseImportedTheme("not json")).toThrow(/valid JSON/);
  });
});
