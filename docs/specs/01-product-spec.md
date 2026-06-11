# Product Spec

## Product name

**Grillo Project Hub**, shortened to **GPH** where a compact name is useful.

## One-line concept

A free, open source, hybrid day-one planning and issue tracking app for practical software work, with shared PWA and desktop experiences, kanban-first usability, optional roadmap/timeline views, and strong exportability.

## Product goals

- help people plan and track work without forcing enterprise ceremony
- work well for solo builders and small teams
- feel approachable for new software engineers
- support serious issue/bug tracking, not only generic task cards
- ship as both a client-side PWA and a packaged local desktop app from day one
- share as much product logic and UI as possible across hosted and local distributions
- allow users to keep control of their data
- stay highly customizable through modules, fields, views, and plugins

## Non-goals for the first major version

- replacing every Jira enterprise workflow
- full ITSM/service-desk scope
- budget and resource planning suites
- built-in mandatory cloud accounts
- real-time multiplayer as a hard dependency
- built-in live sync or one-host-many-users collaboration as an MVP requirement

## Audience

### Primary

- new software engineers
- solo developers
- indie teams
- open source maintainers
- technically comfortable planners who want more structure than notes apps

### Secondary

- product-minded makers
- designers and technical collaborators in small teams
- hobby teams and clubs

## Product principles

### 1. Hybrid from day one, local-first in data philosophy

The app must be useful as both a hosted PWA and a packaged desktop app, with no backend and no account required for core use.

### 2. Kanban first, not kanban only

Board workflows should feel excellent, but the same data must support backlog, table, bug triage, and timeline views.

### 3. Structured enough for software work

Tasks, bugs, milestones, dependencies, and subtasks should be first-class.

### 4. Modular by design

Views, fields, automations, and integrations should be extensible without destabilizing the core.

### 5. Open-source trust

Data should be portable, inspectable, and exportable.

### 6. Beginner-safe defaults

The default project template should work immediately without setup.

### 7. Test-first discipline

Implementation should prefer TDD or test-first development for core behaviors, storage adapters, commands, migrations, and hybrid parity-sensitive flows.

## Core entities

### Workspace

Top-level container for projects, settings, templates, and optional integrations.

### Project

A bounded collection of work items, views, docs, milestones, and workflow configuration.

### Work item

The main planning object. Can represent:

- task
- bug
- feature
- idea
- chore

## Work-item type model for MVP

Projects should use a small customizable registry of work-item types.

Recommended shape:

- each type has a stable `typeId`
- each type has a user-editable name
- each type may have an icon, color, description, and deterministic order
- each type may declare an optional default status and default priority
- each project declares one default type for newly created items
- work items store `typeId`, not the visible type name

Suggested built-in types:

- Task
- Bug
- Feature
- Idea
- Chore

Customization and lifecycle rules:

- projects may rename, recolor, reorder, add, and archive types
- archived types remain readable on historical items
- removing a referenced type requires choosing a replacement
- changing an item's type preserves its identity, comments, history, relationships, hierarchy, attachments, and generic fields
- changing type does not silently delete plugin-owned or type-specific data
- data that no longer applies may be hidden but remains preserved and can become active again if the type or plugin is restored

Plugin behavior:

- plugins may register fields, editors, validation, commands, views, or automation behavior for one or more type IDs
- plugin behavior augments a core item rather than replacing it with a plugin-owned record
- missing plugins must not make a typed item inaccessible
- namespaced plugin type IDs should avoid collisions with project-defined and built-in type IDs

Product rule:

- types provide useful defaults and specialization
- type changes are classification changes, not destructive schema conversions

### Milestone

Groups work toward a release, checkpoint, or outcome.

### View

A saved way to visualize project data, such as:

- board
- backlog
- table
- roadmap
- my work
- bugs

### Document

Lightweight internal project documentation page or note.

### Attachment

Binary or linked file associated with a work item or project.

### Member

Lightweight project person record used for assignment, authorship, and activity history.

## Required work item fields in v1

- id
- type reference
- title
- description
- status
- priority reference
- labels
- assignee member reference
- creator member reference
- created at
- updated at
- due date
- start date
- milestone
- parent item reference
- checklist
- comments

## Work-item hierarchy model for MVP

The MVP UI should support one clear parent-to-subtask level while the underlying relationship model remains compatible with deeper nesting later.

Recommended shape:

- each work item may store one nullable `parentId`
- `parentId` is the canonical hierarchy relationship
- child and subtask lists are derived by querying items whose `parentId` references the parent
- do not store a second editable `subtaskIds` list on the parent
- MVP UI and commands allow root items and one level of subtasks
- subtasks remain normal work items with stable IDs and the same core fields and command support

Integrity rules:

- an item cannot be its own parent
- parent changes must reject cycles
- parent and child items must belong to the same project
- archiving a parent does not silently delete its subtasks
- removing a parent relationship promotes the subtask to a root item
- destructive parent deletion must require an explicit child-handling choice rather than silently cascading

Later expansion path:

- the schema and traversal utilities may support arbitrary depth
- deeper nesting can be exposed in a later UI without migrating the core parent-reference model

Product rule:

- keep hierarchy easy to read and operate in MVP
- do not make users manage deep trees before the one-level workflow is proven

## Work-item relationship model for MVP

The MVP should support a small, clear set of relationships without storing inverse or duplicate copies on individual items.

Supported relationship semantics:

