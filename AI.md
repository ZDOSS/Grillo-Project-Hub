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

## Agent operating rules

- after pushing PR updates, do not immediately poll Greptile or summarize Greptile check state; Greptile review is asynchronous and usually remains pending for a while, so an immediate `gh pr checks` read only burns context without producing useful signal
- only inspect Greptile after the user explicitly asks, after a reasonable review delay, or when there is a concrete Greptile comment/body update to act on
- normal GitHub Actions or deploy checks may still be inspected when debugging CI/deploy failures, but keep that separate from Greptile's long-running review check

## Domain model summary

The core domain in `packages/core/src/domain/` covers the entities the plan calls out:

- `ProjectBundle` with `format`, `project`, `core`, `modules`, and `projectSettings`
- `WorkItem` with stable IDs, type/priority/status references, parent-child hierarchy via single `parentId`, labels, milestones, dates, checklist, comments, plugin-owned `moduleData`, and typed `customFields`; custom field applicability is type-scoped and hidden values are preserved when an item changes to a type where a field no longer applies
- customizable `WorkItemTypeDefinition` registry with `defaultStatusId` and `defaultPriorityId`
- customizable `StatusDefinition` mapped to stable `planned`/`active`/`completed`/`canceled` categories
- customizable `PriorityDefinition` with unique integer `rank`
- `SeverityDefinition` (bug module) separate from priority
- `Relationship` collection with directional `blocks` and symmetric canonical `relatesTo`
- `Document` with stable IDs, Markdown body, parsed `[[doc:id]]` / `[[item:id]]` links, derived backlinks
- `Reminder` with separate UTC `remindAt` and IANA `timeZone`
- `Attachment` metadata in the bundle, binary payloads in `attachments/` for folder-backed projects
- `EventRecord` log with `source: "ui" | "import" | "automation" | "mcp" | "system"`
- project-level `TrashRecord` for soft-deleted records; permanent deletion is gated, and the UI-supported restore/permanent-delete surface currently covers work items, documents, and attachments
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
  - `doc.restore`, `doc.permanentlyDelete`, `attachment.restore`, and `attachment.permanentlyDelete` now use the same command surface as work-item restore/delete, and doc/attachment soft deletes emit readable activity events
  - `doc.delete` removes document-scoped reminders from the active reminder array, moves document-scoped attachments into attachment trash records, and stores removed document reminders with the document trash payload so restore can rehydrate them without leaving invalid active references
  - `doc.permanentlyDelete` removes document-scoped reminders plus active and trashed document-scoped attachments so hard-deleting a trashed document cannot leave dangling document references behind
  - `item.update` validates supplied custom field values against the field registry, type, applicability, options, and required rules when the patch includes `customFields`; unrelated item updates intentionally do not revalidate hidden legacy values so type changes preserve existing custom field data

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
- custom-field values are stored on `WorkItem.customFields` as typed values keyed by custom field ID; inapplicable values must be hidden in UI surfaces, not deleted, so type changes do not lose data
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
- per-project view tabs across board, backlog, table, roadmap, calendar, docs, bug triage, my work, search, and trash
- create-item entry points now carry view context through `CreateItemPrefill` in `palette-bus.ts`; the shared dialog can receive and expose `typeId`, `statusId`, `priorityId`, and `assigneeId`, so board, bug triage, and my-work creates no longer drop the context that made the user click that surface's action in the first place
- the create-item dialog derives type defaults from dependency-tracked type-registry inputs while open, and its form-opening reset is split from derived default refreshes so a settings-level type default change can update selects without clearing a user's typed title or description
- modal-style work item detail at `/item/:id` with full edit, checklist conversion, inline comment editing, subtasks, relationships, attachments, reminders, custom fields, readable activity, and pinned action footer; `WorkItemModal.tsx` is now the owning implementation and routes through the shared `Modal` primitive with `size="work-item"`, while `WorkItemDrawer.tsx` is only a compatibility wrapper that renders `WorkItemModal`
- work item detail interactions avoid browser-native modal APIs for persisted edits/destructive work: comment edits use inline local state and `comment.edit`, permanent deletion uses shared `ConfirmDialog`, and relationship add/remove controls route through `relationship.create` / `relationship.delete` so duplicate/cycle validation remains in `@gph/core`
- item-detail attachments live in `AttachmentPanel.tsx`, are filtered by `itemId`, and route through `attachment.add` / `attachment.delete`; browser-local uploads store a data URI fallback with `storagePath: null`, while preview rendering is intentionally constrained to image thumbnails, decoded text snippets, PDF metadata, or no inline preview for unsupported/binary media
- `AttachmentPanel` rejects files larger than 5 MB before calling `FileReader.readAsDataURL()`, because this UI path currently stores browser-local attachment payloads as base64 data URIs in the bundle
- item-detail reminders live in `ReminderPanel.tsx`, are filtered by `targetType: "workItem"` and `targetId`, and route through `reminder.create` / `reminder.update` / `reminder.delete`; reminder editing preserves the domain invariant that the stored value is a UTC `remindAt` instant plus the user's current IANA `timeZone`
- work-item metadata now surfaces the next scheduled reminder above the detail sections so upcoming item-level follow-up is visible without opening the reminder editor section
- custom fields in item detail live in `CustomFieldsPanel.tsx` and route through `item.update` with `patch.customFields`; optional empty values are removed from the item map, required empty values stay blocked with inline validation, and the panel only shows fields applicable to the item's current type
- table view now adds read-only columns for active custom fields, showing `None` for empty applicable values and `Not applicable` where a field does not apply to a row's item type
- backlog rows now show compact custom-field metadata tags for populated applicable fields, limited to the first few ordered fields to keep the row scannable
- `/trash` is a first-class route in the shared navigation; `TrashView` lists project trash records, supports restore and confirmed permanent deletion for work items, documents, and attachments, and marks unsupported trash record types as unavailable instead of pretending they can be restored
- Trash restore/permanent-delete UI catches command failures, closes the confirmation if one is open, and surfaces an inline danger alert so broken historical references do not trap the user in a modal
- work-item modal relationship selectors now memoize item and relationship derivations, so transient local-state changes such as typing in comments do not rebuild every relationship group on large projects
- comment editing disables `Save comment` until the body is non-empty and actually changed; the new-comment composer has a stable `aria-label="New comment"` instead of depending on placeholder text for its accessible name
- shared `Modal` supports `closeOnEscape={false}` for stacked modal cases; `WorkItemModal` disables its Escape handler while the permanent-delete `ConfirmDialog` is open so Escape only cancels the top confirmation and preserves item-detail drafts
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
- deleting the currently open doc now routes to the nearest active remaining document, or `/docs` when none remain, so the route does not stay pinned to a deleted or archived document ID while other docs still exist
- `DocEditor` now keeps that selection-sync effect above its null guard so hook ordering stays valid even if future refactors ever allow the component to see a transient `bundle === null`
- bug triage now exposes a visible `New bug` action in the intake column, maps software-project `inbox` bugs into Intake, opens the shared create dialog with the correct intake status preselected, and limits Intake's planned-status fallback so custom workflows can still populate Ready
- My Work now has a `New assigned item` action that preselects the current local member as assignee, so work created from that filtered view remains visible in the same workflow after creation
- board-level `New item` now preselects the first board column's default drop status, which keeps newly created cards visible on boards whose first lane does not use the project/type default status
- table sorting now uses neutral ascending comparators plus explicit default directions, so `Priority (desc)` puts urgent work first and selecting `Updated` defaults to newest-first order
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
  - `/item/:id` now renders through the shared modal shell instead of the legacy drawer route shell, with Archive/Trash/Duplicate/Done actions passed through `Modal`'s pinned footer slot

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
  - work-item comment editing without `window.prompt`
  - work-item permanent delete confirmation without `window.confirm`
  - work-item relationship add/remove behavior through the command dispatcher
  - work-item attachment upload/delete behavior through `attachment.add` / `attachment.delete`, including browser-local data URI fallback
  - work-item oversized attachment rejection before reading the selected file into memory
  - work-item attachment preview safety for image, UTF-8 text, PDF metadata, and unsupported binary media
  - work-item reminder create/update/delete behavior through `reminder.*` commands plus next-reminder metadata summary rendering
  - work-item next-reminder summary behavior that ignores past reminders instead of promoting stale reminders as upcoming follow-up
  - bug triage intake visibility for software-workflow `inbox` bugs and intake-status prefill for `New bug`
  - bug triage fallback mapping that keeps a non-standard planned Ready status visible
  - board-context item creation that uses the first board column default status
  - my-work item creation that preselects the active local member as assignee
  - table priority and updated-date sort direction behavior
  - trash restore and confirmed permanent deletion for work items, documents, and attachments
  - document soft-delete cleanup for document-scoped reminders and attachments, including reminder restoration from the document trash payload
  - document permanent-delete cleanup for document-scoped reminders and attachments
  - trash action failure feedback that clears the confirmation dialog
  - readable activity labels in work-item detail instead of raw internal event type strings
  - work-item custom-field editing, non-applicable custom-field rejection, hidden-value preservation after type change, table custom-field columns, and backlog custom-field summaries
  - docs delete navigation to the nearest active remaining document, skipping archived docs
  - create-dialog default refresh when the type registry changes while the dialog is open, including preservation of typed title and description drafts
  - work-item unchanged-comment save disabling and the new-comment textarea accessible label
  - stacked delete-confirmation Escape handling that preserves the underlying item-detail route and unsaved comment draft
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
- the GitHub Pages deploy job now gives `actions/deploy-pages@v4` a 30-minute deployment timeout, matching the observed failure mode where artifact upload succeeded but GitHub Pages kept the deployment in `deployment_queued` until the action's default timeout failed the workflow.
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
- applied the follow-up work-item modal review by:
  - moving Archive, Trash, Delete, Duplicate, and Done actions from the scrollable modal body into `Modal`'s `footer` prop
  - tightening `.item-detail-footer` styling so the shared modal footer owns the border, padding, and pinned placement
  - adding WorkItemModal coverage that asserts footer actions live in `.gph-modal-footer` instead of `.gph-modal-body`
