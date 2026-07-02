import type { Label, PriorityDefinition, StatusDefinition, WorkItem } from "@gph/core";
import { DueDateBadge, MetadataBadge } from "./work-metadata";

export function WorkItemCard({
  item,
  labels,
  priority,
  status
}: {
  item: WorkItem;
  labels: Label[];
  priority?: PriorityDefinition;
  status?: StatusDefinition;
}) {
  return (
    <article className="gph-work-card">
      <h3 className="gph-work-card-title">{item.title}</h3>
      {labels.length > 0 ? (
        <div className="gph-work-card-labels">
          {labels.map((label) => (
            <span
              key={label.id}
              className="board-card-label gph-label-chip"
              style={{
                background: label.color
                  ? colorForLabel(label.color)
                  : "var(--color-accent-soft)"
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="gph-work-card-meta">
        {status ? (
          <MetadataBadge
            tone={
              status.category === "completed"
                ? "success"
                : status.category === "canceled"
                  ? "warning"
                  : "neutral"
            }
          >
            {status.name}
          </MetadataBadge>
        ) : null}
        {priority ? <MetadataBadge tone="info">{priority.name}</MetadataBadge> : null}
        <DueDateBadge dueDate={item.dueDate} />
      </div>
    </article>
  );
}

function colorForLabel(color: string): string {
  const palette: Record<string, string> = {
    blue: "rgba(91, 144, 191, 0.18)",
    green: "rgba(79, 138, 85, 0.18)",
    orange: "rgba(210, 138, 58, 0.20)",
    purple: "rgba(125, 95, 168, 0.18)",
    red: "rgba(177, 58, 58, 0.20)",
    yellow: "rgba(210, 180, 58, 0.20)"
  };
  return palette[color] ?? color;
}
