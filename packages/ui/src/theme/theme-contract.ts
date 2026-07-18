export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = Exclude<ThemeMode, "system">;
export type ThemeContrastPreference = "system" | "standard" | "more";
export type ThemeMotionPreference = "system" | "reduce" | "full";

export const THEME_SCHEMA_VERSION = 1 as const;
export const APPEARANCE_SCHEMA_VERSION = 2 as const;

/** Every authored UI color is represented by one semantic role. */
export const THEME_COLOR_TOKENS = [
  "color-bg-canvas",
  "color-bg-surface",
  "color-bg-elevated",
  "color-bg-muted",
  "color-bg-sidebar",
  "color-bg-sidebar-hover",
  "color-bg-sidebar-active",
  "color-bg-row-hover",
  "color-bg-row-selected",
  "color-bg-status-ok",
  "color-bg-status-warn",
  "color-bg-status-blocked",
  "color-bg-status-done",
  "color-bg-overlay",
  "color-text-primary",
  "color-text-secondary",
  "color-text-muted",
  "color-text-on-accent",
  "color-text-on-danger",
  "color-text-on-sidebar",
  "color-text-on-sidebar-muted",
  "color-text-on-status",
  "color-border-subtle",
  "color-border-strong",
  "color-border-focus",
  "color-accent",
  "color-accent-hover",
  "color-accent-pressed",
  "color-accent-soft",
  "color-accent-contrast",
  "color-danger",
  "color-warn",
  "color-success",
  "color-info",
  "color-status-planned",
  "color-status-active",
  "color-status-completed",
  "color-status-canceled",
  "color-label-blue",
  "color-label-green",
  "color-label-orange",
  "color-label-purple",
  "color-label-red",
  "color-label-yellow",
  "color-shadow",
  "color-sidebar-divider",
  "color-code-bg",
  "color-code-border",
  "color-code-bg-inverse",
  "color-code-border-inverse"
] as const;

export type ThemeColorTokenName = (typeof THEME_COLOR_TOKENS)[number];
export type ThemeColorTokens = Record<ThemeColorTokenName, string>;

export type ThemeDefinition = {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  seedColor: string | null;
  modes: Record<ResolvedThemeMode, ThemeColorTokens>;
  createdAt?: string;
  updatedAt?: string;
};

export type AppearancePreferences = {
  schemaVersion: typeof APPEARANCE_SCHEMA_VERSION;
  mode: ThemeMode;
  selectedThemeId: string;
  projectThemeBindings: Record<string, string>;
  contrast: ThemeContrastPreference;
  motion: ThemeMotionPreference;
};

export type ThemeTokenGroup = {
  id: string;
  label: string;
  description: string;
  tokens: Array<{ name: ThemeColorTokenName; label: string }>;
};

function tokenRows(rows: Array<[ThemeColorTokenName, string]>) {
  return rows.map(([name, label]) => ({ name, label }));
}

export const THEME_TOKEN_GROUPS: ThemeTokenGroup[] = [
  {
    id: "surfaces",
    label: "Canvas & surfaces",
    description: "Workspace layers, navigation, hover states, and overlays.",
    tokens: tokenRows([
      ["color-bg-canvas", "App canvas"],
      ["color-bg-surface", "Primary surface"],
      ["color-bg-elevated", "Elevated surface"],
      ["color-bg-muted", "Muted surface"],
      ["color-bg-sidebar", "Sidebar"],
      ["color-bg-sidebar-hover", "Sidebar hover"],
      ["color-bg-sidebar-active", "Sidebar active"],
      ["color-bg-row-hover", "Row hover"],
      ["color-bg-row-selected", "Row selected"],
      ["color-bg-status-ok", "Positive status surface"],
      ["color-bg-status-warn", "Warning status surface"],
      ["color-bg-status-blocked", "Blocked status surface"],
      ["color-bg-status-done", "Completed status surface"],
      ["color-bg-overlay", "Modal overlay"]
    ])
  },
  {
    id: "text",
    label: "Text & icons",
    description: "Primary hierarchy and text placed on colored surfaces.",
    tokens: tokenRows([
      ["color-text-primary", "Primary text"],
      ["color-text-secondary", "Secondary text"],
      ["color-text-muted", "Muted text"],
      ["color-text-on-accent", "Text on accent"],
      ["color-text-on-danger", "Text on danger"],
      ["color-text-on-sidebar", "Sidebar text"],
      ["color-text-on-sidebar-muted", "Muted sidebar text"],
      ["color-text-on-status", "Status text"]
    ])
  },
  {
    id: "controls",
    label: "Controls & focus",
    description: "Borders, focus rings, links, and interactive accent states.",
    tokens: tokenRows([
      ["color-border-subtle", "Subtle border"],
      ["color-border-strong", "Strong border"],
      ["color-border-focus", "Focus ring"],
      ["color-accent", "Accent"],
      ["color-accent-hover", "Accent hover"],
      ["color-accent-pressed", "Accent pressed"],
      ["color-accent-soft", "Soft accent surface"],
      ["color-accent-contrast", "Accent contrast"]
    ])
  },
  {
    id: "feedback",
    label: "Feedback & workflow",
    description: "Alerts, workflow categories, and state communication.",
    tokens: tokenRows([
      ["color-danger", "Danger"],
      ["color-warn", "Warning"],
      ["color-success", "Success"],
      ["color-info", "Information"],
      ["color-status-planned", "Planned status"],
      ["color-status-active", "Active status"],
      ["color-status-completed", "Completed status"],
      ["color-status-canceled", "Canceled status"]
    ])
  },
  {
    id: "labels",
    label: "Labels",
    description: "Categorical colors used by project labels and work-item chips.",
    tokens: tokenRows([
      ["color-label-blue", "Blue label"],
      ["color-label-green", "Green label"],
      ["color-label-orange", "Orange label"],
      ["color-label-purple", "Purple label"],
      ["color-label-red", "Red label"],
      ["color-label-yellow", "Yellow label"]
    ])
  },
  {
    id: "effects",
    label: "Effects & embedded content",
    description: "Shadow tint, separators, and code surfaces.",
    tokens: tokenRows([
      ["color-shadow", "Shadow tint"],
      ["color-sidebar-divider", "Sidebar divider"],
      ["color-code-bg", "Code background"],
      ["color-code-border", "Code border"],
      ["color-code-bg-inverse", "Inverse code background"],
      ["color-code-border-inverse", "Inverse code border"]
    ])
  }
];
