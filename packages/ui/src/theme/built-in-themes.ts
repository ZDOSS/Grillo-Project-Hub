import { deriveAccentTokens } from "./color-utils";
import {
  THEME_SCHEMA_VERSION,
  type ThemeColorTokens,
  type ThemeDefinition
} from "./theme-contract";

export const GRILLO_THEME_ID = "grillo-adaptive";

const grilloLight: ThemeColorTokens = {
  "color-bg-canvas": "#f7f5f0",
  "color-bg-surface": "#ffffff",
  "color-bg-elevated": "#ffffff",
  "color-bg-muted": "#efece5",
  "color-bg-sidebar": "#2c3530",
  "color-bg-sidebar-hover": "#38433c",
  "color-bg-sidebar-active": "#435049",
  "color-bg-row-hover": "#f0ede5",
  "color-bg-row-selected": "#e3eee0",
  "color-bg-status-ok": "#e3eee0",
  "color-bg-status-warn": "#fbf2dc",
  "color-bg-status-blocked": "#f4dada",
  "color-bg-status-done": "#d8e6d0",
  "color-bg-overlay": "#1c24205c",
  "color-text-primary": "#1d2620",
  "color-text-secondary": "#525a53",
  "color-text-muted": "#687069",
  "color-text-on-accent": "#ffffff",
  "color-text-on-danger": "#ffffff",
  "color-text-on-sidebar": "#f1f4ef",
  "color-text-on-sidebar-muted": "#bac2b9",
  "color-text-on-status": "#2a3530",
  "color-border-subtle": "#d7d3c9",
  "color-border-strong": "#999487",
  "color-border-focus": "#3f7647",
  "color-accent": "#3f7647",
  "color-accent-hover": "#35643c",
  "color-accent-pressed": "#2b5332",
  "color-accent-soft": "#dce9d7",
  "color-accent-contrast": "#ffffff",
  "color-danger": "#a52f35",
  "color-warn": "#9b6818",
  "color-success": "#2e6a4d",
  "color-info": "#356f9f",
  "color-status-planned": "#59675a",
  "color-status-active": "#3f7647",
  "color-status-completed": "#2e6a4d",
  "color-status-canceled": "#7a5c27",
  "color-label-blue": "#dceaf7",
  "color-label-green": "#dcebdc",
  "color-label-orange": "#f7e4cf",
  "color-label-purple": "#e9dff4",
  "color-label-red": "#f4dada",
  "color-label-yellow": "#f6edc7",
  "color-shadow": "#1c2420",
  "color-sidebar-divider": "#ffffff1f",
  "color-code-bg": "#00000014",
  "color-code-border": "#00000024",
  "color-code-bg-inverse": "#ffffff1a",
  "color-code-border-inverse": "#ffffff29"
};

const grilloDark: ThemeColorTokens = {
  "color-bg-canvas": "#1c2420",
  "color-bg-surface": "#232b27",
  "color-bg-elevated": "#2a322d",
  "color-bg-muted": "#1a201d",
  "color-bg-sidebar": "#111713",
  "color-bg-sidebar-hover": "#1f2622",
  "color-bg-sidebar-active": "#2a312c",
  "color-bg-row-hover": "#2a312c",
  "color-bg-row-selected": "#2d3a32",
  "color-bg-status-ok": "#2d3a32",
  "color-bg-status-warn": "#3a3220",
  "color-bg-status-blocked": "#3a2828",
  "color-bg-status-done": "#233228",
  "color-bg-overlay": "#0000008c",
  "color-text-primary": "#f0f2ed",
  "color-text-secondary": "#c2c8bf",
  "color-text-muted": "#9da49a",
  "color-text-on-accent": "#101713",
  "color-text-on-danger": "#101713",
  "color-text-on-sidebar": "#edf1e9",
  "color-text-on-sidebar-muted": "#aab3a7",
  "color-text-on-status": "#f0f2ed",
  "color-border-subtle": "#3b443e",
  "color-border-strong": "#6b766e",
  "color-border-focus": "#79b982",
  "color-accent": "#79b982",
  "color-accent-hover": "#89c991",
  "color-accent-pressed": "#98d7a0",
  "color-accent-soft": "#304238",
  "color-accent-contrast": "#101713",
  "color-danger": "#ef7f83",
  "color-warn": "#e2b766",
  "color-success": "#79b982",
  "color-info": "#83b8e2",
  "color-status-planned": "#b4c0b1",
  "color-status-active": "#79b982",
  "color-status-completed": "#64aa78",
  "color-status-canceled": "#d3b071",
  "color-label-blue": "#2d4355",
  "color-label-green": "#304638",
  "color-label-orange": "#4b3929",
  "color-label-purple": "#40364e",
  "color-label-red": "#4c3032",
  "color-label-yellow": "#494328",
  "color-shadow": "#000000",
  "color-sidebar-divider": "#ffffff1f",
  "color-code-bg": "#ffffff1a",
  "color-code-border": "#ffffff29",
  "color-code-bg-inverse": "#00000024",
  "color-code-border-inverse": "#00000038"
};

function override(base: ThemeColorTokens, patch: Partial<ThemeColorTokens>): ThemeColorTokens {
  return { ...base, ...patch };
}

export const GRILLO_THEME: ThemeDefinition = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: GRILLO_THEME_ID,
  name: "Grillo Adaptive",
  description: "The familiar warm, nature-led Grillo palette with stronger contrast.",
  builtIn: true,
  seedColor: "#3f7647",
  modes: { light: grilloLight, dark: grilloDark }
};

