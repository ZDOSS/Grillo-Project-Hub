# Grillo Project Hub Shared Command Surface Spec

## Purpose

This document defines the shared validated command surface for Grillo Project Hub (GPH).

It is the behavioral contract used by:

- UI interactions
- import flows
- automation rules
- optional MCP and local AI bridges
- future trusted integrations

The central rule is simple:

If a normal user can perform an action, the app should aim to expose an equivalent validated command rather than requiring raw file mutation.

## Core goals

The command surface should be:

- consistent
- revision-safe
- validation-first
- automation-friendly
- MCP-friendly
- broad enough to cover real user actions

## Surface boundaries

The command surface is split into three layers:

1. host and workspace commands
2. project domain commands
3. query and inspection commands

### Host and workspace commands

These are adapter-sensitive operations such as:

- create project from template
- open project
- link project folder
- save bundle
- export bundle

They may differ by platform capability, but they should still use consistent naming and result shapes.

### Project domain commands

These mutate the loaded project model and must be shared by:

- UI
- imports
- automations
- MCP

They are the main contract this spec defines.

### Query and inspection commands

These provide structured reads such as search, filtered listing, deletion impact review, and validation previews.

## Non-goals

The command surface should not:

- expose unrestricted raw file writes as the normal automation path
- force MCP or AI callers to hand-edit `project.pms.json`
- create a separate privileged data model for automation that the UI does not use

## Command envelope

Recommended mutation envelope:

```json
{
  "commandName": "item.updateFields",
  "projectId": "project_01",
  "expectedRevision": 12,
  "payload": {},
  "meta": {
    "source": "ui",
    "actorMemberId": "member_01",
    "clientRequestId": "req_01",
    "dryRun": false
  }
}
```

Required fields:

- `commandName`
- `projectId`
- `payload`

Recommended fields:

- `expectedRevision`
- `meta.source`
- `meta.actorMemberId`
- `meta.clientRequestId`
- `meta.dryRun`

### `meta.source`

Recommended values:

- `ui`
- `import`
- `automation`
- `mcp`
- `system`

### Dry run

`dryRun` should validate and preview effects without committing mutation.

Use cases:

- deletion impact review
- import preview
- automation preview
- MCP planning steps

## Command result shape

Recommended result shape:

```json
{
  "ok": true,
  "projectId": "project_01",
  "previousRevision": 12,
  "newRevision": 13,
  "events": [],
  "warnings": [],
  "errors": [],
  "changedRecords": [
    { "recordType": "workItem", "recordId": "item_01" }
  ]
}
```

Rules:

- successful mutations return the old and new revisions
- failed validations return structured errors
- conflicts return explicit conflict errors, not vague save failures
- results should expose changed record references where practical

## Error model

Recommended top-level error codes:

- `validation_failed`
- `revision_conflict`
- `not_found`
- `not_applicable`
- `dependency_violation`
- `permission_denied`
- `unsupported_by_adapter`
- `migration_required`
- `module_missing`

Error objects should identify:

- error code
- user-facing summary
- machine-readable field or record context where possible

## Revision and concurrency rules

Rules:

- mutating commands should accept `expectedRevision` where a loaded project instance exists
- when `expectedRevision` does not match the current loaded revision, the command should fail with `revision_conflict`
- callers may then reload, rebase, or explicitly retry
- dry-run commands may still report predicted revision outcomes without applying them

## Command naming

Naming should be stable and descriptive.

Recommended convention:

- `<area>.<action>`

Examples:

- `project.rename`
- `item.create`
- `item.updateFields`
- `relationship.add`
- `checklist.reorder`
- `board.moveItem`
- `trash.restore`

Rules:

- prefer explicit verbs over overloaded generic names
- keep payload structure stable even if UI wording evolves

## Command categories

### Project commands

Recommended commands:

- `project.create`
- `project.rename`
- `project.setAccentColor`
- `project.setDefaultView`
- `project.updateSettings`

