import { useEffect, useState } from "react";
import type { Label, Milestone } from "@gph/core";
import { colorForLabel } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { ColorSelect, EditIcon, SettingsPanelHeader, SettingsSectionCard } from "./settings-shared";

export function LabelsMilestonesSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [labelDescription, setLabelDescription] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");

  if (!bundle) return null;

  return (
    <div className="settings-panel-stack settings-panel-wide">
      <SettingsPanelHeader
        title="Labels & milestones"
        description="Create, edit, hide, and restore the classification and release containers used across the project."
      />
      <SettingsSectionCard title="Labels" description="Hidden labels stay on existing work but disappear from new assignments.">
        <div className="settings-grid settings-grid-add settings-grid-label-add">
          <input className="input" aria-label="Label name" placeholder="Label name" value={labelName} onChange={(event) => setLabelName(event.target.value)} />
          <ColorSelect ariaLabel="Label color" value={labelColor} onChange={setLabelColor} />
          <input className="input" aria-label="Label description" placeholder="Description (optional)" value={labelDescription} onChange={(event) => setLabelDescription(event.target.value)} />
          <button
            className="btn btn-primary"
            disabled={!labelName.trim()}
            onClick={() => {
              applyCommand({
                type: "label.create",
                projectId: bundle.project.id,
                name: labelName.trim(),
                color: labelColor || null,
                description: labelDescription.trim() || null
              });
              setLabelName("");
              setLabelDescription("");
            }}
          >
            Add label
          </button>
        </div>
        <div className="settings-table">
          <div className="settings-table-header settings-table-header-label">
            <span>Label</span>
            <span>Description</span>
            <span>State</span>
            <span>Actions</span>
          </div>
          {bundle.core.labels.length === 0 ? <div className="settings-table-empty">No labels yet.</div> : null}
          {bundle.core.labels.map((label) => <LabelRow key={label.id} label={label} />)}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Milestones" description="Hidden milestones keep their item history without appearing in new assignments.">
        <div className="settings-grid settings-grid-add settings-grid-milestone-add">
          <input className="input" aria-label="Milestone name" placeholder="Milestone name" value={milestoneName} onChange={(event) => setMilestoneName(event.target.value)} />
          <input className="input" aria-label="Milestone target date" type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} />
          <input className="input" aria-label="Milestone description" placeholder="Description (optional)" value={milestoneDescription} onChange={(event) => setMilestoneDescription(event.target.value)} />
          <button
            className="btn btn-primary"
            disabled={!milestoneName.trim()}
            onClick={() => {
              applyCommand({
                type: "milestone.create",
                projectId: bundle.project.id,
                name: milestoneName.trim(),
                targetDate: milestoneDate || null,
                description: milestoneDescription.trim() || undefined
              });
              setMilestoneName("");
              setMilestoneDate("");
              setMilestoneDescription("");
            }}
          >
            Add milestone
          </button>
        </div>
        <div className="settings-table">
          <div className="settings-table-header settings-table-header-milestone">
            <span>Milestone</span>
            <span>Target</span>
            <span>Progress</span>
            <span>State</span>
            <span>Actions</span>
          </div>
          {bundle.core.milestones.length === 0 ? <div className="settings-table-empty">No milestones yet.</div> : null}
          {bundle.core.milestones.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)}
        </div>
      </SettingsSectionCard>
    </div>
  );
}

