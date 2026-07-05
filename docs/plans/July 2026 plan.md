# July 2026 Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Grillo Project Hub from broad MVP to a deeper, competitor-aware product by surfacing existing domain power, adding stronger planning workflows, and keeping the local-first product direction intact.

**Architecture:** Work in small PRs that each leave the app runnable and tested. Keep React Router, Zustand, Vite, Tauri, and the validated `@gph/core` command dispatcher. Prefer product-depth work that unlocks existing domain concepts before adding brand-new subsystems.

**Tech Stack:** React 18, TypeScript, React Router 6, Zustand, Vite 5, Tauri 2, Vitest, Testing Library, Playwright, CSS custom properties, `lucide-react`.

---

## Delivery Rule

Do not open a PR that contains only this plan. The first PR in this roadmap must include this document plus the first working product-depth slice.

That first slice is:

- split work-item modal implementation away from the legacy drawer wrapper
- remove remaining native `confirm()` and `prompt()` usage from item detail
- add real relationship management in the work-item modal
- add focused tests for those behaviors
- update `AI.md` and `Readme.md` if the implementation changes user-facing behavior or contributor architecture

## Product Direction

GPH should become a calm, local-first project workbench for practical software work. It should not compete by becoming a full Jira clone or a broad ClickUp-style "everything app." The strongest positioning remains:

- lighter than Jira
- more structured than Trello
- more software-work-aware than a generic kanban board
- more local-first and exportable than SaaS-first products
- modular enough to grow without turning the default experience into an admin maze

## Current App Assessment

The codebase has a strong core and a thinner UI surface.

Strengths already present:

- shared project bundle and validated command dispatcher
- web and desktop shells over one shared UI package
- board, backlog, table, docs, roadmap, calendar, bug triage, my work, search, and settings routes
- local-first storage posture with browser-local and folder-backed adapters
- commands and domain shape for relationships, reminders, attachments, custom fields, events, trash, and automation-shaped rules
- shared UI primitives started under `packages/ui/src/components/`

Product gaps to address:

- work-item detail is still partly drawer-era code, with `WorkItemModal` exporting from `WorkItemDrawer`
- item detail still uses native `confirm()` and `prompt()`
- relationships, attachments, reminders, and custom fields exist more in the core than in the user experience
- there is no first-class project overview/dashboard
- saved views are not yet mature working contexts
- bug triage is a thin lane view rather than a true intake workflow
- automation exists as a core model but not as a visible rule builder
- docs need organization, templates, and stronger task linkage
- settings is overloaded and should be decomposed before more configuration is added
- the AI bridge panel currently contains placeholder installation copy

## Competitor Parity Themes

Borrow only the parts that fit GPH's direction.

From GitHub Projects:

- custom views across table, board, and roadmap
- filters, sorting, grouping, fields, charts, templates, and automations
- project status updates and shareable working contexts

From Linear:

- project overviews with progress, docs, milestones, and status
- fast issue creation and keyboard-led workflows
- triage as a real intake lane with accept, decline, duplicate, snooze, and ownership actions
- custom views attached to projects

From ClickUp:

- many ways to view one work model
- docs linked to tasks
- dashboards and rollups
- reminders, recurring work, templates, automations, and AI context

From OpenProject:

- Gantt/timeline clarity
- dependencies, milestones, date alerts, attachments, activity, and project dashboards
- workflow customization without hiding the basic work list

From Kanboard:

- simple boards can still be powerful
- WIP limits, search/filtering, attachments, comments, automated actions, and plugins matter
- user trust improves when the interface stays direct

## Priority Order

### 1. Product Depth Pass

Purpose:

Surface capabilities that are already present in `@gph/core` so the app feels less plain and more complete without changing the architecture.

Build in this order:

1. Work-item modal foundation and relationship management
2. Attachments and reminders in item detail
3. Trash and deletion-impact review
4. Activity/history improvements
5. Custom fields in item detail and table/backlog surfaces

