import { Link } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore } from "../../store/workspace-store";
import { useState } from "react";

/**
 * My Work view. A saved view filtered to the currently selected local member.
 */
export function MyWorkView() {
  const bundle = useProjectStore((s) => s.bundle);
  const localMemberId = useWorkspaceStore((s) => s.localMemberId);
  const setLocalMember = useWorkspaceStore((s) => s.setLocalMember);
  const [showSelector, setShowSelector] = useState(false);

  if (!bundle) return null;
  const me = bundle.core.members.find((m) => m.id === localMemberId);

  const items = me
    ? bundle.core.items.filter((i) => !i.trashedAt && !i.archived && i.assigneeId === me.id)
    : [];

  return (
    <div className="my-work">
      <div className="row-between">
        <h2>My Work</h2>
        <div className="row">
          <span className="text-xs text-muted">Local member:</span>
          <button className="btn btn-sm" onClick={() => setShowSelector((v) => !v)}>
            {me ? me.displayName : "Select…"}
          </button>
        </div>
      </div>
      {showSelector && (
        <div className="col" style={{ gap: 4, padding: 8, border: "1px solid var(--color-border-subtle)", borderRadius: 6 }}>
          {bundle.core.members.length === 0 ? (
            <div className="text-muted text-sm">No project members yet. Add one in Settings → Members.</div>
          ) : (
            bundle.core.members.map((m) => (
              <button key={m.id} className="btn btn-sm" onClick={() => { setLocalMember(m.id); setShowSelector(false); }}>
                {m.displayName}
              </button>
            ))
          )}
        </div>
      )}
      {!me && (
        <div className="empty">
          <div className="empty-title">Pick a local member</div>
          <div>Choose the team member you’re working as to see your assigned items.</div>
        </div>
      )}
      {me && items.length === 0 && (
        <div className="empty">
          <div className="empty-title">All clear</div>
          <div>No items assigned to {me.displayName}.</div>
        </div>
      )}
      {items.map((item) => (
        <Link key={item.id} to={`/item/${item.id}`} className="board-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="board-card-title">{item.title}</div>
          <div className="board-card-meta">
            <span className="board-card-badge" data-kind={`status-${bundle.core.statuses.find((s) => s.id === item.statusId)?.category ?? ""}`}>
              {bundle.core.statuses.find((s) => s.id === item.statusId)?.name}
            </span>
            {item.dueDate && <span className="board-card-badge" data-kind="due">{item.dueDate}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
