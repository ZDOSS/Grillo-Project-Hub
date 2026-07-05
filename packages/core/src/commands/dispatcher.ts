import type { ProjectBundle } from "../domain/project";
import type { CommandEnvelope, CommandPayload, CommandType } from "./envelope";
import {
  createWorkItem,
  validateWorkItem,
  childrenOf,
  wouldCreateCycle,
  createChecklistEntry,
  createComment,
  editComment,
  softDeleteComment,
  createRelationship,
  validateRelationship,
  canonicalizeRelatesTo,
  getBugData,
  type WorkItem,
  type Relationship
} from "../domain/work-item";
import {
  createLabel
} from "../domain/label";
import { createMilestone } from "../domain/milestone";
import { createMember } from "../domain/member";
import {
  createStatus,
  createPriority,
  validateStatusesHaveNoDuplicateRanks,
  findStatus,
  statusCategoryFor
} from "../domain/workflow";
import { createWorkItemType } from "../domain/work-item-type";
import { createDocument, createFolder } from "../domain/document";
import { createCustomField, isFieldApplicableToType, validateCustomFieldValue, type CustomFieldValue } from "../domain/custom-field";
import { createReminder, type Reminder } from "../domain/reminder";
import { createAttachment, type Attachment } from "../domain/attachment";
import { createEvent } from "../domain/event";
import { nowTimestamp } from "../domain/dates";
import { bumpRevision, type TrashRecord } from "../domain/project";
import type { Document } from "../domain/document";
import { createBoardView, createBacklogView, createTableView, createRoadmapView, createDocsView, createCalendarView, createBugsView, createMyWorkView, findColumnForStatus, type View, type ViewSort, type WorkItemFilter } from "../domain/view";
import { createSeverity } from "../domain/bug";
import { generateId } from "../domain/ids";
import { searchProject } from "../search/local-search";
import { createAutomationRule, type AutomationAction, type AutomationCondition, type AutomationRule, type AutomationTrigger } from "../automation/rules";

type DocumentTrashPayload = Document | {
  document: Document;
  reminders?: Reminder[];
};

type AutomationPreviewAction = {
  type: AutomationAction["type"];
  summary: string;
};

type AutomationPreview = {
  matched: boolean;
  ruleName: string;
  actions: AutomationPreviewAction[];
  reason?: string;
};

type AutomationActionFailure = {
  actionType: AutomationAction["type"];
  message: string;
};

/**
 * Result of dispatching a command. Includes the new bundle, generated events, and any
 * auxiliary output (e.g. search results).
 */

export type DispatchResult = {
  bundle: ProjectBundle;
  events: ReturnType<typeof createEvent>[];
  output?: unknown;
};

let _idCounter = 0;
function idempotencyKey(): string {
  _idCounter += 1;
  return `cmd-${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}

export function envelopeFor<T extends CommandPayload>(payload: T, source: CommandEnvelope["source"], actorId: CommandEnvelope["actorId"]): CommandEnvelope<T> {
  return {
    type: payload.type,
    payload,
    source,
    actorId,
    idempotencyKey: idempotencyKey(),
    issuedAt: nowTimestamp()
  };
}

/* ----- dispatchers ----- */

export function dispatchCommand(bundle: ProjectBundle, envelope: CommandEnvelope): DispatchResult {
  const fn = dispatchers[envelope.type as CommandType] as
    | ((b: ProjectBundle, env: CommandEnvelope) => DispatchResult)
    | undefined;
  if (!fn) {
    throw new Error(`Unknown command type: ${envelope.type}`);
  }
  return fn(bundle, envelope);
}

const dispatchers: Record<string, (b: ProjectBundle, env: CommandEnvelope) => DispatchResult> = {
  "project.rename": (b, env) => renameProject(b, env.payload as { name: string }),
  "project.updateSettings": (b, env) => updateProjectSettings(b, env.payload as Parameters<typeof updateProjectSettings>[1]),
  "item.create": (b, env) => applyAutomationRules(createItem(b, env.payload as Parameters<typeof createItem>[1]), env),
  "item.update": (b, env) => applyAutomationRules(updateItem(b, env.payload as Parameters<typeof updateItem>[1]), env),
  "item.moveStatus": (b, env) => applyAutomationRules(moveItemStatus(b, env.payload as Parameters<typeof moveItemStatus>[1]), env),
  "item.moveParent": (b, env) => moveItemParent(b, env.payload as Parameters<typeof moveItemParent>[1]),
  "item.archive": (b, env) => archiveItem(b, env.payload as { projectId: string; itemId: string }),
  "item.trash": (b, env) => trashItem(b, env.payload as { projectId: string; itemId: string }),
  "item.restore": (b, env) => restoreItem(b, env.payload as { projectId: string; itemId: string }),
  "item.duplicate": (b, env) => duplicateItem(b, env.payload as Parameters<typeof duplicateItem>[1]),
  "item.permanentlyDelete": (b, env) => permanentlyDeleteItem(b, env.payload as { projectId: string; itemId: string }),
  "item.addChecklistEntry": (b, env) => addChecklistEntry(b, env.payload as Parameters<typeof addChecklistEntry>[1]),
  "item.toggleChecklistEntry": (b, env) => toggleChecklistEntry(b, env.payload as Parameters<typeof toggleChecklistEntry>[1]),
  "item.reorderChecklist": (b, env) => reorderChecklist(b, env.payload as Parameters<typeof reorderChecklist>[1]),
  "item.convertChecklistToSubtask": (b, env) => convertChecklistToSubtask(b, env.payload as Parameters<typeof convertChecklistToSubtask>[1]),
  "relationship.create": (b, env) => createRelationshipCommand(b, env.payload as Parameters<typeof createRelationshipCommand>[1]),
  "relationship.delete": (b, env) => deleteRelationship(b, env.payload as { projectId: string; relationshipId: string }),
  "comment.create": (b, env) => createCommentCommand(b, env.payload as Parameters<typeof createCommentCommand>[1]),
  "comment.edit": (b, env) => editCommentCommand(b, env.payload as Parameters<typeof editCommentCommand>[1]),
  "comment.delete": (b, env) => deleteCommentCommand(b, env.payload as Parameters<typeof deleteCommentCommand>[1]),
  "milestone.create": (b, env) => createMilestoneCommand(b, env.payload as Parameters<typeof createMilestoneCommand>[1]),
  "milestone.update": (b, env) => updateMilestoneCommand(b, env.payload as Parameters<typeof updateMilestoneCommand>[1]),
  "label.create": (b, env) => createLabelCommand(b, env.payload as Parameters<typeof createLabelCommand>[1]),
  "label.update": (b, env) => updateLabelCommand(b, env.payload as Parameters<typeof updateLabelCommand>[1]),
  "member.create": (b, env) => createMemberCommand(b, env.payload as Parameters<typeof createMemberCommand>[1]),
  "member.update": (b, env) => updateMemberCommand(b, env.payload as Parameters<typeof updateMemberCommand>[1]),
  "member.delete": (b, env) => deleteMemberCommand(b, env.payload as Parameters<typeof deleteMemberCommand>[1]),
  "status.create": (b, env) => createStatusCommand(b, env.payload as Parameters<typeof createStatusCommand>[1]),
  "status.update": (b, env) => updateStatusCommand(b, env.payload as Parameters<typeof updateStatusCommand>[1]),
  "priority.create": (b, env) => createPriorityCommand(b, env.payload as Parameters<typeof createPriorityCommand>[1]),
  "priority.update": (b, env) => updatePriorityCommand(b, env.payload as Parameters<typeof updatePriorityCommand>[1]),
  "type.create": (b, env) => createTypeCommand(b, env.payload as Parameters<typeof createTypeCommand>[1]),
  "type.update": (b, env) => updateTypeCommand(b, env.payload as Parameters<typeof updateTypeCommand>[1]),
  "doc.create": (b, env) => createDocCommand(b, env.payload as Parameters<typeof createDocCommand>[1]),
  "doc.update": (b, env) => updateDocCommand(b, env.payload as Parameters<typeof updateDocCommand>[1]),
  "doc.delete": (b, env) => deleteDocCommand(b, env.payload as Parameters<typeof deleteDocCommand>[1]),
  "doc.restore": (b, env) => restoreDocCommand(b, env.payload as Parameters<typeof restoreDocCommand>[1]),
  "doc.permanentlyDelete": (b, env) => permanentlyDeleteDocCommand(b, env.payload as Parameters<typeof permanentlyDeleteDocCommand>[1]),
  "doc.move": (b, env) => moveDocCommand(b, env.payload as Parameters<typeof moveDocCommand>[1]),
  "customField.define": (b, env) => defineCustomFieldCommand(b, env.payload as Parameters<typeof defineCustomFieldCommand>[1]),
  "reminder.create": (b, env) => createReminderCommand(b, env.payload as Parameters<typeof createReminderCommand>[1]),
  "reminder.update": (b, env) => updateReminderCommand(b, env.payload as Parameters<typeof updateReminderCommand>[1]),
  "reminder.delete": (b, env) => deleteReminderCommand(b, env.payload as Parameters<typeof deleteReminderCommand>[1]),
  "attachment.add": (b, env) => addAttachmentCommand(b, env.payload as Parameters<typeof addAttachmentCommand>[1]),
  "attachment.delete": (b, env) => deleteAttachmentCommand(b, env.payload as Parameters<typeof deleteAttachmentCommand>[1]),
  "attachment.restore": (b, env) => restoreAttachmentCommand(b, env.payload as Parameters<typeof restoreAttachmentCommand>[1]),
  "attachment.permanentlyDelete": (b, env) => permanentlyDeleteAttachmentCommand(b, env.payload as Parameters<typeof permanentlyDeleteAttachmentCommand>[1]),
  "automationRule.create": (b, env) => createAutomationRuleCommand(b, env.payload as Parameters<typeof createAutomationRuleCommand>[1]),
  "automationRule.update": (b, env) => updateAutomationRuleCommand(b, env.payload as Parameters<typeof updateAutomationRuleCommand>[1]),
  "automationRule.delete": (b, env) => deleteAutomationRuleCommand(b, env.payload as Parameters<typeof deleteAutomationRuleCommand>[1]),
  "automationRule.setEnabled": (b, env) => setAutomationRuleEnabledCommand(b, env.payload as Parameters<typeof setAutomationRuleEnabledCommand>[1]),
  "automationRule.dryRun": (b, env) => dryRunAutomationRuleCommand(b, env.payload as Parameters<typeof dryRunAutomationRuleCommand>[1]),
  "bugTriage.updateConfig": (b, env) => updateBugTriageConfigCommand(b, env.payload as Parameters<typeof updateBugTriageConfigCommand>[1]),
  "view.create": (b, env) => createViewCommand(b, env.payload as Parameters<typeof createViewCommand>[1]),
  "view.update": (b, env) => updateViewCommand(b, env.payload as Parameters<typeof updateViewCommand>[1]),
  "view.delete": (b, env) => deleteViewCommand(b, env.payload as Parameters<typeof deleteViewCommand>[1]),
  "search": (b, env) => searchCommand(b, env.payload as Parameters<typeof searchCommand>[1])
};

/* ----- helper: update core and return new bundle ----- */

function withCore(bundle: ProjectBundle, mut: (core: ProjectBundle["core"]) => ProjectBundle["core"]): ProjectBundle {
  return bumpRevision({ ...bundle, core: mut(bundle.core) });
}

function findItemOrThrow(bundle: ProjectBundle, itemId: string): WorkItem {
  const item = bundle.core.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item not found: ${itemId}`);
  return item;
}

