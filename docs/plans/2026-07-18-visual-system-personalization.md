# Visual System and Personalization Update

Status: implemented on `codex/visual-system-personalization`

## Goal

Raise Grillo's visual polish without replacing its calm, nature-led identity, then give users a safe path from quick presets to complete color control. The same system must work in the browser and Tauri shell, survive older saved preferences, respect system accessibility settings, and remain understandable to future contributors.

## Research signals

The implementation follows the patterns that consistently appeared across mature design systems and accessibility specifications:

- [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) establishes 4.5:1 for ordinary text, with 3:1 used for large text and essential non-text boundaries.
- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) defines preferences such as reduced motion, reduced transparency, and increased contrast.
- [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/) defines `color-scheme` and forced-color behavior.
- [Atlassian design tokens](https://atlassian.design/foundations/tokens/), [Fluent 2 tokens](https://fluent2.microsoft.design/design-tokens), and [Carbon themes](https://carbondesignsystem.com/elements/themes/overview/) converge on primitives feeding semantic aliases, with themes expressed as complete value maps rather than component-specific overrides.
- The [Design Tokens Community Group format](https://www.designtokens.org/TR/drafts/format/) informed the versioned, data-only import/export boundary. Grillo keeps a narrower application schema for now so imports cannot become arbitrary CSS.

## Product model

Three levels serve different users without exposing complexity too early:

1. Quick selection: system/light/dark, contrast and motion preferences, plus Grillo Adaptive, Graphite, Warm Sand, and High Contrast presets.
2. Theme creation: name a theme, choose a seed, and derive accessible light/dark accent states from the current palette.
3. Advanced editing: clone a theme and edit every semantic color role in both modes, with live app preview and a contrast report.

Theme selection, custom themes, and personal per-project overrides are device-local. A project accent is shared in the project bundle; it overlays identity roles without forcing collaborators to use the same theme.

## Technical plan and delivered mapping

### 1. Establish the semantic contract

- Define one typed list for canvas/surfaces, text/icons, controls/focus, feedback/workflow, labels, and visual effects.
- Move every authored component color, including label chips, shadow tint, sidebar separators, and code/shortcut surfaces, behind those roles.
- Keep layout, type, spacing, radii, and motion as shared non-theme tokens.

Delivered in `theme-contract.ts`, `tokens.css`, `global.css`, and `WorkItemCard.tsx`.

### 2. Add a resilient runtime

- Version preferences and custom themes separately.
- Migrate the former `gph.theme` value.
- Resolve system mode, contrast, and motion; apply complete token maps at the root; synchronize tabs.
- Bootstrap mode before React to avoid a first-paint flash.
- Preserve the old provider API used by the header and command system.

Delivered in `theme-storage.ts`, `theme-provider.tsx`, and both app `index.html` files.

### 3. Build the Appearance studio

- Show real miniature previews for built-ins and customs.
- Support default-device and personal per-project selection.
- Create from seed, clone, edit both modes, preview, save/discard, inline-confirm delete, reset, and safe import/export.
- Warn on key text/control contrast pairs while allowing intentional experimentation.

Delivered in `AppearanceSettings.tsx` and its responsive styling.

### 4. Separate personal appearance from project identity

- Keep custom themes and selection out of project data.
- Add a validated shared six-digit project accent.
- Derive hover, pressed, soft, focus, active-status, and foreground roles at runtime.

Delivered through `project.updateSettings.patch.accentColor`, `ProjectMeta.accentColor`, and the theme provider overlay.

### 5. Apply the highest-impact polish

- Strengthen default foreground and boundary contrast while retaining the Grillo palette.
- Restore visible form focus, add motion/transparency/forced-colors behavior, and standardize transition timing.
- Recompose narrow Settings navigation into a horizontal strip.
- Keep the Board toolbar in one scrollable row and size mobile lanes to the viewport with snap behavior.
- Give Overview metrics a consistent hierarchy and work-item sections clearer separation.
- Use theme-aware label colors everywhere they appear.

Delivered in `tokens.css`, `global.css`, `ViewToolbar.tsx`, Board, Table, Labels settings, Overview, and work-item styling.

## Safety and acceptance criteria

- No component-authored hex/rgb color literals outside theme definitions and color utilities.
- Every CSS custom-property reference has a declaration.
- Imported themes contain a complete light and dark semantic map and hex-only values.
- Built-ins cannot be overwritten or deleted.
- A broken preference or theme falls back to Grillo Adaptive.
- Custom theme previews do not persist until Save.
- Existing light/dark/system preferences migrate.
- System mode avoids a light flash on startup.
- Text/control contrast is visible to the user before sharing a theme.
- Core, UI, web, and desktop type checks/builds pass; theme storage, generation, settings flows, CSS contracts, and project accent commands have regression coverage.
- Desktop light/dark and 390px mobile Appearance/Board states receive rendered browser QA.

## Follow-on opportunities

- Add typography and density profiles as separate preference axes; do not overload the color theme schema.
- Add a curated theme gallery only after provenance, compatibility, and trust UX are defined.
- Consider exporting a parallel full DTCG document if other tools need interchange; keep application import validation narrower than the general standard.
- Add automated browser-level contrast and forced-colors snapshots once the E2E environment has stable visual baselines.
