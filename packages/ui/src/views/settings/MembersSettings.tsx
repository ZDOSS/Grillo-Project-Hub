import { useEffect, useState } from "react";
import type { Member } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { ColorSelect, EditIcon, SettingsPanelHeader } from "./settings-shared";

export function MembersSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [memberName, setMemberName] = useState("");

  if (!bundle) return null;

  return (
    <div className="settings-panel-stack settings-panel-wide">
      <SettingsPanelHeader
        title="Members"
        description="Manage project-local people and keep assignment cleanup explicit when a member is removed."
      />
      <div className="settings-grid settings-grid-add">
        <input className="input" placeholder="Display name" value={memberName} onChange={(event) => setMemberName(event.target.value)} />
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!memberName.trim()) return;
            applyCommand({ type: "member.create", projectId: bundle.project.id, displayName: memberName.trim() });
            setMemberName("");
          }}
        >
          Add member
        </button>
      </div>
      <div className="settings-table">
        <div className="settings-table-header">
          <span>Name</span>
          <span>Workload</span>
          <span>Actions</span>
        </div>
        {bundle.core.members.filter((member) => !member.archived).map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [displayName, setDisplayName] = useState(member.displayName);
  const [color, setColor] = useState(member.color ?? "");
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const assignedItems = bundle.core.items.filter((item) => item.assigneeId === member.id && !item.trashedAt);
  const openAssigned = assignedItems.filter((item) => bundle.core.statuses.find((status) => status.id === item.statusId)?.category !== "completed");

  useEffect(() => {
    setDisplayName(member.displayName);
    setColor(member.color ?? "");
    setEditing(false);
    setConfirmingRemove(false);
  }, [member.id, member.displayName, member.color, member.archived]);

  const save = () => {
    applyCommand({
      type: "member.update",
      projectId: bundle.project.id,
      memberId: member.id,
      patch: { displayName: displayName.trim() || member.displayName, color: color || null }
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDisplayName(member.displayName);
    setColor(member.color ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-member">
      <div className="settings-row-field">
        {editing ? (
          <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        ) : (
          <strong>{member.displayName}</strong>
        )}
        <span className="text-xs text-muted">#{member.id.slice(-6)}</span>
      </div>
      <div className="settings-row-field">
        <span className="tag tag-info">{assignedItems.length} assigned</span>
        <span className="tag">{openAssigned.length} active</span>
      </div>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${member.displayName}`} />
            <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <>
            <span className="tag">{member.color ?? "No color"}</span>
            <button className="btn btn-sm" onClick={() => setEditing(true)}>
              <EditIcon /> Edit
            </button>
          </>
        )}
        {confirmingRemove ? (
          <>
            <span className="text-xs text-muted">
              Remove {member.displayName} from this project? Assigned items will become unassigned.
            </span>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                applyCommand({ type: "member.delete", projectId: bundle.project.id, memberId: member.id });
                setConfirmingRemove(false);
              }}
            >
              Confirm remove
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmingRemove(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn btn-sm btn-danger" onClick={() => setConfirmingRemove(true)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
