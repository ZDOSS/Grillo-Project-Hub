import { type ReactNode } from "react";

export function ViewToolbar({ children }: { children: ReactNode }) {
  return <div className="gph-view-toolbar">{children}</div>;
}
