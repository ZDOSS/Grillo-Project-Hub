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

export function colorForLabel(color: string): string {
  const palette: Record<string, string> = {
    blue: "var(--color-label-blue)",
    green: "var(--color-label-green)",
    orange: "var(--color-label-orange)",
    purple: "var(--color-label-purple)",
    red: "var(--color-label-red)",
    yellow: "var(--color-label-yellow)"
  };
  return palette[color] ?? (/^#[0-9a-f]{3,8}$/i.test(color) ? color : "var(--color-accent-soft)");
}
