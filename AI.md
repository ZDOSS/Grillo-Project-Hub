# AI Architecture Ledger

This file is the standing architecture and contributor-alignment ledger for the project. It should be updated whenever meaningful implementation changes alter architecture, domain model, storage behavior, module boundaries, command surfaces, platform behavior, or testing strategy.

## Project state

The repository now has a working MVP implementation that matches the planning in `docs/FullSpec.md`. The shared core, hybrid web/desktop shells, validated command surface, board/backlog/table/docs/roadmap/calendar/bugs/my work/search/settings views, PWA install, and desktop shell are wired up and tested.

The product name is **Grillo Project Hub**, with **GPH** as the approved abbreviation.

## Stack

- frontend: React 18
- language: TypeScript
- build tool: Vite 5
- routing: React Router 6
- client state: Zustand
- desktop packaging: Tauri 2
- test runners: Vitest (unit + component), Playwright (e2e)
- icons: `lucide-react` for shared product and control icons
- validation: hand-rolled command dispatcher in `@gph/core` (no third-party schema dep yet)
- drag-and-drop: native HTML5 drag-and-drop in MVP (dnd-kit deferred to a later polish pass)

## Monorepo layout

```
package.json                 # npm workspace
tsconfig.base.json           # shared TS config
apps/web                     # hosted PWA target (Vite + PWA plugin)
apps/desktop                 # Tauri desktop shell (Vite + Rust commands)
packages/core                # domain model, storage, commands, export/import, search, templates
packages/ui                  # shared React components, views, theme, command palette
tests/e2e                    # Playwright parity tests
docs/                        # current product/architecture plan
```

## Architecture rules

- preserve one shared domain model across web and desktop
- browser and desktop differences live behind storage/platform adapters
- the Rust/Tauri boundary is narrow: `save_project`, `load_project`, `project_exists`, `delete_project`, `list_projects_in_folder`
- UI, automation, import, and MCP/AI actions all route through the same validated command surface (`packages/core/src/commands/`)
- shared UI composition now lives under `packages/ui/src/components/`; routes should prefer those primitives for buttons, fields, surfaces, toolbars, page headers, feedback, dialogs, data tables, and work-item metadata before adding route-local control markup
- the canonical project bundle lives in `project.pms.json`; module data and unknown module sections are preserved across save/load
- the desktop folder-backed adapter and the browser `localStorage` adapter implement the same `ProjectStoreAdapter` interface and emit equivalent `WatchEvent` shapes for external-change detection

## Domain model summary

The core domain in `packages/core/src/domain/` covers the entities the plan calls out:

- `ProjectBundle` with `format`, `project`, `core`, `modules`, and `projectSettings`
- `WorkItem` with stable IDs, type/priority/status references, parent-child hierarchy via single `parentId`, labels, milestones, dates, checklist, comments, plugin-owned `moduleData`, and typed `customFields`
- customizable `WorkItemTypeDefinition` registry with `defaultStatusId` and `defaultPriorityId`
- customizable `StatusDefinition` mapped to stable `planned`/`active`/`completed`/`canceled` categories
- customizable `PriorityDefinition` with unique integer `rank`
- `SeverityDefinition` (bug module) separate from priority
- `Relationship` collection with directional `blocks` and symmetric canonical `relatesTo`
- `Document` with stable IDs, Markdown body, parsed `[[doc:id]]` / `[[item:id]]` links, derived backlinks
- `Reminder` with separate UTC `remindAt` and IANA `timeZone`
- `Attachment` metadata in the bundle, binary payloads in `attachments/` for folder-backed projects
- `EventRecord` log with `source: "ui" | "import" | "automation" | "mcp" | "system"`
- project-level `TrashRecord` for soft-deleted records; permanent deletion is gated
- `projectSettings.hiddenViewIds` for left-panel/viewbar visibility preferences without deleting underlying views

## Storage model summary

