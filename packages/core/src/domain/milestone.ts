import type { MilestoneId } from "./ids";
import { generateId } from "./ids";
import { isValidDateOnly, type DateOnly } from "./dates";

/**
 * Milestones: lightweight planning containers. Each has stable ID, name, optional description, optional target date.
 */

export type Milestone = {
  id: MilestoneId;
  name: string;
  description?: string | null;
  targetDate: DateOnly | null;
  archived?: boolean;
};

export function createMilestone(input: {
  name: string;
  description?: string | null;
  targetDate?: DateOnly | null;
  id?: string;
}): Milestone {
  if (input.targetDate && !isValidDateOnly(input.targetDate)) {
    throw new Error(`Invalid milestone target date: ${input.targetDate}`);
  }
  return {
    id: input.id ?? generateId("milestone"),
    name: input.name,
    description: input.description ?? null,
    targetDate: input.targetDate ?? null,
    archived: false
  };
}

export function milestoneProgress(
  milestone: Milestone,
  totalItems: number,
  completedItems: number
): { total: number; completed: number; percent: number } {
  const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  return { total: totalItems, completed: completedItems, percent };
}
