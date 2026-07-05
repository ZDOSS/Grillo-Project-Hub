import type { ProjectId, StatusId, TypeId } from "./ids";
import { generateId } from "./ids";
import { type Timestamp, nowTimestamp } from "./dates";
import { validateWorkItem, type WorkItem } from "./work-item";
import type { Member } from "./member";
import type { Label } from "./label";
import type { Milestone } from "./milestone";
import type { Document, Folder } from "./document";
import type { StatusDefinition, PriorityDefinition } from "./workflow";
import type { WorkItemTypeDefinition } from "./work-item-type";
import type { SeverityDefinition } from "./bug";
import type { View } from "./view";
import type { CustomFieldDefinition } from "./custom-field";
import type { Reminder } from "./reminder";
import type { Attachment } from "./attachment";
import type { EventRecord } from "./event";
import type { Relationship } from "./work-item";
import { defaultStatuses, defaultPriorities } from "./workflow";
import { defaultWorkItemTypes } from "./work-item-type";
import { defaultSeverities } from "./bug";
import {
  createBoardView,
  createBacklogView,
  createTableView
} from "./view";

/**
 * Project bundle: the canonical unit of project data.
 *
 *  - Top-level: format, project, core (universal records), modules, projectSettings.
 *  - Module data lives under modules.<moduleId>.data.
 *  - Unknown module sections are preserved unchanged when saving.
 *  - The bundle includes a revision counter to detect external changes.
 */

export const PROJECT_FORMAT_TYPE = "project-management-suite";
export const PROJECT_FORMAT_VERSION = 1;

export type ProjectFormat = {
  type: string;
  version: number;
};

export type ProjectMeta = {
  id: ProjectId;
  name: string;
  description?: string;
  /** Monotonic counter incremented on every save. */
  revision: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Default type ID for new items. */
  defaultTypeId: TypeId;
  /** Initial status (in `planned` category) for new items. */
  defaultInitialStatusId: StatusId;
  /** Completed status (in `completed` category) used to mark items done. */
  defaultCompletedStatusId: StatusId;
  /** Optional accent color for the project identity. */
  accentColor?: string | null;
};

export type ProjectCore = {
  itemTypes: WorkItemTypeDefinition[];
  statuses: StatusDefinition[];
  priorities: PriorityDefinition[];
  members: Member[];
  labels: Label[];
  milestones: Milestone[];
  folders: Folder[];
  documents: Document[];
  customFields: CustomFieldDefinition[];
  items: WorkItem[];
  relationships: Relationship[];
  events: EventRecord[];
  reminders: Reminder[];
  attachments: Attachment[];
  trash: TrashRecord[];
};