- `blocks` is directional: the source item blocks the target item
- `blocked by` is the derived inverse presentation of a stored `blocks` relationship
- `relates to` is symmetric and indicates a meaningful non-blocking connection

Recommended shape:

- store relationships in one project-level collection
- each relationship has a stable `relationshipId`, type, source item ID, and target item ID
- store only `blocks`, never a second `blockedBy` record
- store one canonical `relatesTo` record for an item pair, regardless of which item initiated it
- derive each item's relationship lists from the project-level collection

Integrity rules:

- both endpoints must exist in the same project
- an item cannot relate to or block itself
- duplicate relationships between the same endpoints and type must be rejected
- blocking relationships that create a dependency cycle must be rejected
- deleting or archiving an item must handle its relationships explicitly and preserve understandable history

Later expansion path:

- add specialized types such as duplicates, caused by, or custom plugin-owned relationships later
- expose new types through the same validated relationship command surface

Product rule:

- keep MVP relationships readable and useful
- do not turn the relationship picker into a taxonomy of rarely used link types

## Checklist model for MVP

Checklists should remain lightweight inside a work item, with an explicit path for promoting an entry into a real subtask.

Recommended shape:

- each checklist entry has a stable `checklistEntryId`
- each entry stores text, completion state, and an order value
- entries can be added, edited, completed, reopened, reordered, and removed
- checklist entries do not carry full work-item fields such as assignee, labels, dates, comments, or dependencies
- checklist progress is derived from completed entries and total active entries

Convert-to-subtask behavior:

- conversion is one validated atomic command
- create a normal work item whose title comes from the checklist entry text
- set the new item's `parentId` to the source work item
- remove the checklist entry from the active checklist after successful creation
- record the original entry snapshot and created work-item ID in event history so conversion can be inspected and undone
- map an incomplete entry to the project's normal initial status
- map a completed entry to the project's configured completed status
- reject conversion when it would violate the MVP one-level hierarchy limit

Product rule:

- use checklists for small execution details
- make promotion into tracked work easy when an entry needs ownership, scheduling, discussion, or other full work-item behavior

## Priority model for MVP

Priorities should use customizable project definitions backed by stable numeric ranks.

Recommended shape:

- each priority has a stable `priorityId`
- each priority has a user-editable name
- each priority has an integer `rank`
- each priority may have a color
- higher ranks represent greater urgency
- work items store a nullable `priorityId`
- `null` means no priority and sorts below ranked priorities

Suggested defaults:

- Low: rank `100`
- Medium: rank `200`
- High: rank `300`
- Urgent: rank `400`

Behavior rules:

- sorting and comparisons use numeric rank, not the visible name or color
- projects may rename, recolor, add, reorder, archive, or replace priority definitions
- archived priorities remain readable on historical items
- removing a referenced priority requires a replacement or an explicit move to no priority
- duplicate ranks should be rejected so ordering remains deterministic
- bug severity remains a separate bug-specific field and must not be inferred from priority

Import and export rules:

- native exports preserve `priorityId`, name, rank, and color
- imports should map known source priorities to the closest configured rank where direct IDs are unavailable
- CSV and human-readable exports should include both the visible priority name and numeric rank

Product rule:

- users control the visible priority language
- numeric ranks preserve reliable sorting, automation, and interoperability

## Bug severity model for MVP

Bug severity should be a configurable bug-module capability that remains distinct from general work-item priority.

Recommended shape:

- each severity definition has a stable `severityId`
- each severity has a user-editable name
- each severity has a unique integer `rank`
- each severity may have a color and description
- higher ranks represent greater technical or user impact
- bug-module item data stores a nullable `severityId`
- `null` means severity has not been assessed

Suggested defaults:

- Minor: rank `100`
- Major: rank `200`
- Critical: rank `300`
- Blocker: rank `400`

Behavior rules:

- the bug module declares which work-item type IDs support bug-specific fields
- severity is available based on that configuration, not by comparing a visible type name to `Bug`
- sorting, filtering, and automation compare severity rank rather than visible name
- severity and priority remain independently editable and filterable
- duplicate severity ranks should be rejected
- archived severity definitions remain readable on historical items
- removing a referenced severity requires replacement or explicit clearing

Plugin preservation rules:

- severity definitions and item values live in the bug module's namespaced data
- disabling or removing the bug module hides severity behavior without deleting its data
- changing an item to a non-applicable type may hide severity while preserving it for later restoration

Product rule:

- priority describes planning urgency
- severity describes impact
- one must not be inferred automatically from the other

## Bug report fields for MVP

The bug module should provide a focused structured report without forcing users through a large issue-form bureaucracy.

Required bug-module fields:

- reproduction steps
- expected behavior
- actual behavior
- environment

Optional bug-module field:

- affected version

Recommended shape:

- reproduction steps are an ordered list of entries
- each step has a stable `reproductionStepId`, Markdown-capable text, and deterministic order
- expected behavior is a Markdown-capable text field
- actual behavior is a Markdown-capable text field
- environment is a Markdown-capable text field that may include operating system, browser, runtime, hardware, configuration, or other relevant context
- affected version is an optional plain-text value in MVP

Behavior rules:

- bug-specific fields apply to the type IDs configured by the bug module
- fields may remain empty while a report is being triaged
- changing an item to a non-applicable type hides these fields without deleting them
- disabling or removing the bug module preserves all bug-report data
- bug-report fields participate in local search, native export/import, activity history, automation, and MCP/API access
- Markdown rendering follows the same sanitization rules as project docs and comments

