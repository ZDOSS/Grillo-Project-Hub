import { useState } from "react";
import { HelpTip } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

type FieldType = "text" | "number" | "select" | "multi-select" | "date" | "checkbox";

export function CustomFieldsSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");

  if (!bundle) return null;

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Custom fields"
        description={(
          <>
            Define work metadata fields. Applicable fields are edited in item detail and can surface in table/backlog views.
            <HelpTip label="Custom fields">
              Keep fields specific and typed. Select and multi-select fields work best when teams need consistent reporting values.
            </HelpTip>
          </>
        )}
      />
      <div className="row settings-inline-form">
        <input className="input" placeholder="Field name" value={name} onChange={(event) => setName(event.target.value)} />
        <select className="select" value={type} onChange={(event) => setType(event.target.value as FieldType)}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="multi-select">Multi-select</option>
          <option value="date">Date</option>
          <option value="checkbox">Checkbox</option>
        </select>
        {(type === "select" || type === "multi-select") && (
          <input className="input" placeholder="Options (comma separated)" value={options} onChange={(event) => setOptions(event.target.value)} />
        )}
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!name.trim()) return;
            const opts = type === "select" || type === "multi-select"
              ? options.split(",").map((option) => option.trim()).filter(Boolean)
              : undefined;
            applyCommand({ type: "customField.define", projectId: bundle.project.id, field: { name: name.trim(), type, options: opts } });
            setName("");
            setOptions("");
          }}
        >
          Add field
        </button>
      </div>
      {bundle.core.customFields.map((field) => (
        <div key={field.id} className="settings-simple-row">
          <div className="col" style={{ gap: 2 }}>
            <span>{field.name}</span>
            <span className="text-xs text-muted">{field.type} {field.options ? `(${field.options.join(", ")})` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
