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
- saved view definitions now share optional `WorkItemFilter`, `ViewSort`, and `order` fields across board, backlog, table, and my-work style views; the shared filter covers text query plus type, status, priority, assignee, label, and milestone ID arrays
- table views may persist `visibleColumns` and `columnOrder`; backlog views may group by `status`; board/backlog/table saved views all keep their configuration in the core view map rather than in route-local UI state

## Storage model summary

- canonical durable format: `project.pms.json` inside `.pm-suite/` (or browser `localStorage` as a labeled compatibility layer)
- adapter contract: `ProjectStoreAdapter` in `packages/core/src/storage/store.ts`; folder-capable adapters may implement `loadFolderProject(key)` for files discovered by a currently selected folder even when the browser-local metadata index has never seen that project
- `WebLocalStorageAdapter` for browser/PWA mode
- the web adapter is now hybrid: browser-local storage remains the default, but browsers with File System Access support can persist project files into a user-chosen local folder; the selected folder handle becomes the active handle immediately, while IndexedDB persistence is a best-effort durability layer for later sessions
- `DesktopAdapter` for Tauri (calls the registered Rust commands and falls back to `localStorage` when Tauri is absent in dev)
- `InMemoryProjectStore` is available for tests
- external change detection uses the adapter's `externalRevision` counter and `WatchEvent` notifications
- trust status is surfaced in the UI as a `Folder-backed` / `Browser-local` / `Unsaved` badge
- desktop storage now only writes to the filesystem when a folder path has actually been attached; otherwise the desktop shell behaves as browser-local storage on purpose instead of pretending to be folder-backed
- recent-project reopen uses the active adapter's `load()` path rather than forcing JSON import; desktop recents restore the remembered folder path before loading
- new project creation now saves through the active adapter before navigation, so folder-backed creates produce the initial `.pm-suite/<project-id>.pms.json` immediately instead of waiting for a later dirty auto-save
- launcher reopen paths now validate imported bundles before calling `setBundle()`, matching the startup restore and direct storage-load paths so corrupt saved data is rejected consistently instead of silently entering the UI store
- the two UI JSON-import entry points now also perform an explicit `validateProjectBundle()` immediately before `setBundle()`, mirroring the reopen paths even though `importProjectJson()` already validates internally; this keeps the UI-side contract obvious and avoids review drift about where store writes are gated
- the desktop recent-project reopen path still depends on `DesktopAdapter.load()` reading the active folder from `localStorage` at call time; `ProjectsListView` now documents that ordering explicitly so later adapter refactors do not accidentally cache the folder too early
- the browser adapter now repairs older browser-local saves whose metadata index is missing by falling back to the raw `localStorage` project blob and reconstructing the saved-project index entry on load
- the active project session is now persisted in `localStorage` (`gph.active.project`) and restored on startup through `restoreLastProjectSession()`, so reloads in both web and desktop shells reopen the last project instead of dropping the user into an empty shell
- session restore now treats corrupt or invalid persisted bundles as stale state: failed import/validation clears `gph.active.project` instead of bubbling an unhandled rejection through the startup hook
- session restore treats folder-backed active sessions as folder-backed only when the adapter exposes `loadFolderProject()`: if that folder-aware loader is missing or cannot read the project, it clears the active session and returns to the launcher/recent-project reconnect path instead of silently opening the browser-local recovery copy as browser mode
- the web runtime now installs the same `WebLocalStorageAdapter` instance into both `window.__gph_store` and `WebStorageAdapter.adapter`, preventing auto-save and startup restore from drifting onto different adapter instances if adapter-local state is added later
- the desktop runtime now installs the same `DesktopStorageAdapter.adapter` instance into `window.__gph_store`; folder-backed desktop saves/loads/existence checks/deletes call `save_project`, `load_project`, `project_exists`, and `delete_project`
- `useProjectStore.setBundle()` and `markSaved()` normalize `bundle.projectSettings.storageTrust` to the runtime storage trust, so overview/settings/header storage surfaces do not keep showing browser-local after a folder save or open
- folder/open/session paths treat adapter metadata as the source of truth for storage trust; this intentionally overrides stale `projectSettings.storageTrust` values inside older `.pms.json` files so folder-backed projects do not continue to display as browser-local after a direct folder open
- PWA folder-backed saves write the `.pms.json` file and keep a browser-local recovery copy; after reload without an active folder handle or permission, plain `load()` returns that recovery copy as browser-local until the user reselects the folder
- PWA folder-backed recent reopen is intentionally different from plain `load()`: `ProjectsListView` prompts/reconnects the browser folder picker, then uses `loadFolderProject()`; if a restored folder label produces a null folder load, the launcher prompts once more to refresh access, browser recovery fallback is only allowed when that reconnect is cancelled/rejected/unavailable, and a selected folder that lacks the recorded `.pms.json` must show the reconnect message for that `.pm-suite` path instead of silently opening stale browser recovery
- when a user reselects a folder after editing the browser-local recovery copy, `loadFolderProject()` promotes the newer recovery JSON back into the selected `.pm-suite` file before returning folder-backed metadata, preventing stale folder files from overwriting recovered edits
- recovery promotion is guarded by a last-known folder snapshot in `gph.project.folderBase.<project-id>`; if the current folder file changed externally since that snapshot, the adapter loads the folder file and mirrors it into browser recovery instead of overwriting it with stale browser state

