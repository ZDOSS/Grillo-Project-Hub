import { Link } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { comparePriority, type PriorityDefinition, type WorkItem } from "@gph/core";
import { useState } from "react";

export function BacklogView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [editing, setEditing] = useState<string | null>(null);

  if (!bundle) return null;
  const { priorities, statuses, labels, milestones } = bundle.core;
  const items = bundle.core.items.filter((i) => !i.trashedAt && !i.archived && i.parentId == null);

  const sorted = [...items].sort((a, b) => comparePriority(a.priorityId, b.priorityId, priorities));

  const setPriority = (item: WorkItem, priorityId: string | null) => {
    applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch: { priorityId } });
    setEditing(null);
  };

  return (
    <div className="backlog" role="region" aria-label="Backlog view">
      {sorted.length === 0 && (
        <div className="empty">
          <div className="empty-title">Backlog is empty</div>
          <div>Add new items with the “C” shortcut or the + button.</div>
        </div>
      )}
      {sorted.map((item) => {
        const status = statuses.find((s) => s.id === item.statusId);
        const priority = priorities.find((p) => p.id === item.priorityId);
        const itemLabels = item.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean);
        const milestone = milestones.find((m) => m.id === item.milestoneId);
        return (
          <div key={item.id} className="backlog-row">
            <span className="text-muted text-xs">#{item.id.slice(-4)}</span>
            <Link to={`/item/${item.id}`} className="backlog-row-title" style={{ color: "inherit" }}>
              {item.title}
            </Link>
            <span className="text-xs text-secondary">{status?.name}</span>
            <span className="text-xs" onClick={() => setEditing(item.id)} style={{ cursor: "pointer" }}>
              {editing === item.id ? (
                <select className="select" defaultValue={item.priorityId ?? ""} onChange={(e) => setPriority(item, e.target.value || null)} onBlur={() => setEditing(null)} autoFocus>
                  <option value="">No priority</option>
                  {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <span className="tag">{priority?.name ?? "—"}</span>
              )}
            </span>
            <span className="text-xs text-muted">{milestone?.name ?? ""}</span>
            <span className="text-xs">{item.dueDate ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
