import type { SeverityId } from "./ids";
import { generateId } from "./ids";

/**
 * Bug severity: configurable per-project, ranked, distinct from priority.
 *
 *  - The bug module declares applicable work-item type IDs.
 *  - Severity and priority remain independently editable.
 *  - Archived severities remain valid for historical items.
 *  - Referenced severities require replacement or explicit clearing before removal.
 */

export type SeverityDefinition = {
  id: SeverityId;
  name: string;
  rank: number;
  color?: string | null;
  description?: string | null;
  archived?: boolean;
};

export function createSeverity(input: {
  name: string;
  rank: number;
  color?: string | null;
  description?: string | null;
  id?: string;
}): SeverityDefinition {
  if (!Number.isInteger(input.rank)) throw new Error(`Severity rank must be integer: ${input.rank}`);
  return {
    id: input.id ?? generateId("sev"),
    name: input.name,
    rank: input.rank,
    color: input.color ?? null,
    description: input.description ?? null,
    archived: false
  };
}

export function defaultSeverities(): SeverityDefinition[] {
  return [
    createSeverity({ id: "minor", name: "Minor", rank: 100, color: "blue" }),
    createSeverity({ id: "major", name: "Major", rank: 200, color: "orange" }),
    createSeverity({ id: "critical", name: "Critical", rank: 300, color: "red" }),
    createSeverity({ id: "blocker", name: "Blocker", rank: 400, color: "dark-red" })
  ];
}

export function compareSeverity(
  a: SeverityId | null,
  b: SeverityId | null,
  severities: SeverityDefinition[]
): number {
  const rankOf = (id: SeverityId | null) => {
    if (id === null) return Number.NEGATIVE_INFINITY;
    const def = severities.find((s) => s.id === id);
    return def ? def.rank : Number.NEGATIVE_INFINITY;
  };
  return rankOf(b) - rankOf(a);
}
