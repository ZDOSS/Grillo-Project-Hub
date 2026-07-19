import { useEffect, useId, useState } from "react";
import type { CustomFieldDefinition, CustomFieldType, WorkItemTypeDefinition } from "@gph/core";
import { HelpTip, InlineAlert } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { EditIcon, SettingsPanelHeader } from "./settings-shared";

function parseOptions(value: string): string[] {
  return [...new Set(value.split(",").map((option) => option.trim()).filter(Boolean))];
}

function needsOptions(type: CustomFieldType): boolean {
  return type === "select" || type === "multi-select";
}

export function CustomFieldsSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [applicableTypeIds, setApplicableTypeIds] = useState<string[] | null>(null);

  if (!bundle) return null;

  const optionList = parseOptions(options);
  const canAdd = Boolean(name.trim())
    && (!needsOptions(type) || optionList.length > 0)
    && (applicableTypeIds === null || applicableTypeIds.length > 0);

  return (
    <div className="settings-panel-stack settings-panel-wide">
      <SettingsPanelHeader
        title="Custom fields"
        description={(
          <>
            Define, edit, scope, hide, and restore structured work metadata. Values already stored on work items are preserved when a field is hidden.
            <HelpTip label="Custom fields">
              Changing a field type or removing a select option is blocked when an existing value would become invalid.
            </HelpTip>
          </>
        )}
      />
      <div className="settings-section-card">
        <div className="settings-grid settings-grid-custom-field-add">
          <label className="label">
            Field name
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="label">
            Field type
            <FieldTypeSelect value={type} onChange={setType} />
          </label>
          {needsOptions(type) ? (
            <label className="label">
              Options
              <input className="input" placeholder="Comma separated" value={options} onChange={(event) => setOptions(event.target.value)} />
            </label>
          ) : null}
          <label className="label">
            Description
            <input className="input" placeholder="Optional guidance" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="workspace-source settings-checkbox-control">
            <span className="row">
              <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
              <strong>Required</strong>
            </span>
            <span className="text-xs text-muted">Require a value when this field is edited on applicable work.</span>
          </label>
          <ApplicabilityEditor
            value={applicableTypeIds}
            itemTypes={bundle.core.itemTypes.filter((itemType) => !itemType.archived)}
            onChange={setApplicableTypeIds}
          />
          <button
            className="btn btn-primary settings-form-submit"
            disabled={!canAdd}
            onClick={() => {
              applyCommand({
                type: "customField.define",
                projectId: bundle.project.id,
                field: {
                  name: name.trim(),
                  type,
                  options: needsOptions(type) ? optionList : undefined,
                  applicableTypeIds,
                  required,
                  description: description.trim() || null
                }
              });
              setName("");
              setOptions("");
              setDescription("");
              setRequired(false);
              setApplicableTypeIds(null);
            }}
          >
            Add field
          </button>
        </div>
      </div>
      <div className="settings-table">
        <div className="settings-table-header settings-table-header-custom-field">
          <span>Field</span>
          <span>Applies to</span>
          <span>State</span>
          <span>Actions</span>
        </div>
        {bundle.core.customFields.length === 0 ? <div className="settings-table-empty">No custom fields yet.</div> : null}
        {bundle.core.customFields.map((field) => <CustomFieldRow key={field.id} field={field} />)}
      </div>
    </div>
  );
}

