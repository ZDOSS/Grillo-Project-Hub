import type { CustomFieldId, TypeId } from "./ids";
import { generateId } from "./ids";

/**
 * Custom fields: project-defined typed fields.
 *
 *  - In MVP types are: text, number, select, multi-select, date, checkbox.
 *  - Fields may apply globally or to selected typeIds.
 *  - Changing an item's type hides inapplicable fields but preserves the value.
 *  - Filters, exports, automation, MCP distinguish inapplicable from empty-but-applicable.
 */

export type CustomFieldType = "text" | "number" | "select" | "multi-select" | "date" | "checkbox";

export type CustomFieldDefinition = {
  id: CustomFieldId;
  name: string;
  type: CustomFieldType;
  required?: boolean;
  options?: string[]; // for select / multi-select
  /** If null/undefined, applies to all work-item types. */
  applicableTypeIds?: TypeId[] | null;
  description?: string | null;
  archived?: boolean;
  order: number;
};

export function createCustomField(input: {
  name: string;
  type: CustomFieldType;
  options?: string[];
  applicableTypeIds?: TypeId[] | null;
  description?: string | null;
  required?: boolean;
  order?: number;
  id?: string;
}): CustomFieldDefinition {
  if (input.type === "select" || input.type === "multi-select") {
    if (!input.options || input.options.length === 0) {
      throw new Error(`Select fields require at least one option: ${input.name}`);
    }
  }
  return {
    id: input.id ?? generateId("cf"),
    name: input.name,
    type: input.type,
    required: input.required ?? false,
    options: input.options ?? undefined,
    applicableTypeIds: input.applicableTypeIds ?? null,
    description: input.description ?? null,
    order: input.order ?? 1024,
    archived: false
  };
}

export function isFieldApplicableToType(
  field: CustomFieldDefinition,
  typeId: TypeId
): boolean {
  if (!field.applicableTypeIds || field.applicableTypeIds.length === 0) return true;
  return field.applicableTypeIds.includes(typeId);
}

export type CustomFieldValue = string | number | boolean | string[] | null;

export function validateCustomFieldValue(
  field: CustomFieldDefinition,
  value: CustomFieldValue
): void {
  if (value === null || value === undefined) {
    if (field.required) throw new Error(`${field.name} is required`);
    return;
  }
  switch (field.type) {
    case "text":
      if (typeof value !== "string") throw new Error(`${field.name} must be text`);
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
      break;
    case "checkbox":
      if (typeof value !== "boolean") throw new Error(`${field.name} must be a checkbox`);
      break;
    case "date":
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field.name} must be a date`);
      break;
    case "select":
      if (typeof value !== "string") throw new Error(`${field.name} must be a single option`);
      if (!field.options?.includes(value)) throw new Error(`${field.name} has unknown option: ${value}`);
      break;
    case "multi-select":
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
        throw new Error(`${field.name} must be a list of options`);
      }
      for (const v of value) {
        if (!field.options?.includes(v)) throw new Error(`${field.name} has unknown option: ${v}`);
      }
      break;
  }
}