function findRecordOrThrow<T extends { id: string }>(records: T[], id: string, label: string): T {
  const record = records.find((entry) => entry.id === id);
  if (!record) throw new Error(`${label} not found: ${id}`);
  return record;
}

function assertProjectId(bundle: ProjectBundle, projectId: string): void {
  if (projectId !== bundle.project.id) {
    throw new Error(`Project mismatch: ${projectId}`);
  }
}

function assertNullableRecordExists<T extends { id: string }>(
  records: T[],
  id: string | null | undefined,
  label: string
): void {
  if (id == null) return;
  findRecordOrThrow(records, id, label);
}

function assertLabelsExist(bundle: ProjectBundle, labelIds: string[] | undefined): void {
  if (!labelIds) return;
  for (const labelId of labelIds) {
    findRecordOrThrow(bundle.core.labels, labelId, "Label");
  }
}

function validateItemReferences(bundle: ProjectBundle, item: WorkItem): void {
  findRecordOrThrow(bundle.core.itemTypes, item.typeId, "Type");
  findRecordOrThrow(bundle.core.statuses, item.statusId, "Status");
  assertNullableRecordExists(bundle.core.priorities, item.priorityId, "Priority");
  assertNullableRecordExists(bundle.core.members, item.assigneeId, "Member");
  assertNullableRecordExists(bundle.core.members, item.reporterId, "Member");
  assertNullableRecordExists(bundle.core.milestones, item.milestoneId, "Milestone");
  assertLabelsExist(bundle, item.labelIds);
  if (item.parentId) {
    const parent = findItemOrThrow(bundle, item.parentId);
    if (parent.projectId !== bundle.project.id) throw new Error("Cross-project parent");
    if (parent.parentId !== null) {
      throw new Error("MVP allows only one level of subtasks; parent is already a subtask");
    }
  }
}

function validateItemCustomFields(bundle: ProjectBundle, item: WorkItem, previousItem?: WorkItem): void {
  const values = item.customFields ?? {};
  for (const [fieldId, value] of Object.entries(values)) {
    const field = findRecordOrThrow(bundle.core.customFields, fieldId, "Custom field");
    if (!isFieldApplicableToType(field, item.typeId)) {
      if (value == null) continue;
      if (previousItem && customFieldValuesEqual(previousItem.customFields?.[fieldId], value as CustomFieldValue)) continue;
      throw new Error(`${field.name} does not apply to item type: ${item.typeId}`);
    }
    validateCustomFieldValue(field, value as CustomFieldValue);
  }
}

function customFieldValuesEqual(a: CustomFieldValue | undefined, b: CustomFieldValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    return a.length === b.length && a.every((entry, index) => entry === b[index]);
  }
  return a === b;
}

function validateBugIntakeExit(bundle: ProjectBundle, previous: WorkItem, next: WorkItem): void {
  if (previous.statusId === next.statusId) return;
  const bugsModule = bundle.modules["builtin.bugs"];
  const applicableTypeIds = (bugsModule?.config?.applicableTypeIds as string[] | undefined) ?? [];
  if (!applicableTypeIds.includes(next.typeId)) return;
  if (bugsModule?.config?.requireSeverityOrPriority !== true) return;

  const intakeStatusIds = bugIntakeStatusIds(bundle);
  if (!intakeStatusIds.includes(previous.statusId) || intakeStatusIds.includes(next.statusId)) return;

  const bugData = getBugData(next);
  if (bugData?.severityId || next.priorityId) return;
  throw new Error("Choose a severity or priority before moving this bug out of intake.");
}

function bugIntakeStatusIds(bundle: ProjectBundle): string[] {
  const statuses = bundle.core.statuses;
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const preferred = ["new", "confirmed", "inbox"].filter((id) => statusById.has(id));
  if (preferred.length > 0) return preferred;
  const planned = statuses.find((status) => status.category === "planned" && !status.archived);
  return planned ? [planned.id] : [bundle.project.defaultInitialStatusId];
}

function assertReminderTargetExists(
  bundle: ProjectBundle,
  targetType: "workItem" | "milestone" | "document",
  targetId: string
): void {
  switch (targetType) {
    case "workItem":
      findRecordOrThrow(bundle.core.items, targetId, "Reminder item");
      break;
    case "milestone":
      findRecordOrThrow(bundle.core.milestones, targetId, "Reminder milestone");
      break;
    case "document":
      findRecordOrThrow(bundle.core.documents, targetId, "Reminder document");
      break;
    default:
      throw new Error(`Unsupported reminder target type: ${String(targetType)}`);
  }
}

function isReminderTargetType(value: unknown): value is "workItem" | "milestone" | "document" {
  return value === "workItem" || value === "milestone" || value === "document";
}

function validateViewReferences(bundle: ProjectBundle, view: View): void {
  validateViewFilterReferences(bundle, view.filter);
  validateViewSort(view.sort);
  if (view.order !== undefined && typeof view.order !== "number") {
    throw new Error("View order must be a number");
  }
  switch (view.type) {
    case "board": {
      for (const column of view.columns) {
        findRecordOrThrow(bundle.core.statuses, column.defaultDropStatusId, "Board default drop status");
        for (const statusId of column.statusIds) {
          findRecordOrThrow(bundle.core.statuses, statusId, "Board column status");
        }
      }
      break;
    }
    case "myWork":
      if (view.filterMemberId) {
        findRecordOrThrow(bundle.core.members, view.filterMemberId, "My Work member");
      }
      break;
  }
}

function validateViewFilterReferences(bundle: ProjectBundle, filter: WorkItemFilter | undefined): void {
  if (!filter) return;
  if (filter.query !== undefined && typeof filter.query !== "string") {
    throw new Error("View filter query must be a string");
  }
  validateFilterIds(bundle.core.itemTypes, filter.typeIds, "View filter type");
  validateFilterIds(bundle.core.statuses, filter.statusIds, "View filter status");
  validateFilterIds(bundle.core.priorities, filter.priorityIds, "View filter priority");
  validateFilterIds(bundle.core.members, filter.assigneeIds, "View filter assignee");
  validateFilterIds(bundle.core.labels, filter.labelIds, "View filter label");
  validateFilterIds(bundle.core.milestones, filter.milestoneIds, "View filter milestone");
}

function validateFilterIds<T extends { id: string }>(records: T[], ids: string[] | undefined, label: string): void {
  if (!ids) return;
  if (!Array.isArray(ids)) throw new Error(`${label} ids must be an array`);
  for (const id of ids) {
    findRecordOrThrow(records, id, label);
  }
}

const VIEW_SORT_FIELDS = new Set(["title", "status", "priority", "type", "dueDate", "updatedAt", "createdAt"]);

function validateViewSort(sort: ViewSort | undefined): void {
  if (!sort) return;
  if (!VIEW_SORT_FIELDS.has(sort.field)) {
    throw new Error(`Invalid view sort field: ${String(sort.field)}`);
  }
  if (sort.direction !== "asc" && sort.direction !== "desc") {
    throw new Error(`Invalid view sort direction: ${String(sort.direction)}`);
  }
}

/* ----- project ----- */

function renameProject(bundle: ProjectBundle, payload: { name: string }): DispatchResult {
  if (!payload.name || payload.name.trim() === "") throw new Error("Project name must not be empty");
  const next: ProjectBundle = bumpRevision({ ...bundle, project: { ...bundle.project, name: payload.name } });
  const event = createEvent({ type: "item.updated", projectId: bundle.project.id, data: { name: payload.name } });
  return { bundle: { ...next, core: { ...next.core, events: [...next.core.events, event] } }, events: [event] };
}

function updateProjectSettings(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    patch: {
      defaultViewId?: string | null;
      enabledModuleIds?: string[];
      hiddenViewIds?: string[];
      pluginTrustMode?: "first-party" | "curated" | "unrestricted";
    };
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  if (payload.patch.pluginTrustMode && !["first-party", "curated", "unrestricted"].includes(payload.patch.pluginTrustMode)) {
    throw new Error(`Invalid plugin trust mode: ${payload.patch.pluginTrustMode}`);
  }
  const next = bumpRevision({
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      ...payload.patch,
      enabledModuleIds: payload.patch.enabledModuleIds ? [...payload.patch.enabledModuleIds] : bundle.projectSettings.enabledModuleIds,
      hiddenViewIds: payload.patch.hiddenViewIds ? [...payload.patch.hiddenViewIds] : (bundle.projectSettings.hiddenViewIds ?? [])
    }
  });
  return { bundle: next, events: [] };
}

