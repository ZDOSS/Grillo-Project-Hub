import { useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader, SettingsSectionCard } from "./settings-shared";

export function LabelsMilestonesSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  if (!bundle) return null;

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Labels & milestones"
        description="Keep lightweight classification and release containers close together without mixing them into workflow rules."
      />
      <SettingsSectionCard title="Labels">
        <div className="row settings-inline-form">
          <input className="input" placeholder="Label name" value={labelName} onChange={(event) => setLabelName(event.target.value)} />
          <select className="select" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} style={{ maxWidth: 140 }}>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="red">Red</option>
            <option value="purple">Purple</option>
            <option value="yellow">Yellow</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!labelName.trim()) return;
              applyCommand({ type: "label.create", projectId: bundle.project.id, name: labelName.trim(), color: labelColor });
              setLabelName("");
            }}
          >
            Add label
          </button>
        </div>
        {bundle.core.labels.map((label) => (
          <div key={label.id} className="settings-simple-row">
            <span className="row" style={{ gap: 6 }}>
              <span className="board-card-label" style={{ background: label.color ?? "var(--color-bg-muted)" }}>{label.name}</span>
            </span>
            <span className="text-xs text-muted">{label.description ?? ""}</span>
          </div>
        ))}
      </SettingsSectionCard>

      <SettingsSectionCard title="Milestones">
        <div className="row settings-inline-form">
          <input className="input" placeholder="Milestone name" value={milestoneName} onChange={(event) => setMilestoneName(event.target.value)} />
          <input className="input" type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} />
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!milestoneName.trim()) return;
              applyCommand({ type: "milestone.create", projectId: bundle.project.id, name: milestoneName.trim(), targetDate: milestoneDate || null });
              setMilestoneName("");
              setMilestoneDate("");
            }}
          >
            Add milestone
          </button>
        </div>
        {bundle.core.milestones.map((milestone) => {
          const items = bundle.core.items.filter((item) => item.milestoneId === milestone.id && !item.trashedAt);
          const done = items.filter((item) => bundle.core.statuses.find((status) => status.id === item.statusId)?.category === "completed").length;
          return (
            <div key={milestone.id} className="settings-simple-row">
              <div className="col" style={{ gap: 2 }}>
                <span>{milestone.name}</span>
                <span className="text-xs text-muted">Target: {milestone.targetDate ?? "None"} - {done}/{items.length} complete</span>
              </div>
            </div>
          );
        })}
      </SettingsSectionCard>
    </div>
  );
}