## Command surface

- one validated `CommandEnvelope<CommandPayload>` shared by UI, automation, import, and MCP
- command families include `project.*`, `item.*`, `relationship.*`, `comment.*`, `milestone.*`, `label.*`, `member.*`, `status.*`, `priority.*`, `type.*`, `doc.*`, `customField.*`, `reminder.*`, `attachment.*`, `automationRule.*`, `bugTriage.*`, `view.*`, `search`
- the dispatcher in `packages/core/src/commands/dispatcher.ts` applies the change, records `EventRecord`s, and returns the new bundle
- hierarchy rules, archive/trash, severity independence, and date-only vs UTC timestamp validation are enforced in dispatcher paths
- newly added commands in this pass:
  - `project.updateSettings` for plugin trust mode and left-panel visibility (`hiddenViewIds`)
  - `member.update` for inline member edits
  - `member.delete` for archiving a member and unassigning any items still assigned to them
  - `automationRule.create`, `automationRule.update`, `automationRule.delete`, `automationRule.setEnabled`, and `automationRule.dryRun` for the first command-backed automation builder
  - `bugTriage.updateConfig` for bug-workflow guardrails such as requiring severity or priority before bugs leave intake
- dispatcher hardening added after review:
  - `member.update` now throws `Error("Member not found")` for unknown IDs instead of silently succeeding
  - `project.updateSettings` now preserves `hiddenViewIds: []` for legacy bundles that predate that field instead of reintroducing `undefined`
  - item create/update paths now validate referenced type, status, priority, member, label, milestone, and parent IDs before mutating the bundle
  - checklist reorder commands must include every existing checklist entry exactly once, so partial client payloads cannot silently delete entries
  - `project.updateSettings` now rejects project-id mismatches before applying settings patches
  - relationship, comment, milestone, label, status, priority, type, doc, reminder, attachment, view, and search commands now reject project mismatches or unknown mutation targets instead of silently bumping revisions
  - saved view create/update paths validate board status references and my-work member filters before mutating the active bundle, matching the import validator's saved-view checks
  - JSON import now performs deep bundle reference validation through `validateProjectBundle()`, rejecting dangling item, relationship, reminder, attachment, folder, and board-view references before the UI can call `setBundle()`
  - saved view create/update paths now normalize shared `filter`, `sort`, and `order` configuration, reject malformed filter arrays or unknown sort fields, and validate filter references against known types, statuses, priorities, members, labels, and milestones before mutating the bundle
  - JSON import now remaps saved-view filter references during project import and validates remapped saved-view filter IDs before replacing the active project, so portable exports cannot retain stale type/status/priority/member/label/milestone references
  - `doc.restore`, `doc.permanentlyDelete`, `attachment.restore`, and `attachment.permanentlyDelete` now use the same command surface as work-item restore/delete, and doc/attachment soft deletes emit readable activity events
  - `doc.delete` removes document-scoped reminders from the active reminder array, moves document-scoped attachments into attachment trash records, and stores removed document reminders with the document trash payload so restore can rehydrate them without leaving invalid active references
  - `doc.permanentlyDelete` removes document-scoped reminders plus active and trashed document-scoped attachments so hard-deleting a trashed document cannot leave dangling document references behind
  - `item.update` validates supplied custom field values against the field registry, type, applicability, options, and required rules when the patch includes `customFields`; unrelated item updates intentionally do not revalidate hidden legacy values so type changes preserve existing custom field data
  - `item.update` and `item.moveStatus` enforce the configured bug intake gate for bug-module item types, so the "severity or priority before leaving intake" rule is not only a React-view convention

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

- built-in module IDs follow the `builtin.*` convention (e.g. `builtin.kanban`, `builtin.bugs`, `builtin.automation`)
- modules own only their configuration and specialized data
- core items survive module disable/remove
- unknown module sections are preserved unchanged when saving
- bug severities are stored in the `builtin.bugs` section and only apply to type IDs configured by the bug module
- automation rules are stored as an array under `modules["builtin.automation"].data.rules`; legacy bundles without that module are tolerated by the dispatcher and receive the module when the first automation command writes rules
- plugin trust posture is surfaced in Settings and now writes back into `projectSettings.pluginTrustMode`; runtime enforcement is still MVP-first-party-only, but the setting is no longer dead UI

## Key implementation invariants

