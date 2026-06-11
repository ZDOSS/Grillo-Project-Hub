# Platform, Storage, And Hosting Research

## Core problem

The app needs to work in at least two modes from the first release:

1. hosted PWA
2. local install / local data ownership

That makes storage, export, file access, and adapter boundaries first-order product decisions.

## Browser storage options

### IndexedDB

IndexedDB is the safest default client-side database choice for a serious PWA.

Why it matters:

- supports significant structured data
- supports transactions
- works broadly
- fits tasks, projects, comments, views, settings, and cached exports

Best use:

- default canonical local app database

### OPFS

The Origin Private File System is attractive for performance-sensitive local storage. MDN describes it as private to the origin, not visible to the user like the regular file system, and faster because it avoids the same permission/security flow as user-visible file writes.

Best use:

- optional storage backend for larger local caches or file-like assets
- implementation detail behind exports, attachments, snapshots, or large offline data

Constraint:

- should enhance the app, not be the only persistence path

### File System Access API

The File System API / File System Access API allows users to choose files or directories through methods like `showOpenFilePicker`, `showSaveFilePicker`, and `showDirectoryPicker`. It requires secure contexts and user permission for normal user-visible file access.

Best use:

- "point this project at a folder"
- export plans to files on disk
- import/export project bundles
- optionally watch or rescan a chosen workspace directory in supported environments

Constraint:

- browser support and permission behavior vary, so the app must degrade gracefully

## Recommended storage strategy

### Baseline

- default database: IndexedDB
- default file export: explicit save/download
- default import: upload / file picker

### Enhancement path

- if File System Access API is available, allow choosing a workspace folder
- if OPFS is available, use it for performance-oriented local file storage and snapshots
- if running inside Tauri/Electron, use native filesystem adapters behind the same storage interface from the first release

### Product rule

The storage layer should expose a stable adapter contract:

- browser database adapter
- browser file system adapter
- desktop file system adapter
- future sync adapter

## GitHub Pages implications

GitHub Pages is a static site hosting service that serves HTML, CSS, and JavaScript from a repository, optionally with a build step.

Meaning for this project:

- no required custom server runtime
- hosted mode should be fully client-side
- local-first data ownership is still philosophically aligned even in a hybrid product
- real-time team sync should be optional and external, not assumed in the default architecture

## Folder-based project model

The user explicitly wants the possibility of installing locally and pointing the tool to a folder.

That can mean two different things:

### Meaning A: app data lives in a chosen folder

Example:

- `/my-project/.pm-suite/project.json`
- attachments, exports, and snapshots stored next to it

Pros:

- transparent ownership
- easy backup
- Git-friendly if formats are text-first

Cons:

- browser support varies
- conflict management becomes important

### Meaning B: app indexes an existing repo/workspace folder

Example:

- scans README, TODO, issue exports, changelog, maybe repo metadata
- stores PM data separately but links to the workspace

Pros:

- lower risk
- easier to support in browser and desktop modes

Cons:

- less fully transparent than storing everything directly inside the project folder

### Recommendation

Use a hybrid day-one model:

- v1 browser/PWA mode: the app stores canonical project data in IndexedDB and can import/export portable project bundles
- v1 desktop mode: the app can store the canonical project file in a chosen folder through a native filesystem adapter
- both modes share the same domain model, export format, and most UI code

## Recommended export formats

### Must support

- JSON project bundle
- Markdown export
- CSV export for issues/tasks

### Strongly recommended

- printable HTML report
- ZIP archive containing metadata plus attachments

### Later

- GitHub Issues/Projects import/export helpers
- Jira CSV import mapping
- Taiga or Kanban-style import mapping

## Security and trust implications

Because the product is open source and hybrid with local-first data ownership, trust will be part of the value proposition.

Rules worth adopting:

- no required account to start
- no hidden network calls in local mode
- explicit import/export boundaries
- clear permission prompts before folder access
- visible status about where the project is stored

## Recommended architecture principle

"Never couple the product model to one storage mechanism."

The app model should not care whether data comes from:

- IndexedDB
- OPFS
- a chosen folder
- a desktop app local file or folder
- a future sync backend

That is the key enabler for modularity and portability.

## Sources

- IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- IndexedDB spec: https://www.w3.org/TR/IndexedDB/
- File System API: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- OPFS: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- GitHub Pages docs: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
