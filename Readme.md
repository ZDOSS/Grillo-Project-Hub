# Grillo Project Hub

A free, open source, hybrid day-one project management suite for practical software work, combining a hosted PWA and a packaged desktop app around one shared core.

## Status

The MVP implementation is in place. The current build supports:

- **Workspace** with new/open/demo project flow, template preview cards, richer first-project CTAs, immediate folder-backed project creation when a folder is selected, recent-project reopen, browser-vs-folder storage guidance, inline delete/remove confirmation, explicit header actions for saving/switching/closing the current project, an explicit `/projects` launcher route, and automatic restore of the last active project after reload without silently downgrading folder sessions to browser recovery
- **Shared UI foundation** with reusable buttons, icon buttons, fields, page headers, surfaces, toolbars, empty states, inline alerts, toasts, contextual help tips, focus-restoring modal/dialog primitives, data tables, work-item metadata components, and responsive shell navigation that owns Escape while open
- **Overview** as the default project landing view for created, opened, imported, demo, and restored projects, summarizing active work, milestone progress, blocked items, future upcoming dates/reminders, triage-lane bug intake, recent activity, and the current storage/save state
- **Board** with drag-and-drop, WIP limits (warn + hard modes), explicit hard-limit feedback, column-based status grouping, context-aware item creation that starts in the first board lane or active type/status filters, and whole-card link navigation that keeps visible card metadata available to assistive technology
- **Backlog** with priority-sorted items, saved working views, shared text/type/status/priority/assignee/milestone filters, custom-field metadata tags, a shared toolbar, and a visible new-item entry point that inherits active planning filters
- **Table** with accessible sortable header buttons, corrected priority/updated sorting, saved working views, shared filters, column visibility and saved column order, row selection that survives filter changes, bulk status/priority/assignee edits with feedback and hidden-selection clearing, inline status/priority/assignee/milestone/due-date edits, custom-field columns, large-table guidance, shared metadata badges, and a filter-aware new-item entry point
- **Docs** with Markdown editing, sanitized rendering, internal embeds, command-backed sections, reusable document templates, in-surface doc search, linked-work and backlink context panels, router-safe in-app navigation for preview links, stale document-route recovery, correct pane updates when switching documents, draft-preserving editor resets, shared confirmation for document deletion, and safe navigation to the next active document after deleting the open one
- **Roadmap / timeline** with date drag/resize, milestone lanes, milestone progress and target dates, dependency indicators, explicit date controls that clear each side of a range independently, milestone reassignment, a visible new-item action that starts work at the current anchor month, invalid-range feedback, large-roadmap guidance, and shared zoom/anchor controls
- **Calendar** with accessible month navigation controls, month grid, date-based item visibility, explicit day-level scheduled-work creation through the shared work-item dialog, and an agenda for upcoming start/due dates and timezone-aware reminders that stay visible around UTC/local day boundaries
- **Bug triage** with severity, priority, source/context metadata, reproduction steps, expected/actual behavior, environment, affected version, shared work-card metadata, practical triage filters, accept/decline/snooze/assign actions, a searchable duplicate-link picker, configurable severity-or-priority intake gates, workflow-safe decline handling, and a visible new-bug entry point that defaults to the Intake lane without starving Ready in custom planned workflows
- **My work** filtered to the locally selected member with a real member select control, shared work rows, and assigned-to-me creation
- **Search** across items, docs, comments, and labels with shared search controls and grouped results
- **Settings** split into focused panels for general project identity, appearance, storage, visible views, members, workflow, labels/milestones, custom fields, plugin trust, automation rules, import/export with action summaries, unsaved-import next actions, and clean print preview, and a truthful AI bridge readiness panel with keyboard-accessible section tabs that preserve in-progress drafts while switching sections
- **Consistent settings editing** for members, statuses, priorities, types, and plugin trust with explicit edit or save/cancel flows instead of always-live row inputs
- **Shared navigation config** so sidebar navigation and left-panel visibility toggles stay in sync
- **Saved planning views** in the project view bar, with board/backlog/table save, update, delete, and reorder flows backed by validated shared filters that preserve multi-value saved filters
- **Command palette** with `Ctrl/Cmd+K`, collision-safe combobox/listbox keyboard semantics, and `C` to create items through a draft-preserving dialog with view-aware type/status/priority/assignee/milestone/date defaults
- **Trash** with individual and bulk restore plus confirmed permanent deletion for work items, documents, and attachments, including inline feedback when a recovery action cannot be completed
- **Modal-style work item detail** backed by the shared modal primitive, with full edit, checklist (with convert-to-subtask), inline comment editing, an accessible comment composer, subtasks, relationship add/remove controls with contextual help, saved automation-rule previews for the current item, custom fields, attachment upload/preview/delete, reminder create/update/delete, readable activity, app-owned permanent-delete confirmation, archive/trash/delete, and a pinned action footer
- **Local full-text search** with structured filters
- **JSON, Markdown, and CSV export/import**
- **Light and dark themes** with system preference detection
- **PWA support** with offline service worker, visible offline state, and install prompt handling when the browser exposes it
- **Desktop shell (Tauri)** with folder-backed storage adapter wired to registered Rust commands
- **Validated command surface** for UI, automation, import, and future AI/MCP bridge parity, with the current bridge UI clearly labeled as not yet shipped
- **Automation rules** with command-backed create/update/delete/enable/disable, dry-run preview, item-event triggers, validated actions for field updates, labels, status, milestones, subtasks, and generated docs, and audited action failures that do not abort the originating item command