- `parentId` is the only persisted hierarchy edge; subtask lists are derived
- MVP commands reject grandchild nesting; deeper nesting is a future UI/command addition without schema migration
- `blocks` is stored once as a directional edge; `blocked by` is derived
- `relatesTo` is canonicalized so each pair is stored once regardless of which item initiated it
- planning dates use `YYYY-MM-DD` and never round-trip through UTC midnight
- reminders store UTC `remindAt` plus IANA `timeZone`; changing display TZ never mutates the instant, and agenda-style date-only displays must derive the visible day through `dateOnlyFromTimestamp(remindAt, timeZone)` rather than slicing the UTC string
- checklist entries are not hidden work items; convert-to-subtask is one atomic validated command
- archive preserves identity and references; trash is canonical project data; permanent deletion is explicit
- custom-field values are stored on `WorkItem.customFields` as typed values keyed by custom field ID; inapplicable values must be hidden in UI surfaces, not deleted, so type changes do not lose data
- WIP limits warn by default and may hard-block on the board when configured
- status transitions route through `item.moveStatus` so backend automation and UI share the same validation
- automation-triggered commands are dispatched with source `automation` and deliberately do not trigger another automation pass, preventing rule loops while keeping rule actions on the validated command path

## Current major workflows

- workspace launcher (`/`, `/projects`, `/open`, `/demo`) with:
  - reopen-from-recents support
  - browser-vs-folder storage explanation
  - explicit delete/remove confirmation for saved projects
  - folder-backed delete is intentionally "remove recent shortcut only" and does not delete filesystem data
  - desktop folder-path attach flow for new projects, with the first project file written before entering the app
  - desktop folder scan/open flow for existing `.pm-suite` saves
  - PWA/browser folder picker for creating and reopening local-folder projects when File System Access is available
  - PWA/browser folder-backed recents reconnect the selected folder before loading, retry the picker once when a restored folder handle returns no project, open browser recovery after cancelled/rejected/unavailable folder access, and show a folder-specific reconnect message if the selected folder lacks the recorded `.pms.json`
  - direct folder-file open through `loadFolderProject()` when a selected folder lists a project that has no local index metadata
  - automatic last-project restore after reload via persisted active-session metadata
  - new-project modal dismissal is explicit through Cancel/Create, not backdrop or header-close clicks
  - an explicit `/projects` launcher route; `/` redirects an already-open/restored project to `/overview` so the real app root honors the in-project overview default without removing the launcher
