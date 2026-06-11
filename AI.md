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
- the Rust/Tauri boundary is narrow: `save_project`, `load_project`, `project_exists`, `list_projects_in_folder`
- UI, automation, import, and MCP/AI actions all route through the same validated command surface (`packages/core/src/commands/`)
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

## Storage model summary

- canonical durable format: `project.pms.json` inside `.pm-suite/` (or browser `localStorage` as a labeled compatibility layer)
- adapter contract: `ProjectStoreAdapter` in `packages/core/src/storage/store.ts`
- `WebLocalStorageAdapter` for browser/PWA mode
- `DesktopAdapter` for Tauri (calls the Rust commands and falls back to `localStorage` when Tauri is absent in dev)
- `InMemoryProjectStore` is available for tests
- external change detection uses the adapter's `externalRevision` counter and `WatchEvent` notifications
- trust status is surfaced in the UI as a `Folder-backed` / `Browser-local` / `Unsaved` badge

## Command surface

- one validated `CommandEnvelope<CommandPayload>` shared by UI, automation, import, and MCP
- command families include `project.*`, `item.*`, `relationship.*`, `comment.*`, `milestone.*`, `label.*`, `member.*`, `status.*`, `priority.*`, `type.*`, `doc.*`, `customField.*`, `reminder.*`, `attachment.*`, `view.*`, `search`
- the dispatcher in `packages/core/src/commands/dispatcher.ts` applies the change, records `EventRecord`s, and returns the new bundle
- hierarchy rules, archive/trash, severity independence, and date-only vs UTC timestamp validation are enforced in dispatcher paths

## Platform differences between web and desktop

- both apps import the same `@gph/ui` AppShell, views, and command palette
- the web app uses `@vitejs/plugin-pwa` for install/offline; the desktop app uses the Tauri runtime
- the web app's storage adapter is localStorage-only; the desktop adapter talks to a Rust filesystem command
- in development, both apps run in the browser; the desktop app's storage adapter falls back to localStorage when `__TAURI__` is absent
- the AppShell accepts an `appMode: "web" | "desktop"` prop for platform-specific header sizing

## Module/plugin rules

- built-in module IDs follow the `builtin.*` convention (e.g. `builtin.kanban`, `builtin.bugs`)
- modules own only their configuration and specialized data
- core items survive module disable/remove
- unknown module sections are preserved unchanged when saving
- bug severities are stored in the `builtin.bugs` section and only apply to type IDs configured by the bug module
- plugin trust posture is surfaced in Settings (`first-party only` is the only enabled mode in MVP; `curated/signed` and `unrestricted` are documented placeholders for later stages)

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

- workspace launcher (`/`, `/open`, `/demo`) with new project dialog and template selection
- per-project view tabs across board, backlog, table, roadmap, calendar, docs, bug triage, my work, search
- work item drawer at `/item/:id` with full edit, checklist conversion, comments, subtasks, activity
- settings view with theme, members, statuses, priorities, types, labels, milestones, custom fields, automation, plugins, export/import, AI bridge
- command palette (`Ctrl/Cmd+K`) and `C` shortcut
- export downloads `.pms.json`, `.md`, or `.csv` from Settings
- import accepts a `.pms.json` and replaces the active bundle
- auto-save runs through the platform storage adapter and is visible via the trust badge

## Testing strategy

- TDD for the shared core: domain rules, command handlers, storage contract, and export/import
- Vitest component tests for `AppShell`, `BoardView`, `BacklogView`, `CommandPalette`
- Playwright e2e for hybrid parity, theme toggle, command palette, project creation, item creation with `C` shortcut, JSON export download, and search
- `npm test` runs unit + component tests; `npm run test:e2e` runs Playwright against the running web dev server

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

## Open follow-on planning

- a deeper roadmap interaction plan (multi-day bars, dependencies, swimlanes)
- a security-first plugin runtime plan before any third-party plugin execution
- a public-internet hosting plan (currently out of MVP scope; only trusted internal hosting is supported)
- a sync-backend plan if richer collaboration is pursued

The current `docs/FullSpec.md` and `docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md` remain the product source of truth. The implementation in this repository implements the MVP slice of that plan.
