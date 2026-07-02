import { type ReactNode } from "react";

export function EmptyState({
  actions,
  description,
  title
}: {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="empty gph-empty-state">
      <div className="empty-title gph-empty-state-title">{title}</div>
      {description ? (
        <div className="gph-empty-state-description">{description}</div>
      ) : null}
      {actions ? <div className="gph-empty-state-actions">{actions}</div> : null}
    </div>
  );
}
