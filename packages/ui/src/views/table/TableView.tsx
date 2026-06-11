import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { comparePriority, type WorkItem, type StatusDefinition, type PriorityDefinition, type WorkItemTypeDefinition, type Label } from "@gph/core";

type SortKey = "title" | "status" | "priority" | "type" | "due" | "updated";

type Row = {
  item: WorkItem;
  status?: StatusDefinition;
  priority?: PriorityDefinition;
  type?: WorkItemTypeDefinition;
  labels: Label[];
};

export function TableView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const rows: Row[] = useMemo(() => {
    if (!bundle) return [];
    const out: Row[] = [];
    const q = filterText.toLowerCase();
    for (const item of bundle.core.items) {
      if (item.trashedAt || item.archived) continue;
      if (typeFilter && item.typeId !== typeFilter) continue;
      if (q && !item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) continue;
      out.push({
        item,
        status: bundle.core.statuses.find((s) => s.id === item.statusId),
        priority: bundle.core.priorities.find((p) => p.id === item.priorityId),
        type: bundle.core.itemTypes.find((t) => t.id === item.typeId),
        labels: item.labelIds.map((id) => bundle.core.labels.find((l) => l.id === id)).filter(Boolean) as Label[]
      });
    }
    out.sort((a, b) => {
      let v = 0;
      switch (sortKey) {
        case "title":
          v = a.item.title.localeCompare(b.item.title);
          break;
        case "status":
          v = (a.status?.order ?? 0) - (b.status?.order ?? 0);
          break;
        case "priority":
          v = comparePriority(a.item.priorityId, b.item.priorityId, bundle.core.priorities);
          break;
        case "type":
          v = (a.type?.order ?? 0) - (b.type?.order ?? 0);
          break;
        case "due":
          v = (a.item.dueDate ?? "9999").localeCompare(b.item.dueDate ?? "9999");
          break;
        case "updated":
          v = b.item.updatedAt.localeCompare(a.item.updatedAt);
          break;
      }
      return sortDir === "asc" ? v : -v;
    });
    return out;
  }, [bundle, sortKey, sortDir, filterText, typeFilter]);

  if (!bundle) return null;

  const headerClick = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const indicator = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="table-wrap">
      <div className="row" style={{ marginBottom: 8 }}>
        <input className="input" placeholder="Filter…" value={filterText} onChange={(e) => setFilterText(e.target.value)} style={{ maxWidth: 240 }} />
        <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All types</option>
          {bundle.core.itemTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <table className="table" role="grid" aria-label="Work items table">
        <thead>
          <tr>
            <th onClick={() => headerClick("title")} style={{ cursor: "pointer" }}>Title{indicator("title")}</th>
            <th onClick={() => headerClick("type")} style={{ cursor: "pointer" }}>Type{indicator("type")}</th>
            <th onClick={() => headerClick("status")} style={{ cursor: "pointer" }}>Status{indicator("status")}</th>
            <th onClick={() => headerClick("priority")} style={{ cursor: "pointer" }}>Priority{indicator("priority")}</th>
            <th>Assignee</th>
            <th>Labels</th>
            <th onClick={() => headerClick("due")} style={{ cursor: "pointer" }}>Due{indicator("due")}</th>
            <th onClick={() => headerClick("updated")} style={{ cursor: "pointer" }}>Updated{indicator("updated")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="empty">No items match</td></tr>
          )}
          {rows.map(({ item, status, priority, type, labels }) => {
            const member = bundle.core.members.find((m) => m.id === item.assigneeId);
            return (
              <tr key={item.id}>
                <td>
                  <Link to={`/item/${item.id}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}>
                    {item.title}
                  </Link>
                </td>
                <td><span className="tag">{type?.name}</span></td>
                <td>{status?.name}</td>
                <td>{priority?.name ?? "—"}</td>
                <td>{member?.displayName ?? "—"}</td>
                <td>
                  <div className="board-card-labels">
                    {labels.map((l) => <span key={l.id} className="board-card-label">{l.name}</span>)}
                  </div>
                </td>
                <td>{item.dueDate ?? "—"}</td>
                <td className="text-xs text-muted">{new Date(item.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
