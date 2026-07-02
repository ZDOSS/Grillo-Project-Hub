# Grillo Project Hub UI/UX Overhaul Design

## Status

Approved planning direction. This spec defines the full working UI/UX overhaul for Grillo Project Hub. It is not a visual-only refresh. It combines a foundation-first design-system pass, route-by-route migration, and final workflow completion.

## Source Context

This design extends the existing product direction in:

- `docs/specs/03-visual-and-interaction-design-spec.md`
- `docs/specs/04-app-shell-and-core-screen-spec.md`
- `Readme.md`
- `AI.md`

The current implementation is functionally broad, but the UI layer is still mostly global CSS utilities, inline styles, hand-rolled inline SVG icons, and route-local composition. The overhaul should turn that MVP into a cohesive product surface without changing the local-first architecture or validated command model.

## Design Brief

GPH should feel like a polished, calm desktop productivity app for practical software work. It should remain friendly and approachable, but not cute, decorative, enterprise-heavy, or marketing-like.

The approved direction remains:

- warm off-white light theme
- charcoal dark theme with a faint warm or green undertone
- restrained natural green interaction accent
- subtle project identity accents
- balanced default density
- simple outlined icons
- lightly rounded surfaces
- modal-first work-item details
- desktop-first layout with serious responsive behavior
- concise empty states with useful next actions

## Goal

Bring the whole app to one coherent experience by:

1. creating shared UI primitives and interaction contracts,
2. migrating every route and major surface to those primitives,
3. completing the end-to-end workflows that make the app feel trustworthy, and
4. expanding tests so the redesign remains working software.

## Non-Goals

- Do not redesign the core data model.
- Do not introduce a sync backend.
- Do not build third-party plugin execution.
- Do not add a compact density preference in the first overhaul pass.
- Do not replace React Router, Zustand, Vite, Tauri, or the command dispatcher.
- Do not turn the app into a marketing landing page or visual showcase.

## Phase 1: Foundation

### Design Tokens

Extend the token layer in `packages/ui/src/theme/` so every surface can share the same visual language.

Token groups:

- colors: canvas, surface, elevated, muted, overlay, row hover, selected, disabled
- text: primary, secondary, muted, inverse, danger, warning, success
- borders: subtle, strong, focus, selected, danger, warning
- accent: default green, hover, active, soft, contrast
- semantic states: planned, active, completed, canceled, blocked, warning, success, info
- severity and priority: distinct, accessible, non-color-only treatments
- typography: page title, view title, section title, body, control, metadata, code
- spacing: 4/8 rhythm with screen, section, control, row, and dense variants
- shape: 4px, 6px, 8px, 12px, and modal radius values; avoid oversized capsules
- elevation: persistent panel, menu/popover, modal, drag, command palette
- layout: sidebar widths, icon rail width, header height, viewbar height, modal widths
- motion: duration and easing tokens with reduced-motion alternatives

Acceptance:

- light and dark themes use the same semantic token names
- no route defines new foundational colors ad hoc
- project accents can decorate identity but cannot replace the main green interaction language
- focus state is visible in both themes

### Icon Strategy

Replace route-local inline SVG icons with one consistent icon source. `lucide-react` is the preferred package because it matches the simple outlined direction and has broad coverage for productivity controls.

Rules:

- use icons for common button-only tools
- pair icon and text for primary commands when the action needs clarity
- provide accessible names on icon-only buttons
- do not use emoji as UI icons
- avoid decorative SVG art inside working surfaces

### UI Primitives

Create reusable UI components under `packages/ui/src/components/`.

Foundation components:

- `Button`
- `IconButton`
- `TextField`
- `TextareaField`
- `SelectField`
- `CheckboxField`
- `SegmentedControl`
- `Tabs`
- `Toolbar`
- `PageHeader`
- `Surface`
- `Badge`
- `StatusIndicator`
- `EmptyState`
- `InlineAlert`
- `ToastProvider`
- `DataTable`
- `Dialog`
- `Modal`
- `Popover`
- `Menu`

Contracts:

- every component exposes an accessible name path
- every component supports focus-visible styling
- controls expose disabled and loading states where useful
- destructive variants are visually and semantically distinct
- components use tokens, not route-local colors
- components do not bake in project-domain text

### App Primitives

Create app-level primitives for persistent navigation and layout:

- `AppFrame`
- `Sidebar`
- `SidebarLink`
- `ProjectHeader`
- `ProjectViewBar`
- `MobileNavSheet`
- `StorageBadge`
- `SaveStateIndicator`
- `ViewContainer`
- `ViewToolbar`

Shell requirements:

- sidebar supports full, icon rail, and mobile sheet states
- project header shows project identity, storage trust, save state, search, command palette, and new item
- viewbar handles overflow without hiding enabled views
- search and command palette are reachable by pointer and keyboard
- project content receives more visual weight than global chrome

### Work Metadata Primitives

Create shared work-item metadata display components:

- `WorkItemCard`
- `WorkItemRow`
- `ItemTypeMarker`
- `PriorityMarker`
- `SeverityMarker`
- `AssigneePill`
- `LabelGroup`
- `DueDateBadge`
- `ChecklistProgress`
- `CommentCount`
- `ActivityRow`

