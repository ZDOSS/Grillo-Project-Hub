# Extension And Module Spec

## Purpose

Define how the product stays modular without becoming incoherent.

## Principle

The app should be extensible at several layers, but every layer needs a different safety boundary.

## Contribution rule

New features should be added in ways that increase capability without increasing product clutter.

That means:

- prefer module boundaries over growing the permanent core
- prefer opt-in views, panels, integrations, and automations over always-on complexity
- do not merge features that mostly add configuration burden, visual noise, or workflow sprawl without a clear practical benefit
- every meaningful addition should make the product more useful while preserving a calm, understandable default experience

## Extension layers

### Layer 1: Configuration modules

These do not execute arbitrary code. They customize behavior through data.

Examples:

- project templates
- workflow presets
- field sets
- saved views
- label packs
- default automation recipes

Why this matters:

- safest way to enable customization
- easiest path for community contribution

## Layer 2: Feature modules

These are optional first-party or trusted extensions that add product areas.

Examples:

- timeline module
- docs module
- calendar module
- sprint module
- release notes module
- attachments module

Rules:

- can register routes/views/panels
- can extend the data model only through approved custom-field or namespaced metadata mechanisms
- should degrade gracefully if disabled

## Layer 3: Integration plugins

These connect the app to external tools or data flows.

Examples:

- GitHub import/export
- Jira CSV import
- Git repo metadata plugin
- webhook plugin
- local filesystem workspace plugin

Rules:

- must use explicit permissions
- should be independently installable/enablable
- should not mutate core data outside documented APIs

## Layer 4: Automation plugins

These react to events and perform actions.

Examples:

- when card enters "done", set completed date
- when severity rank is at least the configured Critical rank, add an urgent label
- when milestone closes, generate release notes draft

Rules:

- event-driven
- sandboxed if possible
- must be inspectable in UI
- must support enable/disable and dry-run behavior

## Core architectural contracts

## 1. Stable domain model

Core entities should stay small and durable:

- workspace
- project
- work item
- stable cross-entity references

Plugins should compose around them, not replace them.

An item shown by a module remains a core item. For example, displaying an item on a Kanban board does not convert it into a separate Kanban-owned item.

Work-item type capability requirements:

- projects maintain a registry of stable work-item type IDs and editable definitions
- items reference `typeId`; they do not store the visible type name as identity
- type definitions may provide icon, color, description, order, and optional default status or priority
- projects declare one default type for new items
- archived types and historical references are preserved
- removing a referenced type requires an explicit replacement
- changing type preserves all generic and plugin-owned item data
- plugins may register namespaced type IDs or augment existing types with fields and behavior
- a missing type plugin hides unavailable behavior but never makes the core item inaccessible or deletes its data

## 2. Capability registration

Modules/plugins should register capabilities such as:

- view type
- work item type or type decorator
- work item decorator
- export format
- import parser
- command/action
- automation trigger
- automation action

## 3. Namespaced metadata

Custom or plugin-owned fields should use namespaces to avoid collisions.

Example:

- `core.priority`
- `bug.severity`
- `plugin.github.issueNumber`
- `plugin.calendar.repeatRule`

For structured or substantial plugin data, prefer a dedicated module section keyed by stable item IDs rather than placing every plugin field directly on the core item.

Recommended shape:

```json
{
  "modules": {
    "builtin.kanban": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {},
      "data": {
        "placements": {
          "view_main": {
            "item_01": {
              "columnId": "doing",
              "position": 1024
            }
          }
        }
      }
    }
  }
}
```

Rules:

- module sections reference core entities by stable ID
- modules do not duplicate complete core records
- unknown module sections are preserved unchanged
- disabling a module does not delete its data
- removing module data requires a separate explicit user action

## 3A. Project-defined custom fields versus plugin-owned fields

These are related but should not be treated as the same system.

Project-defined custom fields:

- are defined at the project level
- use a small typed core set in MVP
- should be readable by generic views such as board, table, backlog, filters, exports, and automation
- may apply globally or declare an optional set of applicable work-item type IDs
- preserve values when a type change makes a field inapplicable
- expose applicability separately from value presence through generic commands and queries

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

## 3A.1 Record lifecycle and plugin cleanup

Core owns the canonical archive, trash, restore, and permanent-deletion lifecycle.

Extension rules:

- disabling or removing a plugin is never equivalent to deleting its data
- archived and trashed records retain all namespaced plugin data
- restoring a record exposes its preserved plugin data again when the owning plugin is available
- permanent deletion begins with a core reference-impact inspection
- plugins may register deterministic inspection and cleanup hooks for references or files they own
- cleanup hooks must be versioned, testable, and safe to retry
- an absent or unknown plugin namespace must not be guessed at, flattened, or silently discarded
- if safe cleanup cannot be established, preserve the opaque namespace or block permanent deletion with a clear explanation
- plugin lifecycle operations are reachable through the same validated command surface used by the UI, automation, imports, and MCP/API clients

## 3B. Core versus module ownership

Core owns:

