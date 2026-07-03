import { Link } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { getBugData, type StatusDefinition, type WorkItem } from "@gph/core";
import { openCreateItem } from "../../commands/palette-bus";
import { Button, EmptyState, MetadataBadge, WorkItemCard } from "../../components";

/**
 * Bug triage view. Three columns: Intake, Ready, In Progress.
 * Cards emphasize severity and reproduction-step count.
 */
export function BugTriageView() {
  const bundle = useProjectStore((s) => s.bundle);
  if (!bundle) return null;
  const bugModule = bundle.modules["builtin.bugs"];
  const applicableTypeIds: string[] = (bugModule?.config?.applicableTypeIds as string[]) ?? [];
  const severities = (bugModule?.config?.severities as Array<{ id: string; name: string; rank: number; color?: string | null }>) ?? [];
  const statuses = bundle.core.statuses;
  const priorities = bundle.core.priorities;
  const labels = bundle.core.labels;

  const isBug = (i: WorkItem) => applicableTypeIds.includes(i.typeId) && !i.trashedAt && !i.archived;

  const columns = buildBugTriageColumns(statuses, bundle.project.defaultInitialStatusId);

  return (
    <div className="bugs">
      {columns.map((col) => {
        const items = bundle.core.items.filter((i) => isBug(i) && col.statusIds.includes(i.statusId));
        return (
          <div key={col.id} className="bugs-column">
            <div className="row-between">
              <strong>{col.title}</strong>
              <div className="row">
                {col.id === "intake" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openCreateItem({ typeId: "bug", statusId: col.defaultCreateStatusId })}
                  >
                    New bug
                  </Button>
                ) : null}
                <span className="text-xs text-muted">{items.length}</span>
              </div>
            </div>
            {items.length === 0 ? (
              <EmptyState title="No bugs" description="Nothing in this triage lane." />
            ) : null}
            {items.map((item) => {
              const data = getBugData(item);
              const sev = severities.find((s) => s.id === data?.severityId);
              const priority = priorities.find((p) => p.id === item.priorityId);
              const status = statuses.find((s) => s.id === item.statusId);
              const itemLabels = item.labelIds
                .map((id) => labels.find((label) => label.id === id))
                .filter((label): label is (typeof labels)[number] => Boolean(label));
              return (
                <Link key={item.id} to={`/item/${item.id}`} className="bugs-card" style={{ color: "inherit", textDecoration: "none" }}>
                  <WorkItemCard
                    item={item}
                    status={status}
                    priority={priority}
                    labels={itemLabels}
                  />
                  {sev ? (
                    <MetadataBadge tone={sev.rank >= 3 ? "danger" : "warning"}>
                      {sev.name}
                    </MetadataBadge>
                  ) : null}
                  <div className="text-xs text-muted">{data?.reproductionSteps?.length ?? 0} reproduction steps</div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function buildBugTriageColumns(statuses: StatusDefinition[], projectDefaultStatusId: string) {
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const used = new Set<string>();

  const take = (
    preferredIds: string[],
    fallbackCategory?: StatusDefinition["category"]
  ) => {
    const ids = preferredIds.filter((id) => statusById.has(id) && !used.has(id));
    if (ids.length === 0 && fallbackCategory) {
      ids.push(
        ...statuses
          .filter((status) => status.category === fallbackCategory && !used.has(status.id))
          .map((status) => status.id)
      );
    }
    ids.forEach((id) => used.add(id));
    return ids;
  };

  const intakeStatusIds = take(["new", "confirmed", "inbox"], "planned");
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
