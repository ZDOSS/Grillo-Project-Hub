import type { TypeId, StatusId, PriorityId } from "./ids";
import { generateId } from "./ids";

/**
 * Work-item types: a small customizable registry per project.
 *
 * Each type has stable ID, editable name, optional icon/color/description,
 * deterministic order, archive state, and optional default status/priority.
 */

export type WorkItemTypeDefinition = {
  id: TypeId;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  order: number;
  defaultStatusId?: StatusId | null;
  defaultPriorityId?: PriorityId | null;
  archived?: boolean;
};

export function createWorkItemType(input: {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  order?: number;
  defaultStatusId?: StatusId | null;
  defaultPriorityId?: PriorityId | null;
  id?: string;
}): WorkItemTypeDefinition {
  return {
    id: input.id ?? generateId("type"),
    name: input.name,
    icon: input.icon ?? null,
    color: input.color ?? null,
    description: input.description ?? null,
    order: input.order ?? 1024,
    defaultStatusId: input.defaultStatusId ?? null,
    defaultPriorityId: input.defaultPriorityId ?? null,
    archived: false
  };
}

export function defaultWorkItemTypes(): WorkItemTypeDefinition[] {
  return [
    createWorkItemType({ id: "task", name: "Task", icon: "check-square", order: 1024, defaultStatusId: "inbox" }),
    createWorkItemType({ id: "bug", name: "Bug", icon: "bug", order: 2048, defaultStatusId: "new" }),
    createWorkItemType({ id: "feature", name: "Feature", icon: "sparkles", order: 3072, defaultStatusId: "ready" }),
    createWorkItemType({ id: "idea", name: "Idea", icon: "lightbulb", order: 3584, defaultStatusId: "inbox" }),
    createWorkItemType({ id: "chore", name: "Chore", icon: "wrench", order: 4096, defaultStatusId: "inbox" })
  ];
}

export function findType(
  types: WorkItemTypeDefinition[],
  id: TypeId | null | undefined
): WorkItemTypeDefinition | null {
  if (!id) return null;
  return types.find((t) => t.id === id) ?? null;
}