- per-project view tabs across overview, board, backlog, table, roadmap, calendar, docs, bug triage, my work, search, trash, and saved planning views; `AppShell` reads saved board/backlog/table/bug/my-work views from the active bundle and keeps them separate from hidden built-in route preferences
- `/overview` is now the default in-project landing route; `OverviewView` derives health summaries from the active bundle, including active work, milestone progress, blocking relationships, future-only upcoming dates/reminders, triage-lane bug intake, recent activity, and the current storage trust/save state without adding new persisted overview state
- `ProjectRouter` keeps `/board` pinned to `projectSettings.defaultViewId` when that view is a board, even if saved board views have earlier ordering, and only mounts the work-item modal overlay route while the current path is `/item/:itemId`
- saved board/backlog/table views keep multi-value filter arrays intact when hydrated into the current single-select toolbar controls; selecting a concrete value intentionally narrows that one dimension, while untouched imported/command-created multi-value filters remain multi-value on update
- create-item entry points now carry view context through `CreateItemPrefill` in `palette-bus.ts`; the shared dialog can receive and expose `typeId`, `statusId`, `priorityId`, `assigneeId`, `milestoneId`, `startDate`, and `dueDate`, so board, bug triage, my-work, backlog, table, and calendar creates no longer drop the context that made the user click that surface's action in the first place
- `createItemPrefillFromFilter()` in `views/planning/view-helpers.ts` is the shared adapter from active single-value planning filters into create-dialog defaults; board creation uses first-column status as a fallback, then lets active type/status filters override it, while backlog and table creation inherit active type/status/priority/assignee/milestone filters
- the create-item dialog derives type defaults from dependency-tracked type-registry inputs while open, and its form-opening reset is split from derived default refreshes so a settings-level type default change can update selects without clearing a user's typed title or description
- modal-style work item detail at `/item/:id` with full edit, checklist conversion, inline comment editing, subtasks, relationships, attachments, reminders, custom fields, readable activity, and pinned action footer; `WorkItemModal.tsx` is now the owning implementation and routes through the shared `Modal` primitive with `size="work-item"`, while `WorkItemDrawer.tsx` is only a compatibility wrapper that renders `WorkItemModal`
- work item detail interactions avoid browser-native modal APIs for persisted edits/destructive work: comment edits use inline local state and `comment.edit`, permanent deletion uses shared `ConfirmDialog`, and relationship add/remove controls route through `relationship.create` / `relationship.delete` so duplicate/cycle validation remains in `@gph/core`
- item-detail attachments live in `AttachmentPanel.tsx`, are filtered by `itemId`, and route through `attachment.add` / `attachment.delete`; browser-local uploads store a data URI fallback with `storagePath: null`, while preview rendering is intentionally constrained to image thumbnails, decoded text snippets, PDF metadata, or no inline preview for unsupported/binary media
- `AttachmentPanel` rejects files larger than 5 MB before calling `FileReader.readAsDataURL()`, because this UI path currently stores browser-local attachment payloads as base64 data URIs in the bundle
- item-detail reminders live in `ReminderPanel.tsx`, are filtered by `targetType: "workItem"` and `targetId`, and route through `reminder.create` / `reminder.update` / `reminder.delete`; reminder editing preserves the domain invariant that the stored value is a UTC `remindAt` instant plus the user's current IANA `timeZone`
- work-item metadata now surfaces the next scheduled reminder above the detail sections so upcoming item-level follow-up is visible without opening the reminder editor section
- custom fields in item detail live in `CustomFieldsPanel.tsx` and route through `item.update` with `patch.customFields`; optional empty values are removed from the item map, required empty values stay blocked with inline validation, and the panel only shows fields applicable to the item's current type
- table view now adds read-only columns for active custom fields, showing `None` for empty applicable values and `Not applicable` where a field does not apply to a row's item type
- table view now supports shared saved-view filters, base-column visibility toggles, persisted visible-column and column-order settings, and command-backed inline edits for status, priority, assignee, milestone, and due date
- table view now supports row selection plus bulk status, priority, and assignee edits; selection intentionally survives local filter changes, bulk apply dispatches one validated `item.update` per selected live item rather than only visible rows, and the toolbar labels hidden selections as `N selected (M visible)`
- table saved views apply persisted `columnOrder` during render; custom-field columns still append when not named by the saved order so active custom fields remain discoverable
- backlog rows now show compact custom-field metadata tags for populated applicable fields, limited to the first few ordered fields to keep the row scannable
- backlog view now supports shared text/type/status/priority/assignee/milestone filters and board/backlog/table style saved-view actions for save-as, update, delete, and left/right ordering
- board view now supports text/type/status filtering plus save-as, update, delete, and left/right ordering for saved board views while preserving board-column configuration in the saved view payload
- `/trash` is a first-class route in the shared navigation; `TrashView` lists project trash records, supports restore and confirmed permanent deletion for work items, documents, and attachments, and marks unsupported trash record types as unavailable instead of pretending they can be restored
- Trash restore/permanent-delete UI catches command failures, closes the confirmation if one is open, and surfaces an inline danger alert so broken historical references do not trap the user in a modal
- work-item modal relationship selectors now memoize item and relationship derivations, so transient local-state changes such as typing in comments do not rebuild every relationship group on large projects
- comment editing disables `Save comment` until the body is non-empty and actually changed; the new-comment composer has a stable `aria-label="New comment"` instead of depending on placeholder text for its accessible name
- shared `Modal` supports `closeOnEscape={false}` for stacked modal cases; `WorkItemModal` disables its Escape handler while the permanent-delete `ConfirmDialog` is open so Escape only cancels the top confirmation and preserves item-detail drafts
- settings view is now a shell plus focused panels: `SettingsView.tsx` owns grouped tab navigation/tabpanel semantics only, while `GeneralSettings`, `AppearanceSettings`, `StorageSettings`, `ViewsSettings`, `MembersSettings`, `WorkflowSettings`, `LabelsMilestonesSettings`, `CustomFieldsSettings`, `PluginsSettings`, `AutomationSettings`, `ImportExportSettings`, and `BridgeSettings` own their own command wiring
- settings workflow, automation, and bridge sections should stay out of the shell; add future settings surfaces as focused files under `packages/ui/src/views/settings/` and register them through the shell tab list
- settings sections expose keyboard-accessible tab semantics with Arrow/Home/End navigation; inactive settings panels stay mounted with `hidden` instead of being unmounted so unsaved local form drafts survive section switches
- settings edit icons come from `lucide-react`, and import failures render as inline alerts instead of browser-native `alert()`
- `BridgeSettings.tsx` is truth-in-UI for future AI/MCP integration: it documents real core command coverage and explicitly says no installable bridge/server binary/client config is shipped yet, so do not add setup commands until a bridge runtime exists
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
- docs now have command-backed knowledge sections through `docFolder.create` and `docFolder.update`; documents still store only `folderId`, `doc.move` remains the document placement command, and folder parent updates reject cycles before bundle validation
- document templates live in `DOCUMENT_TEMPLATES` / `createDocumentFromTemplate()` in `packages/core/src/domain/document.ts`; `doc.create` accepts an optional `templateId` for decision records, release notes, bug context, and project briefs while still supporting blank docs, and omitted/blank non-template titles create an `Untitled` document so the public payload type matches runtime behavior
- the Docs view is now a three-part knowledge workspace: the sidebar creates/searches docs and sections, the editor preserves the existing preview/edit/delete behavior, and the right context rail derives linked work, referenced docs, and backlinks from `parseDocLinks()` / `deriveBacklinks()` instead of storing duplicate relationship state
- DocsView recovers stale `/doc/:id` routes by replacing them with the first active document route when the requested document is archived/deleted and active docs still exist, preventing a populated docs workspace from rendering as empty
- Markdown export groups active docs by active folder section and puts docs without an active section under `Unfiled`, so section organization is visible outside the app while JSON remains the lossless project handoff; archived-only doc collections do not emit an empty `## Docs` heading
- docs view local editor state now resyncs when the selected document changes, which fixes the "stuck on getting started" behavior where clicking another doc changed selection without updating the editor/preview pane
- that editor reset now keys only on `doc.id`, so switching documents still refreshes the draft while external bundle updates to the same document do not silently clobber unsaved local typing
- deleting the currently open doc now routes to the nearest active remaining document, or `/docs` when none remain, so the route does not stay pinned to a deleted or archived document ID while other docs still exist
- `DocEditor` now keeps that selection-sync effect above its null guard so hook ordering stays valid even if future refactors ever allow the component to see a transient `bundle === null`
- roadmap lanes now show milestone target dates, completed/total/percent progress, dependency indicators from `relationshipsForItem()`, explicit date inputs, milestone reassignment controls, and inline invalid-range feedback while preserving date-only semantics through `item.update`; clearing Start or Due clears only that side of the range
- calendar now keeps the month grid and adds a derived agenda for upcoming item start/due dates plus active reminders; reminder agenda rows use the reminder's IANA timezone to decide the visible date, boundary filtering keeps reminders visible when their local display date and UTC date straddle the agenda start, agenda links use existing work-item routes, and the feature does not introduce a calendar-specific storage model
- calendar scheduled-work creation intentionally creates ordinary work items through the shared `CreateItemDialog` and `item.create` command, not a separate calendar-event entity; day-cell add buttons prefill the explicit cell `dueDate`, the toolbar opens the same dialog without carrying the hidden month `anchor` date, and the dialog exposes editable Start/Due date fields plus the existing type/status/priority/assignee controls
- bug triage now exposes a visible `New bug` action in the intake column, maps software-project `inbox` bugs into Intake, opens the shared create dialog with the correct intake status preselected, and limits Intake's planned-status fallback so custom workflows can still populate Ready; `buildBugTriageColumns()` is shared with overview so accepted Ready bugs do not reappear as intake pressure
- bug triage cards are now `<article>` surfaces with an internal item link and real form controls, not whole-card links, so triage buttons/selects are valid and testable; accept/decline/assign dispatch `item.update`, decline resolves to an existing canceled status or completed fallback before dispatching, snooze dispatches `reminder.create`, and duplicate linking opens a picker modal before dispatching `relationship.create` with `relatesTo`
- bug triage toolbar now includes severity and priority filters, cards can edit severity/priority plus plugin-owned source/context data stored under `moduleData.bug`, and the optional Workflow setting blocks Accept/Decline out of intake until a bug has either severity or priority
- automation settings can create, dry-run preview, enable/disable, and delete rules; the first builder supports item-created/updated/status/due-date/milestone triggers plus set-field, add/remove-label, move-status, assign-milestone, create-subtask, and generate-doc actions
- automation rule execution is a side-effect layer after the originating item command succeeds: each action still dispatches through the validated command surface with source `automation`, but action validation failures are captured on `automation.executed.data.failedActionCount` / `failures` instead of throwing back through the user's item command
- My Work now has a `New assigned item` action that preselects the current local member as assignee, so work created from that filtered view remains visible in the same workflow after creation
- board-level `New item` now preselects the first board column's default drop status, which keeps newly created cards visible on boards whose first lane does not use the project/type default status
- table sorting now uses neutral ascending comparators plus explicit default directions, so `Priority (desc)` puts urgent work first and selecting `Updated` defaults to newest-first order
- the bug-tracker template now seeds a bug-compatible default project/type/status configuration, while other starter templates apply different `hiddenViewIds` defaults so the left panel reflects the template's purpose out of the box
- the simple-kanban starter doc now writes a real `[[item:<id>]]` reference for its seeded welcome task instead of rendering a broken literal `sample.id` token
- board cards are now rendered as a single React Router link over the whole card, preserving native link semantics, letting assistive technology compute the link name from visible title/metadata text, and avoiding a title-only click target while still suppressing accidental post-drag navigation
- the UI/UX overhaul implementation pass has started in code:
  - `packages/ui/src/components/` now exports shared button/icon-button, field, page-header, surface, toolbar, empty-state, inline-alert, modal/dialog, data-table, and work-item metadata primitives
  - `AppShell` uses a named workspace navigation landmark, shared header buttons, and lucide icons for command/theme actions
  - `AppShell` now provides a header-triggered mobile workspace navigation sheet for narrow screens; the desktop sidebar remains the primary wide-screen nav, both surfaces share the same route metadata and hidden-view filtering, and the mobile sheet claims Escape while open so one key press cannot also dismiss an underlying overlay
  - the shared `Modal` primitive focuses its close control on open, restores focus to the opener on close, and still supports `closeOnEscape={false}` for stacked confirmations
  - the command palette input is exposed as a combobox with a labelled listbox and active-descendant option wiring, using URI-encoded option ids so distinct command/search-hit ids cannot collide after DOM id generation
  - board, backlog, table, bug triage, my work, search, roadmap, calendar, docs, and settings now use shared primitives for major controls, feedback, metadata, or layout
  - board hard-WIP rejection now surfaces visible status feedback instead of silently dropping the move
  - WIP warnings, roadmap status bars, and warning/bad tags now use text, border style, or border treatment in addition to color
  - search results are grouped by surface type while preserving URL query/scope state
  - roadmap and calendar controls now sit in shared toolbars with accessible names
  - docs use shared confirmation for document delete and lucide document icons instead of emoji UI markers
  - `/item/:id` now renders through the shared modal shell instead of the legacy drawer route shell, with Archive/Trash/Duplicate/Done actions passed through `Modal`'s pinned footer slot

