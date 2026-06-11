import type { ProjectBundle } from "../domain/project";
import type { ProjectId, ItemId, MemberId } from "../domain/ids";

/**
 * Validated command surface.
 *
 *  - One envelope is shared by UI actions, automation rules, imports, and MCP/AI bridge.
 *  - Each command has a `type`, a versioned `payload`, and an `idempotencyKey`.
 *  - Commands route through a dispatcher that applies the change to a `ProjectBundle` and
 *    records an event in the activity log.
 *
 * Shape per AI.md / FullSpec: host (UI/MCP/import/automation), domain (which area), and query layers.
 */

export type CommandSource = "ui" | "mcp" | "import" | "automation" | "system";

export type CommandEnvelope<T extends CommandPayload = CommandPayload> = {
  type: CommandType;
  payload: T;
  source: CommandSource;
  actorId: MemberId | null;
  /** Unique key for idempotency. */
  idempotencyKey: string;
  /** Wall-clock instant the command was issued. */
  issuedAt: string;
};

export type CommandPayload =
  | ProjectCreatePayload
  | ProjectRenamePayload
  | ItemCreatePayload
  | ItemUpdatePayload
  | ItemMoveStatusPayload
  | ItemMoveParentPayload
  | ItemArchivePayload
  | ItemTrashPayload
  | ItemRestorePayload
  | ItemDuplicatePayload
  | ItemAddChecklistEntryPayload
  | ItemToggleChecklistEntryPayload
  | ItemReorderChecklistPayload
  | ItemConvertChecklistToSubtaskPayload
  | RelationshipCreatePayload
  | RelationshipDeletePayload
  | CommentCreatePayload
  | CommentEditPayload
  | CommentDeletePayload
  | MilestoneCreatePayload
  | MilestoneUpdatePayload
  | LabelCreatePayload
  | LabelUpdatePayload
  | MemberCreatePayload
  | StatusCreatePayload
  | StatusUpdatePayload
  | PriorityCreatePayload
  | PriorityUpdatePayload
  | TypeCreatePayload
  | TypeUpdatePayload
  | DocCreatePayload
  | DocUpdatePayload
  | DocDeletePayload
  | DocMovePayload
  | CustomFieldDefinePayload
  | ReminderCreatePayload
  | ReminderUpdatePayload
  | ReminderDeletePayload
  | AttachmentAddPayload
  | AttachmentDeletePayload
  | ViewCreatePayload
  | ViewUpdatePayload
  | ViewDeletePayload
  | SearchPayload;

export type CommandType = CommandPayload["type"];

/* Project */
export type ProjectCreatePayload = {
  type: "project.create";
  name: string;
  description?: string;
  templateId?: string;
};
export type ProjectRenamePayload = {
  type: "project.rename";
  projectId: ProjectId;
  name: string;
};

/* Items */
export type ItemCreatePayload = {
  type: "item.create";
  projectId: ProjectId;
  typeId: string;
  title: string;
  description?: string;
  statusId?: string;
  priorityId?: string | null;
  assigneeId?: MemberId | null;
  labelIds?: string[];
  milestoneId?: string | null;
  parentId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
};
export type ItemUpdatePayload = {
  type: "item.update";
  projectId: ProjectId;
  itemId: ItemId;
  patch: Record<string, unknown>;
};
export type ItemMoveStatusPayload = {
  type: "item.moveStatus";
  projectId: ProjectId;
  itemId: ItemId;
  toStatusId: string;
};
export type ItemMoveParentPayload = {
  type: "item.moveParent";
  projectId: ProjectId;
  itemId: ItemId;
  toParentId: string | null;
};
export type ItemArchivePayload = {
  type: "item.archive";
  projectId: ProjectId;
  itemId: ItemId;
};
export type ItemTrashPayload = {
  type: "item.trash";
  projectId: ProjectId;
  itemId: ItemId;
};
export type ItemRestorePayload = {
  type: "item.restore";
  projectId: ProjectId;
  itemId: ItemId;
};
export type ItemDuplicatePayload = {
  type: "item.duplicate";
  projectId: ProjectId;
  itemId: ItemId;
  includeRelationships?: boolean;
  includeAttachments?: boolean;
};

/* Checklist */
export type ItemAddChecklistEntryPayload = {
  type: "item.addChecklistEntry";
  projectId: ProjectId;
  itemId: ItemId;
  text: string;
};
export type ItemToggleChecklistEntryPayload = {
  type: "item.toggleChecklistEntry";
  projectId: ProjectId;
  itemId: ItemId;
  entryId: string;
};
export type ItemReorderChecklistPayload = {
  type: "item.reorderChecklist";
  projectId: ProjectId;
  itemId: ItemId;
  orderedIds: string[];
};
export type ItemConvertChecklistToSubtaskPayload = {
  type: "item.convertChecklistToSubtask";
  projectId: ProjectId;
  itemId: ItemId;
  entryId: string;
};

/* Relationships */
export type RelationshipCreatePayload = {
  type: "relationship.create";
  projectId: ProjectId;
  relationshipType: "blocks" | "relatesTo";
  sourceItemId: ItemId;
  targetItemId: ItemId;
};
export type RelationshipDeletePayload = {
  type: "relationship.delete";
  projectId: ProjectId;
  relationshipId: string;
};