- started the July 2026 product-depth implementation slice by:
  - adding `docs/plans/July 2026 plan.md` and linking it from `docs/INDEX.md` as the prioritized implementation backlog
  - moving the work-item detail implementation into `WorkItemModal.tsx` and leaving `WorkItemDrawer.tsx` as a thin compatibility wrapper
  - replacing native comment edit prompts with an inline textarea editor backed by `comment.edit`
  - replacing native permanent-delete confirmation with the shared `ConfirmDialog`
  - adding relationship management in item detail for `Blocks`, `Blocked by`, and `Related` groups, with add/remove actions dispatched through `relationship.*` commands
  - adding regression coverage for the no-native-dialog item-detail behavior and relationship add/remove flow
- applied the Greptile PR #11 follow-up by:
  - memoizing work-item relationship derivations in `WorkItemModal.tsx`
  - disabling `Save comment` when the inline edit body is unchanged
  - adding a stable accessible label to the new-comment textarea with regression coverage
- applied the stacked-modal Greptile PR #11 follow-up by:
  - adding a `closeOnEscape` escape-hatch to the shared `Modal` primitive
  - disabling the underlying work-item modal Escape handler while the permanent-delete confirmation is stacked above it
  - adding regression coverage that Escape cancels only the confirmation and preserves the unsaved comment draft
