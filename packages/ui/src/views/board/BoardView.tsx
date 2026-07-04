import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useProjectStore } from "../../store/project-store";
import type { WorkItem, BoardView as BoardViewDef, BoardColumn, StatusDefinition, PriorityDefinition, Label, WorkItemFilter } from "@gph/core";
import { findColumnForStatus } from "@gph/core";
import { Button, EmptyState, InlineAlert, SelectField, TextField, ViewToolbar } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { ItemCard } from "./ItemCard";
import {
  filterIdsFromSelectValue,
  cleanWorkItemFilter,
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
  const isDefaultView = bundle.projectSettings.defaultViewId === view.id;

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
          onClick={() => openCreateItem(firstColumnCreateStatusId ? { statusId: firstColumnCreateStatusId } : undefined)}
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
    </div>
  );
}

export { findColumnForStatus };

function defaultSaveNameForView(view: BoardViewDef): string {
  return view.order === undefined && !view.filter ? "" : view.name;
}
