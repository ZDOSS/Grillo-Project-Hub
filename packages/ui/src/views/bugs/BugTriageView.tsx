import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBugData, type WorkItem } from "@gph/core";
import { openCreateItem } from "../../commands/palette-bus";
import { Button, EmptyState, InlineAlert, MetadataBadge, SelectField, ViewToolbar, WorkItemCard } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { buildBugTriageColumns, declineStatusId } from "./bug-triage-helpers";

type BugFilter = "all" | "intake" | "unassigned" | "needs-repro" | "stale";

/**
 * Bug triage view. Three columns: Intake, Ready, In Progress.
 * Cards emphasize severity, reproduction-step count, and intake actions.
 */
export function BugTriageView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [filter, setFilter] = useState<BugFilter>("all");
  const [duplicateTargets, setDuplicateTargets] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  if (!bundle) return null;

  const bugModule = bundle.modules["builtin.bugs"];
  const applicableTypeIds: string[] = (bugModule?.config?.applicableTypeIds as string[]) ?? [];
  const severities = (bugModule?.config?.severities as Array<{ id: string; name: string; rank: number; color?: string | null }>) ?? [];
  const statuses = bundle.core.statuses;
  const priorities = bundle.core.priorities;
  const labels = bundle.core.labels;
  const activeMembers = bundle.core.members.filter((member) => !member.archived);
  const columns = buildBugTriageColumns(statuses, bundle.project.defaultInitialStatusId);
  const readyStatusId = columns.find((column) => column.id === "ready")?.defaultCreateStatusId ?? bundle.project.defaultInitialStatusId;
  const declinedStatusId = declineStatusId(statuses, bundle.project.defaultCompletedStatusId);

  const allBugs = useMemo(() => bundle.core.items.filter((item) =>
    applicableTypeIds.includes(item.typeId) && !item.trashedAt && !item.archived
  ), [applicableTypeIds, bundle.core.items]);

  const runAction = (action: () => void) => {
    try {
      action();
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Bug triage action failed.");
    }
  };

  const updateItem = (item: WorkItem, patch: Record<string, unknown>) => {
    runAction(() => {
      applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch });
    });
  };

  const snooze = (item: WorkItem) => {
    runAction(() => {
      const remindAt = new Date();
      remindAt.setUTCDate(remindAt.getUTCDate() + 1);
      remindAt.setUTCHours(16, 0, 0, 0);
      applyCommand({
        type: "reminder.create",
        projectId: bundle.project.id,
        targetType: "workItem",
        targetId: item.id,
        remindAt: remindAt.toISOString(),
        timeZone: "UTC",
        message: "Triage follow-up"
      });
    });
  };

  const linkDuplicate = (item: WorkItem) => {
    const targetId = duplicateTargets[item.id];
    if (!targetId || targetId === item.id) {
      setActionError("Choose another bug to link.");
      return;
    }
    runAction(() => {
      applyCommand({
        type: "relationship.create",
        projectId: bundle.project.id,
        relationshipType: "relatesTo",
        sourceItemId: item.id,
        targetItemId: targetId
      });
    });
  };

  return (
    <div className="bugs-view">
      <ViewToolbar>
        <SelectField
          label="Bug filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as BugFilter)}
        >
          <option value="all">All bugs</option>
          <option value="intake">Intake only</option>
          <option value="unassigned">Unassigned</option>
          <option value="needs-repro">Needs repro</option>
          <option value="stale">Stale</option>
        </SelectField>
        {actionError ? <InlineAlert tone="danger">{actionError}</InlineAlert> : null}
      </ViewToolbar>
      <div className="bugs">
        {columns.map((col) => {
          const items = allBugs.filter((item) =>
            col.statusIds.includes(item.statusId) && bugMatchesFilter(item, filter, col.id === "intake")
          );
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
                  <article key={item.id} className="bugs-card" aria-label={item.title}>
                    <Link to={`/item/${item.id}`} className="bugs-card-link">
                      <WorkItemCard
                        item={item}
                        status={status}
                        priority={priority}
                        labels={itemLabels}
                      />
                    </Link>
                    <div className="bugs-card-meta">
                      {sev ? (
                        <MetadataBadge tone={sev.rank >= 300 ? "danger" : "warning"}>
                          {sev.name}
                        </MetadataBadge>
                      ) : null}
                      <span className="text-xs text-muted">{data?.reproductionSteps?.length ?? 0} reproduction steps</span>
                    </div>
                    <div className="bugs-card-actions">
                      <Button size="sm" onClick={() => updateItem(item, { statusId: readyStatusId })}>
                        Accept {item.title}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!declinedStatusId}
                        onClick={() => {
                          if (!declinedStatusId) {
                            setActionError("No canceled or completed status is available for declined bugs.");
                            return;
                          }
                          updateItem(item, { statusId: declinedStatusId });
                        }}
                      >
                        Decline {item.title}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => snooze(item)}>
                        Snooze {item.title}
                      </Button>
                    </div>
                    <div className="bugs-card-actions">
                      <select
                        aria-label={`Assign owner for ${item.title}`}
                        className="select bugs-action-select"
                        value={item.assigneeId ?? ""}
                        onChange={(event) => updateItem(item, { assigneeId: event.target.value || null })}
                      >
                        <option value="">Unassigned</option>
                        {activeMembers.map((member) => (
                          <option key={member.id} value={member.id}>{member.displayName}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`Duplicate target for ${item.title}`}
                        className="select bugs-action-select"
                        value={duplicateTargets[item.id] ?? ""}
                        onChange={(event) => setDuplicateTargets((current) => ({ ...current, [item.id]: event.target.value }))}
                      >
                        <option value="">Relate duplicate</option>
                        {allBugs.filter((candidate) => candidate.id !== item.id).map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => linkDuplicate(item)}>
                        Link duplicate for {item.title}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function bugMatchesFilter(item: WorkItem, filter: BugFilter, isIntake: boolean) {
  if (filter === "all") return true;
  if (filter === "intake") return isIntake;
  if (filter === "unassigned") return !item.assigneeId;
  if (filter === "needs-repro") return (getBugData(item)?.reproductionSteps?.length ?? 0) === 0;
  if (filter === "stale") {
    const staleBefore = new Date();
    staleBefore.setUTCDate(staleBefore.getUTCDate() - 7);
    return Date.parse(item.updatedAt) < staleBefore.getTime();
  }
  return true;
}