/* Comments */
export type CommentCreatePayload = {
  type: "comment.create";
  projectId: ProjectId;
  itemId: ItemId;
  body: string;
  parentCommentId?: string | null;
};
export type CommentEditPayload = {
  type: "comment.edit";
  projectId: ProjectId;
  itemId: ItemId;
  commentId: string;
  body: string;
};
export type CommentDeletePayload = {
  type: "comment.delete";
  projectId: ProjectId;
  itemId: ItemId;
  commentId: string;
};

/* Milestone */
export type MilestoneCreatePayload = {
  type: "milestone.create";
  projectId: ProjectId;
  name: string;
  description?: string;
  targetDate?: string | null;
};
export type MilestoneUpdatePayload = {
  type: "milestone.update";
  projectId: ProjectId;
  milestoneId: string;
  patch: Record<string, unknown>;
};

/* Label */
export type LabelCreatePayload = {
  type: "label.create";
  projectId: ProjectId;
  name: string;
  color?: string | null;
  description?: string | null;
};
export type LabelUpdatePayload = {
  type: "label.update";
  projectId: ProjectId;
  labelId: string;
  patch: Record<string, unknown>;
};

/* Member */
export type MemberCreatePayload = {
  type: "member.create";
  projectId: ProjectId;
  displayName: string;
  color?: string | null;
};

/* Status / Priority / Type */
export type StatusCreatePayload = {
  type: "status.create";
  projectId: ProjectId;
  name: string;
  category: "planned" | "active" | "completed" | "canceled";
  color?: string | null;
};
export type StatusUpdatePayload = {
  type: "status.update";
  projectId: ProjectId;
  statusId: string;
  patch: Record<string, unknown>;
  /** Replacement status ID when removing a referenced one. */
  replacementStatusId?: string;
};
export type PriorityCreatePayload = {
  type: "priority.create";
  projectId: ProjectId;
  name: string;
  rank: number;
  color?: string | null;
};
export type PriorityUpdatePayload = {
  type: "priority.update";
  projectId: ProjectId;
  priorityId: string;
  patch: Record<string, unknown>;
  replacementPriorityId?: string | null;
};
export type TypeCreatePayload = {
  type: "type.create";
  projectId: ProjectId;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  defaultStatusId?: string | null;
  defaultPriorityId?: string | null;
};
export type TypeUpdatePayload = {
  type: "type.update";
  projectId: ProjectId;
  typeId: string;
  patch: Record<string, unknown>;
  replacementTypeId?: string;
};

/* Docs */
export type DocCreatePayload = {
  type: "doc.create";
  projectId: ProjectId;
  title: string;
  body?: string;
  folderId?: string | null;
};
export type DocUpdatePayload = {
  type: "doc.update";
  projectId: ProjectId;
  docId: string;
  patch: Record<string, unknown>;
};
export type DocDeletePayload = {
  type: "doc.delete";
  projectId: ProjectId;
  docId: string;
};
export type DocMovePayload = {
  type: "doc.move";
  projectId: ProjectId;
  docId: string;
  toFolderId: string | null;
};

/* Custom fields */
export type CustomFieldDefinePayload = {
  type: "customField.define";
  projectId: ProjectId;
  field: {
    name: string;
    type: "text" | "number" | "select" | "multi-select" | "date" | "checkbox";
    options?: string[];
    applicableTypeIds?: string[] | null;
    required?: boolean;
  };
};

/* Reminders */
export type ReminderCreatePayload = {
  type: "reminder.create";
  projectId: ProjectId;
  targetType: "workItem" | "milestone" | "document";
  targetId: string;
  remindAt: string;
  timeZone: string;
  message?: string | null;
};
export type ReminderUpdatePayload = {
  type: "reminder.update";
  projectId: ProjectId;
  reminderId: string;
  patch: Record<string, unknown>;
};
export type ReminderDeletePayload = {
  type: "reminder.delete";
  projectId: ProjectId;
  reminderId: string;
};

/* Attachments */
export type AttachmentAddPayload = {
  type: "attachment.add";
  projectId: ProjectId;
  filename: string;
  mediaType: string;
  size: number;
  dataUri?: string | null;
  storagePath?: string | null;
  itemId?: string | null;
  docId?: string | null;
};
export type AttachmentDeletePayload = {
  type: "attachment.delete";
  projectId: ProjectId;
  attachmentId: string;
};

/* Views */
export type ViewCreatePayload = {
  type: "view.create";
  projectId: ProjectId;
  viewType: "board" | "backlog" | "table" | "roadmap" | "docs" | "calendar" | "bugs" | "myWork";
  name: string;
  config?: Record<string, unknown>;
};
export type ViewUpdatePayload = {
  type: "view.update";
  projectId: ProjectId;
  viewId: string;
  patch: Record<string, unknown>;
};
export type ViewDeletePayload = {
  type: "view.delete";
  projectId: ProjectId;
  viewId: string;
};

/* Search */
export type SearchPayload = {
  type: "search";
  projectId: ProjectId;
  query: string;
  scope?: Array<"items" | "docs" | "comments" | "labels">;
  filters?: {
    typeIds?: string[];
    statusIds?: string[];
    assigneeIds?: string[];
    milestoneIds?: string[];
    labelIds?: string[];
  };
};
