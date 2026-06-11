# Grillo Project Hub Project Bundle and Schema Spec

## Purpose

This document defines the canonical portable project bundle for Grillo Project Hub (GPH).

It is the storage contract for:

- desktop filesystem persistence
- browser import and export
- browser folder-backed persistence where available
- backups and snapshots
- future migration helpers
- shared-file collaboration

This spec is intended to be implementation-facing. Earlier examples in other planning docs are illustrative; this file should be treated as the exact source-of-truth direction for the bundle shape.

## Core goals

The bundle format should be:

- portable
- inspectable
- migration-friendly
- resilient to missing plugins
- stable across web and desktop
- safe for shared-file workflows

## Canonical location and folder layout

Recommended durable project layout:

- `.pm-suite/project.pms.json`
- `.pm-suite/attachments/`
- `.pm-suite/snapshots/` later
- `.pm-suite/exports/` later

Rules:

- `project.pms.json` is the canonical primary artifact
- folder-backed projects store attachment binaries outside the JSON bundle
- desktop and browser implementations must share this bundle format even when the storage adapter differs

## Format identity and versioning

The bundle must identify both the format family and the version needed to read it.

Recommended exact shape:

```json
{
  "format": {
    "type": "grillo-project-hub.project",
    "version": 1,
    "minReaderVersion": 1
  }
}
```

Rules:

- `format.type` is a stable literal string
- `format.version` is the schema version written by the current app
- `format.minReaderVersion` is the minimum reader version required after migrations or incompatible additions
- writers must not silently downgrade a newer bundle they do not fully understand
- readers may migrate older bundles in memory, but durable writes should always emit the current supported version

## Top-level structure

The canonical top-level keys are:

- `format`
- `project`
- `core`
- `modules`
- `projectSettings`

Recommended top-level shape:

```json
{
  "format": {
    "type": "grillo-project-hub.project",
    "version": 1,
    "minReaderVersion": 1
  },
  "project": {
    "projectId": "project_01",
    "name": "Example Project",
    "accentColor": "#5C8F56",
    "revision": 12,
    "createdAt": "2026-06-10T17:00:00Z",
    "updatedAt": "2026-06-10T18:15:00Z"
  },
  "core": {},
  "modules": {},
  "projectSettings": {}
}
```

Boundary rule:

- do not add machine-local UI preferences, window state, notification permissions, or filesystem-specific absolute paths to the shared bundle

## Revision and shared-file safety

The bundle must support safe shared-file workflows.

Rules:

- `project.revision` is incremented on every successful persisted mutation batch
- revision is used to detect external changes and stale writes
- command execution should operate against an expected revision where possible
- a stale revision should produce a conflict response rather than a silent overwrite
- in-memory undo history is not part of the shared bundle
- shared reminders may exist in the bundle, but machine-local delivery state does not

## ID conventions

All stable records use opaque IDs rather than display names as identity.

Recommended ID families:

- `project_*`
- `item_*`
- `member_*`
- `relationship_*`
- `document_*`
- `comment_*`
- `reminder_*`
- `attachment_*`
- `view_*`
- `automation_*`
- `trash_*`

Rules:

- IDs must remain stable across rename, reorder, archive, and restore operations
- importers may preserve external IDs where safe, but the app should normalize into GPH-safe IDs when necessary
- IDs must be unique within their record family

## Date and time conventions

Rules:

- planning dates such as `startDate`, `dueDate`, and milestone target dates use canonical `YYYY-MM-DD`
- system timestamps use full UTC ISO 8601 strings
- reminders use exact UTC `remindAt` values plus IANA `timeZone`
- readers and writers must not reinterpret date-only values as UTC-midnight timestamps

## Core section

`core` stores stable records that must remain meaningful even when feature modules are disabled or missing.

Recommended shape:

```json
{
  "core": {
    "itemTypes": {
      "defaultTypeId": "task",
      "definitions": [
        {
          "typeId": "task",
          "name": "Task",
          "icon": "check-square",
          "description": "",
          "order": 1024,
          "defaultStatusId": "inbox",
          "defaultPriorityId": null,
          "archived": false
        }
      ]
    },
    "members": {
      "member_01": {
        "memberId": "member_01",
        "displayName": "Alex",
        "color": "#4F7D75"
      }
    },
    "items": {
      "item_01": {
        "itemId": "item_01",
        "typeId": "task",
        "title": "Add project import",
        "description": "Allow a project bundle to be opened from disk.",
        "parentId": null,
        "labelIds": [],
        "milestoneId": null,
        "assigneeMemberId": null,
        "startDate": "2026-06-10",
        "dueDate": "2026-06-12",
        "createdAt": "2026-06-10T17:10:00Z",
        "updatedAt": "2026-06-10T18:10:00Z",
        "archivedAt": null
      }
    },
    "relationships": {
      "relationship_01": {
        "relationshipId": "relationship_01",
        "type": "blocks",
        "sourceItemId": "item_01",
        "targetItemId": "item_02"
      }
    },
    "activity": {
      "event_01": {
        "eventId": "event_01",
        "recordType": "workItem",
        "recordId": "item_01",
        "eventType": "item.created",
        "occurredAt": "2026-06-10T17:10:00Z",
        "actorMemberId": "member_01",
        "source": "ui"
      }
    },
    "trash": {
      "trash_01": {
        "trashId": "trash_01",
        "recordType": "workItem",
        "recordId": "item_09",
        "trashedAt": "2026-06-10T19:00:00Z",
        "trashedByMemberId": "member_01"
      }
    }
  }
}
```

### Core item rules

Core work items own:

- identity
- title
- description
- hierarchy reference through `parentId`
- shared planning references such as `labelIds`, `milestoneId`, `assigneeMemberId`, `startDate`, and `dueDate`
- timestamps

Core work items do not directly own:

- workflow definitions
- board placement
- roadmap lane configuration
- bug-specific structured fields
- docs content
- comments
- reminders

Those belong in modules.

### Relationship rules

Rules:

- store `blocks` once as a directional edge
- store `relatesTo` once as a canonical symmetric edge
- never store both `blocks` and `blockedBy` as independent persisted records
- reject duplicate, cross-project, self, and blocking-cycle relationships

### Activity rules

The activity log should be append-oriented and explanation-friendly.

Rules:

- include enough context to support history, restore, audit, and undo-safe inspection
- preserve source context such as `ui`, `import`, `automation`, or `mcp`
- allow minimal tombstones after permanent deletion where total removal would break historical meaning

### Trash rules

Rules:

- trash is shared project data
- a trashed record keeps its stable ID and underlying data until permanent deletion
- trash entries reference records rather than duplicating them
- trash does not auto-purge in MVP

## Modules section

`modules` stores configuration and data owned by built-in or later trusted modules.

General shape:

```json
{
  "modules": {
    "builtin.workflow": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {},
      "data": {}
    }
  }
}
```

Rules:

- keys are stable module IDs
- each module owns `schemaVersion`, `enabled`, `config`, and `data`
- modules reference core records by stable ID
- modules must not duplicate full core records
- unknown module sections must round-trip unchanged
- disabling a module must not delete its stored data

### Expected MVP built-in modules

Recommended MVP built-in module IDs:

- `builtin.workflow`
- `builtin.board`
- `builtin.backlog`
- `builtin.table`
- `builtin.docs`
- `builtin.roadmap`
- `builtin.calendar`
- `builtin.labels`
- `builtin.milestones`
- `builtin.comments`
- `builtin.bugs`
- `builtin.reminders`
- `builtin.attachments`
- `builtin.automation`
- `builtin.custom-fields`

The exact set may evolve, but the ownership boundaries should not.

### Workflow module

Owns:

- status definitions
- priority definitions
- per-item workflow state such as `statusId` and `priorityId`

Recommended shape:

```json
{
  "modules": {
    "builtin.workflow": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {
        "initialStatusId": "inbox",
        "completedStatusId": "done",
        "statuses": [
          {
            "statusId": "inbox",
            "name": "Inbox",
            "category": "planned",
            "order": 1024,
            "color": null,
            "archived": false
          }
        ],
        "priorities": [
          {
            "priorityId": "high",
            "name": "High",
            "rank": 300,
            "color": "orange",
            "archived": false
          }
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
    }
  }
}
```

### Board module

Owns:

- board view definitions
- grouped status-to-column mappings
- default drop status rules
- WIP settings
- per-view placement and ordering

Recommended shape:

