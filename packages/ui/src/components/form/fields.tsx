import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

type FieldFrameProps = {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
};

function FieldFrame({
  children,
  description,
  error,
  inputId,
  label
}: FieldFrameProps & { children: ReactNode; inputId: string }) {
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="gph-field">
      <label className="gph-field-label" htmlFor={inputId}>
        {label}
      </label>
      {children}
      {description ? (
        <div className="gph-field-description" id={descriptionId}>
          {description}
        </div>
      ) : null}
      {error ? (
        <div className="gph-field-error" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function describedBy(id: string, description?: ReactNode, error?: ReactNode) {
  return [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children"
> &
  FieldFrameProps;

export function TextField({
  className,
  description,
  error,
  id,
  label,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldFrame
      description={description}
      error={error}
      inputId={inputId}
      label={label}
    >
      <input
        className={["input", "gph-field-control", className]
          .filter(Boolean)
          .join(" ")}
        id={inputId}
        aria-describedby={describedBy(inputId, description, error)}
        {...props}
      />
    </FieldFrame>
  );
}

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldFrameProps;

export function TextareaField({
  className,
  description,
  error,
  id,
  label,
  ...props
}: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldFrame
      description={description}
      error={error}
      inputId={inputId}
      label={label}
    >
      <textarea
        className={["textarea", "gph-field-control", className]
          .filter(Boolean)
          .join(" ")}
        id={inputId}
        aria-describedby={describedBy(inputId, description, error)}
        {...props}
      />
    </FieldFrame>
  );
}

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldFrameProps;

export function SelectField({
  children,
  className,
  description,
  error,
  id,
  label,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldFrame
      description={description}
      error={error}
      inputId={inputId}
      label={label}
    >
      <select
        className={["select", "gph-field-control", className]
          .filter(Boolean)
          .join(" ")}
        id={inputId}
        aria-describedby={describedBy(inputId, description, error)}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export type CheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  FieldFrameProps;

export function CheckboxField({
  className,
  description,
  error,
  id,
  label,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="gph-checkbox-field">
      <input
        className={className}
        id={inputId}
        type="checkbox"
        aria-describedby={describedBy(inputId, description, error)}
        {...props}
      />
      <div>
        <label className="gph-checkbox-label" htmlFor={inputId}>
          {label}
        </label>
        {description ? (
          <div className="gph-field-description" id={`${inputId}-description`}>
            {description}
          </div>
        ) : null}
        {error ? (
          <div className="gph-field-error" id={`${inputId}-error`} role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
