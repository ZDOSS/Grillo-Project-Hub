import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  isFieldApplicableToType,
  type Label,
  type PriorityDefinition,
  type StatusDefinition,
  type TableView as TableViewDef,
  type ViewSort,
  type WorkItem,
  type WorkItemFilter,
  type WorkItemTypeDefinition
} from "@gph/core";
import {
  Button,
  CheckboxField,
  colorForLabel,
  DataTable,
  EmptyState,
  HelpTip,
  InlineAlert,
  MetadataBadge,
  SelectField,
  TextField,
  ViewToolbar,
  useToast,
  type DataTableColumn
} from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { useProjectStore } from "../../store/project-store";
import {
  activeCustomFields,
  formatCustomFieldValue
} from "../../work-item/custom-fields";
import {
  BASE_TABLE_COLUMNS,
  cleanWorkItemFilter,
  compareItemsBySort,
  createItemPrefillFromFilter,
  filterIdsFromSelectValue,
  itemMatchesFilter,
  MULTI_FILTER_VALUE,
  nextViewOrder,
  selectValueForFilterIds,
  type BaseTableColumnId
} from "../planning/view-helpers";

type SortKey = ViewSort["field"];

const DEFAULT_SORT_DIR: Record<SortKey, "asc" | "desc"> = {
  createdAt: "desc",
  dueDate: "asc",
  priority: "desc",
  status: "asc",
  title: "asc",
  type: "asc",
  updatedAt: "desc"
};

const DEFAULT_TABLE_SORT: ViewSort = { field: "priority", direction: "desc" };

const COLUMN_LABELS: Record<BaseTableColumnId, string> = {
  assignee: "Assignee",
  dueDate: "Due",
  labels: "Labels",
  milestone: "Milestone",
  priority: "Priority",
  status: "Status",
  title: "Title",
  type: "Type",
  updatedAt: "Updated"
};

function initialVisibleColumns(view: TableViewDef | undefined): string[] {
  return view?.visibleColumns?.length ? [...view.visibleColumns] : [...BASE_TABLE_COLUMNS];
}

function initialColumnOrder(view: TableViewDef | undefined): string[] {
  const visible = initialVisibleColumns(view);
  return view?.columnOrder?.length ? [...view.columnOrder] : visible;
}

type Row = {
  item: WorkItem;
  labels: Label[];
  priority?: PriorityDefinition;
  status?: StatusDefinition;
  type?: WorkItemTypeDefinition;
};