export type ModuleSection = {
  schemaVersion: number;
  enabled: boolean;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type ProjectBundle = {
  format: ProjectFormat;
  project: ProjectMeta;
  core: ProjectCore;
  modules: Record<string, ModuleSection>;
  projectSettings: {
    defaultViewId: string | null;
    enabledModuleIds: string[];
    hiddenViewIds: string[];
    storageTrust: "folder" | "browser" | "unsaved";
    pluginTrustMode: "first-party" | "curated" | "unrestricted";
  };
};

export type TrashRecord = {
  recordType: "workItem" | "document" | "milestone" | "label" | "status" | "priority" | "type" | "severity" | "view" | "docFolder" | "relationship" | "attachment";
  recordId: string;
  payload: unknown;
  trashedAt: Timestamp;
  /** History tombstones and child references may be preserved here for reference-impact review. */
  notes?: string;
};

export function createProjectBundle(input: { name: string; description?: string; now?: Timestamp }): ProjectBundle {
  const now = input.now ?? nowTimestamp();
  const id = generateId("project");
  const statuses = defaultStatuses();
  const priorities = defaultPriorities();
  const types = defaultWorkItemTypes();
  const initial = statuses.find((s) => s.category === "planned")!;
  const completed = statuses.find((s) => s.category === "completed")!;
  const defaultType = types[0];

  const board = createBoardView({
    name: "Main Board",
    columns: [
      { name: "To Do", statusIds: [statuses[0].id, statuses[1].id], defaultDropStatusId: statuses[1].id, order: 1024 },
      { name: "In Progress", statusIds: [statuses[2].id, statuses[3].id], defaultDropStatusId: statuses[2].id, order: 2048, wipLimit: 8, wipMode: "warn" },
      { name: "Review", statusIds: [statuses[4].id], defaultDropStatusId: statuses[4].id, order: 3072, wipLimit: 5, wipMode: "warn" },
      { name: "Done", statusIds: [statuses[5].id], defaultDropStatusId: statuses[5].id, order: 4096 }
    ]
  });

  const backlog = createBacklogView({ name: "Backlog" });
  const table = createTableView({ name: "Table" });

  return {
    format: { type: PROJECT_FORMAT_TYPE, version: PROJECT_FORMAT_VERSION },
    project: {
      id,
      name: input.name,
      description: input.description ?? "",
      revision: 0,
      createdAt: now,
      updatedAt: now,
      defaultTypeId: defaultType.id,
      defaultInitialStatusId: initial.id,
      defaultCompletedStatusId: completed.id,
      accentColor: null
    },
    core: {
      itemTypes: types,
      statuses,
      priorities,
      members: [],
      labels: [],
      milestones: [],
      folders: [],
      documents: [],
      customFields: [],
      items: [],
      relationships: [],
      events: [],
      reminders: [],
      attachments: [],
      trash: []
    },
    modules: {
      "builtin.workflow": {
        schemaVersion: 1,
        enabled: true,
        config: { initialStatusId: initial.id, completedStatusId: completed.id },
        data: {}
      },
      "builtin.kanban": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { views: { [board.id]: board }, placements: {} }
      },
      "builtin.bugs": {
        schemaVersion: 1,
        enabled: true,
        config: { applicableTypeIds: ["bug"], severities: defaultSeverities() },
        data: { severities: defaultSeverities() }
      },
      "builtin.docs": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { documents: {} }
      },
      "builtin.reminders": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { reminders: {} }
      },
      "builtin.roadmap": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { placements: {} }
      },
      "builtin.calendar": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: {}
      },
      "builtin.attachments": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: {}
      },
      "builtin.automation": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { rules: [] }
      }
    },
    projectSettings: {
      defaultViewId: board.id,
      enabledModuleIds: [
        "builtin.workflow",
        "builtin.kanban",
        "builtin.bugs",
        "builtin.docs",
        "builtin.reminders",
        "builtin.roadmap",
        "builtin.calendar",
        "builtin.attachments",
        "builtin.automation"
      ],
      hiddenViewIds: [],
      storageTrust: "browser",
      pluginTrustMode: "first-party"
    }
  };
}

/** Bump revision and update updatedAt. */
export function bumpRevision(bundle: ProjectBundle, now: Timestamp = nowTimestamp()): ProjectBundle {
  return {
    ...bundle,
    project: { ...bundle.project, revision: bundle.project.revision + 1, updatedAt: now }
  };
}

/** Validate top-level structure. Throws on invalid bundles. */
export function validateProjectBundle(bundle: unknown): asserts bundle is ProjectBundle {
  if (!bundle || typeof bundle !== "object") throw new Error("Project bundle must be an object");
  const b = bundle as Partial<ProjectBundle>;
  if (!b.format || b.format.type !== PROJECT_FORMAT_TYPE) {
    throw new Error(`Invalid format: ${b.format?.type}`);
  }
  if (typeof b.format.version !== "number") throw new Error("Missing format.version");
  if (!b.project || typeof b.project.id !== "string") throw new Error("Missing project.id");
  if (!b.core || typeof b.core !== "object") throw new Error("Missing core");
  if (!b.modules || typeof b.modules !== "object") throw new Error("Missing modules");
  if (!b.projectSettings || typeof b.projectSettings !== "object") throw new Error("Missing projectSettings");
  validateProjectCoreShape(b.core);
  validateProjectReferences(b as ProjectBundle);
}

const CORE_ARRAY_KEYS = [
  "itemTypes",
  "statuses",
  "priorities",
  "members",
  "labels",
  "milestones",
  "folders",
  "documents",
  "customFields",
  "items",
  "relationships",
  "events",
  "reminders",
  "attachments",
  "trash"
] as const;

function validateProjectCoreShape(core: unknown): asserts core is ProjectCore {
  const c = core as Partial<ProjectCore>;
  for (const key of CORE_ARRAY_KEYS) {
    if (!Array.isArray(c[key])) {
      throw new Error(`Missing core.${key}`);
    }
  }
}

function idsFor(records: Array<{ id: string }>): Set<string> {
  return new Set(records.map((record) => record.id));
}

function requireKnown(ids: Set<string>, id: string | null | undefined, label: string): void {
  if (id == null) return;
  if (!ids.has(id)) throw new Error(`${label} not found: ${id}`);
}

