import { type ReactNode } from "react";

export type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  actions,
  description,
  eyebrow,
  title
}: PageHeaderProps) {
  return (
    <header className="gph-page-header">
      <div className="gph-page-header-copy">
        {eyebrow ? <div className="gph-page-header-eyebrow">{eyebrow}</div> : null}
        <h1 className="gph-page-header-title">{title}</h1>
        {description ? (
          <div className="gph-page-header-description">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="gph-page-header-actions">{actions}</div> : null}
    </header>
  );
}
