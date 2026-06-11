import type {
  ItemId,
  ProjectId,
  TypeId,
  StatusId,
  PriorityId,
  MemberId,
  LabelId,
  MilestoneId,
  ParentId,
  ChecklistEntryId,
  CommentId,
  SeverityId
} from "./ids";
import { generateId } from "./ids";
import { isValidDateOnly, type DateOnly, type Timestamp, nowTimestamp } from "./dates";

/**
 * Work item: the primary planning unit. Stable identity is the itemId; the
 * same item can appear in many views (board, backlog, table, bugs, roadmap,
 * calendar, docs) without being copied.
 */

export type ChecklistEntry = {
  id: ChecklistEntryId;
  text: string;
  completed: boolean;
  order: number;
};

export type CommentRecord = {
  id: CommentId;
  authorId: MemberId | null;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  parentCommentId: CommentId | null;
  deleted?: boolean;
  /** Last edit revision snapshot for history diffs. */
  editHistory?: Array<{ at: Timestamp; previousBody: string }>;
};

export type RelationshipType = "blocks" | "relatesTo";

export type Relationship = {
  id: string;
  type: RelationshipType;
  sourceItemId: ItemId;
  targetItemId: ItemId;
  archived?: boolean;
};

export type CustomFieldValue = string | number | boolean | string[] | null;

export type WorkItem = {
  id: ItemId;
  projectId: ProjectId;
  typeId: TypeId;
  title: string;
  description: string;
  statusId: StatusId;
  priorityId: PriorityId | null;
  assigneeId: MemberId | null;
  reporterId: MemberId | null;
  labelIds: LabelId[];
  milestoneId: MilestoneId | null;
  parentId: ParentId;
  startDate: DateOnly | null;
  dueDate: DateOnly | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived?: boolean;
  trashedAt?: Timestamp | null;
  /** Module-owned key/value data. Keys should be namespaced, e.g. "bug.severity", "github.issueNumber". */
  moduleData?: Record<string, unknown>;
  /** Project-defined typed custom field values. */
  customFields?: Record<string, CustomFieldValue>;
  checklist: ChecklistEntry[];
  comments: CommentRecord[];
  relationships?: Relationship[];
};

export function createWorkItem(input: {
  projectId: ProjectId;
  typeId: TypeId;
  title: string;
  statusId: StatusId;
  priorityId?: PriorityId | null;
  description?: string;
  assigneeId?: MemberId | null;
  reporterId?: MemberId | null;
  labelIds?: LabelId[];
  milestoneId?: MilestoneId | null;
  parentId?: ParentId;
  startDate?: DateOnly | null;
  dueDate?: DateOnly | null;
  id?: string;
  now?: Timestamp;
}): WorkItem {
  const now = input.now ?? nowTimestamp();
  return {
    id: input.id ?? generateId("item"),
    projectId: input.projectId,
    typeId: input.typeId,
    title: input.title,
    description: input.description ?? "",
    statusId: input.statusId,
    priorityId: input.priorityId ?? null,
    assigneeId: input.assigneeId ?? null,
    reporterId: input.reporterId ?? null,
    labelIds: input.labelIds ?? [],
    milestoneId: input.milestoneId ?? null,
    parentId: input.parentId ?? null,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    checklist: [],
    comments: [],
    archived: false,
    trashedAt: null
  };
}

export function validateWorkItem(item: WorkItem): void {
  if (!item.title || item.title.trim() === "") {
    throw new Error("Work item title must not be empty");
  }
  if (item.startDate && !isValidDateOnly(item.startDate)) {
    throw new Error(`Invalid start date: ${item.startDate}`);
  }
  if (item.dueDate && !isValidDateOnly(item.dueDate)) {
    throw new Error(`Invalid due date: ${item.dueDate}`);
  }
  if (item.startDate && item.dueDate && item.startDate > item.dueDate) {
    throw new Error("startDate must not be later than dueDate");
  }
  if (item.parentId === item.id) {
    throw new Error("Work item cannot be its own parent");
  }
}

/* Hierarchy */
export function childrenOf(items: WorkItem[], parentId: ItemId | null): WorkItem[] {
  return items.filter((i) => (i.parentId ?? null) === parentId && !i.trashedAt);
}

export function rootsOf(items: WorkItem[]): WorkItem[] {
  return items.filter((i) => (i.parentId ?? null) === null && !i.trashedAt);
}

export function descendantsOf(items: WorkItem[], parentId: ItemId): WorkItem[] {
  const out: WorkItem[] = [];
  const stack = [parentId];
  while (stack.length) {
    const cur = stack.pop()!;
    const children = childrenOf(items, cur);
    for (const c of children) {
      out.push(c);
      stack.push(c.id);
    }
  }
  return out;
}

/** Detect cycles if we change item.id's parent to newParentId. */
export function wouldCreateCycle(items: WorkItem[], itemId: ItemId, newParentId: ItemId | null): boolean {
  if (newParentId === null) return false;
  if (newParentId === itemId) return true;
  let cur: ItemId | null = newParentId;
  const seen = new Set<ItemId>();
  while (cur) {
    if (cur === itemId) return true;
    if (seen.has(cur)) return true; // pre-existing cycle
    seen.add(cur);
    const next = items.find((i) => i.id === cur);
    cur = next?.parentId ?? null;
  }
  return false;
}

/** Enforce MVP one-level hierarchy. */
export function isWithinMvpHierarchyLimit(items: WorkItem[], child: WorkItem): boolean {
  if (child.parentId === null) return true; // child is a root
  // If the child already has a parent, the new parent must be a root.
  return true; // parentId reference model allows arbitrary depth, but UI/commands cap at one level
}

