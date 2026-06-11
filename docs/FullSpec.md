# Full Spec

## Purpose

This file is the single-file handoff version of the current research, product definition, architecture direction, module strategy, and phased implementation plan for the project.

It is intended to be easy to hand to a coding agent or implementation team without requiring them to assemble context from multiple documents.

If any other planning files disagree with this one later, this file should be treated as the current human-readable source of truth until superseded by a newer full spec.

## Product name

**Grillo Project Hub**, shortened to **GPH** where a compact name is useful.

## One-line concept

A free, open source, hybrid day-one project management suite for practical software work, combining a hosted PWA and a packaged desktop app around one shared core, with kanban-first usability, real bug tracking, lightweight roadmap/timeline support, and strong data ownership.

## Product posture

- hybrid from day one
- local-first in data philosophy
- open source and free
- modular and pluggable
- software-work-aware without being enterprise-heavy
- approachable for new software engineers without being themed around them
- not intended as a public internet-facing self-hosted service in the current product phases

## Intended audience

### Primary

- new software engineers
- solo developers
- indie teams
- open source maintainers
- technically comfortable planners who want more structure than a notes app

### Secondary

- product-minded makers
- designers working with technical collaborators
- hobby teams and small organizations

## Tone and positioning

The product should feel:

- practical
- clean
- trustworthy
- flexible
- calm

It should not feel:

- enterprise-first
- corporate-jargon-heavy
- novelty-branded around "vibe coding"
- locked to a single workflow ideology

Suggested positioning:

"A free, open source project planning and issue tracking suite for real software work."

## Why this product should exist

There is still room for a tool that is:

- lighter than Jira
- more structured than Trello
- more beginner-friendly than many self-hosted PM tools
- more portable and export-friendly than SaaS-first tools
- more modular than single-opinionated board apps

The opportunity is not "build another enterprise ALM suite." The opportunity is "build a trustworthy, human-scaled workbench for planning and tracking software work."

## Competitive and product research takeaways

### Trello lessons worth borrowing

- boards, lists, and cards remain easy to understand
- checklists, labels, due dates, and drag-and-drop matter
- simplicity is part of the product value

Implications:

- kanban should be first-class on day one
- task detail should stay lightweight by default
- advanced functionality should be layered in, not forced immediately

### GitHub Issues and Projects lessons worth borrowing

- one shared work-item model can power multiple views
- board, table, backlog, roadmap, filters, grouping, custom fields, and milestones all matter
- bugs, tasks, ideas, hierarchy, and dependencies should coexist

Implications:

- the core object should support both task and issue use cases
- multiple views over one shared model matter more than disconnected feature silos
- hierarchy and dependency support should be clear and readable

### Jira lessons worth borrowing

- configurable workflows matter
- automation matters
- templates matter
- flexibility has value when it is not buried in admin friction

Implications:

- users should be able to customize statuses, views, fields, and templates
- automation should exist, but begin lightly
- avoid turning the product into an admin maze

### OpenProject lessons worth borrowing

- broader project-management views can be useful
- Gantt/timeline, docs, and roadmap capabilities have real value
- all-in-one scope can easily get heavy

Implications:

- timeline/Gantt should exist
- timeline/Gantt should not dominate the product identity
- budgeting, cost, and heavyweight governance features should not be core

### Kanboard lessons worth borrowing

- WIP limits are useful
- simple workflows can still be powerful
- automations can stay approachable
- plugin ecosystems are valuable in open source tools

Implications:

- WIP limits belong in the board model
- automation rules are worth planning for early
- extensibility must be designed early

### Taiga lessons worth borrowing

- backlog plus board is a strong pairing
- open source users still want real software workflow support
- migration and import/export matter for adoption

Implications:

- software-oriented workflows are a strength, not a liability
- import/export and migration helpers should matter from the start

## Product goals

- help people plan and track work without forcing enterprise ceremony
- work well for solo builders and small teams
- feel approachable for newer software engineers
- support serious issue and bug tracking, not only generic task cards
- ship as both a hosted PWA and a packaged desktop app from the first release
- share as much UI and product logic as possible across web and desktop
- give users strong control over where their data lives
- stay highly customizable through modules, fields, templates, automations, and plugins

## Non-goals for the first major version

- replacing every enterprise Jira workflow
- ITSM or service desk scope
- budgeting and resource management suites
- mandatory cloud accounts
- real-time multiplayer as a hard requirement
- built-in live sync or one-host-many-users collaboration as an MVP requirement
- large-scale enterprise governance features

## Product principles

### 1. Hybrid from day one

The product must ship as:

- a hosted installable PWA
- a packaged local desktop app

These should feel like two distributions of one product, not two separate products.

### 2. Local-first in data philosophy

Core use must work with:

- no account
- no backend
- offline support after install/load
- transparent storage and export behavior

### 3. Kanban first, not kanban only

Board workflows should feel excellent, but the same data model must power:

- board
- backlog
- table
- docs
- bug triage
- roadmap/timeline

### 4. Structured enough for software work

These must be first-class:

- tasks
- bugs
- milestones
- subtasks
- dependencies
- comments
- checklists
- status workflows

### 5. Modular by design

Views, fields, automations, templates, import/export formats, and integrations should be extensible without destabilizing the core domain model.

### 6. Beginner-safe defaults

New users should be able to create a project and start tracking work without learning a configuration system first.

### 7. Open-source trust

The product should visibly respect user ownership through:

- exportability
- inspectable formats
- explicit permissions
- no hidden mandatory network model

### 8. Test-first implementation

The product should be implemented with a strong testing discipline, preferably TDD or test-first development, especially for the shared core, command model, storage adapters, migrations, and hybrid parity-sensitive behaviors.

## Supported modes from day one

### Hosted PWA mode

Characteristics:

- deployable to GitHub Pages or similar static hosting
- fully client-side
- installable
- offline-capable
- can serve as the easiest try-it/demo entry point
- should support user-chosen folder workflows where the browser allows it
- should clearly communicate when data is only stored in browser-managed storage
- should not overpromise the same permanence guarantees as desktop folder-backed storage
- should encourage users who want durable long-term use to install or self-host the full app

### Desktop mode

Characteristics:

- packaged desktop app
- can create or open a project in a chosen folder
- can use native filesystem adapters
- shares the same core domain model and most of the UI
- should be positioned as the preferred full-featured adoption path
- should support a per-machine install model similar to desktop creative/developer tools

