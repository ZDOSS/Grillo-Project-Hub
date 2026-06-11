# Grillo Project Hub Hybrid Day-One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP of a full-featured open source project management system that ships as both a hosted PWA and a packaged desktop app from the first release, with a shared core domain model and modular architecture.

**Architecture:** Use a monorepo with a shared core package for domain types, storage contracts, import/export, and view configuration, plus one web app target and one desktop shell target that reuse the same frontend. Keep the first release fully client-side in the browser and folder-aware on desktop, then layer in advanced modules, integrations, and sync later.

**Tech Stack:** React, TypeScript, Vite, React Router, Zustand, IndexedDB as a browser-local compatibility layer, Tauri, Vitest, Testing Library, Playwright, dnd-kit

---

## Required documentation maintenance

Every meaningful implementation change must update `AI.md` so future contributors and coding agents stay aligned on architecture and current system behavior.

`AI.md` should track:

- stack decisions
- package boundaries
- domain model rules
- member identity rules
- activity/history model rules
- attachment storage rules
- custom-field and plugin-data preservation rules
- storage adapter rules
- platform differences between web and desktop
- extension/plugin constraints
- recent architecture-affecting changes

Plan execution rule:

- if a task changes architecture or behavior in a way that affects how future work should be done, update `AI.md` in the same task or commit

## Testing methodology and delivery standard

Implementation should follow a strong test-first workflow.

Required approach:

- prefer TDD for shared domain logic, command handlers, migrations, storage adapters, and conflict-handling behavior
- add regression tests before or alongside any bug fix that changes behavior
- treat web and desktop as two adapters over one product, and verify parity explicitly rather than assuming it

Minimum testing layers:

- unit tests for core types, validation, commands, and migrations
- contract tests for storage adapters
- component tests for project creation, board/backlog/table interactions, and work-item editing
- end-to-end tests for hybrid parity and key desktop packaging flows

Completion rule:

- no phase is complete until the tests introduced in that phase pass locally
- MVP is not complete until core domain tests, storage contract tests, and parity-critical end-to-end flows are passing

## Scope check

This plan covers one coherent subsystem family: a hybrid day-one project manager with a shared core, browser distribution, and desktop distribution. It is phased so the team can stop at a credible MVP or continue toward a fuller system without re-architecting.

Deployment assumption:

- local packaged installs are the primary real-use path
- the hosted browser build is primarily a demo/try-it path plus lightweight usage path
- any self-hosted use in early phases should be internal-only or otherwise trusted-environment use, not public internet exposure
- team workflows should assume per-machine installs opening the same project format, optionally through shared/internal storage
- collaboration in MVP is shared-file based only; richer live sync should be treated as a separate later subsystem or plugin path

Estimation boundary:

- do not implement time estimates, effort estimates, story points, or capacity estimates as built-in fields or modules
- do not use estimated effort for progress, priority, roadmap placement, or completion semantics
- treat dates as targets or constraints, not effort predictions
- leave generic numeric custom fields available without presenting them as estimation
- consider AI/API cost forecasting only as a later optional experiment with provider/model assumptions, pricing provenance, ranges, confidence, and validation
- do not ship AI/API cost forecasting if it cannot demonstrate decision-useful accuracy

Installed-app first-run assumption:

- open to a blank workspace
- show `New Project`, `Open Project`, and `Demo Folder` immediately
- link or choose folders at the project level after creation/open

## Proposed file structure

### Monorepo root

- `package.json` - workspace scripts
- `pnpm-workspace.yaml` - workspace definition if using pnpm
- `tsconfig.base.json` - shared TypeScript configuration
- `vitest.workspace.ts` - workspace test config
- `playwright.config.ts` - end-to-end configuration
- `README.md` - contributor setup
- `AI.md` - living architecture and agent handoff ledger

### Shared packages

- `packages/core/src/domain/` - domain entities and schemas
- `packages/core/src/storage/` - storage interfaces and adapters
- `packages/core/src/export/` - JSON, Markdown, CSV export logic
- `packages/core/src/import/` - import logic
- `packages/core/src/views/` - saved-view definitions and view capabilities
- `packages/core/src/modules/` - module registration contracts
- `packages/core/src/automation/` - rule contracts
- `packages/core/src/commands/` - validated command surface for UI and AI/MCP automation

Assignment rule for implementers:

- model one assignee per item in MVP
- make `My Work` a saved view over the selected local member
- keep the domain model extensible for later multi-assignee or workload features without forcing that complexity into early implementation

Command-surface rule:

- use one validated command model for both UI actions and AI/MCP integrations
- imports should compose those same commands rather than bypassing them
- search and filtered retrieval should use the same validated command surface so AI/MCP tools can navigate project data safely

Contribution rule for implementers:

