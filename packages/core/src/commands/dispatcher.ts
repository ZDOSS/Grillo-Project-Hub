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
import { createCustomField } from "../domain/custom-field";
import { createReminder } from "../domain/reminder";
import { createAttachment } from "../domain/attachment";
import { createEvent } from "../domain/event";
import { nowTimestamp } from "../domain/dates";
import { bumpRevision, type TrashRecord } from "../domain/project";
import { createBoardView, createBacklogView, createTableView, createRoadmapView, createDocsView, createCalendarView, createBugsView, createMyWorkView, findColumnForStatus } from "../domain/view";
import { createSeverity } from "../domain/bug";

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
  "item.create": (b, env) => createItem(b, env.payload as Parameters<typeof createItem>[1]),
  "item.update": (b, env) => updateItem(b, env.payload as Parameters<typeof updateItem>[1]),
  "item.moveStatus": (b, env) => moveItemStatus(b, env.payload as Parameters<typeof moveItemStatus>[1]),
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
  "status.create": (b, env) => createStatusCommand(b, env.payload as Parameters<typeof createStatusCommand>[1]),
  "status.update": (b, env) => updateStatusCommand(b, env.payload as Parameters<typeof updateStatusCommand>[1]),
  "priority.create": (b, env) => createPriorityCommand(b, env.payload as Parameters<typeof createPriorityCommand>[1]),
  "priority.update": (b, env) => updatePriorityCommand(b, env.payload as Parameters<typeof updatePriorityCommand>[1]),
  "type.create": (b, env) => createTypeCommand(b, env.payload as Parameters<typeof createTypeCommand>[1]),
  "type.update": (b, env) => updateTypeCommand(b, env.payload as Parameters<typeof updateTypeCommand>[1]),
  "doc.create": (b, env) => createDocCommand(b, env.payload as Parameters<typeof createDocCommand>[1]),
  "doc.update": (b, env) => updateDocCommand(b, env.payload as Parameters<typeof updateDocCommand>[1]),
  "doc.delete": (b, env) => deleteDocCommand(b, env.payload as Parameters<typeof deleteDocCommand>[1]),
  "doc.move": (b, env) => moveDocCommand(b, env.payload as Parameters<typeof moveDocCommand>[1]),
  "customField.define": (b, env) => defineCustomFieldCommand(b, env.payload as Parameters<typeof defineCustomFieldCommand>[1]),
  "reminder.create": (b, env) => createReminderCommand(b, env.payload as Parameters<typeof createReminderCommand>[1]),
  "reminder.update": (b, env) => updateReminderCommand(b, env.payload as Parameters<typeof updateReminderCommand>[1]),
  "reminder.delete": (b, env) => deleteReminderCommand(b, env.payload as Parameters<typeof deleteReminderCommand>[1]),
  "attachment.add": (b, env) => addAttachmentCommand(b, env.payload as Parameters<typeof addAttachmentCommand>[1]),
  "attachment.delete": (b, env) => deleteAttachmentCommand(b, env.payload as Parameters<typeof deleteAttachmentCommand>[1]),
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

/* ----- project ----- */

function renameProject(bundle: ProjectBundle, payload: { name: string }): DispatchResult {
  if (!payload.name || payload.name.trim() === "") throw new Error("Project name must not be empty");
  const next: ProjectBundle = bumpRevision({ ...bundle, project: { ...bundle.project, name: payload.name } });
  const event = createEvent({ type: "item.updated", projectId: bundle.project.id, data: { name: payload.name } });
  return { bundle: { ...next, core: { ...next.core, events: [...next.core.events, event] } }, events: [event] };
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
  const next = withCore(bundle, (c) => ({ ...c, items: [...c.items, item] }));
  const event = createEvent({ type: "item.created", projectId: bundle.project.id, itemId: item.id, data: { title: item.title } });
  return { bundle: appendEvent(next, event), events: [event] };
}

function updateItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string; patch: Record<string, unknown> }): DispatchResult {
  const item = findItemOrThrow(bundle, payload.itemId);
  const previousStatusId = item.statusId;
  const next: WorkItem = { ...item, ...stripReadOnly(payload.patch), updatedAt: nowTimestamp() };
  validateWorkItem(next);
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
  const item = findItemOrThrow(bundle, payload.itemId);
  const next = { ...item, statusId: payload.toStatusId, updatedAt: nowTimestamp() };
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
  const item = findItemOrThrow(bundle, payload.itemId);
  const next = { ...item, archived: true, updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.archived", projectId: bundle.project.id, itemId: item.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function trashItem(bundle: ProjectBundle, payload: { projectId: string; itemId: string }): DispatchResult {
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
        id: `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
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
  const item = findItemOrThrow(bundle, payload.itemId);
  const nextEntry = createChecklistEntry({ text: payload.text, order: (item.checklist[item.checklist.length - 1]?.order ?? 0) + 1024 });
  const next: WorkItem = { ...item, checklist: [...item.checklist, nextEntry], updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.updated", projectId: bundle.project.id, itemId: item.id, data: { addedChecklistEntry: nextEntry.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function toggleChecklistEntry(bundle: ProjectBundle, payload: { projectId: string; itemId: string; entryId: string }): DispatchResult {
  const item = findItemOrThrow(bundle, payload.itemId);
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
  const item = findItemOrThrow(bundle, payload.itemId);
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
  const nextBundle = withCore(bundle, (c) => ({ ...c, relationships: c.relationships.filter((r) => r.id !== payload.relationshipId) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- comments ----- */

function createCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; body: string; parentCommentId?: string | null }): DispatchResult {
  const item = findItemOrThrow(bundle, payload.itemId);
  const comment = createComment({ authorId: null, body: payload.body, parentCommentId: payload.parentCommentId ?? null });
  const next: WorkItem = { ...item, comments: [...item.comments, comment], updatedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  const event = createEvent({ type: "item.commented", projectId: bundle.project.id, itemId: item.id, data: { commentId: comment.id } });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function editCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; commentId: string; body: string }): DispatchResult {
  const item = findItemOrThrow(bundle, payload.itemId);
  const next: WorkItem = {
    ...item,
    comments: item.comments.map((c) => (c.id === payload.commentId ? editComment(c, payload.body) : c)),
    updatedAt: nowTimestamp()
  };
  const nextBundle = withCore(bundle, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? next : i)) }));
  return { bundle: nextBundle, events: [] };
}

function deleteCommentCommand(bundle: ProjectBundle, payload: { projectId: string; itemId: string; commentId: string }): DispatchResult {
  const item = findItemOrThrow(bundle, payload.itemId);
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
  const milestone = createMilestone({ name: payload.name, description: payload.description ?? null, targetDate: (payload.targetDate as never) ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, milestones: [...c.milestones, milestone] }));
  return { bundle: nextBundle, events: [] };
}

function updateMilestoneCommand(bundle: ProjectBundle, payload: { projectId: string; milestoneId: string; patch: Record<string, unknown> }): DispatchResult {
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    milestones: c.milestones.map((m) => (m.id === payload.milestoneId ? { ...m, ...stripReadOnly(payload.patch) } : m))
  }));
  return { bundle: nextBundle, events: [] };
}

/* ----- labels ----- */

function createLabelCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; color?: string | null; description?: string | null }): DispatchResult {
  const label = createLabel({ name: payload.name, color: payload.color ?? null, description: payload.description ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, labels: [...c.labels, label] }));
  return { bundle: nextBundle, events: [] };
}

function updateLabelCommand(bundle: ProjectBundle, payload: { projectId: string; labelId: string; patch: Record<string, unknown> }): DispatchResult {
  const nextBundle = withCore(bundle, (c) => ({ ...c, labels: c.labels.map((l) => (l.id === payload.labelId ? { ...l, ...stripReadOnly(payload.patch) } : l)) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- members ----- */

function createMemberCommand(bundle: ProjectBundle, payload: { projectId: string; displayName: string; color?: string | null }): DispatchResult {
  const member = createMember({ displayName: payload.displayName, color: payload.color ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, members: [...c.members, member] }));
  return { bundle: nextBundle, events: [] };
}

/* ----- status / priority / type ----- */

function createStatusCommand(bundle: ProjectBundle, payload: { projectId: string; name: string; category: "planned" | "active" | "completed" | "canceled"; color?: string | null }): DispatchResult {
  const status = createStatus({ name: payload.name, category: payload.category, color: payload.color ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, statuses: [...c.statuses, status] }));
  return { bundle: nextBundle, events: [] };
}

function updateStatusCommand(bundle: ProjectBundle, payload: { projectId: string; statusId: string; patch: Record<string, unknown>; replacementStatusId?: string }): DispatchResult {
  const removed = !bundle.core.statuses.find((s) => s.id === payload.statusId);
  if (removed && !payload.replacementStatusId) {
    throw new Error("Replacement status required when removing a referenced status");
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
  const priority = createPriority({ name: payload.name, rank: payload.rank, color: payload.color ?? null });
  const allPriorities = [...bundle.core.priorities, priority];
  validateStatusesHaveNoDuplicateRanks(allPriorities);
  const nextBundle = withCore(bundle, (c) => ({ ...c, priorities: allPriorities }));
  return { bundle: nextBundle, events: [] };
}

function updatePriorityCommand(bundle: ProjectBundle, payload: { projectId: string; priorityId: string; patch: Record<string, unknown>; replacementPriorityId?: string | null }): DispatchResult {
  let nextItems = bundle.core.items;
  if (payload.replacementPriorityId !== undefined) {
    const replacement = payload.replacementPriorityId;
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
  const doc = createDocument({ title: payload.title, body: payload.body ?? "", folderId: payload.folderId ?? null });
  const nextBundle = withCore(bundle, (c) => ({ ...c, documents: [...c.documents, doc] }));
  const event = createEvent({ type: "doc.created", projectId: bundle.project.id, docId: doc.id });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function updateDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string; patch: Record<string, unknown> }): DispatchResult {
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.map((d) => (d.id === payload.docId ? { ...d, ...stripReadOnly(payload.patch), updatedAt: nowTimestamp() } : d))
  }));
  const event = createEvent({ type: "doc.updated", projectId: bundle.project.id, docId: payload.docId });
  return { bundle: appendEvent(nextBundle, event), events: [event] };
}

function deleteDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string }): DispatchResult {
  const doc = bundle.core.documents.find((d) => d.id === payload.docId);
  if (!doc) throw new Error("Document not found");
  const trash: TrashRecord = { recordType: "document", recordId: doc.id, payload: doc, trashedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    documents: c.documents.filter((d) => d.id !== payload.docId),
    trash: [...c.trash, trash]
  }));
  return { bundle: nextBundle, events: [] };
}

function moveDocCommand(bundle: ProjectBundle, payload: { projectId: string; docId: string; toFolderId: string | null }): DispatchResult {
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
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    reminders: c.reminders.map((r) => (r.id === payload.reminderId ? { ...r, ...stripReadOnly(payload.patch) } : r))
  }));
  return { bundle: nextBundle, events: [] };
}

function deleteReminderCommand(bundle: ProjectBundle, payload: { projectId: string; reminderId: string }): DispatchResult {
  const nextBundle = withCore(bundle, (c) => ({ ...c, reminders: c.reminders.filter((r) => r.id !== payload.reminderId) }));
  return { bundle: nextBundle, events: [] };
}

/* ----- attachments ----- */

function addAttachmentCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; filename: string; mediaType: string; size: number; dataUri?: string | null; storagePath?: string | null; itemId?: string | null; docId?: string | null }
): DispatchResult {
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
  const att = bundle.core.attachments.find((a) => a.id === payload.attachmentId);
  if (!att) throw new Error("Attachment not found");
  const trash: TrashRecord = { recordType: "workItem", recordId: att.id, payload: att, trashedAt: nowTimestamp() };
  const nextBundle = withCore(bundle, (c) => ({
    ...c,
    attachments: c.attachments.filter((a) => a.id !== payload.attachmentId),
    trash: [...c.trash, trash]
  }));
  return { bundle: nextBundle, events: [] };
}

/* ----- views ----- */

function createViewCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; viewType: "board" | "backlog" | "table" | "roadmap" | "docs" | "calendar" | "bugs" | "myWork"; name: string; config?: Record<string, unknown> }
): DispatchResult {
  let view;
  switch (payload.viewType) {
    case "board": {
      const cols = (payload.config?.columns as never[]) ?? [
        { name: "To Do", statusIds: [bundle.project.defaultInitialStatusId], defaultDropStatusId: bundle.project.defaultInitialStatusId, order: 1024 },
        { name: "In Progress", statusIds: [bundle.core.statuses.find((s) => s.category === "active")?.id].filter(Boolean) as string[], defaultDropStatusId: bundle.core.statuses.find((s) => s.category === "active")?.id ?? bundle.project.defaultInitialStatusId, order: 2048 },
        { name: "Done", statusIds: [bundle.project.defaultCompletedStatusId], defaultDropStatusId: bundle.project.defaultCompletedStatusId, order: 4096 }
      ];
      view = createBoardView({ name: payload.name, columns: cols as never });
      break;
    }
    case "backlog":
      view = createBacklogView({ name: payload.name });
      break;
    case "table":
      view = createTableView({ name: payload.name });
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
      const memberId = (payload.config?.memberId as string) ?? "";
      view = createMyWorkView({ name: payload.name, memberId });
      break;
    }
  }
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) {
    return { bundle: bumpRevision(bundle), events: [] };
  }
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: { ...existingViews, [view.id]: view } };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

function updateViewCommand(bundle: ProjectBundle, payload: { projectId: string; viewId: string; patch: Record<string, unknown> }): DispatchResult {
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) throw new Error("Kanban module missing");
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  const current = existingViews[payload.viewId];
  if (!current) throw new Error("View not found");
  const nextViews = { ...existingViews, [payload.viewId]: { ...(current as object), ...stripReadOnly(payload.patch) } };
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: nextViews };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

function deleteViewCommand(bundle: ProjectBundle, payload: { projectId: string; viewId: string }): DispatchResult {
  const kanbanModule = bundle.modules["builtin.kanban"];
  if (!kanbanModule) throw new Error("Kanban module missing");
  const existingViews = ((kanbanModule.data as { views?: Record<string, unknown> })?.views) ?? {};
  if (!(payload.viewId in existingViews)) throw new Error("View not found");
  const nextViews = { ...existingViews };
  delete nextViews[payload.viewId];
  const nextKanbanData = { ...(kanbanModule.data ?? {}), views: nextViews };
  const nextBundle = bumpRevision({
    ...bundle,
    modules: { ...bundle.modules, "builtin.kanban": { ...kanbanModule, data: nextKanbanData } }
  });
  return { bundle: nextBundle, events: [] };
}

/* ----- search ----- */

type SearchHit = { type: "item" | "doc" | "comment" | "label"; id: string; title: string; snippet?: string };

function searchCommand(
  bundle: ProjectBundle,
  payload: { projectId: string; query: string; scope?: Array<"items" | "docs" | "comments" | "labels">; filters?: { typeIds?: string[]; statusIds?: string[]; assigneeIds?: string[]; milestoneIds?: string[]; labelIds?: string[] } }
): DispatchResult {
  const q = payload.query.trim().toLowerCase();
  const scope = payload.scope ?? ["items", "docs", "comments", "labels"];
  const hits: SearchHit[] = [];
  if (!q) {
    return { bundle, events: [], output: { hits: [] } };
  }
  if (scope.includes("items")) {
    for (const item of bundle.core.items) {
      if (item.trashedAt) continue;
      if (payload.filters?.typeIds && !payload.filters.typeIds.includes(item.typeId)) continue;
      if (payload.filters?.statusIds && !payload.filters.statusIds.includes(item.statusId)) continue;
      if (payload.filters?.assigneeIds && !payload.filters.assigneeIds.includes(item.assigneeId ?? "")) continue;
      if (payload.filters?.milestoneIds && !payload.filters.milestoneIds.includes(item.milestoneId ?? "")) continue;
      if (payload.filters?.labelIds && !item.labelIds.some((l) => payload.filters!.labelIds!.includes(l))) continue;
      if (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
        hits.push({ type: "item", id: item.id, title: item.title, snippet: item.description.slice(0, 160) });
      }
    }
  }
  if (scope.includes("docs")) {
    for (const doc of bundle.core.documents) {
      if (doc.title.toLowerCase().includes(q) || doc.body.toLowerCase().includes(q)) {
        hits.push({ type: "doc", id: doc.id, title: doc.title, snippet: doc.body.slice(0, 160) });
      }
    }
  }
  if (scope.includes("comments")) {
    for (const item of bundle.core.items) {
      for (const c of item.comments) {
        if (c.deleted) continue;
        if (c.body.toLowerCase().includes(q)) {
          hits.push({ type: "comment", id: c.id, title: `Comment on ${item.title}`, snippet: c.body.slice(0, 160) });
        }
      }
    }
  }
  if (scope.includes("labels")) {
    for (const l of bundle.core.labels) {
      if (l.name.toLowerCase().includes(q)) {
        hits.push({ type: "label", id: l.id, title: l.name });
      }
    }
  }
  return { bundle, events: [], output: { hits } };
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