## Recommended product shape

The product should be:

- task-first instead of process-first
- modular instead of monolithic
- software-work-aware without requiring scrum orthodoxy
- solo-friendly but not limited to solo users

This suggests a shared work-item model with multiple views:

- board
- backlog
- table
- bugs / triage
- roadmap
- docs
- my work

## Core entities

### Workspace

Top-level container for:

- projects
- global settings
- templates
- integrations
- user preferences

### Project

A bounded collection of:

- work items
- views
- workflow settings
- milestones
- docs
- attachments
- project-level automations

### Work item

Primary unit of planning and tracking.

Supported initial types:

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

Groups work toward:

- releases
- checkpoints
- goals
- shipping targets

### View

Saved presentation of project data, such as:

- board
- backlog
- table
- roadmap
- docs
- my work
- bugs

### Document

Project note or Markdown page used for:

- onboarding
- design notes
- release notes
- meeting notes
- decisions

### Attachment

Binary or linked file associated with a work item or project.

### Member

Lightweight project person record used for assignment, authorship, and activity history.

## Core work-item fields

### Required in v1

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

### Strongly recommended for early expansion

- attachments
- custom fields

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
- choosing the local member is a per-machine preference, not a hosted-auth requirement

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
- filters, exports, automation, imports, and MCP/API clients distinguish an inapplicable field from an applicable field with no value

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

The project uses one coherent record lifecycle across core entities and module-owned data.

MVP behavior:

- archive removes inactive records from default views without destroying identity, data, references, or history
- delete moves supported records into project-level trash
- trash is canonical project data and therefore travels with the project bundle and remains consistent for shared-folder users
- trashed records retain stable IDs, hierarchy, relationships, comments, attachments, plugin-owned data, and activity references until permanent deletion
- restore revives the same stable record rather than cloning it into a new identity
- MVP performs no automatic trash purge; permanent deletion is explicit

Permanent deletion requires a reference-impact review covering:

- parent and child work items
- normalized work-item relationships
- comments and discussion threads
- attachments and attachment metadata
- docs links, backlinks, and embeds
- milestones and view references
- activity and event history
- known plugin-owned references and cleanup hooks

Safety rules:

- never silently cascade permanent deletion
- require an explicit handling choice for children, owned files, and other records that would become invalid
- preserve a minimal tombstone in immutable activity history where removing all identifying context would make history or discussion misleading
- unknown plugin namespaces remain opaque and must not be silently mutated or discarded without a declared cleanup policy
- archive, move-to-trash, restore, impact inspection, and permanent deletion are shared validated commands used equally by UI, automation, imports, and MCP/API clients

## Work-item duplication model

Duplication creates reusable work without copying audit history or creating ambiguous identity.

Default duplication:

- creates a new work item with a new stable ID
- copies core editable fields, descriptions, dates, labels, milestone, assignee, typed custom-field values, checklists, and preserved per-item plugin data
- creates fresh checklist-entry and other independently addressable child-value IDs
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

## View system

All views operate over the same underlying project data model.

### Board view

Purpose:

- day-to-day execution
- drag-and-drop planning
- flow visibility

Capabilities:

- custom columns that may group one or more workflow statuses
- one default drop status per column
- WIP warnings by default, with optional hard enforcement per column
- optional swimlanes
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

- intake
- prioritization
- grooming

Capabilities:

- reorder items
- batch edit metadata
- move items into milestones
- promote ideas into actionable work

### Table view

Purpose:

- dense management
- triage
- bulk editing

Capabilities:

- sort
- group
- filter
- show/hide columns
- custom field visibility
- bulk status and milestone changes

### Bug triage view

Purpose:

- intentional issue handling

Capabilities:

- severity and priority filters
- bug-specific states
- reproduction-focused fields
- later duplicate linking

Suggested bug statuses:

- new
- confirmed
- ready
- in progress
- fixed
- verified
- closed

### Roadmap / timeline view

Purpose:

- sequence planning
- target windows
- milestone visibility
- dependency awareness

Capabilities:

- milestone lanes
- item bars by start/due date
- dependency lines
- zoom by week or month
- drag item bars to change dates
- resize item bars to change date ranges
- move items between milestone lanes where allowed

Product rule:

This is a lightweight Gantt-adjacent view for clarity, not the center of the app.

Editing rule:

- roadmap edits use the same validated date, milestone, and relationship commands as item details, automation, imports, and MCP/API clients
- drag and resize interactions preserve date-only `YYYY-MM-DD` semantics and reject invalid ranges
- dependency constraints are shown clearly but do not silently reschedule other work unless a future explicit scheduling mode is enabled

### Docs view

Purpose:

- keep project context near execution work

Capabilities:

- Markdown pages
- folders or sections for organization
- stable links between docs and work items
- wiki-style links between documents
- automatically derived backlinks
- embeds for project docs, work items, and attachments
- local full-text search
- design notes
- release notes
- onboarding docs
- decisions

### Docs model for MVP

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

- Inbox: `planned`
- Ready: `planned`
- In Progress: `active`
- Blocked: `active`
- Review: `active`
- Done: `completed`

### Bug workflow

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
- users can add or remove statuses
- users can reorder statuses and change their category mapping
- transitions are mostly flexible in v1
- stricter transition enforcement can be optional later

## Project templates

### Minimum launch templates

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
- sample automations

### Template sources and portability

- ship useful bundled starter templates
- allow users to create a template from a project
- allow user-created templates to be renamed, duplicated, archived, imported, and exported
- template exports use a documented portable format and exclude project activity history, trash, comments, and machine-local settings by default
- template creation offers clear choices for including starter items, docs, automations, attachments, and plugin configuration

## Feature scope by tier

### v1 must-have

- local project creation in browser
- project creation/opening in desktop app
- board view
- backlog view
- table view
- docs view
- bug-tracking workflow and bug triage support
- roadmap/timeline view
- calendar view
- bug and task work-item types
- subtasks
- dependencies
- comments
- Markdown comments with threads, edit history/diff visibility, and delete behavior
- labels
- milestones
- saved views
- local full-text search across items, docs, comments, and labels with filters
- JSON import/export
- Markdown export
- CSV export
- dark mode
- light mode
- PWA installability
- desktop packaging
- chosen-folder desktop project storage
- offline support

### v1 should-have