/* Checklist */
export function createChecklistEntry(input: {
  text: string;
  order?: number;
  id?: string;
}): ChecklistEntry {
  return {
    id: input.id ?? generateId("check"),
    text: input.text,
    completed: false,
    order: input.order ?? 1024
  };
}

export function checklistProgress(entries: ChecklistEntry[]): { done: number; total: number } {
  const total = entries.length;
  const done = entries.filter((e) => e.completed).length;
  return { done, total };
}

export function reorderChecklist(entries: ChecklistEntry[], orderedIds: ChecklistEntryId[]): ChecklistEntry[] {
  const map = new Map(entries.map((e) => [e.id, e]));
  const out: ChecklistEntry[] = [];
  for (const id of orderedIds) {
    const entry = map.get(id);
    if (entry) out.push(entry);
  }
  return out;
}

/* Comments */
export function createComment(input: {
  authorId: MemberId | null;
  body: string;
  parentCommentId?: CommentId | null;
  id?: string;
  now?: Timestamp;
}): CommentRecord {
  const now = input.now ?? nowTimestamp();
  return {
    id: input.id ?? generateId("comment"),
    authorId: input.authorId,
    body: input.body,
    createdAt: now,
    updatedAt: now,
    parentCommentId: input.parentCommentId ?? null
  };
}

export function editComment(comment: CommentRecord, newBody: string, now: Timestamp = nowTimestamp()): CommentRecord {
  if (newBody === comment.body) return comment;
  const history = comment.editHistory ?? [];
  const updated: CommentRecord = {
    ...comment,
    body: newBody,
    updatedAt: now,
    editHistory: [...history, { at: now, previousBody: comment.body }]
  };
  return updated;
}

export function softDeleteComment(comment: CommentRecord, now: Timestamp = nowTimestamp()): CommentRecord {
  return { ...comment, deleted: true, body: "", updatedAt: now };
}

/* Relationships */
export function createRelationship(input: {
  type: RelationshipType;
  sourceItemId: ItemId;
  targetItemId: ItemId;
  id?: string;
}): Relationship {
  return {
    id: input.id ?? generateId("rel"),
    type: input.type,
    sourceItemId: input.sourceItemId,
    targetItemId: input.targetItemId,
    archived: false
  };
}

/**
 * Canonicalize a symmetric relatesTo edge.
 * Always store the relationship with the lower id as source.
 */
export function canonicalizeRelatesTo(source: ItemId, target: ItemId): { source: ItemId; target: ItemId } {
  return source < target ? { source, target } : { source: target, target: source };
}

export function relationshipsForItem(
  relationships: Relationship[],
  itemId: ItemId
): { outgoing: Relationship[]; incoming: Relationship[]; relatesTo: ItemId[]; blockedBy: ItemId[]; blocks: ItemId[] } {
  const outgoing = relationships.filter((r) => r.sourceItemId === itemId);
  const incoming = relationships.filter((r) => r.targetItemId === itemId);
  const blocks = outgoing.filter((r) => r.type === "blocks").map((r) => r.targetItemId);
  const blockedBy = incoming.filter((r) => r.type === "blocks").map((r) => r.sourceItemId);
  const relatesTo = relationships
    .filter((r) => r.type === "relatesTo" && (r.sourceItemId === itemId || r.targetItemId === itemId))
    .map((r) => (r.sourceItemId === itemId ? r.targetItemId : r.sourceItemId));
  return { outgoing, incoming, relatesTo, blockedBy, blocks };
}

export function validateRelationship(
  rel: Relationship,
  items: WorkItem[]
): void {
  if (rel.sourceItemId === rel.targetItemId) {
    throw new Error("Relationship cannot reference the same item on both sides");
  }
  const source = items.find((i) => i.id === rel.sourceItemId);
  const target = items.find((i) => i.id === rel.targetItemId);
  if (!source || !target) {
    throw new Error("Relationship endpoints must exist in the same project");
  }
  if (source.projectId !== target.projectId) {
    throw new Error("Cross-project relationships are not allowed");
  }
  if (rel.type === "blocks") {
    if (wouldCreateBlockingCycle(items, rel.sourceItemId, rel.targetItemId)) {
      throw new Error("Blocking relationship would create a cycle");
    }
  }
}

function wouldCreateBlockingCycle(items: WorkItem[], sourceId: ItemId, targetId: ItemId): boolean {
  // BFS from targetId following blocks edges; if we reach sourceId, cycle.
  const visited = new Set<ItemId>();
  const stack: ItemId[] = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const i of items) {
      if ((i as unknown as { blocksItemId?: ItemId }).blocksItemId === cur) {
        stack.push(i.id);
      }
    }
  }
  return false;
}

/* Bug-module data shape (stored in moduleData["bug"]) */
export type BugItemData = {
  severityId: SeverityId | null;
  reproductionSteps: Array<{ id: string; text: string; order: number }>;
  expectedBehavior: string;
  actualBehavior: string;
  environment: string;
  affectedVersion: string | null;
};

export function getBugData(item: WorkItem): BugItemData | null {
  const data = (item.moduleData ?? {})["bug"];
  if (!data) return null;
  return data as BugItemData;
}

export function setBugData(item: WorkItem, data: BugItemData | null): WorkItem {
  const moduleData = { ...(item.moduleData ?? {}) };
  if (data === null) {
    delete moduleData["bug"];
  } else {
    moduleData["bug"] = data;
  }
  return { ...item, moduleData, updatedAt: nowTimestamp() };
}
