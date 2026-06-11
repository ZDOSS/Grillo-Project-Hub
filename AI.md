# AI Architecture Ledger

This file is the standing architecture and contributor-alignment ledger for the project.

It should be updated whenever meaningful implementation changes alter:

- architecture
- domain model
- storage behavior
- module boundaries
- command surfaces
- platform behavior
- testing strategy

## Project state

The repository is currently in planning mode. The docs under `docs/` are the current source of truth for product direction and implementation planning.

The product name is **Grillo Project Hub**, with **GPH** as the approved abbreviation.

Primary planning files:

- `docs/FullSpec.md`
- `docs/specs/01-product-spec.md`
- `docs/specs/02-extension-and-module-spec.md`
- `docs/specs/03-visual-and-interaction-design-spec.md`
- `docs/specs/04-app-shell-and-core-screen-spec.md`
- `docs/specs/05-project-bundle-and-schema-spec.md`
- `docs/specs/06-command-surface-spec.md`
- `docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md`

## Locked or strongly-leaning decisions

- frontend: React
- language: TypeScript
- build tool: Vite
- routing: React Router
- client state: Zustand
- desktop packaging: Tauri
- product posture: hybrid from day one
- data philosophy: local-first
- deployment boundary: local installs, trusted internal hosting, and hosted demo flow; not public internet-facing service
- collaboration in MVP: shared-file workflows only
- richer sync: later subsystem or plugin path, not MVP baseline
- canonical project format: single portable bundle first, with room for folder-backed expansion later
- installed desktop first-run: blank workspace with `New Project`, `Open Project`, and `Demo Folder`
- AI bridge: optional, command-oriented, local/trusted-environment only
- visual direction: polished and friendly, balanced density, subtle cricket/nature references, natural-green accent, lightly rounded layered surfaces
- shell direction: desktop-style sidebar plus project view bar
- theme posture: light and dark are equal first-class themes built from shared semantic tokens
- typography direction: humanist and highly readable
- palette direction: warm off-white light canvas and charcoal dark canvas with a faint warm/green undertone
- editing surface posture: work-item details are modal-first; dialogs for focused tasks, drawers for contextual editing
- icon posture: simple outlined icons with selective filled active states
- responsive navigation posture: slide-over sidebar plus compact view switcher on small screens
- density posture: balanced only in MVP, with compact mode kept compatible for later
- accent posture: project accents affect identity treatments while green remains the primary interaction color
- screen posture: workspace launcher, app shell, board, item modal, backlog, table, docs, roadmap, calendar, search, trash, and settings now have a dedicated text spec
- bundle posture: `project.pms.json` inside `.pm-suite/` is now documented as a concrete top-level schema contract with revision safety and module ownership rules
- command posture: UI, imports, automation, and MCP should converge on one validated command envelope with host, domain, and query layers

## Architecture rules

- preserve one shared domain model across web and desktop
- keep browser and desktop differences behind storage/platform adapters
- keep the Rust/Tauri boundary narrow and documented
- route both UI actions and AI/MCP actions through the same validated command surface where practical
- preserve unknown module/plugin data when reading and writing project bundles

## Product structure rules

- kanban is first-class, but not the only mode
- board, backlog, table, bug tracking, docs, roadmap, and calendar all matter
- the default experience should stay calm, practical, and beginner-safe
- advanced power should be layered in without making the default product noisy

## Extension and modularity rules

- favor module boundaries over enlarging the permanent core
- favor opt-in capabilities over always-on complexity
- if a feature can be a module, view, integration, or optional automation, prefer that shape first
- reject additions that mostly add clutter, ceremony, admin burden, or confusing configuration without strong practical value

Contributor shorthand:

`Add capability, not clutter.`

## Domain model rules

- one shared core item model powers multiple views
- items remain core items even when shown in specialized modules like Kanban or bugs
- placement/order belongs to views or modules, not one global item view field
- labels, milestones, and dates use hybrid ownership
- core items may store stable references like `labelIds`, `milestoneId`, `startDate`, and `dueDate`
- planning-oriented modules own definitions, richer semantics, visualization behavior, and configuration

## Work-item type rules

Projects use a small customizable registry of work-item types.

Rules:

- each type has a stable `typeId`, editable name, optional icon/color/description, deterministic order, and archive state
- each type may declare an optional default status and default priority
- each project declares one default type for new items
- work items store `typeId`; visible names are resolved from the registry
- suggested built-ins are Task, Bug, Feature, Idea, and Chore