## Testing strategy

- TDD for the shared core: domain rules, command handlers, storage contract, and export/import
- Vitest component tests for `AppShell`, `BoardView`, `BacklogView`, `CommandPalette`, `ProjectsListView`, and `DocsView`
- UI foundation coverage now includes `components/button/Button.test.tsx`, `components/layout/Surface.test.tsx`, `components/overlay/Modal.test.tsx`, and `work-item/WorkItemModal.test.tsx`; AppShell tests assert banner, desktop/mobile workspace navigation, and command-search affordances
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
  - immediate adapter save for new folder-backed PWA projects
  - folder-backed PWA recent reconnect before launcher open, including rejected/null folder-access browser recovery and the stale-recovery guard when the selected folder lacks the recorded `.pm-suite` file
  - local-folder project open without requiring browser-local index metadata
  - explicit Cancel/Create dismissal for the new-project modal
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
  - bug triage filters for needs-repro and command-backed accept/decline/snooze/assign/duplicate actions, including the duplicate picker modal and stale duplicate-error cleanup on cancel
  - bug triage severity/priority filtering, plugin-owned source/context editing, and the configured severity-or-priority intake exit gate
  - automation rule create/update/delete/enable/disable/dry-run commands, dispatcher execution through automation source commands, and Settings automation rule preview/save/toggle/delete flows
  - settings section decomposition, keyboard tab navigation, draft preservation across panel switches, and AI bridge future-capability copy that avoids placeholder install instructions
  - board-context item creation that uses the first board column default status
  - my-work item creation that preselects the active local member as assignee
  - table priority and updated-date sort direction behavior
  - table bulk status/priority/assignee editing across selected rows, including selections hidden by a local filter
  - overview route summaries, default root-to-overview routing for open projects, project create/open/demo/import landing on overview, future-only reminders, and triage-lane bug intake matching the bug board
  - roadmap milestone progress, dependency indicators, date inputs, independent date clearing, and milestone reassignment controls
  - calendar agenda rendering from item dates and timezone-local reminder dates, plus dated work-item creation from calendar day cells
  - trash restore and confirmed permanent deletion for work items, documents, and attachments
  - document soft-delete cleanup for document-scoped reminders and attachments, including reminder restoration from the document trash payload
  - document permanent-delete cleanup for document-scoped reminders and attachments
  - trash action failure feedback that clears the confirmation dialog
  - readable activity labels in work-item detail instead of raw internal event type strings
  - work-item custom-field editing, non-applicable custom-field rejection, hidden-value preservation after type change, table custom-field columns, and backlog custom-field summaries
  - docs delete navigation to the nearest active remaining document, skipping archived docs
  - create-dialog default refresh when the type registry changes while the dialog is open, including preservation of typed title and description drafts
  - shared modal focus/restore behavior
  - command palette combobox/listbox active-descendant semantics and collision-free option ids
  - mobile workspace navigation sheet rendering, dismissal, and Escape ownership above other overlays
  - work-item unchanged-comment save disabling and the new-comment textarea accessible label
  - stacked delete-confirmation Escape handling that preserves the underlying item-detail route and unsaved comment draft
  - item-reference validation and unknown-target rejection in dispatcher commands
  - reminder target validation on create and update commands
  - saved-view reference validation for `view.create` and `view.update`
  - saved-view shared filter/sort/order validation, import remapping, project viewbar rendering, default-board route selection, and board/backlog/table save/update/delete/reorder workflows
  - project-id mismatch rejection for `project.updateSettings`
  - lossy checklist reorder rejection
  - deep JSON import reference validation
  - whole-card board-card link activation
  - desktop storage adapter command wiring and shared adapter installation