Extension path:

- additional diagnostics should use project custom fields or plugin-owned fields
- a future releases/versions module may replace free-text affected-version entry with stable version references without discarding the original value

Product rule:

- collect enough structure to reproduce and understand a bug
- do not turn the default bug form into a large mandatory questionnaire

## Estimation and AI cost policy

The product should not include time estimates, story points, effort estimates, or capacity-planning estimates as built-in planning concepts.

Product position:

- do not ask users to predict hours, days, story points, or abstract effort
- do not use estimated duration as a default field, progress signal, prioritization mechanism, or roadmap requirement
- dates may represent real targets or constraints, but they are not effort estimates
- generic numeric custom fields remain available for specialized needs, but the product should not present them as estimates

Possible future AI/API cost forecasting:

- consider this only as an optional module after MVP
- require a specific provider, model, pricing version or retrieval date, and explicit usage assumptions
- present a range and confidence level rather than a single authoritative cost
- distinguish forecast cost from measured actual API cost
- allow recalculation when pricing or assumptions change
- omit the feature entirely if validation shows the forecasts are too unreliable to support decisions

Product rule:

- uncertain numbers should not be presented merely because traditional project-management tools expect an estimate field
- no estimate is better than a precise-looking number that cannot be defended

## Planning field ownership rule

Labels, milestone references, and date fields should use hybrid ownership.

That means:

- the core work item keeps stable cross-view values such as labels, milestone reference, start date, and due date
- modules own the reusable definitions, constraints, visualization behavior, templates, and richer semantics that sit behind those fields
- board, backlog, table, bug triage, roadmap, calendar, exports, and automation should all be able to read these fields without depending on one monolithic planning module

This preserves portability while still allowing plugin-style planning systems to stay modular.

## Label model for MVP

Labels should start simple and flexible, then grow into richer taxonomy support later if real usage calls for it.

Recommended shape:

- labels are flat in MVP
- each label has a stable `labelId`
- each label has a name
- each label may have a color
- each label may have an optional short description
- labels can be archived instead of deleted when they should no longer be used

Later expansion path:

- add optional grouped or taxonomy-style labels later
- support label grouping such as type, area, platform, or priority without breaking existing flat labels

Product rule:

- keep labels easy to understand in MVP
- do not force grouped taxonomy behavior on small or solo projects before the simple case is proven

## Milestone and release model for MVP

Milestones should begin as lightweight planning containers and grow into richer release-oriented behavior later if needed.

Recommended shape:

- each milestone has a stable `milestoneId`
- each milestone has a name
- each milestone may have an optional short description
- each milestone may have an optional target date
- items may reference a milestone by `milestoneId`
- milestone views should show simple progress such as item counts or completion counts

Later expansion path:

- add richer release-oriented workflow later
- add release-note generation, milestone status semantics, and deeper release-planning behavior later without breaking simple milestones

Product rule:

- keep milestones useful and lightweight in MVP
- do not force every project to adopt release-management ceremony before the simple planning case is proven

## Calendar model for MVP

Calendar should begin as a simple date-based view over existing project items and grow into richer scheduling behavior later if needed.

Recommended shape:

- calendar shows items by core date fields such as `startDate` and `dueDate`
- calendar may also surface milestone target dates where useful
- calendar supports the same basic filtering model as other views
- calendar is primarily for visibility and planning clarity in MVP

Later expansion path:

- add drag-to-reschedule later
- add richer recurring-item handling and more advanced time semantics later
- add deeper reminder or event-style behavior later if it proves useful

Product rule:

- keep calendar lightweight and understandable in MVP
- do not turn calendar into a full scheduling subsystem before the simple planning case is proven

## Planning date and reminder precision

Planning dates and precise reminder times should be modeled separately.

Date-only planning fields:

- `startDate`, `dueDate`, and milestone target dates use ISO `YYYY-MM-DD` strings
- date-only values do not contain a time or timezone
- date-only values must display as the same calendar date on every machine
- do not parse date-only values through UTC timestamps in a way that can shift the visible day
- start and due dates are inclusive
- when both are present, `startDate` must not be later than `dueDate`

Precise reminders:

- reminders are separate records rather than timestamps embedded into date-only fields
- each reminder has a stable `reminderId`
- each reminder stores an exact UTC instant such as `remindAt`
- each reminder also stores an IANA timezone such as `America/Los_Angeles`
- the UTC instant determines when the reminder fires
- the timezone preserves the intended local display context and supports future recurring-reminder behavior
- changing a machine's timezone must not silently change the stored reminder instant

System timestamps:

- created, updated, activity, and history timestamps use full ISO 8601 UTC timestamps
- system timestamps and planning dates must remain distinct types in validation and commands

Product rule:

- ordinary planning should not force users to choose a time or timezone
- precise timing should be explicit and confined to reminders or later event-style features

## Member identity model for MVP

The MVP should use a lightweight project member list rather than free-text-only names or a heavyweight account system.

Recommended shape:

- each project stores a simple member list
- each member has a stable `memberId`
- each member has a display name
- each member may have an optional color or similar lightweight visual marker
- work items, comments, and activity records reference members by ID

Local-machine rule:

- each installation can store the currently selected local member outside the shared project bundle
- selecting the local member is a per-machine preference, not a hosted-auth requirement