- canonical durable format: `project.pms.json` inside `.pm-suite/` (or browser `localStorage` as a labeled compatibility layer)
- adapter contract: `ProjectStoreAdapter` in `packages/core/src/storage/store.ts`
- `WebLocalStorageAdapter` for browser/PWA mode
- the web adapter is now hybrid: browser-local storage remains the default, but browsers with File System Access support can persist project files into a user-chosen local folder and remember that folder handle through IndexedDB
- `DesktopAdapter` for Tauri (calls the registered Rust commands and falls back to `localStorage` when Tauri is absent in dev)
- `InMemoryProjectStore` is available for tests
- external change detection uses the adapter's `externalRevision` counter and `WatchEvent` notifications
- trust status is surfaced in the UI as a `Folder-backed` / `Browser-local` / `Unsaved` badge
- desktop storage now only writes to the filesystem when a folder path has actually been attached; otherwise the desktop shell behaves as browser-local storage on purpose instead of pretending to be folder-backed
- recent-project reopen uses the active adapter's `load()` path rather than forcing JSON import; desktop recents restore the remembered folder path before loading
- launcher reopen paths now validate imported bundles before calling `setBundle()`, matching the startup restore and direct storage-load paths so corrupt saved data is rejected consistently instead of silently entering the UI store
- the two UI JSON-import entry points now also perform an explicit `validateProjectBundle()` immediately before `setBundle()`, mirroring the reopen paths even though `importProjectJson()` already validates internally; this keeps the UI-side contract obvious and avoids review drift about where store writes are gated
- the desktop recent-project reopen path still depends on `DesktopAdapter.load()` reading the active folder from `localStorage` at call time; `ProjectsListView` now documents that ordering explicitly so later adapter refactors do not accidentally cache the folder too early
- the browser adapter now repairs older browser-local saves whose metadata index is missing by falling back to the raw `localStorage` project blob and reconstructing the saved-project index entry on load
- the active project session is now persisted in `localStorage` (`gph.active.project`) and restored on startup through `restoreLastProjectSession()`, so reloads in both web and desktop shells reopen the last project instead of dropping the user into an empty shell
- session restore now treats corrupt or invalid persisted bundles as stale state: failed import/validation clears `gph.active.project` instead of bubbling an unhandled rejection through the startup hook
- the web runtime now installs the same `WebLocalStorageAdapter` instance into both `window.__gph_store` and `WebStorageAdapter.adapter`, preventing auto-save and startup restore from drifting onto different adapter instances if adapter-local state is added later
- the desktop runtime now installs the same `DesktopStorageAdapter.adapter` instance into `window.__gph_store`; folder-backed desktop saves/loads/existence checks/deletes call `save_project`, `load_project`, `project_exists`, and `delete_project`

## Command surface

- one validated `CommandEnvelope<CommandPayload>` shared by UI, automation, import, and MCP
- command families include `project.*`, `item.*`, `relationship.*`, `comment.*`, `milestone.*`, `label.*`, `member.*`, `status.*`, `priority.*`, `type.*`, `doc.*`, `customField.*`, `reminder.*`, `attachment.*`, `view.*`, `search`
- the dispatcher in `packages/core/src/commands/dispatcher.ts` applies the change, records `EventRecord`s, and returns the new bundle
- hierarchy rules, archive/trash, severity independence, and date-only vs UTC timestamp validation are enforced in dispatcher paths
- newly added commands in this pass:
  - `project.updateSettings` for plugin trust mode and left-panel visibility (`hiddenViewIds`)
  - `member.update` for inline member edits
  - `member.delete` for archiving a member and unassigning any items still assigned to them
- dispatcher hardening added after review:
  - `member.update` now throws `Error("Member not found")` for unknown IDs instead of silently succeeding
  - `project.updateSettings` now preserves `hiddenViewIds: []` for legacy bundles that predate that field instead of reintroducing `undefined`
  - item create/update paths now validate referenced type, status, priority, member, label, milestone, and parent IDs before mutating the bundle
  - checklist reorder commands must include every existing checklist entry exactly once, so partial client payloads cannot silently delete entries
  - `project.updateSettings` now rejects project-id mismatches before applying settings patches
  - relationship, comment, milestone, label, status, priority, type, doc, reminder, attachment, view, and search commands now reject project mismatches or unknown mutation targets instead of silently bumping revisions
  - saved view create/update paths validate board status references and my-work member filters before mutating the active bundle, matching the import validator's saved-view checks
  - JSON import now performs deep bundle reference validation through `validateProjectBundle()`, rejecting dangling item, relationship, reminder, attachment, folder, and board-view references before the UI can call `setBundle()`

## Platform differences between web and desktop

