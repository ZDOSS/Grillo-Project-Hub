import type { LabelId } from "./ids";
import { generateId } from "./ids";

/**
 * Labels are flat in MVP. They have stable ID, name, optional color, optional short description, archive state.
 */

export type Label = {
  id: LabelId;
  name: string;
  color?: string | null;
  description?: string | null;
  archived?: boolean;
};

export function createLabel(input: {
  name: string;
  color?: string | null;
  description?: string | null;
  id?: string;
}): Label {
  return {
    id: input.id ?? generateId("label"),
    name: input.name,
    color: input.color ?? null,
    description: input.description ?? null,
    archived: false
  };
}
