# July Planning Workflow Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one larger July milestone PR that turns the planning surfaces into working contexts: overview, table bulk edits, roadmap milestone controls, calendar agenda, and bug triage actions.

**Architecture:** Keep all mutations on the existing `@gph/core` command dispatcher. Add UI-only derived summaries where possible, use React Router routes for navigation, and update documentation in the same PR as the implementation.

**Tech Stack:** React 18, TypeScript, React Router 6, Zustand, `@gph/core`, Testing Library, Vitest, CSS custom properties, `lucide-react`.

---

## Files

- Create: `packages/ui/src/views/overview/OverviewView.tsx`
- Create: `packages/ui/src/views/overview/OverviewView.test.tsx`
- Create: `docs/superpowers/plans/2026-07-04-planning-workflow-milestone.md`
- Modify: `packages/ui/src/ProjectRouter.tsx`
- Modify: `packages/ui/src/ProjectRouter.test.tsx`
- Modify: `packages/ui/src/AppShell.tsx`
- Modify: `packages/ui/src/commands/CommandPalette.tsx`
- Modify: `packages/ui/src/nav-config.ts`
- Modify: `packages/ui/src/views/table/TableView.tsx`
- Modify: `packages/ui/src/views/table/TableView.test.tsx`
- Modify: `packages/ui/src/views/roadmap/RoadmapView.tsx`
- Create or modify: `packages/ui/src/views/roadmap/RoadmapView.test.tsx`
- Modify: `packages/ui/src/views/calendar/CalendarView.tsx`
- Create or modify: `packages/ui/src/views/calendar/CalendarView.test.tsx`
- Modify: `packages/ui/src/views/bugs/BugTriageView.tsx`
- Modify: `packages/ui/src/views/bugs/BugTriageView.test.tsx`
- Modify: `packages/ui/src/theme/global.css`
- Modify: `docs/plans/July 2026 plan.md`
- Modify: `AI.md`
- Modify: `Readme.md`

---

## Task 1: Overview Route And Navigation

**Behavior:** `/overview` becomes the default project landing route. It summarizes active work, milestone progress, blocked items, upcoming deadlines/reminders, bug intake pressure, recent activity, and storage/save state. Sidebar and command palette expose "Overview".

- [ ] **Step 1: Write failing tests**

Add `packages/ui/src/views/overview/OverviewView.test.tsx` with tests that:

```tsx
it("summarizes project health and links into planning surfaces", () => {
  // build a project with one milestone item, one blocked item, one reminder, and one intake bug
  // render <OverviewView /> under MemoryRouter
  // expect Active work, Blocked, Upcoming, Bug intake, Recent activity, and Storage sections
  // expect links to /roadmap, /calendar, /bugs, /table, and /item/:id
});
```

Update `packages/ui/src/ProjectRouter.test.tsx` with:

```tsx
it("routes the project root to overview", () => {
  // render <ProjectRouter /> at "/" with a bundle
  // expect overview heading or route summary to be shown instead of board redirect
});
```

Run:

```bash
npm.cmd --workspace packages/ui run test -- OverviewView ProjectRouter
```

Expected: FAIL because `OverviewView` and `/overview` do not exist.

- [ ] **Step 2: Implement route and nav**

Create `OverviewView.tsx`, add `/overview` route, make `/` navigate to `/overview`, add `overview` to `PROJECT_NAV_ITEMS`, add a `LayoutDashboard` icon mapping in `AppShell.tsx`, and register `nav.overview` in `CommandPalette.tsx`.

- [ ] **Step 3: Verify**

Run the same UI tests. Expected: PASS.

---

## Task 2: Table Bulk Workflow

**Behavior:** Users can select visible rows and bulk update status, priority, and assignee without leaving the table.

- [ ] **Step 1: Write failing tests**

Update `packages/ui/src/views/table/TableView.test.tsx`:

```tsx
it("applies bulk status priority and assignee updates to selected rows", async () => {
  // create two items and one member
  // render <TableView />
  // select both row checkboxes
  // choose Ready, Urgent, and the member in bulk controls
  // click Apply bulk changes
  // expect both selected items to have the new statusId, priorityId, and assigneeId
  // expect an inline confirmation and cleared selection
});
```

Run:

```bash
npm.cmd --workspace packages/ui run test -- TableView
```

Expected: FAIL because no row-selection or bulk toolbar exists.

- [ ] **Step 2: Implement bulk selection**

In `TableView.tsx`, add `selectedIds`, a selection column, a master checkbox, `Bulk status`, `Bulk priority`, `Bulk assignee`, `Apply bulk changes`, and `Clear selection`. Apply one `item.update` command per selected item only for chosen values.