- both apps import the same `@gph/ui` AppShell, views, and command palette
- project navigation metadata now lives in shared `packages/ui/src/nav-config.ts`, so AppShell navigation and Settings left-panel visibility both derive from one source of truth
- the web app uses `@vitejs/plugin-pwa` for install/offline; the desktop app uses the Tauri runtime
- the web app's storage adapter supports both browser-local saves and optional local-folder saves via the browser file-system picker when the runtime exposes that capability; the desktop adapter talks to a Rust filesystem command
- in development, both apps run in the browser; the desktop app's storage adapter falls back to localStorage when `__TAURI__` is absent
- the AppShell accepts an `appMode: "web" | "desktop"` prop for platform-specific header sizing
- the shared workspace launcher now explains the real storage story per platform:
  - web/PWA: browser-local projects by default, optional local-folder saves when supported, plus JSON import/export
  - desktop: browser-local by default, optional manual folder path for new projects, and folder scanning/open for existing `.pm-suite` saves

## Module/plugin rules

- built-in module IDs follow the `builtin.*` convention (e.g. `builtin.kanban`, `builtin.bugs`)
- modules own only their configuration and specialized data
- core items survive module disable/remove
- unknown module sections are preserved unchanged when saving
- bug severities are stored in the `builtin.bugs` section and only apply to type IDs configured by the bug module
- plugin trust posture is surfaced in Settings and now writes back into `projectSettings.pluginTrustMode`; runtime enforcement is still MVP-first-party-only, but the setting is no longer dead UI

## Key implementation invariants

- `parentId` is the only persisted hierarchy edge; subtask lists are derived
- MVP commands reject grandchild nesting; deeper nesting is a future UI/command addition without schema migration
- `blocks` is stored once as a directional edge; `blocked by` is derived
- `relatesTo` is canonicalized so each pair is stored once regardless of which item initiated it
- planning dates use `YYYY-MM-DD` and never round-trip through UTC midnight
- reminders store UTC `remindAt` plus IANA `timeZone`; changing display TZ never mutates the instant
- checklist entries are not hidden work items; convert-to-subtask is one atomic validated command
- archive preserves identity and references; trash is canonical project data; permanent deletion is explicit
- WIP limits warn by default and may hard-block on the board when configured
- status transitions route through `item.moveStatus` so backend automation and UI share the same validation

## Current major workflows

- workspace launcher (`/`, `/open`, `/demo`) with:
  - reopen-from-recents support
  - browser-vs-folder storage explanation
  - explicit delete/remove confirmation for saved projects
  - folder-backed delete is intentionally "remove recent shortcut only" and does not delete filesystem data
  - desktop folder-path attach flow for new projects
  - desktop folder scan/open flow for existing `.pm-suite` saves
  - PWA/browser folder picker for creating and reopening local-folder projects when File System Access is available
  - automatic last-project restore after reload via persisted active-session metadata
- per-project view tabs across board, backlog, table, roadmap, calendar, docs, bug triage, my work, search
- modal-style work item detail at `/item/:id` with full edit, checklist conversion, comments, subtasks, activity; `WorkItemModal` now routes through the shared `Modal` primitive with `size="work-item"` while preserving the existing detail editing controls and command-dispatch behavior
- settings view with theme, left-panel visibility, editable members, editable statuses, editable priorities, editable types, labels, milestones, custom fields, plugins, export/import, AI bridge
- settings sections now expose tab semantics, the edit icon comes from `lucide-react`, and import failures render as inline alerts instead of browser-native `alert()`
- settings registry tables now follow a consistent edit flow for members/statuses/priorities/types:
  - read-only rows by default
  - explicit edit affordance
  - save/cancel actions only while editing
  - semantic color selects instead of raw free-text color entry for those registries
- registry edit rows now resync their local draft state when upstream bundle data changes, so import/undo/external-refresh cannot leave stale draft values or stuck edit mode on screen
- launcher and member removal flows now use inline confirmation UI instead of `window.confirm`, which keeps the behavior testable in jsdom/Vitest and avoids blocking browser-native modal prompts
- command palette (`Ctrl/Cmd+K`) and `C` shortcut
- export downloads `.pms.json`, `.md`, or `.csv` from Settings
- import accepts a `.pms.json` and replaces the active bundle
- auto-save runs through the platform storage adapter and is visible via the trust badge
- plugin trust settings now use explicit local draft state plus save/cancel feedback, instead of a bare radio-group mutation with no persistence affordance
- browser folder-picker cancellation (`AbortError`) is now treated as a normal dismissal in both launcher flows, so canceling the native chooser does not surface a red workspace error
- docs navigation is now router-safe inside the PWA:
  - sidebar doc links use React Router links
  - backlink pills use React Router links
  - rendered `[[doc:id]]` / `[[item:id]]` preview links are intercepted client-side instead of hard-navigating to a 404
  - preview interception now keys off a stable `data-route` attribute rather than the styling-only `docs-link` class, so class-name or sanitizer changes do not silently break routing
