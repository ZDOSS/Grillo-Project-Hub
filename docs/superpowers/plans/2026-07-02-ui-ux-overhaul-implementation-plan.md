# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full working GPH UI/UX overhaul by creating a shared UI foundation, migrating every app surface to it, and completing the primary workflows with tests.

**Architecture:** Keep the current React Router, Zustand, Vite, Tauri, and `@gph/core` command architecture. Add a focused `packages/ui/src/components/` layer, migrate routes onto it, and keep project data mutations behind the existing validated command dispatcher.

**Tech Stack:** React 18, TypeScript, React Router 6, Zustand, Vite 5, Tauri 2, Vitest, Playwright, CSS custom properties, `lucide-react`.

---

## File Structure

Create:

- `packages/ui/src/components/index.ts`
- `packages/ui/src/components/button/Button.tsx`
- `packages/ui/src/components/button/Button.test.tsx`
- `packages/ui/src/components/form/fields.tsx`
- `packages/ui/src/components/layout/AppFrame.tsx`
- `packages/ui/src/components/layout/PageHeader.tsx`
- `packages/ui/src/components/layout/Surface.tsx`
- `packages/ui/src/components/layout/Surface.test.tsx`
- `packages/ui/src/components/layout/ViewToolbar.tsx`
- `packages/ui/src/components/feedback/EmptyState.tsx`
- `packages/ui/src/components/feedback/InlineAlert.tsx`
- `packages/ui/src/components/feedback/ToastProvider.tsx`
- `packages/ui/src/components/overlay/Dialog.tsx`
- `packages/ui/src/components/overlay/Modal.tsx`
- `packages/ui/src/components/navigation/Tabs.tsx`
- `packages/ui/src/components/table/DataTable.tsx`
- `packages/ui/src/components/work/WorkItemCard.tsx`
- `packages/ui/src/components/work/WorkItemRow.tsx`
- `packages/ui/src/components/work/work-metadata.tsx`
- `packages/ui/src/work-item/WorkItemModal.tsx`
- `packages/ui/src/work-item/WorkItemModal.test.tsx`

Modify:

- `package.json`
- `packages/ui/package.json`
- `packages/ui/src/theme/tokens.css`
- `packages/ui/src/theme/global.css`
- `packages/ui/src/AppShell.tsx`
- `packages/ui/src/ProjectRouter.tsx`
- `packages/ui/src/nav-config.ts`
- `packages/ui/src/views/projects/ProjectsListView.tsx`
- `packages/ui/src/views/board/BoardView.tsx`
- `packages/ui/src/views/board/ItemCard.tsx`
- `packages/ui/src/views/backlog/BacklogView.tsx`
- `packages/ui/src/views/table/TableView.tsx`
- `packages/ui/src/views/docs/DocsView.tsx`
- `packages/ui/src/views/roadmap/RoadmapView.tsx`
- `packages/ui/src/views/calendar/CalendarView.tsx`
- `packages/ui/src/views/bugs/BugTriageView.tsx`
- `packages/ui/src/views/mywork/MyWorkView.tsx`
- `packages/ui/src/views/search/SearchView.tsx`
- `packages/ui/src/views/settings/SettingsView.tsx`
- `packages/ui/src/commands/CommandPalette.tsx`
- `packages/ui/src/work-item/CreateItemDialog.tsx`
- `Readme.md`
- `AI.md`

Test:

- `packages/ui/src/AppShell.test.tsx`
- `packages/ui/src/views/projects/ProjectsListView.test.tsx`
- `packages/ui/src/views/board/BoardView.test.tsx`
- `packages/ui/src/views/backlog/BacklogView.test.tsx`
- `packages/ui/src/views/table/TableView.test.tsx`
- `packages/ui/src/views/docs/DocsView.test.tsx`
- `packages/ui/src/views/settings/SettingsView.test.tsx`
- `tests/e2e/project-workflow.spec.ts`
- `tests/e2e/hybrid-parity.spec.ts`

## PR 1: UI Foundation

### Task 1: Add icon dependency and component exports

**Files:**

- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/components/index.ts`

- [ ] **Step 1: Install icon dependency**

Run:

```bash
npm install --workspace packages/ui lucide-react
```

Expected: `packages/ui/package.json` and `package-lock.json` include `lucide-react`.

- [ ] **Step 2: Add component export barrel**

Create `packages/ui/src/components/index.ts`:

```ts
export * from "./button/Button";
export * from "./form/fields";
export * from "./layout/AppFrame";
export * from "./layout/PageHeader";
export * from "./layout/Surface";
export * from "./layout/ViewToolbar";
export * from "./feedback/EmptyState";
export * from "./feedback/InlineAlert";
export * from "./feedback/ToastProvider";
export * from "./overlay/Dialog";
export * from "./overlay/Modal";
export * from "./navigation/Tabs";
export * from "./table/DataTable";
export * from "./work/WorkItemCard";
export * from "./work/WorkItemRow";
export * from "./work/work-metadata";
```

- [ ] **Step 3: Export components from package**

Modify `packages/ui/package.json` exports:

```json
"./components": "./src/components/index.ts"
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm --workspace packages/ui run typecheck
```

Expected: typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add package-lock.json packages/ui/package.json packages/ui/src/components/index.ts
git commit -s -m "feat: add ui component foundation exports"
```

### Task 2: Expand theme tokens and base global classes

**Files:**

- Modify: `packages/ui/src/theme/tokens.css`
- Modify: `packages/ui/src/theme/global.css`
- Test: `packages/ui/src/AppShell.test.tsx`

- [ ] **Step 1: Add token groups**

Add these token names to `:root` and `[data-theme="dark"]` in `tokens.css`:

```css
--color-control-bg: var(--color-bg-surface);
--color-control-bg-hover: var(--color-bg-row-hover);
--color-control-border: var(--color-border-subtle);
--color-control-border-hover: var(--color-border-strong);
--color-control-disabled: var(--color-bg-muted);
--color-focus-ring: var(--color-border-focus);
--color-state-info-bg: var(--color-accent-soft);
--color-state-success-bg: var(--color-bg-status-ok);
--color-state-warning-bg: var(--color-bg-status-warn);
--color-state-danger-bg: var(--color-bg-status-blocked);
--duration-fast: 120ms;
--duration-base: 180ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--sidebar-rail-width: 56px;
--content-max-width: 1280px;
--modal-work-item-width: 1040px;
```

- [ ] **Step 2: Add foundation class namespaces**

In `global.css`, add grouped sections for:

```css
.gph-button {}
.gph-field {}
.gph-page-header {}
.gph-surface {}
.gph-view-toolbar {}
.gph-empty-state {}
.gph-modal {}
.gph-data-table {}
.gph-work-card {}
.gph-work-row {}
```

Populate each class only with token-based styling. Keep existing legacy classes in place until migration tasks remove their use.

- [ ] **Step 3: Verify reduced motion still applies**

Run:

```bash
npm --workspace packages/ui run test -- src/AppShell.test.tsx
```

Expected: existing AppShell tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/theme/tokens.css packages/ui/src/theme/global.css packages/ui/src/AppShell.test.tsx
git commit -s -m "feat: expand ui theme tokens"
```

### Task 3: Build button and field primitives

**Files:**

- Create: `packages/ui/src/components/button/Button.tsx`
- Create: `packages/ui/src/components/button/Button.test.tsx`
- Create: `packages/ui/src/components/form/fields.tsx`
- Create: `packages/ui/src/components/layout/Surface.tsx`
- Create: `packages/ui/src/components/layout/Surface.test.tsx`

- [ ] **Step 1: Write button tests**

Create `Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "./Button";