- stable item identity
- title and description
- created/updated timestamps
- universal relationships required to keep references valid

Feature modules own:

- view definitions
- item placement within module-specific views
- specialized fields
- module configuration
- module-specific ordering and presentation

Hybrid ownership should be used for shared planning fields:

- core work items may store stable references or values needed across multiple views, including `labelIds`, `milestoneId`, `startDate`, and `dueDate`
- foundational planning modules own the reusable definitions, rules, presets, and richer semantics behind those fields
- labels are therefore referenced from the item, but label definitions and presentation belong to the labels capability
- milestones are referenced from the item, but milestone definitions, grouping behavior, and release-oriented logic belong to the milestones capability
- dates live on the item when they describe the item itself, while roadmap/calendar/date-oriented modules own visualization rules, constraints, and scheduling behavior

Date and reminder capability requirements:

- planning fields such as `startDate`, `dueDate`, and milestone target dates are date-only ISO `YYYY-MM-DD` values
- date-only planning values carry no timezone and must not shift between machines
- validate inclusive ranges so `startDate` is not later than `dueDate`
- reminders are separate records with stable IDs, exact UTC instants, and IANA timezone identifiers
- reminder definitions and stable target references travel in a project module section
- notification permission, delivery attempts, and machine-specific dismissal state remain installation-local
- created, updated, activity, and history values use full UTC timestamps
- UI, automation, import, and MCP commands must distinguish date-only values from precise timestamps
- calendar and roadmap modules consume date-only fields without rewriting them as UTC midnight timestamps

This keeps core items portable across board, backlog, table, roadmap, bug-triage, and automation use cases without making the kernel responsible for all planning behavior.

Example:

- Kanban owns columns, WIP limits, and card ordering.
- A workflow module owns the item's current status.
- Kanban depends on the workflow-status capability.
- Moving a card invokes documented commands that update workflow status and Kanban placement.
- Roadmap and calendar can read core date and milestone references without taking ownership of the entire item.

Board capability requirements:

- a board column may group one or more workflow status IDs
- each column declares one default drop status from its mapped statuses
- one status maps to at most one column within a board
- WIP limits warn by default and may be configured for hard enforcement per column
- UI, automation, import, and MCP/API moves use the same workflow and WIP validation

Roadmap capability requirements:

- roadmap supports direct drag and resize editing of item date ranges
- roadmap may move items between milestone lanes through shared milestone commands
- edits preserve date-only semantics and use shared date, milestone, and relationship commands
- dependency display does not imply automatic cascading rescheduling

Workflow capability requirements:

- statuses have stable IDs, editable names, category mappings, optional colors, and deterministic order
- stable MVP categories are `planned`, `active`, `completed`, and `canceled`
- items reference a `statusId`; consumers derive semantic category through the workflow definition
- each project declares a default initial status and default completed status
- archived statuses and their historical references are preserved
- removing a referenced status requires an explicit replacement mapping
- UI, automation, import, and MCP status changes use the same validated workflow commands

Priority capability requirements:

- priorities have stable IDs, editable names, integer ranks, optional colors, and archive state
- higher numeric rank means greater urgency
- items reference a nullable `priorityId`; null means no priority
- sorting, filtering, and automation compare ranks rather than visible names
- duplicate ranks are rejected
- archived priorities and historical references are preserved
- removing a referenced priority requires replacement or an explicit move to no priority
- bug severity remains separate from general work-item priority
- UI, automation, import, and MCP priority changes use the same validated commands

Bug severity capability requirements:

- the bug module owns customizable severity definitions and per-item severity values
- severities have stable IDs, editable names, unique integer ranks, optional colors/descriptions, and archive state
- higher numeric rank means greater impact
- bug-module item state references nullable `severityId`; null means unassessed
- the module declares applicable work-item type IDs instead of depending on the visible name `Bug`
- severity and priority remain independent fields with independent filters and automation conditions
- archived severities and historical references are preserved
- removing a referenced severity requires replacement or explicit clearing
- disabling the module or changing item type hides inapplicable severity behavior without deleting stored values
- UI, automation, import, and MCP severity changes use the same validated bug-module commands

Bug report field requirements:

- the bug module owns reproduction steps, expected behavior, actual behavior, environment, and optional affected version
- reproduction steps use stable entry IDs and deterministic order
- reproduction, expected behavior, actual behavior, and environment support sanitized Markdown
- affected version is optional free text in MVP
- applicable type IDs come from bug-module configuration
- fields may be incomplete during triage and should not block item creation
- changing type or disabling/removing the module hides fields without deleting data
- local search, import/export, activity history, automation, and MCP/API commands include these fields
- specialized diagnostics belong in project custom fields or namespaced plugin data

## 3C. Multiple views and dependencies

One core item may appear in multiple views.

Rules:

- store ordering and placement per view
- do not store one global view membership field on the core item
- modules consume declared capabilities rather than reading other modules' private data directly
- module manifests declare required and optional capabilities
- disabling a required dependency must produce an explanatory choice, not a broken project

## 3D. Required application kernel

The plugin architecture requires a small non-removable kernel.

