# Grillo Project Hub

Grillo Project Hub is a free, open source, local-first project management suite for practical software work. It combines a browser/PWA shell and a Tauri desktop shell around one shared core, with the command surface shaped for UI, automation, import/export, and future local AI/MCP workflows.

The hosted GitHub Pages build is a demo. The intended real-work path is to run Grillo locally today, then use packaged releases once those are available.

## Run locally

Use Node 24 for the closest match to CI and GitHub Pages deployment. The repo currently allows Node 20+, but Node 24 is the safest default.

```bash
git clone https://github.com/ZDOSS/Grillo-Project-Hub.git
cd Grillo-Project-Hub
npm install
npm run dev:web
```

Then open <http://localhost:5173>.

For the desktop shell:

```bash
npm run dev:desktop
```

The desktop shell is still developer-oriented. Browser-local and folder-backed storage paths are usable now; packaged desktop releases are the planned distribution path.

## Hosted demo vs local use

Live demo: <https://ZDOSS.github.io/Grillo-Project-Hub/>

The hosted demo is useful for inspection and lightweight browser-local experiments. It is not the primary install path and should not be treated as the production runtime.

- The hosted build is static client-side GitHub Pages output.
- Demo data and browser-local projects live in that browser profile unless exported.
- File System Access folder saves only work where the browser supports them and still require user-selected folders.
- The AI/MCP bridge runtime is not shipped yet, and the hosted demo cannot provide local MCP integration.
- The hosted header points back to these local setup instructions instead of prompting users to install the Pages demo as the app.

For real project work, run the repo locally or use the future release builds.

## What works today

Grillo is past the skeleton stage. The current app includes:

- Workspace launcher with new, open/import, demo, recent-project, template preview, and explicit browser-vs-folder storage guidance.
- Overview, board, backlog, table, roadmap, calendar, docs, bug triage, my work, search, trash, and settings surfaces.
- Explicit save-state UI in the project header, including save destination, dirty state, save failures, manual save/retry, switch project, and guarded close-project actions.
- Folder-backed browser saves through File System Access where supported, browser-local recovery copies, and direct folder reopen flows for `.pm-suite` projects.
- Explicit per-project browser/folder save targets plus content-fingerprint stale-write protection; selecting a folder for one project does not silently move another project.
- Tauri desktop storage command wiring for folder-backed save/load/existence/delete flows.
- Shared UI primitives for buttons, forms, surfaces, modals, dialogs, tables, empty states, inline alerts, toasts, help tips, and work item cards/rows.
- Modal-style work item detail with comments, checklist/subtasks, relationships, custom fields, attachments, reminders, activity, automation previews, archive/trash/delete, and a pinned action footer.
- Docs with explicit view/edit sessions, Markdown preview, document templates, internal links, linked work, backlinks, dirty navigation confirmation, and safe deletion behavior.
- Bug triage with readable lanes, severity/priority/source/context fields, intake gates, accept/decline/snooze/assign actions, and a searchable duplicate-link picker.
- Automation rules with command-backed create/update/delete/enable/disable, dry-run previews, item-event triggers, and audited action failures.
- JSON, Markdown, and CSV import/export, plus clean print preview.
- Light/dark/system themes, a remembered desktop sidebar that toggles between full navigation and an icon rail, responsive mobile navigation, offline status, and local/self-hosted PWA install support when the browser exposes it.
- A realistic, non-persistent demo workspace with active and completed work, bug intake, comments, members, dates, milestones, and linked docs.

## Storage model

The durable project format is a `.pms.json` bundle under `.pm-suite/` when using folder-backed storage. Browser-local projects use local browser storage as a compatibility layer.

Important behavior:

- New folder-backed projects write their initial `.pm-suite/<project-id>.pms.json` immediately.
- Folder-backed browser saves keep a browser-local recovery copy so reloads are recoverable when the browser cannot restore folder access.
- Reopening folder-backed recents asks for folder access and refuses to silently open stale browser recovery when the selected folder is missing the recorded project file.
- Imported JSON and demo projects are unsaved in-memory sessions until the user explicitly saves them.
- Removing a folder-backed recent only removes the shortcut. It does not delete the filesystem project.
- Desktop folder projects monitor their active `.pms.json` file and offer reload/keep-local choices after external edits, deletes, or renames.

## Development commands

```bash
npm run dev:web       # Vite web app at http://localhost:5173
npm run dev:desktop   # Tauri desktop shell
npm test              # unit/component tests across workspaces
npm run test:e2e      # Playwright browser tests
npm run typecheck     # TypeScript checks across workspaces
npm run build         # production build for all workspaces
npm run build:web     # web/PWA production build
npm run build:desktop # desktop frontend build
```

`npm run lint` currently aliases `npm run typecheck` until a dedicated lint rule set is introduced.

## Architecture map

```text
apps/web          hosted demo and local web/PWA shell
apps/desktop      Tauri desktop shell
packages/core     domain model, storage contracts, commands, import/export, search, templates
packages/ui       shared React shell, views, components, theme, command palette
tests/e2e         Playwright parity and workflow tests
docs              product, architecture, and planning notes
```

`AI.md` is the living architecture ledger for future agents. `docs/FullSpec.md` remains the broad product source of truth. The active July planning work lives under `docs/plans/` and `docs/superpowers/`.

## Deployment

The hosted web demo deploys to GitHub Pages on pushes to `main` and on manual workflow dispatch.

- Workflow: [.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml)
- Build command: `npm run build:web`
- GitHub Pages base path: `/Grillo-Project-Hub/`
- SPA fallback: `404.html` is copied from `index.html` so React Router can handle client-side routes.
- Runtime positioning: hosted demo only; local setup and future release builds are the intended real-use paths.
- One-time repo setup: GitHub -> Settings -> Pages -> Build and deployment -> Source = GitHub Actions.

CI and Pages builds run on Node 24. The Pages deployment uses the Node 24-compatible action chain: `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and `actions/deploy-pages@v5`.

## Testing

The test suite covers:

- `packages/core`: domain, command dispatcher, storage contracts, validation, import/export, search, automation, templates.
- `packages/ui`: AppShell, project router, shared primitives, work item modal, planning views, docs, settings, launcher, command palette, trash, automation settings.
- `apps/web`: browser/PWA storage adapter and distribution-mode behavior.
- `apps/desktop`: desktop storage adapter command wiring.
- `tests/e2e`: hybrid parity, project workflow, theme, command palette, export, search, calendar creation, docs edit-mode behavior, and mobile navigation.

Run unit/component coverage with `npm test`, browser coverage with `npm run test:e2e`, and TypeScript coverage with `npm run typecheck`.

## License

Copyright (C) 2026 ZDOSS

Grillo Project Hub is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

- Full license text: [LICENSE](LICENSE)
- Short notice: [COPYING](COPYING)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Contributor sign-off policy: [DCO](DCO) (use `git commit -s`)

SPDX identifier: `GPL-3.0-or-later`