export function TableView({ view }: { view?: TableViewDef }) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const initialSort = view?.sort ?? DEFAULT_TABLE_SORT;
  const [sortKey, setSortKey] = useState<SortKey>(initialSort.field);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort.direction);
  const [filterText, setFilterText] = useState(view?.filter?.query ?? "");
  const [typeFilterIds, setTypeFilterIds] = useState<string[]>(view?.filter?.typeIds ?? []);
  const [statusFilterIds, setStatusFilterIds] = useState<string[]>(view?.filter?.statusIds ?? []);
  const [priorityFilterIds, setPriorityFilterIds] = useState<string[]>(view?.filter?.priorityIds ?? []);
  const [assigneeFilterIds, setAssigneeFilterIds] = useState<string[]>(view?.filter?.assigneeIds ?? []);
  const [milestoneFilterIds, setMilestoneFilterIds] = useState<string[]>(view?.filter?.milestoneIds ?? []);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns(view));
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumnOrder(view));
  const [viewName, setViewName] = useState(view?.name ?? "");
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkPriorityId, setBulkPriorityId] = useState("__no-change");
  const [bulkAssigneeId, setBulkAssigneeId] = useState("__no-change");
  const { notify } = useToast();

  useEffect(() => {
    const nextSort = view?.sort ?? DEFAULT_TABLE_SORT;
    setSortKey(nextSort.field);
    setSortDir(nextSort.direction);
    setFilterText(view?.filter?.query ?? "");
    setTypeFilterIds(view?.filter?.typeIds ?? []);
    setStatusFilterIds(view?.filter?.statusIds ?? []);
    setPriorityFilterIds(view?.filter?.priorityIds ?? []);
    setAssigneeFilterIds(view?.filter?.assigneeIds ?? []);
    setMilestoneFilterIds(view?.filter?.milestoneIds ?? []);
    setVisibleColumns(initialVisibleColumns(view));
    setColumnOrder(initialColumnOrder(view));
    setViewName(view?.name ?? "");
    setViewMessage(null);
    setSelectedIds([]);
  }, [view?.id]);

  const activeFilter = useMemo<WorkItemFilter>(() => ({
    query: filterText,
    typeIds: typeFilterIds.length ? typeFilterIds : undefined,
    statusIds: statusFilterIds.length ? statusFilterIds : undefined,
    priorityIds: priorityFilterIds.length ? priorityFilterIds : undefined,
    assigneeIds: assigneeFilterIds.length ? assigneeFilterIds : undefined,
    milestoneIds: milestoneFilterIds.length ? milestoneFilterIds : undefined
  }), [assigneeFilterIds, filterText, milestoneFilterIds, priorityFilterIds, statusFilterIds, typeFilterIds]);
  const activeSort = useMemo<ViewSort>(() => ({ field: sortKey, direction: sortDir }), [sortDir, sortKey]);

  const rows: Row[] = useMemo(() => {
    if (!bundle) return [];
    const cleanFilter = cleanWorkItemFilter(activeFilter);
    const out: Row[] = [];
    for (const item of bundle.core.items) {
      if (item.trashedAt || item.archived) continue;
      if (!itemMatchesFilter(item, cleanFilter)) continue;
      out.push({
        item,
        status: bundle.core.statuses.find((s) => s.id === item.statusId),
        priority: bundle.core.priorities.find((p) => p.id === item.priorityId),
        type: bundle.core.itemTypes.find((t) => t.id === item.typeId),
        labels: item.labelIds
          .map((id) => bundle.core.labels.find((l) => l.id === id))
          .filter(Boolean) as Label[]
      });
    }
    out.sort((a, b) => compareItemsBySort(a.item, b.item, bundle, activeSort) || a.item.title.localeCompare(b.item.title));
    return out;
  }, [activeFilter, activeSort, bundle]);
  const customFields = useMemo(
    () => (bundle ? activeCustomFields(bundle.core.customFields) : []),
    [bundle]
  );

  if (!bundle) return null;

  const cleanFilter = cleanWorkItemFilter(activeFilter);
  const createPrefill = createItemPrefillFromFilter(cleanFilter);
  const visibleRowIds = rows.map((row) => row.item.id);
  const visibleRowIdSet = new Set(visibleRowIds);
  const selectedVisibleIds = selectedIds.filter((id) => visibleRowIdSet.has(id));
  const allVisibleSelected = rows.length > 0 && selectedVisibleIds.length === rows.length;
  const liveItemById = new Map(
    bundle.core.items
      .filter((item) => !item.trashedAt && !item.archived)
      .map((item) => [item.id, item])
  );
  const selectedLiveItems = selectedIds
    .map((id) => liveItemById.get(id))
    .filter((item): item is WorkItem => Boolean(item));
  const hiddenSelectedCount = selectedLiveItems.length - selectedVisibleIds.length;
  const selectionLabel = selectedLiveItems.length > 0
    ? selectedVisibleIds.length === selectedLiveItems.length
      ? `${selectedLiveItems.length} selected`
      : `${selectedLiveItems.length} selected (${selectedVisibleIds.length} visible)`
    : "Select visible";

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_SORT_DIR[key]);
    }
  };

  const header = (key: SortKey, label: string) =>
    sortKey === key ? `${label} (${sortDir})` : label;

  const updateItem = (item: WorkItem, patch: Record<string, unknown>) => {
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch
    });
  };

  const toggleSelected = (itemId: string) => {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleRowIdSet.has(id));
      return Array.from(new Set([...current, ...visibleRowIds]));
    });
  };

  const clearBulkSelection = () => {
    setSelectedIds([]);
    setBulkStatusId("");
    setBulkPriorityId("__no-change");
    setBulkAssigneeId("__no-change");
  };

  const clearHiddenSelection = () => {
    setSelectedIds((current) => current.filter((id) => visibleRowIdSet.has(id)));
  };

  const applyBulkChanges = () => {
    const patch: Record<string, unknown> = {};
    if (bulkStatusId) patch.statusId = bulkStatusId;
    if (bulkPriorityId !== "__no-change") {
      patch.priorityId = bulkPriorityId === "__none" ? null : bulkPriorityId;
    }
    if (bulkAssigneeId !== "__no-change") {
      patch.assigneeId = bulkAssigneeId === "__none" ? null : bulkAssigneeId;
    }
    if (Object.keys(patch).length === 0) {
      setViewMessage("Choose at least one bulk change.");
      return;
    }
    if (selectedLiveItems.length === 0) {
      setViewMessage("Select at least one item.");
      return;
    }
    for (const item of selectedLiveItems) {
      updateItem(item, patch);
    }
    const message = `Updated ${selectedLiveItems.length} ${selectedLiveItems.length === 1 ? "item" : "items"}.`;
    setViewMessage(message);
    notify({ tone: "success", message });
    clearBulkSelection();
  };

  const baseColumns: Array<DataTableColumn<Row>> = [
    {
      id: "title",
      header: header("title", "Title"),
      onSort: () => setSort("title"),
      sortButtonLabel: "Sort by title",
      render: ({ item }) => (
        <div className="table-title-cell">
          <input
            aria-label={`Select ${item.title}`}
            checked={selectedIds.includes(item.id)}
            onChange={() => toggleSelected(item.id)}
            type="checkbox"
          />
          <Link
            to={`/item/${item.id}`}
            style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}
          >
            {item.title}
          </Link>
        </div>
      )
    },
    {
      id: "type",
      header: header("type", "Type"),
      onSort: () => setSort("type"),
      sortButtonLabel: "Sort by type",
      render: ({ type }) => <MetadataBadge>{type?.name ?? "None"}</MetadataBadge>
    },
    {
      id: "status",
      header: header("status", "Status"),
      onSort: () => setSort("status"),
      sortButtonLabel: "Sort by status",
      render: ({ item }) => (
        <select
          aria-label={`Status for ${item.title}`}
          className="select table-inline-control"
          value={item.statusId}
          onChange={(event) => updateItem(item, { statusId: event.target.value })}
        >
          {bundle.core.statuses.filter((status) => !status.archived || status.id === item.statusId).map((status) => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
      )
    },
    {
      id: "priority",
      header: header("priority", "Priority"),
      onSort: () => setSort("priority"),
      sortButtonLabel: "Sort by priority",
      render: ({ item }) => (
        <select
          aria-label={`Priority for ${item.title}`}
          className="select table-inline-control"
          value={item.priorityId ?? ""}
          onChange={(event) => updateItem(item, { priorityId: event.target.value || null })}
        >
          <option value="">None</option>
          {bundle.core.priorities.filter((priority) => !priority.archived || priority.id === item.priorityId).map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.name}</option>
          ))}
        </select>
      )
    },
    {
      id: "assignee",
      header: "Assignee",
      render: ({ item }) => (
        <select
          aria-label={`Assignee for ${item.title}`}
          className="select table-inline-control"
          value={item.assigneeId ?? ""}
          onChange={(event) => updateItem(item, { assigneeId: event.target.value || null })}
        >
          <option value="">None</option>
          {bundle.core.members.filter((member) => !member.archived || member.id === item.assigneeId).map((member) => (
            <option key={member.id} value={member.id}>{member.displayName}</option>
          ))}
        </select>
      )
    },
    {
      id: "milestone",
      header: "Milestone",
      render: ({ item }) => (
        <select
          aria-label={`Milestone for ${item.title}`}
          className="select table-inline-control"
          value={item.milestoneId ?? ""}
          onChange={(event) => updateItem(item, { milestoneId: event.target.value || null })}
        >
          <option value="">None</option>
          {bundle.core.milestones.filter((milestone) => !milestone.archived || milestone.id === item.milestoneId).map((milestone) => (
            <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
          ))}
        </select>
      )
    },
    {
      id: "labels",
      header: "Labels",
      render: ({ labels }) => (
        <div className="board-card-labels">
          {labels.map((label) => (
            <span key={label.id} className="board-card-label" style={{ background: label.color ? colorForLabel(label.color) : undefined }}>
              {label.name}
            </span>
          ))}
        </div>
      )
    },
    {
      id: "dueDate",
      header: header("dueDate", "Due"),
      onSort: () => setSort("dueDate"),
      sortButtonLabel: "Sort by due date",
      render: ({ item }) => (
        <input
          aria-label={`Due date for ${item.title}`}
          className="input table-inline-control"
          type="date"
          value={item.dueDate ?? ""}
          onChange={(event) => updateItem(item, { dueDate: event.target.value || null })}
        />
      )
    },
    {
      id: "updatedAt",
      header: header("updatedAt", "Updated"),
      onSort: () => setSort("updatedAt"),
      sortButtonLabel: "Sort by updated date",
      render: ({ item }) => (
        <span className="text-xs text-muted">
          {new Date(item.updatedAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  const customFieldColumns = customFields.map((field): DataTableColumn<Row> => ({
    id: `custom-${field.id}`,
    header: field.name,
    render: ({ item }) => {
      if (!isFieldApplicableToType(field, item.typeId)) {
        return <span className="text-xs text-muted">Not applicable</span>;
      }
      return formatCustomFieldValue(field, item.customFields?.[field.id]);
    }
  }));

  const columns = orderedColumns([...baseColumns, ...customFieldColumns], columnOrder)
    .filter((column) => visibleColumns.includes(column.id) || column.id.startsWith("custom-"));

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((current) =>
      current.includes(columnId)
        ? current.filter((entry) => entry !== columnId)
        : [...current, columnId]
    );
    setColumnOrder((current) => current.includes(columnId) ? current : [...current, columnId]);
  };

  const persistedColumnOrder = columnOrder.filter((columnId) => visibleColumns.includes(columnId));

  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      setViewMessage("Name the view before saving it.");
      return;
    }
    applyCommand({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "table",
      name,
      config: {
        columnOrder: persistedColumnOrder,
        filter: cleanFilter,
        order: nextViewOrder(bundle),
        sort: activeSort,
        visibleColumns
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
        columnOrder: persistedColumnOrder,
        filter: cleanFilter,
        name,
        sort: activeSort,
        visibleColumns
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
    <div className="table-view">
      <ViewToolbar>
        <Button variant="primary" size="sm" onClick={() => openCreateItem(createPrefill)}>
          New item
        </Button>
        <TextField
          label="Filter"
          placeholder="Filter items"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
        />
        <SelectField
          label="Type"
          value={selectValueForFilterIds(typeFilterIds)}
          onChange={(event) => setTypeFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All types</option>
          {typeFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple types</option> : null}
          {bundle.core.itemTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={selectValueForFilterIds(statusFilterIds)}
          onChange={(event) => setStatusFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All statuses</option>
          {statusFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple statuses</option> : null}
          {bundle.core.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
        </SelectField>
        <SelectField
          label="Priority"
          value={selectValueForFilterIds(priorityFilterIds)}
          onChange={(event) => setPriorityFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All priorities</option>
          {priorityFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple priorities</option> : null}
          {bundle.core.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
        </SelectField>
        <SelectField
          label="Assignee"
          value={selectValueForFilterIds(assigneeFilterIds)}
          onChange={(event) => setAssigneeFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All assignees</option>
          {assigneeFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple assignees</option> : null}
          {bundle.core.members.filter((member) => !member.archived).map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
        </SelectField>
        <SelectField
          label="Milestone"
          value={selectValueForFilterIds(milestoneFilterIds)}
          onChange={(event) => setMilestoneFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All milestones</option>
          {milestoneFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple milestones</option> : null}
          {bundle.core.milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
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
        {viewMessage ? <InlineAlert tone="info">{viewMessage}</InlineAlert> : null}
      </ViewToolbar>
      <div className="table-bulk-toolbar" aria-label="Bulk table actions">
        <label className="table-master-select">
          <input
            aria-label="Select all visible rows"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
            type="checkbox"
          />
          <span>{selectionLabel}</span>
        </label>
        <HelpTip label="Bulk table selection">
          Bulk actions apply to every selected live item, including selected rows currently hidden by filters. Clear hidden selection if you only want visible rows.
        </HelpTip>
        {hiddenSelectedCount > 0 ? (
          <Button size="sm" variant="ghost" onClick={clearHiddenSelection}>
            Clear {hiddenSelectedCount} hidden
          </Button>
        ) : null}
        {selectedLiveItems.length > 0 ? (
          <>
            <SelectField
              label="Bulk status"
              value={bulkStatusId}
              onChange={(event) => setBulkStatusId(event.target.value)}
            >
              <option value="">Leave status</option>
              {bundle.core.statuses.filter((status) => !status.archived).map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
            </SelectField>
            <SelectField
              label="Bulk priority"
              value={bulkPriorityId}
              onChange={(event) => setBulkPriorityId(event.target.value)}
            >
              <option value="__no-change">Leave priority</option>
              <option value="__none">No priority</option>
              {bundle.core.priorities.filter((priority) => !priority.archived).map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
            </SelectField>
            <SelectField
              label="Bulk assignee"
              value={bulkAssigneeId}
              onChange={(event) => setBulkAssigneeId(event.target.value)}
            >
              <option value="__no-change">Leave assignee</option>
              <option value="__none">Unassigned</option>
              {bundle.core.members.filter((member) => !member.archived).map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
            </SelectField>
            <Button size="sm" onClick={applyBulkChanges}>
              Apply bulk changes
            </Button>
            <Button size="sm" variant="ghost" onClick={clearBulkSelection}>Clear selection</Button>
            <span className="table-bulk-live text-xs text-muted" role="status" aria-live="polite">
              {hiddenSelectedCount > 0 ? `${hiddenSelectedCount} selected item${hiddenSelectedCount === 1 ? "" : "s"} hidden by filters.` : ""}
            </span>
          </>
        ) : (
          <span className="table-bulk-hint text-xs text-muted">Select rows to edit them together.</span>
        )}
      </div>
      <details className="table-column-disclosure">
        <summary>
          <span>Columns</span>
          <span className="text-xs text-muted">{visibleColumns.length} visible</span>
        </summary>
        <div className="table-column-picker" aria-label="Column visibility">
          {BASE_TABLE_COLUMNS.map((columnId) => (
            <CheckboxField
              key={columnId}
              label={`${COLUMN_LABELS[columnId]} column`}
              checked={visibleColumns.includes(columnId)}
              onChange={() => toggleColumn(columnId)}
            />
          ))}
        </div>
      </details>
      {rows.length >= 100 ? (
        <div className="view-hint">
          <InlineAlert tone="info">
            <strong>Large table view</strong>
            <span> Showing {rows.length} rows. Use filters or saved views to keep edits fast and easier to scan.</span>
          </InlineAlert>
        </div>
      ) : null}
      <div className="table-wrap">
        <DataTable
          label="Work items table"
          rows={rows}
          columns={columns}
          empty={
            <EmptyState
              title="No items match"
              description="Adjust the filter, type, status, or saved-view settings to show more work."
            />
          }
        />
      </div>
    </div>
  );
}

function orderedColumns<Row>(columns: Array<DataTableColumn<Row>>, columnOrder: string[]): Array<DataTableColumn<Row>> {
  if (columnOrder.length === 0) return columns;
  const remaining = new Map(columns.map((column) => [column.id, column]));
  const ordered: Array<DataTableColumn<Row>> = [];
  for (const columnId of columnOrder) {
    const column = remaining.get(columnId);
    if (!column) continue;
    ordered.push(column);
    remaining.delete(columnId);
  }
  return [...ordered, ...remaining.values()];
}
