import { type ReactNode } from "react";

export type MetadataTone = "neutral" | "info" | "success" | "warning" | "danger";

export function MetadataBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: MetadataTone;
}) {
  return (
    <span className={`tag gph-metadata-badge gph-metadata-badge-${tone}`}>
      {children}
    </span>
  );
}

export function DueDateBadge({ dueDate }: { dueDate?: string | null }) {
  if (!dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = dueDate < today;
  return (
    <MetadataBadge tone={overdue ? "danger" : "warning"}>
      {overdue ? `Overdue ${dueDate}` : dueDate}
    </MetadataBadge>
  );
}
