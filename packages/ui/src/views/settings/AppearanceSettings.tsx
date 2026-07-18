import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useProjectStore } from "../../store/project-store";
import { themeFromSeed } from "../../theme/built-in-themes";
import { contrastRatio, isValidThemeColor, normalizeThemeColor } from "../../theme/color-utils";
import { useTheme } from "../../theme/theme-provider";
import { THEME_TOKEN_GROUPS, type ResolvedThemeMode, type ThemeDefinition } from "../../theme/theme-contract";
import { exportThemeJson, parseImportedTheme, sanitizeThemeDefinition } from "../../theme/theme-storage";
import { SettingsPanelHeader, SettingsSectionCard } from "./settings-shared";

type ThemeScope = "global" | "project";

export function AppearanceSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const {
    activeTheme,
    deleteTheme,
    preferences,
    previewTheme,
    projectThemeId,
    resetAppearance,
    resolved,
    saveTheme,
    selectedTheme,
    selectTheme,
    setContrast,
    setMotion,
    setPreviewTheme,
    setProjectTheme,
    setTheme,
    themes
  } = useTheme();
  const [scope, setScope] = useState<ThemeScope>(() => projectThemeId ? "project" : "global");
  const [newThemeName, setNewThemeName] = useState("My Grillo theme");
  const [seedColor, setSeedColor] = useState(activeTheme.modes[resolved]["color-accent"]);
  const [draft, setDraft] = useState<ThemeDefinition | null>(null);
  const [editorMode, setEditorMode] = useState<ResolvedThemeMode>(resolved);
  const [status, setStatus] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [accentDraft, setAccentDraft] = useState(bundle?.project.accentColor ?? "");

  const projectId = bundle?.project.id ?? null;
  const scopedThemeId = scope === "project" && projectThemeId ? projectThemeId : selectedTheme.id;
  const scopedTheme = themes.find((entry) => entry.id === scopedThemeId) ?? selectedTheme;
  const editingTheme = draft ?? (!scopedTheme.builtIn ? scopedTheme : null);
  const contrastChecks = useMemo(() => editingTheme ? auditThemeContrast(editingTheme) : [], [editingTheme]);
  const contrastWarnings = contrastChecks.filter((entry) => !entry.pass);

  useEffect(() => {
    setAccentDraft(bundle?.project.accentColor ?? "");
  }, [bundle?.project.accentColor]);

  useEffect(() => () => setPreviewTheme(null), [setPreviewTheme]);

  useEffect(() => {
    if (previewTheme && draft) setPreviewTheme(draft);
  }, [draft, previewTheme, setPreviewTheme]);

  if (!bundle) return null;

  const applyTheme = (themeId: string) => {
    if (scope === "project" && projectId) setProjectTheme(projectId, themeId);
    else selectTheme(themeId);
    setDraft(null);
    setDeleteArmed(false);
    setStatus(scope === "project" ? "Theme applied to this project on this device." : "Default theme updated on this device.");
  };

  const createTheme = () => {
    const normalizedSeed = normalizeThemeColor(seedColor);
    if (!normalizedSeed || normalizedSeed.length !== 7 || !newThemeName.trim()) {
      setStatus("Enter a name and a six-digit seed color.");
      return;
    }
    const next = themeFromSeed({
      id: uniqueThemeId(newThemeName, themes),
      name: newThemeName.trim(),
      seedColor: normalizedSeed,
      source: activeTheme
    });
    saveTheme(next);
    applyTheme(next.id);
    setDraft(next);
    setStatus("Custom theme created. Fine-tune any semantic role below.");
  };

  const cloneTheme = () => {
    const now = new Date().toISOString();
    const next: ThemeDefinition = {
      ...activeTheme,
      id: uniqueThemeId(activeTheme.name + " copy", themes),
      name: activeTheme.name + " Copy",
      description: "A fully editable copy of " + activeTheme.name + ".",
      builtIn: false,
      modes: { light: { ...activeTheme.modes.light }, dark: { ...activeTheme.modes.dark } },
      createdAt: now,
      updatedAt: now
    };
    saveTheme(next);
    applyTheme(next.id);
    setDraft(next);
    setStatus("Editable copy created.");
  };

  const saveDraft = () => {
    if (!draft) return;
    const safe = sanitizeThemeDefinition(draft);
    if (!safe) {
      setStatus("Fix invalid colors before saving. Use hex values such as #3f7647 or #1c24205c.");
      return;
    }
    saveTheme(safe);
    applyTheme(safe.id);
    setDraft(null);
    setPreviewTheme(null);
    setStatus(contrastWarnings.length > 0
      ? "Theme saved with contrast warnings. Review the accessibility report before sharing it."
      : "Theme saved. All tested text and control pairs meet their target contrast.");
  };

  const importTheme = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseImportedTheme(await file.text());
      const next = {
        ...imported,
        id: themes.some((entry) => entry.id === imported.id) ? uniqueThemeId(imported.name, themes) : imported.id,
        builtIn: false
      };
      saveTheme(next);
      applyTheme(next.id);
      setDraft(next);
      setStatus("Theme imported safely. Only recognized semantic color values were accepted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Theme could not be imported.");
    }
  };

  const exportActiveTheme = () => {
    const blob = new Blob([exportThemeJson(scopedTheme)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = slugify(scopedTheme.name) + ".gph-theme.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Theme exported as portable, versioned JSON.");
  };

  const applyProjectAccent = () => {
    const normalized = normalizeThemeColor(accentDraft);
    if (!normalized || normalized.length !== 7) {
      setStatus("Project accent must be a six-digit hex color.");
      return;
    }
    applyCommand({
      type: "project.updateSettings",
      projectId: bundle.project.id,
      patch: { accentColor: normalized }
    });
    setStatus("Shared project accent updated. Grillo automatically repairs its button text color.");
  };

  return (
    <div className="settings-panel-stack appearance-settings">
      <SettingsPanelHeader
        title="Appearance"
        description="Choose a polished preset, create a theme from one color, or control every semantic UI color. Preferences stay personal unless you set the shared project accent."
      />

      <SettingsSectionCard title="Display behavior" description="Follow your operating system or choose an explicit presentation.">
        <div className="appearance-control-grid">
          <label className="label">
            Color mode
            <select className="select" value={preferences.mode} onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}>
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="label">
            Contrast
            <select className="select" value={preferences.contrast} onChange={(event) => setContrast(event.target.value as "system" | "standard" | "more")}>
              <option value="system">Follow system</option>
              <option value="standard">Standard</option>
              <option value="more">More contrast</option>
            </select>
          </label>
          <label className="label">
            Motion
            <select className="select" value={preferences.motion} onChange={(event) => setMotion(event.target.value as "system" | "reduce" | "full")}>
              <option value="system">Follow system</option>
              <option value="reduce">Reduce motion</option>
              <option value="full">Full motion</option>
            </select>
          </label>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Theme library" description="Built-in themes are immutable. Clone one when you want to change individual roles.">
        <div className="appearance-scope-row" aria-label="Theme scope">
          <button type="button" className={scope === "global" ? "btn btn-primary" : "btn"} onClick={() => setScope("global")}>Default on this device</button>
          <button type="button" className={scope === "project" ? "btn btn-primary" : "btn"} onClick={() => setScope("project")}>Only {bundle.project.name}</button>
          {projectThemeId ? <button type="button" className="btn btn-ghost" onClick={() => setProjectTheme(bundle.project.id, null)}>Clear project override</button> : null}
        </div>
        <div className="theme-card-grid" role="radiogroup" aria-label="Available themes">
          {themes.map((theme) => (
            <ThemeCard
              checked={theme.id === scopedThemeId}
              key={theme.id}
              mode={resolved}
              onSelect={() => applyTheme(theme.id)}
              theme={theme}
            />
          ))}
        </div>
        <div className="appearance-actions">
          <button type="button" className="btn" onClick={cloneTheme}>Clone active theme</button>
          <button type="button" className="btn" onClick={exportActiveTheme}>Export selected</button>
          <label className="btn appearance-file-button">
            Import theme
            <input aria-label="Import theme JSON" type="file" accept="application/json,.json" onChange={importTheme} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={resetAppearance}>Reset appearance</button>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Create from a color" description="Start with any existing theme and generate accessible accent, hover, pressed, and soft states.">
        <div className="theme-create-grid">
          <label className="label">
            Theme name
            <input className="input" value={newThemeName} onChange={(event) => setNewThemeName(event.target.value)} />
          </label>
          <ColorValueInput label="Seed color" value={seedColor} onChange={setSeedColor} />
          <button type="button" className="btn btn-primary" onClick={createTheme}>Create theme</button>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Project identity" description="This one accent is saved in the project and shared with collaborators. All other theme choices remain personal.">
        <div className="theme-create-grid">
          <ColorValueInput
            label="Shared accent"
            value={accentDraft || activeTheme.modes[resolved]["color-accent"]}
            onChange={setAccentDraft}
          />
          <button type="button" className="btn btn-primary" onClick={applyProjectAccent}>Apply project accent</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setAccentDraft("");
              applyCommand({ type: "project.updateSettings", projectId: bundle.project.id, patch: { accentColor: null } });
              setStatus("Project accent now follows each person's selected theme.");
            }}
          >
            Follow theme
          </button>
        </div>
      </SettingsSectionCard>

      {editingTheme ? (
        <SettingsSectionCard title="Advanced theme editor" description="Every color used by Grillo is exposed as a semantic role. Light and dark values are stored together.">
          <div className="appearance-editor-toolbar">
            <label className="label appearance-theme-name">
              Theme name
              <input
                className="input"
                value={editingTheme.name}
                onChange={(event) => setDraft({ ...editingTheme, name: event.target.value, builtIn: false })}
              />
            </label>
            <div className="appearance-mode-switch" aria-label="Editor color mode">
              <button type="button" className={editorMode === "light" ? "btn btn-primary" : "btn"} onClick={() => setEditorMode("light")}>Light values</button>
              <button type="button" className={editorMode === "dark" ? "btn btn-primary" : "btn"} onClick={() => setEditorMode("dark")}>Dark values</button>
            </div>
          </div>

          <div className="theme-token-groups">
            {THEME_TOKEN_GROUPS.map((group, index) => (
              <details className="theme-token-group" key={group.id} open={index === 0}>
                <summary>
                  <span>{group.label}</span>
                  <small>{group.description}</small>
                </summary>
                <div className="theme-token-grid">
                  {group.tokens.map((token) => (
                    <ColorValueInput
                      key={token.name}
                      label={token.label}
                      value={editingTheme.modes[editorMode][token.name]}
                      onChange={(value) => setDraft({
                        ...editingTheme,
                        builtIn: false,
                        modes: {
                          ...editingTheme.modes,
                          [editorMode]: { ...editingTheme.modes[editorMode], [token.name]: value }
                        }
                      })}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="contrast-report" aria-label="Theme contrast report">
            <div className="settings-card-header">
              <h4>Accessibility report</h4>
              <p className="text-sm text-secondary">Warnings never lock you out, but shared themes should pass text at 4.5:1 and essential boundaries at 3:1.</p>
            </div>
            <div className="contrast-check-grid">
              {contrastChecks.map((check) => (
                <div className="contrast-check" data-pass={check.pass} key={check.id}>
                  <strong>{check.label}</strong>
                  <span>{check.ratio.toFixed(2)}:1 / {check.target}:1</span>
                </div>
              ))}
            </div>
          </div>

          <div className="appearance-actions">
            <button
              type="button"
              className={previewTheme ? "btn btn-primary" : "btn"}
              onClick={() => setPreviewTheme(previewTheme ? null : editingTheme)}
            >
              {previewTheme ? "Stop preview" : "Preview across app"}
            </button>
            <button type="button" className="btn btn-primary" onClick={saveDraft}>Save theme{contrastWarnings.length ? " anyway" : ""}</button>
            <button type="button" className="btn" onClick={() => { setDraft(null); setPreviewTheme(null); }}>Discard draft</button>
            {!editingTheme.builtIn ? (
              deleteArmed ? (
                <span className="appearance-delete-confirm">
                  <span>Delete {editingTheme.name}?</span>
                  <button type="button" className="btn btn-danger" onClick={() => { deleteTheme(editingTheme.id); setDraft(null); setDeleteArmed(false); }}>Confirm delete</button>
                  <button type="button" className="btn" onClick={() => setDeleteArmed(false)}>Cancel</button>
                </span>
              ) : <button type="button" className="btn btn-ghost" onClick={() => setDeleteArmed(true)}>Delete theme</button>
            ) : null}
          </div>
        </SettingsSectionCard>
      ) : null}

      <p className="appearance-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}

function ThemeCard({
  checked,
  mode,
  onSelect,
  theme
}: {
  checked: boolean;
  mode: ResolvedThemeMode;
  onSelect: () => void;
  theme: ThemeDefinition;
}) {
  const tokens = theme.modes[mode];
  return (
    <button
      aria-checked={checked}
      className="theme-card"
      data-selected={checked}
      onClick={onSelect}
      role="radio"
      type="button"
    >
      <span className="theme-card-preview" style={{ background: tokens["color-bg-canvas"] }}>
        <span className="theme-preview-sidebar" style={{ background: tokens["color-bg-sidebar"] }} />
        <span className="theme-preview-surface" style={{ background: tokens["color-bg-surface"], borderColor: tokens["color-border-subtle"] }}>
          <span style={{ background: tokens["color-text-primary"] }} />
          <span style={{ background: tokens["color-text-muted"] }} />
          <span style={{ background: tokens["color-accent"] }} />
        </span>
      </span>
      <span className="theme-card-copy">
        <strong>{theme.name}</strong>
        <small>{theme.description}</small>
      </span>
      <span className="theme-card-kind">{theme.builtIn ? "Built in" : "Custom"}</span>
    </button>
  );
}

function ColorValueInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const colorValue = isValidThemeColor(value) ? (normalizeThemeColor(value)?.slice(0, 7) ?? "#000000") : "#000000";
  return (
    <label className="label theme-color-field">
      <span>{label}</span>
      <span className="theme-color-inputs">
        <input aria-label={label + " picker"} type="color" value={colorValue} onChange={(event) => onChange(event.target.value)} />
        <input
          aria-label={label + " hex value"}
          aria-invalid={!isValidThemeColor(value)}
          className="input"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function uniqueThemeId(name: string, themes: ThemeDefinition[]): string {
  const base = slugify(name) || "custom-theme";
  let candidate = "custom-" + base;
  let suffix = 2;
  while (themes.some((theme) => theme.id === candidate)) {
    candidate = "custom-" + base + "-" + suffix;
    suffix += 1;
  }
  return candidate;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function auditThemeContrast(theme: ThemeDefinition) {
  return (["light", "dark"] as ResolvedThemeMode[]).flatMap((mode) => {
    const tokens = theme.modes[mode];
    const checks = [
      ["Primary text", "color-text-primary", "color-bg-surface", 4.5],
      ["Secondary text", "color-text-secondary", "color-bg-surface", 4.5],
      ["Accent button", "color-text-on-accent", "color-accent", 4.5],
      ["Strong boundary", "color-border-strong", "color-bg-surface", 3]
    ] as const;
    return checks.map(([label, foreground, background, target]) => {
      const ratio = contrastRatio(tokens[foreground], tokens[background]);
      return { id: mode + "-" + foreground, label: mode + " · " + label, ratio, target, pass: ratio >= target };
    });
  });
}
