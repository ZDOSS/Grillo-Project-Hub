import {
  isFieldApplicableToType,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type WorkItem
} from "@gph/core";

export function customFieldAppliesToItem(
  field: CustomFieldDefinition,
  item: WorkItem
) {
  return !field.archived && isFieldApplicableToType(field, item.typeId);
}

export function activeCustomFieldsForItem(
  fields: CustomFieldDefinition[],
  item: WorkItem
) {
  return [...fields]
    .filter((field) => customFieldAppliesToItem(field, item))
    .sort(compareCustomFields);
}

export function activeCustomFields(fields: CustomFieldDefinition[]) {
  return [...fields].filter((field) => !field.archived).sort(compareCustomFields);
}

export function customFieldValueIsEmpty(value: CustomFieldValue | undefined) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function formatCustomFieldValue(
  field: CustomFieldDefinition,
  value: CustomFieldValue | undefined
) {
  if (customFieldValueIsEmpty(value)) return "None";
  if (field.type === "checkbox") return value === true ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function customFieldSummariesForItem(
  fields: CustomFieldDefinition[],
  item: WorkItem,
  limit = 3
) {
  return activeCustomFieldsForItem(fields, item)
    .map((field) => {
      const value = item.customFields?.[field.id];
      if (customFieldValueIsEmpty(value)) return null;
      return {
        field,
        text: `${field.name}: ${formatCustomFieldValue(field, value)}`
      };
    })
    .filter(Boolean)
    .slice(0, limit) as Array<{ field: CustomFieldDefinition; text: string }>;
}

function compareCustomFields(
  a: CustomFieldDefinition,
  b: CustomFieldDefinition
) {
  return a.order - b.order || a.name.localeCompare(b.name);
}
