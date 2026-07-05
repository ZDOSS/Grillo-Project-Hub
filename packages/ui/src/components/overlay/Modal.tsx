import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "../button";

export function Modal({
  children,
  closeOnEscape = true,
  footer,
  label,
  onClose,
  size = "md",
  title
}: {
  children: ReactNode;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  label?: string;
  onClose: () => void;
  size?: "md" | "lg" | "work-item";
  title: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();
    return () => {
      const target = restoreFocusRef.current;
      if (target && document.contains(target)) {
        target.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOnEscape, onClose]);

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
          {typeof title === "string" ? <strong>{title}</strong> : title}
          <IconButton aria-label="Close" onClick={onClose} ref={closeButtonRef}>
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
