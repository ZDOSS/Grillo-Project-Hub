import { useMemo, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import type { WorkItem } from "@gph/core";
import { isDateOnlyOrderValid } from "@gph/core";
import { Link } from "react-router-dom";
import { SelectField, TextField, ViewToolbar } from "../../components";

/**
 * Roadmap / timeline view.
 *
 *  - Lightweight Gantt-adjacent view.
 *  - Drag-and-resize to change dates; drag between milestone lanes.
 *  - Date-only YYYY-MM-DD values; do not silently cascade dependencies.
 *  - All edits go through the validated command surface.
 */

type Zoom = "week" | "month" | "quarter";

const MONTHS_PER_ZOOM: Record<Zoom, number> = { week: 2, month: 6, quarter: 9 };

export function RoadmapView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [zoom, setZoom] = useState<Zoom>("month");
  const [anchor, setAnchor] = useState<string>(new Date().toISOString().slice(0, 10));

  if (!bundle) return null;

  const months = MONTHS_PER_ZOOM[zoom];
  const monthStarts = useMemo(() => {
    const start = new Date(anchor + "T00:00:00Z");
    start.setUTCDate(1);
    const arr: { key: string; label: string; days: number }[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const days = Math.round((next.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      arr.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }), days });
    }
    return arr;
  }, [anchor, months]);

  const totalDays = monthStarts.reduce((acc, m) => acc + m.days, 0);
  const startDate = monthStarts[0]?.key + "-01";

  const lanes = bundle.core.milestones.length > 0
    ? bundle.core.milestones
    : [{ id: "_none", name: "No milestone" } as { id: string; name: string }];

  const items = bundle.core.items.filter((i) => !i.trashedAt && !i.archived && (i.startDate || i.dueDate));

  const dayToX = (date: string) => {
    const d = new Date(date + "T00:00:00Z");
    const start = new Date(startDate + "T00:00:00Z");
    return Math.max(0, Math.round(((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 1000));
  };

  const setItemRange = (item: WorkItem, start: string, due: string) => {
    if (!isDateOnlyOrderValid(start, due)) return;
    applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch: { startDate: start, dueDate: due } });
  };

  return (
    <div className="roadmap">
      <ViewToolbar>
        <SelectField
          label="Zoom"
          value={zoom}
          onChange={(event) => setZoom(event.target.value as Zoom)}
        >
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
        </SelectField>
        <TextField
          label="Anchor"
          type="month"
          value={anchor.slice(0, 7)}
          onChange={(event) => setAnchor(event.target.value + "-01")}
        />
        <span className="text-xs text-muted">
          Drag a bar to move dates. Resize the right edge to extend the due date.
        </span>
      </ViewToolbar>
      <div className="roadmap-grid" style={{ gridTemplateColumns: `200px repeat(${months}, 1fr)` }}>
        <div className="roadmap-row-lane">Item</div>
        {monthStarts.map((m) => (
          <div key={m.key} className="roadmap-month">{m.label}</div>
        ))}
        {lanes.map((lane) => {
          const laneItems = items.filter((i) => (i.milestoneId ?? "_none") === lane.id);
          return (
            <div key={lane.id} className="roadmap-row" style={{ display: "contents" }}>
              <div className="roadmap-row-lane">{lane.name}</div>
              <div className="roadmap-row-cell" style={{ gridColumn: `span ${months}`, position: "relative", height: laneItems.length > 0 ? Math.max(56, laneItems.length * 48 + 16) : 56, padding: 0 }}>
                {laneItems.length === 0 && <span className="text-xs text-muted" style={{ padding: 8 }}>—</span>}
                {laneItems.map((item, idx) => {
                  const status = bundle.core.statuses.find((s) => s.id === item.statusId);
                  const startX = dayToX(item.startDate ?? item.dueDate!);
                  const endX = dayToX(item.dueDate ?? item.startDate!);
                  return (
                    <RoadmapBar
                      key={item.id}
                      item={item}
                      statusCategory={status?.category ?? "planned"}
                      startX={startX}
                      endX={Math.max(endX, startX + 5)}
                      top={8 + idx * 48}
                      onChange={(start, due) => setItemRange(item, start, due)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapBar({ item, statusCategory, startX, endX, top, onChange }: {
  item: WorkItem;
  statusCategory: "planned" | "active" | "completed" | "canceled";
  startX: number;
  endX: number;
  top: number;
  onChange: (start: string, due: string) => void;
}) {
  const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
  const [origin, setOrigin] = useState<{ x: number; start: string; due: string } | null>(null);

  const start = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(mode);
    setOrigin({ x: e.clientX, start: item.startDate ?? item.dueDate!, due: item.dueDate ?? item.startDate! });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging || !origin) return;
    const dx = e.clientX - origin.x;
    const dayShift = Math.round(dx / 8); // approx 8px per day at default zoom
    if (dayShift === 0) return;
    const startDate = shiftDate(origin.start, dayShift);
    const dueDate = shiftDate(origin.due, dayShift);
    if (dragging === "resize") {
      onChange(origin.start, dueDate);
    } else {
      onChange(startDate, dueDate);
    }
  };

  const onUp = () => {
    setDragging(null);
    setOrigin(null);
  };

  return (
    <div
      className="roadmap-bar"
      data-status={statusCategory}
      style={{ left: startX, width: Math.max(endX - startX, 5), top }}
      onPointerDown={start("move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      title={`${item.startDate ?? ""} → ${item.dueDate ?? ""}`}
    >
      <Link to={`/item/${item.id}`} style={{ color: "inherit", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.title}
      </Link>
      <span
        onPointerDown={start("resize")}
        style={{ width: 6, cursor: "ew-resize", alignSelf: "stretch" }}
        aria-label="Resize due date"
      />
    </div>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