Lifecycle rules:

- preserve archived types and historical references
- removing a referenced type requires an explicit replacement
- changing an item's type preserves identity, generic fields, comments, history, relationships, hierarchy, attachments, and plugin-owned data
- type-specific data may become hidden when inapplicable but must not be deleted

Plugin rules:

- plugins may register namespaced type IDs or augment existing types
- plugins may contribute fields, editors, validation, commands, views, and automation behavior by type
- missing plugins must leave the core item readable and preserve their data
- type changes are classification changes, not schema-destructive conversions

Command boundary:

- UI, automation, import, and MCP callers use the same validated type commands

## Workflow status rules

Projects use customizable statuses backed by stable semantic categories.

Stable categories:

- `planned`
- `active`
- `completed`
- `canceled`

Rules:

- each status has a stable `statusId`, editable name, category, optional color, and deterministic order
- work items store `statusId`; they do not duplicate the semantic category
- each project declares one default initial status in `planned`
- each project declares one default completed status in `completed`
- projects may define multiple statuses in any category
- statuses such as Blocked and Review normally map to `active`
- progress, completion, filtering, automation, and interchange semantics derive from categories

Lifecycle rules:

- preserve archived statuses and historical item references
- removing a referenced status requires an explicit replacement mapping
- status transitions remain flexible in MVP
- UI, automation, import, and MCP callers use the same validated status commands

Later path:

- optional constrained transitions may be added without changing status identity or category semantics

Boundary rule:

- do not hard-code visible status names as universal product semantics

## Priority rules

Priorities are customizable project definitions backed by numeric ranks.

Rules:

- each priority has a stable `priorityId`, editable name, integer rank, optional color, and archive state
- higher rank means greater urgency
- work items store nullable `priorityId` references
- null means no priority and sorts below ranked priorities
- sorting, filtering, automation, and interchange compare rank rather than visible name
- reject duplicate ranks to preserve deterministic ordering

Suggested defaults:

- Low: `100`
- Medium: `200`
- High: `300`
- Urgent: `400`

Lifecycle rules:

- preserve archived priorities and historical references
- removing a referenced priority requires replacement or explicit clearing
- UI, automation, import, and MCP callers use the same validated priority commands

Import/export rules:

- preserve ID, visible name, rank, and color in native exports
- map external priority systems by rank when stable IDs are unavailable
- include visible name and rank in CSV or other human-readable exports

Boundary rule:

- keep bug severity separate from general priority
- do not hard-code priority names as sorting semantics

## Bug severity rules

Severity is owned by the bug module and remains separate from general priority.

Rules:

- each severity has a stable `severityId`, editable name, unique integer rank, optional color/description, and archive state
- higher rank means greater technical or user impact
- bug-module item state stores nullable `severityId`; null means unassessed
- suggested defaults are Minor `100`, Major `200`, Critical `300`, and Blocker `400`
- sorting, filtering, and automation compare rank rather than visible name
- the bug module declares applicable work-item type IDs; never infer applicability from the visible type name

Lifecycle rules:

- preserve archived severity definitions and historical references
- removing a referenced severity requires replacement or explicit clearing
- changing an item to a non-applicable type hides severity without deleting it
- disabling or removing the bug module preserves all severity definitions and item values

Command boundary:

- UI, automation, import, and MCP callers use the same validated severity commands

Boundary rule:

- priority represents planning urgency; severity represents impact
- do not automatically derive either value from the other

## Bug report field rules

The bug module provides a focused structured report.

Fields:

- ordered reproduction steps
- expected behavior
- actual behavior
- environment
- optional affected version

Storage rules:

- each reproduction step has a stable `reproductionStepId`, Markdown text, and deterministic order
- expected behavior, actual behavior, and environment are Markdown-capable text
- affected version is optional free text in MVP
- all fields live in namespaced bug-module item state

Behavior rules:

- applicable work-item type IDs come from bug-module configuration
- reports may remain incomplete during triage
- changing to a non-applicable type hides fields without deleting data
- disabling or removing the bug module preserves all report data
- fields participate in local search, import/export, activity history, automation, and MCP/API access
- Markdown must use the shared sanitized rendering policy

Extension rule:

- add specialized diagnostics through custom fields or plugin-owned fields
- a future versions module may add stable version references while preserving the original free-text affected version

