import type { StatusId, PriorityId } from "./ids";
import { generateId } from "./ids";
import { isValidDateOnly, type DateOnly } from "./dates";

/**
 * Workflow statuses: customizable per project, mapped to stable semantic categories.
 *
 * Stable categories:
 *  - planned
 *  - active
 *  - completed
 *  - canceled
 */

export type StatusCategory = "planned" | "active" | "completed" | "canceled";

export type StatusDefinition = {
  id: StatusId;
  name: string;
  category: StatusCategory;
  color?: string | null;
  order: number;
  archived?: boolean;
};

export type PriorityDefinition = {
  id: PriorityId;
  name: string;
  rank: number;
  color?: string | null;
  archived?: boolean;
};

/* Status category rules */
export function isValidStatusCategory(value: unknown): value is StatusCategory {
  return value === "planned" || value === "active" || value === "completed" || value === "canceled";
}

export function createStatus(input: {
  name: string;
  category: StatusCategory;
  color?: string | null;
  order?: number;
  id?: string;
}): StatusDefinition {
  return {
    id: input.id ?? generateId("status"),
    name: input.name,
    category: input.category,
    color: input.color ?? null,
    order: input.order ?? 1024,
    archived: false
  };
}

export function createPriority(input: {
  name: string;
  rank: number;
  color?: string | null;
  id?: string;
}): PriorityDefinition {
  if (!Number.isInteger(input.rank)) {
    throw new Error(`Priority rank must be an integer: ${input.rank}`);
  }
  return {
    id: input.id ?? generateId("priority"),
    name: input.name,
    rank: input.rank,
    color: input.color ?? null,
    archived: false
  };
}

/**
 * Default software workflow (matches FullSpec).
 */
export function defaultStatuses(): StatusDefinition[] {
  return [
    createStatus({ id: "inbox", name: "Inbox", category: "planned", order: 1024 }),
    createStatus({ id: "ready", name: "Ready", category: "planned", order: 2048 }),
    createStatus({ id: "in-progress", name: "In Progress", category: "active", order: 3072 }),
    createStatus({ id: "blocked", name: "Blocked", category: "active", order: 3584 }),
    createStatus({ id: "review", name: "Review", category: "active", order: 3840 }),
    createStatus({ id: "done", name: "Done", category: "completed", order: 4096 }),
    createStatus({ id: "wont-fix", name: "Won't Fix", category: "canceled", order: 5120 })
  ];
}

export function defaultBugStatuses(): StatusDefinition[] {
  return [
    createStatus({ id: "new", name: "New", category: "planned", order: 1024 }),
    createStatus({ id: "confirmed", name: "Confirmed", category: "planned", order: 1536 }),
    createStatus({ id: "ready", name: "Ready", category: "planned", order: 2048 }),
    createStatus({ id: "in-progress", name: "In Progress", category: "active", order: 3072 }),
    createStatus({ id: "fixed", name: "Fixed", category: "active", order: 3584 }),
    createStatus({ id: "verified", name: "Verified", category: "completed", order: 4096 }),
    createStatus({ id: "closed", name: "Closed", category: "completed", order: 4608 }),
    createStatus({ id: "wont-fix", name: "Won't Fix", category: "canceled", order: 5120 })
  ];
}

export function defaultPriorities(): PriorityDefinition[] {
  return [
    createPriority({ id: "low", name: "Low", rank: 100, color: "blue" }),
    createPriority({ id: "medium", name: "Medium", rank: 200, color: "yellow" }),
    createPriority({ id: "high", name: "High", rank: 300, color: "orange" }),
    createPriority({ id: "urgent", name: "Urgent", rank: 400, color: "red" })
  ];
}

export function findStatus(statuses: StatusDefinition[], id: StatusId | null | undefined): StatusDefinition | null {
  if (!id) return null;
  return statuses.find((s) => s.id === id) ?? null;
}

export function statusCategoryFor(
  statuses: StatusDefinition[],
  id: StatusId | null | undefined
): StatusCategory | null {
  return findStatus(statuses, id)?.category ?? null;
}

export function isStatusCompleted(
  statuses: StatusDefinition[],
  id: StatusId | null | undefined
): boolean {
  return statusCategoryFor(statuses, id) === "completed";
}

export function sortPriorities(priorities: PriorityDefinition[]): PriorityDefinition[] {
  return [...priorities].sort((a, b) => b.rank - a.rank);
}

export function comparePriority(
  aPriorityId: PriorityId | null,
  bPriorityId: PriorityId | null,
  priorities: PriorityDefinition[]
): number {
  const rankOf = (id: PriorityId | null) => {
    if (id === null) return Number.NEGATIVE_INFINITY;
    const def = priorities.find((p) => p.id === id);
    return def ? def.rank : Number.NEGATIVE_INFINITY;
  };
  return rankOf(bPriorityId) - rankOf(aPriorityId);
}

export function validateStatusesHaveNoDuplicateRanks(priorities: PriorityDefinition[]): void {
  const seen = new Set<number>();
  for (const p of priorities) {
    if (seen.has(p.rank)) {
      throw new Error(`Duplicate priority rank ${p.rank}`);
    }
    seen.add(p.rank);
  }
}

/** Inclusive date range validation - re-exported here for convenience. */
export function validateDateRange(start: DateOnly | null, due: DateOnly | null): void {
  if (start && !isValidDateOnly(start)) throw new Error(`Invalid start date: ${start}`);
  if (due && !isValidDateOnly(due)) throw new Error(`Invalid due date: ${due}`);
  if (start && due && start > due) throw new Error("startDate must not be later than dueDate");
}
