import type { ResolvedThemeMode, ThemeColorTokens } from "./theme-contract";

type Rgb = { r: number; g: number; b: number };

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isValidThemeColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

export function normalizeThemeColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!HEX_COLOR.test(trimmed)) return null;
  if (trimmed.length === 4 || trimmed.length === 5) {
    return "#" + trimmed.slice(1).split("").map((part) => part + part).join("");
  }
  return trimmed;
}

function hexToRgb(value: string): Rgb {
  const normalized = normalizeThemeColor(value) ?? "#000000";
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function channelToHex(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
}

export function mixThemeColors(first: string, second: string, secondWeight: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const weight = Math.max(0, Math.min(1, secondWeight));
  return "#" + channelToHex(a.r * (1 - weight) + b.r * weight)
    + channelToHex(a.g * (1 - weight) + b.g * weight)
    + channelToHex(a.b * (1 - weight) + b.b * weight);
}

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(value: string): number {
  const { r, g, b } = hexToRgb(value);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

export function contrastRatio(first: string, second: string): number {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

export function readableForeground(background: string): string {
  const light = "#ffffff";
  const dark = "#101713";
  return contrastRatio(light, background) >= contrastRatio(dark, background) ? light : dark;
}

export function deriveAccentTokens(
  tokens: ThemeColorTokens,
  accentColor: string,
  mode: ResolvedThemeMode
): ThemeColorTokens {
  const accent = normalizeThemeColor(accentColor);
  if (!accent || accent.length !== 7) return tokens;
  const surface = tokens["color-bg-surface"];
  const hoverTarget = mode === "dark" ? "#ffffff" : "#000000";

  return {
    ...tokens,
    "color-accent": accent,
    "color-accent-hover": mixThemeColors(accent, hoverTarget, mode === "dark" ? 0.12 : 0.14),
    "color-accent-pressed": mixThemeColors(accent, hoverTarget, mode === "dark" ? 0.2 : 0.24),
    "color-accent-soft": mixThemeColors(accent, surface, mode === "dark" ? 0.72 : 0.82),
    "color-accent-contrast": readableForeground(accent),
    "color-text-on-accent": readableForeground(accent),
    "color-border-focus": accent,
    "color-status-active": accent
  };
}

export function deriveHigherContrastTokens(tokens: ThemeColorTokens): ThemeColorTokens {
  return {
    ...tokens,
    "color-text-muted": tokens["color-text-secondary"],
    "color-border-subtle": tokens["color-border-strong"],
    "color-border-focus": tokens["color-accent"],
    "color-sidebar-divider": tokens["color-text-on-sidebar-muted"]
  };
}