/* ----- items ----- */

function createItem(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    typeId: string;
    title: string;
    description?: string;
    statusId?: string;
    priorityId?: string | null;
    assigneeId?: string | null;
    labelIds?: string[];
    milestoneId?: string | null;
    parentId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const typeDef = bundle.core.itemTypes.find((t) => t.id === payload.typeId);
  if (!typeDef) throw new Error(`Unknown type: ${payload.typeId}`);
  if (payload.parentId) {
    const parent = bundle.core.items.find((i) => i.id === payload.parentId);
    if (!parent) throw new Error(`Parent not found: ${payload.parentId}`);
    if (parent.projectId !== bundle.project.id) throw new Error("Cross-project parent");
    // MVP one-level: if parent has a parent, the new child would be a grandchild.
    if (parent.parentId !== null) {
      throw new Error("MVP allows only one level of subtasks; parent is already a subtask");
    }
  }
  const statusId = payload.statusId
    ?? typeDef.defaultStatusId
    ?? bundle.project.defaultInitialStatusId;
  const statusDef = findStatus(bundle.core.statuses, statusId);
  if (!statusDef) throw new Error(`Unknown status: ${statusId}`);
  assertNullableRecordExists(bundle.core.priorities, payload.priorityId ?? typeDef.defaultPriorityId ?? null, "Priority");
  assertNullableRecordExists(bundle.core.members, payload.assigneeId ?? null, "Member");
  assertLabelsExist(bundle, payload.labelIds);
  assertNullableRecordExists(bundle.core.milestones, payload.milestoneId ?? null, "Milestone");

  const item = createWorkItem({
    projectId: bundle.project.id,
    typeId: payload.typeId,
    title: payload.title,
    description: payload.description,
    statusId,
    priorityId: payload.priorityId ?? typeDef.defaultPriorityId ?? null,
    assigneeId: payload.assigneeId ?? null,
    labelIds: payload.labelIds ?? [],
    milestoneId: payload.milestoneId ?? null,
    parentId: payload.parentId ?? null,
    startDate: (payload.startDate as never) ?? null,
    dueDate: (payload.dueDate as never) ?? null
  });
  validateWorkItem(item);
  validateItemReferences(bundle, item);
  const next = withCore(bundle, (c) => ({ ...c, items: [...c.items, item] }));
  const event = createEvent({ type: "item.created", projectId: bundle.project.id, itemId: item.id, data: { title: item.title } });
  return { bundle: appendEvent(next, event), events: [event] };
}

function updateItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const previousStatusId = item.statusId;
  const next: WorkItem = { ...item, ...stripReadOnly(payload.patch), updatedAt: nowTimestamp() };
  validateWorkItem(next);
  validateItemReferences(bundle, next);
  validateBugIntakeExit(bundle, item, next);
  if (Object.prototype.hasOwnProperty.call(payload.patch, "customFields")) {
    validateItemCustomFields(bundle, next, item);
  }
  if (next.parentId !== item.parentId) {
    if (next.parentId === item.id) throw new Error("Item cannot be its own parent");
    if (next.parentId && wouldCreateCycle(bundle.core.items, item.id, next.parentId)) {
      throw new Error("Move would create a cycle");
    }
  }
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const events: ReturnType<typeof createEvent>[] = [];
  events.push(createEvent({ type: "item.updated", projectId: bundle.project.id, itemId: item.id, data: { patch: payload.patch } }));
  if (payload.patch.statusId && payload.patch.statusId !== previousStatusId) {
    events.push(createEvent({
      type: "item.statusChanged",
      projectId: bundle.project.id,
      itemId: item.id,
      data: { from: previousStatusId, to: payload.patch.statusId }
    }));
  }
  return { bundle: appendEvents(nextBundle, events), events };
}

