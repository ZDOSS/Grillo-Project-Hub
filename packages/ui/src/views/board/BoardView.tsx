import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useProjectStore } from "../../store/project-store";
import type { WorkItem, BoardView as BoardViewDef, BoardColumn, StatusCategory, StatusDefinition, PriorityDefinition, Label, WorkItemFilter } from "@gph/core";
import { findColumnForStatus, generateId } from "@gph/core";
import { Button, EmptyState, InlineAlert, Modal, SelectField, TextField, ViewToolbar } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { ItemCard } from "./ItemCard";
import {
  filterIdsFromSelectValue,
  cleanWorkItemFilter,
  createItemPrefillFromFilter,
  itemMatchesFilter,
  MULTI_FILTER_VALUE,
  nextViewOrder,
  selectValueForFilterIds
} from "../planning/view-helpers";

export type BoardViewProps = {
  view: BoardViewDef;
};

export function BoardView({ view }: BoardViewProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropFeedback, setDropFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState(view.filter?.query ?? "");
  const [typeFilterIds, setTypeFilterIds] = useState<string[]>(view.filter?.typeIds ?? []);
  const [statusFilterIds, setStatusFilterIds] = useState<string[]>(view.filter?.statusIds ?? []);
  const [viewName, setViewName] = useState(defaultSaveNameForView(view));
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const dragCounter = useRef(0);
  const statuses = bundle?.core.statuses ?? [];
  const itemTypes = bundle?.core.itemTypes ?? [];
  const priorities = bundle?.core.priorities ?? [];
  const labels = bundle?.core.labels ?? [];

  useEffect(() => {
    setQuery(view.filter?.query ?? "");
    setTypeFilterIds(view.filter?.typeIds ?? []);
    setStatusFilterIds(view.filter?.statusIds ?? []);
    setViewName(defaultSaveNameForView(view));
    setViewMessage(null);
  }, [view.id]);

  const activeFilter = useMemo<WorkItemFilter>(() => ({
    query,
    typeIds: typeFilterIds.length ? typeFilterIds : undefined,
    statusIds: statusFilterIds.length ? statusFilterIds : undefined
  }), [query, statusFilterIds, typeFilterIds]);
  const cleanFilter = useMemo(() => cleanWorkItemFilter(activeFilter), [activeFilter]);

  const itemsByStatus = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const col of view.columns) {
      for (const sId of col.statusIds) map.set(sId, []);
    }
    if (!bundle) return map;
    for (const item of bundle.core.items) {
      if (item.trashedAt || item.archived) continue;
      if (!itemMatchesFilter(item, cleanFilter)) continue;
      const arr = map.get(item.statusId);
      if (arr) arr.push(item);
    }
    return map;
  }, [bundle, cleanFilter, view.columns]);

  if (!bundle) return null;

  const itemsForColumn = (col: BoardColumn): WorkItem[] => {
    const all: WorkItem[] = [];
    for (const sId of col.statusIds) {
      const arr = itemsByStatus.get(sId) ?? [];
      all.push(...arr);
    }
    return all;
  };

  const onDragStart = (e: DragEvent<HTMLElement>, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingItem(itemId);
  };

  const onDragEnd = () => {
    setDraggingItem(null);
    setDropTarget(null);
    dragCounter.current = 0;
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, col: BoardColumn) => {
    e.preventDefault();
    setDropTarget(null);
    dragCounter.current = 0;
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    const item = bundle.core.items.find((i) => i.id === itemId);
    if (!item) return;
    if (col.statusIds.includes(item.statusId)) return;
    const targetStatus = col.defaultDropStatusId;
    if (!col.statusIds.includes(targetStatus)) {
      console.warn("Invalid drop target: default drop status not in column");
      return;
    }
    if (item.statusId === targetStatus) return;
    // WIP hard enforcement
    if (col.wipMode === "hard" && col.wipLimit != null) {
      const wouldExceed = itemsForColumn(col).length + 1 > col.wipLimit;
      if (wouldExceed) {
        setDropFeedback(`${col.name} is at its WIP limit of ${col.wipLimit}.`);
        return;
      }
    }
    setDropFeedback(null);
    applyCommand({ type: "item.moveStatus", projectId: bundle.project.id, itemId, toStatusId: targetStatus });
  };

  const firstColumnCreateStatusId = view.columns[0]?.defaultDropStatusId;
  const createPrefill = createItemPrefillFromFilter(
    cleanFilter,
    firstColumnCreateStatusId ? { statusId: firstColumnCreateStatusId } : undefined
  );
  const isDefaultView = bundle.projectSettings.defaultViewId === view.id;
  const visibleBoardCount = Array.from(itemsByStatus.values()).reduce((total, items) => total + items.length, 0);

  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      setViewMessage("Name the view before saving it.");
      return;
    }
    applyCommand({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "board",
      name,
      config: {
        columns: view.columns,
        filter: cleanFilter,
        order: nextViewOrder(bundle)
      }
    });
    setViewMessage(`${name} saved.`);
  };

  const updateView = () => {
    if (isDefaultView) return;
    const name = viewName.trim();
    if (!name) {
      setViewMessage("Name the view before updating it.");
      return;
    }
    applyCommand({
      type: "view.update",
      projectId: bundle.project.id,
      viewId: view.id,
      patch: { filter: cleanFilter, name }
    });
    setViewMessage(`${name} updated.`);
  };

  const deleteView = () => {
    if (isDefaultView) return;
    applyCommand({ type: "view.delete", projectId: bundle.project.id, viewId: view.id });
    setViewMessage(`${view.name} deleted.`);
  };

  const moveView = (direction: -1 | 1) => {
    if (isDefaultView) return;
    const currentOrder = view.order ?? nextViewOrder(bundle);
    applyCommand({
      type: "view.update",
      projectId: bundle.project.id,
      viewId: view.id,
      patch: { order: currentOrder + direction * 1536 }
    });
  };

  return (
    <div className="board-view">
      <ViewToolbar>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateItem(createPrefill)}
        >
          New item
        </Button>
        <TextField
          label="Filter board"
          placeholder="Search cards"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SelectField
          label="Board type"
          value={selectValueForFilterIds(typeFilterIds)}
          onChange={(event) => setTypeFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All types</option>
          {typeFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple types</option> : null}
          {itemTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </SelectField>
        <SelectField
          label="Board status"
          value={selectValueForFilterIds(statusFilterIds)}
          onChange={(event) => setStatusFilterIds(filterIdsFromSelectValue(event.target.value))}
        >
          <option value="">All statuses</option>
          {statusFilterIds.length > 1 ? <option value={MULTI_FILTER_VALUE}>Multiple statuses</option> : null}
          {statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
        </SelectField>
        <TextField
          label="View name"
          placeholder="Save as..."
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
        />
        <Button size="sm" onClick={saveView}>Save view</Button>
        <Button size="sm" onClick={() => setColumnsOpen(true)}>Manage columns</Button>
        {!isDefaultView ? (
          <>
            <Button size="sm" onClick={updateView}>Update view</Button>
            <Button size="sm" variant="ghost" onClick={() => moveView(-1)}>Move view left</Button>
            <Button size="sm" variant="ghost" onClick={() => moveView(1)}>Move view right</Button>
            <Button size="sm" variant="danger" onClick={deleteView}>Delete view</Button>
          </>
        ) : null}
        {dropFeedback ? <InlineAlert tone="warning">{dropFeedback}</InlineAlert> : null}
        {viewMessage ? <InlineAlert tone="info">{viewMessage}</InlineAlert> : null}
      </ViewToolbar>
      {visibleBoardCount >= 80 ? (
        <div className="view-hint">
          <InlineAlert tone="info">
            <strong>Large board view</strong>
            <span> Showing {visibleBoardCount} cards. Use filters or WIP limits to keep each lane scannable.</span>
          </InlineAlert>
        </div>
      ) : null}
      <div className="board" role="region" aria-label={`${view.name} board`}>
        {view.columns.length === 0 ? (
          <EmptyState
            title="No board columns"
            description="Configure statuses and board columns in settings before using this view."
          />
        ) : null}
        {view.columns.map((col) => {
          const items = itemsForColumn(col);
          const over = items.length > (col.wipLimit ?? Infinity);
          const warn = !over && items.length === (col.wipLimit ?? Infinity);
          const state = over ? "exceeded" : warn ? "warn" : "ok";
          return (
            <div
              key={col.id}
              className="board-column"
              data-wip-state={state}
              aria-label={`${col.name} column`}
            >
              <div className="board-column-header">
                <span className="board-column-title">{col.name}</span>
                <span className="board-column-count">
                  {items.length}
                  {col.wipLimit != null ? ` / ${col.wipLimit}` : ""}
                </span>
              </div>
              <div
                className="board-column-body"
                data-drop-active={dropTarget === col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropTarget !== col.id) setDropTarget(col.id);
                }}
                onDragLeave={() => {
                  dragCounter.current -= 1;
                  if (dragCounter.current <= 0) setDropTarget(null);
                }}
                onDragEnter={() => {
                  dragCounter.current += 1;
                }}
                onDrop={(e) => onDrop(e, col)}
              >
                {items.length === 0 ? (
                  <div className="text-muted text-xs" style={{ padding: "8px 4px" }}>Drop items here</div>
                ) : (
                  items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      statuses={statuses}
                      priorities={priorities}
                      labels={labels}
                      dragging={draggingItem === item.id}
                      onDragStart={(e) => onDragStart(e, item.id)}
                      onDragEnd={onDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {columnsOpen ? (
        <BoardColumnsDialog
          view={view}
          statuses={statuses}
          onClose={() => setColumnsOpen(false)}
          onColumnsChange={(columns, message) => {
            applyCommand({
              type: "view.update",
              projectId: bundle.project.id,
              viewId: view.id,
              patch: { columns }
            });
            setViewMessage(message);
          }}
          onCreateStatus={(name, category) => {
            const knownStatusIds = new Set(bundle.core.statuses.map((status) => status.id));
            const result = applyCommand({
              type: "status.create",
              projectId: bundle.project.id,
              name,
              category
            });
            const createdStatus = result.bundle.core.statuses.find((status) => !knownStatusIds.has(status.id));
            if (!createdStatus) return;
            const columns = [...view.columns, columnForStatus(createdStatus, view.columns)];
            applyCommand({
              type: "view.update",
              projectId: bundle.project.id,
              viewId: view.id,
              patch: { columns }
            });
            setViewMessage(`${createdStatus.name} created and added to the board.`);
          }}
        />
      ) : null}
    </div>
  );
}

export { findColumnForStatus };

function defaultSaveNameForView(view: BoardViewDef): string {
  return view.order === undefined && !view.filter ? "" : view.name;
}

function BoardColumnsDialog({
  onClose,
  onColumnsChange,
  onCreateStatus,
  statuses,
  view
}: {
  onClose: () => void;
  onColumnsChange: (columns: BoardColumn[], message: string) => void;
  onCreateStatus: (name: string, category: StatusCategory) => void;
  statuses: StatusDefinition[];
  view: BoardViewDef;
}) {
  const [statusName, setStatusName] = useState("");
  const [statusCategory, setStatusCategory] = useState<StatusCategory>("planned");
  const mappedStatusIds = new Set(view.columns.flatMap((column) => column.statusIds));
  const availableStatuses = statuses
    .filter((status) => !status.archived && !mappedStatusIds.has(status.id))
    .sort((a, b) => a.order - b.order);
  const statusById = new Map(statuses.map((status) => [status.id, status]));

  const createStatus = () => {
    const name = statusName.trim();
    if (!name) return;
    onCreateStatus(name, statusCategory);
    setStatusName("");
  };

  return (
    <Modal
      title="Manage board columns"
      onClose={onClose}
      size="lg"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="board-columns-dialog">
        <div>
          <h3 className="board-columns-section-title">Columns on this board</h3>
          <p className="text-sm text-secondary">
            Removing a column only hides it from this board. Its statuses and work items stay in the project.
          </p>
          <div className="board-columns-list">
            {view.columns.length === 0 ? (
              <EmptyState title="No columns shown" description="Add an existing status or create a new one below." />
            ) : view.columns.map((column) => (
              <div className="board-columns-row" key={column.id}>
                <div>
                  <strong>{column.name}</strong>
                  <div className="text-xs text-secondary">
                    {column.statusIds.map((id) => statusById.get(id)?.name ?? id).join(", ")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${column.name} column`}
                  onClick={() => onColumnsChange(
                    view.columns.filter((entry) => entry.id !== column.id),
                    `${column.name} removed from this board.`
                  )}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="board-columns-section-title">Add from existing statuses</h3>
          <div className="board-columns-list">
            {availableStatuses.length === 0 ? (
              <p className="text-sm text-secondary">Every visible workflow status is already represented on this board.</p>
            ) : availableStatuses.map((status) => (
              <div className="board-columns-row" key={status.id}>
                <div>
                  <strong>{status.name}</strong>
                  <div className="text-xs text-secondary">{status.category}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onColumnsChange(
                    [...view.columns, columnForStatus(status, view.columns)],
                    `${status.name} added to this board.`
                  )}
                >
                  Add column
                </Button>
              </div>
            ))}
          </div>
        </div>

        <form
          className="board-columns-create"
          onSubmit={(event) => {
            event.preventDefault();
            createStatus();
          }}
        >
          <div>
            <h3 className="board-columns-section-title">Create a new status</h3>
            <p className="text-sm text-secondary">The new workflow status will also be added as a column on this board.</p>
          </div>
          <div className="board-columns-create-fields">
            <TextField
              label="Status name"
              placeholder="For example, QA"
              value={statusName}
              onChange={(event) => setStatusName(event.target.value)}
            />
            <SelectField
              label="Category"
              value={statusCategory}
              onChange={(event) => setStatusCategory(event.target.value as StatusCategory)}
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </SelectField>
            <Button type="submit" variant="primary" disabled={!statusName.trim()}>Create and add</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function columnForStatus(status: StatusDefinition, columns: BoardColumn[]): BoardColumn {
  const highestOrder = columns.reduce((highest, column) => Math.max(highest, column.order), 0);
  return {
    id: generateId("col"),
    name: status.name,
    statusIds: [status.id],
    defaultDropStatusId: status.id,
    order: highestOrder + 1024,
    wipLimit: null,
    wipMode: "warn"
  };
}
