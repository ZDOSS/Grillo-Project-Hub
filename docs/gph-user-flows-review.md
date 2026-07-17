# Grillo Project Hub: Interaction-Backed User Flow and UX Review

**Review date:** 2026-07-16

**Feature update:** 2026-07-17 — added the guided New user tutorial described below.

**Scope:** The complete browser product journey, reviewed in the running app at desktop and mobile widths, followed by implementation and regression verification.

**Primary environment:** Local web app, demo workspace, 1280 x 720 desktop viewport, and 390 x 844 mobile viewport.

## Overall verdict

Grillo's core product model is sound: users can enter through a clear workspace launcher, move between complementary planning views, edit the same project data from each surface, and understand when work is unsaved. The strongest flows were already the guarded close-project path, Docs edit sessions, Search, Trash, and the grouped Settings experience.

The audit did expose several interaction-level problems that source review alone did not reveal. First launch opened a creation modal without being asked, project-only navigation remained visible with no project open, the command palette initially rendered no commands, some card links had unusable accessible names, and several dense views broke or became noisy at realistic widths. These issues are now fixed and verified in the running app.

## Flow-by-flow review

### 1. Workspace launcher, first run, open/import, and demo

**Journey:** Open Grillo -> review launcher -> create a project, open/import a bundle, enter the demo, or start the New user tutorial -> arrive at Overview.

**Health after this pass:** Good.

- The launcher now remains visible on first run instead of opening `New project` automatically. The visible launcher already explains all three entry paths, so the modal is now shown only after an explicit action.
- When no project is open, the sidebar contains only Projects, Open, and Demo. Project views and Settings no longer lead users into guarded routes that cannot work yet.
- Closing an unsaved demo still uses the existing confirmation dialog, but confirming now returns to the clean launcher without immediately reopening project creation.
- Disabled primary actions now look inactive instead of retaining the full green emphasis of an available action.
- The Demo project explanation now includes a `New user tutorial` link. Its landing page opens a disposable demo only when existing unsaved work is protected, then a 13-step wizard moves through every core project surface with visible progress, Back/Next/Exit controls, and manual sidebar-route synchronization.

### 2. Create, save, switch, and close project

**Journey:** Choose a template and destination -> create -> observe save state -> save/retry -> switch or close -> confirm when data is unsaved.

**Health after this pass:** Good, with platform-specific storage verification still required for release QA.

- The header keeps the save destination, dirty state, save/retry, switch, and close actions visible.
- Dirty or unsaved projects continue to use an application confirmation dialog rather than a native prompt.
- The review did not modify storage behavior. Folder-backed browser permissions and Tauri filesystem behavior remain covered by their adapter tests and should also be exercised on their target platforms before release.

### 3. Overview and global project navigation

**Journey:** Enter a project -> scan state, milestones, agenda, bugs, and activity -> jump into a planning view.

**Health after this pass:** Good.

- Project view links now expose `aria-selected` consistently with their tab role.
- On narrow screens, the project view strip remains horizontally scrollable by touch but no longer shows intersecting native horizontal and vertical scrollbars.
- Mobile overview metrics use a two-by-two grid, preserving scanability without requiring four full-width cards.

### 4. Board and create-item entry

**Journey:** Filter or scan lanes -> open a card -> create work in the current context -> move work through workflow states.

**Health after this pass:** Good.

- Board cards keep their existing visual design and now expose the work-item title as the link's accessible name. Previously the first bug card could be announced only as its severity and other cards could be unnamed.
- The existing contextual create behavior, filters, saved views, WIP display, and column management remained intact.

### 5. Backlog and Table

**Journey:** Filter and sort work -> scan structured metadata -> edit inline or in bulk -> save a reusable view.

**Health after this pass:** Good.

- Backlog rows once inherited the shared five-column work-row grid after declaring their own seven-column grid. This pushed due dates under the ID column. Removing that conflicting class restores a single aligned row.
- Table bulk controls now appear after at least one row is selected. Before selection, a short hint explains the interaction rather than showing three inactive selectors and two inactive actions.
- Column visibility controls now live in a collapsed `Columns` disclosure with a visible-column count. This keeps the table surface focused while preserving the full configuration path.

### 6. Roadmap and Calendar

**Journey:** Plan by milestone and date -> create scheduled work -> adjust ranges -> inspect the upcoming agenda.

**Health after this pass:** Good.

- Roadmap milestone statistics now wrap with deliberate spacing rather than running together.
- The due-date resize edge is now a visible Lucide grip button with an accessible label. It supports Left/Right Arrow for one-day changes and Shift+Arrow for one-week changes in addition to pointer dragging.
- Calendar columns now use zero-minimum grid tracks, so all seven days remain visible beside the agenda at a 1280-pixel desktop viewport. Friday and Saturday were previously pushed beyond the visible grid.