Boundary rule:

- do not make the default bug form a large mandatory questionnaire

## Date, timestamp, and reminder rules

Planning dates and precise times are separate domain concepts.

Date-only rules:

- `startDate`, `dueDate`, and milestone target dates use canonical ISO `YYYY-MM-DD`
- date-only values contain no time or timezone
- date-only values must display as the same day on every machine
- start and due dates are inclusive
- reject `startDate` later than `dueDate`
- never represent date-only values as UTC-midnight JavaScript dates

Timestamp rules:

- created, updated, activity, and history timestamps use full ISO 8601 UTC timestamps
- validation and command schemas must distinguish timestamps from date-only values

Reminder rules:

- reminders are separate records with stable `reminderId` values
- reminders store an exact UTC `remindAt` instant
- reminders also store an IANA `timeZone` for local display context and future recurrence semantics
- reminder definitions and stable target references travel with the project
- notification permissions, delivery attempts, and machine-specific dismissal state remain outside the shared bundle
- multiple installations may each deliver the same shared reminder when locally enabled
- changing machine timezone must not mutate the stored instant

Command boundary:

- UI, automation, import/export, and MCP callers use the same date and reminder validation

Boundary rule:

- do not require times or timezones for ordinary planning dates
- do not allow timezone conversion to shift a stored planning date

## Estimation and AI cost rules

Traditional work estimation is intentionally excluded from the built-in product model.

Rules:

- do not add time estimates, effort estimates, story points, or capacity estimates as core fields or default modules
- do not derive progress, priority, roadmap placement, or completion from estimated effort
- dates represent targets or constraints, not effort estimates
- generic numeric custom fields remain available but must not be presented as built-in estimation

Possible later AI/API cost module:

- must be optional and outside the MVP baseline
- must identify provider, model, pricing version or retrieval date, and usage assumptions
- must present ranges and confidence rather than false precision
- must distinguish forecasts from measured actual cost
- must support recalculation when assumptions or pricing change
- must not ship if validation cannot demonstrate decision-useful accuracy

Boundary rule:

- no estimate is preferable to an unsupported precise-looking number

## Work-item hierarchy rules

The MVP exposes one parent-to-subtask level while preserving a path to deeper nesting.

Rules:

- each work item may store one nullable `parentId`
- `parentId` is the only persisted hierarchy edge
- derive child lists from `parentId`; do not maintain a second editable `subtaskIds` list
- subtasks remain ordinary work items with stable IDs and normal command support
- MVP UI and validated commands should allow roots plus one subtask level
- hierarchy utilities should be capable of traversal and cycle detection beyond one level

Integrity rules:

- reject self-parenting, cycles, and cross-project parent relationships
- clearing `parentId` promotes an item to a root item
- archiving a parent must preserve its children
- hard deletion of a parent must require an explicit child-handling decision

Later path:

- expose deeper nesting later without changing the canonical parent-reference model

Boundary rule:

- do not persist both parent and child relationship lists as competing sources of truth

## Work-item relationship rules

The MVP relationship set is intentionally small.

Supported semantics:

- `blocks` is a stored directional edge from source item to target item
- `blocked by` is a derived inverse view of `blocks`, not a separately stored record
- `relates to` is a stored symmetric relationship

Storage rules:

- keep relationships in one normalized project-level collection
- each relationship should have a stable `relationshipId`, type, source item ID, and target item ID
- canonicalize symmetric `relates to` endpoints so the same pair cannot be stored twice
- derive per-item relationship lists rather than persisting duplicate arrays on items

Integrity rules:

- reject self-links, cross-project links, duplicate relationships, and blocking cycles
- route UI, automation, import, and MCP mutations through the same validated relationship commands
- item deletion or archival must handle relationship records explicitly and preserve useful history

Later path:

- add specialized relationships such as duplicates or caused by later
- allow plugins to register namespaced relationship types through documented contracts

Boundary rule:

- do not persist both `blocks` and `blockedBy` records for the same relationship

## Archive, trash, and permanent deletion rules

Use one project-wide lifecycle for supported records:

- archive hides inactive records from normal views while preserving identity, data, references, and history
- delete moves records into project-level trash; it is not immediate destruction
- trash is part of the canonical project bundle, not machine-local state
- restore recovers the same stable ID and all preserved core and plugin-owned data
- do not automatically purge trash in MVP
- permanent deletion is an explicit, confirmed operation preceded by a reference-impact review

