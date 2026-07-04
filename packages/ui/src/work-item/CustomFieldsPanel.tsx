import { useState } from "react";
import {
  validateCustomFieldValue,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type WorkItem
} from "@gph/core";
import { CheckboxField, SelectField, TextField } from "../components";
import {
  activeCustomFieldsForItem,
  customFieldValueIsEmpty
} from "./custom-fields";

type CustomFieldsPanelProps = {
  fields: CustomFieldDefinition[];
  item: WorkItem;
  onChange: (nextCustomFields: Record<string, CustomFieldValue>) => void;
};

export function CustomFieldsPanel({
  fields,
  item,
  onChange
}: CustomFieldsPanelProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const activeFields = activeCustomFieldsForItem(fields, item);

  const saveValue = (field: CustomFieldDefinition, value: CustomFieldValue) => {
    const valueForValidation = customFieldValueIsEmpty(value) ? null : value;
    try {
      validateCustomFieldValue(field, valueForValidation);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [field.id]: error instanceof Error ? error.message : "Invalid value"
      }));
      return;
    }

    setErrors((current) => {
      const next = { ...current };
      delete next[field.id];
      return next;
    });

    const nextCustomFields = { ...(item.customFields ?? {}) };
    if (customFieldValueIsEmpty(value)) {
      delete nextCustomFields[field.id];
    } else {
      nextCustomFields[field.id] = value;
    }
    onChange(nextCustomFields);
  };

  if (activeFields.length === 0) {
    return (
      <p className="text-sm text-muted">
        No custom fields apply to this item type.
      </p>
    );
  }

  return (
    <div className="custom-fields-panel">
      {activeFields.map((field) => (
        <CustomFieldControl
          key={field.id}
          error={errors[field.id]}
          field={field}
          item={item}
          onSave={saveValue}
        />
      ))}
    </div>
  );
}

function CustomFieldControl({
  error,
  field,
  item,
  onSave
}: {
  error?: string;
  field: CustomFieldDefinition;
  item: WorkItem;
  onSave: (field: CustomFieldDefinition, value: CustomFieldValue) => void;
}) {
  const value = item.customFields?.[field.id];
  const description = field.required ? "Required" : undefined;

  switch (field.type) {
    case "text":
      return (
        <TextField
          label={field.name}
          value={typeof value === "string" ? value : ""}
          description={description}
          error={error}
          onChange={(event) => onSave(field, event.target.value)}
        />
      );
    case "number":
      return (
        <TextField
          label={field.name}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          description={description}
          error={error}
          onChange={(event) => {
            const raw = event.target.value;
            onSave(field, raw === "" ? null : Number(raw));
          }}
        />
      );
    case "date":
      return (
        <TextField
          label={field.name}
          type="date"
          value={typeof value === "string" ? value : ""}
          description={description}
          error={error}
          onChange={(event) => onSave(field, event.target.value || null)}
        />
      );
    case "checkbox":
      return (
        <CheckboxField
          label={field.name}
          checked={value === true}
          description={description}
          error={error}
          onChange={(event) => onSave(field, event.target.checked)}
        />
      );
    case "select":
      return (
        <SelectField
          label={field.name}
          value={typeof value === "string" ? value : ""}
          description={description}
          error={error}
          onChange={(event) => onSave(field, event.target.value || null)}
        >
          <option value="">None</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      );
    case "multi-select":
      return (
        <SelectField
          label={field.name}
          multiple
          value={Array.isArray(value) ? value : []}
          description={description}
          error={error}
          onChange={(event) =>
            onSave(
              field,
              Array.from(event.target.selectedOptions).map((option) => option.value)
            )
          }
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      );
  }
}