- docs view local editor state now resyncs when the selected document changes, which fixes the "stuck on getting started" behavior where clicking another doc changed selection without updating the editor/preview pane
- that editor reset now keys only on `doc.id`, so switching documents still refreshes the draft while external bundle updates to the same document do not silently clobber unsaved local typing
- `DocEditor` now keeps that selection-sync effect above its null guard so hook ordering stays valid even if future refactors ever allow the component to see a transient `bundle === null`
- bug triage now exposes a visible `New bug` action in the intake column
- the bug-tracker template now seeds a bug-compatible default project/type/status configuration, while other starter templates apply different `hiddenViewIds` defaults so the left panel reflects the template's purpose out of the box
- the simple-kanban starter doc now writes a real `[[item:<id>]]` reference for its seeded welcome task instead of rendering a broken literal `sample.id` token
- board cards are now rendered as a single React Router link over the whole card, preserving native link semantics, letting assistive technology compute the link name from visible title/metadata text, and avoiding a title-only click target while still suppressing accidental post-drag navigation
- the UI/UX overhaul implementation pass has started in code:
  - `packages/ui/src/components/` now exports shared button/icon-button, field, page-header, surface, toolbar, empty-state, inline-alert, modal/dialog, data-table, and work-item metadata primitives
  - `AppShell` uses a named workspace navigation landmark, shared header buttons, and lucide icons for command/theme actions
  - board, backlog, table, bug triage, my work, search, roadmap, calendar, docs, and settings now use shared primitives for major controls, feedback, metadata, or layout
  - board hard-WIP rejection now surfaces visible status feedback instead of silently dropping the move
  - search results are grouped by surface type while preserving URL query/scope state
  - roadmap and calendar controls now sit in shared toolbars with accessible names
  - docs use shared confirmation for document delete and lucide document icons instead of emoji UI markers
  - `/item/:id` now renders through the shared modal shell instead of the legacy drawer route shell

## Testing strategy

- TDD for the shared core: domain rules, command handlers, storage contract, and export/import
- Vitest component tests for `AppShell`, `BoardView`, `BacklogView`, `CommandPalette`, `ProjectsListView`, and `DocsView`
- UI foundation coverage now includes `components/button/Button.test.tsx`, `components/layout/Surface.test.tsx`, and `work-item/WorkItemModal.test.tsx`; AppShell tests assert banner, workspace navigation, and command-search affordances
- review-follow-up regressions now have dedicated tests for:
  - unknown-member updates in the dispatcher
  - legacy `hiddenViewIds` fallback behavior
  - inline delete confirmation in the launcher
  - inline member removal confirmation in Settings
  - docs preview routing via `data-route`
  - docs editor draft preservation when the same document refreshes externally
  - startup session restore from persisted active-project metadata
  - stale-session cleanup when persisted startup data is corrupt
  - template-specific hidden-view defaults and bug-template-safe bug creation
  - board-card click behavior via `useNavigate` invocation
  - board-card keyboard activation with link semantics
  - silent handling of cancelled browser folder picks
  - settings-row draft reset when upstream bundle data changes
  - item-reference validation and unknown-target rejection in dispatcher commands
  - reminder target validation on create and update commands
  - saved-view reference validation for `view.create` and `view.update`
  - project-id mismatch rejection for `project.updateSettings`
  - lossy checklist reorder rejection
  - deep JSON import reference validation
  - whole-card board-card link activation
  - desktop storage adapter command wiring and shared adapter installation
