import { type ReactNode } from "react";

export type InlineAlertTone = "info" | "success" | "warning" | "danger";

export function InlineAlert({
  children,
  tone = "info"
}: {
  children: ReactNode;
  tone?: InlineAlertTone;
}) {
  return (
    <div
      className={`gph-inline-alert gph-inline-alert-${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