Host-adjacent project commands:

- `project.open`
- `project.save`
- `project.saveAs`
- `project.linkFolder`
- `project.exportBundle`
- `project.importBundle`

Adapter note:

- `project.open`, `project.saveAs`, and `project.linkFolder` depend on browser or desktop capabilities and may return `unsupported_by_adapter`

### Template commands

Recommended commands:

- `template.createFromProject`
- `template.import`
- `template.export`
- `template.archive`
- `template.duplicate`

### Item commands

Recommended commands:

- `item.create`
- `item.updateFields`
- `item.rename`
- `item.setDescription`
- `item.changeType`
- `item.duplicate`
- `item.archive`
- `item.moveToTrash`

`item.updateFields` should cover ordinary shared editable fields such as:

- `title`
- `description`
- `startDate`
- `dueDate`
- `assigneeMemberId`
- `labelIds`
- `milestoneId`

### Workflow and priority commands

Recommended commands:

- `workflow.setStatus`
- `workflow.bulkSetStatus`
- `workflow.createStatus`
- `workflow.updateStatus`
- `workflow.archiveStatus`
- `workflow.replaceStatus`
- `priority.setPriority`
- `priority.bulkSetPriority`
- `priority.createDefinition`
- `priority.updateDefinition`
- `priority.archiveDefinition`
- `priority.replaceDefinition`

Rules:

- all workflow and priority commands use validated IDs rather than visible names
- category semantics derive from referenced definitions, not from command names

### Bug commands

Recommended commands:

- `bug.setSeverity`
- `bug.updateReportFields`
- `bug.addReproductionStep`
- `bug.updateReproductionStep`
- `bug.reorderReproductionSteps`
- `bug.removeReproductionStep`

Rules:

- commands must reject or hide inapplicable bug behavior based on configured applicable `typeId` values
- bug severity remains separate from general priority

### Hierarchy commands

Recommended commands:

- `hierarchy.setParent`
- `hierarchy.clearParent`

Rules:

- reject self-parenting, cycles, cross-project relationships, and depth violations under the MVP one-level UI limit

### Relationship commands

Recommended commands:

- `relationship.addBlocks`
- `relationship.removeBlocks`
- `relationship.addRelatesTo`
- `relationship.removeRelatesTo`

Rules:

- the same validation applies to UI, import, automation, and MCP callers
- commands reject duplicate, self, cross-project, and blocking-cycle relationships

### Checklist commands

Recommended commands:

- `checklist.addEntry`
- `checklist.updateEntry`
- `checklist.reorderEntries`
- `checklist.completeEntry`
- `checklist.reopenEntry`
- `checklist.removeEntry`
- `checklist.convertEntryToSubtask`

Rules:

- checklist conversion is atomic and undoable
- conversion obeys hierarchy limits and workflow defaults

### Comment commands

Recommended commands:

- `comment.add`
- `comment.reply`
- `comment.edit`
- `comment.softDelete`
- `comment.restore`

Rules:

- comments preserve discussion integrity
- edit history and deletion state remain inspectable

### Docs commands

Recommended commands:

- `document.create`
- `document.rename`
- `document.updateBody`
- `document.move`
- `document.archive`
- `document.moveToTrash`
- `document.restore`

Optional structured link commands:

- `document.linkRecord`
- `document.unlinkRecord`

### Board and view commands

Recommended commands:

- `board.moveItem`
- `board.reorderItem`
- `board.createView`
- `board.updateColumn`
- `board.reorderColumns`
- `board.setWipMode`
- `view.create`
- `view.rename`
- `view.instantiate`
- `view.archive`

Important rule:

- `board.moveItem` is allowed as a first-class command because it represents a real user action
- internally it must still resolve through the same validated workflow and placement rules as lower-level commands

### Roadmap and calendar commands

Recommended commands:

- `roadmap.moveItemRange`
- `roadmap.resizeItemRange`
- `roadmap.moveItemToMilestoneLane`
- `calendar.createView`
- `calendar.updateViewFilters`