These components should be used by board, backlog, table, bug triage, my work, search results, roadmap bars, calendar items, and item detail cross-links.

## Phase 2: Surface Migration

### App Shell

Replace the current shell composition in `packages/ui/src/AppShell.tsx` with app primitives.

Expected changes:

- product mark and name become a stable brand block
- workspace navigation and project navigation stop competing visually
- project header includes `New item`, search/commands, theme, storage trust, and save state
- sidebar collapse state is local UI state and not a project setting
- hidden project views still come from `projectSettings.hiddenViewIds`
- mobile uses a slide-over nav and compact view switcher

Acceptance:

- active route is clear in sidebar and viewbar
- storage trust is always visible when a project is open
- no project state provides direct recovery actions
- keyboard users can reach nav, search, command palette, and new item

### Workspace Launcher

Migrate `ProjectsListView`, `OpenProjectView`, and `DemoFolderView` to shared surfaces.

Expected changes:

- workspace page uses one page header and task cards
- new project flow becomes a focused dialog with template, name, accent, and storage path/folder selection
- recent projects have consistent storage badges, open actions, and inline confirmation
- open/import separates folder-backed open from JSON import without making the user parse implementation detail
- canceling folder pick remains a non-error

Acceptance:

- first launch explains where project data will live
- create/open/demo are obvious
- missing/corrupt project states show recovery actions
- desktop and PWA storage language remains precise

### Board

Migrate board, columns, cards, drag feedback, and WIP states.

Expected changes:

- add a board toolbar for quick add, filter, view search, and optional grouping controls
- columns use shared header, count, and WIP indicator components
- cards use `WorkItemCard`
- drop targets show valid, warning, and blocked states
- WIP hard rejection is explicit through inline feedback or toast
- empty board distinguishes no items, filtered-out items, and unconfigured columns

Acceptance:

- drag/drop still routes through `item.moveStatus`
- card click opens the work-item modal
- WIP warnings are visible without relying only on color
- keyboard path exists for moving status, even if it opens a compact move dialog

### Work Item Modal

Replace the current drawer-first `/item/:id` detail with a modal-first editing surface.

Desktop structure:

- wide modal with main content and metadata side column
- sticky header with title, identity, close, duplicate, archive/trash menu
- main column: description, bug report when applicable, checklist, subtasks, relationships, attachments, comments, activity
- metadata column: type, status, priority, severity, assignee, labels, milestone, dates

Small screen structure:

- full-screen modal sheet
- single-column layout
- sticky close and primary action row

Behavior:

- autosave existing field edits through command dispatcher
- preserve route deep-linking for `/item/:id`
- close returns to the previous route when possible
- destructive actions use consistent confirmation UI, not `window.confirm`
- comments support edit/delete without `prompt`

Acceptance:

- item detail feels like a first-class editing surface
- every current drawer capability remains available
- bug fields appear only for applicable bug item types
- focus moves into the modal and returns on close

### Backlog

Migrate to a dense but calm list view.

Expected changes:

- add a view toolbar with filter, sort, status/type filters, and new item
- rows use `WorkItemRow`
- priority editing uses a menu/select control with keyboard access
- add empty and no-match states
- reserve future drag reorder or explicit move controls without changing the data model in this pass

Acceptance:

- backlog remains faster to scan than the board
- row click opens item modal
- inline priority editing remains supported

### Table

Migrate to `DataTable`.

Expected changes:

- sortable headers are real buttons with accessible names
- filter controls use shared toolbar components
- type filter and text filter persist in URL params if useful
- row cells use shared metadata components
- empty/no-match state is not placed inside a full-height table cell with route-local styling

Acceptance:

- sorting, filtering, and item navigation keep current behavior
- table remains horizontally usable on narrow widths

### Docs

Migrate docs into a coherent document workspace.

Expected changes:

- document tree uses shared sidebar/list components
- editor/preview switch uses `Tabs` or `SegmentedControl`
- doc title, save state, updated timestamp, and delete action live in a page header or toolbar
- backlinks use shared link-list styling
- rendered internal links keep router-safe `data-route`
- delete uses shared confirmation UI

Acceptance:

- authoring feels native to the app
- document switch still preserves same-doc draft behavior
- preview links route without full page reload

### Roadmap

Migrate roadmap controls and timeline affordances.

Expected changes:

- view toolbar owns zoom, anchor month, and date help text
- lanes use shared section and empty states
- bars reuse work metadata styling where possible
- invalid date ranges show explicit feedback
- resize handle is visible and keyboard reachable

Acceptance:

- date-only semantics remain intact
- drag/resize stays validated
- dependencies are not silently rescheduled

### Calendar

Migrate calendar controls and month grid.

Expected changes:

- month navigation uses icon buttons with accessible names
- today state is visible without relying only on hue
- item pills use shared item metadata treatments
- dense days handle overflow predictably

Acceptance:

- date placement for start and due dates remains accurate
- month navigation is keyboard operable

