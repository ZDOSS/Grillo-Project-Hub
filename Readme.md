# Grillo Project Hub

A free, open source, hybrid day-one project management suite for practical software work, combining a hosted PWA and a packaged desktop app around one shared core.

## Status

The MVP implementation is in place. The current build supports:

- **Workspace** with new/open/demo project flow, recent-project reopen, browser-vs-folder storage guidance, inline delete/remove confirmation, and automatic restore of the last active project after reload
- **Board** with drag-and-drop, WIP limits (warn + hard modes), column-based status grouping, and whole-card link navigation that keeps visible card metadata available to assistive technology
- **Backlog** with priority-sorted items
- **Table** with sort, group, filter, and column visibility
- **Docs** with Markdown editing, sanitized rendering, internal embeds, backlinks, router-safe in-app navigation for preview links, correct pane updates when switching documents, and draft-preserving editor resets
- **Roadmap / timeline** with date drag/resize, milestone lanes, and dependency awareness
- **Calendar** with month grid and date-based item visibility
- **Bug triage** with severity, reproduction steps, expected/actual behavior, environment, affected version, and a visible new-bug entry point
- **My work** filtered to the locally selected member
- **Search** across items, docs, comments, and labels
- **Settings** for theme, left-panel visibility, editable members, statuses, priorities, types, labels, milestones, custom fields, plugins, export, and AI bridge
- **Consistent settings editing** for members, statuses, priorities, types, and plugin trust with explicit edit or save/cancel flows instead of always-live row inputs
- **Shared navigation config** so sidebar navigation and left-panel visibility toggles stay in sync
- **Command palette** with `Ctrl/Cmd+K` and `C` to create items
- **Work item drawer** with full edit, checklist (with convert-to-subtask), comments with threads and edit history, subtasks, relationships, archive/trash/restore
- **Local full-text search** with structured filters
- **JSON, Markdown, and CSV export/import**
- **Light and dark themes** with system preference detection
- **PWA support** with offline service worker
- **Desktop shell (Tauri)** with folder-backed storage adapter wired to registered Rust commands
- **Validated command surface** for UI, automation, import, and AI/MCP bridge parity

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
- **One-time repo setup required**: In GitHub -> Settings -> Pages -> "Build and deployment" -> Source = "GitHub Actions".

Live demo (once enabled): https://ZDOSS.github.io/Grillo-Project-Hub/

Note: This is a static client-side demo only. All data lives in the browser (localStorage + PWA storage). See AI.md ("public-internet hosting plan" is noted as out-of-MVP scope for richer features).

## Storage notes

- In the **PWA/web app**, projects are browser-local by default. On browsers that support the File System Access API, the launcher can also bind the PWA to a real local folder and save `.pm-suite` project files there.
- Reloading now restores the last active project from browser state instead of dropping you into an empty shell.
- Older browser-local saves are repaired on load if their saved-project index metadata is missing, so reopening an existing project no longer depends on that index staying intact.
- Reopening a saved project from the launcher now runs the same bundle validation used by startup restore and direct storage loads, so corrupt saved data is rejected consistently instead of loading halfway into the app.
- The visible JSON import flows now also perform that same explicit validation right before the project store is replaced, so manual imports and reopen flows follow the same safety pattern.
- Corrupt saved-session startup state is cleared automatically instead of breaking the app boot path, and canceling the browser folder picker is treated as a normal dismissal rather than a workspace error.
- The web runtime now uses one shared storage-adapter instance for both auto-save and startup restore, which keeps the PWA's browser-local and folder-backed persistence paths aligned.
- In the **desktop shell**, you can still work browser-locally, or attach a folder path for `.pm-suite` saves and reopen those folder-backed projects from the launcher.
- Desktop folder-backed saves, loads, existence checks, and deletes now call the registered Tauri commands (`save_project`, `load_project`, `project_exists`, `delete_project`) instead of unregistered filesystem-plugin command names.
- Removing a folder-backed recent from the launcher only removes the shortcut; it does not delete the underlying filesystem project.
- The command layer now hard-fails unknown member edits, validates item and saved-view references, rejects unknown mutation targets, preserves `hiddenViewIds` defaults when opening older bundles, and rejects lossy checklist reorders.
- JSON import now performs deeper bundle integrity checks, so dangling item, relationship, reminder, attachment, and board-view references are rejected before replacing the active project.
- Starter templates now carry different left-panel defaults, and the bug-tracker template seeds bug-safe defaults so creating a new bug does not fail on status mismatch.
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

## Tests

| Suite | Count | Notes |
| --- | --- | --- |
| `packages/core` | 38 | Domain, storage, dispatcher, export, import |
| `packages/ui` | 19 | AppShell, BoardView, BacklogView, CommandPalette, launcher, docs, settings |
| `apps/desktop` | 2 | Desktop storage adapter command wiring |
| `tests/e2e` | 7 | Hybrid parity, project workflow, theme, palette, export, search |

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
