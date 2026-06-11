/**
 * Stable ID utilities.
 * Items, milestones, docs, etc. all use stable string IDs that survive rename, move, and reorder.
 */

export type ItemId = string;
export type ProjectId = string;
export type MilestoneId = string;
export type LabelId = string;
export type MemberId = string;
export type StatusId = string;
export type PriorityId = string;
export type TypeId = string;
export type SeverityId = string;
export type RelationshipId = string;
export type DocumentId = string;
export type FolderId = string;
export type CommentId = string;
export type ChecklistEntryId = string;
export type ReproductionStepId = string;
export type ReminderId = string;
export type AttachmentId = string;
export type AutomationRuleId = string;
export type ViewId = string;
export type ColumnId = string;
export type CustomFieldId = string;
export type ActivityId = string;
export type EventId = string;
export type ParentId = string | null;
export type TriggerId = string;
export type ActionId = string;

let counter = 0;

/** Generate a stable prefixed ID. Uses crypto.randomUUID() when available, otherwise a timestamp+counter fallback. */
export function generateId(prefix: string): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