- templates
- keyboard shortcuts
- attachment support
- simple automation rule builder
- event-backed activity log with simple default view
- typed custom fields
- local-only reminders and in-app notifications
- local undo/redo plus user-configurable folder-backed backups or snapshots

### v1.5 / v2 candidates

- GitHub import/export helpers
- recurring tasks, starting simple and growing toward advanced recurrence
- broader notification delivery options that do not require a mandatory third-party service
- multi-project dashboard
- plugin marketplace or plugin loader
- collaborative sync backend
- deeper advanced history inspection tools
- scripting-style automation
- broader migration and export helpers

### Not core for the first release

- budgeting
- cost reporting
- resource capacity planning
- ITSM/service desk features
- enterprise permission matrices
- CRM-like features

## UX requirements

- a new user can create a project and understand the main board quickly
- advanced customization exists but does not block getting started
- bug tracking must feel intentional, not bolted on
- timeline/Gantt must be available but visually subordinate to board/backlog workflows
- the UI should feel calm, not noisy or enterprise-bloated

## Visual and theming requirements

- light mode
- dark mode
- system theme detection
- accessible contrast
- polished and friendly visual character
- balanced default information density
- subtle cricket and nature references rather than mascot-driven branding
- restrained natural-green accent direction
- lightly rounded, layered surfaces with restrained borders and elevation
- desktop-style sidebar plus project view bar as the primary shell
- a core command palette covering navigation, item creation, search, view switching, and common item actions
- essential documented keyboard shortcuts backed by an extensible command registry
- clean, calm visual language
- no novelty branding that narrows the audience
- full state specifications for interactions, loading, empty states, errors, drag-and-drop, keyboard focus, external changes, and reduced motion

The dedicated visual foundation lives in `docs/specs/03-visual-and-interaction-design-spec.md`.
The screen-by-screen shell and core workflow spec lives in `docs/specs/04-app-shell-and-core-screen-spec.md`.
The canonical bundle contract lives in `docs/specs/05-project-bundle-and-schema-spec.md`.
The shared validated command contract lives in `docs/specs/06-command-surface-spec.md`.

## Accessibility requirements

- keyboard access for all primary flows
- visible focus states
- screen-reader friendly labels
- non-color-only status signals
- reduced motion option

## Storage, hosting, and data model strategy

## Core requirement

The app must support:

- hosted browser operation
- local packaged desktop operation
- a shared export format
- transparent data ownership

## Browser/PWA storage baseline

Recommended posture:

- browser storage is a compatibility layer, not the strongest permanence model
- hosted browser mode should attempt explicit user-chosen folder access where supported
- browser mode can use IndexedDB or similar local browser storage, but the product should message this as lower-trust persistence than user-controlled folder storage

Why:

- browser-managed persistence can be fragile or confusing
- the product promise is strong data ownership
- users should always understand whether their project is folder-backed or browser-local

## Browser progressive enhancements

Use where available:

- File System Access API for explicit folder/file workflows
- OPFS for performance-oriented local file-like storage

These should enhance the browser version, not define the only persistence path.

## Desktop storage baseline

Recommended default:

- native filesystem adapter through the desktop shell

Capabilities:

- create/open a project in a chosen folder
- read/write canonical project bundle
- manage attachments and snapshots locally

## Storage architecture rule

Never couple the product model to one storage mechanism.

The shared app model should work over adapters for:

- browser database storage
- browser file storage
- desktop filesystem storage
- future sync backends

## Folder-based project model

The "point this at a folder" requirement can mean two valid modes:

### Mode A: canonical project data lives in a chosen folder

Example:

- `.pm-suite/project.json`
- attachments and snapshots near it

Benefits:

- transparent ownership
- easy backup
- Git-friendly if text-first

Risks:

- conflict management
- browser support variance

### Mode B: app links to an existing workspace folder

Example:

- tracks work in app data
- associates that project with a repo/workspace folder
- later may index nearby docs or metadata

Benefits:

- lower implementation risk
- easier cross-mode support

Risks:

- less transparent than Mode A if not explained clearly

### Recommendation

For day-one hybrid delivery:

- desktop mode is the primary trusted persistence mode and supports canonical folder-backed storage
- browser/PWA mode supports the same project model and import/export format, should use user-chosen folder access where available, and should surface when persistence is browser-managed
- both share one bundle format and one domain model

## Recommended persistence policy

The product should optimize for trust over convenience theater.

Recommended policy:

- canonical durable project data lives as a portable project bundle in a user-controlled folder
- desktop mode is the first-class experience for reliable long-term storage
- hosted PWA mode should use folder-backed persistence when browser APIs allow it, but if it cannot guarantee that behavior, it should say so clearly
- browser-only persistence can exist as a temporary or convenience layer, but not as the most trusted default story
- folder-backed projects should support periodic backups or snapshots with user-controlled cadence and retention

### Suggested storage status UX

- show a visible storage status badge such as `Folder-backed`, `Browser-local`, or `Unsaved`
- explain the difference on first project creation/open
- encourage export/open flows early in hosted mode
- include a clear CTA from hosted mode to install the desktop app for the strongest persistence guarantees

### Desktop default location recommendation

For packaged desktop users:

- default to a user-owned data location or prompt for a project folder on first use
- do not assume the installed application directory is the right long-term write location

For local development:

- a repo-local `projects/` folder ignored by Git is reasonable as a development convenience

## Distribution and adoption strategy

Recommended posture:

- hosted web app acts as a low-friction way to try the product
- packaged local app is the primary recommendation for real adoption
- internal/shared-file workflows can support team usage without requiring a one-host-many-users product model

### Recommended user messaging

- `Try in browser` for evaluation and lightweight usage
- `Install locally` for the full durable experience
- `Share project files internally` for trusted team workflows
- `Run internally` is a secondary/internal deployment framing, not the primary collaboration story

### Installed app first-run behavior

The installed desktop app should open to a blank workspace and immediately present a modal with:

- `New Project`
- `Open Project`
- `Demo Folder`

Rules:

- do not show browser-versus-install messaging inside the installed app
- folder linking happens at the project level, not as a global app-level prerequisite
- `New Project` should create the project first, then prompt to choose or link a folder
- `Open Project` should open an existing project bundle or folder-backed project
- `Demo Folder` should open a sample/demo project structure for exploration

### Installer expectation

The local app should be distributed as normal user-friendly installers or packages so users do not need a development environment.

