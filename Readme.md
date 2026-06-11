# Grillo Project Hub

A free, open source, hybrid day-one project management suite for practical software work, combining a hosted PWA and a packaged desktop app around one shared core.

## Status

The MVP implementation is in place. The current build supports:

- **Workspace** with new/open/demo project flow, recent-project reopen, browser-vs-folder storage guidance, and inline delete/remove confirmation
- **Board** with drag-and-drop, WIP limits (warn + hard modes), and column-based status grouping
- **Backlog** with priority-sorted items
- **Table** with sort, group, filter, and column visibility
- **Docs** with Markdown editing, sanitized rendering, internal embeds, backlinks, and router-safe in-app navigation for preview links
- **Roadmap / timeline** with date drag/resize, milestone lanes, and dependency awareness
- **Calendar** with month grid and date-based item visibility
- **Bug triage** with severity, reproduction steps, expected/actual behavior, environment, affected version, and a visible new-bug entry point
- **My work** filtered to the locally selected member
- **Search** across items, docs, comments, and labels
- **Settings** for theme, left-panel visibility, editable members, statuses, priorities, types, labels, milestones, custom fields, plugins, export, and AI bridge
- **Shared navigation config** so sidebar navigation and left-panel visibility toggles stay in sync
- **Command palette** with `Ctrl/Cmd+K` and `C` to create items
- **Work item drawer** with full edit, checklist (with convert-to-subtask), comments with threads and edit history, subtasks, relationships, archive/trash/restore
- **Local full-text search** with structured filters
- **JSON, Markdown, and CSV export/import**
- **Light and dark themes** with system preference detection
- **PWA support** with offline service worker
- **Desktop shell (Tauri)** with folder-backed storage adapter and Rust commands
- **Validated command surface** for UI, automation, import, and AI/MCP bridge parity

## Quick start

```bash
npm install
npm run dev:web       # PWA at http://localhost:5173
npm test              # unit tests
npm run test:e2e      # end-to-end browser tests
npm run build         # production build
npm run dev:desktop   # desktop shell (Tauri; in production)
```

## Deployment (GitHub Pages)

The hosted web/PWA version deploys automatically to GitHub Pages on pushes to `main` (and on manual trigger).

- Workflow file: [.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml)
- It builds via `npm run build:web` (the monorepo web workspace target), configures the Vite `base` for the `/Grillo-Project-Hub/` subpath, and adds a `404.html` copy of `index.html` so React Router client-side routes work on GitHub Pages.
- The PWA (service worker, manifest, offline support) is included in the static build.
- **One-time repo setup required**: In GitHub → Settings → Pages → "Build and deployment" → Source = "GitHub Actions".

Live demo (once enabled): https://ZDOSS.github.io/Grillo-Project-Hub/

Note: This is a static client-side demo only. All data lives in the browser (localStorage + PWA storage). See AI.md ("public-internet hosting plan" is noted as out-of-MVP scope for richer features).

## Storage notes

- In the **PWA/web app**, projects are browser-local by default. The launcher now makes that explicit and lets you reopen saved browser projects from recents instead of forcing JSON import every time.
- In the **desktop shell**, you can still work browser-locally, or attach a folder path for `.pm-suite` saves and reopen those folder-backed projects from the launcher.
- Removing a folder-backed recent from the launcher only removes the shortcut; it does not delete the underlying filesystem project.
- The command layer now hard-fails unknown member edits and preserves `hiddenViewIds` defaults when opening older bundles, so settings updates do not silently no-op or regress legacy projects.
- JSON import/export remains the portable handoff path across machines or runtimes.

## Architecture

```
apps/web         # hosted PWA target
apps/desktop     # Tauri desktop shell
packages/core    # shared domain model, storage, commands, export/import, search, templates
packages/ui      # shared React components, views, theme, command palette
tests/e2e        # Playwright parity tests
```

`AI.md` is the living architecture ledger. `docs/FullSpec.md` is the current source of truth for product direction.

## Tests

| Suite | Count | Notes |
| --- | --- | --- |
| `packages/core` | 29 | Domain, storage, dispatcher, export, import |
| `packages/ui` | 10 | AppShell, BoardView, BacklogView, CommandPalette, launcher, docs, settings |
| `tests/e2e` | 7 | Hybrid parity, project workflow, theme, palette, export, search |

Run them all with `npm test` (unit) and `npm run test:e2e` (browser).

## License

See `LICENSE` in the repository root.
