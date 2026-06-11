import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkItem, StatusDefinition, PriorityDefinition, Label } from "@gph/core";
import { getBugData } from "@gph/core";

export function ItemCard({
  item,
  statuses,
  priorities,
  labels,
  dragging,
  onDragStart,
  onDragEnd
}: {
  item: WorkItem;
  statuses: StatusDefinition[];
  priorities: PriorityDefinition[];
  labels: Label[];
  dragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const navigate = useNavigate();
  const status = statuses.find((s) => s.id === item.statusId);
  const priority = priorities.find((p) => p.id === item.priorityId);
  const itemLabels = item.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const bugData = getBugData(item);
  const severityRank = bugData ? bugData.severityId : null;
  const isOverdue = item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div
      className="board-card"
      draggable
      data-dragging={dragging}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="link"
      tabIndex={0}
      onClick={() => {
        if (!dragging) navigate(`/item/${item.id}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !dragging) {
          event.preventDefault();
          navigate(`/item/${item.id}`);
        }
      }}
    >
      <div className="board-card-title">
        {item.title}
      </div>
      <div className="board-card-labels">
        {itemLabels.map((l) => (
          <span key={l.id} className="board-card-label" style={{ background: l.color ? colorForLabel(l.color) : "var(--color-accent-soft)" }}>
            {l.name}
          </span>
        ))}
      </div>
      <div className="board-card-meta">
        {status && <span className="board-card-badge" data-kind={`status-${status.category}`}>{status.name}</span>}
        {priority && (
          <span className="board-card-badge" data-kind={`priority-${priority.id}`}>
            {priority.name}
          </span>
        )}
        {severityRank && (
          <span className="board-card-badge" data-kind="severity">{bugData?.severityId}</span>
        )}
        {item.dueDate && (
          <span className="board-card-badge" data-kind="due" title="Due date">{item.dueDate}</span>
        )}
        {isOverdue && <span className="board-card-badge" data-kind="due" style={{ background: "var(--color-bg-status-blocked)" }}>Overdue</span>}
      </div>
    </div>
  );
}

function colorForLabel(c: string): string {
  // Accepts semantic color name or hex. Returns a CSS background color string.
  const palette: Record<string, string> = {
    blue: "rgba(91, 144, 191, 0.18)",
    green: "rgba(79, 138, 85, 0.18)",
    orange: "rgba(210, 138, 58, 0.20)",
    red: "rgba(177, 58, 58, 0.20)",
    purple: "rgba(125, 95, 168, 0.18)",
    yellow: "rgba(210, 180, 58, 0.20)"
  };
  return palette[c] ?? c;
}
