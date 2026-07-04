import type { EventRecord } from "@gph/core";

export function formatActivityEvent(event: EventRecord): { label: string; detail?: string } {
  switch (event.type) {
    case "item.created":
      return { label: "Item created", detail: stringValue(event.data?.title) };
    case "item.updated":
      return { label: "Item updated", detail: patchSummary(event.data?.patch) };
    case "item.statusChanged":
      return { label: "Status changed", detail: transitionSummary(event.data?.from, event.data?.to) };
    case "item.moved":
      return { label: "Item moved" };
    case "item.deleted":
      return { label: "Moved to trash" };
    case "item.permanentlyDeleted":
      return { label: "Item permanently deleted", detail: stringValue(event.data?.title) };
    case "item.restored":
      return { label: "Item restored" };
    case "item.archived":
      return { label: "Item archived" };
    case "item.commented":
      return { label: "Comment added" };
    case "item.attachmentAdded":
      return { label: "Attachment added", detail: stringValue(event.data?.attachmentId) };
    case "item.duplicated":
      return { label: "Item duplicated", detail: stringValue(event.data?.sourceId) };
    case "checklist.converted":
      return { label: "Checklist item converted to subtask" };
    case "milestone.assigned":
      return { label: "Milestone assigned" };
    case "doc.created":
      return { label: "Document created", detail: stringValue(event.data?.title) };
    case "doc.updated":
      return { label: "Document updated" };
    case "doc.deleted":
      return { label: "Document moved to trash", detail: stringValue(event.data?.title) };
    case "doc.restored":
      return { label: "Document restored", detail: stringValue(event.data?.title) };
    case "doc.permanentlyDeleted":
      return { label: "Document permanently deleted", detail: stringValue(event.data?.title) };
    case "attachment.deleted":
      return { label: "Attachment moved to trash", detail: stringValue(event.data?.filename) };
    case "attachment.restored":
      return { label: "Attachment restored", detail: stringValue(event.data?.filename) };
    case "attachment.permanentlyDeleted":
      return { label: "Attachment permanently deleted", detail: stringValue(event.data?.filename) };
    case "automation.executed":
      return { label: "Automation ran" };
    default:
      return { label: event.type };
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function transitionSummary(from: unknown, to: unknown): string | undefined {
  const fromText = stringValue(from);
  const toText = stringValue(to);
  if (!fromText && !toText) return undefined;
  return `${fromText ?? "Unknown"} -> ${toText ?? "Unknown"}`;
}

function patchSummary(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const keys = Object.keys(value);
  if (keys.length === 0) return undefined;
  if (keys.length <= 3) return keys.join(", ");
  return `${keys.slice(0, 3).join(", ")} +${keys.length - 3} more`;
}