- continued the July 2026 product-depth pass with item attachments and reminders by:
  - adding focused `AttachmentPanel` and `ReminderPanel` components under `packages/ui/src/work-item/`
  - wiring item attachments into the work-item modal with browser-local data URI upload fallback, safe preview rules, and delete-to-trash command flow
  - wiring item reminders into the work-item modal with create/update/delete controls and a next-reminder metadata summary
  - extending WorkItemModal tests for attachment upload/delete, safe preview constraints, and reminder CRUD
- applied the PR #12 Greptile follow-up by:
  - changing the work-item next-reminder summary to select only future reminders and show `No reminder scheduled` when an item only has stale past reminders
  - adding regression coverage that past reminders remain visible in the reminder panel without being promoted as `Next reminder:`
- applied the second PR #12 Greptile follow-up by:
  - decoding base64 text attachment previews through `TextDecoder` so UTF-8 data URI payloads render correctly
  - adding regression coverage for non-ASCII text attachment previews
- applied the third PR #12 Greptile follow-up by:
  - adding a 5 MB per-file guard before attachment uploads are read into data URIs
  - adding regression coverage that oversized attachment uploads show inline feedback and do not mutate project attachments
- started the logical user-flow bugfix pass by:
  - extending shared create-item prefill state and the create dialog so view-specific create actions can preserve status and assignee context
  - fixing bug triage so software-workflow inbox bugs are visible in Intake and New bug defaults to the intake status
  - fixing board and My Work create flows so newly created work remains visible in the surface that launched creation
  - fixing table priority/updated sorting and docs delete navigation
  - adding focused regression coverage for each of those flow defects
