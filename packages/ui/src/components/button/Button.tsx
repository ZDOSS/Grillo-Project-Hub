import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "default" | "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      icon,
      loading = false,
      loadingLabel = "Working...",
      size = "md",
      trailingIcon,
      type = "button",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const visualIcon = loading ? (
      <span className="btn-spinner" aria-hidden="true" />
    ) : icon ? (
      <span className="btn-icon" aria-hidden="true">
        {icon}
      </span>
    ) : null;

    return (
      <button
        ref={ref}
        type={type}
        className={joinClasses(
          "btn",
          variant !== "default" && `btn-${variant}`,
          size !== "md" && `btn-${size}`,
          loading && "btn-loading",
          className
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {visualIcon}
        <span className="btn-label">{loading ? loadingLabel : children}</span>
        {!loading && trailingIcon ? (
          <span className="btn-icon btn-icon-trailing" aria-hidden="true">
            {trailingIcon}
          </span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";

export type IconButtonProps = Omit<
  ButtonProps,
  "icon" | "loadingLabel" | "trailingIcon"
> & {
  "aria-label": string;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, size = "sm", variant = "ghost", ...props }, ref) => (
    <Button
      ref={ref}
      className={joinClasses("icon-btn", className)}
      size={size}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  )
);

IconButton.displayName = "IconButton";