Target shapes:

- Windows installer/executable path
- macOS app bundle / DMG
- Linux packaging such as Debian and RPM where supported by the chosen desktop toolchain

### Recommendation against a separate online/offline product split

Do not create a separate product mode with a different storage philosophy unless there is a strong later need.

Instead:

- keep one domain model
- keep one bundle format
- vary only the storage adapter and trust messaging

## Canonical project format direction

Current recommendation:

- use a single canonical portable project bundle as the primary durable format
- allow that bundle to live inside a folder-backed project workflow
- leave room for a richer multi-file folder layout later if needed for attachments, indexing, or human readability
- this is now the selected direction for the project

### Selected default shape

Recommended primary artifact:

- `project.pms.json` as the canonical project bundle

Recommended folder layout:

- `.pm-suite/project.pms.json`
- `.pm-suite/attachments/`
- later optional sibling folders such as `snapshots/` or `exports/`

Attachment rule:

- attachment metadata lives in the bundle while attachment binaries live in `attachments/` for folder-backed projects

Why:

- simpler for import/export
- easier to explain to contributors and users
- easier to keep browser and desktop parity early

## Canonical bundle data model

The project bundle should use a small shared kernel plus plugin-owned sections.

The important distinction is:

- a work item is a stable shared record
- a plugin adds behavior, presentation, and plugin-specific data by referencing the item ID
- using an item on a Kanban board does not permanently convert it into a special "Kanban item"

This allows the same item to appear in a board, table, backlog, calendar, roadmap, or bug view without duplicating the item or changing its identity.

### Proposed top-level sections

`format`

- identifies this as a project bundle
- tells newer app versions how to read or migrate an older file

`project`

- identifies the project
- stores project-level name and timestamps
- stores a revision number used to detect external changes

`core`

- stores stable records shared across modules
- includes general items and universal reference information needed to keep the file coherent

`modules`

- stores configuration and data owned by each enabled or previously used module
- keys use stable module IDs such as `builtin.kanban`

`projectSettings`

- stores settings that should travel with the project
- must not contain machine-specific paths or personal UI preferences
- references to module-owned views must have a safe fallback if that module is disabled

### Concrete example

```json
{
  "format": {
    "type": "project-management-suite",
    "version": 1
  },
  "project": {
    "id": "project_01",
    "name": "Example Project",
    "revision": 12,
    "createdAt": "2026-06-10T17:00:00Z",
    "updatedAt": "2026-06-10T18:15:00Z"
  },
  "core": {
    "itemTypes": {
      "defaultTypeId": "task",
      "definitions": [
        {
          "id": "task",
          "name": "Task",
          "icon": "check-square",
          "order": 1024,
          "defaultStatusId": "inbox",
          "defaultPriorityId": null
        },
        {
          "id": "bug",
          "name": "Bug",
          "icon": "bug",
          "order": 2048,
          "defaultStatusId": "new",
          "defaultPriorityId": null
        }
      ]
    },
    "items": {
      "item_01": {
        "id": "item_01",
        "typeId": "task",
        "title": "Add project import",
        "description": "Allow a project bundle to be opened from disk.",
        "startDate": "2026-06-10",
        "dueDate": "2026-06-12",
        "createdAt": "2026-06-10T17:10:00Z",
        "updatedAt": "2026-06-10T18:10:00Z"
      }
    },
    "relationships": []
  },
  "modules": {
    "builtin.workflow": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {
        "initialStatusId": "inbox",
        "completedStatusId": "done",
        "statuses": [
          { "id": "inbox", "name": "Inbox", "category": "planned", "order": 1024 },
          { "id": "ready", "name": "Ready", "category": "planned", "order": 2048 },
          { "id": "in-progress", "name": "In Progress", "category": "active", "order": 3072 },
          { "id": "done", "name": "Done", "category": "completed", "order": 4096 }
        ],
        "priorities": [
          { "id": "low", "name": "Low", "rank": 100, "color": "blue" },
          { "id": "medium", "name": "Medium", "rank": 200, "color": "yellow" },
          { "id": "high", "name": "High", "rank": 300, "color": "orange" },
          { "id": "urgent", "name": "Urgent", "rank": 400, "color": "red" }
        ]
      },
      "data": {
        "itemState": {
          "item_01": {
            "statusId": "in-progress",
            "priorityId": "high"
          }
        }
      }
    },
    "builtin.kanban": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {
        "views": {
          "view_main_board": {
            "id": "view_main_board",
            "name": "Main Board",
            "columns": [
              { "id": "todo", "title": "To Do", "statusValues": ["inbox", "ready"] },
              { "id": "doing", "title": "Doing", "statusValues": ["in-progress"] },
              { "id": "done", "title": "Done", "statusValues": ["done"] }
            ]
          }
        }
      },
      "data": {
        "placements": {
          "view_main_board": {
            "item_01": {
              "columnId": "doing",
              "position": 1024
            }
          }
        }
      }
    },
    "builtin.docs": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {},
      "data": {
        "documents": {}
      }
    },
    "builtin.reminders": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {},
      "data": {
        "reminders": {
          "reminder_01": {
            "reminderId": "reminder_01",
            "targetType": "workItem",
            "targetId": "item_01",
            "remindAt": "2026-06-12T16:00:00Z",
            "timeZone": "America/Los_Angeles"
          }
        }
      }
    }
  },
  "projectSettings": {
    "defaultViewId": "view_main_board"
  }
}
```

### What the version fields mean

`format.version`

- version of the entire project-file structure
- incremented only when the overall bundle shape changes incompatibly
- allows the app to migrate an older project safely

`modules.<moduleId>.schemaVersion`

- version of one module's private data shape
- lets a Kanban module update its own data without changing unrelated modules

`project.revision`

- increments on each successful save
- helps detect that another app instance saved a newer copy
- is not a file-format version

### Ownership rules

- core owns item identity and universal content needed even when feature modules are unavailable
- modules own only their configuration and specialized data
- modules reference core records by stable ID
- modules must not copy entire work items into their own sections
- unknown module sections must be preserved unchanged when saving
- disabling or uninstalling a module hides its behavior but does not automatically delete its stored data

### Project-defined custom fields versus plugin-owned fields

These are related but should not be treated as the same system.

Project-defined custom fields:

- are defined at the project level
- use a small typed core set in MVP
- should be readable by generic views such as board, table, backlog, filters, exports, and automation