- the Settings view test now always seeds a fresh project-store bundle per run instead of reusing any stale Zustand singleton state from prior tests
- UI test setup now installs a memory-backed `localStorage` shim when jsdom's storage implementation is unavailable or misconfigured, which keeps persistence-oriented tests deterministic
- `apps/desktop` now has a Vitest/jsdom test harness for the desktop storage adapter
- Playwright e2e for hybrid parity, theme toggle, command palette, project creation, item creation with `C` shortcut, JSON export download, and search
- `npm test` runs core, UI, and desktop adapter tests; `npm run test:e2e` runs `apps/web/scripts/run-e2e.mjs`, which starts Vite as an owned child process, waits for readiness, runs Playwright, and shuts Vite down before returning; `npm run typecheck` covers all packages and apps; `npm run lint` currently aliases typecheck until a dedicated lint stack is added
- `apps/web/scripts/run-e2e.mjs` owns the e2e base URL and passes it through `PLAYWRIGHT_BASE_URL`; `apps/web/playwright.config.ts` reads that environment value with a fixed local fallback so runner and config cannot silently drift.

## Recent architecture-affecting changes

- bootstrapped the npm monorepo (`apps/web`, `apps/desktop`, `packages/core`, `packages/ui`) and wired the workspace tooling
- implemented the shared core domain types (`ProjectBundle`, `WorkItem`, `StatusDefinition`, `PriorityDefinition`, `WorkItemTypeDefinition`, `Relationship`, `Document`, `Milestone`, `Label`, `Member`, `CustomFieldDefinition`, `Reminder`, `Attachment`, `EventRecord`, `TrashRecord`)
- implemented the validated command dispatcher with envelope + dispatch table + per-command handlers and event logging
- implemented starter templates: `simple-kanban`, `software-project`, `bug-tracker`, `release-planner`
- implemented search, export (JSON / Markdown / CSV), and import (JSON + CSV) in the shared core
- implemented the React AppShell, theme provider (light/dark/system), and command palette with navigation, item creation, view switching, search hits, and theme toggle commands
- implemented board, backlog, table, docs (with sanitized Markdown and backlinks), roadmap (drag/resize), calendar, bug triage, my work, search, settings, and the work item drawer
- configured the Tauri desktop shell with narrow Rust commands and a folder-backed storage adapter
- added the PWA manifest, service worker registration, favicon, and auto-save bridge for the web app
- added Playwright e2e and Vitest unit/component tests across the monorepo
- added GitHub Actions workflow (`.github/workflows/deploy-web.yml`) to automatically build and deploy the `apps/web` PWA to GitHub Pages on pushes to `main` (and manual dispatch). Includes Vite `base` configuration for the project subpath, `BrowserRouter` `basename` support for client routing, SPA `404.html` fallback, and full PWA assets. Updated `vite.config.ts`, `main.tsx`, `Readme.md`, and this file. Provides a static demo of the web shell (data remains browser-local).
- stabilized the launcher and startup UX after the visual pass:
  - recents can now actually reopen saved projects
  - the no-project state has direct recovery actions
  - desktop folder-backed saves no longer silently assume a folder when none is attached
- replaced dead-end settings rows with editable registry tables for members, statuses, priorities, and work-item types
- added project-level left-panel visibility preferences and wired them into the shared AppShell nav + viewbar filtering
- fixed PWA/router breakage caused by hard `href="/doc/..."` and `href="/item/..."` links in docs and work-item detail surfaces
- updated unit and e2e tests to cover reopen-from-recents and router-safe docs navigation, and refreshed shell/e2e selectors to match the current UI
- closed the Greptile follow-up robustness pass by:
  - hardening dispatcher behavior for unknown member IDs and legacy `hiddenViewIds`
  - documenting the folder-restore ordering contract used by desktop recents reopen
  - replacing `window.confirm` with inline confirmation in launcher and member-removal flows
  - switching docs preview click interception from a CSS-class dependency to a stable data attribute
- closed the next review follow-up by:
  - centralizing nav/view metadata in shared `nav-config.ts`
  - fixing the stale-bundle bug in `SettingsView.test.tsx`
  - documenting that folder-backed recent deletion only removes the launcher shortcut