Outcome:

The work item becomes the app's serious editing surface, not a card detail form with some extra fields.

### 2. Planning Parity Pass

Purpose:

Turn routes into user-shaped working contexts instead of fixed screens.

Build in this order:

1. Saved views and consistent filter model
2. Backlog and table upgrades
3. Roadmap and milestone improvements
4. Calendar/agenda improvements

Outcome:

Users can create named working contexts such as "Current release", "Blocked work", "My bugs", "Docs needing review", or "Next milestone" and move between them confidently.

### 3. Workflow Intelligence Pass

Purpose:

Add leverage without adding enterprise ceremony.

Build in this order:

1. Bug intake and triage workflow
2. Automation rule builder
3. Project overview/dashboard
4. Docs knowledge-system pass
5. AI bridge truth-in-UI and command coverage plan

Outcome:

GPH starts to feel like a work system that helps users decide what to do next.

### 4. Polish, Packaging, And Trust Pass

Purpose:

Make the app feel durable and ready for real use.

Build in this order:

1. Settings decomposition
2. Mobile/responsive navigation completion
3. Accessibility and keyboard workflow pass
4. Import/export and template polish
5. Desktop packaging confidence and release notes

Outcome:

The product becomes easier to evaluate, adopt, and trust.

## PR Sequence

### PR 1: July Plan And Work-Item Modal Foundation

**Intent:** Ship this plan with the first real product-depth improvement.

**Files:**

- Create: `docs/plans/July 2026 plan.md`
- Modify: `docs/INDEX.md`
- Modify: `packages/ui/src/work-item/WorkItemModal.tsx`
- Modify: `packages/ui/src/work-item/WorkItemDrawer.tsx`
- Modify: `packages/ui/src/work-item/index.ts`
- Modify: `packages/ui/src/work-item/WorkItemModal.test.tsx`
- Modify: `packages/ui/src/theme/global.css`
- Modify if behavior changes: `AI.md`
- Modify if user-facing feature list changes: `Readme.md`

- [ ] **Step 1: Keep the plan in the implementation PR**

Verify this plan file is present on the feature branch but do not open a PR until the code steps below are complete.

Run:

```bash
git status --short
```

Expected: this plan is staged or unstaged alongside implementation changes before PR creation.

- [ ] **Step 2: Add a regression test that item detail does not use native prompts**

Update `packages/ui/src/work-item/WorkItemModal.test.tsx` with coverage that opens an item, clicks comment edit, and sees an in-app editing control rather than relying on `window.prompt`.

Expected behavior:

- `window.prompt` is not called
- comment body can be edited in a visible textarea or input
- save routes through the existing `comment.edit` command path

- [ ] **Step 3: Add a regression test that destructive item actions use app confirmation**

Update `packages/ui/src/work-item/WorkItemModal.test.tsx` with coverage that clicks permanent delete and sees a `ConfirmDialog`.

Expected behavior:

- `window.confirm` is not called
- the dialog includes the item title or a clear destructive-action message
- cancel closes the dialog without deleting
- confirm dispatches `item.permanentlyDelete`

- [ ] **Step 4: Move the modal implementation into `WorkItemModal.tsx`**

Replace the current re-export in `packages/ui/src/work-item/WorkItemModal.tsx` with the actual modal implementation.

Keep `packages/ui/src/work-item/WorkItemDrawer.tsx` only as a temporary compatibility wrapper:

```tsx
export { WorkItemModal as WorkItemDrawer } from "./WorkItemModal";
```

Expected behavior:

- `ProjectRouter` continues to render `WorkItemModal`
- imports from `./work-item` continue to resolve
- no route depends on drawer-era component internals

- [ ] **Step 5: Replace native comment edit with inline edit state**

Implement local edit state inside the comment section:

