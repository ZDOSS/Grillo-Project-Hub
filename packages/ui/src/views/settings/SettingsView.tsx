import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { exportProjectCsv, exportProjectJson, exportProjectMarkdown, importProjectJson, validateProjectBundle, type Member, type PriorityDefinition, type StatusDefinition, type WorkItemTypeDefinition } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { useTheme } from "../../theme/theme-provider";
import { PROJECT_NAV_ITEMS } from "../../nav-config";
import { InlineAlert } from "../../components";

const SIDEBAR_OPTIONS = PROJECT_NAV_ITEMS.map(({ id, label }) => ({ id, label }));
const COLOR_OPTIONS = [
  { value: "", label: "None" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "yellow", label: "Yellow" }
] as const;

type SettingsTab =
  | "general"
  | "sidebar"
  | "members"
  | "statuses"
  | "priorities"
  | "types"
  | "labels"
  | "milestones"
  | "fields"
  | "plugins"
  | "export"
  | "bridge";

function EditIcon() {
  return <Pencil size={14} aria-hidden="true" />;
}

function colorOptionsForValue(value: string) {
  if (!value || COLOR_OPTIONS.some((option) => option.value === value)) {
    return COLOR_OPTIONS;
  }
  return [...COLOR_OPTIONS, { value, label: value }] as const;
}