- [ ] **Step 3: Verify**

Run the TableView test. Expected: PASS.

---

## Task 3: Roadmap Milestone Planning Controls

**Behavior:** Roadmap lanes show milestone progress and target dates. Each bar can move between milestones, edit dates through explicit inputs, and show dependency indicators from existing `blocks` relationships.

- [ ] **Step 1: Write failing tests**

Create `packages/ui/src/views/roadmap/RoadmapView.test.tsx`:

```tsx
it("shows milestone progress and dependency indicators", () => {
  // create two milestone items, mark one completed, add a blocks relationship
  // render <RoadmapView />
  // expect milestone target date, "1/2 complete", "50%", and "Blocked by 1"
});

it("updates dates and milestone from roadmap controls", async () => {
  // render item with a milestone
  // change Start date, Due date, and Milestone for the item
  // expect item.update to persist startDate, dueDate, and milestoneId
});
```

Run:

```bash
npm.cmd --workspace packages/ui run test -- RoadmapView
```

Expected: FAIL because these controls and indicators do not exist.

- [ ] **Step 2: Implement roadmap controls**

Use existing `milestoneProgress`, `relationshipsForItem`, and `item.update`. Add inline validation feedback for invalid start/due order.

- [ ] **Step 3: Verify**

Run the RoadmapView test. Expected: PASS.

---

## Task 4: Calendar Agenda

**Behavior:** Calendar keeps the month grid and adds an agenda for upcoming dated items and reminders, sorted by date and linked to the relevant item/document/milestone where possible.

- [ ] **Step 1: Write failing tests**

Create `packages/ui/src/views/calendar/CalendarView.test.tsx`:

```tsx
it("renders an agenda of upcoming due dates and reminders", () => {
  // create one dated item and one work-item reminder
  // render <CalendarView />
  // expect Agenda, due entry, reminder entry, and item link
});
```

Run:

```bash
npm.cmd --workspace packages/ui run test -- CalendarView
```

Expected: FAIL because the agenda does not exist.

- [ ] **Step 2: Implement agenda**

Build agenda rows from `items.startDate`, `items.dueDate`, and active `reminders`. Display the next 30 days from the current anchor month and include links for work item targets.

- [ ] **Step 3: Verify**

Run the CalendarView test. Expected: PASS.

---

## Task 5: Bug Triage Actions

**Behavior:** Bug triage supports filtering plus real intake actions: accept to Ready, decline to the canceled status, snooze with a reminder, assign owner, and link a possible duplicate through `relatesTo`.

- [ ] **Step 1: Write failing tests**

Update `packages/ui/src/views/bugs/BugTriageView.test.tsx`:

```tsx
it("filters intake bugs by triage state", async () => {
  // create an unassigned no-repro bug and an assigned bug with repro steps
  // filter to Needs repro
  // expect only the no-repro bug remains
});

it("runs accept decline snooze assign and duplicate actions", async () => {
  // create two bugs and one member
  // accept the first bug and expect statusId ready
  // assign it and expect assigneeId member
  // snooze it and expect a workItem reminder
  // mark it related to the second bug and expect a relatesTo relationship
  // decline another intake bug and expect the canceled status
});
```

Run:

```bash
npm.cmd --workspace packages/ui run test -- BugTriageView
```

Expected: FAIL because the actions and filters do not exist.

- [ ] **Step 2: Implement triage controls**

Keep lane rendering intact. Add a compact toolbar for filters and per-card action controls that call `item.update`, `reminder.create`, and `relationship.create`.

- [ ] **Step 3: Verify**

Run the BugTriageView test. Expected: PASS.

---

## Task 6: Documentation And Full Verification

**Behavior:** The code changes are documented and verified before PR.

- [ ] **Step 1: Update docs**

Update `docs/plans/July 2026 plan.md` to mark this as the combined Planning Workflow milestone. Update `AI.md` with routing, workflow, and command-surface notes. Update `Readme.md` status and test counts.

- [ ] **Step 2: Run verification**

Run:

```bash
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
npm.cmd run build:desktop
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit, push, and PR**

Run a signed commit and open a ready PR:

```bash
git add <changed files>
git commit -s -m "feat: expand planning workflow milestone"
git push -u origin codex/july-planning-workflow-milestone
gh pr create --base main --head codex/july-planning-workflow-milestone --title "Expand July planning workflows" --body <summary>
```

Expected: a non-draft PR with implementation and docs together.
