import type { EventId, MemberId, ItemId, ProjectId, DocumentId } from "./ids";
import { generateId } from "./ids";
import { type Timestamp, nowTimestamp } from "./dates";

/**
 * Event / activity log.
 *
 * The product supports both a simple default activity view and an advanced event/history view over
 * the same underlying event stream. Source context is recorded so UI, import, automation, and MCP
 * bridge mutations are distinguishable.
 */

export type EventSource = "ui" | "import" | "automation" | "mcp" | "system";

export type EventType =
  | "item.created"
  | "item.updated"
  | "item.statusChanged"
  | "item.moved"
  | "item.deleted"
  | "item.restored"
  | "item.archived"
  | "item.commented"
  | "item.attachmentAdded"
  | "item.duplicated"
  | "checklist.converted"
  | "milestone.assigned"
  | "doc.created"
  | "doc.updated"
  | "automation.executed";

export type EventRecord = {
  id: EventId;
  type: EventType;
  projectId: ProjectId;
  at: Timestamp;
  actorId: MemberId | null;
  source: EventSource;
  itemId?: ItemId;
  docId?: DocumentId;
  /** Arbitrary structured payload describing what changed. */
  data?: Record<string, unknown>;
};

export function createEvent(input: {
  type: EventType;
  projectId: ProjectId;
  actorId?: MemberId | null;
  source?: EventSource;
  itemId?: ItemId;
  docId?: DocumentId;
  data?: Record<string, unknown>;
  at?: Timestamp;
  id?: string;
}): EventRecord {
  return {
    id: input.id ?? generateId("evt"),
    type: input.type,
    projectId: input.projectId,
    at: input.at ?? nowTimestamp(),
    actorId: input.actorId ?? null,
    source: input.source ?? "ui",
    itemId: input.itemId,
    docId: input.docId,
    data: input.data
  };
}