Recommended MVP field types:

- text
- number
- select
- multi-select
- date
- checkbox

Plugin-owned fields:

- belong to the plugin or module that introduces them
- may be stored in namespaced item metadata or in module-owned sections keyed by item ID
- may drive specialized behaviors that generic views do not fully understand

Preservation rule:

- plugin-owned data must survive plugin disable, removal, absence, and re-enable cycles
- if a project is opened without a plugin present, that plugin's data should remain stored but hidden or inactive in the UI
- reopening the same project after the plugin is restored should allow the plugin to recover its previous data without loss

Boundary rule:

- do not force every plugin field into the project-level custom-field registry
- do not let plugin removal silently delete or flatten plugin-owned data into unrelated core fields

### Status and Kanban consistency

Status should not be Kanban-owned because backlog, table, filtering, automation, and reporting may all need it.

Recommended ownership:

- a foundational workflow module owns statuses and priorities
- Kanban declares a dependency on that workflow capability
- table, backlog, filters, and automation can consume the same workflow capability

Kanban owns:

- columns
- column-to-status mappings
- card ordering
- swimlanes
- WIP limits
- board-specific visual settings

The workflow module owns:

- the item's current status value
- priority
- workflow definitions

Core owns:

- the item's identity
- title and description
- universal timestamps

Moving a card can update workflow state through a documented command. The Kanban module then updates only board-specific placement data.

### Hybrid ownership for labels, milestones, and dates

Labels, milestones, and dates should use hybrid ownership rather than living entirely in core or entirely in one plugin.

Core work items may safely store:

- `labelIds`
- `milestoneId`
- `startDate`
- `dueDate`

Planning-oriented modules own:

- label definitions, colors, grouping helpers, and label-management UI
- milestone definitions, milestone metadata, release-oriented rules, and milestone views
- date-related visualization rules, scheduling helpers, roadmap behavior, and calendar behavior

This keeps the item portable across board, backlog, table, bug tracking, roadmap, calendar, exports, and automations while still allowing planning features to remain modular.

### Label model for MVP

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

### Milestone and release model for MVP

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

### Calendar model for MVP

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

### Planning date and reminder precision

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

### Multiple views

One item may appear in multiple boards or other views.

Therefore:

- placement must be stored per view and per item
- a module must not store one global `viewId` on the item
- view membership may be explicit or derived from filters
- ordering belongs to the specific view, not to the core item

### Item types and plugin specialization

The base item should remain useful without specialist modules.

When a module needs specialized fields, it should store them in its own section keyed by item ID.

Example:

```json
{
  "modules": {
    "builtin.bugs": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {
        "applicableTypeIds": ["bug"],
        "severities": [
          { "id": "minor", "name": "Minor", "rank": 100, "color": "blue" },
          { "id": "major", "name": "Major", "rank": 200, "color": "orange" },
          { "id": "critical", "name": "Critical", "rank": 300, "color": "red" },
          { "id": "blocker", "name": "Blocker", "rank": 400, "color": "dark-red" }
        ]
      },
      "data": {
        "itemState": {
          "item_02": {
            "severityId": "critical",
            "reproductionSteps": [
              {
                "reproductionStepId": "step_01",
                "text": "Open **Settings**.",
                "order": 1024
              },
              {
                "reproductionStepId": "step_02",
                "text": "Select **Import project**.",
                "order": 2048
              }
            ],
            "expectedBehavior": "The project picker opens.",
            "actualBehavior": "The application closes without an error message.",
            "environment": "Windows 11, desktop package 0.1.0",
            "affectedVersion": "0.1.0"
          }
        }
      }
    }
  }
}
```

The item remains a core item. The bug module contributes extra behavior and fields.

Projects use the core `typeId` registry for display and filtering. Modules may augment registered types or contribute namespaced type IDs, but the item must remain accessible when the contributing module is absent.

### Module dependencies

Modules must declare capabilities they require rather than reaching into another module's private data.

Examples:

- Kanban requires the workflow-status capability.
- Roadmap may require date fields and optionally milestone capability.
- Bug tools may work without Kanban.

If a user tries to disable a module that another enabled module depends on, the app should:

- explain the dependency
- offer to disable the dependent modules too
- never leave the project in a silently broken state

### Required non-plugin kernel

Not everything can be removable. A small application kernel must always exist to handle:

- opening and validating bundles
- stable IDs and references
- saving and conflict detection
- format and module migrations
- module registration and permissions
- preservation of unknown module data

Boards, docs, tables, bug tools, roadmap, attachments, imports, and similar product areas can still use module boundaries. The kernel is what makes those modules safe to add or remove.

The same kernel should expose a command-oriented automation surface for local AI or MCP integrations rather than forcing those tools to mutate raw files directly.

### Project settings versus personal settings

Project settings travel inside `project.pms.json`.

Examples:

- default shared workflow
- enabled modules
- project templates or conventions

Personal or machine-specific settings must remain outside the project bundle.

Examples:

- dark/light preference
- recent project list
- window size
- local absolute paths
- personal panel layout

This prevents one user's preferences from rewriting the shared project file for everyone else.

## Shared-file workflow and conflict handling

Because multiple per-machine installs may open the same project bundle from shared/internal storage, the app must handle external file changes gracefully.

### Required behavior

- detect when the underlying project file changes outside the current running app
- notify the user clearly that the project changed on disk
- let the user choose to reload the newest disk version
- preserve unsaved in-memory edits as temporary or pending work where possible
- allow the user to resume from their pending changes after the newer file version is loaded

### UX expectations

The app should avoid a panic-inducing or destructive flow.

Preferred interaction:

- show a clear non-technical notice when the file changed externally
- explain whether the current user has unsaved edits
- offer options such as `Reload from disk`, `Keep my pending changes`, or `Save my copy separately`

### Product boundary

This is not full real-time collaborative editing.

It is graceful shared-file conflict handling for trusted environments where:

- multiple local installs may access the same project file
- shared folders or network storage may be used
- users need protection from silent overwrite and confusion

### Collaboration decision for MVP

For the MVP, collaboration means safe shared-file usage in trusted environments, not built-in live sync.

That means:

- multiple per-machine installs may open the same project bundle
- the app handles external changes, reload prompts, and recovery of pending edits
- the app does not attempt real-time collaboration, background presence, or server-mediated merging in v1
- if richer sync is pursued later, it should be designed as a separate plugin/backend subsystem with its own plan

