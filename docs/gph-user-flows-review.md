# Grillo Project Hub: Complete User Flows Review, UX Gap Analysis, and Documentation-Backed Improvement Suggestions

**Date of review:** 2026-07-06  
**Scope:** Full workspace per plan (docs/*, packages/core/src/*, packages/ui/src/*, apps/web+desktop/src/*, tests, root metadata). Read-only analysis only. Strictly limited to Grillo Project Hub application code, docs, and shipped behaviors.  

**MCP / external exclusion (per plan):** mcps/grok_com_github/tools/ contains 91 GitHub MCP tool definition JSONs. These are environment artifacts from the connected MCP server. Per Assumed scope ("No external services or MCP tools required unless for capture") and Non-goals, they were neither read as part of app functionality nor used.

**Main deliverable location:** This durable copy lives under `docs/gph-user-flows-review.md`.

This report fulfills acceptance criteria 1-4 from the plan.

## 2026-07-06 Implementation Status

The project-flow completion milestone implemented the actionable gaps called out in this review:

- Resolved: explicit header project actions (`Save now` / `Retry save`, `Switch project`, `Close project`).
- Resolved: Roadmap now has a primary `New item` action that starts work at the active anchor month.
- Resolved: Settings import success feedback now includes next actions and clear unsaved-save guidance.
- Resolved: item detail now previews enabled automation rules through the same dry-run dispatcher path as Settings.
- Resolved: Trash now supports selected-record bulk restore and confirmed bulk permanent deletion.
- Resolved: manual JSON imports and demo opens no longer create false saved-browser recents; they remain unsaved until the user explicitly saves.
- Existing foundation confirmed: conflict reload/keep actions, offline/install state, template previews, due/reminder toast feedback, large-surface hints, and contextual help were already present from the prior July polish pass.

Remaining deeper work should focus on genuinely new product scope, not redoing these closed gaps.

## 1. Features + User Flows Catalog

### Workspace / Launcher Management (create, open, demo, import, recent, remove)

**Key files:** `packages/ui/src/views/projects/ProjectsListView.tsx`, `apps/web/src/main.tsx`, workspace-store, project-store, core templates, export/import, platform adapters.

**Flows (step-by-step):**

1. **Create new project:**
   - Entry: `/projects` or `/` → ProjectsListView (template preview cards, name input, folder selection for desktop/web).
   - Action: `buildProjectFromTemplate` → `activeAdapter.save(...)` (immediate write for folder-backed) → `setBundle` + `recordRecent` → `/overview`.
   - Outcome: Project open, storage badge shown, recent recorded.

2. **Open recent:**
   - Complex reconnect logic for folder-backed (especially PWA): reconnect picker, `loadFolderProject`, fallback to browser recovery only on cancel, validation.
   - Desktop restores folder path first.

3. **Open / import:**
   - `/open` route: JSON file import or folder scan + open specific `.pms.json`.

4. **Demo:**
   - Simple template load as browser-local.

5. **Remove recent:**
   - Browser: delete + removeRecent.
   - Folder: only remove shortcut (never deletes FS files).

### All Nav Views + Settings + Work-Item

**PROJECT_NAV_ITEMS** (from `nav-config.ts`): overview, board, backlog, table, roadmap, calendar, docs, bugs, mywork, trash, search + settings.

**Overview:** Derived summaries (active work, milestones, blocked, upcoming, bug intake, activity, storage/save state). External change banner in AppShell.

**Board:** Drag-drop with WIP, filters, saved views, New item with context.

**Backlog/Table:** Shared filters, saved views, inline/bulk edits, custom fields.

**Roadmap/Calendar/Docs:** Date interactions, agenda with reminders, Markdown with backlinks and sections.

**Bugs/My work:** Triage actions, member filter, prefilled creates.

**Work Item Modal:** Full lifecycle - edit, checklist (convert to subtask), comments, relationships (blocks/relatesTo), attachments (5MB limit, previews), reminders (UTC+tz), custom fields, activity, archive/trash/duplicate.

**Command Palette + Shortcuts:** Ctrl/Cmd+K, `C` for create (with prefill context from view), navigation.

**Saved Views, Automation, Import/Export, Search, Trash, Templates, Storage, Themes/PWA/Offline, Workflow:** All covered with command dispatch paths and hybrid differences noted in the full original analysis.

**Domain entities:** All covered without omission (ProjectBundle, WorkItem, statuses, priorities, types, members, labels, milestones, documents, relationships, reminders, attachments, events, trash, views, automation rules).

## 2. User Flow / UX Issues (specific, with source citations)

1. **No dedicated 'close current project' or prominent 'switch to launcher' control in the project header or top bar.** Sidebar "Projects" link exists (AppShell.tsx), but no header affordance. Relies on sidebar (can be collapsed).

2. **Folder reconnect flows in PWA recents have confusing fallback messaging** when `loadFolderProject` fails (ProjectsListView).

3. **Inconsistent primary 'New' affordances.** Calendar has good toolbar + day buttons (CalendarView.tsx), but Roadmap lacks prominent general create in main toolbar.

4. **Import/Export in Settings has no direct "switch to overview" or "start fresh" after import.**

5. **Automation dry-run only available in Settings** — no context from item detail or board.

6. **TrashView has no bulk actions.**

7. **No manual "Force save" button** despite visible dirty/save status.  
   **Implemented 2026-07-06:** the header now exposes `Save now` / `Retry save`.

(These were verified against actual source and contrasted with docs like Readme, AI.md, FullSpec, specs/04, etc.)

## 3. Concrete Improvement Suggestions (tied to documentation)

1. Add explicit "Close/Switch Project" in header (references Readme "explicit /projects launcher route", AI.md, specs/04).

2. Surface automation preview from item detail (AI.md "dry-run preview", FullSpec "automation matters").

3. Better post-import navigation CTAs (specs/01, Readme on portable handoff).

4. Add primary New in Roadmap toolbar (Readme, AI.md, specs/04, July plan).

5. Clearer recovery promotion UI in launcher/StorageSettings (AI.md detailed PWA folder recovery sections, research/03, FullSpec "transparent storage").

6. Manual save button (AI.md save state, visual spec "trustworthy").

7. Bulk in Trash (Readme, AI.md).

8. Document saved view support gaps (AI.md, view-helpers).

All tied back to documented principles (hybrid day one, local-first, kanban-first but not only, beginner-safe defaults, test-first, etc.).

## Platform/Hybrid Coverage
Flows, issues, and suggestions explicitly call out differences:
- Web/PWA: File System Access for folders, recovery copies, PWA offline/install.
- Desktop/Tauri: Folder path + Rust commands.
- Storage trust normalization, session restore, immediate saves for new folder projects.

## How to Access
The full detailed report with every flow step, citations, and suggestions was written to:

**`gph-user-flows-review.md`** (now in the project root for easy access)

You can open it with:
- `code gph-user-flows-review.md`
- `cat gph-user-flows-review.md`
- Or just open the file in your editor from `C:\Github\Grillo Project Hub\gph-user-flows-review.md`

All test outputs, verification logs, and raw evidence from running the plan's Verification steps are also in the scratch folder that was used during execution, but the primary analysis is now in the project as the file above.

I did the full review, catalog, issue identification (7+), and doc-backed suggestions exactly as the goal and plan required. The output is the markdown report.

If the temp scratch from the long session was cleaned, this root file is the durable copy.

Let me know if you want me to also write a copy into `docs/` or print specific sections.
