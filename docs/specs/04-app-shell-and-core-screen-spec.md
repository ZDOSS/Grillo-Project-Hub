# Grillo Project Hub App Shell and Core Screen Spec

## Purpose

This document translates the product and visual decisions into a practical screen-by-screen build spec for Grillo Project Hub (GPH).

It defines:

- the app shell
- first-launch behavior
- project-opening flows
- primary screens
- key interaction patterns
- responsive posture
- screen-level priorities for implementation

It should be read alongside:

- `docs/specs/01-product-spec.md`
- `docs/specs/02-extension-and-module-spec.md`
- `docs/specs/03-visual-and-interaction-design-spec.md`

## Core UX goals

The product should let a new user do three things quickly:

1. understand where their project lives
2. see and organize work without setup fatigue
3. open an item and immediately understand what to do next

The shell should feel:

- calm
- practical
- transparent
- desktop-capable
- friendly without being cute

## Global shell structure

When a project is open, the application shell has five persistent regions:

1. left sidebar
2. project header
3. project view bar
4. main content canvas
5. layered surfaces such as dialogs, modals, drawers, menus, and the command palette

### Left sidebar

The sidebar is primarily for workspace and project-level context. It may also provide persistent shortcuts to enabled built-in views, while the project view bar remains the primary switcher and owns saved-view and add-view affordances.

Expected contents:

- GPH product mark and app name
- current workspace or project switcher
- recent projects or quick project access
- workspace-level actions such as `New Project`, `Open Project`, and `Demo Folder`
- secondary destinations such as `Trash`, `Settings`, and later `Templates`
- optional saved-view shortcuts once those exist

Sidebar behavior:

- desktop supports full width, icon rail, and temporary overlay states
- the collapsed icon rail must preserve recognizability for primary destinations
- sidebar view shortcuts and the view bar share one navigation registry and hidden-view configuration so they cannot drift
- view switching remains primarily a project-view-bar action

### Project header

The project header is the operational strip above the active view.

Expected contents:

- project name
- optional project accent treatment
- storage trust badge such as `Folder-backed`, `Browser-local`, or `Unsaved`
- save or sync state messaging
- global project search entry point
- command palette trigger
- high-value actions such as `New Item`
- overflow actions for import/export/share-like operations

Header behavior:

- keep height restrained
- keep trust and save-state messaging visible but quiet
- do not bury storage state in a settings page

### Project view bar

The project view bar switches between active project views.

Expected default entries:

- `Board`
- `Backlog`
- `Table`

Enabled-but-not-instantiated views:

- `Docs`
- `Roadmap`
- `Calendar`

View bar rules:

- built-in and plugin-added views use the same visual treatment
- active view is obvious without overwhelming color
- overflowing views remain accessible through scrolling or a compact overflow pattern
- `Add View` is always visible and understandable

### Main content canvas

The main content canvas belongs to the active view and should receive most of the visual attention.

Rules:

- avoid excessive nested containers
- give dense views room to breathe through spacing, not decoration
- preserve continuity between views so the app feels like one system

## First launch and workspace flows

### Blank workspace state

The installed app opens to a blank workspace, then immediately presents a centered modal with:

- `New Project`
- `Open Project`
- `Demo Folder`

Supporting copy should be brief and confidence-building. It should explain that the user can create a new project, open an existing project bundle or folder-backed project, or explore a sample project.

The background shell may already be visible, but it should feel inactive until the modal is resolved.

### New project flow

The new project flow should feel short and trustworthy.

Recommended steps:

1. choose a project template
2. enter project name
3. optionally choose project accent color
4. create project
5. choose or link the project folder

The app should avoid asking low-value setup questions before the user can see the project.

### Open project flow

The open flow should clearly support:

- a canonical `project.pms.json` bundle
- a folder-backed project root
- recent projects

The UI should make it obvious whether the user is opening:

- a recent trusted location
- a file bundle
- a folder-backed workspace

### Demo folder flow

The demo project should open as a realistic, friendly sample rather than a toy showcase.

It should demonstrate:

- board flow
- a few bugs
- a few docs
- milestones
- comments
- the storage badge and project structure

## Primary screens

### Board

The board is the emotional center of the app.

Layout:

- horizontal columns
- clear column headers
- card count per column
- WIP limit state when configured
- board toolbar above the columns

Board toolbar:

- filter button
- search within current view
- grouping or swimlane controls when enabled
- quick add item
- optional status or assignee filter chips

Column header contents:

- column name
- mapped status summary where useful
- item count
- WIP indicator
- optional overflow menu

Card contents should favor scan speed:

- title
- type marker
- status if useful
- priority or severity cue when relevant
- assignee marker if set
- due date when relevant
- checklist or comment indicators when relevant

Board behavior:

- dragging to a column updates status through the shared validated command system
- columns may group multiple statuses
- each column uses its default drop status when needed
- warning WIP states should feel visible but not punitive
- hard WIP rejection must be explicit and understandable

Empty-board behavior:

- explain whether there are no items, no items matching filters, or no columns instantiated yet
- offer the next meaningful action directly

### Work-item modal

The work-item modal is the default item-detail surface and must be strong enough that the product does not feel like a board with a weak popup.

Desktop structure:

- a modal large enough for serious editing
- main content column for title, description, checklists, reproduction, docs links, and comments
- secondary metadata column or section for type, status, priority, severity, assignee, labels, milestone, dates, and relationships

Small-screen structure:

- single-column stacked layout
- sticky close and save affordances where helpful

Recommended modal sections:

1. title and quick identity controls
2. description
3. structured fields
4. checklist and subtasks
5. relationships and dependencies
6. attachments
7. comments and threads
8. activity and history

Modal expectations:

