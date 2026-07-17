import { useRef, type DragEvent } from "react";
import { Link } from "react-router-dom";
import type { WorkItem, StatusDefinition, PriorityDefinition, Label } from "@gph/core";
import { getBugData } from "@gph/core";
import { MetadataBadge, WorkItemCard } from "../../components";

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
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const suppressLinkClick = useRef(false);
  const status = statuses.find((s) => s.id === item.statusId);
  const priority = priorities.find((p) => p.id === item.priorityId);
  const itemLabels = item.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const bugData = getBugData(item);
  const severityRank = bugData ? bugData.severityId : null;

  return (
    <Link
      to={`/item/${item.id}`}
      aria-label={item.title}
      className="board-card"
      draggable
      data-dragging={dragging}
      onDragStart={(event) => {
        suppressLinkClick.current = true;
        onDragStart(event);
      }}
      onDragEnd={() => {
        onDragEnd();
        // Clear the drag guard after any synthetic post-drag click has had a chance to fire.
        window.setTimeout(() => {
          suppressLinkClick.current = false;
        }, 0);
      }}
      onClick={(event) => {
        if (dragging || suppressLinkClick.current) {
          event.preventDefault();
          suppressLinkClick.current = false;
        }
      }}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      <WorkItemCard
        item={item}
        status={status}
        priority={priority}
        labels={itemLabels}
      />
      {severityRank ? (
        <div className="board-card-meta">
          {severityRank && (
            <MetadataBadge tone="warning">{bugData?.severityId}</MetadataBadge>
          )}
        </div>
      ) : null}
    </Link>
  );
}