function validateProjectReferences(bundle: ProjectBundle): void {
  const typeIds = idsFor(bundle.core.itemTypes);
  const statusIds = idsFor(bundle.core.statuses);
  const priorityIds = idsFor(bundle.core.priorities);
  const memberIds = idsFor(bundle.core.members);
  const labelIds = idsFor(bundle.core.labels);
  const milestoneIds = idsFor(bundle.core.milestones);
  const folderIds = idsFor(bundle.core.folders);
  const documentIds = idsFor(bundle.core.documents);
  const itemIds = idsFor(bundle.core.items);

  requireKnown(typeIds, bundle.project.defaultTypeId, "Default type");
  requireKnown(statusIds, bundle.project.defaultInitialStatusId, "Default initial status");
  requireKnown(statusIds, bundle.project.defaultCompletedStatusId, "Default completed status");

  for (const type of bundle.core.itemTypes) {
    requireKnown(statusIds, type.defaultStatusId ?? null, "Default status");
    requireKnown(priorityIds, type.defaultPriorityId ?? null, "Default priority");
  }

  for (const folder of bundle.core.folders) {
    requireKnown(folderIds, folder.parentFolderId, "Parent folder");
  }

  for (const doc of bundle.core.documents) {
    requireKnown(folderIds, doc.folderId, "Folder");
  }

  for (const item of bundle.core.items) {
    validateWorkItem(item);
    requireKnown(typeIds, item.typeId, "Type");
    requireKnown(statusIds, item.statusId, "Status");
    requireKnown(priorityIds, item.priorityId, "Priority");
    requireKnown(memberIds, item.assigneeId, "Member");
    requireKnown(memberIds, item.reporterId, "Member");
    requireKnown(milestoneIds, item.milestoneId, "Milestone");
    requireKnown(itemIds, item.parentId, "Parent item");
    for (const labelId of item.labelIds) {
      requireKnown(labelIds, labelId, "Label");
    }
  }

  for (const relationship of bundle.core.relationships) {
    requireKnown(itemIds, relationship.sourceItemId, "Relationship source item");
    requireKnown(itemIds, relationship.targetItemId, "Relationship target item");
  }

  for (const reminder of bundle.core.reminders) {
    if (reminder.targetType === "workItem") requireKnown(itemIds, reminder.targetId, "Reminder item");
    if (reminder.targetType === "milestone") requireKnown(milestoneIds, reminder.targetId, "Reminder milestone");
    if (reminder.targetType === "document") requireKnown(documentIds, reminder.targetId, "Reminder document");
  }

  for (const attachment of bundle.core.attachments) {
    requireKnown(itemIds, attachment.itemId, "Attachment item");
    requireKnown(documentIds, attachment.docId, "Attachment document");
  }

  const kanban = bundle.modules["builtin.kanban"];
  const views = ((kanban?.data as { views?: Record<string, View> } | undefined)?.views) ?? {};
  for (const view of Object.values(views)) {
    validateViewFilterReferences(view, { typeIds, statusIds, priorityIds, memberIds, labelIds, milestoneIds });
    if (view.type === "board") {
      for (const column of view.columns) {
        requireKnown(statusIds, column.defaultDropStatusId, "Board default drop status");
        for (const statusId of column.statusIds) {
          requireKnown(statusIds, statusId, "Board column status");
        }
      }
    }
    if (view.type === "myWork") {
      if (view.filterMemberId) {
        requireKnown(memberIds, view.filterMemberId, "My Work member");
      }
    }
  }
}

function validateViewFilterReferences(
  view: View,
  known: {
    typeIds: Set<string>;
    statusIds: Set<string>;
    priorityIds: Set<string>;
    memberIds: Set<string>;
    labelIds: Set<string>;
    milestoneIds: Set<string>;
  }
): void {
  const filter = view.filter;
  if (!filter) return;
  if (filter.typeIds) {
    for (const id of filter.typeIds) requireKnown(known.typeIds, id, "View filter type");
  }
  if (filter.statusIds) {
    for (const id of filter.statusIds) requireKnown(known.statusIds, id, "View filter status");
  }
  if (filter.priorityIds) {
    for (const id of filter.priorityIds) requireKnown(known.priorityIds, id, "View filter priority");
  }
  if (filter.assigneeIds) {
    for (const id of filter.assigneeIds) requireKnown(known.memberIds, id, "View filter assignee");
  }
  if (filter.labelIds) {
    for (const id of filter.labelIds) requireKnown(known.labelIds, id, "View filter label");
  }
  if (filter.milestoneIds) {
    for (const id of filter.milestoneIds) requireKnown(known.milestoneIds, id, "View filter milestone");
  }
}
