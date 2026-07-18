import { type ReactNode } from "react";

export function ViewToolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`gph-view-toolbar ${className}`.trim()}>{children}</div>;
}
