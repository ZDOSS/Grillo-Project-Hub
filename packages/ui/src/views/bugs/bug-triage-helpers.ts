import type { StatusDefinition } from "@gph/core";

export type BugTriageColumn = {
  id: "intake" | "ready" | "in-progress";
  title: string;
  statusIds: string[];
  defaultCreateStatusId: string;
};

export function buildBugTriageColumns(
  statuses: StatusDefinition[],
  projectDefaultStatusId: string
): BugTriageColumn[] {
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const used = new Set<string>();

  const take = (
    preferredIds: string[],
    fallbackCategory?: StatusDefinition["category"],
    fallbackLimit = Number.POSITIVE_INFINITY
  ) => {
    const ids = preferredIds.filter((id) => statusById.has(id) && !used.has(id));
    if (ids.length === 0 && fallbackCategory) {
      ids.push(
        ...statuses
          .filter((status) => status.category === fallbackCategory && !used.has(status.id))
          .slice(0, fallbackLimit)
          .map((status) => status.id)
      );
    }
    ids.forEach((id) => used.add(id));
    return ids;
  };

  const intakeStatusIds = take(["new", "confirmed", "inbox"], "planned", 1);
  const readyStatusIds = take(["ready"], "planned");
  const activeStatusIds = take(["in-progress", "blocked", "review", "fixed"], "active");

  return [
    {
      id: "intake",
      title: "Intake",
      statusIds: intakeStatusIds,
      defaultCreateStatusId: intakeStatusIds[0] ?? projectDefaultStatusId
    },
    {
      id: "ready",
      title: "Ready",
      statusIds: readyStatusIds,
      defaultCreateStatusId: readyStatusIds[0] ?? projectDefaultStatusId
    },
    {
      id: "in-progress",
      title: "In Progress",
      statusIds: activeStatusIds,
      defaultCreateStatusId: activeStatusIds[0] ?? projectDefaultStatusId
    }
  ];
}

export function bugIntakeStatusIds(statuses: StatusDefinition[], projectDefaultStatusId: string): string[] {
  return buildBugTriageColumns(statuses, projectDefaultStatusId)
    .find((column) => column.id === "intake")?.statusIds ?? [];
}

export function declineStatusId(statuses: StatusDefinition[], defaultCompletedStatusId: string): string | null {
  return statuses.find((status) => !status.archived && status.category === "canceled")?.id
    ?? statuses.find((status) =>
      !status.archived && status.id === defaultCompletedStatusId && status.category === "completed"
    )?.id
    ?? statuses.find((status) => !status.archived && status.category === "completed")?.id
    ?? null;
}
