import { useEffect, useState } from "react";
import type { PriorityDefinition, StatusDefinition, WorkItemTypeDefinition } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { ColorSelect, EditIcon, SettingsPanelHeader, SettingsSectionCard } from "./settings-shared";

export function WorkflowSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [statusName, setStatusName] = useState("");
  const [statusCategory, setStatusCategory] = useState<"planned" | "active" | "completed" | "canceled">("planned");
  const [priorityName, setPriorityName] = useState("");
  const [priorityRank, setPriorityRank] = useState(150);
  const [typeName, setTypeName] = useState("");

  if (!bundle) return null;

  const bugsModule = bundle.modules["builtin.bugs"];
  const requireSeverityOrPriority = bugsModule?.config?.requireSeverityOrPriority === true;

  return (
    <div className="settings-panel-stack settings-panel-wide">
      <SettingsPanelHeader
        title="Workflow"
        description="Configure the status, priority, type, and intake guardrails that shape work across board, backlog, table, roadmap, bug triage, and automation."
      />

      <SettingsSectionCard
        title="Workflow guardrails"
        description="Keep lightweight rules close to the workflow they protect."
      >
        <label className="workspace-source">
          <span className="row" style={{ alignItems: "center" }}>
            <input
              type="checkbox"
              aria-label="Require severity or priority before bugs leave intake"
              checked={requireSeverityOrPriority}
              onChange={(event) => applyCommand({
                type: "bugTriage.updateConfig",
                projectId: bundle.project.id,
                patch: { requireSeverityOrPriority: event.target.checked }
              })}
            />
            <strong>Require severity or priority before bugs leave intake</strong>
          </span>
          <span className="text-sm text-secondary">
            Intake bugs can still be created quickly, but accepting or declining them requires one useful triage signal.
          </span>
        </label>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Workflow statuses"
        description="Statuses map flexible project language onto stable planned, active, completed, and canceled categories."
      >
        <div className="settings-grid settings-grid-add settings-grid-status">
          <input className="input" placeholder="Name" value={statusName} onChange={(event) => setStatusName(event.target.value)} />
          <select className="select" value={statusCategory} onChange={(event) => setStatusCategory(event.target.value as typeof statusCategory)}>
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
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Priorities"
        description="Priority rank drives sorting across dense planning views. Higher rank means more urgent."
      >
        <div className="settings-grid settings-grid-add settings-grid-priority">
          <input className="input" placeholder="Name" value={priorityName} onChange={(event) => setPriorityName(event.target.value)} />
          <input className="input" type="number" placeholder="Rank" value={priorityRank} onChange={(event) => setPriorityRank(Number(event.target.value))} />
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
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Work item types"
        description="Types carry default status and priority choices into item creation flows."
      >
        <div className="settings-grid settings-grid-add settings-grid-type-add">
          <input className="input" placeholder="Type name" value={typeName} onChange={(event) => setTypeName(event.target.value)} />
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
      </SettingsSectionCard>
    </div>
  );
}

function StatusRow({ status }: { status: StatusDefinition }) {
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
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
      {editing ? <input className="input" value={name} onChange={(event) => setName(event.target.value)} /> : <strong>{status.name}</strong>}
      {editing ? (
        <select className="select" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      ) : (
        <span>{status.category}</span>
      )}
      {editing ? <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${status.name}`} /> : <span className="tag">{status.color ?? "No color"}</span>}
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
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
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
      {editing ? <input className="input" value={name} onChange={(event) => setName(event.target.value)} /> : <strong>{priority.name}</strong>}
      {editing ? <input className="input" type="number" value={rank} onChange={(event) => setRank(Number(event.target.value))} /> : <span>{priority.rank}</span>}
      {editing ? <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${priority.name}`} /> : <span className="tag">{priority.color ?? "No color"}</span>}
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
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
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
      {editing ? <input className="input" value={name} onChange={(event) => setName(event.target.value)} /> : <strong>{type.name}</strong>}
      {editing ? <input className="input" value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="Icon id" /> : <span>{type.icon ?? "No icon"}</span>}
      {editing ? <ColorSelect value={color} onChange={setColor} ariaLabel={`Color for ${type.name}`} /> : <span className="tag">{type.color ?? "No color"}</span>}
      {editing ? (
        <select className="select" value={defaultStatusId} onChange={(event) => setDefaultStatusId(event.target.value)}>
          <option value="">Default status</option>
          {bundle.core.statuses.filter((status) => !status.archived).map((status) => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
      ) : (
        <span>{bundle.core.statuses.find((status) => status.id === type.defaultStatusId)?.name ?? "No default"}</span>
      )}
      {editing ? (
        <select className="select" value={defaultPriorityId} onChange={(event) => setDefaultPriorityId(event.target.value)}>
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
