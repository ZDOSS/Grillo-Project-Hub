import { Link } from "react-router-dom";
import { type ReactNode } from "react";
import type { PriorityDefinition, StatusDefinition, WorkItem } from "@gph/core";
import { DueDateBadge, MetadataBadge } from "./work-metadata";

export function WorkItemRow({
  children,
  className,
  item,
  priority,
  status,
  to
}: {
  children?: ReactNode;
  className?: string;
  item: WorkItem;
  priority?: PriorityDefinition;
  status?: StatusDefinition;
  to?: string;
}) {
  return (
    <div className={["gph-work-row", className].filter(Boolean).join(" ")}>
      <span className="text-muted text-xs">#{item.id.slice(-4)}</span>
      <Link to={to ?? `/item/${item.id}`} className="gph-work-row-title">
        {item.title}
      </Link>
      {status ? <MetadataBadge>{status.name}</MetadataBadge> : null}
      {priority ? <MetadataBadge tone="info">{priority.name}</MetadataBadge> : null}
      <DueDateBadge dueDate={item.dueDate} />
      {children}
    </div>
  );
}