The impact review inspects hierarchy, relationships, comments, attachments, docs links or embeds, milestones, view references, history, and known plugin references.

Never silently cascade permanent deletion. Require explicit handling for children, owned files, or invalidated references. Preserve a minimal historical tombstone where total removal would make immutable activity or discussion records unintelligible.

Plugin rules:

- plugin disable or removal never deletes plugin data
- archive and trash preserve opaque namespaced plugin data
- plugins may provide versioned, deterministic, retry-safe inspection and cleanup hooks
- unknown plugin namespaces must not be guessed at or silently discarded
- block permanent deletion or preserve opaque data when safe cleanup cannot be proven

All archive, trash, restore, impact-inspection, and permanent-delete behavior goes through shared validated commands with UI, import, automation, and MCP/API parity.

## Checklist rules

Checklists are lightweight item-local execution details in MVP.

Rules:

- each entry should have a stable `checklistEntryId`
- entries should store text, completion state, and deterministic order
- derive checklist progress instead of storing a separate editable progress value
- do not give checklist entries full work-item fields

Conversion rules:

- converting an entry to a subtask must be one atomic validated command
- create a normal work item with the entry text as its title and the source item as `parentId`
- remove the active checklist entry only after successful work-item creation
- preserve the original entry snapshot and created item ID in event history for inspection and undo
- map incomplete entries to the project's initial status and completed entries to its configured completed status
- reject conversion when it would violate the MVP one-level hierarchy limit

Command boundary:

- UI, automation, import, and MCP callers must use the same checklist commands
- a failed conversion must leave the original checklist entry unchanged

Boundary rule:

- do not represent checklist entries as hidden work items before conversion

## Label rules

The MVP label model should stay simple.

Rules:

- labels should be flat in MVP rather than grouped by taxonomy
- each label should have a stable `labelId`, name, and optional color
- labels may also have an optional short description
- labels should support archiving so old labels can be retired without destroying history

Later path:

- allow optional grouped or taxonomy-style labels later if justified by usage
- preserve compatibility between early flat labels and any later grouping model

Boundary rule:

- do not force category-heavy label management into the MVP default flow

## Milestone rules

The MVP milestone model should stay lightweight.

Rules:

- milestones should begin as simple planning containers
- each milestone should have a stable `milestoneId`, name, and optional short description
- milestones may also have an optional target date
- items should reference milestones by `milestoneId`
- milestone views should focus on simple progress and grouping behavior in MVP

Later path:

- allow richer release-oriented behavior later if justified
- treat release-note generation, milestone lifecycle states, and deeper release-planning semantics as later layers

Boundary rule:

- do not force release-management ceremony into the MVP default flow

## Calendar rules

The MVP calendar model should stay lightweight.

Rules:

- calendar should begin as a date-based view over existing items
- calendar should read core fields such as `startDate` and `dueDate`
- calendar may also surface milestone target dates where useful
- calendar should support basic filtering consistent with other views

Later path:

- add drag-to-reschedule later if justified
- add richer recurring-item handling and deeper time semantics later
- treat reminder-heavy or event-like behavior as later layers rather than MVP requirements

Boundary rule:

- do not turn calendar into a full scheduling subsystem in the MVP default flow

## Docs rules

Docs are a first-class knowledge system in MVP.

Rules:

- documents should use stable `documentId` values
- documents should store a title, Markdown body, timestamps, and optional folder or section placement
- document identity must not depend on its title, folder, or path
- documents may link to other documents and work items by stable ID
- backlinks should be derived from stored links rather than maintained as separate editable data
- docs should support structured embeds of project documents, work items, and attachments
- docs should participate in local project-wide search
- disabling the docs module must preserve all document and relationship data

Security boundary:

- sanitize rendered Markdown
- do not execute arbitrary HTML or scripts from document bodies
- treat external URLs as links or controlled previews, not unrestricted embeds

Design intent:

- support lightweight wiki and knowledge-base workflows from day one
- keep ordinary Markdown as the approachable authoring surface

## Custom field and plugin-data rules

The MVP should distinguish between project-defined custom fields and plugin-owned data.

Project-defined custom fields:

- are part of the shared project-level field system
- should use typed definitions in MVP
- should start with text, number, select, multi-select, date, and checkbox
- should be readable by generic views, exports, filters, and automation
- may apply to every item type or declare optional applicable `typeId` values
- retain stored values when a type change makes a field temporarily inapplicable
- distinguish inapplicable from applicable-but-empty in filters, exports, automation, imports, and MCP/API behavior