- the Settings view test now always seeds a fresh project-store bundle per run instead of reusing any stale Zustand singleton state from prior tests
- UI test setup now installs a memory-backed `localStorage` shim when jsdom's storage implementation is unavailable or misconfigured, which keeps persistence-oriented tests deterministic
- `apps/desktop` now has a Vitest/jsdom test harness for the desktop storage adapter
- Playwright e2e for hybrid parity, theme toggle, command palette, project creation, item creation with `C` shortcut, JSON export download, search, calendar day-cell work creation, docs edit/preview, and mobile navigation
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
- the GitHub Pages workflow now runs the app build on Node 24 and uses the Node 24-compatible Pages action chain (`actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`); the deploy step sets `timeout: 600000`, which is the action's maximum supported wait, so do not re-add the older `1800000` timeout workaround because the action will cap it while emitting a warning.
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
- continued the July 2026 planning parity pass with saved views and backlog/table upgrades by:
  - adding shared saved-view `WorkItemFilter`, `ViewSort`, and `order` fields to core view definitions and validating them in dispatcher create/update paths
  - remapping and validating saved-view filter references during JSON import so exported projects remain portable across generated IDs
  - surfacing saved planning views in the project view bar without changing hidden built-in view preferences
  - adding board, backlog, and table save-as/update/delete/reorder flows for saved working views