- prefer modular, pluggable additions over enlarging the permanent core
- new features should increase practical capability without adding default clutter or workflow ceremony
- if a feature can live as a module, view, integration, or optional capability, prefer that shape first
- preserve plugin-owned data even when a plugin is disabled or absent; absence should hide behavior, not destroy project information

### UI package

- `packages/ui/src/components/` - reusable UI primitives and PM components
- `packages/ui/src/views/board/` - board view
- `packages/ui/src/views/backlog/` - backlog view
- `packages/ui/src/views/table/` - table view
- `packages/ui/src/views/roadmap/` - roadmap view
- `packages/ui/src/views/docs/` - docs view
- `packages/ui/src/work-item/` - work item detail panels

### Web app

- `apps/web/src/app/` - app shell, routing, providers
- `apps/web/src/platform/storage/` - IndexedDB and browser FS adapters
- `apps/web/src/platform/pwa/` - manifest and service worker wiring

### Desktop app

- `apps/desktop/src/` - desktop frontend entry
- `apps/desktop/src-tauri/` - Tauri config and native commands
- `apps/desktop/src/platform/storage/` - desktop folder adapter wiring

### Tests

- `tests/e2e/` - cross-platform and web flows
- `packages/core/src/**/*.test.ts` - unit tests near the shared logic
- `packages/ui/src/**/*.test.tsx` - component tests near the UI

## Delivery phases

### Phase 0: Foundation and shared architecture

Outcome:

- monorepo bootstrapped
- shared core package created
- web and desktop targets can render the same shell

### Phase 1: Data model and storage parity

Outcome:

- project/work-item model stable
- IndexedDB adapter works in web
- browser folder-backed mode is supported where platform APIs allow it
- chosen-folder adapter works on desktop
- shared JSON format works in both
- storage trust status is visible to the user
- external file changes can be detected and surfaced to the user
- periodic folder-backed backups or snapshots can be configured when storage mode allows it

### Phase 2: MVP planning experience

Outcome:

- board
- backlog
- table
- enabled-module views can be added easily from the project UI
- work item detail
- Markdown comments with threads, edit history/diff visibility, and delete behavior
- milestones
- bug workflow
- local full-text search with filters
- session undo/redo for core user actions
- board columns that group statuses, default-drop status behavior, and warning/optional-hard WIP limits
- directly editable roadmap dates, ranges, dependencies, and milestone lanes
- core command palette and essential keyboard shortcuts

### Phase 3: MVP trust and shipping features

Outcome:

- import/export
- Markdown docs with folders/sections, stable links, backlinks, internal embeds, and local search
- themes
- offline/PWA install
- desktop packaging
- storage trust messaging
- hosted web clearly positions local install as the preferred durable adoption path
- installed desktop first-run flow is clear and project-oriented
- project-level archive and trash management, restore, deletion-impact review, and explicit permanent deletion
- bundled and user-created portable templates

### Phase 4: Full-system capabilities

Outcome:

- typed project custom fields plus preserved plugin-owned item data
- simple automation rule builder over a structured trigger/conditions/actions engine
- attachments with metadata in project data and file payloads in a sibling `attachments/` folder for folder-backed projects
- activity history with simple and advanced views over one structured event model
- local-only reminders and in-app notifications
- calendar as a simple date-based visibility view first, with richer scheduling behavior later

### Phase 5: Nice-to-haves and ecosystem growth

Outcome:

- GitHub import/export helpers soon after MVP
- broader migration and export helpers after that
- recurring tasks, beginning with simple recurrence and iterating toward advanced recurrence
- curated and signed plugin loading
- later disabled-by-default unrestricted local plugin mode
- multi-project dashboards
- optional sync backends
- optional evidence-based AI/API cost forecasting experiment only if accuracy and provenance requirements can be met

## Distribution target expectations

The local app should aim to ship through standard user-friendly installation formats rather than developer-only startup flows.

Target expectations:

- Windows installer/executable path
- macOS application bundle / DMG
- Linux packaging such as Debian and RPM where supported by the chosen desktop toolchain

## MVP definition

The MVP for this product is not a toy board. It should already feel like a credible open source project management system:

- create/open projects in browser and desktop
- board, backlog, and table views
- tasks and bugs
- statuses, labels, priorities, milestones
- subtasks and dependencies
- comments and checklists
- docs
- export/import JSON, Markdown, CSV
- dark/light themes
- PWA install
- desktop installer/package

Late-MVP or immediately-after-MVP candidates:

- attachments
- deeper roadmap/timeline behavior
- scripting-style automation on top of the same engine
- richer advanced history tooling on top of the same event log
- GitHub import/export helpers

Shared-file safety included in MVP behavior:

- detect external changes to an open project bundle
- notify the user clearly
- let the user reload from disk and recover pending changes gracefully