Plugin-owned data:

- may add additional per-item data for specialized behavior
- must be preserved even when the plugin is disabled, removed, or temporarily unavailable
- may be hidden from the normal UI when its plugin is missing
- should become usable again when the plugin is restored and the project is reopened

Boundary rule:

- do not force every plugin-specific field into the shared core custom-field system
- do not delete plugin-owned data just because a plugin is absent

## Attachment rules

The MVP attachment model is split between metadata and file payloads.

Rules:

- attachment metadata belongs in the project data model
- attachment binaries should not be embedded into the main project bundle by default
- folder-backed projects should store attachment files in a predictable sibling folder such as `.pm-suite/attachments/`
- attachments should preserve stable IDs and relationships to items or docs
- import/export flows should preserve both attachment metadata and binary payloads together where applicable
- safely preview common images, plain text, and PDFs where platform capabilities allow
- open unsupported types externally or through download flows
- never execute attachments or render active or unknown content as trusted inline content

Design intent:

- keep the main bundle portable and inspectable
- avoid bloating the primary JSON artifact with binary payloads
- avoid making link-only attachments the primary durability story

## Board, roadmap, and command interaction rules

- board columns may group multiple workflow statuses and declare one mapped default drop status
- a status appears in at most one column within a board
- board WIP limits warn by default and may be configured for hard enforcement per column
- roadmap supports direct drag and resize date editing plus validated milestone-lane moves
- roadmap interactions preserve date-only values and do not silently cascade dependency rescheduling
- ship a core command palette and essential shortcuts in MVP
- modules and future plugins register palette entries through one extensible command registry
- all board, roadmap, palette, automation, import, and MCP/API mutations resolve to shared validated domain commands

## Work-item duplication rules

- duplication creates a new work-item ID and fresh independently addressable child IDs
- copy editable core fields, checklists, custom fields, and per-item plugin data by default
- do not copy comments, history, reminders, archive state, or trash state
- relationships and attachments are explicit options, not defaults
- copied attachments receive new attachment records and payload copies
- known plugins may use deterministic clone hooks; absent plugin data remains opaque and is copied under the new item ID
- duplication is atomic, undoable, and available through the shared UI, automation, and MCP/API command surface

## Template rules

- support both bundled starter templates and user-created templates
- user templates can be renamed, duplicated, archived, imported, and exported
- portable templates exclude history, trash, comments, and machine-local settings by default
- template creation provides explicit inclusion choices for starter items, docs, automations, attachments, and plugin configuration

## Plugin trust and loading rules

- MVP executes first-party modules only while documenting stable plugin contracts
- the next trust tier supports curated and signed packages with integrity verification and visible permission declarations
- a later unrestricted local-plugin mode is allowed, disabled by default, and accompanied by an explicit arbitrary-code warning
- settings expose `first-party only`, `curated/signed`, and `unrestricted local` trust modes as they become available
- unrestricted loading may be desktop-only where browser platforms cannot support it
- permission declarations, enable/disable controls, logs, and plugin settings remain required in every trust mode
- never claim unrestricted plugins are safe merely because the user enabled them

## Import and export rules

The product should make leaving possible without data lock-in.

Rules:

- prioritize strong native `project.pms.json` support first
- prioritize Markdown and CSV export paths early
- treat GitHub import/export helpers as an early post-MVP priority
- treat broader migration and export helpers as later expansion work
- prefer export shapes that are inspectable, transformable, and usable by other tools where possible

## Activity and history rules

The product should support both simple and advanced history experiences from one underlying event model.

Rules:

- store structured event records rather than only storing pre-rendered activity strings
- expose a simple default activity view for normal day-to-day use
- support an advanced history view for deeper inspection, troubleshooting, and future auditing needs
- keep both views backed by the same event stream or event-log model
- include source context where practical, such as UI, import, automation, or MCP bridge

Design intent:

- keep the default UI calm
- keep the data model rich enough for later undo-safe logging, inspection, and automation integration without a major rewrite

## Search rules

Search in MVP should be local full-text search.

Rules:

- support full-text search across items, docs, comments, and labels
- support structured filters for common scopes such as type, status, assignee, milestone, and label
- keep search offline-capable and local-first
- expose equivalent search and filtering capability through the validated UI/API/MCP command surface where practical

