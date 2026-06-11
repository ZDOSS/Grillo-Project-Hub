import { useState, useMemo, useRef, type DragEvent } from "react";
import { useProjectStore } from "../../store/project-store";
import type { WorkItem, BoardView as BoardViewDef, BoardColumn, StatusDefinition, PriorityDefinition, Label } from "@gph/core";
import { findColumnForStatus } from "@gph/core";
import { ItemCard } from "./ItemCard";

export type BoardViewProps = {
  view: BoardViewDef;
};

export function BoardView({ view }: BoardViewProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragCounter = useRef(0);

  if (!bundle) return null;
  const { statuses, priorities, labels } = bundle.core;

  const itemsByStatus = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const col of view.columns) {
      for (const sId of col.statusIds) map.set(sId, []);
    }
    for (const item of bundle.core.items) {
      if (item.trashedAt || item.archived) continue;
      const arr = map.get(item.statusId);
      if (arr) arr.push(item);
    }
    return map;
  }, [bundle.core.items, view.columns]);

  const itemsForColumn = (col: BoardColumn): WorkItem[] => {
    const all: WorkItem[] = [];
    for (const sId of col.statusIds) {
      const arr = itemsByStatus.get(sId) ?? [];
      all.push(...arr);
    }
    return all;
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>, itemId: string) => {
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
      throw new Error("Invalid drop target: default drop status not in column");
    }
    if (item.statusId === targetStatus) return;
    // WIP hard enforcement
    if (col.wipMode === "hard" && col.wipLimit != null) {
      const wouldExceed = itemsForColumn(col).length + 1 > col.wipLimit;
      if (wouldExceed) {
        // reject silently (could show a toast in real UI)
        return;
      }
    }
    applyCommand({ type: "item.moveStatus", projectId: bundle.project.id, itemId, toStatusId: targetStatus });
  };

  return (
    <div className="board" role="region" aria-label={`${view.name} board`}>
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
  );
}

export { findColumnForStatus };