- click `Edit` enters edit mode for one comment
- body appears in a textarea
- `Save` dispatches `comment.edit`
- `Cancel` restores read-only mode
- empty edits are rejected with inline feedback

Use existing shared primitives where practical.

- [ ] **Step 6: Replace native permanent-delete confirmation**

Implement a local pending-action state:

```ts
type PendingAction =
  | { type: "permanent-delete" }
  | { type: "archive" }
  | { type: "trash" }
  | { type: "comment-delete"; commentId: string }
  | null;
```

Use `ConfirmDialog` for destructive actions. Keep archive/trash confirmation only if the copy makes the action clearer; permanent delete must always require explicit confirmation.

- [ ] **Step 7: Add relationship management to item detail**

Add a `Relationships` section to the work-item modal.

Minimum behavior:

- show outgoing `blocks`
- show incoming `blocked by`
- show symmetric `relates to`
- allow adding `blocks` or `relates to` by selecting another active item
- allow deleting a relationship
- surface dispatcher errors inline, especially duplicate relationship and blocking-cycle errors

Use existing commands:

- `relationship.create`
- `relationship.delete`

- [ ] **Step 8: Verify PR 1 locally**

Run:

```bash
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
```

Expected:

- typecheck exits 0
- unit/component tests exit 0
- web build exits 0

- [ ] **Step 9: Update docs and architecture ledger**

Update `AI.md` if implementation changes component ownership, item-detail behavior, or modal/delete/relationship workflow.

Update `Readme.md` if the user-facing feature list should mention relationship management or item modal hardening.

- [ ] **Step 10: Open PR 1**

Open the PR only after the plan and implementation are both present.

PR title:

```text
Start July 2026 product depth pass
```

PR body must include:

- this plan is included by design
- work-item modal implementation was moved out of the drawer wrapper
- native prompt/confirm usage removed from item detail
- relationship management added to item detail
- verification commands and results

### PR 2: Item Attachments And Reminders

**Intent:** Make the existing attachment and reminder domain models visible and useful.

**Files:**

- Modify: `packages/ui/src/work-item/WorkItemModal.tsx`
- Create: `packages/ui/src/work-item/AttachmentPanel.tsx`
- Create: `packages/ui/src/work-item/ReminderPanel.tsx`
- Modify: `packages/ui/src/work-item/WorkItemModal.test.tsx`
- Modify: `packages/ui/src/theme/global.css`
- Modify: `AI.md`
- Modify: `Readme.md`

- [ ] Add tests for adding and deleting item attachments through `attachment.add` and `attachment.delete`.
- [ ] Add tests for browser-local attachment upload using a data URI fallback.
- [ ] Add safe preview rules for image, text, and PDF metadata.
- [ ] Add tests for creating, updating, and deleting item reminders.
- [ ] Render upcoming reminders in the item modal metadata area.
- [ ] Verify with `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build:web`.

### PR 3: Trash, Restore, Activity, And Custom Fields

**Intent:** Make deletion/history trustworthy and turn custom fields from settings-only configuration into usable work metadata. This combines the original PR 3 and PR 4 slices into one larger review unit so paid automated review is spent on a bigger product-depth increment.

**Files:**

- Modify: `packages/core/src/commands/envelope.ts`
- Modify: `packages/core/src/commands/dispatcher.ts`
- Modify: `packages/core/src/commands/dispatcher.test.ts`
- Create: `packages/ui/src/views/trash/TrashView.tsx`
- Create: `packages/ui/src/views/trash/TrashView.test.tsx`
- Create: `packages/ui/src/work-item/CustomFieldsPanel.tsx`
- Create or modify: shared activity/custom-field formatting helpers under `packages/ui/src/work-item/` or `packages/ui/src/components/`
- Modify: `packages/ui/src/nav-config.ts`
- Modify: `packages/ui/src/ProjectRouter.tsx`
- Modify: `packages/ui/src/AppShell.tsx`
- Modify: `packages/ui/src/work-item/WorkItemModal.tsx`
- Modify: `packages/ui/src/work-item/WorkItemModal.test.tsx`
- Modify: `packages/ui/src/views/table/TableView.tsx`
- Modify: `packages/ui/src/views/table/TableView.test.tsx`
- Modify: `packages/ui/src/views/backlog/BacklogView.tsx`
- Modify: `packages/ui/src/views/backlog/BacklogView.test.tsx`
- Modify: `packages/ui/src/views/settings/SettingsView.tsx` only if needed to support workflow tests without redesigning settings
- Modify: `packages/ui/src/theme/global.css`
- Modify: `AI.md`
- Modify: `Readme.md`