describe("Button", () => {
  it("calls onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("requires an accessible label for icon-only usage", () => {
    render(<IconButton aria-label="Close">x</IconButton>);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --workspace packages/ui run test -- src/components/button/Button.test.tsx
```

Expected: fail because `Button.tsx` does not exist.

- [ ] **Step 3: Implement button primitive**

Create `Button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, leadingIcon, trailingIcon, className, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={["gph-button", `gph-button-${variant}`, `gph-button-${size}`, className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {leadingIcon ? <span className="gph-button-icon">{leadingIcon}</span> : null}
      <span className="gph-button-label">{loading ? "Working..." : children}</span>
      {trailingIcon ? <span className="gph-button-icon">{trailingIcon}</span> : null}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonProps, "leadingIcon" | "trailingIcon"> & {
  "aria-label": string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = "sm", variant = "ghost", children, ...props },
  ref
) {
  return (
    <Button ref={ref} className={["gph-icon-button", className].filter(Boolean).join(" ")} size={size} variant={variant} {...props}>
      {children}
    </Button>
  );
});
```

- [ ] **Step 4: Implement field primitives**

Create `fields.tsx`:

```tsx
import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldFrameProps = {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
};

function FieldFrame({ label, description, error, children }: FieldFrameProps) {
  return (
    <label className="gph-field">
      <span className="gph-field-label">{label}</span>
      {children}
      {description ? <span className="gph-field-description">{description}</span> : null}
      {error ? <span className="gph-field-error">{error}</span> : null}
    </label>
  );
}

export function TextField({ label, description, error, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldFrameProps) {
  return (
    <FieldFrame label={label} description={description} error={error}>
      <input className="gph-field-control" {...props} />
    </FieldFrame>
  );
}

export function TextareaField({ label, description, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldFrameProps) {
  return (
    <FieldFrame label={label} description={description} error={error}>
      <textarea className="gph-field-control gph-field-textarea" {...props} />
    </FieldFrame>
  );
}

export function SelectField({ label, description, error, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldFrameProps) {
  return (
    <FieldFrame label={label} description={description} error={error}>
      <select className="gph-field-control" {...props}>{children}</select>
    </FieldFrame>
  );
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm --workspace packages/ui run test -- src/components/button/Button.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/button packages/ui/src/components/form packages/ui/src/components/index.ts packages/ui/src/theme/global.css
git commit -s -m "feat: add button and field primitives"
```

### Task 4: Build layout, feedback, overlay, navigation, table, and work primitives

**Files:**

- Create: `packages/ui/src/components/layout/AppFrame.tsx`
- Create: `packages/ui/src/components/layout/PageHeader.tsx`
- Create: `packages/ui/src/components/layout/ViewToolbar.tsx`
- Create: `packages/ui/src/components/feedback/EmptyState.tsx`
- Create: `packages/ui/src/components/feedback/InlineAlert.tsx`
- Create: `packages/ui/src/components/feedback/ToastProvider.tsx`
- Create: `packages/ui/src/components/overlay/Dialog.tsx`
- Create: `packages/ui/src/components/overlay/Modal.tsx`
- Create: `packages/ui/src/components/navigation/Tabs.tsx`
- Create: `packages/ui/src/components/table/DataTable.tsx`
- Create: `packages/ui/src/components/work/WorkItemCard.tsx`
- Create: `packages/ui/src/components/work/WorkItemRow.tsx`
- Create: `packages/ui/src/components/work/work-metadata.tsx`
- Modify: `packages/ui/src/components/index.ts`
- Modify: `packages/ui/src/theme/global.css`

- [ ] **Step 1: Create layout primitives**

Create `PageHeader.tsx`:

```tsx
import { type ReactNode } from "react";

export function PageHeader({ title, eyebrow, description, actions }: { title: ReactNode; eyebrow?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="gph-page-header">
      <div className="gph-page-header-copy">
        {eyebrow ? <div className="gph-page-header-eyebrow">{eyebrow}</div> : null}
        <h1 className="gph-page-header-title">{title}</h1>
        {description ? <p className="gph-page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="gph-page-header-actions">{actions}</div> : null}
    </header>
  );
}
```

Create `ViewToolbar.tsx`:

```tsx
import { type ReactNode } from "react";

export function ViewToolbar({ children }: { children: ReactNode }) {
  return <div className="gph-view-toolbar">{children}</div>;
}
```

Create `AppFrame.tsx`:

```tsx
import { type ReactNode } from "react";

export function AppFrame({ sidebar, header, viewbar, children }: { sidebar: ReactNode; header: ReactNode; viewbar?: ReactNode; children: ReactNode }) {
  return (
    <div className="gph-app-frame">
      <aside className="gph-app-frame-sidebar">{sidebar}</aside>
      <header className="gph-app-frame-header">{header}</header>
      <main className="gph-app-frame-main">
        {viewbar ? <div className="gph-app-frame-viewbar">{viewbar}</div> : null}
        <div className="gph-app-frame-content">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create feedback primitives**

Create `EmptyState.tsx`:

```tsx
import { type ReactNode } from "react";

export function EmptyState({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="gph-empty-state">
      <h2 className="gph-empty-state-title">{title}</h2>
      {description ? <div className="gph-empty-state-description">{description}</div> : null}
      {actions ? <div className="gph-empty-state-actions">{actions}</div> : null}
    </div>
  );
}
```

Create `InlineAlert.tsx`:

```tsx
import { type ReactNode } from "react";

export function InlineAlert({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <div className={`gph-inline-alert gph-inline-alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}
```

Create `ToastProvider.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: string; tone: "info" | "success" | "warning" | "danger"; message: string };
type ToastContextValue = { notify: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const value = useMemo(() => ({
    notify(toast: Omit<Toast, "id">) {
      const id = `toast_${Date.now().toString(36)}`;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4000);
    }
  }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="gph-toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => <div key={toast.id} className={`gph-toast gph-toast-${toast.tone}`}>{toast.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
```

- [ ] **Step 3: Create modal primitive**

Create `Modal.tsx`:

```tsx
import { useEffect, type ReactNode } from "react";

export function Modal({ title, children, footer, onClose, size = "md" }: { title: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void; size?: "md" | "lg" | "work-item" }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gph-modal-backdrop" onMouseDown={onClose}>
      <section className={`gph-modal gph-modal-${size}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onMouseDown={(event) => event.stopPropagation()}>
        <header className="gph-modal-header">{title}</header>
        <div className="gph-modal-body">{children}</div>
        {footer ? <footer className="gph-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
```

Create `Dialog.tsx`:

```tsx
import { Button } from "../button/Button";
import { Modal } from "./Modal";

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", onConfirm, onCancel, destructive = false }: { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean }) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    }>
      <p>{message}</p>
    </Modal>
  );
}
```

- [ ] **Step 4: Create navigation and table primitives**

Create `Tabs.tsx`:

```tsx
import { type ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: string; panel?: ReactNode };

export function Tabs<T extends string>({ items, selected, onSelect, label }: { items: Array<TabItem<T>>; selected: T; onSelect: (id: T) => void; label: string }) {
  return (
    <div className="gph-tabs">
      <div className="gph-tabs-list" role="tablist" aria-label={label}>
        {items.map((item) => (
          <button key={item.id} className="gph-tab" role="tab" aria-selected={item.id === selected} onClick={() => onSelect(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => item.id === selected && item.panel ? <div key={item.id} className="gph-tab-panel" role="tabpanel">{item.panel}</div> : null)}
    </div>
  );
}
```

Create `DataTable.tsx`:

```tsx
import { type ReactNode } from "react";

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  render: (row: Row) => ReactNode;
  sortButtonLabel?: string;
  onSort?: () => void;
};

export function DataTable<Row>({ label, rows, columns, getRowKey, empty }: { label: string; rows: Row[]; columns: Array<DataTableColumn<Row>>; getRowKey: (row: Row) => string; empty: ReactNode }) {
  if (rows.length === 0) return <div className="gph-data-table-empty">{empty}</div>;
  return (
    <div className="gph-data-table-wrap">
      <table className="gph-data-table" aria-label={label}>
        <thead>
          <tr>{columns.map((column) => <th key={column.id}>{column.onSort ? <button type="button" onClick={column.onSort} aria-label={column.sortButtonLabel ?? `Sort by ${column.header}`}>{column.header}</button> : column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={getRowKey(row)}>{columns.map((column) => <td key={column.id}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create work metadata primitives**

Create `work-metadata.tsx`:

```tsx
export function MetadataBadge({ tone = "neutral", children }: { tone?: "neutral" | "info" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  return <span className={`gph-metadata-badge gph-metadata-badge-${tone}`}>{children}</span>;
}

export function DueDateBadge({ dueDate }: { dueDate: string | null | undefined }) {
  if (!dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = dueDate < today;
  return <MetadataBadge tone={overdue ? "danger" : "warning"}>{overdue ? `Overdue ${dueDate}` : dueDate}</MetadataBadge>;
}
```

Create `WorkItemCard.tsx`:

```tsx
import type { Label, PriorityDefinition, StatusDefinition, WorkItem } from "@gph/core";
import { DueDateBadge, MetadataBadge } from "./work-metadata";

export function WorkItemCard({ item, status, priority, labels }: { item: WorkItem; status?: StatusDefinition; priority?: PriorityDefinition; labels: Label[] }) {
  return (
    <article className="gph-work-card">
      <h3 className="gph-work-card-title">{item.title}</h3>
      <div className="gph-work-card-meta">
        {status ? <MetadataBadge tone={status.category === "completed" ? "success" : status.category === "canceled" ? "warning" : "neutral"}>{status.name}</MetadataBadge> : null}
        {priority ? <MetadataBadge tone="info">{priority.name}</MetadataBadge> : null}
        <DueDateBadge dueDate={item.dueDate} />
      </div>
      {labels.length > 0 ? <div className="gph-work-card-labels">{labels.map((label) => <span key={label.id} className="gph-label-chip">{label.name}</span>)}</div> : null}
    </article>
  );
}
```

Create `WorkItemRow.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { PriorityDefinition, StatusDefinition, WorkItem } from "@gph/core";
import { DueDateBadge, MetadataBadge } from "./work-metadata";

export function WorkItemRow({ item, status, priority }: { item: WorkItem; status?: StatusDefinition; priority?: PriorityDefinition }) {
  return (
    <div className="gph-work-row">
      <Link className="gph-work-row-title" to={`/item/${item.id}`}>{item.title}</Link>
      {status ? <MetadataBadge>{status.name}</MetadataBadge> : null}
      {priority ? <MetadataBadge tone="info">{priority.name}</MetadataBadge> : null}
      <DueDateBadge dueDate={item.dueDate} />
    </div>
  );
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm --workspace packages/ui run typecheck
```

Expected: typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components packages/ui/src/theme/global.css
git commit -s -m "feat: add shared ui primitives"
```

## PR 2: Shell And Launcher

### Task 5: Migrate AppShell to app frame primitives

**Files:**

- Modify: `packages/ui/src/AppShell.tsx`
- Modify: `packages/ui/src/nav-config.ts`
- Test: `packages/ui/src/AppShell.test.tsx`

- [ ] **Step 1: Add shell tests**

Add tests that assert:

```tsx
expect(screen.getByRole("banner", { name: /grillo project hub/i })).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: /workspace/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /search commands/i })).toBeInTheDocument();
```

- [ ] **Step 2: Replace inline SVG icon map**

Import icons from `lucide-react`:

```tsx
import { Archive, Bug, CalendarDays, Columns3, FileText, FolderOpen, KanbanSquare, ListTodo, Moon, Search, Settings, Sun, Table2, UserRound } from "lucide-react";
```

Map nav items to icon components instead of local SVG functions.

- [ ] **Step 3: Move header actions to shared buttons**

Use:

```tsx
<Button size="sm" onClick={() => openPalette()}>Search commands</Button>
<IconButton aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
  {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
</IconButton>
```

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/AppShell.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/AppShell.tsx packages/ui/src/nav-config.ts packages/ui/src/AppShell.test.tsx packages/ui/src/theme/global.css
git commit -s -m "feat: migrate app shell to shared primitives"
```

### Task 6: Migrate workspace launcher and open flows

**Files:**

- Modify: `packages/ui/src/views/projects/ProjectsListView.tsx`
- Test: `packages/ui/src/views/projects/ProjectsListView.test.tsx`

- [ ] **Step 1: Add tests for first launch and storage copy**

Add assertions for:

```tsx
expect(screen.getByRole("heading", { name: /grillo project hub/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /new project/i })).toBeInTheDocument();
expect(screen.getByText(/browser-local/i)).toBeInTheDocument();
```

- [ ] **Step 2: Replace workspace cards with `PageHeader`, `Surface`, `EmptyState`, and `InlineAlert`**

Keep the existing storage behavior and only change composition and feedback.

- [ ] **Step 3: Replace new project modal with shared `Modal`**

Use `TextField`, `SelectField`, `InlineAlert`, `Button`, and `Modal`.

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/projects/ProjectsListView.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/projects/ProjectsListView.tsx packages/ui/src/views/projects/ProjectsListView.test.tsx packages/ui/src/theme/global.css
git commit -s -m "feat: migrate workspace launcher experience"
```

## PR 3: Board And Work Item Modal

### Task 7: Migrate board to shared work cards and toolbar

**Files:**

- Modify: `packages/ui/src/views/board/BoardView.tsx`
- Modify: `packages/ui/src/views/board/ItemCard.tsx`
- Test: `packages/ui/src/views/board/BoardView.test.tsx`

- [ ] **Step 1: Add test for WIP rejection feedback**

Create a board test that drops an item into a hard WIP-limited column and asserts a visible message:

```tsx
expect(screen.getByRole("status")).toHaveTextContent(/wip limit/i);
```

- [ ] **Step 2: Add view toolbar**

Render:

```tsx
<ViewToolbar>
  <Button size="sm" variant="primary" onClick={() => openCreateItem()}>New item</Button>
  <TextField label="Search board" value={query} onChange={(event) => setQuery(event.target.value)} />
</ViewToolbar>
```

- [ ] **Step 3: Replace `ItemCard` body with `WorkItemCard`**

Keep the whole-card `Link`, drag suppression, and visible metadata in the accessible link name.

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/board/BoardView.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/board packages/ui/src/components/work packages/ui/src/theme/global.css
git commit -s -m "feat: migrate board to shared work cards"
```

### Task 8: Replace drawer-first item detail with modal-first detail

**Files:**

- Create: `packages/ui/src/work-item/WorkItemModal.tsx`
- Create: `packages/ui/src/work-item/WorkItemModal.test.tsx`
- Modify: `packages/ui/src/ProjectRouter.tsx`
- Modify: `packages/ui/src/work-item/index.ts`
- Keep until deleted after migration: `packages/ui/src/work-item/WorkItemDrawer.tsx`

- [ ] **Step 1: Write modal open and edit tests**

Test:

```tsx
expect(screen.getByRole("dialog", { name: /work item/i })).toBeInTheDocument();
expect(screen.getByLabelText(/title/i)).toHaveValue("Seed item");
```

Then blur title and assert `item.update` command changed the store.

- [ ] **Step 2: Implement modal shell**

Use `Modal` with `size="work-item"` and the current drawer field behavior.

- [ ] **Step 3: Replace `ProjectRouter` route**

Change:

```tsx
<Route path="/item/:itemId" element={<WorkItemModal />} />
```

- [ ] **Step 4: Replace `prompt`, `confirm`, and drawer footer actions**

Use shared dialog/inline confirmation state for comment edit/delete, archive, trash, duplicate, and permanent delete. The modal should keep the pending action in local state:

```tsx
type PendingAction =
  | { type: "archive" }
  | { type: "trash" }
  | { type: "delete" }
  | { type: "comment.delete"; commentId: string }
  | null;

const [pendingAction, setPendingAction] = useState<PendingAction>(null);
```

Render `ConfirmDialog` when `pendingAction` is not null, and route every confirmed mutation through the existing command dispatcher.

- [ ] **Step 5: Run verification**

```bash
npm --workspace packages/ui run test -- src/work-item/WorkItemModal.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/work-item packages/ui/src/ProjectRouter.tsx packages/ui/src/theme/global.css
git commit -s -m "feat: replace item drawer with modal detail"
```

## PR 4: Work Management Surfaces

### Task 9: Migrate backlog and table

**Files:**

- Modify: `packages/ui/src/views/backlog/BacklogView.tsx`
- Modify: `packages/ui/src/views/table/TableView.tsx`
- Test: `packages/ui/src/views/backlog/BacklogView.test.tsx`
- Test: `packages/ui/src/views/table/TableView.test.tsx`

- [ ] **Step 1: Add route tests for toolbar and filtering**

Backlog test:

```tsx
expect(screen.getByRole("region", { name: /backlog/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /new item/i })).toBeInTheDocument();
```

Table test:

```tsx
await userEvent.type(screen.getByLabelText(/filter/i), "login");
expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
```

- [ ] **Step 2: Replace backlog rows with `WorkItemRow`**

Keep priority editing but render it through shared field/menu primitives.

- [ ] **Step 3: Replace table markup with `DataTable`**

Make sortable headers buttons with names like `Sort by title`.

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/backlog/BacklogView.test.tsx src/views/table/TableView.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/backlog packages/ui/src/views/table packages/ui/src/components/table packages/ui/src/components/work packages/ui/src/theme/global.css
git commit -s -m "feat: migrate backlog and table surfaces"
```

### Task 10: Migrate bug triage and my work

**Files:**

- Modify: `packages/ui/src/views/bugs/BugTriageView.tsx`
- Modify: `packages/ui/src/views/mywork/MyWorkView.tsx`

- [ ] **Step 1: Add tests for bug create and member selection**

Bug test:

```tsx
await userEvent.click(screen.getByRole("button", { name: /new bug/i }));
expect(screen.getByRole("dialog", { name: /create work item/i })).toBeInTheDocument();
expect(screen.getByLabelText(/type/i)).toHaveValue("bug");
```

My Work test:

```tsx
await userEvent.click(screen.getByRole("button", { name: /select/i }));
await userEvent.click(screen.getByRole("button", { name: /alex/i }));
expect(screen.getByRole("link", { name: /assigned to alex/i })).toBeInTheDocument();
```

- [ ] **Step 2: Use shared column and work-card components**

Replace `.bugs-card` and direct `.board-card` reuse with `WorkItemCard`.

- [ ] **Step 3: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/bugs src/views/mywork
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/views/bugs packages/ui/src/views/mywork packages/ui/src/components/work packages/ui/src/theme/global.css
git commit -s -m "feat: migrate focused work views"
```

## PR 5: Docs, Roadmap, And Calendar

### Task 11: Migrate docs workspace

**Files:**

- Modify: `packages/ui/src/views/docs/DocsView.tsx`
- Test: `packages/ui/src/views/docs/DocsView.test.tsx`

- [ ] **Step 1: Add tests for editor toolbar and delete confirmation**

Add:

```tsx
expect(screen.getByRole("tab", { name: /edit/i })).toBeInTheDocument();
expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
await userEvent.click(screen.getByRole("button", { name: /delete/i }));
expect(screen.getByRole("dialog", { name: /move document to trash/i })).toBeInTheDocument();
```

- [ ] **Step 2: Replace local controls**

Use `PageHeader`, `Tabs`, `ViewToolbar`, `TextField`, `TextareaField`, `InlineAlert`, and `ConfirmDialog`. Keep the editor state reset keyed to `doc.id` so switching documents refreshes drafts without clobbering same-doc local typing.

- [ ] **Step 3: Preserve router-safe preview links**

Keep `data-route` behavior and existing sanitizer allowlist.

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/docs/DocsView.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/docs packages/ui/src/theme/global.css
git commit -s -m "feat: migrate docs workspace"
```

### Task 12: Migrate roadmap and calendar controls

**Files:**

- Modify: `packages/ui/src/views/roadmap/RoadmapView.tsx`
- Modify: `packages/ui/src/views/calendar/CalendarView.tsx`

- [ ] **Step 1: Add tests for date controls**

Roadmap test:

```tsx
await userEvent.selectOptions(screen.getByLabelText(/zoom/i), "quarter");
expect(screen.getByLabelText(/zoom/i)).toHaveValue("quarter");
```

Calendar test:

```tsx
await userEvent.click(screen.getByRole("button", { name: /previous month/i }));
await userEvent.click(screen.getByRole("button", { name: /next month/i }));
await userEvent.click(screen.getByRole("button", { name: /today/i }));
```

- [ ] **Step 2: Replace controls with `ViewToolbar` and `IconButton`**

Use lucide icons `ChevronLeft`, `ChevronRight`, and `CalendarDays` with accessible names.

- [ ] **Step 3: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/roadmap src/views/calendar
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/views/roadmap packages/ui/src/views/calendar packages/ui/src/theme/global.css
git commit -s -m "feat: migrate roadmap and calendar controls"
```

## PR 6: Settings, Search, Command Palette, And Workflow QA

### Task 13: Reorganize settings and import/export

**Files:**

- Modify: `packages/ui/src/views/settings/SettingsView.tsx`
- Test: `packages/ui/src/views/settings/SettingsView.test.tsx`

- [ ] **Step 1: Add test for settings section navigation**

Assert section links:

```tsx
expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
expect(screen.getByRole("tab", { name: /storage and backups/i })).toBeInTheDocument();
expect(screen.getByRole("tab", { name: /import and export/i })).toBeInTheDocument();
```

- [ ] **Step 2: Replace horizontal tab strip**

Use a settings sidebar on desktop and compact tabs on narrow layouts.

- [ ] **Step 3: Replace `alert` import failure**

Use:

```tsx
<InlineAlert tone="danger">Import failed: {importError}</InlineAlert>
```

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/views/settings/SettingsView.test.tsx
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/settings packages/ui/src/theme/global.css
git commit -s -m "feat: reorganize settings experience"
```

### Task 14: Migrate search and command palette

**Files:**

- Modify: `packages/ui/src/views/search/SearchView.tsx`
- Modify: `packages/ui/src/commands/CommandPalette.tsx`

- [ ] **Step 1: Add tests for grouped search and keyboard selection**

Search test:

```tsx
await userEvent.type(screen.getByLabelText(/search/i), "auth");
expect(screen.getByRole("heading", { name: /items/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /docs/i })).toBeInTheDocument();
```

Command palette test:

```tsx
await userEvent.keyboard("{Control>}k{/Control}");
await userEvent.type(screen.getByRole("textbox"), "board");
await userEvent.keyboard("{ArrowDown}{Enter}");
expect(mockNavigate).toHaveBeenCalledWith("/board");
```

- [ ] **Step 2: Use shared search field, scope toggles, and result rows**

Keep current URL param behavior for search page.

- [ ] **Step 3: Keep keyboard shortcuts**

Retain `Ctrl/Cmd+K` and `C` behavior from `AppShell`.

- [ ] **Step 4: Run verification**

```bash
npm --workspace packages/ui run test -- src/commands src/views/search
npm --workspace packages/ui run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/views/search packages/ui/src/commands packages/ui/src/theme/global.css
git commit -s -m "feat: migrate discovery surfaces"
```

### Task 15: Add e2e workflow coverage and documentation updates

**Files:**

- Modify: `tests/e2e/project-workflow.spec.ts`
- Modify: `tests/e2e/hybrid-parity.spec.ts`
- Modify: `Readme.md`
- Modify: `AI.md`

- [ ] **Step 1: Add e2e item lifecycle path**

In `project-workflow.spec.ts`, cover:

```ts
await page.keyboard.press("c");
await page.getByRole("dialog", { name: /create work item/i }).getByLabel(/title/i).fill("Overhaul QA item");
await page.getByRole("button", { name: /create/i }).click();
await expect(page.getByRole("dialog", { name: /work item/i })).toBeVisible();
```

- [ ] **Step 2: Add e2e docs and settings path**

In `project-workflow.spec.ts`, add:

```ts
await page.getByRole("link", { name: /docs/i }).click();
await page.getByRole("tab", { name: /preview/i }).click();
await page.getByRole("link", { name: /settings/i }).click();
await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
await expect(page.getByRole("tab", { name: /import and export/i })).toBeVisible();
```

- [ ] **Step 3: Update `Readme.md`**

Add a concise note that the UI overhaul delivered shared primitives, modal-first item detail, migrated surfaces, and expanded verification.

- [ ] **Step 4: Update `AI.md`**

Document the new component boundary under `packages/ui/src/components/`, the modal-first item route, and the e2e coverage additions.

- [ ] **Step 5: Run full verification**

```bash
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:desktop
npm run test:e2e
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e Readme.md AI.md
git commit -s -m "test: cover ui overhaul workflows"
```

## Final Completion Checklist

- [ ] All route-local inline SVG icons in `AppShell.tsx` are gone.
- [ ] `WorkItemDrawer` is deleted or preserved only as a compatibility wrapper around `WorkItemModal`.
- [ ] `window.confirm`, `prompt`, and `alert` are removed from migrated UI paths.
- [ ] Board, backlog, table, bug triage, my work, search, roadmap, and calendar use shared work metadata components.
- [ ] Settings has task-oriented navigation and shared edit flows.
- [ ] Light and dark themes use the same semantic token structure.
- [ ] `npm test` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm run build:web` exits 0.
- [ ] `npm run build:desktop` exits 0.
- [ ] `npm run test:e2e` exits 0.

Plan complete and saved to `docs/superpowers/plans/2026-07-02-ui-ux-overhaul-implementation-plan.md`.

Execution options:

1. Subagent-Driven (recommended): dispatch a fresh subagent per task and review between tasks.
2. Inline Execution: execute tasks in this session using checkpoints.
