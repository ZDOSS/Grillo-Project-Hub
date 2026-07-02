import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "../button";

export function Modal({
  children,
  footer,
  label,
  onClose,
  size = "md",
  title
}: {
  children: ReactNode;
  footer?: ReactNode;
  label?: string;
  onClose: () => void;
  size?: "md" | "lg" | "work-item";
  title: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop gph-modal-backdrop" onMouseDown={onClose}>
      <section
        className={`modal gph-modal gph-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === "string" ? title : undefined)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header gph-modal-header">
          <strong>{title}</strong>
          <IconButton aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </header>
        <div className="modal-body gph-modal-body">{children}</div>
        {footer ? (
          <footer className="modal-footer gph-modal-footer">{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