Non-goals for MVP identity:

- no mandatory accounts
- no public profile system
- no enterprise permission matrix
- no live-presence layer

## Assignee and My Work model for MVP

The MVP should optimize for solo users and small teams while leaving room for richer assignment later.

Recommended shape:

- each item has zero or one assignee in MVP
- assignees reference project members by `memberId`
- each machine stores the currently selected local member outside the shared project bundle
- `My Work` is a saved view filtered to the currently selected local member

Later expansion path:

- allow multiple assignees per item later if real usage justifies it
- add richer workload or team-planning semantics later rather than forcing them into MVP

Product rule:

- keep assignment simple and readable in MVP
- do not overbuild team workload management before the solo and small-team case feels excellent

## Activity and history model

The product should support both a simple human-readable activity view and a more advanced event/history view.

Recommended shape:

- store a structured event history under the hood rather than only storing pre-rendered feed text
- expose a simple default activity log for normal users
- expose an advanced history view for deeper inspection, troubleshooting, or future auditing needs
- render both views from the same underlying event data

Simple default activity view should focus on major user-meaningful actions such as:

- item created
- item edited
- status changed
- item moved
- comment added
- milestone assigned

Advanced history view should be able to show richer event detail such as:

- actor member reference
- timestamp
- command or action type
- before/after field changes where available
- source context such as UI, import, automation, or MCP bridge

Product rule:

- the default experience should stay readable and calm
- advanced history should exist without forcing audit-heavy UI on everyone
- the event model should be designed early enough that later auditing, undo-safe logging, or automation hooks do not require re-architecting

## Attachment model for MVP

Attachments should use a split model:

- attachment metadata lives in the project data model
- attachment files live beside the project bundle in an `attachments/` folder when the project is folder-backed

Recommended shape:

- the project bundle stores attachment IDs, filenames, media types, sizes, timestamps, and relationships to items or docs
- the actual binary payload is stored outside the main JSON bundle
- folder-backed projects should use a predictable sibling path such as `.pm-suite/attachments/`
- export/import flows should preserve both metadata and file payloads together where applicable

Product rule:

- do not embed attachment binaries directly into the main project bundle by default
- do not rely on fragile link-only references as the primary attachment model
- attachment support should respect the same local-first and portability principles as the rest of the project format

Preview and opening rule:

- provide sanitized inline previews for common images, plain text, and PDF files where the platform can do so safely
- open unsupported file types through the operating system or browser download/open flow
- never execute attachments inside the application
- treat active content, scripts, HTML, and unknown media types as downloads or external-open files rather than trusted inline content
- preview availability may differ by platform, but attachment durability and metadata remain shared

## Custom field model for MVP

The MVP should support project-defined typed custom fields as a first-class system.

Recommended built-in field types:

- text
- number
- select
- multi-select
- date
- checkbox

Core custom-field rule:

- projects may define reusable custom fields at the project level
- core items may store values for those fields in a stable, typed way
- board, backlog, table, filters, exports, automation, and future views should be able to consume those fields without depending on one specific plugin

Plugin-field rule:

- plugins may also store additional per-item data for their own behavior
- plugin-owned data must be preserved even if the plugin is disabled, removed, or temporarily unavailable
- plugin-owned data may be hidden from normal UI when its plugin is unavailable
- re-enabling or reinstalling the plugin and reopening the project should allow that plugin data to become usable again without loss

Product rule:

- do not treat plugin-owned fields as disposable
- do not force every specialized plugin field into the shared core custom-field system
- keep project-defined custom fields and plugin-owned extension data as compatible but distinct concepts

Applicability rule:

- a project-defined field may apply to every work-item type or declare an optional set of applicable `typeId` values
- changing an item to a type where a field is not applicable hides the field but does not delete its stored value
- changing back to an applicable type restores the preserved value
- filters, exports, automation, imports, and MCP/API clients must be able to distinguish an inapplicable field from an applicable field with no value

## Automation model for MVP

The MVP should support automation through a simple rule builder rather than a scripting-first system.

Recommended shape:

- users create rules from a trigger, optional conditions, and one or more actions
- the default automation experience should focus on common practical cases rather than open-ended programmability
- automation rules should be inspectable, editable, disableable, and understandable from the UI

Good MVP trigger examples:

- item created
- item updated
- status changed
- item moved on board
- milestone assigned
- due date changed

Good MVP action examples:

- set field
- add label
- move to status
- assign milestone
- create subtask
- generate document or note stub

Product rule:

- prefer a calm rule-builder UX over a power-user scripting surface in MVP
- keep the underlying automation engine structured enough that a scripting layer can be added later without replacing the model
- scripting-style automation is a future capability, not a day-one requirement

## Comment and discussion model for MVP

The MVP comment system should support real discussion, but keep the surface practical and readable.

Day-one requirements:

- Markdown comment bodies
- threaded replies
- comment editing
- visible edit history or diff view for edited comments
- delete behavior that preserves discussion integrity

Recommended shape:

- comments belong to items or docs
- top-level comments form a timeline
- replies form lightweight threads under a parent comment
- edited comments retain revision history rather than silently overwriting past content
- deleted comments should use a soft-delete or tombstone-style approach where practical so threads and history remain understandable

Product rule:

- keep mentions, notifications, and heavier discussion workflow features for later
- support real discussion from day one without turning comments into a full chat product
- comment history should align with the broader event/history model rather than becoming a separate disconnected system