Collaboration boundary for MVP:

- support trusted shared-file workflows
- do not build real-time sync, presence, or server-mediated collaboration into the MVP path

## Task 1: Bootstrap the monorepo and shared app shell

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/web/package.json`
- Create: `apps/desktop/package.json`
- Create: `packages/core/package.json`
- Create: `packages/ui/package.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/desktop/src/main.tsx`
- Create: `packages/ui/src/AppShell.tsx`
- Test: `packages/ui/src/AppShell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders the shared product frame", () => {
    render(<AppShell appMode="web" />);
    expect(screen.getByRole("banner", { name: /project management suite/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/ui/src/AppShell.test.tsx`
Expected: FAIL because `AppShell` and workspace wiring do not exist yet.

- [ ] **Step 3: Write minimal workspace and shell implementation**

```json
{
  "name": "pm-suite",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:desktop": "pnpm --filter desktop dev",
    "test": "vitest run"
  }
}
```

```tsx
type AppShellProps = {
  appMode: "web" | "desktop";
};

export function AppShell({ appMode }: AppShellProps) {
  return (
    <div>
      <header aria-label="Grillo Project Hub">
        <h1>Grillo Project Hub</h1>
        <p>{appMode === "desktop" ? "Desktop" : "Web"} mode</p>
      </header>
      <nav aria-label="Primary Navigation">
        <a href="/">Projects</a>
      </nav>
      <main>
        <p>Shared hybrid shell</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/ui/src/AppShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json apps/web apps/desktop packages/core packages/ui
git commit -m "feat: bootstrap hybrid workspace shell"
```

## Task 2: Define the shared domain model and validation layer

**Files:**
- Create: `packages/core/src/domain/project.ts`
- Create: `packages/core/src/domain/work-item.ts`
- Create: `packages/core/src/domain/work-item-type.ts`
- Create: `packages/core/src/domain/work-item-relationship.ts`
- Create: `packages/core/src/domain/workflow.ts`
- Create: `packages/core/src/modules/bugs/severity.ts`
- Create: `packages/core/src/domain/view.ts`
- Create: `packages/core/src/domain/project.test.ts`
- Modify: `packages/core/package.json`

- [ ] **Step 1: Write the failing project model test**

The shared domain tests should also verify hierarchy behavior:

- a work item may reference one parent by `parentId`
- child lists are derived rather than stored separately
- MVP commands reject nesting below one subtask level
- self-parenting, cross-project parenting, and cycles are rejected
- removing `parentId` promotes an item to the project root
- parent archival preserves child items

The shared domain tests should also verify relationship behavior:

- `blocks` is stored once as a directional edge
- `blocked by` is derived from the inverse side of that edge
- `relates to` is stored once as a canonical symmetric edge
- self-links, cross-project links, duplicate links, and blocking cycles are rejected
- relationship queries return the correct perspective for each item

The shared domain tests should also verify record lifecycle behavior:

- archiving preserves stable identity, data, references, and plugin namespaces
- deleting moves a record into canonical project trash rather than destroying it
- restoring returns the same stable record and reconnects preserved references
- project trash serializes and reloads consistently across browser and desktop adapters
- permanent deletion is rejected until reference impact has been inspected and explicit dependent-record choices are supplied
- permanent deletion never silently cascades through children, relationships, comments, attachments, docs references, or plugin data
- minimal history tombstones preserve understandable activity records
- unknown plugin namespaces are preserved or cause a safe block rather than being silently discarded
- UI, import, automation, and MCP/API lifecycle commands share validation

The shared domain tests should also verify duplication and custom-field applicability:

- duplication creates fresh work-item and independently addressable child IDs
- default duplication copies editable fields, checklists, custom fields, and per-item plugin data
- comments, history, reminders, archive state, and trash state are excluded
- relationships and copied attachment payloads are opt-in
- absent plugin data is copied opaquely under the new item ID
- a custom field may apply globally or to selected `typeId` values
- type changes hide inapplicable values without deleting them
- queries distinguish inapplicable fields from applicable fields with no value

The shared domain tests should also verify checklist behavior:

- checklist entries have stable IDs, text, completion state, and deterministic order
- checklist progress is derived correctly
- reorder operations preserve entry identity
- converting an entry atomically creates a subtask and removes the active checklist entry
- conversion preserves completion semantics through the configured initial or completed workflow status
- conversion records enough event data for inspection and undo
- conversion is rejected when the source item is already a subtask under the MVP hierarchy limit

The shared domain tests should also verify workflow behavior:

- statuses have stable IDs and map to `planned`, `active`, `completed`, or `canceled`
- work items store `statusId` rather than duplicating semantic category
- projects declare valid default initial and completed statuses
- progress and completion semantics are derived from status categories
- referenced statuses cannot be removed without an explicit replacement
- archived statuses remain valid for historical items
- UI, automation, import, and MCP status changes share validation

The shared domain tests should also verify priority behavior:

- priorities have stable IDs, customizable names/colors, and unique integer ranks
- higher numeric ranks sort before lower ranks
- null priority sorts below ranked priorities
- work items store `priorityId` rather than visible names or numeric ranks
- archived priorities remain valid for historical items
- referenced priorities require replacement or explicit clearing before removal
- severity and priority remain separate concepts
- UI, automation, import, and MCP priority changes share validation

The shared domain tests should also verify work-item type behavior:

- types have stable IDs, editable display metadata, and deterministic order
- projects declare a valid default type
- items store `typeId` rather than visible names
- optional type default status and priority references are validated
- archived types remain valid for historical items
- referenced types require replacement before removal
- changing type preserves item identity, generic fields, relationships, history, and plugin-owned data
- missing type plugins leave core items readable
- UI, automation, import, and MCP type changes share validation

The shared domain tests should also verify date and reminder behavior:

- planning dates accept canonical `YYYY-MM-DD` values only
- date-only values display unchanged across machine timezones
- inclusive ranges reject `startDate` later than `dueDate`
- system timestamps use full UTC ISO 8601 values
- reminders store stable IDs, exact UTC instants, and valid IANA timezone identifiers
- changing display timezone does not mutate the reminder instant
- UI, automation, import, and MCP commands distinguish dates from timestamps

The bug-module tests should verify severity behavior:

- severity definitions have stable IDs, customizable display metadata, and unique integer ranks
- higher ranks sort before lower ranks and null means unassessed
- applicable item types come from bug-module configuration rather than a hard-coded type name
- severity and priority remain independent
- archived severity definitions remain valid for historical items
- referenced severities require replacement or explicit clearing before removal
- changing type or disabling the bug module preserves severity data
- UI, automation, import, and MCP severity changes share validation

The bug-module tests should also verify report-field behavior:

- reproduction steps have stable IDs and deterministic reorder behavior
- expected behavior, actual behavior, and environment preserve sanitized Markdown
- affected version is optional
- incomplete reports remain valid during triage
- changing to a non-applicable type or disabling the module preserves all report data
- bug fields participate in search, import/export, history, automation, and MCP/API commands

```ts
import { describe, expect, it } from "vitest";
import { createProject, createWorkItem } from "./project";

describe("project domain", () => {
  it("creates a project with default software workflow views", () => {
    const project = createProject({ name: "Demo" });
    const bug = createWorkItem({
      projectId: project.id,
      typeId: "bug",
      title: "Fix login error",
      statusId: "new",
      priorityId: null
    });

    expect(project.name).toBe("Demo");
    expect(project.views.map((view) => view.type)).toEqual(["board", "backlog", "table"]);
    expect(bug.typeId).toBe("bug");
    expect(bug.statusId).toBe("new");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/core/src/domain/project.test.ts`
Expected: FAIL because the domain constructors do not exist yet.

- [ ] **Step 3: Write the minimal domain implementation**

```ts
export type ViewType = "board" | "backlog" | "table" | "docs" | "roadmap";

export function createProject(input: { name: string }) {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    views: [
      { id: crypto.randomUUID(), type: "board" as const, name: "Board" },
      { id: crypto.randomUUID(), type: "backlog" as const, name: "Backlog" },
      { id: crypto.randomUUID(), type: "table" as const, name: "Table" }
    ]
  };
}

export function createWorkItem(input: {
  projectId: string;
  typeId: string;
  title: string;
  statusId: string;
  priorityId: string | null;
}) {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    typeId: input.typeId,
    title: input.title,
    statusId: input.statusId,
    priorityId: input.priorityId,
    labelIds: [],
    milestoneId: null,
    parentId: null,
    startDate: null,
    dueDate: null,
    checklist: [],
    comments: []
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/core/src/domain/project.test.ts`
Expected: PASS

Hierarchy implementation rule:

- keep `parentId` as the only persisted hierarchy edge
- implement traversal and cycle validation so the domain can support deeper trees later
- enforce the one-level MVP limit in validated commands and UI behavior rather than by introducing an incompatible schema

Relationship implementation rule:

- keep relationships in one normalized project-level collection
- do not persist inverse `blockedBy` records or duplicate per-item relationship arrays
- route UI, automation, import, and MCP relationship changes through the same validated commands
- keep the relationship type model extensible for later specialized or plugin-owned link types

Checklist implementation rule:

- keep checklist entries embedded as lightweight work-item data
- do not turn checklist entries into hidden full work items
- route conversion through the validated command/event layer
- apply the same checklist and conversion behavior to UI, automation, import, and MCP callers
- make conversion atomic so failed subtask creation leaves the original entry unchanged

Workflow implementation rule:

- keep status identity separate from stable semantic category
- derive completed, canceled, and active planning behavior through the status definition
- require valid configured initial and completed status IDs
- preserve archived statuses and require explicit replacement when removing referenced statuses
- keep transitions flexible in MVP while routing all changes through validated commands

Priority implementation rule:

- store reusable priority definitions at project level
- store only nullable `priorityId` references on work items
- sort and compare through numeric rank, with higher values first and null last
- preserve archived priority definitions and require explicit replacement or clearing before removal
- keep bug severity independent from priority
- route all priority mutations through validated commands

Work-item type implementation rule:

- store reusable type definitions at project level and only `typeId` on items
- resolve optional type defaults through valid workflow and priority definitions
- have the validated create-item command resolve type defaults before calling the domain constructor
- treat changing type as a non-destructive classification command
- preserve plugin-owned data even when it is not applicable to the newly selected type
- require replacement before removing a referenced type
- keep items readable when a type-contributing plugin is absent
- route all type mutations through validated UI, automation, import, and MCP commands

Date and reminder implementation rule:

- define separate validated domain types for date-only values and UTC timestamps
- serialize planning dates as `YYYY-MM-DD` without timezone conversion
- treat start and due dates as inclusive and validate their order
- store reminders separately with `reminderId`, `remindAt`, and IANA `timeZone`
- keep reminder definitions and target references in project data
- keep notification permission, delivery attempts, and machine-specific dismissal state installation-local
- allow each installation to deliver a shared reminder when local notifications are enabled
- never implement date-only values as UTC-midnight JavaScript dates
- apply identical parsing and validation across web, desktop, import/export, automation, and MCP

Bug severity implementation rule:

- store severity definitions and per-item `severityId` values inside the bug module section
- use unique integer ranks, with higher values representing greater impact
- determine applicability from configured type IDs
- keep severity independent from general priority
- preserve hidden severity values across type changes and module disable/remove/re-enable cycles
- route all severity mutations through validated bug-module commands

Bug report implementation rule:

- store reproduction steps as ordered bug-module records with stable IDs
- store expected behavior, actual behavior, environment, and optional affected version in namespaced bug-module item state
- sanitize Markdown using the same rendering policy as docs and comments
- allow incomplete reports during triage
- preserve hidden report data across type changes and module disable/remove/re-enable cycles
- expose equivalent validated commands to UI, automation, import, and MCP callers

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain packages/core/package.json
git commit -m "feat: add shared project domain model"
```

## Task 3: Implement storage adapters with browser and desktop parity

**Files:**
- Create: `packages/core/src/storage/project-store.ts`
- Create: `apps/web/src/platform/storage/indexeddb-project-store.ts`
- Create: `apps/desktop/src/platform/storage/folder-project-store.ts`
- Create: `packages/core/src/storage/project-store.test.ts`
- Create: `apps/desktop/src-tauri/src/project_store.rs`

- [ ] **Step 1: Write the failing storage contract test**

```ts
import { describe, expect, it } from "vitest";
import { saveProjectBundle, type ProjectStore } from "./project-store";

describe("project storage contract", () => {
  it("saves and reloads a project bundle through the adapter interface", async () => {
    const memory: Record<string, string> = {};
    const store: ProjectStore = {
      async save(key, value) {
        memory[key] = value;
      },
      async load(key) {
        return memory[key] ?? null;
      }
    };

    await saveProjectBundle(store, "demo", { name: "Demo", projects: [] });

    expect(await store.load("demo")).toContain("\"name\":\"Demo\"");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/core/src/storage/project-store.test.ts`
Expected: FAIL because the storage contract does not exist yet.

- [ ] **Step 3: Write the adapter contract and minimal implementations**

```ts
export type ProjectStore = {
  save: (key: string, value: string) => Promise<void>;
  load: (key: string) => Promise<string | null>;
};

export async function saveProjectBundle(store: ProjectStore, key: string, bundle: unknown) {
  await store.save(key, JSON.stringify(bundle));
}
```

```ts
export function createIndexedDbProjectStore(): ProjectStore {
  return {
    async save(key, value) {
      localStorage.setItem(key, value);
    },
    async load(key) {
      return localStorage.getItem(key);
    }
  };
}
```

```ts
export function createFolderProjectStore(bridge: ProjectStore): ProjectStore {
  return bridge;
}
```

```rust
#[tauri::command]
fn save_project(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|err| err.to_string())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/core/src/storage/project-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/storage apps/web/src/platform/storage apps/desktop/src/platform/storage apps/desktop/src-tauri/src/project_store.rs
git commit -m "feat: add hybrid storage adapters"
```

## Task 4: Build project creation, open flow, and seeded templates

**Files:**
- Create: `packages/core/src/templates/software-project.ts`
- Create: `packages/ui/src/projects/NewProjectDialog.tsx`
- Create: `packages/ui/src/projects/OpenProjectDialog.tsx`
- Create: `packages/ui/src/projects/NewProjectDialog.test.tsx`

Template rules for implementers:

- ship bundled starter templates and support user-created templates
- allow user templates to be renamed, duplicated, archived, imported, and exported
- exclude history, trash, comments, and machine-local settings from template exports by default
- make starter items, docs, automations, attachments, and plugin configuration explicit inclusion choices
- validate imported templates before project creation
- Modify: `packages/ui/src/AppShell.tsx`

- [ ] **Step 1: Write the failing project creation test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NewProjectDialog } from "./NewProjectDialog";

describe("NewProjectDialog", () => {
  it("creates a software project template", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];

    render(<NewProjectDialog onCreate={(project) => calls.push(project.name)} />);
    await user.type(screen.getByLabelText(/project name/i), "Launch Pad");
    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(calls).toEqual(["Launch Pad"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/ui/src/projects/NewProjectDialog.test.tsx`
Expected: FAIL because the dialog and template do not exist yet.

- [ ] **Step 3: Write the minimal creation flow**

```tsx
import { useState } from "react";

export function NewProjectDialog({ onCreate }: { onCreate: (project: { name: string }) => void }) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({ name });
      }}
    >
      <label>
        Project Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="submit">Create Project</button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/ui/src/projects/NewProjectDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/templates packages/ui/src/projects packages/ui/src/AppShell.tsx
git commit -m "feat: add project creation and opening flows"
```

## Task 5: Deliver the board view and work item detail editor

**Files:**
- Create: `packages/ui/src/views/board/BoardView.tsx`
- Create: `packages/ui/src/work-item/WorkItemDrawer.tsx`
- Create: `packages/ui/src/views/board/BoardView.test.tsx`
- Modify: `packages/core/src/domain/work-item.ts`

Board rules for implementers:

- columns group one or more workflow status IDs
- each column declares one default drop status
- one status maps to at most one column in a board
- WIP limits warn by default and may hard-block moves when configured
- UI, automation, import, and MCP/API moves share workflow and WIP validation

- [ ] **Step 1: Write the failing board view test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardView } from "./BoardView";

describe("BoardView", () => {
  it("groups cards by status column", () => {
    render(
      <BoardView
        items={[
          { id: "1", title: "Fix auth bug", statusId: "new" },
          { id: "2", title: "Ship docs", statusId: "ready" }
        ]}
        columns={[
          {
            id: "triage",
            name: "Triage",
            statusIds: ["new", "ready"],
            defaultDropStatusId: "ready",
            wipLimit: 5,
            wipMode: "warn"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /triage/i })).toBeInTheDocument();
    expect(screen.getByText(/fix auth bug/i)).toBeInTheDocument();
    expect(screen.getByText(/ship docs/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/ui/src/views/board/BoardView.test.tsx`
Expected: FAIL because `BoardView` does not exist yet.

- [ ] **Step 3: Write the minimal board implementation**

```tsx
type Item = { id: string; title: string; statusId: string };
type BoardColumn = {
  id: string;
  name: string;
  statusIds: string[];
  defaultDropStatusId: string;
  wipLimit?: number;
  wipMode?: "warn" | "hard";
};

export function BoardView({ items, columns }: { items: Item[]; columns: BoardColumn[] }) {
  return (
    <section aria-label="Board View">
      {columns.map((column) => (
        <div key={column.id}>
          <h2>{column.name}</h2>
          <ul>
            {items
              .filter((item) => column.statusIds.includes(item.statusId))
              .map((item) => <li key={item.id}>{item.title}</li>)}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/ui/src/views/board/BoardView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/board packages/ui/src/work-item packages/core/src/domain/work-item.ts
git commit -m "feat: add kanban board and work item editor"
```

## Task 6: Deliver backlog, table, milestones, roadmap, and bug-triage workflows

**Files:**
- Create: `packages/ui/src/views/backlog/BacklogView.tsx`
- Create: `packages/ui/src/views/table/TableView.tsx`
- Create: `packages/ui/src/views/bugs/BugTriageView.tsx`
- Create: `packages/ui/src/views/roadmap/RoadmapView.tsx`
- Create: `packages/ui/src/views/roadmap/RoadmapView.test.tsx`
- Create: `packages/core/src/domain/milestone.ts`
- Create: `packages/ui/src/views/backlog/BacklogView.test.tsx`

Milestone rule for implementers:

- model milestones as lightweight planning containers in MVP
- support simple milestone metadata and progress reporting first
- keep release-note generation and richer release workflow semantics as later layers rather than MVP requirements

Roadmap rules for implementers:

- support drag and resize editing of date-only item ranges
- support validated moves between milestone lanes
- show dependency lines and constraint conflicts
- do not silently cascade date changes into dependent items
- use the shared date, milestone, relationship, automation, and MCP/API command paths

- [ ] **Step 1: Write the failing backlog test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BacklogView } from "./BacklogView";

describe("BacklogView", () => {
  it("renders items in priority order", () => {
    render(
      <BacklogView
        items={[
          { id: "2", title: "Later task", priorityId: "low" },
          { id: "1", title: "Urgent bug", priorityId: "urgent" },
          { id: "3", title: "Unranked note", priorityId: null }
        ]}
        priorities={[
          { id: "low", name: "Low", rank: 100 },
          { id: "urgent", name: "Urgent", rank: 400 }
        ]}
      />
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Urgent bug");
    expect(rows[2]).toHaveTextContent("Unranked note");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/ui/src/views/backlog/BacklogView.test.tsx`
Expected: FAIL because `BacklogView` does not exist yet.

- [ ] **Step 3: Write the minimal MVP list and bug workflow views**

```tsx
type Priority = { id: string; name: string; rank: number };
type Item = { id: string; title: string; priorityId: string | null };

export function BacklogView({ items, priorities }: { items: Item[]; priorities: Priority[] }) {
  const rankById = new Map(priorities.map((priority) => [priority.id, priority.rank]));
  const rankOf = (item: Item) =>
    item.priorityId === null ? Number.NEGATIVE_INFINITY : (rankById.get(item.priorityId) ?? Number.NEGATIVE_INFINITY);
  const sorted = [...items].sort((a, b) => rankOf(b) - rankOf(a));
  return (
    <ul aria-label="Backlog View">
      {sorted.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/ui/src/views/backlog/BacklogView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/backlog packages/ui/src/views/table packages/ui/src/views/bugs packages/ui/src/views/roadmap packages/core/src/domain/milestone.ts
git commit -m "feat: add backlog table milestones roadmap and bug triage"
```

## Task 7: Add docs, export/import, themes, and offline support

**Files:**
- Create: `packages/ui/src/views/docs/DocsView.tsx`
- Create: `packages/core/src/domain/document.ts`
- Create: `packages/core/src/domain/document-links.ts`
- Create: `packages/core/src/domain/document.test.ts`
- Create: `packages/ui/src/views/docs/DocsView.test.tsx`
- Create: `packages/core/src/export/export-project.ts`
- Create: `packages/core/src/import/import-project.ts`
- Create: `apps/web/src/platform/pwa/manifest.webmanifest`
- Create: `apps/web/src/platform/pwa/register-sw.ts`
- Create: `packages/ui/src/theme/theme-provider.tsx`
- Create: `packages/ui/src/commands/command-registry.ts`
- Create: `packages/ui/src/commands/CommandPalette.tsx`
- Create: `packages/ui/src/commands/CommandPalette.test.tsx`
- Create: `packages/core/src/export/export-project.test.ts`

Docs rule for implementers:

- store documents with stable IDs so folders, titles, and paths can change without breaking links
- derive backlinks from document links rather than storing a second editable backlink list
- support structured embeds for project docs, work items, and attachments
- sanitize rendered Markdown and do not execute arbitrary document HTML or scripts
- include documents and their relationships in native import/export and local search

Command palette rules for implementers:

- cover navigation, item creation, project search, view switching, and common item actions
- keep shortcut bindings discoverable and configurable later
- let modules register commands through one stable registry
- execute mutations through shared validated commands rather than palette-specific handlers

- [ ] **Step 1: Write failing document-link and export tests**

The document-domain test should verify:

- documents retain stable IDs when renamed or moved
- links resolve by document or item ID
- backlinks are derived from outgoing links
- structured internal embeds are parsed without enabling executable HTML
- folders organize documents without becoming their identity

```ts
import { describe, expect, it } from "vitest";
import { exportProjectJson, exportProjectMarkdown } from "./export-project";

describe("project export", () => {
  it("exports both JSON and Markdown representations", () => {
    const project = { name: "Demo", items: [{ title: "Fix login" }] };

    expect(exportProjectJson(project)).toContain("\"name\":\"Demo\"");
    expect(exportProjectMarkdown(project)).toContain("# Demo");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/core/src/domain/document.test.ts packages/core/src/export/export-project.test.ts`
Expected: FAIL because the document domain, link index, and export helpers do not exist yet.

- [ ] **Step 3: Implement the document domain, docs view, export/theme, and PWA behavior**

Implementation requirements:

- create the stable document schema and folder/section references
- parse stable internal document and work-item links
- derive backlinks through the document-link index
- render sanitized Markdown and structured internal embeds
- expose docs through the shared search system
- include document content and relationships in native export/import
- add component coverage for navigation, backlinks, and embeds

```ts
export function exportProjectJson(project: unknown) {
  return JSON.stringify(project);
}

export function exportProjectMarkdown(project: { name: string; items: Array<{ title: string }> }) {
  return `# ${project.name}\n\n${project.items.map((item) => `- ${item.title}`).join("\n")}`;
}
```

```tsx
import { createContext, useContext, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: (_theme: string) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("system");
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 4: Run document, docs-view, and export tests**

Run: `pnpm vitest packages/core/src/domain/document.test.ts packages/ui/src/views/docs/DocsView.test.tsx packages/core/src/export/export-project.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/docs packages/core/src/domain packages/core/src/export packages/core/src/import apps/web/src/platform/pwa packages/ui/src/theme
git commit -m "feat: add docs export themes and offline support"
```

## Task 8: Package the desktop app and verify hybrid parity

**Files:**
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `tests/e2e/hybrid-parity.spec.ts`
- Modify: `apps/desktop/package.json`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing hybrid parity test**

```ts
import { test, expect } from "@playwright/test";

test("web and desktop share the same project shell labels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Grillo Project Hub" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary Navigation" })).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/hybrid-parity.spec.ts`
Expected: FAIL because the app routes and test setup are not fully wired yet.

- [ ] **Step 3: Write the minimal desktop packaging configuration**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Grillo Project Hub",
  "identifier": "com.opensource.pmsuite",
  "build": {
    "beforeDevCommand": "pnpm --filter desktop dev",
    "beforeBuildCommand": "pnpm --filter desktop build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Grillo Project Hub",
        "width": 1400,
        "height": 900
      }
    ]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS for unit tests and at least initial parity smoke coverage; end-to-end browser smoke test passes after route wiring is complete.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri/tauri.conf.json tests/e2e/hybrid-parity.spec.ts apps/desktop/package.json apps/web/package.json
git commit -m "feat: package hybrid desktop release"
```

## Post-MVP phases

### Phase 4: Full-featured open source system

- custom fields and saved view builder
- attachments with desktop and browser-aware storage, sanitized image/text/PDF previews, and external opening for unsupported types
- automation rules
- activity history and undo-safe change logging

### Phase 5: Nice-to-haves

- recurring tasks
- calendar view
- GitHub and Jira import helpers
- release-note generation
- multi-project dashboard
- curated and signed plugin loader with package integrity and permission review

### Phase 6: Ecosystem and scale

- optional sync backend adapters
- collaboration model
- plugin registry or marketplace
- explicit disabled-by-default unrestricted local plugin mode, potentially desktop-only
- richer analytics/reporting

### Phase 7: Local AI and automation integrations

- local command-oriented automation bridge
- MCP-friendly integration surface
- documented permissions and validation rules
- Settings-based setup surface with install/run guidance
- copyable MCP/LLM config snippet generation
- command parity for normal user actions such as board movement, ordering, workflow updates, and view configuration

## Suggested milestone sequence

1. Hybrid shell and monorepo
2. Shared domain model
3. Storage parity across web and desktop
4. Core project creation/open flows
5. Board plus work item editing
6. Backlog, table, milestones, bug triage
7. Docs, exports, themes, PWA
8. Desktop packaging and parity verification

## Verification checklist

- web and desktop share one domain model
- desktop can open a chosen folder
- browser can create and persist a project locally
- storage trust status is understandable to the user
- MVP views all work over the same data model
- exports preserve project identity and metadata
- PWA install works
- desktop package launches
- dark/light themes persist
- `AI.md` stays current with meaningful architecture and workflow changes
- built-in systems respect module boundaries that support later add/remove flexibility
- external file changes are detected and handled without silent overwrite
- board status grouping and WIP behavior are consistent across every command caller
- roadmap drag edits preserve date-only values and never silently cascade dependencies
- item duplication and template exports exclude history and comments by default
- attachment previews never execute active or unknown content
- plugin trust settings distinguish first-party, curated/signed, and unrestricted modes

## Notes for follow-on planning

- Write a dedicated roadmap interaction plan before implementing drag, resize, milestone-lane movement, and dependency visualization.
- If the team wants multi-user sync, write a separate backend/sync plan rather than folding it into the MVP build.
- Before curated/signed or unrestricted third-party execution, write a separate security-first plugin runtime plan covering signatures, permissions, trust modes, platform limits, and recovery.
- Keep a dedicated pending UI-planning pass on the roadmap so the interaction model and dark/light system are designed intentionally before implementation.
- If the team ever wants public internet-facing hosting, treat that as a separate security/product planning track rather than an implicit extension of the current plan.
