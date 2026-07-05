import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BacklogView as BacklogViewDef, ViewSort, WorkItem, WorkItemFilter } from "@gph/core";
import { Button, EmptyState, InlineAlert, MetadataBadge, SelectField, TextField, ViewToolbar } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { useProjectStore } from "../../store/project-store";
import { customFieldSummariesForItem } from "../../work-item/custom-fields";
import {
  cleanWorkItemFilter,
  compareItemsBySort,
  createItemPrefillFromFilter,
  filterIdsFromSelectValue,
  itemMatchesFilter,
  MULTI_FILTER_VALUE,
  nextViewOrder,
  selectValueForFilterIds
} from "../planning/view-helpers";

const DEFAULT_BACKLOG_SORT: ViewSort = { field: "priority", direction: "desc" };

export function BacklogView({ view }: { view?: BacklogViewDef }) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState(view?.filter?.query ?? "");
  const [typeFilterIds, setTypeFilterIds] = useState<string[]>(view?.filter?.typeIds ?? []);
  const [statusFilterIds, setStatusFilterIds] = useState<string[]>(view?.filter?.statusIds ?? []);
  const [priorityFilterIds, setPriorityFilterIds] = useState<string[]>(view?.filter?.priorityIds ?? []);
  const [assigneeFilterIds, setAssigneeFilterIds] = useState<string[]>(view?.filter?.assigneeIds ?? []);
  const [milestoneFilterIds, setMilestoneFilterIds] = useState<string[]>(view?.filter?.milestoneIds ?? []);
  const [viewName, setViewName] = useState(view?.name ?? "");
  const [viewMessage, setViewMessage] = useState<string | null>(null);

  useEffect(() => {
    setQuery(view?.filter?.query ?? "");
    setTypeFilterIds(view?.filter?.typeIds ?? []);
    setStatusFilterIds(view?.filter?.statusIds ?? []);
    setPriorityFilterIds(view?.filter?.priorityIds ?? []);
    setAssigneeFilterIds(view?.filter?.assigneeIds ?? []);
    setMilestoneFilterIds(view?.filter?.milestoneIds ?? []);
    setViewName(view?.name ?? "");
    setViewMessage(null);
  }, [view?.id]);

  const activeFilter = useMemo<WorkItemFilter>(() => ({
    query,
    typeIds: typeFilterIds.length ? typeFilterIds : undefined,
    statusIds: statusFilterIds.length ? statusFilterIds : undefined,
    priorityIds: priorityFilterIds.length ? priorityFilterIds : undefined,
    assigneeIds: assigneeFilterIds.length ? assigneeFilterIds : undefined,
    milestoneIds: milestoneFilterIds.length ? milestoneFilterIds : undefined
  }), [assigneeFilterIds, milestoneFilterIds, priorityFilterIds, query, statusFilterIds, typeFilterIds]);

  if (!bundle) return null;
  const { itemTypes, members, priorities, statuses, milestones } = bundle.core;
  const cleanFilter = cleanWorkItemFilter(activeFilter);
  const createPrefill = createItemPrefillFromFilter(cleanFilter);
  const activeSort = view?.sort ?? DEFAULT_BACKLOG_SORT;
  const items = bundle.core.items.filter(
    (item) => !item.trashedAt && !item.archived && item.parentId == null && itemMatchesFilter(item, cleanFilter)
  );

  const sorted = [...items].sort((a, b) =>
    compareItemsBySort(a, b, bundle, activeSort) || a.title.localeCompare(b.title)
  );

  const setPriority = (item: WorkItem, priorityId: string | null) => {
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { priorityId }
    });
    setEditing(null);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      setViewMessage("Name the view before saving it.");
      return;
    }
    applyCommand({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "backlog",
      name,
      config: {
        filter: cleanFilter,
        groupBy: view?.groupBy ?? "priority",
        order: nextViewOrder(bundle),
        sort: activeSort
      }
    });
    setViewMessage(`${name} saved.`);
  };

  const updateView = () => {
    if (!view) return;
    const name = viewName.trim();
    if (!name) {
      setViewMessage("Name the view before updating it.");
      return;
    }
    applyCommand({
      type: "view.update",
      projectId: bundle.project.id,
      viewId: view.id,
      patch: {
        filter: cleanFilter,
        groupBy: view.groupBy ?? "priority",
        name,
        sort: activeSort
      }
    });
    setViewMessage(`${name} updated.`);
  };

  const deleteView = () => {
    if (!view) return;
    applyCommand({ type: "view.delete", projectId: bundle.project.id, viewId: view.id });
    setViewMessage(`${view.name} deleted.`);
  };

  const moveView = (direction: -1 | 1) => {
    if (!view) return;
    const currentOrder = view.order ?? nextViewOrder(bundle);
    applyCommand({
      type: "view.update",
      projectId: bundle.project.id,
      viewId: view.id,
      patch: { order: currentOrder + direction * 1536 }
    });
  };

  return (
    <div className="backlog-view">
      <ViewToolbar>
        <Button variant="primary" size="sm" onClick={() => openCreateItem(createPrefill)}>
          New item
        </Button>
        <TextField
          label="Filter"
          placeholder="Search backlog"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SelectField
          label="Type"
          value={selectValueForFilterIds(typeFilterIds)}
          onChange={(event) => setTypeFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All types</option>
          {typeFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple types</option> : null}
          {itemTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </SelectField>
        <SelectField
          label="Status"
          value={selectValueForFilterIds(statusFilterIds)}
          onChange={(event) => setStatusFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All statuses</option>
          {statusFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple statuses</option> : null}
          {statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
        </SelectField>
        <SelectField
          label="Priority"
          value={selectValueForFilterIds(priorityFilterIds)}
          onChange={(event) => setPriorityFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All priorities</option>
          {priorityFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple priorities</option> : null}
          {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
        </SelectField>
        <SelectField
          label="Assignee"
          value={selectValueForFilterIds(assigneeFilterIds)}
          onChange={(event) => setAssigneeFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All assignees</option>
          {assigneeFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple assignees</option> : null}
          {members.filter((member) => !member.archived).map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
        </SelectField>
        <SelectField
          label="Milestone"
          value={selectValueForFilterIds(milestoneFilterIds)}
          onChange={(event) => setMilestoneFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All milestones</option>
          {milestoneFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple milestones</option> : null}
          {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
        </SelectField>
        <TextField
          label="View name"
          placeholder="Save as..."
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
        />
        <Button size="sm" onClick={saveView}>Save view</Button>
        {view ? (
          <>
            <Button size="sm" onClick={updateView}>Update view</Button>
            <Button size="sm" variant="ghost" onClick={() => moveView(-1)}>Move view left</Button>
            <Button size="sm" variant="ghost" onClick={() => moveView(1)}>Move view right</Button>
            <Button size="sm" variant="danger" onClick={deleteView}>Delete view</Button>
          </>
        ) : null}
        <span className="text-xs text-muted">{sorted.length} active items</span>
        {viewMessage ? <InlineAlert tone="info">{viewMessage}</InlineAlert> : null}
      </ViewToolbar>
      <div className="backlog" role="region" aria-label="Backlog view">
        {sorted.length === 0 ? (
          <EmptyState
            title="Backlog is empty"
            description="Add new items with the C shortcut or the New item button."
            actions={
              <Button variant="primary" onClick={() => openCreateItem(createPrefill)}>
                New item
              </Button>
            }
          />
        ) : null}
        {sorted.map((item) => {
          const status = statuses.find((s) => s.id === item.statusId);
          const priority = priorities.find((p) => p.id === item.priorityId);
          const milestone = milestones.find((m) => m.id === item.milestoneId);
          const customFieldSummaries = customFieldSummariesForItem(bundle.core.customFields, item);
          return (
            <div key={item.id} className="backlog-row gph-work-row">
              <span className="text-muted text-xs">#{item.id.slice(-4)}</span>
              <Link
                to={`/item/${item.id}`}
                className="backlog-row-title gph-work-row-title"
              >
                {item.title}
              </Link>
              <span className="text-xs text-secondary">{status?.name}</span>
              <span
                className="text-xs"
                onClick={() => setEditing(item.id)}
                style={{ cursor: "pointer" }}
              >
                {editing === item.id ? (
                  <select
                    className="select"
                    defaultValue={item.priorityId ?? ""}
                    onChange={(event) =>
                      setPriority(item, event.target.value || null)
                    }
                    onBlur={() => setEditing(null)}
                    autoFocus
                  >
                    <option value="">No priority</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <MetadataBadge tone={priority ? "info" : "neutral"}>
                    {priority?.name ?? "None"}
                  </MetadataBadge>
                )}
              </span>
              <span className="text-xs text-muted">{milestone?.name ?? ""}</span>
              <span className="text-xs">{item.dueDate ?? ""}</span>
              <span className="backlog-custom-fields">
                {customFieldSummaries.map((summary) => (
                  <span key={summary.field.id} className="tag">
                    {summary.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