## Notification and reminder model for MVP

The MVP should support local-only reminders and in-app notifications.

Recommended shape:

- reminder definitions travel with the project in a reminder-module section
- a reminder references its target, such as a work item or milestone, by stable ID
- reminder definitions use the date/timestamp model described above
- reminders are generated and handled on the local machine or in the local browser context
- in-app notifications surface relevant events such as due dates, assignments, or automation outcomes
- desktop builds may use local OS notification mechanisms where appropriate
- browser builds may use local browser notification capabilities only where they fit the local-first model and user permissions
- notification permission, delivery attempts, and machine-specific dismissal state stay outside the shared project bundle
- one shared project may therefore notify on more than one machine when each installation has local notifications enabled

Product rule:

- do not require a third-party notification service for core notification behavior
- do not make email, push, or cloud-mediated notification delivery part of the MVP baseline
- do not synchronize OS/browser permission or machine delivery state through the project file
- if broader notification delivery is explored later, prefer free/open-source or self-controlled approaches over mandatory dependency on an outside service

## Search model for MVP

Search should be a first-class local capability in the MVP.

Recommended shape:

- local full-text search across work items, docs, comments, and labels
- filters for common scopes such as type, status, assignee, milestone, label, and view
- search should feel shared across the product rather than bolted onto one screen

API and MCP rule:

- the same search capabilities should be exposed through the validated command/API/MCP surface where practical
- AI tools should be able to search and filter project content in ways comparable to a normal user
- search through the bridge should return structured results rather than raw unbounded dumps where possible

Product rule:

- keep search local-first and offline-capable
- do not make search depend on a remote indexing service

## Undo, redo, and backup model for MVP

The MVP should support local undo/redo for core user actions, backed by the command/event model, while also maintaining periodic backups when folder-backed storage is available.

Recommended shape:

- keep recent undo/redo history for the last user actions in the current session
- base undo/redo on the same command/event model used elsewhere in the app
- allow users to configure backup or snapshot behavior when the project is folder-backed
- keep periodic backups in a sibling snapshot or backup location rather than relying only on in-memory undo

Backup rule:

- folder-backed projects should be able to write scheduled or periodic backups
- backup cadence and retention should be user-configurable
- the app should keep the last so-many undoable changes in-session even when backups also exist
- backups should help recover from larger mistakes or crashes that exceed in-session undo history

Product rule:

- do not treat undo/redo as a substitute for durable backups
- do not treat backups as a substitute for fast user-facing undo/redo
- keep both features aligned with the local-first storage model

## Archive, trash, and permanent deletion model

Project records should have a consistent lifecycle instead of every feature inventing its own delete behavior.

MVP behavior:

- archive is the normal way to hide inactive records while keeping them available to history, references, filtered search, and restoration
- delete moves a supported record into project-level trash rather than immediately destroying it
- trashed records retain stable IDs, plugin-owned data, relationships, hierarchy information, comments, attachments, and history until explicitly purged
- restoring a record recovers the same record instead of creating a replacement with a new ID
- project trash travels with the canonical project bundle so shared-folder users see the same lifecycle state
- MVP does not automatically purge trash; permanent deletion is an explicit user action

Permanent deletion requirements:

- show an impact review before permanent deletion
- inspect parent and child links, relationships, comments, attachments, docs links or embeds, milestones, activity history, and known plugin references
- never silently cascade permanent deletion into related records
- require explicit handling choices when children or owned attachments would otherwise become orphaned
- preserve a minimal tombstone in immutable activity history when needed to keep historical events and discussions understandable
- unknown plugin-owned data must not be silently rewritten or discarded without a documented cleanup contract

Command parity:

- archive, move-to-trash, restore, inspect-deletion-impact, and permanent-delete operations use shared validated commands
- the UI, imports, automation, and optional MCP/API surface enforce the same lifecycle and reference rules
- permissions are not an MVP concern, but destructive commands still require deliberate confirmation

## Work-item duplication model

Users should be able to duplicate work without accidentally copying its audit trail or creating ambiguous shared identity.

Default duplication:

- creates a new work item with a new stable ID
- copies core editable fields, descriptions, dates, labels, milestone, assignee, typed custom-field values, checklists, and preserved per-item plugin data
- creates fresh checklist-entry and other child-value IDs where those IDs are independently addressable
- does not copy comments, activity history, reminders, trash state, or archival state
- does not copy relationships or attachments unless the user explicitly selects those options

Optional duplication:

- selected relationships may be recreated as new relationship records after validation
- selected attachments are copied as new attachment records and file payloads rather than creating unclear shared ownership
- known plugins may rewrite copied data through a deterministic clone hook
- when a plugin is absent, opaque per-item plugin data is copied under the new item ID without interpreting or deleting it

Command rule:

- duplication is one atomic, undoable validated command
- UI, automation, and MCP/API clients use the same duplication options and validation

## Recurring task direction

Recurring tasks should begin with a simple model and deliberately evolve toward more advanced recurrence over time.

Near-term direction:

- start with straightforward recurrence rules such as daily, weekly, and monthly
- create the next instance or occurrence predictably from the prior one
- keep the initial UX understandable for normal project work

Longer-term direction:

- grow toward richer recurrence rules
- add catch-up behavior controls, exceptions, and more advanced recurrence configuration later
- keep the initial model compatible with future expansion rather than replacing it outright