function CustomFieldRow({ field }: { field: CustomFieldDefinition }) {
  const bundle = useProjectStore((state) => state.bundle)!;
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [name, setName] = useState(field.name);
  const [type, setType] = useState<CustomFieldType>(field.type);
  const [options, setOptions] = useState((field.options ?? []).join(", "));
  const [description, setDescription] = useState(field.description ?? "");
  const [required, setRequired] = useState(field.required ?? false);
  const [applicableTypeIds, setApplicableTypeIds] = useState<string[] | null>(field.applicableTypeIds ?? null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(field.name);
    setType(field.type);
    setOptions((field.options ?? []).join(", "));
    setDescription(field.description ?? "");
    setRequired(field.required ?? false);
    setApplicableTypeIds(field.applicableTypeIds ?? null);
    setEditing(false);
    setError(null);
  }, [field.id, field.name, field.type, field.options, field.description, field.required, field.applicableTypeIds, field.archived]);

  const optionList = parseOptions(options);
  const canSave = Boolean(name.trim())
    && (!needsOptions(type) || optionList.length > 0)
    && (applicableTypeIds === null || applicableTypeIds.length > 0);

  const cancel = () => {
    setName(field.name);
    setType(field.type);
    setOptions((field.options ?? []).join(", "));
    setDescription(field.description ?? "");
    setRequired(field.required ?? false);
    setApplicableTypeIds(field.applicableTypeIds ?? null);
    setEditing(false);
    setError(null);
  };

  const applicabilitySummary = field.applicableTypeIds?.length
    ? field.applicableTypeIds.map((typeId) => bundle.core.itemTypes.find((itemType) => itemType.id === typeId)?.name ?? typeId).join(", ")
    : "All item types";

  return (
    <div className="settings-table-row settings-table-row-custom-field">
      <div className="settings-row-field">
        {editing ? (
          <>
            <input className="input" aria-label={`Name for ${field.name}`} value={name} onChange={(event) => setName(event.target.value)} />
            <FieldTypeSelect ariaLabel={`Type for ${field.name}`} value={type} onChange={setType} />
            {needsOptions(type) ? <input className="input" aria-label={`Options for ${field.name}`} value={options} onChange={(event) => setOptions(event.target.value)} /> : null}
            <input className="input" aria-label={`Description for ${field.name}`} placeholder="Optional guidance" value={description} onChange={(event) => setDescription(event.target.value)} />
            <label className="row text-sm"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Required</label>
          </>
        ) : (
          <>
            <strong>{field.name}</strong>
            <span className="text-xs text-muted">{field.type}{field.options?.length ? ` (${field.options.join(", ")})` : ""}{field.required ? " · required" : ""}</span>
            {field.description ? <span className="text-xs text-muted">{field.description}</span> : null}
          </>
        )}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      </div>
      {editing ? (
        <ApplicabilityEditor
          compact
          value={applicableTypeIds}
          itemTypes={bundle.core.itemTypes.filter((itemType) => !itemType.archived || field.applicableTypeIds?.includes(itemType.id))}
          onChange={setApplicableTypeIds}
        />
      ) : <span className="text-sm text-secondary">{applicabilitySummary}</span>}
      <span className={`tag ${field.archived ? "tag-warn" : "tag-ok"}`}>{field.archived ? "Hidden" : "Visible"}</span>
      <div className="settings-row-actions">
        {editing ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              disabled={!canSave}
              onClick={() => {
                setError(null);
                try {
                  applyCommand({
                    type: "customField.update",
                    projectId: bundle.project.id,
                    fieldId: field.id,
                    patch: {
                      name: name.trim(),
                      type,
                      options: needsOptions(type) ? optionList : undefined,
                      applicableTypeIds,
                      required,
                      description: description.trim() || null
                    }
                  });
                  setEditing(false);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Unable to update this field.");
                }
              }}
            >
              Save
            </button>
            <button className="btn btn-sm" onClick={cancel}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-sm" aria-label={`Edit ${field.name}`} onClick={() => setEditing(true)}><EditIcon /> Edit</button>
        )}
        <button
          className="btn btn-sm"
          aria-label={`${field.archived ? "Restore" : "Hide"} ${field.name}`}
          onClick={() => applyCommand({
            type: "customField.update",
            projectId: bundle.project.id,
            fieldId: field.id,
            patch: { archived: !field.archived }
          })}
        >
          {field.archived ? "Restore" : "Hide"}
        </button>
      </div>
    </div>
  );
}

function FieldTypeSelect({
  ariaLabel = "Field type",
  onChange,
  value
}: {
  ariaLabel?: string;
  onChange: (next: CustomFieldType) => void;
  value: CustomFieldType;
}) {
  return (
    <select className="select" aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value as CustomFieldType)}>
      <option value="text">Text</option>
      <option value="number">Number</option>
      <option value="select">Select</option>
      <option value="multi-select">Multi-select</option>
      <option value="date">Date</option>
      <option value="checkbox">Checkbox</option>
    </select>
  );
}

function ApplicabilityEditor({
  compact = false,
  itemTypes,
  onChange,
  value
}: {
  compact?: boolean;
  itemTypes: WorkItemTypeDefinition[];
  onChange: (next: string[] | null) => void;
  value: string[] | null;
}) {
  const groupName = useId();
  return (
    <fieldset className={`settings-applicability ${compact ? "settings-applicability-compact" : ""}`}>
      <legend>Applies to</legend>
      <label className="row text-sm">
        <input name={groupName} type="radio" checked={value === null} onChange={() => onChange(null)} />
        All item types
      </label>
      <label className="row text-sm">
        <input name={groupName} type="radio" checked={value !== null} onChange={() => onChange(itemTypes[0] ? [itemTypes[0].id] : [])} />
        Selected types
      </label>
      {value !== null ? (
        <div className="settings-applicability-options">
          {itemTypes.map((itemType) => (
            <label className="row text-sm" key={itemType.id}>
              <input
                type="checkbox"
                checked={value.includes(itemType.id)}
                onChange={(event) => onChange(event.target.checked
                  ? [...new Set([...value, itemType.id])]
                  : value.filter((typeId) => typeId !== itemType.id))}
              />
              {itemType.name}
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