- closed the current PWA/settings follow-up by:
  - adding browser local-folder selection/reopen support behind optional adapter capabilities
  - restoring the last active project after reload and repairing legacy browser-local saves whose index metadata is missing
  - converting members/statuses/priorities/types settings rows to explicit edit/save/cancel flows with color dropdowns
  - aligning launcher reopen validation with every other bundle load path, fixing the simple-kanban starter doc's seeded item link, and unifying the installed web storage adapter instance used by startup restore and auto-save
  - making both JSON-file import surfaces perform explicit pre-store bundle validation so every visible import/reopen path now shows the same guard at the UI edge
  - making plugin trust settings use the same explicit save/cancel pattern
  - fixing docs pane selection sync and board-card whole-card navigation
  - tightening the docs editor reset so same-doc external refreshes do not wipe unsaved drafts, and restoring proper link semantics for whole-card board navigation
  - updating starter templates so bug creation and side-panel defaults match the chosen template
- closed the Greptile hardening follow-up by:
  - guarding startup restore against corrupt persisted bundles
  - applying optimistic-revision checks consistently across browser-local and folder-backed saves
  - treating folder-picker cancel as a non-error
  - resyncing settings row draft state from upstream bundle updates
  - moving `DocEditor` hook usage ahead of the null return to preserve Rules-of-Hooks safety
- closed the repository-standards hardening pass by:
  - aligning desktop storage with the registered Tauri Rust command boundary and adding `delete_project`
  - adding missing web and desktop PNG app icons so PWA and Tauri manifests reference tracked assets
  - replacing Playwright's built-in `webServer` lifecycle with `apps/web/scripts/run-e2e.mjs` so `npm run test:e2e` works from the web workspace and exits cleanly on Windows
  - removing stale `@gph/ui` package export paths and pointing project/search exports at existing view modules
  - replacing the root lint placeholder with a real typecheck-backed command and adding app-level typecheck scripts
  - deepening command/import validation and adding regression coverage for reference integrity, checklist reorders, board-card links, and desktop storage wiring
- applied the Greptile PR follow-up by:
  - making Playwright consume the e2e runner's `PLAYWRIGHT_BASE_URL`
  - removing the board-card `aria-label` so screen readers include visible card metadata in the link name
  - updating the desktop delete catch comment to reflect that Rust handles missing files
- applied the saved-view Greptile follow-up by:
  - validating `view.create` board columns against known statuses before persistence
  - validating `view.update` board columns and my-work member filters before persistence
- applied the project-settings Greptile follow-up by:
  - adding the missing `assertProjectId` guard to `project.updateSettings`
  - exporting `@gph/ui/theme/global.css` through the UI package boundary used by both app entrypoints
- started the approved UI/UX overhaul implementation by:
  - installing `lucide-react`
  - adding the shared `packages/ui/src/components/` primitive layer and exporting it through `@gph/ui`
  - migrating shell, board, backlog, table, bug triage, my work, search, roadmap, calendar, docs, and settings controls onto the shared primitives where practical
  - presenting `/item/:id` through `WorkItemModal` with modal-style overlay geometry
  - replacing docs delete confirmation and settings import failure `alert()` with shared in-app feedback
  - updating route and e2e tests for the new navigation/search/settings semantics and adding button primitive coverage
- applied the UI/UX PR-body follow-up by:
  - adding and exporting the missing `Surface` primitive with token-backed surface variants, padding options, interactive state, and regression coverage
  - updating the UI/UX implementation plan so later workspace-card migration steps reference an actual exported `Surface` primitive
  - moving the `/item/:id` route shell onto the shared `Modal` primitive and adding WorkItemModal regression coverage that guards against reintroducing the legacy `.drawer` shell
  - removing the extra blank line at EOF in the UI/UX design spec so `git diff --check` stays clean

## Open follow-on planning

- UI/UX overhaul planning lives in `docs/superpowers/specs/2026-07-02-ui-ux-overhaul-design.md` and `docs/superpowers/plans/2026-07-02-ui-ux-overhaul-implementation-plan.md`; the first implementation pass is now in code, but deeper follow-on work remains for extracting item-detail internals into smaller components, mobile navigation sheet, richer settings information architecture, and final accessibility QA
- a deeper roadmap interaction plan (multi-day bars, dependencies, swimlanes)
- a security-first plugin runtime plan before any third-party plugin execution
- a public-internet hosting plan (currently out of MVP scope; only trusted internal hosting is supported)
- a sync-backend plan if richer collaboration is pursued

The current `docs/FullSpec.md`, `docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md`, and UI/UX overhaul planning package remain the product source of truth. The implementation in this repository implements the MVP slice of the original plan and now includes the first working UI/UX overhaul slice with shared primitives and migrated route surfaces.