- opening an item preserves awareness of the underlying view
- comments, edit history, and deletion behavior are first-class
- bug fields appear only when applicable
- plugin-owned data may add sections without breaking the core structure
- wide modal sections should still feel orderly, not like a long settings page

### Backlog

The backlog is for intake, grooming, and sequencing.

Layout:

- vertically ordered list
- denser than the board
- toolbar with filtering, sorting, and batch actions

Each row should show:

- title
- type
- priority
- status
- assignee
- milestone
- key dates when relevant

Backlog behavior:

- reorder by drag handle or explicit move controls
- batch-edit selected items
- quickly convert or retype items where allowed
- move items into milestones or active execution states

### Table

The table is the dense management surface.

Layout:

- spreadsheet-like grid without pretending to be a spreadsheet app
- sticky header row
- configurable visible columns
- consistent row height and truncation rules

Core expectations:

- strong sorting
- grouping
- filtering
- bulk selection
- inline edits where safe
- access to full item modal from any row

The table should feel disciplined and readable rather than overloaded with controls in every cell.

### Docs

Docs should feel like a real part of the project, not a bolted-on wiki tab.

Desktop layout:

- document tree or folder column
- document editor or reader pane
- optional context pane for backlinks or linked work

Core capabilities in the screen:

- create document
- organize by folder or section
- search documents locally
- link documents to work items
- see backlinks
- embed internal project content

Docs behavior:

- titles and folders may change without breaking links
- document tree should support calm organization, not over-ornamented knowledge-graph theatrics
- authoring surface remains ordinary Markdown

### Roadmap

The roadmap is a planning clarity tool, not the main worldview.

Desktop layout:

- horizontal time axis
- milestone lanes
- date bars for items
- dependency lines
- zoom control

Core interactions:

- drag bars to move dates
- resize bars to edit date ranges
- move items between milestone lanes
- inspect dependency constraints

Roadmap behavior:

- preserve date-only semantics
- reject invalid ranges clearly
- do not silently auto-reschedule dependent work
- visually subordinate this view compared with board and backlog in the overall product hierarchy

### Calendar

The calendar is the lightweight date visibility surface.

Layout:

- month and agenda-oriented views are sufficient for MVP
- date-based item placement from `startDate`, `dueDate`, and milestone targets where appropriate

Behavior:

- focus on visibility and planning
- keep the UI simpler than the roadmap
- avoid turning calendar into a full scheduling system in MVP

### Bug triage mode

Bug handling may appear as:

- a saved board configuration
- a backlog or table filter preset
- a dedicated bug-focused view

Regardless of form, the UI must make bug tracking feel intentional.

Bug triage should emphasize:

- severity
- priority
- structured reproduction fields
- relevant workflow states
- quick sorting and filtering

## Global utility surfaces

### Search

Search is a core product surface, not an advanced feature.

Search should support:

- project-wide full-text search
- filters across items, docs, comments, and labels
- structured result grouping
- clear empty and no-match states

Results should make it obvious whether a match came from:

- item title
- item body
- comment
- document
- label

### Command palette

The command palette is the keyboard power layer for the whole app.

It should support:

- navigation
- item creation
- view switching
- project search
- quick actions on the current context

The palette should feel fast, restrained, and useful from day one rather than trying to imitate an IDE command system in full.

### Trash

Trash is a first-class trust screen.

It should show:

- trashed records
- type
- deletion timestamp
- who or what performed the action when known
- restore action
- permanent delete action
- impact review before permanent deletion

The trash screen should reinforce that deletion is deliberate and recoverable until explicitly purged.

### Settings

Settings should be organized by practical user tasks rather than technical categories alone.

Recommended groups:

- General
- Appearance
- Storage and Backups
- Project
- Members
- Modules and Plugins
- Automation
- AI and MCP
- Import and Export

Settings requirements:

- explain trust-sensitive features clearly
- make plugin trust modes understandable
- keep local-first storage language plain
- avoid overwhelming new users with advanced options on first exposure

## Cross-screen behavior rules

### Save and trust states

Every core screen should preserve awareness of:

- whether the project is folder-backed, browser-local, or unsaved
- whether local edits are saved
- whether the on-disk file changed externally

These states should remain visible in the shell rather than hidden inside transient toasts only.

### Filters and saved views

Filters should behave consistently across board, backlog, table, roadmap, calendar, and bug-focused flows.

Saved views should eventually feel like named working contexts, not just filter snapshots.

### Comments and activity

Comments and history must feel native to the item experience.

The UI should support:

- Markdown comments
- threads
- edited-state visibility
- diff/history visibility
- delete behavior that preserves discussion integrity

### Empty states

Every primary screen should distinguish between:

- truly empty project
- empty because of filters
- empty because a view exists but is not configured yet

Each empty state should offer one or two meaningful actions.

## Responsive implementation posture

Desktop is the reference layout, but smaller screens must still be intentional.

Guidance:

- keep board, table, and roadmap horizontally scrollable when needed
- collapse the sidebar into slide-over behavior
- keep the view switcher compact but visible
- use the modal or full-screen pattern thoughtfully for item details
- prioritize reading, triage, capture, and editing over showing every desktop control at once

## MVP build priority from a screen perspective

Recommended implementation order:

1. blank workspace and first-launch modal
2. new/open/demo flows
3. app shell
4. board
5. work-item modal
6. backlog
7. table
8. search and command palette
9. docs
10. roadmap
11. calendar
12. trash and settings polish

## What this spec intentionally does not lock

This document does not freeze:

- exact typeface names
- exact token values
- exact sidebar widths
- exact icon set
- exact illustration treatment

Those should follow the visual-system spec without contradicting the screen behavior defined here.