- applied the PR #13 Greptile follow-up by:
  - filtering docs delete navigation through the active document list before selecting the next route
  - making create-dialog type-default helpers dependency-safe for open-dialog registry changes
  - limiting bug triage's Intake planned-status fallback to one status so Ready can claim the next planned lane in custom workflows
  - adding regression coverage for all three review findings
- applied the second PR #13 Greptile follow-up by:
  - splitting create-dialog opening resets from derived default refreshes so registry updates no longer clear in-progress title or description drafts
  - extending CreateItemDialog regression coverage to prove status defaults refresh while draft text is preserved
- continued the July 2026 product-depth pass with trash, activity, and custom fields by:
  - adding a shared `/trash` route with restore and confirmed permanent-delete actions for work items, documents, and attachments
  - extending the command dispatcher with document and attachment restore/permanent-delete commands plus doc/attachment trash activity events
  - rendering readable work-item activity labels through `formatActivityEvent()` instead of exposing raw event type strings in the modal
  - adding `CustomFieldsPanel` for applicable item custom fields and preserving hidden custom-field values across type changes
  - surfacing active custom fields in table columns and populated applicable custom fields as compact backlog metadata
  - expanding dispatcher, modal, table, backlog, and trash regression coverage around those workflows
- applied the PR #14 Greptile follow-up by:
  - adding DCO sign-off to the implementation commit
  - cascading document permanent deletion through document-scoped reminders plus active and trashed document attachments
  - catching Trash view command failures and rendering inline feedback after closing the confirmation dialog
  - rejecting new non-null values for custom fields that do not apply to the item's current type while still allowing unchanged hidden values to be preserved
- applied the second PR #14 Greptile follow-up by:
  - making `doc.delete` keep bundles valid during the trash window by moving document-scoped attachments to trash records and storing/removing document reminders until restore
  - extending dispatcher coverage so document trash, document restore, and bundle validation are verified before permanent deletion

## Open follow-on planning

- UI/UX overhaul planning lives in `docs/superpowers/specs/2026-07-02-ui-ux-overhaul-design.md`, `docs/superpowers/plans/2026-07-02-ui-ux-overhaul-implementation-plan.md`, and the new `docs/plans/July 2026 plan.md`; the first implementation pass is now in code, and the July plan is the active priority order for deeper product-depth, workflow, and surface-by-surface improvements
- a deeper roadmap interaction plan (multi-day bars, dependencies, swimlanes)
- a security-first plugin runtime plan before any third-party plugin execution
- a public-internet hosting plan (currently out of MVP scope; only trusted internal hosting is supported)
- a sync-backend plan if richer collaboration is pursued

The current `docs/FullSpec.md`, `docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md`, and UI/UX overhaul planning package remain the product source of truth. The implementation in this repository implements the MVP slice of the original plan and now includes the first working UI/UX overhaul slice with shared primitives and migrated route surfaces.