function moveItemStatus(bundle: ProjectBundle, payload: { projectId: string; itemId: string; toStatusId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const statusDef = findStatus(bundle.core.statuses, payload.toStatusId);
  if (!statusDef) throw new Error(`Unknown status: ${payload.toStatusId}`);
  const next = { ...item, statusId: payload.toStatusId, updatedAt: nowTimestamp() };
  validateBugIntakeExit(bundle, item, next);
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({
    type: "item.statusChanged",
    projectId: bundle.project.id,
    itemId: item.id,
    data: { from: item.statusId, to: payload.toStatusId }
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function moveItemParent(bundle: ProjectBundle, payload: { projectId: string; itemId: string; toParentId: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (payload.toParentId === item.id) throw new Error("Item cannot be its own parent");
  if (payload.toParentId && wouldCreateCycle(bundle.core.items, item.id, payload.toParentId)) {
    throw new Error("Move would create a cycle");
  }
  if (payload.toParentId) {
    const parent = bundle.core.items.find((i) => i.id === payload.toParentId);
    if (!parent) throw new Error("Parent not found");
    if (parent.parentId !== null) {
      throw new Error("MVP allows only one level of subtasks; parent is already a subtask");
    }
  }
  const next = { ...item, parentId: payload.toParentId, updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.moved", projectId: bundle.project.id, itemId: item.id, data: { toParentId: payload.toParentId } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function archiveItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const next = { ...item, archived: true, updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.archived", projectId: bundle.project.id, itemId: item.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function trashItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const now = nowTimestamp();
  const trash: TrashRecord = { recordType: "workItem", recordId: item.id, payload: item, trashedAt: now };
  const next = { ...item, trashedAt: now, updatedAt: now };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    items: c.items.map((i) => (i.id === item.id ? next : i)),
    trash: [...c.trash, trash]
  }));
  const event = createEvent({ type: "item.deleted", projectId: bundle.project.id, itemId: item.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function restoreItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (!item.trashedAt) {
    return { bundle, events: [] };
  }
  const next = { ...item, trashedAt: null, updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    items: c.items.map((i) => (i.id === item.id ? next : i)),
    trash: c.trash.filter((t) => !(t.recordType === "workItem" && t.recordId === item.id))
  }));
  const event = createEvent({ type: "item.restored", projectId: bundle.project.id, itemId: item.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

/**
 * Hard delete: remove the item, its trash entry, any relationships where it appears on either
 * side, its reminders, its attachments, and strip any [[item:id]] / ![[item:id]] references
 * from document bodies. Permanent: cannot be restored.
 */
function permanentlyDeleteItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const id = item.id;
  // Drop the item, related relationships, reminders and attachments, plus any trash entry
  // for this item. Update document bodies to remove dangling links/embeds.
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linkOrEmbedRe = new RegExp(
    `!?\\[\\[(?:item|workItem):${escapedId}(?:\\|[^\\]]+)?\\]\\]`,
    "g"
  );
  const nextDocuments = bundle.core.documents.map((d) => {
    if (!linkOrEmbedRe.test(d.body)) return d;
    const cleaned = d.body.replace(linkOrEmbedRe, "(deleted item)");
    return { ...d, body: cleaned, updatedAt: nowTimestamp() };
  });
  const nextItems = bundle.core.items.filter((i) => i.id !== id);
  const nextRelationships = bundle.core.relationships.filter(
    (r) => r.sourceItemId !== id && r.targetItemId !== id
  );
  const nextReminders = bundle.core.reminders.filter(
    (r) => !(r.targetType === "workItem" && r.targetId === id)
  );
  const nextAttachments = bundle.core.attachments.filter((a) => a.itemId !== id);
  const nextTrash = bundle.core.trash.filter(
    (t) => !(t.recordType === "workItem" && t.recordId === id)
  );
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    items: nextItems,
    documents: nextDocuments,
    relationships: nextRelationships,
    reminders: nextReminders,
    attachments: nextAttachments,
    trash: nextTrash
  }));
  const event = createEvent({
    type: "item.permanentlyDeleted",
    projectId: bundle.project.id,
    itemId: id,
    data: { title: item.title }
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function duplicateItem(
  bundle: ProjectBundle,
  payload: { projectId: string; itemId: string; includeRelationships?: boolean; includeAttachments?: boolean }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const source = findItemOrThrow(bundle, payload.itemId);
  const now = nowTimestamp();
  const newItem: WorkItem = {
    ...createWorkItem({
      projectId: bundle.project.id,
      typeId: source.typeId,
      title: source.title,
      description: source.description,
      statusId: source.statusId,
      priorityId: source.priorityId ?? null,
      assigneeId: source.assigneeId,
      labelIds: [...source.labelIds],
      milestoneId: source.milestoneId,
      parentId: source.parentId,
      startDate: source.startDate,
      dueDate: source.dueDate,
      now
    }),
    customFields: source.customFields ? { ...source.customFields } : undefined,
    moduleData: source.moduleData ? structuredClone(source.moduleData) : undefined,
    checklist: source.checklist.map((e) => ({ ...e, id: generateChecklistId() }))
  };
  const newItems = [...bundle.core.items, newItem];
  let newRels = bundle.core.relationships;
  if (payload.includeRelationships) {
    const sources = bundle.core.relationships.filter((r) => r.sourceItemId === source.id || r.targetItemId === source.id);
    newRels = [
      ...newRels,
      ...sources.map((r) => ({
        ...r,
        id: generateId("rel"),
        sourceItemId: r.sourceItemId === source.id ? newItem.id : r.sourceItemId,
        targetItemId: r.targetItemId === source.id ? newItem.id : r.targetItemId
      }))
    ];
  }
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: newItems, relationships: newRels }));
  const event = createEvent({ type: "item.duplicated", projectId: bundle.project.id, itemId: newItem.id, data: { sourceId: source.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

let _checklistCounter = 0;
function generateChecklistId(): string {
  _checklistCounter += 1;
  return `check_${Date.now().toString(36)}_${_checklistCounter.toString(36)}`;
}

/* ----- checklist ----- */

function addChecklistEntry(bundle: ProjectBundle, payload: { projectId: string; itemId: string; text: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  const nextEntry = createChecklistEntry({ text: payload.text, order: (item.checklist[item.checklist.length - 1]?.order ?? 0) + 1024 });
  const next: WorkItem = { ...item, checklist: [...item.checklist, nextEntry], updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.updated", projectId: bundle.project.id, itemId: item.id, data: { addedChecklistEntry: nextEntry.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function toggleChecklistEntry(bundle: ProjectBundle, payload: { projectId: string; itemId: string; entryId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (!item.checklist.some((entry) => entry.id === payload.entryId)) {
    throw new Error(`Checklist entry not found: ${payload.entryId}`);
  }
  const next: WorkItem = {
    ...item,
    checklist: item.checklist.map((e) => (e.id === payload.entryId ? { ...e, completed: !e.completed } : e)),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.updated", projectId: bundle.project.id, itemId: item.id, data: { toggledChecklistEntry: payload.entryId } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function reorderChecklist(bundle: ProjectBundle, payload: { projectId: string; itemId: string; orderedIds: string[] }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (payload.orderedIds.length !== item.checklist.length) {
    throw new Error("Checklist reorder must include every checklist entry exactly once");
  }
  const uniqueIds = new Set(payload.orderedIds);
  if (uniqueIds.size !== payload.orderedIds.length) {
    throw new Error("Checklist reorder must include every checklist entry exactly once");
  }
  for (const entry of item.checklist) {
    if (!uniqueIds.has(entry.id)) {
      throw new Error("Checklist reorder must include every checklist entry exactly once");
    }
  }
  const map = new Map(item.checklist.map((e) => [e.id, e]));
  const next: WorkItem = {
    ...item,
    checklist: payload.orderedIds.map((id, idx) => {
      const e = map.get(id);
      if (!e) throw new Error(`Unknown checklist entry: ${id}`);
      return { ...e, order: (idx + 1) * 1024 };
    }),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  return { bundle: nextBundle, events: [] };
}

function convertChecklistToSubtask(
  bundle: ProjectBundle,
  payload: { projectId: string; itemId: string; entryId: string }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const source = findItemOrThrow(bundle, payload.itemId);
  const entry = source.checklist.find((e) => e.id === payload.entryId);
  if (!entry) throw new Error(`Unknown checklist entry: ${payload.entryId}`);
  if (source.parentId !== null) {
    throw new Error("Cannot convert checklist entry to subtask: source is already a subtask (MVP one-level limit)");
  }
  const initialStatus = source.statusId; // start in same status as parent
  const completedStatus = bundle.project.defaultCompletedStatusId;
  const newSubtask = createWorkItem({
    projectId: bundle.project.id,
    typeId: bundle.project.defaultTypeId,
    title: entry.text,
    statusId: entry.completed ? completedStatus : initialStatus,
    parentId: source.id,
    now: nowTimestamp()
  });
  const next: WorkItem = {
    ...source,
    checklist: source.checklist.filter((e) => e.id !== payload.entryId),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: [...c.items.filter((i) => i.id !== source.id), next, newSubtask] }));
  const event = createEvent({
    type: "checklist.converted",
    projectId: bundle.project.id,
    itemId: source.id,
    data: { entrySnapshot: entry, createdItemId: newSubtask.id }
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

/* ----- relationships ----- */

function createRelationshipCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; relationshipType: "blocks" | "relatesTo"; sourceItemId: string; targetItemId: string }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  if (payload.relationshipType === "relatesTo") {
    const { source, target } = canonicalizeRelatesTo(payload.sourceItemId, payload.targetItemId);
    payload = { ...payload, sourceItemId: source, targetItemId: target };
  }
  // Duplicate detection
  if (payload.relationshipType === "relatesTo") {
    const exists = bundle.core.relationships.some(
      (r) => r.type === "relatesTo" && r.sourceItemId === payload.sourceItemId && r.targetItemId === payload.targetItemId
    );
    if (exists) throw new Error("Duplicate relatesTo relationship");
  } else {
    const exists = bundle.core.relationships.some(
      (r) => r.type === "blocks" && r.sourceItemId === payload.sourceItemId && r.targetItemId === payload.targetItemId
    );
    if (exists) throw new Error("Duplicate blocks relationship");
  }
  const rel = createRelationship({
    type: payload.relationshipType,
    sourceItemId: payload.sourceItemId,
    targetItemId: payload.targetItemId
  });
  validateRelationship(rel, bundle.core.items, bundle.core.relationships);
  const nextBundle = withCore(bundle, (c) => ({ ...c, relationships: [...c.relationships, rel] }));
  return { bundle: nextBundle, events: [] };
}

function deleteRelationship(bundle: ProjectBundle, payload: { projectId: string; relationshipId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.relationships, payload.relationshipId, "Relationship");
  const nextBundle = withCore(bundle, (c) => ({ ...c, relationships: c.relationships.filter((r) => r.id !== payload.relationshipId) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- comments ----- */

function createCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; body: string; parentCommentId?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (payload.parentCommentId && !item.comments.some((comment) => comment.id === payload.parentCommentId)) {
    throw new Error(`Parent comment not found: ${payload.parentCommentId}`);
  }
  const comment = createComment({ authorId: null, body: payload.body, parentCommentId: payload.parentCommentId ?? null });
  const next: WorkItem = { ...item, comments: [...item.comments, comment], updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.commented", projectId: bundle.project.id, itemId: item.id, data: { commentId: comment.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function editCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; commentId: string; body: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (!item.comments.some((comment) => comment.id === payload.commentId)) {
    throw new Error(`Comment not found: ${payload.commentId}`);
  }
  const next: WorkItem = {
    ...item,
    comments: item.comments.map((c) => (c.id === payload.commentId ? editComment(c, payload.body) : c)),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  return { bundle: nextBundle, events: [] };
}

function deleteCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; commentId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const item = findItemOrThrow(bundle, payload.itemId);
  if (!item.comments.some((comment) => comment.id === payload.commentId)) {
    throw new Error(`Comment not found: ${payload.commentId}`);
  }
  const next: WorkItem = {
    ...item,
    comments: item.comments.map((c) => (c.id === payload.commentId ? softDeleteComment(c) : c)),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- milestone ----- */

function createMilestoneCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; description?: string; targetDate?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const milestone = createMilestone({ name: payload.name, description: payload.description ?? null, targetDate: (payload.targetDate as never) ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, milestones: [...c.milestones, milestone] }));
  return { bundle: nextBundle, events: [] };
}

function updateMilestoneCommand(bundle: ProjectBundle, payload: { projectId: string; milestoneId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.milestones, payload.milestoneId, "Milestone");
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    milestones: c.milestones.map((m) => (m.id === payload.milestoneId ? { ...m, ...stripReadOnly(payload.patch) } : m))
  }));
  return { bundle: nextBundle, events: [] };
}

/* ----- labels ----- */

function createLabelCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; color?: string | null; description?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const label = createLabel({ name: payload.name, color: payload.color ?? null, description: payload.description ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, labels: [...c.labels, label] }));
  return { bundle: nextBundle, events: [] };
}

function updateLabelCommand(bundle: ProjectBundle, payload: { projectId: string; labelId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.labels, payload.labelId, "Label");
  const nextBundle = withCore(bundle, (c) => ({ ...c, labels: c.labels.map((l) => (l.id === payload.labelId ? { ...l, ...stripReadOnly(payload.patch) } : l)) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- members ----- */

function createMemberCommand(bundle: ProjectBundle, payload: { projectId: string; displayName: string; color?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const member = createMember({ displayName: payload.displayName, color: payload.color ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, members: [...c.members, member] }));
  return { bundle: nextBundle, events: [] };
}

function updateMemberCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; memberId: string; patch: { displayName?: string; color?: string | null; archived?: boolean } }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const member = bundle.core.members.find((entry) => entry.id === payload.memberId);
  if (!member) throw new Error("Member not found");
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    members: c.members.map((m) => (m.id === payload.memberId ? { ...m, ...stripReadOnly(payload.patch) } : m))
  }));
  return { bundle: nextBundle, events: [] };
}

function deleteMemberCommand(bundle: ProjectBundle, payload: { projectId: string; memberId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const member = bundle.core.members.find((m) => m.id === payload.memberId);
  if (!member) throw new Error("Member not found");
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    members: c.members.map((m) => (m.id === payload.memberId ? { ...m, archived: true } : m)),
    items: c.items.map((item) => (item.assigneeId === payload.memberId ? { ...item, assigneeId: null, updatedAt: nowTimestamp() } : item))
  }));
  return { bundle: nextBundle, events: [] };
}

/* ----- status / priority / type ----- */

function createStatusCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; category: "planned" | "active" | "completed" | "canceled"; color?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const status = createStatus({ name: payload.name, category: payload.category, color: payload.color ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, statuses: [...c.statuses, status] }));
  return { bundle: nextBundle, events: [] };
}

function updateStatusCommand(bundle: ProjectBundle, payload: { projectId: string; statusId: string; patch: Record<string, unknown>; replacementStatusId?: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.statuses, payload.statusId, "Status");
  if (payload.replacementStatusId) {
    findRecordOrThrow(bundle.core.statuses, payload.replacementStatusId, "Replacement status");
  }
  let nextStatuses = bundle.core.statuses.map((s) => (s.id === payload.statusId ? { ...s, ...stripReadOnly(payload.patch) } : s));
  if (payload.patch.archived === true) {
    nextStatuses = nextStatuses.map((s) => (s.id === payload.statusId ? { ...s, archived: true } : s));
  }
  let nextItems = bundle.core.items;
  if (payload.replacementStatusId) {
    nextItems = bundle.core.items.map((i) => (i.statusId === payload.statusId ? { ...i, statusId: payload.replacementStatusId! } : i));
  }
  const nextBundle = withCore(bundle, (c) => ({ ...c, statuses: nextStatuses, items: nextItems }));
  return { bundle: nextBundle, events: [] };
}

function createPriorityCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; rank: number; color?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const priority = createPriority({ name: payload.name, rank: payload.rank, color: payload.color ?? null });
  const allPriorities = [...bundle.core.priorities, priority];
  validateStatusesHaveNoDuplicateRanks(allPriorities);
  const nextBundle = withCore(bundle, (c) => ({ ...c, priorities: allPriorities }));
  return { bundle: nextBundle, events: [] };
}

function updatePriorityCommand(bundle: ProjectBundle, payload: { projectId: string; priorityId: string; patch: Record<string, unknown>; replacementPriorityId?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.priorities, payload.priorityId, "Priority");
  let nextItems = bundle.core.items;
  if (payload.replacementPriorityId !== undefined) {
    const replacement = payload.replacementPriorityId;
    assertNullableRecordExists(bundle.core.priorities, replacement, "Replacement priority");
    nextItems = bundle.core.items.map((i) =>
      i.priorityId === payload.priorityId ? { ...i, priorityId: replacement } : i
    );
  }
  const nextPriorities = bundle.core.priorities.map((p) => (p.id === payload.priorityId ? { ...p, ...stripReadOnly(payload.patch) } : p));
  validateStatusesHaveNoDuplicateRanks(nextPriorities);
  const nextBundle = withCore(bundle, (c) => ({ ...c, priorities: nextPriorities, items: nextItems }));
  return { bundle: nextBundle, events: [] };
}

function createTypeCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; icon?: string | null; color?: string | null; description?: string | null; defaultStatusId?: string | null; defaultPriorityId?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  assertNullableRecordExists(bundle.core.statuses, payload.defaultStatusId ?? null, "Default status");
  assertNullableRecordExists(bundle.core.priorities, payload.defaultPriorityId ?? null, "Default priority");
  const typeDef = createWorkItemType({
    name: payload.name,
    icon: payload.icon ?? null,
    color: payload.color ?? null,
    description: payload.description ?? null,
    defaultStatusId: (payload.defaultStatusId as never) ?? null,
    defaultPriorityId: (payload.defaultPriorityId as never) ?? null
  });
  const nextBundle = withCore(bundle, (c) => ({ ...c, itemTypes: [...c.itemTypes, typeDef] }));
  return { bundle: nextBundle, events: [] };
}

function updateTypeCommand(bundle: ProjectBundle, payload: { projectId: string; typeId: string; patch: Record<string, unknown>; replacementTypeId?: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.itemTypes, payload.typeId, "Type");
  if (payload.replacementTypeId) {
    findRecordOrThrow(bundle.core.itemTypes, payload.replacementTypeId, "Replacement type");
  }
  assertNullableRecordExists(bundle.core.statuses, payload.patch.defaultStatusId as string | null | undefined, "Default status");
  assertNullableRecordExists(bundle.core.priorities, payload.patch.defaultPriorityId as string | null | undefined, "Default priority");
  let nextItems = bundle.core.items;
  if (payload.replacementTypeId) {
    nextItems = bundle.core.items.map((i) => (i.typeId === payload.typeId ? { ...i, typeId: payload.replacementTypeId! } : i));
  }
  const nextTypes = bundle.core.itemTypes.map((t) => (t.id === payload.typeId ? { ...t, ...stripReadOnly(payload.patch) } : t));
  const nextBundle = withCore(bundle, (c) => ({ ...c, itemTypes: nextTypes, items: nextItems }));
  return { bundle: nextBundle, events: [] };
}

/* ----- docs ----- */

function createDocCommand(bundle: ProjectBundle, payload: { projectId: string; title: string; body?: string; folderId?: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  assertNullableRecordExists(bundle.core.folders, payload.folderId ?? null, "Folder");
  const doc = createDocument({ title: payload.title, body: payload.body ?? "", folderId: payload.folderId ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, documents: [...c.documents, doc] }));
  const event = createEvent({ type: "doc.created", projectId: bundle.project.id, docId: doc.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function updateDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.documents, payload.docId, "Document");
  assertNullableRecordExists(bundle.core.folders, payload.patch.folderId as string | null | undefined, "Folder");
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.map((d) => (d.id === payload.docId ? { ...d, ...stripReadOnly(payload.patch), updatedAt: nowTimestamp() } : d))
  }));
  const event = createEvent({ type: "doc.updated", projectId: bundle.project.id, docId: payload.docId });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function deleteDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const doc = bundle.core.documents.find((d) => d.id === payload.docId);
  if (!doc) throw new Error("Document not found");
  const now = nowTimestamp();
  const docReminders = bundle.core.reminders.filter((entry) => entry.targetType === "document" && entry.targetId === doc.id);
  const docAttachments = bundle.core.attachments.filter((entry) => entry.docId === doc.id);
  const trashPayload: DocumentTrashPayload = docReminders.length > 0
    ? { document: doc, reminders: docReminders }
    : doc;
  const trash: TrashRecord = { recordType: "document", recordId: doc.id, payload: trashPayload, trashedAt: now };
  const attachmentTrash = docAttachments.map((attachment): TrashRecord => ({
    recordType: "attachment",
    recordId: attachment.id,
    payload: attachment,
    trashedAt: now,
    notes: `Trashed with document ${doc.title}`
  }));
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.filter((d) => d.id !== payload.docId),
    reminders: c.reminders.filter((entry) => !(entry.targetType === "document" && entry.targetId === payload.docId)),
    attachments: c.attachments.filter((entry) => entry.docId !== payload.docId),
    trash: [...c.trash, trash, ...attachmentTrash]
  }));
  const event = createEvent({ type: "doc.deleted", projectId: bundle.project.id, docId: doc.id, data: { title: doc.title }, at: now });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function restoreDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  if (bundle.core.documents.some((doc) => doc.id === payload.docId)) {
    return { bundle, events: [] };
  }
  const trash = bundle.core.trash.find((entry) => entry.recordType === "document" && entry.recordId === payload.docId);
  if (!trash) throw new Error("Document trash record not found");
  const restored = documentFromTrashPayload(trash.payload);
  const reminders = documentRemindersFromTrashPayload(trash.payload);
  const folderExists = restored.folderId == null || bundle.core.folders.some((folder) => folder.id === restored.folderId);
  const doc: Document = {
    ...restored,
    folderId: folderExists ? restored.folderId : null,
    archived: false,
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: [...c.documents, doc],
    reminders: [
      ...c.reminders,
      ...reminders.filter((reminder) => !c.reminders.some((entry) => entry.id === reminder.id))
    ],
    trash: c.trash.filter((entry) => !(entry.recordType === "document" && entry.recordId === payload.docId))
  }));
  const event = createEvent({ type: "doc.restored", projectId: bundle.project.id, docId: doc.id, data: { title: doc.title } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function permanentlyDeleteDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const trash = bundle.core.trash.find((entry) => entry.recordType === "document" && entry.recordId === payload.docId);
  if (!trash) throw new Error("Document trash record not found");
  const doc = documentFromTrashPayload(trash.payload);
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.filter((entry) => entry.id !== payload.docId),
    reminders: c.reminders.filter((entry) => !(entry.targetType === "document" && entry.targetId === payload.docId)),
    attachments: c.attachments.filter((entry) => entry.docId !== payload.docId),
    trash: c.trash.filter((entry) => !(entry.recordType === "document" && entry.recordId === payload.docId))
      .filter((entry) => entry.recordType !== "attachment" || (entry.payload as Attachment).docId !== payload.docId)
  }));
  const event = createEvent({ type: "doc.permanentlyDeleted", projectId: bundle.project.id, docId: payload.docId, data: { title: doc.title } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function documentFromTrashPayload(payload: unknown): Document {
  if (isDocumentTrashPayloadWithDependents(payload)) return payload.document;
  return payload as Document;
}

function documentRemindersFromTrashPayload(payload: unknown): Reminder[] {
  if (!isDocumentTrashPayloadWithDependents(payload)) return [];
  return payload.reminders ?? [];
}

function isDocumentTrashPayloadWithDependents(payload: unknown): payload is Exclude<DocumentTrashPayload, Document> {
  return typeof payload === "object" && payload !== null && "document" in payload;
}

function moveDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string; toFolderId: string | null }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.documents, payload.docId, "Document");
  assertNullableRecordExists(bundle.core.folders, payload.toFolderId, "Folder");
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.map((d) => (d.id === payload.docId ? { ...d, folderId: payload.toFolderId, updatedAt: nowTimestamp() } : d))
  }));
  return { bundle: nextBundle, events: [] };
}

/* ----- custom fields ----- */

function defineCustomFieldCommand(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    field: {
      name: string;
      type: "text" | "number" | "select" | "multi-select" | "date" | "checkbox";
      options?: string[];
      applicableTypeIds?: string[] | null;
      required?: boolean;
    };
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  if (payload.field.applicableTypeIds) {
    for (const typeId of payload.field.applicableTypeIds) {
      findRecordOrThrow(bundle.core.itemTypes, typeId, "Type");
    }
  }
  const field = createCustomField({
    name: payload.field.name,
    type: payload.field.type,
    options: payload.field.options,
    applicableTypeIds: payload.field.applicableTypeIds ?? null,
    required: payload.field.required ?? false
  });
  const nextBundle = withCore(bundle, (c) => ({ ...c, customFields: [...c.customFields, field] }));
  return { bundle: nextBundle, events: [] };
}

/* ----- reminders ----- */

function createReminderCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; targetType: "workItem" | "milestone" | "document"; targetId: string; remindAt: string; timeZone: string; message?: string | null }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  assertReminderTargetExists(bundle, payload.targetType, payload.targetId);
  const reminder = createReminder({
    targetType: payload.targetType,
    targetId: payload.targetId,
    remindAt: payload.remindAt,
    timeZone: payload.timeZone,
    message: payload.message ?? null
  });
  const nextBundle = withCore(bundle, (c) => ({ ...c, reminders: [...c.reminders, reminder] }));
  return { bundle: nextBundle, events: [] };
}

