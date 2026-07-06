import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  isDateOnlyOrderValid,
  milestoneProgress,
  relationshipsForItem,
  type Milestone,
  type WorkItem
} from "@gph/core";
import { InlineAlert, MetadataBadge, SelectField, TextField, ViewToolbar } from "../../components";
import { useProjectStore } from "../../store/project-store";

/**
 * Roadmap / timeline view.
 *
 *  - Lightweight Gantt-adjacent view.
 *  - Drag-and-resize to change dates; explicit controls handle precise edits.
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
  const [rangeError, setRangeError] = useState<string | null>(null);

  if (!bundle) return null;

  const months = MONTHS_PER_ZOOM[zoom];
  const monthStarts = useMemo(() => {
    const start = new Date(anchor + "T00:00:00Z");
    start.setUTCDate(1);
    const arr: { key: string; label: string; days: number }[] = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const days = Math.round((next.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      arr.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        days
      });
    }
    return arr;
  }, [anchor, months]);

  const totalDays = monthStarts.reduce((acc, m) => acc + m.days, 0);
  const startDate = `${monthStarts[0]?.key}-01`;

  const lanes: Array<Milestone | { id: "_none"; name: string; targetDate: null }> = [
    ...bundle.core.milestones,
    { id: "_none", name: "No milestone", targetDate: null }
  ];

  const items = bundle.core.items.filter((i) => !i.trashedAt && !i.archived && (i.startDate || i.dueDate));

  const dayToX = (date: string) => {
    const d = new Date(date + "T00:00:00Z");
    const start = new Date(startDate + "T00:00:00Z");
    return Math.max(0, Math.round(((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 1000));
  };

  const setItemRange = (item: WorkItem, start: string, due: string) => {
    const nextStart = start || null;
    const nextDue = due || null;
    if (!isDateOnlyOrderValid(nextStart, nextDue)) {
      setRangeError(`${item.title}: start date must not be later than due date.`);
      return;
    }
    setRangeError(null);
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { startDate: nextStart, dueDate: nextDue }
    });
  };

  const setItemMilestone = (item: WorkItem, milestoneId: string) => {
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { milestoneId: milestoneId || null }
    });
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
        {rangeError ? <InlineAlert tone="danger">{rangeError}</InlineAlert> : null}
      </ViewToolbar>
      {items.length >= 80 ? (
        <div className="view-hint">
          <InlineAlert tone="info">
            <strong>Large roadmap view</strong>
            <span> Showing {items.length} dated items. Use zoom and milestone lanes to focus planning changes.</span>
          </InlineAlert>
        </div>
      ) : null}
      <div className="roadmap-grid" style={{ gridTemplateColumns: `220px repeat(${months}, 1fr)` }}>
        <div className="roadmap-row-lane">Item</div>
        {monthStarts.map((m) => (
          <div key={m.key} className="roadmap-month">{m.label}</div>
        ))}
        {lanes.map((lane) => {
          const laneItems = items.filter((i) => (i.milestoneId ?? "_none") === lane.id);
          const completed = laneItems.filter((item) =>
            bundle.core.statuses.find((status) => status.id === item.statusId)?.category === "completed"
          ).length;
          const progress = milestoneProgress(lane as Milestone, laneItems.length, completed);
          return (
            <div key={lane.id} className="roadmap-row" style={{ display: "contents" }}>
              <div className="roadmap-row-lane">
                <div className="roadmap-lane-title">{lane.name}</div>
                {lane.targetDate ? <span className="text-xs text-muted">Target {lane.targetDate}</span> : null}
                <span className="text-xs text-muted">{progress.completed}/{progress.total} complete</span>
                <span className="text-xs text-muted">{progress.percent}%</span>
              </div>
              <div className="roadmap-row-cell" style={{ gridColumn: `span ${months}`, position: "relative", height: laneItems.length > 0 ? Math.max(88, laneItems.length * 84 + 16) : 64, padding: 0 }}>
                {laneItems.length === 0 ? <span className="text-xs text-muted" style={{ padding: 8 }}>-</span> : null}
                {laneItems.map((item, idx) => {
                  const status = bundle.core.statuses.find((s) => s.id === item.statusId);
                  const relationshipSummary = relationshipsForItem(bundle.core.relationships, item.id);
                  const startX = dayToX(item.startDate ?? item.dueDate!);
                  const endX = dayToX(item.dueDate ?? item.startDate!);
                  return (
                    <RoadmapBar
                      key={item.id}
                      item={item}
                      statusCategory={status?.category ?? "planned"}
                      startX={startX}
                      endX={Math.max(endX, startX + 5)}
                      top={8 + idx * 84}
                      milestones={bundle.core.milestones}
                      blockedByCount={relationshipSummary.blockedBy.length}
                      blocksCount={relationshipSummary.blocks.length}
                      onChange={(start, due) => setItemRange(item, start, due)}
                      onMilestoneChange={(milestoneId) => setItemMilestone(item, milestoneId)}
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

function RoadmapBar({
  item,
  statusCategory,
  startX,
  endX,
  top,
  milestones,
  blockedByCount,
  blocksCount,
  onChange,
  onMilestoneChange
}: {
  item: WorkItem;
  statusCategory: "planned" | "active" | "completed" | "canceled";
  startX: number;
  endX: number;
  top: number;
  milestones: Milestone[];
  blockedByCount: number;
  blocksCount: number;
  onChange: (start: string, due: string) => void;
  onMilestoneChange: (milestoneId: string) => void;
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
    const dayShift = Math.round(dx / 8);
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
      title={`${item.startDate ?? ""} -> ${item.dueDate ?? ""}`}
    >
      <div className="roadmap-bar-main">
        <Link to={`/item/${item.id}`} style={{ color: "inherit", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </Link>
        {blockedByCount > 0 ? <MetadataBadge tone="danger">Blocked by {blockedByCount}</MetadataBadge> : null}
        {blocksCount > 0 ? <MetadataBadge>Blocks {blocksCount}</MetadataBadge> : null}
        <span
          onPointerDown={start("resize")}
          style={{ width: 6, cursor: "ew-resize", alignSelf: "stretch" }}
          aria-label="Resize due date"
        />
      </div>
      <div className="roadmap-bar-controls" onPointerDown={(event) => event.stopPropagation()}>
        <label>
          <span className="text-xs text-muted">Start</span>
          <input
            aria-label={`Start date for ${item.title}`}
            className="input roadmap-date-input"
            type="date"
            value={item.startDate ?? ""}
            onChange={(event) => onChange(event.target.value, item.dueDate ?? "")}
          />
        </label>
        <label>
          <span className="text-xs text-muted">Due</span>
          <input
            aria-label={`Due date for ${item.title}`}
            className="input roadmap-date-input"
            type="date"
            value={item.dueDate ?? ""}
            onChange={(event) => onChange(item.startDate ?? "", event.target.value)}
          />
        </label>
        <label>
          <span className="text-xs text-muted">Milestone</span>
          <select
            aria-label={`Milestone for ${item.title}`}
            className="select roadmap-milestone-select"
            value={item.milestoneId ?? ""}
            onChange={(event) => onMilestoneChange(event.target.value)}
          >
            <option value="">No milestone</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
