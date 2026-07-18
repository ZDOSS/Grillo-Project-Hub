import { describe, expect, it } from "vitest";
import { BUILT_IN_THEMES, GRILLO_THEME } from "./built-in-themes";
import {
  contrastRatio,
  deriveAccentTokens,
  mixThemeColors,
  normalizeThemeColor,
  readableForeground
} from "./color-utils";

describe("theme color utilities", () => {
  it("normalizes supported hex colors and rejects arbitrary CSS", () => {
    expect(normalizeThemeColor(" #AbC ")).toBe("#aabbcc");
    expect(normalizeThemeColor("#12345678")).toBe("#12345678");
    expect(normalizeThemeColor("url(example.com)")).toBeNull();
    expect(normalizeThemeColor("red")).toBeNull();
  });

  it("calculates WCAG contrast and readable foregrounds", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 4);
    expect(readableForeground("#f6d365")).toBe("#101713");
    expect(readableForeground("#20352a")).toBe("#ffffff");
  });

  it("derives a complete, accessible accent state set", () => {
    const next = deriveAccentTokens(GRILLO_THEME.modes.light, "#245ea8", "light");
    expect(next["color-accent"]).toBe("#245ea8");
    expect(next["color-accent-soft"]).toBe(mixThemeColors("#245ea8", "#ffffff", 0.82));
    expect(contrastRatio(next["color-text-on-accent"], next["color-accent"])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps every built-in text and strong-boundary pair above its target", () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const mode of ["light", "dark"] as const) {
        const tokens = theme.modes[mode];
        expect(contrastRatio(tokens["color-text-primary"], tokens["color-bg-surface"]), `${theme.name} ${mode} primary`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["color-text-secondary"], tokens["color-bg-surface"]), `${theme.name} ${mode} secondary`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["color-text-on-accent"], tokens["color-accent"]), `${theme.name} ${mode} accent`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["color-border-strong"], tokens["color-bg-surface"]), `${theme.name} ${mode} boundary`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