function updateReminderCommand(bundle: ProjectBundle, payload: { projectId: string; reminderId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const reminder = findRecordOrThrow(bundle.core.reminders, payload.reminderId, "Reminder");
  const nextTargetType = Object.prototype.hasOwnProperty.call(payload.patch, "targetType")
    ? payload.patch.targetType
    : reminder.targetType;
  const nextTargetId = Object.prototype.hasOwnProperty.call(payload.patch, "targetId")
    ? payload.patch.targetId
    : reminder.targetId;
  if (!isReminderTargetType(nextTargetType)) {
    throw new Error(`Unsupported reminder target type: ${String(nextTargetType)}`);
  }
  if (typeof nextTargetId !== "string") {
    throw new Error("Reminder targetId must be a string");
  }
  assertReminderTargetExists(bundle, nextTargetType, nextTargetId);
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    reminders: c.reminders.map((r) => (r.id === payload.reminderId ? { ...r, ...stripReadOnly(payload.patch) } : r))
  }));
  return { bundle: nextBundle, events: [] };
}

function deleteReminderCommand(bundle: ProjectBundle, payload: { projectId: string; reminderId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  findRecordOrThrow(bundle.core.reminders, payload.reminderId, "Reminder");
  const nextBundle = withCore(bundle, (c) => ({ ...c, reminders: c.reminders.filter((r) => r.id !== payload.reminderId) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- attachments ----- */

function addAttachmentCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; filename: string; mediaType: string; size: number; dataUri?: string | null; storagePath?: string | null; itemId?: string | null; docId?: string | null }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  assertNullableRecordExists(bundle.core.items, payload.itemId ?? null, "Item");
  assertNullableRecordExists(bundle.core.documents, payload.docId ?? null, "Document");
  const att = createAttachment({
    projectId: bundle.project.id,
    filename: payload.filename,
    mediaType: payload.mediaType,
    size: payload.size,
    dataUri: payload.dataUri ?? null,
    storagePath: payload.storagePath ?? null,
    itemId: payload.itemId ?? null,
    docId: payload.docId ?? null
  });
  const nextBundle = withCore(bundle, (c) => ({ ...c, attachments: [...c.attachments, att] }));
  const event = createEvent({ type: "item.attachmentAdded", projectId: bundle.project.id, itemId: payload.itemId ?? undefined, data: { attachmentId: att.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function deleteAttachmentCommand(bundle: ProjectBundle, payload: { projectId: string; attachmentId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const att = bundle.core.attachments.find((a) => a.id === payload.attachmentId);
  if (!att) throw new Error("Attachment not found");
  const now = nowTimestamp();
  const trash: TrashRecord = { recordType: "attachment", recordId: att.id, payload: att, trashedAt: now };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    attachments: c.attachments.filter((a) => a.id !== payload.attachmentId),
    trash: [...c.trash, trash]
  }));
  const event = createEvent({
    type: "attachment.deleted",
    projectId: bundle.project.id,
    itemId: att.itemId ?? undefined,
    docId: att.docId ?? undefined,
    data: { attachmentId: att.id, filename: att.filename },
    at: now
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function restoreAttachmentCommand(bundle: ProjectBundle, payload: { projectId: string; attachmentId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  if (bundle.core.attachments.some((attachment) => attachment.id === payload.attachmentId)) {
    return { bundle, events: [] };
  }
  const trash = bundle.core.trash.find((entry) => entry.recordType === "attachment" && entry.recordId === payload.attachmentId);
  if (!trash) throw new Error("Attachment trash record not found");
  const attachment = trash.payload as Attachment;
  assertNullableRecordExists(bundle.core.items, attachment.itemId, "Attachment item");
  assertNullableRecordExists(bundle.core.documents, attachment.docId, "Attachment document");
  const restored: Attachment = { ...attachment, archived: false };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    attachments: [...c.attachments, restored],
    trash: c.trash.filter((entry) => !(entry.recordType === "attachment" && entry.recordId === payload.attachmentId))
  }));
  const event = createEvent({
    type: "attachment.restored",
    projectId: bundle.project.id,
    itemId: restored.itemId ?? undefined,
    docId: restored.docId ?? undefined,
    data: { attachmentId: restored.id, filename: restored.filename }
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function permanentlyDeleteAttachmentCommand(bundle: ProjectBundle, payload: { projectId: string; attachmentId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const trash = bundle.core.trash.find((entry) => entry.recordType === "attachment" && entry.recordId === payload.attachmentId);
  if (!trash) throw new Error("Attachment trash record not found");
  const attachment = trash.payload as Attachment;
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    attachments: c.attachments.filter((entry) => entry.id !== payload.attachmentId),
    trash: c.trash.filter((entry) => !(entry.recordType === "attachment" && entry.recordId === payload.attachmentId))
  }));
  const event = createEvent({
    type: "attachment.permanentlyDeleted",
    projectId: bundle.project.id,
    itemId: attachment.itemId ?? undefined,
    docId: attachment.docId ?? undefined,
    data: { attachmentId: attachment.id, filename: attachment.filename }
  });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

/* ----- automation ----- */

function createAutomationRuleCommand(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    rule: {
      name: string;
      description?: string;
      enabled?: boolean;
      trigger: AutomationTrigger;
      conditions?: AutomationCondition[];
      actions: AutomationAction[];
    };
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const rule = createAutomationRule({
    ...payload.rule,
    name: payload.rule.name.trim(),
    description: payload.rule.description?.trim() ?? "",
    conditions: payload.rule.conditions ?? [],
    actions: payload.rule.actions,
    enabled: payload.rule.enabled ?? true
  });
  validateAutomationRule(bundle, rule);
  return { bundle: withAutomationRules(bundle, [...automationRules(bundle), rule]), events: [] };
}

function updateAutomationRuleCommand(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    ruleId: string;
    patch: Partial<Omit<AutomationRule, "id" | "createdAt" | "updatedAt">>;
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const rules = automationRules(bundle);
  const current = rules.find((rule) => rule.id === payload.ruleId);
  if (!current) throw new Error(`Automation rule not found: ${payload.ruleId}`);
  const nextRule: AutomationRule = {
    ...current,
    ...payload.patch,
    name: typeof payload.patch.name === "string" ? payload.patch.name.trim() : current.name,
    description: typeof payload.patch.description === "string" ? payload.patch.description.trim() : current.description,
    conditions: payload.patch.conditions ?? current.conditions,
    actions: payload.patch.actions ?? current.actions,
    updatedAt: nowTimestamp()
  };
  validateAutomationRule(bundle, nextRule);
  return {
    bundle: withAutomationRules(bundle, rules.map((rule) => (rule.id === payload.ruleId ? nextRule : rule))),
    events: []
  };
}

function deleteAutomationRuleCommand(bundle: ProjectBundle, payload: { projectId: string; ruleId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const rules = automationRules(bundle);
  if (!rules.some((rule) => rule.id === payload.ruleId)) {
    throw new Error(`Automation rule not found: ${payload.ruleId}`);
  }
  return { bundle: withAutomationRules(bundle, rules.filter((rule) => rule.id !== payload.ruleId)), events: [] };
}

function setAutomationRuleEnabledCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; ruleId: string; enabled: boolean }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const rules = automationRules(bundle);
  const current = rules.find((rule) => rule.id === payload.ruleId);
  if (!current) throw new Error(`Automation rule not found: ${payload.ruleId}`);
  const nextRule = { ...current, enabled: payload.enabled, updatedAt: nowTimestamp() };
  return {
    bundle: withAutomationRules(bundle, rules.map((rule) => (rule.id === payload.ruleId ? nextRule : rule))),
    events: []
  };
}

function dryRunAutomationRuleCommand(
  bundle: ProjectBundle,
  payload: {
    projectId: string;
    ruleId?: string;
    rule?: {
      name: string;
      description?: string;
      enabled?: boolean;
      trigger: AutomationTrigger;
      conditions?: AutomationCondition[];
      actions: AutomationAction[];
    };
    itemId?: string;
  }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const rule = payload.ruleId
    ? automationRules(bundle).find((entry) => entry.id === payload.ruleId)
    : payload.rule
    ? createAutomationRule({
        ...payload.rule,
        name: payload.rule.name.trim() || "Unsaved rule",
        conditions: payload.rule.conditions ?? [],
        enabled: payload.rule.enabled ?? true
      })
    : null;
  if (!rule) throw new Error("Automation rule not found");
  validateAutomationRule(bundle, rule);
  const item = payload.itemId
    ? findItemOrThrow(bundle, payload.itemId)
    : bundle.core.items.find((entry) => !entry.trashedAt && !entry.archived) ?? null;
  return { bundle, events: [], output: previewAutomationRule(bundle, rule, item) };
}

function updateBugTriageConfigCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; patch: { requireSeverityOrPriority?: boolean } }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const bugsModule = bundle.modules["builtin.bugs"];
  if (!bugsModule) throw new Error("Bug module is not available");
  const nextConfig = {
    ...bugsModule.config,
    ...(payload.patch.requireSeverityOrPriority === undefined
      ? {}
      : { requireSeverityOrPriority: payload.patch.requireSeverityOrPriority })
  };
  return {
    bundle: bumpRevision({
      ...bundle,
      modules: {
        ...bundle.modules,
        "builtin.bugs": {
          ...bugsModule,
          config: nextConfig
        }
      }
    }),
    events: []
  };
}

/* ----- views ----- */

function createViewCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; viewType: "board" | "backlog" | "table" | "roadmap" | "docs" | "calendar" | "bugs" | "myWork"; name: string; config?: Record<string, unknown> }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const config = payload.config ?? {};
  const common = {
    filter: viewFilterFromConfig(config.filter),
    order: viewOrderFromConfig(config.order),
    sort: viewSortFromConfig(config.sort)
  };
  let view;
  switch (payload.viewType) {
    case "board": {
      const cols = (config.columns as never[]) ?? [
        { name: "To Do", statusIds: [bundle.project.defaultInitialStatusId], defaultDropStatusId: bundle.project.defaultInitialStatusId, order: 1024 },
        { name: "In Progress", statusIds: [bundle.core.statuses.find((s) => s.category === "active")?.id].filter(Boolean) as string[], defaultDropStatusId: bundle.core.statuses.find((s) => s.category === "active")?.id ?? bundle.project.defaultInitialStatusId, order: 2048 },
        { name: "Done", statusIds: [bundle.project.defaultCompletedStatusId], defaultDropStatusId: bundle.project.defaultCompletedStatusId, order: 4096 }
      ];
      view = createBoardView({ name: payload.name, columns: cols as never, ...common });
      break;
    }
    case "backlog":
      view = createBacklogView({
        name: payload.name,
        groupBy: viewGroupByFromConfig(config.groupBy),
        ...common
      });
      break;
    case "table":
      view = createTableView({
        name: payload.name,
        columnOrder: viewStringArrayFromConfig(config.columnOrder, "View column order"),
        visibleColumns: viewStringArrayFromConfig(config.visibleColumns, "View visible columns"),
        ...common
      });
      break;
    case "roadmap":
      view = createRoadmapView({ name: payload.name });
      break;
    case "docs":
      view = createDocsView({ name: payload.name });
      break;
    case "calendar":
      view = createCalendarView({ name: payload.name });
      break;
    case "bugs":
      view = createBugsView({ name: payload.name });
      break;
    case "myWork": {
      const memberId = (config.memberId as string) ?? "";
      view = createMyWorkView({ name: payload.name, memberId });
      break;
    }
  }
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) {
    return { bundle: bumpRevision(bundle), events: [] };
  }
  validateViewReferences(bundle, view);
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: { ...existingViews, [view.id]: view } };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

function updateViewCommand(bundle: ProjectBundle, payload: { projectId: string; viewId: string; patch: Record<string, unknown> }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) throw new Error("Kanban module missing");
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  const current = existingViews[payload.viewId];
  if (!current) throw new Error("View not found");
  const nextView = { ...(current as object), ...normalizeViewPatch(payload.patch) } as View;
  validateViewReferences(bundle, nextView);
  const nextViews = { ...existingViews, [payload.viewId]: nextView };
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: nextViews };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

function normalizeViewPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const next = stripReadOnly(patch);
  if (Object.prototype.hasOwnProperty.call(next, "filter")) {
    next.filter = viewFilterFromConfig(next.filter);
  }
  if (Object.prototype.hasOwnProperty.call(next, "sort")) {
    next.sort = viewSortFromConfig(next.sort);
  }
  if (Object.prototype.hasOwnProperty.call(next, "order")) {
    next.order = viewOrderFromConfig(next.order);
  }
  if (Object.prototype.hasOwnProperty.call(next, "groupBy")) {
    next.groupBy = viewGroupByFromConfig(next.groupBy);
  }
  if (Object.prototype.hasOwnProperty.call(next, "visibleColumns")) {
    next.visibleColumns = viewStringArrayFromConfig(next.visibleColumns, "View visible columns");
  }
  if (Object.prototype.hasOwnProperty.call(next, "columnOrder")) {
    next.columnOrder = viewStringArrayFromConfig(next.columnOrder, "View column order");
  }
  return next;
}