The kernel owns:

- project bundle loading and validation
- stable IDs and reference integrity
- saves, revision checks, and conflict detection
- format migrations
- module registration and module-data migration
- preservation of unknown plugin data

Feature systems should use module boundaries, but the kernel itself is not an optional plugin.

## 4. Storage abstraction

Plugins should never assume one storage backend.

They should request storage through interfaces such as:

- project store
- attachment store
- export service
- settings store

## 5. Permission model

Even in a hybrid app with local-first data ownership, plugins should declare what they need.

Examples:

- read project data
- write project data
- access chosen folder
- make network requests
- register background sync

## Recommended module system for v1

### Foundation modules enabled by default

- core issue/task detail
- workflow
- theming
- import/export

These should use the same module contracts as optional features. A project may hide or disable applicable modules as long as dependency rules are satisfied and the base project remains openable.

### Standard project modules enabled by default

- board
- backlog
- table
- bug tracking
- docs
- roadmap
- calendar
- labels
- milestones
- dates

View-instantiation rule for the standard project:

- create `board`, `backlog`, and `table` views automatically
- leave `docs`, `roadmap`, and `calendar` enabled but uninstantiated until requested
- expose a clear `Add View` flow so enabled modules are discoverable

Docs module requirements:

- provide Markdown documents with stable document IDs
- support folders or sections without making paths the document identity
- support stable links between documents and work items
- derive backlinks from stored links
- support structured embeds of project documents, work items, and attachments
- preserve document and link data if the docs module is disabled
- reject arbitrary executable HTML or scripts in rendered document content

### Built-in optional modules enabled by project template

- bug tracker extras
- automation
- attachments

Possible later experimental module:

- AI/API cost forecasting, only when provider/model assumptions, pricing provenance, ranges, confidence, and validation can be shown clearly

Estimation boundary:

- do not add time, effort, story-point, or capacity estimates as built-in product concepts
- do not disguise uncertain effort estimates as generic planning intelligence
- omit AI/API cost forecasting if it cannot be accurate enough to support a real decision

### Third-party plugin story

Plugin execution should expand in deliberate trust stages.

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

Settings should expose understandable trust modes:

- first-party only
- first-party plus curated/signed
- unrestricted local plugins

The product must not describe unrestricted execution as safe. The user's explicit trust choice controls eligibility; plugin permissions still control requested capabilities.

## Recommended UI extension points

- left navigation modules
- project view tabs
- work item detail panels
- command palette actions
- export menu
- import menu
- settings sections
- add-view entry points for enabled but not yet instantiated views

Command registration rule:

- MVP includes a core command palette and essential shortcuts
- modules register discoverable commands through one command registry
- command IDs, availability, shortcut bindings, and execution all resolve to shared validated commands
- plugin removal must remove its palette entries without invalidating stored project data

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
- route `create subtask` and parent-change actions through the validated hierarchy commands
- enforce the MVP one-level hierarchy limit consistently for UI, automation, import, and MCP callers
- persist only the child's `parentId`; derive parent child-lists from item data

Relationship command rules:

- expose validated commands to add and remove `blocks` and `relates to` relationships
- derive `blocked by` from the inverse side of `blocks`
- reject self-links, cross-project links, duplicate links, and dependency cycles
- apply the same validation to UI, automation, import, and MCP callers
- allow later plugins to register specialized relationship types without rewriting the core relationship store

Checklist command rules:

- expose validated commands to add, edit, reorder, complete, reopen, and remove checklist entries
- expose one atomic command to convert a checklist entry into a subtask
- preserve the entry if subtask creation fails
- record conversion history and support undo through the shared command/event model
- reject conversion when it would exceed the MVP hierarchy depth
- apply the same command validation to UI, automation, import, and MCP callers

## Recommended import/export plugin model

Importers:

- parse input
- map source fields to core fields
- preview import result
- confirm import

Exporters:

- select scope
- map core fields to output format
- generate file bundle

## Recommended "point to folder" design

Treat folder support as a storage/integration plugin with a clear adapter boundary.

Capabilities:

- choose folder
- read/write project bundle
- optionally store attachments and snapshots
- optionally index nearby markdown/docs files later

Why plugin-shaped:

- browser and desktop capabilities differ
- easier to keep the core product portable

## What not to do

- do not let plugins write directly into random core internals
- do not make every view a totally separate data silo
- do not relabel a core item as belonging exclusively to one view plugin
- do not duplicate an item in every plugin that displays it
- do not tie the app to one backend or one runtime
- do not require plugins for basic planning and issue tracking

## Recommended v1 module roadmap

### Launch

- board
- backlog
- table
- docs
- directly editable roadmap
- export/import
- custom fields

### Next

- automation
- folder adapter
- desktop adapter
- Git integration
- recurring tasks

### Later

- curated and signed plugin loading
- optional unrestricted local plugin mode
- shared plugin registry
- sync adapters

## Final recommendation

Design for plugins now, but ship modules first.

That keeps the architecture honest without delaying the product behind an ecosystem that does not exist yet.