## Quick start

```bash
npm install
npm run dev:web       # PWA at http://localhost:5173
npm test              # unit tests
npm run test:e2e      # end-to-end browser tests (starts/stops Vite)
npm run build         # production build
npm run build:desktop # desktop frontend build
npm run dev:desktop   # desktop shell (Tauri; in production)
```

## Deployment (GitHub Pages)

The hosted web/PWA version deploys automatically to GitHub Pages on pushes to `main` (and on manual trigger).

- Workflow file: [.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml)
- It builds via `npm run build:web` (the monorepo web workspace target), configures the Vite `base` for the `/Grillo-Project-Hub/` subpath, and adds a `404.html` copy of `index.html` so React Router client-side routes work on GitHub Pages.
- The PWA (service worker, manifest, offline support) is included in the static build.
- CI and Pages builds run on Node 24, and the Pages deployment uses the Node 24-compatible GitHub Pages action chain (`configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`) with the maximum supported deploy wait of 600000 ms.
- **One-time repo setup required**: In GitHub -> Settings -> Pages -> "Build and deployment" -> Source = "GitHub Actions".

Live demo (once enabled): https://ZDOSS.github.io/Grillo-Project-Hub/

Note: This is a static client-side demo only. All data lives in the browser (localStorage + PWA storage). See AI.md ("public-internet hosting plan" is noted as out-of-MVP scope for richer features).

## Storage notes

- In the **PWA/web app**, projects are browser-local by default. On browsers that support the File System Access API, the launcher can also bind the PWA to a real local folder and save `.pm-suite` project files there; the selected folder is treated as active immediately, with browser handle persistence used only to remember it for later sessions.
- The project header now reports the actual save state: saved destination and age, unsaved changes, in-progress save, or save failure. The same header exposes **Save now** / **Retry save**, **Switch project**, and **Close project** so users do not have to infer storage state from the sidebar alone; closing dirty or unsaved in-memory projects requires an explicit destructive confirmation. Auto-save failures surface in-app instead of only going to the console.
- Folder/file-watch capable adapters can notify the shell when the active project changes externally; the app now shows explicit reload-from-storage or keep-local-changes actions instead of silently ignoring that conflict, and renamed files reload through the new storage key instead of continuing to point at the old one.
- Creating a new project after selecting a folder writes the initial `.pm-suite/<project-id>.pms.json` file before the app enters the project, so the folder-backed copy exists immediately.
- Opening from a selected folder reads the listed `.pms.json` file directly, even if that project has never been recorded in the browser-local recent-project index, and folder metadata wins over stale browser-local trust saved inside older project files.
- PWA folder saves also keep a browser-local recovery copy so the project still reopens if the browser cannot restore folder access after reload; until the folder is selected again, that recovery load reports as browser-local because the app no longer has write access to the folder.
- Automatic last-project restore for a folder-backed session reconnects through the folder-aware load path; if that path is unavailable or the folder project cannot be read, the app returns to the launcher/recent-project reconnect flow instead of quietly opening stale browser recovery as browser-local.
- Imported project bundles that are not written through an adapter are treated as unsaved replacements and clear the previous active-session pointer, so importing over a folder-backed project cannot leave future reloads aimed at the old folder key. Imported JSON and demo projects are not added to recents until the user explicitly saves them.
- Opening a folder-backed PWA recent from the launcher reconnects the selected folder before loading the `.pms.json`; if a remembered folder cannot read the project, the launcher asks for the folder once more. If that reconnect is cancelled or unavailable, the browser-local recovery copy can still open, but if a selected folder is missing the recorded project file, the app asks for the folder that contains that `.pm-suite` path instead of silently opening stale recovery data.
- If you edit that browser-local recovery copy and then select the folder again, opening the folder project promotes the newer recovery copy back into `.pm-suite` before returning to folder-backed mode.
- If the folder file changed externally while the app was using browser recovery, the folder version is loaded instead of being overwritten by stale browser recovery data.
- Reloading now restores the last active project from browser state instead of dropping you into an empty shell.
- Older browser-local saves are repaired on load if their saved-project index metadata is missing, so reopening an existing project no longer depends on that index staying intact.
- Reopening a saved project from the launcher now runs the same bundle validation used by startup restore and direct storage loads, so corrupt saved data is rejected consistently instead of loading halfway into the app.
- The visible JSON import flows now also perform that same explicit validation right before the project store is replaced, so manual imports and reopen flows follow the same safety pattern.
- Corrupt saved-session startup state is cleared automatically instead of breaking the app boot path, and canceling the browser folder picker is treated as a normal dismissal rather than a workspace error.
- The web runtime now uses one shared storage-adapter instance for both auto-save and startup restore, which keeps the PWA's browser-local and folder-backed persistence paths aligned.
- In the **desktop shell**, you can still work browser-locally, or attach a folder path for `.pm-suite` saves and reopen those folder-backed projects from the launcher; new folder-backed projects are saved immediately through the same adapter path.
- Desktop folder-backed saves, loads, existence checks, and deletes now call the registered Tauri commands (`save_project`, `load_project`, `project_exists`, `delete_project`) instead of unregistered filesystem-plugin command names.
- Removing a folder-backed recent from the launcher only removes the shortcut; it does not delete the underlying filesystem project.
- The command layer now hard-fails unknown member edits, validates item, custom-field, document-section, automation-rule, and saved-view references, rejects project-id mismatches, rejects unknown mutation targets, preserves `hiddenViewIds` defaults when opening older bundles, rejects lossy checklist reorders, validates saved-view filter/sort/order configuration, enforces configured bug-intake gates, creates omitted-title blank docs as `Untitled`, and keeps document trash/restore valid by moving document-scoped attachments to trash records while preserving document reminders for restore.
- JSON import now performs deeper bundle integrity checks, so dangling item, relationship, reminder, attachment, board-view, and saved-view filter references are rejected before replacing the active project.
- Starter templates now carry different left-panel defaults, the launcher shows template preview cards before creation, and the bug-tracker template seeds bug-safe defaults so validation/import does not fail on stale status references.
- The simple-kanban starter template now seeds a working welcome-doc link to its sample task instead of rendering a broken placeholder token.
- Settings registry rows now reset cleanly when the underlying project bundle changes, so import/undo flows do not leave stale inline edit drafts behind.
- JSON import/export remains the portable handoff path across machines or runtimes.