- [ ] Add a first-class Trash route.
- [ ] Show trashed work items, docs, and attachments; labels, milestones, relationships, and other typed trash entries should display as unsupported unless commands actually produce them.
- [ ] Add restore actions for supported record types through the command dispatcher.
- [ ] Add permanent delete with impact review copy.
- [ ] Improve item activity display so events are readable by humans, not only event-type strings.
- [ ] Render applicable custom fields in item detail.
- [ ] Preserve hidden-but-existing values when an item type changes.
- [ ] Let table show selected custom fields as columns.
- [ ] Let backlog optionally show compact custom-field metadata.
- [ ] Add validation and empty-state copy for required custom fields.
- [ ] Verify with component tests, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build:web`, and `npm.cmd run build:desktop`.

### PR 4: Saved Views And Backlog/Table Parity

**Intent:** Make views user-shaped instead of fixed route pages and make high-density planning credible enough for real work.

This combines the original saved-views slice and backlog/table parity slice into one larger review unit so paid automated review is spent on a bigger planning increment.

**Files:**

- Modify: `packages/core/src/domain/view.ts`
- Modify: `packages/core/src/commands/dispatcher.ts`
- Modify: `packages/core/src/domain/project.ts`
- Modify: `packages/core/src/import/import-project.ts`
- Modify: `packages/ui/src/AppShell.tsx`
- Modify: `packages/ui/src/ProjectRouter.tsx`
- Create: `packages/ui/src/views/planning/view-helpers.ts`
- Modify: `packages/ui/src/views/board/BoardView.tsx`
- Modify: `packages/ui/src/views/backlog/BacklogView.tsx`
- Modify: `packages/ui/src/views/table/TableView.tsx`
- Modify: `packages/ui/src/theme/global.css`
- Add or expand tests in `packages/core/src/commands/dispatcher.test.ts`
- Add or expand component tests for `AppShell`, `ProjectRouter`, `BoardView`, `BacklogView`, and `TableView`
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Define a shared filter representation for type, status, priority, assignee, label, milestone, and text query. Date filters remain deferred.
- [x] Let users save a filter/view from board, backlog, and table. Bug triage saved-view creation remains deferred.
- [x] Show saved views in the project view bar without breaking hidden-view settings.
- [x] Add delete/rename/reorder for saved board, backlog, and table views.
- [x] Verify import/export preserves saved views and rejects dangling saved-view filter references.
- [x] Add backlog text/type/status/priority/assignee/milestone filters and saved-view-backed sort persistence.
- [x] Add table column visibility settings and persisted column-order storage. Drag/drop column reordering remains deferred.
- [x] Add safe inline edits for status, priority, assignee, milestone, and due date.
- [x] Add bulk selection and bulk status/priority/assignee updates.
- [x] Preserve keyboard navigation and accessible sortable headers.

### PR 5: Roadmap And Milestone Planning

**Intent:** Make planning across dates and milestones useful without becoming heavyweight scheduling software.

**Delivery note:** This scope was bundled into the July Planning Workflow milestone PR alongside table bulk actions, bug triage actions, calendar agenda, and the project overview route.

**Files:**

- Modify: `packages/ui/src/views/roadmap/RoadmapView.tsx`
- Modify: `packages/ui/src/views/calendar/CalendarView.tsx`
- Modify: milestone settings and domain tests if required
- Modify: `packages/ui/src/theme/global.css`
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Show milestone progress and target dates.
- [x] Draw dependency indicators for blocked work.
- [x] Show explicit invalid-range feedback.
- [x] Support moving items between milestone lanes.
- [x] Add an agenda-style calendar list for upcoming start/due dates and reminders.
- [x] Keep date-only semantics unchanged.

### PR 6: Bug Intake And Triage Workflow

**Intent:** Turn bug triage into a true intake and decision surface.

**Delivery note:** The July Planning Workflow milestone PR shipped the command-backed triage actions and practical filters using existing `item.update`, `relationship.create`, and `reminder.create` commands. The Workflow Control milestone finished the configurable severity/priority gate, plugin-owned bug source/context fields, and severity/priority filters.

**Files:**

- Modify: `packages/ui/src/views/bugs/BugTriageView.tsx`
- Modify: `packages/ui/src/work-item/WorkItemModal.tsx`
- Modify: `packages/core/src/commands/envelope.ts`
- Modify: `packages/core/src/commands/dispatcher.ts`
- Add or update tests for bug triage behavior
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Add triage actions: accept, decline, mark duplicate, snooze, assign owner.
- [x] Require severity or priority before leaving intake when configured.
- [x] Add duplicate relationship support through existing relationship mechanics when possible.
- [x] Add bug source/context fields using plugin-owned data.
- [x] Add filters for stale bugs, unassigned bugs, and needs-repro.
- [x] Add severity and priority filters to the bug triage toolbar.

### PR 7: Automation Rule Builder

**Intent:** Surface the structured automation model in a calm rule-builder UI.

**Delivery note:** The Workflow Control milestone shipped the first command-backed automation builder. Rules live in `builtin.automation`, can be previewed before saving, and execute through the validated dispatcher on item events without recursively triggering themselves. Automation action failures are recorded on the automation activity event and do not abort the originating item command.

**Files:**

- Modify: `packages/core/src/automation/rules.ts`
- Modify: `packages/core/src/commands/envelope.ts`
- Modify: `packages/core/src/commands/dispatcher.ts`
- Create: `packages/ui/src/views/settings/AutomationSettings.tsx`
- Create tests for automation rules and UI
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Store automation rules in project module data.
- [x] Add rule create/edit/delete/enable/disable commands.
- [x] Support triggers for item created, item updated, status changed, due date changed, and milestone assigned.
- [x] Support actions for set field, add/remove label, move status, assign milestone, create subtask, and generate doc.
- [x] Show a dry-run preview before saving a rule.
- [x] Execute rules through the same validated command surface.

### PR 8: Project Overview And Dashboard

**Intent:** Give users a first screen that answers "what needs attention?"

**Delivery note:** This scope was bundled into the July Planning Workflow milestone PR and `/overview` is now the default in-project landing route.

**Files:**

- Create: `packages/ui/src/views/overview/OverviewView.tsx`
- Create: `packages/ui/src/views/overview/OverviewView.test.tsx`
- Modify: `packages/ui/src/nav-config.ts`
- Modify: `packages/ui/src/ProjectRouter.tsx`
- Modify: `packages/ui/src/AppShell.tsx`
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Add overview route as the default project landing view.
- [x] Show active milestone progress.
- [x] Show blocked items.
- [x] Show upcoming work and reminders.
- [x] Show recent activity.
- [x] Show bug intake pressure.
- [x] Show storage trust and save state in context.

### PR 9: Docs Knowledge System

**Intent:** Make docs feel like project knowledge rather than a Markdown side tab.

**Delivery note:** The Docs Knowledge System slice shipped command-backed doc sections, reusable document templates, a DocsView search/sidebar workflow, document section assignment, linked-work and referenced-doc context, backlinks, and section-aware Markdown export.

**Files:**

- Modify: `packages/ui/src/views/docs/DocsView.tsx`
- Modify: `packages/core/src/domain/document.ts`
- Modify: `packages/core/src/commands/envelope.ts`
- Modify: `packages/core/src/commands/dispatcher.ts`
- Modify docs tests and import/export tests
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Add doc folders or sections.
- [x] Add document templates for decisions, release notes, bug report context, and project brief.
- [x] Add linked-work panel for items referenced by the doc.
- [x] Add backlinks context panel.
- [x] Add doc search inside the docs surface.
- [x] Preserve router-safe internal links.

### PR 10: Settings Decomposition And AI Bridge Truth-In-UI

**Intent:** Reduce settings risk and remove placeholder bridge promises.

**Delivery note:** This slice shipped the focused settings panel decomposition, keyboard-accessible grouped settings tabs, and an AI bridge panel that documents real command coverage while clearly stating that no installable bridge runtime is shipped yet. Broader responsive/release polish remains in PR 11.

**Files:**

- Split: `packages/ui/src/views/settings/SettingsView.tsx`
- Create focused files under `packages/ui/src/views/settings/`
- Modify: `packages/ui/src/views/settings/SettingsView.test.tsx`
- Modify: `AI.md`
- Modify: `Readme.md`

- [x] Split settings into focused components: general, appearance, storage, views, members, workflow, labels/milestones, fields, plugins, automation, import/export, AI bridge.
- [x] Replace placeholder AI bridge install copy with either implemented instructions or clearly labeled future capability copy.
- [x] Add a bridge capability checklist tied to real command coverage.
- [x] Keep plugin trust language risk-aware.
- [x] Verify settings navigation remains keyboard accessible.

### PR 11: Responsive, Accessibility, And Release Polish

**Intent:** Make the improved product feel coherent across desktop, narrow screens, keyboard workflows, and release artifacts.

**Files:**

- Modify: app shell, modal, command palette, settings, docs, board, table, roadmap, and calendar CSS/components
- Modify: `tests/e2e/project-workflow.spec.ts`
- Modify: `tests/e2e/hybrid-parity.spec.ts`
- Modify: `AI.md`
- Modify: `Readme.md`

- [ ] Add mobile navigation sheet or compact sidebar behavior.
- [ ] Verify focus management for modal, dialog, command palette, and settings.
- [ ] Ensure icon-only controls have accessible names.
- [ ] Ensure warning, blocked, active, selected, and disabled states do not rely only on color.
- [ ] Add e2e coverage for first launch, item lifecycle, docs, search, settings, and responsive smoke paths.
- [ ] Run `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build:web`, `npm.cmd run build:desktop`, and `npm.cmd run test:e2e`.

## Documentation Rules During Execution

Every implementation PR in this plan must consider:

- update `AI.md` for architecture, domain, routing, storage, command, platform, or testing changes
- update `Readme.md` when a user-facing feature, workflow, or setup behavior changes
- update this plan only when scope changes materially
- keep `docs/INDEX.md` current when adding or moving planning docs

## Explicit Non-Goals For July 2026

- no sync backend
- no public internet hosting expansion
- no arbitrary third-party plugin execution
- no enterprise permission matrix
- no budgeting, cost reporting, or resource-capacity suite
- no built-in story points or time estimates
- no agentic AI automation until normal command coverage and trust language are real

## Success Criteria

By the end of this plan, GPH should feel meaningfully less plain because:

- item detail is a complete work surface
- relationships, attachments, reminders, activity, trash, and custom fields are visible where users expect them
- users can create named working views
- bug triage supports real intake decisions
- automation rules can handle common repetitive work
- the project overview tells users what needs attention
- docs connect decisions, context, and work items
- settings is easier to scan and safer to extend
- local-first trust remains visible and accurate