### Implementation direction

- include file-change detection in desktop mode
- compare file version markers, timestamps, hashes, or equivalent signals
- preserve a recoverable temporary working state when an external change is detected
- make conflict recovery understandable without forcing users into a Git-like workflow

## Export and import requirements

### Required formats

- JSON project bundle
- Markdown export
- CSV export for work items

Interoperability rule:

- export design should favor formats that other tools can reasonably ingest when users choose to leave this app
- interoperability should be treated as a product value, not an afterthought
- when perfect one-click compatibility is not possible, exports should still preserve useful structure in inspectable common formats

### Strongly recommended

- printable HTML report
- ZIP bundles with metadata and attachments

### Later migration helpers

- GitHub Issues/Projects import/export helpers
- Jira CSV import mapping
- Taiga / Kanban-oriented import helpers

Priority order:

- strong native `project.pms.json` support first
- strong Markdown and CSV export paths first
- GitHub import/export helpers soon after MVP
- broader migration and export helpers after that

## Hybrid distribution requirements

- browser/PWA and desktop builds share one core domain model
- browser/PWA and desktop builds share most UI behavior and components
- desktop builds support opening or creating a project in a chosen folder
- browser/PWA builds support import/export parity with the desktop format
- differences in platform capabilities are explicit in the UI

## Open source and trust requirements

- no required account to start
- no hidden mandatory network dependence
- explicit permission prompts before filesystem access
- visible status showing where a project is stored
- data export must not be paywalled or gated
- data format documentation should be published

## Hosting and exposure boundary

For the current product phases, the system is not intended to be a public internet-facing self-hosted service.

Current intended deployment postures:

- local desktop installation
- hosted browser demo/try-it experience
- internal-only or local-network-hosted deployments for trusted environments
- team usage primarily through per-machine installs that open the same project format, optionally from shared/internal storage

Not the current goal:

- exposing the app directly to the public internet
- treating the project as an internet-hardened security exercise
- prioritizing public SaaS-style hosting concerns over local/internal usability

Product implication:

- internal hosting can exist, but should be framed as trusted-environment use rather than public-service operation
- team collaboration does not need to mean many users connecting to one hosted instance; it can mean each user runs the app locally and opens shared project files
- future public-hosting support, if ever pursued, should be treated as a separate product and security decision

## Local automation and AI bridge

The app should plan for a local-only automation surface so AI tools can communicate with the app and populate project data safely.

Recommended posture:

- expose a local app automation API or MCP-friendly bridge
- keep it local or trusted-environment only in the current product phases
- do not treat this as a public remote API surface
- make the bridge completely optional rather than a required product feature for ordinary users

### Intended uses

- create or open projects
- populate items, milestones, labels, docs, and views
- import structured plans
- run app actions with explicit permissions
- help users set up projects quickly through AI-assisted workflows

### Command model

Recommended shape:

- use a generic command envelope internally, such as `runCommand(type, payload)`
- publish a stable set of named command types through that envelope
- treat imports and higher-level setup flows as compositions of those same commands

Example command families:

- project commands
- item commands
- workflow commands
- board/view commands
- docs commands
- module enable/disable commands

### User-facing product shape

- expose the bridge from Settings or a similar clearly optional integration area
- provide setup instructions for installing or enabling the MCP bridge
- provide instructions for how to run it locally
- provide a copyable JSON or equivalent config snippet users can paste into their LLM tooling
- explain the permissions and local-only boundary in plain language

### Guardrails

- the bridge should operate on documented commands rather than arbitrary internal mutation
- actions should respect the same validation rules as the normal UI
- sensitive actions should be permissioned or user-confirmed where appropriate
- bridge behavior and contracts should be documented in `AI.md`
- imports and higher-level AI workflows should ultimately resolve through the same validated command surface

### Capability parity requirement

The bridge should not stop at dumping data into the project file.

If a normal user can do something through the app, the command surface should aim to support the equivalent action, including:

- creating and editing items
- changing workflow state
- moving cards between columns
- ordering cards within boards
- creating or configuring views
- assigning milestones, labels, and dates
- searching and filtering project content
- creating docs
- enabling or disabling applicable modules

The goal is that an AI integration can set up a usable project, not merely populate raw records and leave manual arrangement to the user.

## Contributor and agent documentation requirements

The project should maintain an `AI.md` file as a living architecture and implementation ledger for human contributors and coding agents.

### Purpose of `AI.md`

It should reduce contributor confusion by keeping current answers to:

- what architectural decisions have already been made
- what invariants must not be broken
- how packages are split and why
- what storage rules and platform boundaries exist
- what extension/plugin constraints exist
- what recent meaningful implementation changes altered the system shape

### Maintenance rule

`AI.md` should be updated whenever code changes in a meaningful way, especially when changes affect:

- architecture
- data model
- storage
- module boundaries
- routing
- platform behavior
- build/deployment flow
- test strategy

### Recommended `AI.md` sections

- project purpose
- current stack decisions
- package/app layout
- domain model summary
- storage model summary
- platform differences between web and desktop
- plugin/module rules
- key implementation invariants
- current major workflows
- recent architectural changes log

### Product rule

Implementation plans and future coding agents should treat `AI.md` as required maintenance, not optional cleanup.

## Stack options

The final stack is intentionally not fully locked, but the current options are:

### Option A: React + Vite + IndexedDB/OPFS + Tauri

Benefits:

- largest contributor familiarity
- strong ecosystem
- easy static deployment
- strong shared-core path for web and desktop

Tradeoffs:

- needs architecture discipline
- easy to overbuild if patterns are not enforced

### Option B: Vue 3 + Vite + Pinia + Tauri

Benefits:

- approachable and clear
- calmer architecture defaults than raw React
- still strong for modular UI

Tradeoffs:

- smaller contributor pool in some communities
- fewer ecosystem examples for certain workflow-heavy UIs

### Option C: Svelte + Vite or SvelteKit + Tauri

Benefits:

- lean-feeling UI code
- fast and pleasant interactive behavior

Tradeoffs:

- smaller contributor pool
- fewer examples for large plugin systems

## Recommended stack direction

Current recommendation:

- React
- TypeScript
- Vite
- React Router
- Zustand
- browser local storage only as a compatibility layer where durable folder access is not available
- Tauri for desktop packaging
- shared core package for domain, storage contracts, import/export, and module registration

