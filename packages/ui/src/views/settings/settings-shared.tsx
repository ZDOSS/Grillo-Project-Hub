import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

export const COLOR_OPTIONS = [
  { value: "", label: "None" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "yellow", label: "Yellow" }
];

export function EditIcon() {
  return <Pencil size={14} aria-hidden="true" />;
}

export function colorOptionsForValue(value: string) {
  if (!value || COLOR_OPTIONS.some((option) => option.value === value)) {
    return COLOR_OPTIONS;
  }
  return [...COLOR_OPTIONS, { value, label: value }];
}

export function ColorSelect({
  ariaLabel,
  onChange,
  value
}: {
  ariaLabel: string;
  onChange: (next: string) => void;
  value: string;
}) {
  return (
    <select className="select" aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
      {colorOptionsForValue(value).map((option) => (
        <option key={option.value || "none"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function SettingsPanelHeader({
  description,
  title
}: {
  description: ReactNode;
  title: string;
}) {
  return (
    <div className="settings-panel-header">
      <h3>{title}</h3>
      <p className="text-sm text-secondary">{description}</p>
    </div>
  );
}

export function SettingsSectionCard({
  children,
  description,
  title
}: {
  children: ReactNode;
  description?: ReactNode;
  title: string;
}) {
  return (
    <section className="settings-section-card" aria-label={title}>
      <div className="settings-card-header">
        <h4>{title}</h4>
        {description ? <p className="text-sm text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