- continued the July 2026 planning/workflow milestone by:
  - adding `/overview` as the default in-project landing surface with derived project health, milestone, blocked-work, agenda, bug-intake, activity, and storage-state summaries
  - adding table visible-row selection and bulk status/priority/assignee updates through existing `item.update` commands
  - expanding roadmap lanes with target dates, progress, relationship-based blocked indicators, date controls, invalid-range feedback, and milestone reassignment
  - adding a calendar agenda derived from item start/due dates and reminders
  - adding calendar day-cell creation for dated work items through the shared create dialog
  - turning bug triage into an actionable workflow with filters plus accept, decline, snooze, owner assignment, and duplicate-link actions
  - adding backlog shared filters and table column visibility plus command-backed inline status, priority, assignee, milestone, and due-date edits
  - adding focused core and UI regression coverage for saved-view filters, viewbar rendering, default board routing, backlog saved views, board saved views, and table inline/editable saved views
- applied the PR #15 Greptile follow-up by:
  - limiting AppShell saved-view tabs to saved view types with registered routes so bug/my-work saved views cannot navigate to missing `/bugs/view/:id` or `/mywork/view/:id` routes
  - preserving multi-value saved filters in board, backlog, and table while retaining the current single-select toolbar controls for manual narrowing
  - applying table `columnOrder` during render and saving the ordered visible column subset on table view save/update
  - adding regression coverage for all five review findings
- applied the PR #16 Greptile follow-up by:
  - making roadmap date inputs preserve the unedited side of a range when Start or Due is cleared
  - sharing bug triage lane status ownership with overview so Ready bugs stop counting as intake
  - filtering stale reminders out of the overview agenda and deriving reminder agenda dates from each reminder's `timeZone`
  - making bug decline choose an existing canceled status, then the project completed default, then any completed status instead of dispatching a literal `wont-fix`
  - applying table bulk edits to all selected live items even when some selected rows are hidden by the current filter
  - adding regression coverage for the six review findings
- applied the second PR #16 Greptile follow-up by:
  - keeping calendar reminders visible when their timezone-local display date is the day before the UTC agenda anchor
  - routing create/open/import/demo project entry points to `/overview` instead of `/board`
  - adding `/projects` as the explicit workspace launcher route and redirecting `/` to `/overview` when a project is already open
  - updating e2e expectations for overview-first project entry while still navigating to Board in board-specific workflow checks
- continued the July 2026 workflow-intelligence pass with the Workflow Control milestone by:
  - adding persistent automation rules under `builtin.automation`, rule CRUD/enable/disable/dry-run commands, and item-event execution through the validated dispatcher
  - finishing bug triage gates with severity/priority filters, source/context fields, per-card severity/priority controls, and a command-level severity-or-priority requirement for configured intake exits
  - splitting focused Workflow and Automation settings components out of the main Settings view and adding regression coverage for the new controls
- applied the PR #17 Greptile follow-up by:
  - isolating automation action failures from the originating item command so a saved rule cannot reject a valid user create/update/move when a side-effect fails validation
  - recording failed automation actions on the `automation.executed` activity event with action type and error message details
  - adding a dispatcher regression for the bug-intake gate case where an enabled automation tries to move an ungraded intake bug to Ready
- continued the July 2026 docs knowledge pass by:
  - adding document section commands plus cycle-safe section reparent validation
  - adding reusable document templates for decision records, release notes, bug context, and project briefs
  - upgrading DocsView with section creation, template creation, in-surface search, document section selection, linked-work context, referenced-doc context, and backlinks
  - grouping Markdown export docs by section and adding focused core/UI/export regressions
- applied the PR #18 Greptile cleanup by:
  - redirecting stale archived/deleted doc routes to the first active doc instead of showing the generic empty-docs state
  - suppressing the Markdown Docs section when every document is archived
  - allowing public `doc.create` payloads without a title to create an `Untitled` blank document
- continued the July 2026 polish/trust pass with settings decomposition and AI bridge truth-in-UI by:
  - replacing the monolithic Settings switch with a keyboard-accessible grouped tab shell and focused settings panel files
  - keeping inactive settings panels mounted behind `hidden` so unsaved form drafts are not lost when users switch sections
  - grouping status, priority, type defaults, and bug-intake guardrails inside the Workflow settings panel
  - combining labels/milestones and import/export into clearer workflow panels while preserving the existing command paths
  - replacing placeholder AI bridge install/setup copy with real command-coverage documentation and explicit "not shipped yet" runtime gaps
  - adding SettingsView regression coverage for panel splitting, keyboard navigation, and bridge truth copy
