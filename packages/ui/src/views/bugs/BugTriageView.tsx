import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBugData, type WorkItem } from "@gph/core";
import { openCreateItem } from "../../commands/palette-bus";
import { Button, EmptyState, InlineAlert, MetadataBadge, SelectField, ViewToolbar, WorkItemCard } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { buildBugTriageColumns, declineStatusId } from "./bug-triage-helpers";

type BugFilter = "all" | "intake" | "unassigned" | "needs-repro" | "stale";
type BugContextDraft = { source: string; context: string };

/**
 * Bug triage view. Three columns: Intake, Ready, In Progress.
 * Cards emphasize severity, reproduction-step count, and intake actions.
 */
export function BugTriageView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [filter, setFilter] = useState<BugFilter>("all");
  const [severityFilter, setSeverityFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const [selectedDuplicateTargetId, setSelectedDuplicateTargetId] = useState("");
  const [contextDrafts, setContextDrafts] = useState<Record<string, BugContextDraft>>({});
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

  const duplicateSource = duplicateSourceId ? allBugs.find((item) => item.id === duplicateSourceId) ?? null : null;
  const duplicateCandidates = useMemo(() => {
    const normalizedSearch = duplicateSearch.trim().toLowerCase();
    return allBugs.filter((candidate) => {
      if (candidate.id === duplicateSourceId) return false;
      if (!normalizedSearch) return true;
      const data = getBugData(candidate);
      return [
        candidate.title,
        candidate.description,
        data?.source,
        data?.context
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [allBugs, duplicateSearch, duplicateSourceId]);

  const runAction = (action: () => void): boolean => {
    try {
      action();
      setActionError(null);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Bug triage action failed.");
      return false;
    }
  };

  const updateItem = (item: WorkItem, patch: Record<string, unknown>) => {
    runAction(() => {
      applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch });
    });
  };

  const updateBugData = (item: WorkItem, patch: Record<string, unknown>) => {
    const current = getBugData(item) ?? emptyBugData();
    updateItem(item, {
      moduleData: {
        ...(item.moduleData ?? {}),
        bug: {
          ...current,
          ...patch
        }
      }
    });
  };

  const saveBugContext = (item: WorkItem) => {
    const data = getBugData(item);
    const draft = contextDrafts[item.id] ?? {
      source: data?.source ?? "",
      context: data?.context ?? ""
    };
    updateBugData(item, {
      source: draft.source.trim(),
      context: draft.context.trim()
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

  const openDuplicateDialog = (item: WorkItem) => {
    setActionError(null);
    setDuplicateSourceId(item.id);
    setDuplicateSearch("");
    setSelectedDuplicateTargetId("");
  };

  const closeDuplicateDialog = () => {
    setActionError(null);
    setDuplicateSourceId(null);
    setDuplicateSearch("");
    setSelectedDuplicateTargetId("");
  };

  const linkDuplicate = () => {
    if (!duplicateSource || !selectedDuplicateTargetId || selectedDuplicateTargetId === duplicateSource.id) {
      setActionError("Choose another bug to link.");
      return;
    }
    const linked = runAction(() => {
      applyCommand({
        type: "relationship.create",
        projectId: bundle.project.id,
        relationshipType: "relatesTo",
        sourceItemId: duplicateSource.id,
        targetItemId: selectedDuplicateTargetId
      });
    });
    if (linked) closeDuplicateDialog();
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
        <SelectField
          label="Severity filter"
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
        >
          <option value="">Any severity</option>
          {severities.map((severity) => (
            <option key={severity.id} value={severity.id}>{severity.name}</option>
          ))}
        </SelectField>
        <SelectField
          label="Priority filter"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option value="">Any priority</option>
          {priorities.filter((priority) => !priority.archived).map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.name}</option>
          ))}
        </SelectField>
        {actionError && !duplicateSource ? <InlineAlert tone="danger">{actionError}</InlineAlert> : null}
      </ViewToolbar>
      <div className="bugs">
        {columns.map((col) => {
          const items = allBugs.filter((item) =>
            col.statusIds.includes(item.statusId) && bugMatchesFilter(item, filter, col.id === "intake", severityFilter, priorityFilter)
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
                const contextDraft = contextDrafts[item.id] ?? {
                  source: data?.source ?? "",
                  context: data?.context ?? ""
                };
                const sev = severities.find((s) => s.id === data?.severityId);
                const priority = priorities.find((p) => p.id === item.priorityId);
                const status = statuses.find((s) => s.id === item.statusId);
                const itemLabels = item.labelIds
                  .map((id) => labels.find((label) => label.id === id))
                  .filter((label): label is (typeof labels)[number] => Boolean(label));
                return (
                  <article key={item.id} className="bugs-card" aria-label={item.title}>
                    <Link
                      to={`/item/${item.id}`}
                      aria-label={item.title}
                      className="bugs-card-link"
                    >
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
                      {data?.source ? <MetadataBadge>{data.source}</MetadataBadge> : null}
                      <span className="text-xs text-muted">{data?.reproductionSteps?.length ?? 0} reproduction steps</span>
                    </div>
                    <div className="bugs-card-actions">
                      <select
                        aria-label={`Severity for ${item.title}`}
                        className="select bugs-action-select"
                        value={data?.severityId ?? ""}
                        onChange={(event) => updateBugData(item, { severityId: event.target.value || null })}
                      >
                        <option value="">No severity</option>
                        {severities.map((severity) => (
                          <option key={severity.id} value={severity.id}>{severity.name}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`Priority for ${item.title}`}
                        className="select bugs-action-select"
                        value={item.priorityId ?? ""}
                        onChange={(event) => updateItem(item, { priorityId: event.target.value || null })}
                      >
                        <option value="">No priority</option>
                        {priorities.filter((entry) => !entry.archived || entry.id === item.priorityId).map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bugs-card-actions bugs-context-actions">
                      <input
                        aria-label={`Bug source for ${item.title}`}
                        className="input"
                        placeholder="Source"
                        value={contextDraft.source}
                        onChange={(event) => setContextDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? { source: data?.source ?? "", context: data?.context ?? "" }),
                            source: event.target.value
                          }
                        }))}
                      />
                      <input
                        aria-label={`Bug context for ${item.title}`}
                        className="input"
                        placeholder="Context"
                        value={contextDraft.context}
                        onChange={(event) => setContextDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? { source: data?.source ?? "", context: data?.context ?? "" }),
                            context: event.target.value
                          }
                        }))}
                      />
                      <Button
                        aria-label={`Save bug context for ${item.title}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => saveBugContext(item)}
                      >
                        Save context
                      </Button>
                    </div>
                    <div className="bugs-card-actions">
                      <Button
                        aria-label={`Accept ${item.title}`}
                        size="sm"
                        onClick={() => updateItem(item, { statusId: readyStatusId })}
                      >
                        Accept
                      </Button>
                      <Button
                        aria-label={`Decline ${item.title}`}
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
                        Decline
                      </Button>
                      <Button
                        aria-label={`Snooze ${item.title}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => snooze(item)}
                      >
                        Snooze
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
                      <Button
                        aria-label={`Link duplicate for ${item.title}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => openDuplicateDialog(item)}
                      >
                        Link duplicate
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>
      {duplicateSource ? (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-label="Link duplicate bug" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="col" style={{ gap: 2 }}>
                <strong>Link duplicate bug</strong>
                <span className="text-xs text-muted">{duplicateSource.title}</span>
              </div>
            </div>
            <div className="modal-body">
              <div className="col" style={{ gap: 12 }}>
                <label className="label">
                  Search existing bugs
                  <input
                    className="input"
                    aria-label="Search bugs to link"
                    value={duplicateSearch}
                    onChange={(event) => setDuplicateSearch(event.target.value)}
                    placeholder="Search by title, description, source, or context"
                    autoFocus
                  />
                </label>
                {actionError ? <InlineAlert tone="danger">{actionError}</InlineAlert> : null}
                {duplicateCandidates.length === 0 ? (
                  <EmptyState title="No duplicate candidates" description="No other matching bugs are available to link." />
                ) : (
                  <div className="duplicate-picker-list" role="listbox" aria-label="Duplicate candidates">
                    {duplicateCandidates.map((candidate) => {
                      const data = getBugData(candidate);
                      const severity = severities.find((entry) => entry.id === data?.severityId);
                      const priority = priorities.find((entry) => entry.id === candidate.priorityId);
                      const status = statuses.find((entry) => entry.id === candidate.statusId);
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className="duplicate-picker-option"
                          aria-label={candidate.title}
                          aria-selected={selectedDuplicateTargetId === candidate.id}
                          data-selected={selectedDuplicateTargetId === candidate.id}
                          onClick={() => setSelectedDuplicateTargetId(candidate.id)}
                        >
                          <span className="duplicate-picker-title">{candidate.title}</span>
                          <span className="duplicate-picker-meta">
                            {status?.name ?? "Unknown status"}
                            {priority ? ` - ${priority.name}` : ""}
                            {severity ? ` - ${severity.name}` : ""}
                            {data?.source ? ` - ${data.source}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Button onClick={closeDuplicateDialog}>Cancel</Button>
              <Button
                variant="primary"
                onClick={linkDuplicate}
                disabled={!selectedDuplicateTargetId}
              >
                Link duplicate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function emptyBugData() {
  return {
    severityId: null,
    reproductionSteps: [],
    expectedBehavior: "",
    actualBehavior: "",
    environment: "",
    affectedVersion: null
  };
}

function bugMatchesFilter(item: WorkItem, filter: BugFilter, isIntake: boolean, severityFilter: string, priorityFilter: string) {
  if (severityFilter && getBugData(item)?.severityId !== severityFilter) return false;
  if (priorityFilter && item.priorityId !== priorityFilter) return false;
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