function ColorSelect({
  value,
  onChange,
  ariaLabel
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  return (
    <select className="select" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {colorOptionsForValue(value).map((option) => (
        <option key={option.value || "none"} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

/**
 * Settings view: editable registry tables for the project's shared configuration.
 */
export function SettingsView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<SettingsTab>("general");
  const [memberName, setMemberName] = useState("");
  const [statusName, setStatusName] = useState("");
  const [statusCategory, setStatusCategory] = useState<"planned" | "active" | "completed" | "canceled">("planned");
  const [priorityName, setPriorityName] = useState("");
  const [priorityRank, setPriorityRank] = useState(150);
  const [typeName, setTypeName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  if (!bundle) return null;

  return (
    <div style={{ padding: 16, flex: 1, overflow: "auto" }}>
      <h2>Settings</h2>
      <div className="row" role="tablist" aria-label="Settings sections" style={{ flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
        {([
          ["general", "General"],
          ["sidebar", "Left panel"],
          ["members", "Members"],
          ["statuses", "Statuses"],
          ["priorities", "Priorities"],
          ["types", "Work item types"],
          ["labels", "Labels"],
          ["milestones", "Milestones"],
          ["fields", "Custom fields"],
          ["plugins", "Plugins & trust"],
          ["export", "Export & import"],
          ["bridge", "AI bridge"]
        ] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`btn btn-sm ${tab === k ? "btn-primary" : ""}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="col" style={{ gap: 12, maxWidth: 720 }}>
          <label className="label label-row">
            Project name
            <input
              className="input"
              value={bundle.project.name}
              onChange={(e) => applyCommand({ type: "project.rename", projectId: bundle.project.id, name: e.target.value })}
            />
          </label>
          <label className="label label-row">
            Theme
            <select className="select" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="workspace-inline-note">
            {bundle.projectSettings.storageTrust === "folder"
              ? "This project is attached to a local folder and will auto-save there."
              : bundle.projectSettings.storageTrust === "browser"
              ? "This project is currently browser-local. Reopen it from the workspace recents, or export/import a bundle when moving machines."
              : "This project has not been saved yet."}
          </div>
          <div className="row">
            <span className="storage-badge" data-trust={bundle.projectSettings.storageTrust}>
              <span className="storage-dot" /> {bundle.projectSettings.storageTrust === "folder" ? "Folder-backed" : bundle.projectSettings.storageTrust === "browser" ? "Browser-local" : "Unsaved"}
            </span>
          </div>
        </div>
      )}

      {tab === "sidebar" && <SidebarTab />}

      {tab === "members" && (
        <div className="col" style={{ gap: 12, maxWidth: 920 }}>
          <div className="settings-grid settings-grid-add">
            <input className="input" placeholder="Display name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
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
      )}

      {tab === "statuses" && (
        <div className="col" style={{ gap: 12, maxWidth: 980 }}>
          <div className="settings-grid settings-grid-add settings-grid-status">
            <input className="input" placeholder="Name" value={statusName} onChange={(e) => setStatusName(e.target.value)} />
            <select className="select" value={statusCategory} onChange={(e) => setStatusCategory(e.target.value as "planned" | "active" | "completed" | "canceled")}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!statusName.trim()) return;
                applyCommand({ type: "status.create", projectId: bundle.project.id, name: statusName.trim(), category: statusCategory });
                setStatusName("");
              }}
            >
              Add status
            </button>
          </div>
          <div className="settings-table">
            <div className="settings-table-header settings-table-header-status">
              <span>Name</span>
              <span>Category</span>
              <span>Color</span>
              <span>State</span>
              <span>Actions</span>
            </div>
            {bundle.core.statuses.map((status) => (
              <StatusRow key={status.id} status={status} />
            ))}
          </div>
        </div>
      )}

      {tab === "priorities" && (
        <div className="col" style={{ gap: 12, maxWidth: 980 }}>
          <div className="settings-grid settings-grid-add settings-grid-priority">
            <input className="input" placeholder="Name" value={priorityName} onChange={(e) => setPriorityName(e.target.value)} />
            <input className="input" type="number" placeholder="Rank" value={priorityRank} onChange={(e) => setPriorityRank(Number(e.target.value))} />
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!priorityName.trim()) return;
                applyCommand({ type: "priority.create", projectId: bundle.project.id, name: priorityName.trim(), rank: priorityRank });
                setPriorityName("");
              }}
            >
              Add priority
            </button>
          </div>
          <div className="settings-table">
            <div className="settings-table-header settings-table-header-priority">
              <span>Name</span>
              <span>Rank</span>
              <span>Color</span>
              <span>State</span>
              <span>Actions</span>
            </div>
            {[...bundle.core.priorities].sort((a, b) => b.rank - a.rank).map((priority) => (
              <PriorityRow key={priority.id} priority={priority} />
            ))}
          </div>
        </div>
      )}

      {tab === "types" && (
        <div className="col" style={{ gap: 12, maxWidth: 1180 }}>
          <div className="settings-grid settings-grid-add settings-grid-type-add">
            <input className="input" placeholder="Type name" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!typeName.trim()) return;
                applyCommand({ type: "type.create", projectId: bundle.project.id, name: typeName.trim() });
                setTypeName("");
              }}
            >
              Add type
            </button>
          </div>
          <div className="settings-table">
            <div className="settings-table-header settings-table-header-type">
              <span>Name</span>
              <span>Icon</span>
              <span>Color</span>
              <span>Default status</span>
              <span>Default priority</span>
              <span>State</span>
              <span>Actions</span>
            </div>
            {bundle.core.itemTypes.map((type) => (
              <TypeRow key={type.id} type={type} />
            ))}
          </div>
        </div>
      )}

      {tab === "labels" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Label name" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
            <select className="select" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
              <option value="purple">Purple</option>
              <option value="yellow">Yellow</option>
            </select>
            <button className="btn btn-primary" onClick={() => {
              if (!labelName.trim()) return;
              applyCommand({ type: "label.create", projectId: bundle.project.id, name: labelName.trim(), color: labelColor });
              setLabelName("");
            }}>Add label</button>
          </div>
          {bundle.core.labels.map((l) => (
            <div key={l.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="row" style={{ gap: 6 }}><span className="board-card-label" style={{ background: l.color ?? "var(--color-bg-muted)" }}>{l.name}</span></span>
              <span className="text-xs text-muted">{l.description ?? ""}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "milestones" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Milestone name" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} />
            <input className="input" type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} />
            <button className="btn btn-primary" onClick={() => {
              if (!milestoneName.trim()) return;
              applyCommand({ type: "milestone.create", projectId: bundle.project.id, name: milestoneName.trim(), targetDate: milestoneDate || null });
              setMilestoneName(""); setMilestoneDate("");
            }}>Add milestone</button>
          </div>
          {bundle.core.milestones.map((m) => {
            const items = bundle.core.items.filter((i) => i.milestoneId === m.id && !i.trashedAt);
            const done = items.filter((i) => bundle.core.statuses.find((s) => s.id === i.statusId)?.category === "completed").length;
            return (
              <div key={m.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="col" style={{ gap: 2 }}>
                  <span>{m.name}</span>
                  <span className="text-xs text-muted">Target: {m.targetDate ?? "—"} · {done}/{items.length} complete</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "fields" && <CustomFieldsTab />}
      {tab === "plugins" && <PluginsTab />}
      {tab === "export" && <ExportPanel />}
      {tab === "bridge" && <BridgePanel />}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
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
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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

function StatusRow({ status }: { status: StatusDefinition }) {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState(status.name);
  const [category, setCategory] = useState(status.category);
  const [color, setColor] = useState(status.color ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setName(status.name);
    setCategory(status.category);
    setColor(status.color ?? "");
    setEditing(false);
  }, [status.id, status.name, status.category, status.color, status.archived]);

  const save = () => {
    applyCommand({
      type: "status.update",
      projectId: bundle.project.id,
      statusId: status.id,
      patch: { name: name.trim() || status.name, category, color: color || null }
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setName(status.name);
    setCategory(status.category);
    setColor(status.color ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-status">
      {editing ? (
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      ) : (
        <strong>{status.name}</strong>
      )}
      {editing ? (
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      ) : (
        <span>{status.category}</span>
      )}
      {editing ? (
        <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${status.name}`} />
      ) : (
        <span className="tag">{status.color ?? "No color"}</span>
      )}
      <span className={`tag ${status.archived ? "tag-warn" : "tag-ok"}`}>{status.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            <EditIcon /> Edit
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => applyCommand({
            type: "status.update",
            projectId: bundle.project.id,
            statusId: status.id,
            patch: { archived: !status.archived }
          })}
        >
          {status.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}

function PriorityRow({ priority }: { priority: PriorityDefinition }) {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState(priority.name);
  const [rank, setRank] = useState(priority.rank);
  const [color, setColor] = useState(priority.color ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setName(priority.name);
    setRank(priority.rank);
    setColor(priority.color ?? "");
    setEditing(false);
  }, [priority.id, priority.name, priority.rank, priority.color, priority.archived]);

  const save = () => {
    applyCommand({
      type: "priority.update",
      projectId: bundle.project.id,
      priorityId: priority.id,
      patch: { name: name.trim() || priority.name, rank, color: color || null }
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setName(priority.name);
    setRank(priority.rank);
    setColor(priority.color ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-priority">
      {editing ? (
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      ) : (
        <strong>{priority.name}</strong>
      )}
      {editing ? (
        <input className="input" type="number" value={rank} onChange={(e) => setRank(Number(e.target.value))} />
      ) : (
        <span>{priority.rank}</span>
      )}
      {editing ? (
        <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${priority.name}`} />
      ) : (
        <span className="tag">{priority.color ?? "No color"}</span>
      )}
      <span className={`tag ${priority.archived ? "tag-warn" : "tag-ok"}`}>{priority.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            <EditIcon /> Edit
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => applyCommand({
            type: "priority.update",
            projectId: bundle.project.id,
            priorityId: priority.id,
            patch: { archived: !priority.archived }
          })}
        >
          {priority.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}

function TypeRow({ type }: { type: WorkItemTypeDefinition }) {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState(type.name);
  const [icon, setIcon] = useState(type.icon ?? "");
  const [color, setColor] = useState(type.color ?? "");
  const [defaultStatusId, setDefaultStatusId] = useState(type.defaultStatusId ?? "");
  const [defaultPriorityId, setDefaultPriorityId] = useState(type.defaultPriorityId ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setName(type.name);
    setIcon(type.icon ?? "");
    setColor(type.color ?? "");
    setDefaultStatusId(type.defaultStatusId ?? "");
    setDefaultPriorityId(type.defaultPriorityId ?? "");
    setEditing(false);
  }, [type.id, type.name, type.icon, type.color, type.defaultStatusId, type.defaultPriorityId, type.archived]);

  const save = () => {
    applyCommand({
      type: "type.update",
      projectId: bundle.project.id,
      typeId: type.id,
      patch: {
        name: name.trim() || type.name,
        icon: icon || null,
        color: color || null,
        defaultStatusId: defaultStatusId || null,
        defaultPriorityId: defaultPriorityId || null
      }
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setName(type.name);
    setIcon(type.icon ?? "");
    setColor(type.color ?? "");
    setDefaultStatusId(type.defaultStatusId ?? "");
    setDefaultPriorityId(type.defaultPriorityId ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-type">
      {editing ? (
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      ) : (
        <strong>{type.name}</strong>
      )}
      {editing ? (
        <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon id" />
      ) : (
        <span>{type.icon ?? "No icon"}</span>
      )}
      {editing ? (
        <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${type.name}`} />
      ) : (
        <span className="tag">{type.color ?? "No color"}</span>
      )}
      {editing ? (
        <select className="select" value={defaultStatusId} onChange={(e) => setDefaultStatusId(e.target.value)}>
          <option value="">Default status</option>
          {bundle.core.statuses.filter((status) => !status.archived).map((status) => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
      ) : (
        <span>{bundle.core.statuses.find((status) => status.id === type.defaultStatusId)?.name ?? "No default"}</span>
      )}
      {editing ? (
        <select className="select" value={defaultPriorityId} onChange={(e) => setDefaultPriorityId(e.target.value)}>
          <option value="">Default priority</option>
          {bundle.core.priorities.filter((priority) => !priority.archived).map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.name}</option>
          ))}
        </select>
      ) : (
        <span>{bundle.core.priorities.find((priority) => priority.id === type.defaultPriorityId)?.name ?? "No default"}</span>
      )}
      <span className={`tag ${type.archived ? "tag-warn" : "tag-ok"}`}>{type.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            <EditIcon /> Edit
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={() => applyCommand({
            type: "type.update",
            projectId: bundle.project.id,
            typeId: type.id,
            patch: { archived: !type.archived }
          })}
        >
          {type.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}

function SidebarTab() {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const hiddenViewIds = bundle.projectSettings.hiddenViewIds ?? [];

  const toggleView = (viewId: string) => {
    const next = hiddenViewIds.includes(viewId)
      ? hiddenViewIds.filter((id) => id !== viewId)
      : [...hiddenViewIds, viewId];
    applyCommand({
      type: "project.updateSettings",
      projectId: bundle.project.id,
      patch: { hiddenViewIds: next }
    });
  };

  return (
    <div className="col" style={{ gap: 12, maxWidth: 760 }}>
      <p className="text-sm text-secondary" style={{ margin: 0 }}>
        Choose which built-in project views show up in the left panel and the view switcher. Hidden views stay in the project data; this only declutters navigation.
      </p>
      <div className="settings-table">
        <div className="settings-table-header">
          <span>View</span>
          <span>Visible</span>
          <span>Actions</span>
        </div>
        {SIDEBAR_OPTIONS.map((view) => {
          const visible = !hiddenViewIds.includes(view.id);
          return (
            <div key={view.id} className="settings-table-row settings-table-row-sidebar">
              <strong>{view.label}</strong>
              <span className={`tag ${visible ? "tag-ok" : "tag-warn"}`}>{visible ? "Shown" : "Hidden"}</span>
              <div className="settings-row-actions">
                <button className="btn btn-sm" onClick={() => toggleView(view.id)}>
                  {visible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PluginsTab() {
  const bundle = useProjectStore((s) => s.bundle)!;
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [trustMode, setTrustMode] = useState(bundle.projectSettings.pluginTrustMode);

  useEffect(() => {
    setTrustMode(bundle.projectSettings.pluginTrustMode);
  }, [bundle.projectSettings.pluginTrustMode]);

  const dirty = trustMode !== bundle.projectSettings.pluginTrustMode;

  return (
    <div className="col" style={{ gap: 12, maxWidth: 680 }}>
      <h3>Plugin trust mode</h3>
      <p className="text-sm text-secondary">
        These modes are project settings. The UI is now editable, but only first-party plugins are fully exercised in this MVP.
      </p>
      <div className="col" style={{ gap: 6 }}>
        {([
          ["first-party", "First-party only", "Safest option for local-first workspaces."],
          ["curated", "First-party + curated/signed", "Allows vetted plugins once package verification is available."],
          ["unrestricted", "Unrestricted local plugins", "Highest flexibility, highest risk. Intended for power users."]
        ] as const).map(([value, label, description]) => (
          <label key={value} className="workspace-source">
            <span className="row" style={{ alignItems: "center" }}>
              <input
                type="radio"
                name="trust"
                checked={trustMode === value}
                onChange={() => setTrustMode(value)}
              />
              <strong>{label}</strong>
            </span>
            <span className="text-sm text-secondary">{description}</span>
          </label>
        ))}
      </div>
      <div className="row">
        <button
          className="btn btn-primary"
          onClick={() => applyCommand({
            type: "project.updateSettings",
            projectId: bundle.project.id,
            patch: { pluginTrustMode: trustMode }
          })}
          disabled={!dirty}
        >
          Save
        </button>
        <button className="btn" onClick={() => setTrustMode(bundle.projectSettings.pluginTrustMode)} disabled={!dirty}>
          Cancel
        </button>
        {dirty ? <span className="tag tag-warn">Unsaved changes</span> : <span className="tag tag-ok">Saved</span>}
      </div>
    </div>
  );
}

function CustomFieldsTab() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "number" | "select" | "multi-select" | "date" | "checkbox">("text");
  const [options, setOptions] = useState("");
  if (!bundle) return null;
  return (
    <div className="col" style={{ gap: 8, maxWidth: 600 }}>
      <div className="row">
        <input className="input" placeholder="Field name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="select" value={type} onChange={(e) => setType(e.target.value as "text" | "number" | "select" | "multi-select" | "date" | "checkbox")}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="multi-select">Multi-select</option>
          <option value="date">Date</option>
          <option value="checkbox">Checkbox</option>
        </select>
        {(type === "select" || type === "multi-select") && (
          <input className="input" placeholder="Options (comma separated)" value={options} onChange={(e) => setOptions(e.target.value)} />
        )}
        <button className="btn btn-primary" onClick={() => {
          if (!name.trim()) return;
          const opts = (type === "select" || type === "multi-select") ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
          applyCommand({ type: "customField.define", projectId: bundle.project.id, field: { name: name.trim(), type, options: opts } });
          setName(""); setOptions("");
        }}>Add field</button>
      </div>
      {bundle.core.customFields.map((f) => (
        <div key={f.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className="col" style={{ gap: 2 }}>
            <span>{f.name}</span>
            <span className="text-xs text-muted">{f.type} {f.options ? `(${f.options.join(", ")})` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  const [importError, setImportError] = useState<string | null>(null);
  if (!bundle) return null;
  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <h3>Export</h3>
      <p className="text-sm text-secondary">Export the project as a portable, inspectable bundle.</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => download(`${bundle.project.name}.pms.json`, exportProjectJson(bundle), "application/json")}>JSON (.pms.json)</button>
        <button className="btn" onClick={() => download(`${bundle.project.name}.md`, exportProjectMarkdown(bundle), "text/markdown")}>Markdown</button>
        <button className="btn" onClick={() => download(`${bundle.project.name}.csv`, exportProjectCsv(bundle), "text/csv")}>CSV</button>
      </div>
      <h3 style={{ marginTop: 16 }}>Import</h3>
      <p className="text-sm text-secondary">Replace the current project with a previously exported <code>project.pms.json</code>.</p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          setImportError(null);
          try {
            const r = importProjectJson(text);
            validateProjectBundle(r.bundle);
            useProjectStore.getState().setBundle(r.bundle, { storageKey: null, storagePath: null, storageTrust: "browser" });
          } catch (err) {
            setImportError(`Import failed: ${(err as Error).message}`);
          }
        }}
      />
      {importError ? <InlineAlert tone="danger">{importError}</InlineAlert> : null}
    </div>
  );
}

function BridgePanel() {
  const snippet = JSON.stringify({
    name: "grillo-project-hub",
    type: "stdio",
    command: "gph-bridge",
    env: {
      GPH_PROJECT_PATH: "<absolute path to .pm-suite/project.pms.json>"
    }
  }, null, 2);
  return (
    <div className="col" style={{ gap: 8, maxWidth: 720 }}>
      <h3>AI bridge (MCP-compatible)</h3>
      <p className="text-sm text-secondary">
        The bridge exposes the validated command surface to local AI/MCP clients. It runs on your machine
        and never makes network calls outside your trusted environment. It is opt-in and disabled by default.
      </p>
      <h4>Setup</h4>
      <ol className="text-sm text-secondary" style={{ paddingLeft: 20 }}>
        <li>Install the bridge: <code>npm i -g @gph/bridge</code> (placeholder)</li>
        <li>Start the bridge against your project: <code>gph-bridge --project /path/to/.pm-suite</code></li>
        <li>Paste the snippet below into your MCP-compatible client config.</li>
      </ol>
      <h4>Sample MCP config</h4>
      <pre style={{ background: "var(--color-bg-muted)", padding: 12, borderRadius: 8, overflow: "auto" }}>{snippet}</pre>
      <h4>Permissions</h4>
      <ul className="text-sm text-secondary" style={{ paddingLeft: 20 }}>
        <li>read_project_data</li>
        <li>write_project_data</li>
        <li>search_project</li>
        <li>create_items, update_items, move_items</li>
        <li>create_docs, update_docs</li>
      </ul>
    </div>
  );
}