Boundary rule:

- do not depend on a remote indexing service for core search

## Undo, redo, and backup rules

The MVP should pair fast local undo/redo with durable folder-backed backups or snapshots.

Rules:

- support local undo/redo for recent core actions in the current session
- base undo/redo on the same command/event model used elsewhere in the app
- support user-configurable backup or snapshot cadence and retention for folder-backed projects
- keep backups and undo as complementary protections rather than substitutes

Boundary rule:

- do not rely only on in-memory undo for recovery
- do not rely only on backups for normal user correction flows

## Automation rules

The MVP automation model should be a simple rule builder, not a scripting-first system.

Rules:

- model automations as trigger + optional conditions + actions
- keep automation rules editable, inspectable, and disableable from the UI
- optimize the default automation experience for common practical workflows
- keep the engine structured enough that scripting can be added later without replacing the underlying model

Boundary rule:

- do not require scripting for ordinary automation use in MVP
- treat scripting-style automation as a future advanced layer

## Comment and discussion rules

The MVP comment system should support real threaded discussion.

Rules:

- support Markdown comment bodies
- support threaded replies from day one
- support comment editing with visible history or diff inspection
- preserve discussion integrity when comments are deleted, preferably through soft-delete or tombstone-style behavior
- keep comment history aligned with the broader event/history model where practical

Boundary rule:

- mentions, notifications, and heavier discussion workflows can come later
- do not reduce MVP comments to plain notes if doing so would block real discussion

## Notification rules

The MVP notification model should stay local-only.

Rules:

- support local reminders and in-app notifications
- use local OS or browser notification capabilities only where they fit the local-first product model
- do not require a third-party notification service for core behavior

Boundary rule:

- email, push, or cloud-mediated notification delivery is not part of the MVP baseline
- if broader notification delivery is explored later, prefer free/open-source or self-controlled approaches over mandatory outside services

## Recurring task rules

Recurring tasks should start simple and grow toward more advanced recurrence later.

Rules:

- begin with straightforward recurrence such as daily, weekly, and monthly patterns
- keep the initial UX practical and easy to understand
- evolve later toward richer recurrence behavior such as exceptions, catch-up behavior, and more advanced configuration

Boundary rule:

- do not overbuild recurrence complexity before the simple case is solid
- keep the underlying model extensible so advanced recurrence can be added iteratively

## Member identity model

The MVP identity model is intentionally lightweight.

Rules:

- each project stores a simple member list
- each member has a stable `memberId`
- each member has a display name
- each member may have an optional color or similar lightweight visual marker
- work items, comments, and activity should reference members by ID rather than raw free-text names where practical
- each machine may store its currently selected local member outside the shared project bundle

Non-goals:

- mandatory accounts
- enterprise auth/permissions
- public profile system
- live presence

## Assignee and My Work rules

The MVP assignment model should stay simple.

Rules:

- each item should support zero or one assignee in MVP
- assignees should reference project members by `memberId`
- each machine may store the selected local member outside the shared bundle
- `My Work` should be implemented as a saved view filtered to the selected local member

Later path:

- allow multi-assignee support later if justified by real usage
- treat workload balancing, capacity, or broader team-planning semantics as later features

Boundary rule:

- do not add early complexity that makes solo or small-team use noisier

## Storage and collaboration rules

- desktop folder-backed storage is the primary trusted persistence path
- hosted browser mode may use folder-backed access where supported, otherwise browser-local storage must be labeled clearly
- storage state should be understandable to users through visible status such as folder-backed, browser-local, or unsaved
- external file changes must be detected and surfaced clearly
- users should be able to reload newer disk state and recover pending changes where possible

## Testing rules

- prefer TDD or test-first development for core logic and behavior-sensitive flows
- maintain contract tests for storage adapters
- maintain schema and migration tests for the canonical project bundle
- add regression tests with bug fixes that change behavior
- maintain parity-oriented tests for important web versus desktop flows

Minimum testing layers expected over time:

- unit tests for domain rules, validation, commands, and migrations
- integration tests for storage, import/export, and module registration
- component tests for high-value UI flows
- end-to-end tests for hybrid parity and desktop packaging confidence

## Documentation rules

- if architecture changes, update this file in the same change
- if product behavior or contributor expectations change materially, update `Readme.md`
- keep planning docs and this file aligned