const graphiteLight = deriveAccentTokens(override(grilloLight, {
  "color-bg-canvas": "#f4f5f6",
  "color-bg-muted": "#e9ebed",
  "color-bg-sidebar": "#24282d",
  "color-bg-sidebar-hover": "#343a41",
  "color-bg-sidebar-active": "#434b54",
  "color-bg-row-hover": "#eceff1",
  "color-bg-row-selected": "#e2eaf5",
  "color-text-primary": "#202429",
  "color-text-secondary": "#515861",
  "color-text-muted": "#666f79",
  "color-border-subtle": "#d2d6da",
  "color-border-strong": "#8d959e",
  "color-shadow": "#202429"
}), "#315f9c", "light");

const graphiteDark = deriveAccentTokens(override(grilloDark, {
  "color-bg-canvas": "#181b1f",
  "color-bg-surface": "#22262b",
  "color-bg-elevated": "#292e34",
  "color-bg-muted": "#15181b",
  "color-bg-sidebar": "#111316",
  "color-bg-sidebar-hover": "#252a30",
  "color-bg-sidebar-active": "#30363d",
  "color-bg-row-hover": "#292e34",
  "color-bg-row-selected": "#293748",
  "color-text-primary": "#f1f3f5",
  "color-text-secondary": "#c4c9cf",
  "color-text-muted": "#9ba3ac",
  "color-border-subtle": "#3a4149",
  "color-border-strong": "#6b7784"
}), "#7eace8", "dark");

const warmLight = deriveAccentTokens(override(grilloLight, {
  "color-bg-canvas": "#fbf5e9",
  "color-bg-surface": "#fffdf8",
  "color-bg-elevated": "#ffffff",
  "color-bg-muted": "#f2e7d3",
  "color-bg-sidebar": "#4a372d",
  "color-bg-sidebar-hover": "#5a4437",
  "color-bg-sidebar-active": "#6b5140",
  "color-bg-row-hover": "#f6ead7",
  "color-bg-row-selected": "#f5dfc7",
  "color-text-primary": "#35251e",
  "color-text-secondary": "#6c5549",
  "color-text-muted": "#7f6a5f",
  "color-border-subtle": "#e3d3bd",
  "color-border-strong": "#9d846d",
  "color-shadow": "#3d2b22"
}), "#a4472f", "light");

const warmDark = deriveAccentTokens(override(grilloDark, {
  "color-bg-canvas": "#251d19",
  "color-bg-surface": "#302520",
  "color-bg-elevated": "#392c26",
  "color-bg-muted": "#211916",
  "color-bg-sidebar": "#19120f",
  "color-bg-sidebar-hover": "#30241f",
  "color-bg-sidebar-active": "#443128",
  "color-bg-row-hover": "#392c26",
  "color-bg-row-selected": "#493127",
  "color-text-primary": "#faeee6",
  "color-text-secondary": "#d9c3b7",
  "color-text-muted": "#b59e92",
  "color-border-subtle": "#4c3b33",
  "color-border-strong": "#8c6e5e"
}), "#e88a68", "dark");

const highContrastLight = deriveAccentTokens(override(grilloLight, {
  "color-bg-canvas": "#ffffff",
  "color-bg-surface": "#ffffff",
  "color-bg-elevated": "#ffffff",
  "color-bg-muted": "#f1f1f1",
  "color-bg-sidebar": "#000000",
  "color-bg-sidebar-hover": "#242424",
  "color-bg-sidebar-active": "#3b3b3b",
  "color-text-primary": "#000000",
  "color-text-secondary": "#222222",
  "color-text-muted": "#444444",
  "color-text-on-sidebar": "#ffffff",
  "color-text-on-sidebar-muted": "#e0e0e0",
  "color-border-subtle": "#6b6b6b",
  "color-border-strong": "#222222",
  "color-shadow": "#000000"
}), "#004f8f", "light");

const highContrastDark = deriveAccentTokens(override(grilloDark, {
  "color-bg-canvas": "#000000",
  "color-bg-surface": "#0d0d0d",
  "color-bg-elevated": "#171717",
  "color-bg-muted": "#000000",
  "color-bg-sidebar": "#000000",
  "color-bg-sidebar-hover": "#242424",
  "color-bg-sidebar-active": "#383838",
  "color-text-primary": "#ffffff",
  "color-text-secondary": "#f0f0f0",
  "color-text-muted": "#c9c9c9",
  "color-border-subtle": "#808080",
  "color-border-strong": "#d0d0d0",
  "color-shadow": "#000000"
}), "#86c5ff", "dark");

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  GRILLO_THEME,
  {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: "graphite",
    name: "Graphite",
    description: "A cooler, neutral workspace with a focused blue accent.",
    builtIn: true,
    seedColor: "#315f9c",
    modes: { light: graphiteLight, dark: graphiteDark }
  },
  {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: "warm-sand",
    name: "Warm Sand",
    description: "A softer, editorial palette with terracotta accents.",
    builtIn: true,
    seedColor: "#a4472f",
    modes: { light: warmLight, dark: warmDark }
  },
  {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: "high-contrast",
    name: "High Contrast",
    description: "Maximum separation for text, controls, and workspace layers.",
    builtIn: true,
    seedColor: "#004f8f",
    modes: { light: highContrastLight, dark: highContrastDark }
  }
];

export function themeFromSeed(input: {
  id: string;
  name: string;
  description?: string;
  seedColor: string;
  source?: ThemeDefinition;
}): ThemeDefinition {
  const source = input.source ?? GRILLO_THEME;
  const now = new Date().toISOString();
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: input.id,
    name: input.name,
    description: input.description ?? "A custom Grillo theme.",
    builtIn: false,
    seedColor: input.seedColor,
    modes: {
      light: deriveAccentTokens({ ...source.modes.light }, input.seedColor, "light"),
      dark: deriveAccentTokens({ ...source.modes.dark }, input.seedColor, "dark")
    },
    createdAt: now,
    updatedAt: now
  };
}