### 7. Work-item detail

**Journey:** Open an item -> edit core metadata and description -> manage bug context, custom fields, checklist, relationships, attachments, reminders, comments, activity, and lifecycle actions.

**Health after this pass:** Good.

- At mobile width, core fields now form one readable column. The previous two-column grid clipped controls, labels, and title content.
- Labels now use explicit checkbox chips instead of a native multi-select. The new controls work with touch, pointer, and keyboard input and make the current selection visible without platform-specific modifier keys.
- The title area and pinned footer now allow their contents to shrink and wrap within the modal.
- Existing autosave, destructive confirmation, and pinned lifecycle actions remain unchanged.

### 8. Docs

**Journey:** Browse the document tree -> open in reading mode -> enter an edit session -> save/cancel -> follow links and backlinks.

**Health after this pass:** Good; no code change required.

- View-first existing documents, edit-first new documents, dirty navigation confirmation, templates, sections, backlinks, linked work, and safe deletion all remained coherent during the walkthrough.

### 9. Bug triage

**Journey:** Filter intake -> grade severity and priority -> capture source/context -> accept, decline, snooze, assign, or link a duplicate.

**Health after this pass:** Good.

- Action buttons now use short visible labels such as `Accept`, `Decline`, and `Save context`, preventing the item title from stretching or clipping every action row.
- Each action keeps the full item-specific `aria-label`, so repeated controls remain unambiguous to assistive technology.
- The bug card link now exposes the bug title as its accessible name.
- Source/context fields can shrink within the card instead of forcing the lane wider.

### 10. My work, Search, and command palette

**Journey:** Focus by owner -> search across project content -> invoke navigation and creation commands from the keyboard.

**Health after this pass:** Good.

- My Work and Search were coherent during the walkthrough and required no structural changes.
- The command palette now subscribes to registry changes. It immediately lists navigation and creation commands even when commands register after the palette component mounts; previously the empty query displayed `No matches` until the user typed.

### 11. Trash and Settings

**Journey:** Restore or permanently delete work -> configure workflow, fields, members, views, automation, storage, and import/export.

**Health after this pass:** Good; no structural code change required.

- Trash selection, bulk restore, and confirmed permanent deletion remained clear.
- Settings retained its grouped navigation, mounted draft-preserving panels, storage explanations, workflow controls, automation previews, and import/export feedback.

## Implemented changes

- Removed unsolicited first-run and post-close project creation.
- Scoped global navigation to the currently available workspace context.
- Made project tabs semantically selected and visually calmer on mobile.
- Fixed late command registration in the command palette.
- Added reliable accessible names to Board and Bug Triage item links.
- Corrected Backlog's conflicting row-grid class.
- Added progressive disclosure to Table bulk editing and column configuration.
- Added a visible, keyboard-operable Roadmap resize control and readable milestone metadata.
- Kept all seven Calendar columns visible at standard desktop width.
- Reflowed work-item metadata for mobile and replaced native multi-select labels with checkbox chips.
- Shortened Bug Triage action copy without losing item-specific accessible labels.
- Improved disabled primary-action styling and mobile Overview density.
- Added the safe demo-backed New user tutorial entry, landing page, persistent route-aware wizard, and responsive desktop/mobile presentation.

## Verification

- Interaction walkthrough completed in the running browser app across launcher, Overview, Board, create-item entry, work-item detail, Backlog, Table, Roadmap, Calendar, Docs, Bug Triage, My Work, Search, command palette, Trash, Settings, Open/Import, and guarded close-project flows.
- Before/after screenshots were compared at matching states and viewports for the launcher, mobile Overview, mobile work-item detail, command palette, Table, Calendar, Backlog, Bug Triage, and Roadmap.
- Focused UI regression suite: 53 tests passed across AppShell, CommandPalette, WorkItemModal, TableView, and RoadmapView.
- Full repository suite: 230 tests passed across core, UI, web, and desktop workspaces.
- Workspace TypeScript checks and the production web build passed.

## Evidence limits and follow-on QA

This was an interaction and visual UX audit, not a formal WCAG conformance audit. The browser run exercised the web shell and demo data; it did not grant real folder permissions, overwrite user files, or run the Tauri desktop shell. Before a release, complete a keyboard-only pass, screen-reader smoke test, browser folder-permission matrix, and packaged desktop storage walkthrough. Those checks are complementary to the improvements above rather than blockers discovered by this pass.