Rules:

- roadmap date edits preserve date-only semantics
- roadmap commands do not silently cascade dependency rescheduling

### Attachment commands

Recommended commands:

- `attachment.add`
- `attachment.rename`
- `attachment.retarget`
- `attachment.remove`

Adapter note:

- attachment binaries may require host-level filesystem or browser file APIs
- metadata changes still belong to the shared project command surface

### Reminder commands

Recommended commands:

- `reminder.create`
- `reminder.update`
- `reminder.remove`
- `reminder.snoozeLocal` later

Boundary rule:

- shared reminder definitions belong to the project
- machine-local delivery and dismissal state do not

### Trash and lifecycle commands

Recommended commands:

- `trash.moveRecord`
- `trash.restore`
- `trash.inspectPermanentDeleteImpact`
- `trash.permanentlyDelete`

Rules:

- permanent deletion should support dry-run inspection
- permanent deletion requires explicit dependent-record handling choices
- no caller gets a bypass around lifecycle validation

### Module and plugin commands

Recommended commands:

- `module.enable`
- `module.disable`
- `module.removeStoredData`
- `module.configure`

Rules:

- disabling a module is not equivalent to deleting its data
- unknown plugin namespaces must not be silently discarded
- module commands must respect trust mode and declared capabilities

### Automation commands

Recommended commands:

- `automation.createRule`
- `automation.updateRule`
- `automation.enableRule`
- `automation.disableRule`
- `automation.deleteRule`
- `automation.previewRule`
- `automation.runRuleNow` later where appropriate

Rules:

- automations use the same underlying validated commands as any other caller
- avoid a second mutation pathway just for automation

## Query and inspection surface

The command surface should be paired with structured queries.

Recommended query commands:

- `query.search`
- `query.listItems`
- `query.getItem`
- `query.listDocuments`
- `query.getDocument`
- `query.listTrash`
- `query.inspectDeletionImpact`
- `query.listViews`
- `query.listModules`
- `query.listAutomations`

### Search query expectations

Search must support:

- full-text search
- filtered search
- source grouping across items, docs, comments, and labels
- structured results rather than raw file dumps

## Composite versus low-level commands

Both levels are useful.

Recommended posture:

- allow low-level commands such as `workflow.setStatus`
- allow user-shaped composite commands such as `board.moveItem`
- composite commands must still validate and emit the same core invariants

This gives MCP and automation callers a practical surface without forcing them to manually replay every tiny UI step.

## Events and audit context

Every successful mutating command should emit structured events into activity history.

Recommended event fields:

- `eventId`
- `eventType`
- `recordType`
- `recordId`
- `occurredAt`
- `actorMemberId`
- `source`
- `commandName`
- `before` and `after` snippets where practical

Rules:

- source context such as `ui`, `import`, `automation`, or `mcp` should be preserved
- events should remain intelligible after archive, trash, restore, and permitted deletion flows

## Import and migration posture

Imports should not write arbitrary bundle fragments directly.

Recommended posture:

- use import parsers to map external data into command batches
- run the same validation used for UI and MCP
- allow dry-run previews before commit

## MCP and local AI posture

The MCP bridge is optional and local or trusted-environment only.

Rules:

- MCP should call the validated command surface rather than raw file mutation
- MCP should be able to perform everything a normal user can do, including board moves, workflow changes, view setup, search, and restore flows
- trust-sensitive host commands may require explicit capability checks or user confirmation

## Adapter capability flags

Some commands depend on platform capabilities.

Examples:

- browser folder access
- attachment file writes
- installer-specific operations

Recommended posture:

- keep command names stable
- report unsupported operations with structured capability errors rather than omitting whole command families silently

## Testing expectations

The command surface should have:

- unit tests for validation and domain effects
- revision-conflict tests
- dry-run tests
- import and automation parity tests
- MCP parity tests for high-value actions
- browser and desktop adapter capability tests for host-level commands