function LabelRow({ label }: { label: Label }) {
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color ?? "");
  const [description, setDescription] = useState(label.description ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setName(label.name);
    setColor(label.color ?? "");
    setDescription(label.description ?? "");
    setEditing(false);
  }, [label.id, label.name, label.color, label.description, label.archived]);

  const cancel = () => {
    setName(label.name);
    setColor(label.color ?? "");
    setDescription(label.description ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-label">
      {editing ? (
        <div className="settings-row-field">
          <input className="input" aria-label={`Name for ${label.name}`} value={name} onChange={(event) => setName(event.target.value)} />
          <ColorSelect ariaLabel={`Color for ${label.name}`} value={color} onChange={setColor} />
        </div>
      ) : (
        <span className="board-card-label" style={{ background: label.color ? colorForLabel(label.color) : "var(--color-bg-muted)" }}>{label.name}</span>
      )}
      {editing ? (
        <input className="input" aria-label={`Description for ${label.name}`} value={description} onChange={(event) => setDescription(event.target.value)} />
      ) : (
        <span className="text-sm text-secondary">{label.description || "No description"}</span>
      )}
      <span className={`tag ${label.archived ? "tag-warn" : "tag-ok"}`}>{label.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                applyCommand({
                  type: "label.update",
                  projectId: bundle.project.id,
                  labelId: label.id,
                  patch: { name: name.trim(), color: color || null, description: description.trim() || null }
                });
                setEditing(false);
              }}
            >
              Save
            </button>
            <button className="btn btn-sm" onClick={cancel}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" aria-label={`Edit ${label.name}`} onClick={() => setEditing(true)}><EditIcon /> Edit</button>
        )}
        <button
          className="btn btn-sm"
          aria-label={`${label.archived ? "Restore" : "Hide"} ${label.name}`}
          onClick={() => applyCommand({
            type: "label.update",
            projectId: bundle.project.id,
            labelId: label.id,
            patch: { archived: !label.archived }
          })}
        >
          {label.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [name, setName] = useState(milestone.name);
  const [targetDate, setTargetDate] = useState(milestone.targetDate ?? "");
  const [description, setDescription] = useState(milestone.description ?? "");
  const [editing, setEditing] = useState(false);
  const items = bundle.core.items.filter((item) => item.milestoneId === milestone.id && !item.trashedAt);
  const done = items.filter((item) => bundle.core.statuses.find((status) => status.id === item.statusId)?.category === "completed").length;

  useEffect(() => {
    setName(milestone.name);
    setTargetDate(milestone.targetDate ?? "");
    setDescription(milestone.description ?? "");
    setEditing(false);
  }, [milestone.id, milestone.name, milestone.targetDate, milestone.description, milestone.archived]);

  const cancel = () => {
    setName(milestone.name);
    setTargetDate(milestone.targetDate ?? "");
    setDescription(milestone.description ?? "");
    setEditing(false);
  };

  return (
    <div className="settings-table-row settings-table-row-milestone">
      <div className="settings-row-field">
        {editing ? <input className="input" aria-label={`Name for ${milestone.name}`} value={name} onChange={(event) => setName(event.target.value)} /> : <strong>{milestone.name}</strong>}
        {editing ? (
          <input className="input" aria-label={`Description for ${milestone.name}`} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
        ) : milestone.description ? <span className="text-xs text-muted">{milestone.description}</span> : null}
      </div>
      {editing ? (
        <input className="input" aria-label={`Target date for ${milestone.name}`} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
      ) : <span>{milestone.targetDate ?? "No target"}</span>}
      <span>{done}/{items.length} complete</span>
      <span className={`tag ${milestone.archived ? "tag-warn" : "tag-ok"}`}>{milestone.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                applyCommand({
                  type: "milestone.update",
                  projectId: bundle.project.id,
                  milestoneId: milestone.id,
                  patch: { name: name.trim(), targetDate: targetDate || null, description: description.trim() || null }
                });
                setEditing(false);
              }}
            >
              Save
            </button>
            <button className="btn btn-sm" onClick={cancel}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" aria-label={`Edit ${milestone.name}`} onClick={() => setEditing(true)}><EditIcon /> Edit</button>
        )}
        <button
          className="btn btn-sm"
          aria-label={`${milestone.archived ? "Restore" : "Hide"} ${milestone.name}`}
          onClick={() => applyCommand({
            type: "milestone.update",
            projectId: bundle.project.id,
            milestoneId: milestone.id,
            patch: { archived: !milestone.archived }
          })}
        >
          {milestone.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}