function viewFilterFromConfig(input: unknown): WorkItemFilter | undefined {
  if (input == null) return undefined;
  if (typeof input !== "object") throw new Error("View filter must be an object");
  const raw = input as Record<string, unknown>;
  const filter: WorkItemFilter = {};
  if (raw.query !== undefined) {
    if (typeof raw.query !== "string") throw new Error("View filter query must be a string");
    filter.query = raw.query;
  }
  filter.typeIds = viewStringArrayFromConfig(raw.typeIds, "View filter type");
  filter.statusIds = viewStringArrayFromConfig(raw.statusIds, "View filter status");
  filter.priorityIds = viewStringArrayFromConfig(raw.priorityIds, "View filter priority");
  filter.assigneeIds = viewStringArrayFromConfig(raw.assigneeIds, "View filter assignee");
  filter.labelIds = viewStringArrayFromConfig(raw.labelIds, "View filter label");
  filter.milestoneIds = viewStringArrayFromConfig(raw.milestoneIds, "View filter milestone");
  return Object.values(filter).some((value) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "") ? filter : undefined;
}

function viewSortFromConfig(input: unknown): ViewSort | undefined {
  if (input == null) return undefined;
  if (typeof input !== "object") throw new Error("View sort must be an object");
  const raw = input as Record<string, unknown>;
  if (typeof raw.field !== "string") throw new Error("View sort field must be a string");
  if (raw.direction !== "asc" && raw.direction !== "desc") throw new Error("View sort direction must be asc or desc");
  return { field: raw.field as ViewSort["field"], direction: raw.direction };
}

function viewOrderFromConfig(input: unknown): number | undefined {
  if (input == null) return undefined;
  if (typeof input !== "number" || !Number.isFinite(input)) throw new Error("View order must be a finite number");
  return input;
}

function viewGroupByFromConfig(input: unknown): "priority" | "milestone" | "status" | "type" | "none" | undefined {
  if (input == null) return undefined;
  if (input === "priority" || input === "milestone" || input === "status" || input === "type" || input === "none") return input;
  throw new Error(`Invalid backlog group: ${String(input)}`);
}

function viewStringArrayFromConfig(input: unknown, label: string): string[] | undefined {
  if (input == null) return undefined;
  if (!Array.isArray(input)) throw new Error(`${label} ids must be an array`);
  for (const entry of input) {
    if (typeof entry !== "string") throw new Error(`${label} ids must be strings`);
  }
  return [...input];
}

function deleteViewCommand(bundle: ProjectBundle, payload: { projectId: string; viewId: string }): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) throw new Error("Kanban module missing");
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  if (!(payload.viewId in existingViews)) throw new Error("View not found");
  const { [payload.viewId]: _removed, ...nextViews } = existingViews;
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: nextViews };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

/* ----- search ----- */

function searchCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; query: string; scope?: Array<"items" | "docs" | "comments" | "labels">; filters?: { typeIds?: string[]; statusIds?: string[]; assigneeIds?: string[]; milestoneIds?: string[]; labelIds?: string[] } }
): DispatchResult {
  assertProjectId(bundle, payload.projectId);
  const hits = searchProject(bundle, payload.query, { scope: payload.scope, filters: payload.filters });
  return { bundle, events: [], output: { hits } };
}

function applyAutomationRules(result: DispatchResult, envelope: CommandEnvelope): DispatchResult {
  if (envelope.source === "automation") return result;
  let bundle = result.bundle;
  const automationEvents: ReturnType<typeof createEvent>[] = [];
  const actionEvents: ReturnType<typeof createEvent>[] = [];

  for (const event of result.events) {
    if (!event.itemId) continue;
    for (const rule of automationRules(bundle).filter((entry) => entry.enabled)) {
      const item = bundle.core.items.find((entry) => entry.id === event.itemId);
      if (!item || !automationRuleMatchesEvent(bundle, rule, event, item)) continue;
      let actionCount = 0;
      const failures: AutomationActionFailure[] = [];
      for (const action of rule.actions) {
        const currentItem = bundle.core.items.find((entry) => entry.id === event.itemId);
        if (!currentItem) break;
        try {
          const payload = automationActionPayload(bundle, currentItem, action);
          if (!payload) continue;
          const actionResult = stampResultEvents(
            dispatchCommand(bundle, envelopeFor(payload, "automation", envelope.actorId)),
            "automation",
            envelope.actorId
          );
          bundle = actionResult.bundle;
          actionEvents.push(...actionResult.events);
          actionCount += 1;
        } catch (error) {
          failures.push({ actionType: action.type, message: errorToMessage(error) });
        }
      }
      if (actionCount > 0 || failures.length > 0) {
        const executed = createEvent({
          type: "automation.executed",
          projectId: bundle.project.id,
          itemId: event.itemId,
          source: "automation",
          actorId: envelope.actorId,
          data: {
            ruleId: rule.id,
            ruleName: rule.name,
            actionCount,
            failedActionCount: failures.length,
            ...(failures.length > 0 ? { failures } : {})
          }
        });
        bundle = appendEvent(bundle, executed);
        automationEvents.push(executed);
      }
    }
  }

  return { bundle, events: [...result.events, ...actionEvents, ...automationEvents], output: result.output };
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function stampResultEvents(
  result: DispatchResult,
  source: CommandEnvelope["source"],
  actorId: CommandEnvelope["actorId"]
): DispatchResult {
  if (!result.events.length) return result;
  const stampedEvents = result.events.map((event) => ({ ...event, source, actorId }));
  const stampedById = new Map(stampedEvents.map((event) => [event.id, event]));
  return {
    ...result,
    events: stampedEvents,
    bundle: {
      ...result.bundle,
      core: {
        ...result.bundle.core,
        events: result.bundle.core.events.map((event) => stampedById.get(event.id) ?? event)
      }
    }
  };
}

function automationRules(bundle: ProjectBundle): AutomationRule[] {
  const raw = bundle.modules["builtin.automation"]?.data?.rules;
  return Array.isArray(raw) ? structuredClone(raw as AutomationRule[]) : [];
}

function withAutomationRules(bundle: ProjectBundle, rules: AutomationRule[]): ProjectBundle {
  const current = bundle.modules["builtin.automation"] ?? {
    schemaVersion: 1,
    enabled: true,
    config: {},
    data: {}
  };
  return bumpRevision({
    ...bundle,
    modules: {
      ...bundle.modules,
      "builtin.automation": {
        ...current,
        data: {
          ...current.data,
          rules: structuredClone(rules)
        }
      }
    }
  });
}

function validateAutomationRule(bundle: ProjectBundle, rule: AutomationRule): void {
  if (!rule.name || rule.name.trim() === "") throw new Error("Automation rule name must not be empty");
  validateAutomationTrigger(rule.trigger);
  if (!Array.isArray(rule.conditions)) throw new Error("Automation rule conditions must be an array");
  if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
    throw new Error("Automation rule must have at least one action");
  }
  for (const condition of rule.conditions) validateAutomationCondition(bundle, condition);
  for (const action of rule.actions) validateAutomationAction(bundle, action);
}

