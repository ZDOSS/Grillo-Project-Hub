import { HelpCircle } from "lucide-react";
import { type ReactNode, useId } from "react";

export function HelpTip({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  const tooltipId = useId();
  return (
    <span className="gph-help-tip">
      <button
        aria-describedby={tooltipId}
        aria-label={`Help: ${label}`}
        className="gph-help-tip-trigger"
        type="button"
      >
        <HelpCircle aria-hidden="true" />
      </button>
      <span className="gph-help-tip-content" id={tooltipId} role="tooltip">
        {children}
      </span>
    </span>
  );
}