- fixed folder-backed project and duplicate-link user-flow defects by:
  - saving new projects through the active storage adapter before navigating so selected-folder creates immediately write `.pm-suite/<project-id>.pms.json`
  - adding adapter-level `loadFolderProject()` support so folder scans can open selected `.pms.json` files even without browser-local index metadata
  - synchronizing runtime storage trust into `projectSettings.storageTrust` during `setBundle()` and `markSaved()`
  - requiring explicit Cancel/Create dismissal for the new-project modal
  - replacing the bug-triage duplicate target select with a searchable picker modal that confirms an existing bug before dispatching `relationship.create`; canceling the picker clears duplicate-scoped errors so stale relationship failures do not leak back into the toolbar
  - adding focused launcher and bug-triage regression coverage for those flows
- fixed the remaining PWA folder-mode regression by:
  - retaining the folder picker handle in the web adapter immediately after selection, so create/save/list/load stays folder-backed even when IndexedDB folder-handle persistence is unavailable or delayed
  - adding real `apps/web` Vitest coverage for the folder-picker create/list/load adapter flow and wiring web unit tests into the root `npm test` sequence
  - expanding UI regression coverage so adapter folder metadata overrides stale browser-local trust embedded inside older project JSON during folder open and session restore
- applied the PR #25 Greptile accessibility follow-up by:
  - making the mobile workspace sheet stop the current Escape key event when it closes itself, preserving any overlay underneath it
  - switching command-palette option DOM ids from lossy character replacement to `encodeURIComponent()` so `aria-activedescendant` cannot reference duplicate ids
  - adding focused AppShell and CommandPalette regressions for those cases
- applied the PR #21 Greptile follow-up by:
  - writing a browser-local recovery copy for PWA folder saves so projects remain reachable after reload when the selected folder handle is not available
  - making post-reload recovery loads report browser-local trust when no active folder handle is available, while direct folder opens still report folder-backed trust
  - adding a web adapter regression that saves to a mocked folder, resets module state to simulate reload, and verifies the project remains loadable from the recovery copy
- applied the second PR #21 Greptile follow-up by:
  - promoting newer browser-local recovery saves back into the selected folder on direct folder reopen
  - adding a web adapter regression that proves a stale `.pms.json` file cannot replace newer recovered browser edits after the folder is selected again
- applied the third PR #21 Greptile follow-up by:
  - adding a last-known folder snapshot for PWA recovery copies so promotion can detect external folder changes
  - making externally changed folder files win over stale browser recovery copies instead of being overwritten during folder reopen
  - adding a web adapter regression for folder-side changes that happen while the PWA is operating from a browser recovery copy
- fixed the launcher folder-backed recent reopen regression by:
  - routing PWA folder recents through folder-picker reconnect plus `loadFolderProject()` instead of treating them as browser-local loads
  - falling back to browser recovery when folder access is cancelled or rejected before the selected project file can be read
  - retrying the folder picker once when a restored folder label leads to a null folder-project load, then opening browser recovery only if that reconnect is unavailable
  - refusing to silently open stale browser recovery when a selected folder does not contain the recorded `.pms.json`
  - replacing the misleading "could not be found in local storage" error with a reconnect message that names the recorded `.pm-suite` file
  - adding focused ProjectsListView regressions for reconnect-and-open, rejected/null folder-load recovery, and missing-folder-file behavior
- fixed the post-July flow-correctness gaps by:
  - preventing folder-backed startup restore from silently downgrading to browser recovery when `loadFolderProject()` cannot read the project
  - tightening that guard so a folder-trust active session also clears when an adapter lacks `loadFolderProject()` entirely, rather than falling back through recovery-capable `load()`
  - extending the create dialog with milestone prefill and `item.create` submission support
  - making board, backlog, and table New item actions inherit active planning filters through `createItemPrefillFromFilter()`
  - adding the missing table-level New item action so table users do not have to leave the surface to create matching work
  - hardening the command-palette keyboard regression to wait for the palette focus effect before asserting `aria-activedescendant` movement in the full parallel UI suite
  - adding focused regressions for folder-session restore, create-dialog milestone defaults, and board/backlog/table filter-aware creation

## Open follow-on planning

- UI/UX overhaul planning lives in `docs/superpowers/specs/2026-07-02-ui-ux-overhaul-design.md`, `docs/superpowers/plans/2026-07-02-ui-ux-overhaul-implementation-plan.md`, and the new `docs/plans/July 2026 plan.md`; the first implementation pass is now in code, and the July plan is the active priority order for deeper product-depth, workflow, and surface-by-surface improvements
- a deeper roadmap interaction plan (multi-day bars, dependencies, swimlanes)
- a security-first plugin runtime plan before any third-party plugin execution
- a public-internet hosting plan (currently out of MVP scope; only trusted internal hosting is supported)
- a sync-backend plan if richer collaboration is pursued

The current `docs/FullSpec.md`, `docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md`, and UI/UX overhaul planning package remain the product source of truth. The implementation in this repository implements the MVP slice of the original plan and now includes the first working UI/UX overhaul slice with shared primitives and migrated route surfaces.