function validateAutomationTrigger(trigger: AutomationTrigger): void {
  const valid = new Set([
    "item.created",
    "item.updated",
    "item.statusChanged",
    "item.moved",
    "milestone.assigned",
    "dueDate.changed"
  ]);
  if (!valid.has(trigger.type)) throw new Error(`Unsupported automation trigger: ${String(trigger.type)}`);
}

function validateAutomationCondition(bundle: ProjectBundle, condition: AutomationCondition): void {
  switch (condition.type) {
    case "field.equals":
    case "field.notEquals":
      if (!condition.field) throw new Error("Automation field condition requires a field");
      break;
    case "type.isOneOf":
      if (!condition.typeIds.length) throw new Error("Automation type condition requires at least one type");
      validateFilterIds(bundle.core.itemTypes, condition.typeIds, "Automation condition type");
      break;
    case "has.label":
      findRecordOrThrow(bundle.core.labels, condition.labelId, "Automation condition label");
      break;
    case "milestone.is":
      findRecordOrThrow(bundle.core.milestones, condition.milestoneId, "Automation condition milestone");
      break;
  }
}

function validateAutomationAction(bundle: ProjectBundle, action: AutomationAction): void {
  switch (action.type) {
    case "setField":
      if (!action.field) throw new Error("Automation set field action requires a field");
      validateAutomationSetField(bundle, action.field, action.value);
      break;
    case "addLabel":
    case "removeLabel":
      findRecordOrThrow(bundle.core.labels, action.labelId, "Automation action label");
      break;
    case "moveToStatus":
      findRecordOrThrow(bundle.core.statuses, action.statusId, "Automation action status");
      break;
    case "assignMilestone":
      findRecordOrThrow(bundle.core.milestones, action.milestoneId, "Automation action milestone");
      break;
    case "createSubtask":
      if (!action.title.trim()) throw new Error("Automation subtask title must not be empty");
      break;
    case "generateDoc":
      if (!action.title.trim()) throw new Error("Automation doc title must not be empty");
      break;
  }
}

function validateAutomationSetField(bundle: ProjectBundle, field: string, value: unknown): void {
  if (field === "statusId") findRecordOrThrow(bundle.core.statuses, String(value), "Automation action status");
  if (field === "priorityId" && value) findRecordOrThrow(bundle.core.priorities, String(value), "Automation action priority");
  if (field === "assigneeId" && value) findRecordOrThrow(bundle.core.members, String(value), "Automation action assignee");
  if (field === "milestoneId" && value) findRecordOrThrow(bundle.core.milestones, String(value), "Automation action milestone");
  if (field.startsWith("custom:")) findRecordOrThrow(bundle.core.customFields, field.slice("custom:".length), "Automation action custom field");
}

function automationRuleMatchesEvent(
  bundle: ProjectBundle,
  rule: AutomationRule,
  event: ReturnType<typeof createEvent>,
  item: WorkItem
): boolean {
  if (!automationTriggerMatches(rule.trigger, event)) return false;
  return rule.conditions.every((condition) => automationConditionMatches(item, condition));
}

function automationTriggerMatches(trigger: AutomationTrigger, event: ReturnType<typeof createEvent>): boolean {
  if (trigger.type === "item.created") return event.type === "item.created";
  if (trigger.type === "item.updated") return event.type === "item.updated";
  if (trigger.type === "item.moved") return event.type === "item.moved";
  if (trigger.type === "item.statusChanged") {
    if (event.type !== "item.statusChanged") return false;
    const from = event.data?.from;
    const to = event.data?.to;
    return (!trigger.from || trigger.from === from) && (!trigger.to || trigger.to === to);
  }
  if (trigger.type === "dueDate.changed") {
    return event.type === "item.updated" && patchHasField(event, "dueDate");
  }
  if (trigger.type === "milestone.assigned") {
    return event.type === "item.updated" && patchHasField(event, "milestoneId") && Boolean((event.data?.patch as Record<string, unknown> | undefined)?.milestoneId);
  }
  return false;
}

function patchHasField(event: ReturnType<typeof createEvent>, field: string): boolean {
  const patch = event.data?.patch as Record<string, unknown> | undefined;
  return Boolean(patch && Object.prototype.hasOwnProperty.call(patch, field));
}

function automationConditionMatches(item: WorkItem, condition: AutomationCondition): boolean {
  switch (condition.type) {
    case "field.equals":
      return automationFieldValue(item, condition.field) === condition.value;
    case "field.notEquals":
      return automationFieldValue(item, condition.field) !== condition.value;
    case "type.isOneOf":
      return condition.typeIds.includes(item.typeId);
    case "has.label":
      return item.labelIds.includes(condition.labelId);
    case "milestone.is":
      return item.milestoneId === condition.milestoneId;
  }
}

function automationFieldValue(item: WorkItem, field: string): unknown {
  if (field.startsWith("custom:")) {
    return item.customFields?.[field.slice("custom:".length)];
  }
  if (field.startsWith("bug.")) {
    return (getBugData(item) as Record<string, unknown> | null)?.[field.slice("bug.".length)];
  }
  return (item as unknown as Record<string, unknown>)[field];
}

function automationActionPayload(bundle: ProjectBundle, item: WorkItem, action: AutomationAction): CommandPayload | null {
  switch (action.type) {
    case "setField":
      return {
        type: "item.update",
        projectId: bundle.project.id,
        itemId: item.id,
        patch: automationSetFieldPatch(item, action.field, action.value)
      };
    case "addLabel":
      if (item.labelIds.includes(action.labelId)) return null;
      return {
        type: "item.update",
        projectId: bundle.project.id,
        itemId: item.id,
        patch: { labelIds: [...item.labelIds, action.labelId] }
      };
    case "removeLabel":
      if (!item.labelIds.includes(action.labelId)) return null;
      return {
        type: "item.update",
        projectId: bundle.project.id,
        itemId: item.id,
        patch: { labelIds: item.labelIds.filter((labelId) => labelId !== action.labelId) }
      };
    case "moveToStatus":
      if (item.statusId === action.statusId) return null;
      return {
        type: "item.moveStatus",
        projectId: bundle.project.id,
        itemId: item.id,
        toStatusId: action.statusId
      };
    case "assignMilestone":
      if (item.milestoneId === action.milestoneId) return null;
      return {
        type: "item.update",
        projectId: bundle.project.id,
        itemId: item.id,
        patch: { milestoneId: action.milestoneId }
      };
    case "createSubtask":
      return {
        type: "item.create",
        projectId: bundle.project.id,
        typeId: bundle.project.defaultTypeId,
        title: action.title.trim(),
        parentId: item.id,
        statusId: bundle.project.defaultInitialStatusId
      };
    case "generateDoc":
      return {
        type: "doc.create",
        projectId: bundle.project.id,
        title: action.title.trim(),
        body: `Linked work: [[item:${item.id}]]\n\nGenerated by automation rule.`
      };
  }
}

function automationSetFieldPatch(item: WorkItem, field: string, value: unknown): Record<string, unknown> {
  if (field.startsWith("custom:")) {
    const fieldId = field.slice("custom:".length);
    return { customFields: { ...(item.customFields ?? {}), [fieldId]: value } };
  }
  if (field.startsWith("bug.")) {
    const key = field.slice("bug.".length);
    return {
      moduleData: {
        ...(item.moduleData ?? {}),
        bug: {
          ...(getBugData(item) ?? {
            severityId: null,
            reproductionSteps: [],
            expectedBehavior: "",
            actualBehavior: "",
            environment: "",
            affectedVersion: null
          }),
          [key]: value
        }
      }
    };
  }
  return { [field]: value };
}

function previewAutomationRule(bundle: ProjectBundle, rule: AutomationRule, item: WorkItem | null): AutomationPreview {
  if (!item) {
    return { matched: false, ruleName: rule.name, actions: [], reason: "Choose an item to preview this rule." };
  }
  const matched = rule.conditions.every((condition) => automationConditionMatches(item, condition));
  return {
    matched,
    ruleName: rule.name,
    actions: matched ? rule.actions.map((action) => describeAutomationAction(bundle, action)) : [],
    reason: matched ? undefined : "The selected item does not match this rule's conditions."
  };
}

function describeAutomationAction(bundle: ProjectBundle, action: AutomationAction): AutomationPreviewAction {
  switch (action.type) {
    case "setField":
      return { type: action.type, summary: `Would set ${action.field} to ${String(action.value ?? "empty")}.` };
    case "addLabel":
      return { type: action.type, summary: `Would add label ${findRecordOrThrow(bundle.core.labels, action.labelId, "Label").name}.` };
    case "removeLabel":
      return { type: action.type, summary: `Would remove label ${findRecordOrThrow(bundle.core.labels, action.labelId, "Label").name}.` };
    case "moveToStatus":
      return { type: action.type, summary: `Would move to ${findRecordOrThrow(bundle.core.statuses, action.statusId, "Status").name}.` };
    case "assignMilestone":
      return { type: action.type, summary: `Would assign milestone ${findRecordOrThrow(bundle.core.milestones, action.milestoneId, "Milestone").name}.` };
    case "createSubtask":
      return { type: action.type, summary: `Would create subtask ${action.title}.` };
    case "generateDoc":
      return { type: action.type, summary: `Would generate doc ${action.title}.` };
  }
}

/* ----- helpers ----- */

function appendEvent(bundle: ProjectBundle, event: ReturnType<typeof createEvent>): ProjectBundle {
  return { ...bundle, core: { ...bundle.core, events: [...bundle.core.events, event] } };
}
function appendEvents(bundle: ProjectBundle, events: ReturnType<typeof createEvent>[]): ProjectBundle {
  if (!events.length) return bundle;
  return { ...bundle, core: { ...bundle.core, events: [...bundle.core.events, ...events] } };
}

const READ_ONLY_KEYS = new Set(["id", "createdAt", "projectId"]);
function stripReadOnly<T extends Record<string, unknown>>(patch: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    if (!READ_ONLY_KEYS.has(k)) out[k] = patch[k];
  }
  return out as T;
}