Product rule:

- favor a practical simple-first recurrence system before pursuing enterprise-grade recurrence complexity
- design the underlying model so the path from simple recurrence toward advanced recurrence is iterative rather than disruptive

## View model

All views operate over the same underlying project data.

### Board view

Purpose:

- day-to-day execution
- drag-and-drop flow
- WIP visibility

Capabilities:

- custom columns that may group one or more workflow statuses
- one default drop status per column
- WIP warnings by default, with optional hard enforcement per column
- swimlanes optional
- quick card actions
- filters

Board mapping rules:

- within one board, a workflow status may map to at most one column
- a board may omit statuses when it intentionally represents only part of the workflow
- dropping an item into a column applies that column's default drop status when the item's current status is not already mapped there
- board movement uses the shared validated workflow command rather than maintaining a competing board-only status
- hard WIP enforcement rejects UI, automation, import, and MCP/API moves consistently unless an explicit administrative override is introduced later

### Backlog view

Purpose:

- intake and prioritization

Capabilities:

- reorder items
- batch edit metadata
- convert ideas into tasks or bugs
- move items into milestones or active board states

### Table view

Purpose:

- dense project management
- triage
- bulk editing

Capabilities:

- sort, group, filter
- show/hide columns
- custom fields
- bulk status / milestone / assignee updates

### Bug triage view

Purpose:

- make issue tracking feel intentional, not bolted on

Capabilities:

- severity and priority filters
- repro-ready fields
- states such as new, confirmed, in progress, fixed, wont-fix
- dedupe / duplicate linking later

### Roadmap / timeline view

Purpose:

- see sequence, target windows, and dependencies

Capabilities:

- milestone lanes
- item bars by start/due date
- dependency lines
- zoom by week/month
- drag item bars to change dates
- resize item bars to change date ranges
- move items between milestone lanes where allowed

Note:

This is the lightweight Gantt-adjacent view. It exists for planning clarity, not enterprise command-and-control.

Editing rule:

- roadmap edits use the same validated date, milestone, and relationship commands as item details, automation, imports, and MCP/API clients
- drag and resize interactions must preserve date-only `YYYY-MM-DD` semantics and reject invalid ranges
- dependency constraints should be shown clearly; they should not silently reschedule other work unless a future explicit scheduling mode is enabled

### Docs view

Purpose:

- central project context

Capabilities:

- Markdown pages
- folders or sections for organization
- stable links between docs and work items
- wiki-style links between documents
- automatically derived backlinks
- embeds for project docs, work items, and attachments
- local full-text search
- project notes
- decisions
- release notes
- onboarding docs

## Docs model for MVP

Docs are a first-class project knowledge system in MVP rather than a plain collection of disconnected notes.

Recommended shape:

- each document has a stable `documentId`, title, Markdown body, creation timestamp, and update timestamp
- documents may belong to a folder or section
- documents can link to other documents and work items through stable IDs
- backlinks are derived from stored links rather than edited as separate data
- documents can embed project documents, work items, and project attachments
- docs participate in project-wide local search
- moving or renaming a document must not break ID-based links

MVP embed boundary:

- support structured internal embeds for project-owned content
- render external URLs as links or controlled previews where appropriate
- do not allow arbitrary executable HTML or scripts in document content

Product rule:

- docs should support lightweight wiki and knowledge-base workflows from day one
- keep authoring approachable through ordinary Markdown rather than requiring a specialized document language

## Feature set by release tier

## v1 must-have

- local project creation
- desktop project creation
- board view
- backlog view
- table view
- docs view
- roadmap/timeline view
- calendar view
- bug/task work item types
- bug triage workflow
- subtasks
- dependencies
- comments
- Markdown comments with threads, edit history/diff visibility, and delete behavior
- labels
- milestones
- saved views
- local full-text search across items, docs, comments, and labels with filters
- import/export JSON
- export Markdown and CSV
- dark mode and light mode
- PWA installability
- desktop packaging
- chosen-folder desktop project storage
- offline support
- shared-file collaboration via safe open/save/reload behavior

## v1 should-have

- templates
- keyboard shortcuts
- simple automation rule builder
- event-backed activity log with simple default view
- typed custom fields
- attachment support
- local-only reminders and in-app notifications
- local undo/redo plus user-configurable folder-backed backups or snapshots

## v1.5 / v2 candidates

- plugin marketplace or plugin loader
- GitHub import/export helpers
- recurring tasks, starting simple and growing toward advanced recurrence
- broader notification delivery options that do not require a mandatory third-party service
- multi-project dashboard
- collaborative sync backend
- deeper advanced history inspection tools
- scripting-style automation
- broader migration and export helpers

## Workflow model

### Status architecture

Projects may define and rename their own statuses, but every status maps to one stable semantic category.

Stable MVP categories:

- `planned` for work not currently being executed
- `active` for work in progress, blocked, under review, or otherwise still underway
- `completed` for successfully finished work
- `canceled` for work intentionally closed without completion

Recommended status shape:

- each status has a stable `statusId`
- each status has a user-editable name
- each status maps to exactly one stable category
- each status may have a color and deterministic order
- work items store `statusId`, not the category directly
- category-based progress, filtering, automation, and import/export semantics are derived through the referenced status

Project workflow configuration:

- each project identifies one default initial status in the `planned` category
- each project identifies one default completed status in the `completed` category
- projects may define multiple statuses in any category
- statuses such as `Blocked` and `Review` normally map to `active`
- archived statuses remain readable on historical items
- deleting a referenced status requires choosing a replacement status rather than silently orphaning items

Transition posture:

- status changes are flexible in MVP
- automation and commands validate that the target status exists
- optional constrained transitions may be added later without changing the category model

Product rule:

- users control the visible workflow language
- stable categories provide reliable completion, progress, search, automation, and interoperability semantics

### Default workflow

Suggested statuses:

- Inbox: `planned`
- Ready: `planned`
- In Progress: `active`
- Blocked: `active`
- Review: `active`
- Done: `completed`

### Bug workflow variant

- New: `planned`
- Confirmed: `planned`
- Ready: `planned`
- In Progress: `active`
- Fixed: `active`
- Verified: `completed`
- Closed: `completed`
- Won't Fix: `canceled`

### Rules

- users can rename statuses
- users can add/remove statuses
- users can reorder statuses and change their category mapping
- transitions are mostly flexible in v1
- stricter workflow rules can be an optional advanced mode later

## Project templates

### Minimum templates for launch

- simple kanban
- software project
- bug tracker
- release planner

### Template contents

- statuses
- default views
- default fields
- labels
- starter docs
- sample automation rules

### Template sources and portability

- ship useful bundled starter templates
- allow users to create a template from a project
- allow user-created templates to be renamed, duplicated, archived, imported, and exported
- template exports use a documented portable format and exclude project activity history, trash, comments, and machine-local settings by default
- template creation should offer clear choices for including starter items, docs, automations, attachments, and plugin configuration

### Standard default project profile

The standard new project should enable, by default:

- board
- backlog
- table
- docs
- roadmap
- calendar
- bug tracking
- labels
- milestones
- dates

Lighter templates can still enable a smaller subset.

### Default view instantiation

For a new standard project:

- instantiate `board`, `backlog`, and `table` immediately
- keep `docs`, `roadmap`, and `calendar` enabled but not instantiated until the user adds them
- provide an easy-to-find `Add View` action in the project UI

## First-launch requirements

- the installed desktop app should open to a blank workspace
- on first launch, the app should present a modal with `New Project`, `Open Project`, and `Demo Folder`
- project folder selection or linking should happen at the project level
- `New Project` should create the project first, then prompt to choose or link the project folder
- the installed app should not present browser-versus-install messaging after launch

## Theming and design requirements

- light mode
- dark mode
- system theme detection
- accessible contrast targets
- keyboard-navigable core workflows
- polished and friendly visual character
- balanced default information density
- subtle cricket and nature references rather than mascot-driven branding
- restrained natural-green accent direction
- lightly rounded layered surfaces
- desktop sidebar plus project view bar
- a core command palette covering navigation, item creation, search, view switching, and common item actions
- essential documented keyboard shortcuts backed by an extensible command registry
- clean, calm visual language
- no novelty branding that narrows the audience
- full interaction-state specifications across light and dark themes

## Accessibility requirements

- keyboard access for all primary actions
- visible focus states
- screen-reader friendly labels
- non-color-only status indicators
- reduced motion option

## Export and portability requirements

- every project must be exportable without paid features or server dependence
- core export format must be JSON
- human-readable export must include Markdown
- structured flat export must include CSV
- exported data should preserve ids, relationships, and metadata
- export design should favor formats that other tools can reasonably ingest when users choose to leave this app
- interoperability should be treated as a product value, not an afterthought

## Import and export priorities

Priority order:

- strong native `project.pms.json` support first
- strong Markdown and CSV export paths first
- GitHub import/export helpers soon after MVP
- broader migration and export helpers after that

Product rule:

- if users leave the app, they should not feel trapped
- prefer export shapes that are easy to inspect, transform, or import into other systems
- when perfect direct compatibility is not possible, favor exports that preserve the most useful structure in common formats

## Canonical project format requirements

- the primary durable project artifact should be a single portable bundle file
- the selected default shape is `project.pms.json`
- the bundle should be able to live inside a folder-backed workflow such as `.pm-suite/project.pms.json`
- the format should support sibling folders such as `attachments/`, `snapshots/`, or `exports/`
- attachments should be represented in bundle metadata but stored as separate files when the project is folder-backed

## Local-first requirements

- app must launch and function with no account
- app must be usable offline after install/load
- data loss protection should include autosave, undo/redo, and snapshot or backup strategy
- storage adapters must be abstracted

## Persistence trust requirements

- desktop folder-backed storage is the primary trusted persistence path
- hosted browser mode should use folder-backed persistence when supported by the browser platform
- browser-managed local storage must be clearly labeled when used
- users must be able to tell whether a project is folder-backed, browser-local, or unsaved
- the app should avoid implying that browser-managed storage is equivalent to user-controlled filesystem persistence

## Shared-file safety requirements

- the app must detect when a project file changes externally while open
- the app must notify the user before silently overwriting a newer on-disk version
- if the user has unsaved edits, the app should preserve them as temporary or pending state where possible
- the user should be able to reload the newer on-disk version and then resume or recover their pending changes
- shared-file workflows should be understandable to normal users without requiring Git knowledge

## Collaboration scope for MVP

The MVP should support collaboration through shared project files in trusted environments, not through built-in live sync.

That means:

- multiple installs may open the same project bundle from shared/internal storage
- the app must handle external file changes and recovery flows gracefully
- the app must not promise real-time presence, merging, or server-mediated collaboration in v1
- if richer sync is pursued later, it should arrive as a separate plugin/backend path rather than being folded into the local-first MVP by default

## Testing methodology

The implementation plan should enforce a strong testing methodology rather than treating tests as cleanup work.

Recommended defaults:

- use TDD or test-first development for domain logic, commands, migrations, and storage adapters
- write contract tests for every storage adapter so web and desktop obey the same persistence rules
- write schema and migration tests for the canonical project bundle format
- write component tests for project creation, board interactions, work-item editing, and conflict prompts
- write parity-focused end-to-end tests for critical web versus desktop behaviors
- require regression tests for every bug fix that changes core behavior

Testing layers:

- unit tests for domain rules and command handlers
- integration tests for storage, import/export, and module registration
- UI tests for critical workflows
- end-to-end tests for hybrid parity and packaged-app confidence

Release expectation:

- MVP should not be considered complete unless core domain tests, storage contract tests, and key parity flows are passing

## Hybrid distribution requirements

- browser/PWA and desktop builds must share one core domain model
- browser/PWA and desktop builds should share most UI components and feature behavior
- desktop builds must support opening or creating a project in a chosen folder
- browser/PWA builds should support opening or creating folder-backed projects where browser APIs allow it
- browser/PWA builds must support import/export parity with the desktop data format
- feature availability differences between browser and desktop must be explicit in the UI
- hosted browser mode should not overpromise permanence if filesystem guarantees differ from desktop
- hosted browser mode should act as a try-it/demo path as well as a lightweight usage path
- packaged local installs should be positioned as the preferred full-featured path

## Hosting requirements

- must be deployable to static hosting such as GitHub Pages
- must not require a server to function in the default mode
- must support PWA manifest and service worker setup
- internal or local-network-hosted use can be supported, but public internet exposure is not a current product goal

## Distribution requirements

- local builds should be distributable as normal user-friendly installers or packages
- the product should aim to support common desktop delivery expectations across Windows, macOS, and Linux
- users should not need a development environment to adopt the local version
- team usage can be satisfied by per-machine local installs that open the same project format, without requiring a one-host-many-users deployment model

## Local automation requirements

- the app should expose a local automation surface for AI-assisted setup and population
- the preferred model is command-oriented app actions rather than arbitrary raw-file mutation
- a local MCP-compatible bridge is a valid direction
- this automation surface is for local or trusted-environment use, not public remote API exposure
- the MCP bridge should be optional and discoverable from Settings or an equivalent integrations area
- the app should provide install/run instructions and a copyable config snippet for supported LLM tooling
- imports and AI-assisted setup flows should resolve through the same validated command surface
- the preferred internal shape is a generic command envelope with stable named command types
- the bridge should support arranging and modifying project state, not only inserting raw data
- board movement, ordering, workflow changes, view setup, and other normal user actions should be expressible through validated commands
- search and filtered retrieval should be expressible through the same validated bridge so AI tools can discover and navigate project data safely

## Deployment boundary requirements

- the product is not currently intended to be a public internet-facing self-hosted service
- internal-only or trusted-environment hosting is acceptable
- the initial product should optimize for local use and internal deployment, not internet hardening
- future public-hosting support, if pursued later, should be treated as a separate security and product scope decision
- collaboration assumptions should start from shared project files and per-user local installs before assuming centralized hosted access

## Open source and governance requirements

- use a permissive or copyleft license intentionally, not accidentally
- publish data format documentation
- document plugin/module APIs early
- avoid proprietary lock-in mechanics in core workflows

## Risks and design cautions

### Risk: becoming too Jira-like

Mitigation:

- protect the beginner path
- keep advanced workflow controls optional

### Risk: becoming too Trello-like

Mitigation:

- treat bugs, dependencies, milestones, and views as first-class

### Risk: filesystem support fragmentation between browser and desktop

Mitigation:

- make IndexedDB the baseline
- use native desktop adapters for canonical folder-backed workflows
- treat browser folder-backed workflows as progressive enhancement
- surface storage trust status clearly in the UI

### Risk: extension system complexity

Mitigation:

- define capability boundaries early
- keep core domain model stable and small

## Success criteria for an initial demo

- a user can create a project in under two minutes
- a user can plan work in board and backlog views without documentation
- a user can track a bug from intake to fixed state
- a user can export the project to disk
- a user can install the hosted app as a PWA
- a user can install the packaged desktop app and open a project folder
- a user can switch themes and retain preference
- a technically inclined user can understand where their data lives
- a user is warned if the project file changed externally and can recover gracefully

## Recommendation

Build the first version as a hybrid day-one product with:

- kanban board
- backlog
- table
- bug tracking
- milestones
- dependencies
- exports
- docs
- hosted PWA distribution
- packaged desktop distribution

Treat timeline/Gantt depth, advanced plugin loading, and collaborative sync as high-value next steps rather than prerequisites. Treat attachments as late-MVP or immediately-after-MVP depending on delivery pressure.

## Pending planning item

- finalize exact tokens, typeface choices, shell dimensions, and illustration details in `docs/specs/03-visual-and-interaction-design-spec.md` and `docs/specs/04-app-shell-and-core-screen-spec.md` while using `docs/specs/05-project-bundle-and-schema-spec.md` and `docs/specs/06-command-surface-spec.md` as implementation contracts