Why:

- easiest contributor onboarding
- strongest path to one codebase serving both PWA and desktop
- strong ecosystem for tables, boards, drag-and-drop, testing, and accessibility
- React Router plus Zustand stays lightweight without boxing us into an overly rigid architecture

Useful likely companions:

- dnd-kit for board interactions
- a mature table layer for dense project tables
- a thin persistence helper around browser storage if it improves ergonomics without owning the architecture

## Extension and module system

The product should be extensible at several layers, each with a different safety boundary.

### Layer 1: Configuration modules

These are data-driven and do not execute arbitrary code.

Examples:

- templates
- workflow presets
- label packs
- field sets
- saved views
- starter automations

Why:

- safest customization path
- easy community contribution model

### Layer 2: Feature modules

Optional first-party or trusted modules that add product areas.

Examples:

- roadmap
- docs
- calendar
- sprint
- attachments
- release notes

Rules:

- may register routes, tabs, panels, or views
- may extend data only through approved custom fields or namespaced metadata
- must degrade gracefully when disabled

### Layer 3: Integration plugins

Connect external systems or data flows.

Examples:

- GitHub import/export
- Jira CSV import
- Git repo metadata integration
- webhooks
- local filesystem workspace helpers

Rules:

- explicit permissions
- independently enableable
- no undocumented mutation of core data

### Layer 4: Automation plugins

React to events and perform inspectable actions.

Examples:

- when a card enters done, stamp completed date
- when severity rank is at least the configured Critical rank, add an urgent label
- when milestone closes, generate release notes draft

Rules:

- event-driven
- sandboxed where possible
- visible in UI
- enable/disable and dry-run support

## Architectural contracts for extensibility

### Stable core entities

- workspace
- project
- work item
- milestone
- document
- attachment
- view

Plugins should compose around these, not replace them.

### Capability registration

Modules/plugins should register capabilities such as:

- view type
- work-item decorator
- import parser
- export format
- action/command
- automation trigger
- automation action

### Namespaced metadata

Examples:

- `core.priority`
- `bug.severity`
- `plugin.github.issueNumber`
- `plugin.calendar.repeatRule`

### Storage abstraction

Plugins should request storage via contracts such as:

- project store
- attachment store
- export service
- settings store

### Permission model

Plugin capabilities should declare needs such as:

- read project data
- write project data
- access chosen folder
- make network requests
- background sync registration

## Recommended module approach for v1

### Built-in modules always present

- core item/task detail
- workflow
- theming
- import/export

### Standard project defaults

The standard new project should enable these modules by default:

- kanban/board
- backlog
- table
- bug tracking / issue tracking
- docs
- roadmap
- calendar
- labels
- milestones
- dates

This is the main out-of-the-box product profile, not the minimum technical kernel.

### Default view instantiation

For a new standard project:

- create `board`, `backlog`, and `table` immediately
- keep `docs`, `roadmap`, and `calendar` enabled but not instantiated until the user adds them
- provide an easy-to-find `Add View` action in the project UI

### Lighter templates

Simpler templates can still enable fewer modules, such as:

- simple kanban
- bug tracker
- release planner

Product rule:

Even built-in systems should be implemented using the same module boundaries we expect optional features to use later.

### Built-in optional modules by project template

- bug extras
- automation
- attachments

Possible later experimental module:

- evidence-based AI/API cost forecasting, only if it can expose assumptions, ranges, confidence, and pricing provenance accurately enough to be useful

### Third-party plugin approach

Plugin execution expands in deliberate trust stages.

Stage 1, MVP:

- define and document plugin interfaces early
- ship only first-party modules
- do not block the first release on a marketplace or arbitrary-code runtime

Stage 2, curated and signed:

- support a curated plugin source and signed packages
- verify signatures and package integrity before loading
- show declared permissions and trust source before installation or enablement
- allow installations to choose a restricted mode that accepts only first-party and curated/signed plugins

Stage 3, unrestricted local plugins:

- add an explicit unrestricted mode for users who intentionally want arbitrary local plugins
- keep unrestricted mode disabled by default
- require a clear warning that unrestricted plugins may execute code with granted local capabilities
- preserve permission declarations, enable/disable controls, logs, and per-plugin settings even in unrestricted mode
- platform limitations may make unrestricted loading desktop-only

Settings trust modes:

- first-party only
- first-party plus curated/signed
- unrestricted local plugins

The product must not describe unrestricted execution as safe. The user's explicit trust choice controls eligibility; plugin permissions still control requested capabilities.

## Recommended UI extension points

- left-side navigation modules
- project view tabs
- work-item detail panels
- command palette actions
- export menu
- import menu
- settings sections
- add-view entry points for enabled but not yet instantiated views

Command registration rule:

- MVP includes a core command palette and essential shortcuts
- modules register discoverable commands through one command registry
- command IDs, availability, shortcut bindings, and execution resolve to shared validated commands
- plugin removal removes its palette entries without invalidating stored project data

## Recommended automation model

MVP posture:

- expose automation through a simple rule builder
- use trigger + optional conditions + actions as the default mental model
- keep rules inspectable and understandable from the UI
- defer scripting-style automation to a later advanced layer

### Trigger examples

- work item created
- work item updated
- status changed
- milestone assigned
- due date changed
- item moved on board

### Action examples

- set field
- add label
- create subtask
- move to status
- assign milestone
- generate document
- export snapshot

MVP boundary:

- do not require users to write scripts for common automation cases
- keep the engine structured so future scripting can target the same event and action model

## Security and trust model

- core product should work without hidden cloud assumptions
- platform-specific permissions should be explicit
- local mode should not silently make network requests
- plugins should be capability-scoped
- import/export should be visible and inspectable

## Risks and mitigations

### Risk: becoming too Jira-like

Mitigation:

- protect the beginner path
- keep advanced controls optional
- default to useful templates

### Risk: becoming too Trello-like

Mitigation:

- treat bugs, milestones, dependencies, and multiple views as first-class

### Risk: browser and desktop storage divergence

Mitigation:

- one shared domain model
- one shared project bundle format
- storage adapters behind stable interfaces

### Risk: extension system complexity

Mitigation:

- define capability boundaries early
- keep core entities small and stable
- ship modules before ecosystem complexity

## Success criteria for an initial demo

