import type { ProjectId, StatusId, TypeId } from "./ids";
import { generateId } from "./ids";
import { type Timestamp, nowTimestamp } from "./dates";
import type { WorkItem } from "./work-item";
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
        "builtin.attachments"
      ],
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
}
