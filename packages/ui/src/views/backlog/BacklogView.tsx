import { useState } from "react";
import { Link } from "react-router-dom";
import { comparePriority, type WorkItem } from "@gph/core";
import { Button, EmptyState, MetadataBadge, ViewToolbar } from "../../components";
import { openCreateItem } from "../../commands/palette-bus";
import { useProjectStore } from "../../store/project-store";

export function BacklogView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [editing, setEditing] = useState<string | null>(null);

  if (!bundle) return null;
  const { priorities, statuses, milestones } = bundle.core;
  const items = bundle.core.items.filter(
    (item) => !item.trashedAt && !item.archived && item.parentId == null
  );

  const sorted = [...items].sort((a, b) =>
    comparePriority(a.priorityId, b.priorityId, priorities)
  );

  const setPriority = (item: WorkItem, priorityId: string | null) => {
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { priorityId }
    });
    setEditing(null);
  };

  return (
    <div className="backlog-view">
      <ViewToolbar>
        <Button variant="primary" size="sm" onClick={() => openCreateItem()}>
          New item
        </Button>
        <span className="text-xs text-muted">{sorted.length} active items</span>
      </ViewToolbar>
      <div className="backlog" role="region" aria-label="Backlog view">
        {sorted.length === 0 ? (
          <EmptyState
            title="Backlog is empty"
            description="Add new items with the C shortcut or the New item button."
            actions={
              <Button variant="primary" onClick={() => openCreateItem()}>
                New item
              </Button>
            }
          />
        ) : null}
        {sorted.map((item) => {
          const status = statuses.find((s) => s.id === item.statusId);
          const priority = priorities.find((p) => p.id === item.priorityId);
          const milestone = milestones.find((m) => m.id === item.milestoneId);
          return (
            <div key={item.id} className="backlog-row gph-work-row">
              <span className="text-muted text-xs">#{item.id.slice(-4)}</span>
              <Link
                to={`/item/${item.id}`}
                className="backlog-row-title gph-work-row-title"
              >
                {item.title}
              </Link>
              <span className="text-xs text-secondary">{status?.name}</span>
              <span
                className="text-xs"
                onClick={() => setEditing(item.id)}
                style={{ cursor: "pointer" }}
              >
                {editing === item.id ? (
                  <select
                    className="select"
                    defaultValue={item.priorityId ?? ""}
                    onChange={(event) =>
                      setPriority(item, event.target.value || null)
                    }
                    onBlur={() => setEditing(null)}
                    autoFocus
                  >
                    <option value="">No priority</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <MetadataBadge tone={priority ? "info" : "neutral"}>
                    {priority?.name ?? "None"}
                  </MetadataBadge>
                )}
              </span>
              <span className="text-xs text-muted">{milestone?.name ?? ""}</span>
              <span className="text-xs">{item.dueDate ?? ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