- a user can create a project in under two minutes
- a user can plan work in board and backlog views without documentation
- a user can track a bug from intake to fixed state
- a user can export the project to disk
- a user can install the hosted app as a PWA
- a user can install the desktop app and open a project folder
- a user can switch themes and retain the preference
- a technically inclined user can tell where the data lives

## Architecture direction for implementation

Recommended monorepo shape:

- shared core package for domain model, storage contracts, import/export, saved views, modules, automation contracts
- shared UI package for view components and work-item surfaces
- web app target for hosted PWA mode
- desktop target for local packaged mode

Recommended top-level layout:

- `apps/web`
- `apps/desktop`
- `packages/core`
- `packages/ui`
- `tests/e2e`

## MVP definition

The MVP should already feel like a credible open source project management system, not a toy board app.

MVP includes:

- create/open projects in browser and desktop
- board, backlog, and table views
- easy `Add View` flow for enabled modules such as docs, roadmap, and calendar
- tasks and bugs
- statuses, labels, priorities, milestones
- subtasks and dependencies
- comments and checklists
- docs
- export/import JSON, Markdown, CSV
- dark/light themes
- PWA install
- desktop packaging

Late-MVP or immediately-after-MVP:

- attachments
- deeper roadmap/timeline behavior
- automation rules

## Phased implementation plan

### Phase 0: Foundation and shared architecture

Deliver:

- monorepo setup
- shared core package
- shared UI package
- web shell
- desktop shell

### Phase 1: Domain model and storage parity

Deliver:

- project/work-item model
- workflow and view definitions
- browser storage adapter
- desktop folder storage adapter
- shared bundle format

### Phase 2: MVP planning experience

Deliver:

- board
- backlog
- table
- enabled-module views can be added easily from the project UI
- work-item detail
- milestones
- bug workflow

### Phase 3: MVP shipping and trust features

Deliver:

- import/export
- docs
- themes
- PWA installability/offline support
- desktop packaging

### Phase 4: Full-system capabilities

Deliver:

- roadmap/timeline with dependencies
- custom fields
- automation rules
- attachments
- activity history

### Phase 5: Nice-to-haves

Deliver:

- recurring tasks
- calendar view
- GitHub and Jira import helpers
- release-note generation
- multi-project dashboard
- starter trusted plugin loader

### Phase 6: Ecosystem and scale

Deliver:

- optional sync backends
- collaboration model
- plugin registry or marketplace
- richer reporting

## Suggested milestone order

1. Shared hybrid shell
2. Domain model
3. Storage parity
4. Project creation/opening
5. Board and work-item editing
6. Backlog, table, milestones, bug triage
7. Docs, exports, themes, PWA
8. Desktop packaging and parity verification

## Guidance for a coding agent

If an implementation agent is given this file, it should follow these constraints:

- preserve one shared domain model across web and desktop
- do not split browser and desktop into separate product architectures
- keep core use account-free and backend-free
- make browser and desktop storage differences adapter-driven
- treat board/backlog/table/bug tracking as the core product
- treat roadmap/Gantt as important but not dominant
- design extensibility early, but do not block v1 behind an ecosystem
- prefer modular, pluggable additions over permanent core sprawl
- reject additions that mostly add clutter, ceremony, or confusing configuration without clear practical value
- keep exportability and user data ownership visible
- preserve a calm, practical UX rather than enterprise sprawl
- update `AI.md` whenever meaningful implementation changes alter the architecture or developer mental model
- build core systems with module boundaries that allow future add/remove flexibility

## Open decisions intentionally left open

No core product-definition decisions are currently open.

## Pending planning items

- finalize exact tokens, typeface choices, semantic color values, shell dimensions, and illustration details without changing the approved interaction, schema, or command model

## Decisions currently leaning locked

- frontend: React
- routing: React Router
- client state: Zustand with a minimal shared-core architecture
- desktop packaging: Tauri, with the Rust boundary kept narrow and documented
- contributor support: maintain `AI.md` as a required architecture ledger
- canonical project format: single portable bundle first, with expandable folder-backed structure later
- deployment boundary: local use, packaged installs, and internal-only hosting for now rather than public internet exposure
- shared storage behavior: detect external file changes and protect users from silent overwrite
- collaboration scope in MVP: shared-file workflows only, with richer sync deferred to a separate later subsystem or plugin path
- installed app first-run: blank workspace plus `New Project` / `Open Project` / `Demo Folder` modal
- AI integration direction: optional local command-oriented automation bridge or MCP-compatible surface, surfaced through Settings with guided setup

## Testing methodology

Implementation should follow a strong testing strategy rather than leaving tests until the end.

Recommended default:

- use TDD or test-first development whenever feasible for domain logic, commands, migrations, storage, and conflict handling

Required testing layers:

- unit tests for core domain rules, command handlers, validation, and migrations
- contract tests for storage adapters so web and desktop obey the same save/load semantics
- integration tests for import/export, module registration, and shared-file conflict flows
- component tests for project creation, work-item editing, board movement, and user-facing conflict prompts
- end-to-end tests for web/desktop hybrid parity and packaged-app confidence

Quality rule:

- every bug fix that changes behavior should add or update a regression test
- MVP is not done until core behavior, storage contracts, and parity-critical flows are passing consistently

## Recommended immediate next step

The next planning step after this file is to either:

1. keep refining subsystem-specific specs, such as roadmap/Gantt or sync
2. freeze this as the implementation handoff and start scaffold work later

## Source references

- GitHub Projects docs: [docs.github.com](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- GitHub Issues docs: [docs.github.com](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues)
- GitHub milestones docs: [docs.github.com](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)
- Jira features: [atlassian.com](https://www.atlassian.com/software/jira/features)
- OpenProject features: [openproject.org](https://www.openproject.org/collaboration-software-features/)
- Kanboard home: [kanboard.org](https://kanboard.org/)
- Kanboard plugins: [kanboard.org](https://kanboard.org/plugins.html)
- React: [react.dev](https://react.dev/)
- Vue: [vuejs.org](https://vuejs.org/)
- Svelte: [svelte.dev](https://svelte.dev/)
- Vite: [vite.dev](https://vite.dev/guide/)
- Tauri: [tauri.app](https://tauri.app/)
- Electron docs: [electronjs.org](https://www.electronjs.org/docs/latest/)
- IndexedDB API: [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- File System API: [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- OPFS: [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- GitHub Pages: [docs.github.com](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