```json
{
  "modules": {
    "builtin.board": {
      "schemaVersion": 1,
      "enabled": true,
      "config": {
        "views": {
          "view_board_main": {
            "viewId": "view_board_main",
            "name": "Main Board",
            "columns": [
              {
                "columnId": "triage",
                "name": "Triage",
                "statusIds": ["inbox", "ready"],
                "defaultDropStatusId": "ready",
                "wipLimit": 5,
                "wipMode": "warn"
              }
            ]
          }
        }
      },
      "data": {
        "placements": {
          "view_board_main": {
            "item_01": {
              "columnId": "triage",
              "position": 1024
            }
          }
        }
      }
    }
  }
}
```

### Docs module

Owns:

- documents
- folder or section structure
- stored links and embeds

Rules:

- documents use stable `documentId`
- backlinks are derived, not separately edited
- external URLs may be referenced but not treated as executable embeds

### Comments module

Owns:

- comment records
- thread structure
- edit history
- soft-delete and tombstone behavior

Rules:

- comments may target items and documents by stable ID
- deleted comments should preserve discussion integrity
- comments remain searchable and exportable under documented rules

### Bugs module

Owns:

- severity definitions
- per-item severity values
- reproduction steps
- expected behavior
- actual behavior
- environment
- optional affected version

### Reminders module

Owns:

- shared reminder definitions and stable targets

Machine-local notification delivery state is not part of the shared bundle.

### Attachments module

Owns:

- attachment metadata
- relationships between attachments and items or documents

Attachment binaries remain outside the JSON bundle in folder-backed mode.

### Automation module

Owns:

- trigger/condition/action rules
- automation enablement state
- rule metadata

Rules:

- automation definitions travel with the project
- runtime execution state should remain inspectable and may include machine-local details outside the bundle where needed

### Custom fields module

Owns:

- project-defined custom-field definitions
- typed field metadata
- applicability constraints by `typeId`
- per-item values if the implementation does not keep them directly on core items

Recommended rule:

- keep definitions centralized
- keep values stable and type-safe
- preserve values when fields become temporarily inapplicable

## Project settings section

`projectSettings` stores project-level settings that should travel with the bundle but do not belong to one module's private data.

Recommended contents:

- default view references
- enabled view ordering references
- project-level saved-view references once implemented
- project-level feature toggles that have safe fallbacks

Rules:

- never store machine-specific absolute paths here
- never store per-install notification permission state here
- references to module-owned views must degrade safely if the module is missing

## Unknown data preservation rules

Readers and writers must be conservative.

Rules:

- preserve unknown module sections byte-for-byte where practical or semantically unchanged where exact byte preservation is not possible
- preserve unknown fields inside known module payloads unless a migration explicitly transforms them
- do not silently discard opaque plugin namespaces

## Validation rules

Minimum validation should include:

- required top-level sections
- `format.type` and version compatibility
- unique IDs within each record family
- referential integrity for item, member, milestone, label, view, attachment, reminder, and document references where those modules are present
- date-only and timestamp format correctness
- hierarchy cycle rejection
- relationship rule enforcement
- status and priority reference validity
- module `schemaVersion` presence

Validation posture:

- prefer specific field-level errors over generic corruption messages
- allow read-only recovery where possible when non-critical module data is malformed

## Migration rules

Migration is a first-class responsibility.

Rules:

- migrations must be explicit and versioned
- core format migrations and module migrations are separate concerns
- migrating one module must not rewrite unrelated module payloads unnecessarily
- the app should migrate older bundles in memory before mutation where possible
- writing a migrated bundle must bump `format.version` and `project.revision` as appropriate

## Import and export rules

Rules:

- JSON import and export must preserve the canonical structure as closely as possible
- Markdown and CSV exports are derivative, not canonical
- importers from other systems should map into this schema rather than bypassing it
- imports should resolve through the validated command surface where practical

## Out-of-bundle machine-local state

The following should remain outside the shared project bundle:

- current signed-in OS identity if any
- selected local member for `My Work`
- window and panel layout preferences
- notification permission state
- reminder delivery attempts
- machine-local dismissal state
- cached search indexes
- draft unsaved recovery buffers

## Testing expectations

The bundle contract should have:

- schema validation tests
- migration tests
- round-trip serialization tests
- unknown-module preservation tests
- browser and desktop import/export parity tests
- shared-file conflict tests using `project.revision`
