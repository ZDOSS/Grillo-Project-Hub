import {
  type ElementType,
  type HTMLAttributes,
  type ReactNode
} from "react";

type SurfacePadding = "none" | "sm" | "md" | "lg";
type SurfaceVariant = "default" | "muted" | "elevated";

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  interactive?: boolean;
  padding?: SurfacePadding;
  variant?: SurfaceVariant;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Surface({
  as,
  children,
  className,
  interactive = false,
  padding = "md",
  variant = "default",
  ...props
}: SurfaceProps) {
  const Component = as ?? "section";

  return (
    <Component
      className={joinClasses(
        "gph-surface",
        `gph-surface-${variant}`,
        `gph-surface-padding-${padding}`,
        interactive && "gph-surface-interactive",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
