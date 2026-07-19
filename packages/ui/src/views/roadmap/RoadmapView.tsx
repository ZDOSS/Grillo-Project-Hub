import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GripVertical, Plus } from "lucide-react";
import {
  isDateOnlyOrderValid,
  milestoneProgress,
  relationshipsForItem,
  type Milestone,
  type WorkItem
} from "@gph/core";
import { Button, InlineAlert, MetadataBadge, SelectField, TextField, ViewToolbar } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
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
type DragMode = "move" | "resize";

const MONTHS_PER_ZOOM: Record<Zoom, number> = { week: 2, month: 6, quarter: 9 };
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const ROADMAP_ITEM_HEIGHT = 96;

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
      const days = Math.round((next.getTime() - d.getTime()) / MILLISECONDS_PER_DAY);
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

  const items = bundle.core.items.filter((i) => !i.trashedAt && !i.archived && (i.startDate || i.dueDate));
  const usedMilestoneIds = new Set(items.map((item) => item.milestoneId).filter(Boolean));
  const lanes: Array<Milestone | { id: "_none"; name: string; targetDate: null }> = [
    ...bundle.core.milestones.filter((milestone) => !milestone.archived || usedMilestoneIds.has(milestone.id)),
    { id: "_none", name: "No milestone", targetDate: null }
  ];

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

  const createFromRoadmap = () => {
    openCreateItem({ startDate: `${anchor.slice(0, 7)}-01` });
  };

  return (
    <div className="roadmap">
      <ViewToolbar>
        <Button
          icon={<Plus aria-hidden="true" />}
          onClick={createFromRoadmap}
          size="sm"
          variant="primary"
        >
          New item
        </Button>
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
      <div
        className="roadmap-grid"
        style={{ gridTemplateColumns: `220px ${monthStarts.map((month) => `${month.days}fr`).join(" ")}` }}
      >
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
                <div className="roadmap-lane-meta">
                  {lane.targetDate ? <span>Target {lane.targetDate}</span> : null}
                  <span>{progress.completed}/{progress.total} complete</span>
                  <span>{progress.percent}%</span>
                </div>
              </div>
              <div className="roadmap-row-cell" style={{ gridColumn: `span ${months}`, position: "relative", height: laneItems.length > 0 ? Math.max(104, laneItems.length * ROADMAP_ITEM_HEIGHT + 16) : 64, padding: 0 }}>
                {laneItems.length === 0 ? <span className="text-xs text-muted" style={{ padding: 8 }}>-</span> : null}
                {laneItems.map((item, idx) => {
                  const status = bundle.core.statuses.find((s) => s.id === item.statusId);
                  const relationshipSummary = relationshipsForItem(bundle.core.relationships, item.id);
                  return (
                    <RoadmapBar
                      key={item.id}
                      item={item}
                      statusCategory={status?.category ?? "planned"}
                      timelineStartDate={startDate}
                      timelineDays={totalDays}
                      top={8 + idx * ROADMAP_ITEM_HEIGHT}
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
  timelineStartDate,
  timelineDays,
  top,
  milestones,
  blockedByCount,
  blocksCount,
  onChange,
  onMilestoneChange
}: {
  item: WorkItem;
  statusCategory: "planned" | "active" | "completed" | "canceled";
  timelineStartDate: string;
  timelineDays: number;
  top: number;
  milestones: Milestone[];
  blockedByCount: number;
  blocksCount: number;
  onChange: (start: string, due: string) => void;
  onMilestoneChange: (milestoneId: string) => void;
}) {
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [previewDayShift, setPreviewDayShift] = useState(0);
  const dragRef = useRef<{
    mode: DragMode;
    pointerId: number;
    originX: number;
    timelineWidth: number;
    start: string;
    due: string;
    hadStart: boolean;
    hadDue: boolean;
    dayShift: number;
    bar: HTMLElement;
  } | null>(null);

  const startDrag = (mode: DragMode) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const bar = event.currentTarget.closest<HTMLElement>(".roadmap-bar");
    const timelineWidth = bar?.parentElement?.getBoundingClientRect().width ?? 0;
    if (!bar || timelineWidth <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    const start = item.startDate ?? item.dueDate!;
    const due = item.dueDate ?? item.startDate!;
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      timelineWidth,
      start,
      due,
      hadStart: Boolean(item.startDate),
      hadDue: Boolean(item.dueDate),
      dayShift: 0,
      bar
    };
    bar.setPointerCapture?.(event.pointerId);
    setDragging(mode);
    setPreviewDayShift(0);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const rawDayShift = Math.round(((event.clientX - drag.originX) / drag.timelineWidth) * timelineDays);
    const minimumResizeShift = -daysBetween(drag.start, drag.due);
    const dayShift = drag.mode === "resize"
      ? Math.max(rawDayShift, minimumResizeShift)
      : rawDayShift;
    if (dayShift === drag.dayShift) return;

    drag.dayShift = dayShift;
    setPreviewDayShift(dayShift);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;

    if (drag.bar.hasPointerCapture?.(drag.pointerId)) {
      drag.bar.releasePointerCapture?.(drag.pointerId);
    }

    if (commit && drag.dayShift !== 0) {
      if (drag.mode === "resize") {
        onChange(drag.start, shiftDate(drag.due, drag.dayShift));
      } else {
        onChange(
          drag.hadStart ? shiftDate(drag.start, drag.dayShift) : "",
          drag.hadDue ? shiftDate(drag.due, drag.dayShift) : ""
        );
      }
    }

    setDragging(null);
    setPreviewDayShift(0);
  };

  const baseStart = item.startDate ?? item.dueDate!;
  const baseDue = item.dueDate ?? item.startDate!;
  const displayStart = dragging === "move" ? shiftDate(baseStart, previewDayShift) : baseStart;
  const displayDue = dragging ? shiftDate(baseDue, previewDayShift) : baseDue;
  const geometry = getTimelineGeometry(displayStart, displayDue, timelineStartDate, timelineDays);

  return (
    <div className="roadmap-item" style={{ top }}>
      <div
        aria-label={`${item.title} timeline from ${displayStart} to ${displayDue}`}
        aria-roledescription="roadmap item"
        className="roadmap-bar"
        data-dragging={dragging ?? undefined}
        data-due-date={displayDue}
        data-start-date={displayStart}
        data-status={statusCategory}
        data-total-days={timelineDays}
        role="group"
        style={{
          left: `${geometry.leftPercent}%`,
          visibility: geometry.visible ? "visible" : "hidden",
          width: `${geometry.widthPercent}%`
        }}
        onPointerDown={startDrag("move")}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishDrag(event, true)}
        onPointerCancel={(event) => finishDrag(event, false)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        title={`${displayStart} -> ${displayDue}`}
      >
        <span className="roadmap-bar-label">{item.title}</span>
        <button
          type="button"
          className="roadmap-resize-handle"
          onPointerDown={startDrag("resize")}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            event.stopPropagation();
            const dayDelta = (event.shiftKey ? 7 : 1) * (event.key === "ArrowRight" ? 1 : -1);
            const startDate = item.startDate ?? item.dueDate ?? "";
            const dueDate = item.dueDate ?? item.startDate ?? "";
            if (startDate && dueDate) onChange(startDate, shiftDate(dueDate, dayDelta));
          }}
          aria-label={`Adjust due date for ${item.title}`}
          title="Drag to resize. Use Left and Right arrow keys for precise changes; hold Shift for one week."
        >
          <GripVertical aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="roadmap-bar-controls">
        <Link className="roadmap-item-link" to={`/item/${item.id}`}>{item.title}</Link>
        <div className="roadmap-bar-badges">
          {blockedByCount > 0 ? <MetadataBadge tone="danger">Blocked by {blockedByCount}</MetadataBadge> : null}
          {blocksCount > 0 ? <MetadataBadge>Blocks {blocksCount}</MetadataBadge> : null}
        </div>
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
            {milestones.filter((milestone) => !milestone.archived || milestone.id === item.milestoneId).map((milestone) => (
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

function daysBetween(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  return Math.round((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY);
}

function getTimelineGeometry(start: string, due: string, timelineStart: string, timelineDays: number) {
  const rawStartDay = daysBetween(timelineStart, start);
  const rawEndDay = daysBetween(timelineStart, due) + 1;
  const visibleStartDay = Math.max(0, Math.min(timelineDays, rawStartDay));
  const visibleEndDay = Math.max(0, Math.min(timelineDays, rawEndDay));
  return {
    leftPercent: (visibleStartDay / timelineDays) * 100,
    visible: visibleEndDay > visibleStartDay,
    widthPercent: (Math.max(0, visibleEndDay - visibleStartDay) / timelineDays) * 100
  };
}