## Architecture

```
apps/web         # hosted PWA target
apps/web/scripts # web test runners and app-level tooling
apps/desktop     # Tauri desktop shell
packages/core    # shared domain model, storage, commands, export/import, search, templates
packages/ui      # shared React components, views, theme, command palette
tests/e2e        # Playwright parity tests
```

`AI.md` is the living architecture ledger. `docs/FullSpec.md` is the current source of truth for product direction.

The UI/UX overhaul planning package lives in `docs/superpowers/specs/2026-07-02-ui-ux-overhaul-design.md` and `docs/superpowers/plans/2026-07-02-ui-ux-overhaul-implementation-plan.md`. The implementation now starts that plan in code with a shared UI component layer, including the `Surface` primitive, migrated work-management surfaces, route-level toolbar/empty-state patterns, accessible settings tabs, and a modal-backed work-item detail surface.

## Tests

| Suite | Count | Notes |
| --- | --- | --- |
| `packages/core` | 58 | Domain, storage, dispatcher, document sections/templates, automation rules, export, import, starter template validity |
| `packages/ui` | 137 | AppShell, ProjectRouter, OverviewView, shared button/surface/modal primitives, WorkItemModal attachment/reminder/custom-field/automation-preview coverage, TrashView bulk actions, BoardView, saved planning views, BacklogView, BugTriageView, MyWorkView, TableView, RoadmapView creation, CalendarView, CommandPalette, CreateItemDialog, launcher, docs, settings, automation settings |
| `apps/web` | 4 | PWA storage adapter folder-picker create/list/load flow, reload recovery when folder-handle persistence is unavailable, recovered-edit promotion, and external folder-change protection |
| `apps/desktop` | 2 | Desktop storage adapter command wiring |
| `tests/e2e` | 10 | Hybrid parity, project workflow, theme, palette, export, search, calendar scheduled-work creation, docs edit/preview, mobile navigation |

Run them all with `npm test` (unit) and `npm run test:e2e` (browser). The e2e runner starts Vite as an owned child process, passes `PLAYWRIGHT_BASE_URL` into Playwright, and shuts Vite down after Playwright exits, which keeps the command reliable on Windows and CI.
`npm run typecheck` covers all packages and apps, and `npm run lint` currently aliases that same check until a dedicated lint rule set is introduced.

## License

Copyright (C) 2026 ZDOSS

Grillo Project Hub is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

- Full license text: [LICENSE](LICENSE)
- Short notice: [COPYING](COPYING)
- How to contribute under GPL: [CONTRIBUTING.md](CONTRIBUTING.md)
- Contributor sign-off policy: [DCO](DCO) (use `git commit -s`)

SPDX identifier: `GPL-3.0-or-later`