### Bug Triage And My Work

Migrate both views to shared work-card/list patterns.

Expected changes:

- bug triage columns use board-like column primitives
- severity uses shared `SeverityMarker`
- My Work member selector uses a menu/select, not a custom ad hoc panel
- empty states distinguish no local member from no assigned work

Acceptance:

- `New bug` still opens create-item prefilled as bug
- selecting local member stays persisted by workspace store

### Search And Command Palette

Migrate global discovery surfaces.

Expected changes:

- search page uses page header, search field, scope toggles, grouped results, and no-query state
- command palette groups commands and search hits visually
- selected command is visible in both themes
- keyboard instructions are discoverable but not noisy

Acceptance:

- command palette remains reachable by `Ctrl/Cmd+K`
- `C` shortcut still opens create item outside text inputs
- search hit navigation stays router-safe

### Settings, Import, Export, And AI Bridge

Reorganize settings around practical user tasks.

Recommended groups:

- General
- Appearance
- Storage and backups
- Project views
- Members
- Workflow
- Labels and milestones
- Custom fields
- Modules and plugins
- Import and export
- AI bridge

Expected changes:

- left-side settings navigation replaces a long horizontal tab strip
- registry rows use shared editable table/list primitives
- all confirmations use the shared confirmation pattern
- import errors use inline alerts instead of `alert`
- plugin trust copy remains clear and risk-aware

Acceptance:

- settings is easier to scan at desktop sizes
- narrow layouts remain usable
- import/export safety remains explicit

## Phase 3: Workflow Completion

After surfaces are migrated, audit these journeys end to end.

### First Launch And Storage

Requirements:

- user can create a project, open a saved project, import JSON, or load demo without confusion
- storage trust state is visible before and after project creation
- browser-local, folder-backed, and unsaved states use consistent language
- canceling folder selection is not treated as an error

### Item Lifecycle

Requirements:

- user can create an item from header, board, bug triage, and command palette
- created item opens in modal
- user can edit core metadata, description, bug data, checklist, comments, subtasks, and dates
- user can archive, trash, duplicate, restore where available, and permanently delete with confirmation

### Planning And Triage

Requirements:

- user can triage from board, backlog, table, bug triage, and my work
- filters and empty states explain whether items do not exist or are hidden by current filters
- drag/drop status changes and WIP rules remain command-backed

### Docs And Knowledge

Requirements:

- user can create docs, switch docs, edit Markdown, preview, route through internal links, and inspect backlinks
- doc delete uses consistent confirmation
- same-doc external updates do not clobber local typing

### Search And Keyboard

Requirements:

- user can navigate and create from command palette
- search page and command palette provide clear result grouping
- primary flows are keyboard-operable

### Settings And Portability

Requirements:

- user can customize views, members, workflow registries, labels, milestones, fields, plugin trust, and theme
- import/export remains safe and understandable
- registry edits keep explicit edit/save/cancel flows

## Phase 4: Verification

### Test Expansion

Required coverage:

- component tests for new primitives
- AppShell tests for sidebar, header, viewbar, storage badge, and mobile nav state
- launcher tests for create/open/recent/delete/cancel states
- board tests for toolbar, WIP feedback, card open, and keyboard move path
- item modal tests for edit, comments, checklist, bug fields, destructive confirmation, and focus
- backlog/table/search tests for filtering, sorting, and item navigation
- docs tests for doc switching, preview routing, backlinks, and delete confirmation
- settings tests for grouped navigation, registry editing, import error handling, and plugin trust
- Playwright e2e for first launch, item lifecycle, docs navigation, search, settings import/export, and responsive smoke paths

### Accessibility Checks

Required checks:

- focus order on shell, modal, command palette, settings, docs, and launcher
- no keyboard traps
- icon-only controls have accessible names
- route headings and landmarks are present
- selected, active, warning, blocked, and disabled states do not rely only on color
- reduced-motion mode removes nonessential transitions
- light and dark contrast meets WCAG 2.2 AA for text and controls

### Build And Quality Gates

Every implementation PR should run:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- targeted component tests for touched surfaces
- `npm run test:e2e` when app shell, routing, launcher, item lifecycle, search, settings, or docs workflows change
- `npm run build:web`
- `npm run build:desktop`

## PR Sequencing

The overhaul should be delivered as multiple working PRs:

1. `ui-foundation`
2. `shell-and-launcher`
3. `board-and-item-modal`
4. `work-management-surfaces`
5. `docs-roadmap-calendar`
6. `settings-search-command-workflows`
7. `final-workflow-a11y-qa`

Each PR must leave the app runnable and tested. Avoid a long-lived branch that only becomes usable at the end.

## Completion Criteria

The overhaul is complete when:

- every listed surface has been migrated to shared primitives
- the work-item detail surface is modal-first
- route-local inline styling is the exception, not the normal composition method
- hand-rolled inline SVGs are replaced by the shared icon strategy
- primary user journeys pass e2e tests
- light and dark themes are both visually coherent
- keyboard operation and focus management are verified
- docs and `AI.md` reflect meaningful architecture or implementation changes from the actual code work
