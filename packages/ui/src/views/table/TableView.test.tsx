import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { TableView } from "./TableView";

function rowIndexFor(title: string) {
  const rows = Array.from(document.querySelectorAll("tbody tr"));
  return rows.findIndex((row) => row.textContent?.includes(title));
}

describe("TableView", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("sorts priority descending with urgent work first by default", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Unranked table item", statusId: "inbox", priorityId: null });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Low table item", statusId: "inbox", priorityId: "low" });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Urgent table item", statusId: "inbox", priorityId: "urgent" });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    expect(rowIndexFor("Urgent table item")).toBeLessThan(rowIndexFor("Low table item"));
    expect(rowIndexFor("Low table item")).toBeLessThan(rowIndexFor("Unranked table item"));
  });

  it("sorts updated dates newest first when the Updated column is selected", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Older table item", statusId: "inbox" });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Newer table item", statusId: "inbox" });
    const current = useProjectStore.getState().bundle!;
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          items: current.core.items.map((item) => {
            if (item.title === "Older table item") return { ...item, updatedAt: "2026-01-01T00:00:00.000Z" };
            if (item.title === "Newer table item") return { ...item, updatedAt: "2026-01-02T00:00:00.000Z" };
            return item;
          })
        }
      }
    });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    await userEvent.click(screen.getByRole("button", { name: "Sort by updated date" }));

    expect(rowIndexFor("Newer table item")).toBeLessThan(rowIndexFor("Older table item"));
  });

  it("shows custom field columns with formatted values", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Risk table item", statusId: "inbox" });
    const withField = apply({
      type: "customField.define",
      projectId: bundle.project.id,
      field: { name: "Risk", type: "select", options: ["Low", "High"], applicableTypeIds: ["task"] }
    }).bundle;
    const item = withField.core.items.find((entry) => entry.title === "Risk table item")!;
    const field = withField.core.customFields.find((entry) => entry.name === "Risk")!;
    apply({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { customFields: { [field.id]: "High" } }
    });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    expect(screen.getByText("Risk")).toBeInTheDocument();
    const row = Array.from(document.querySelectorAll("tbody tr")).find((entry) =>
      entry.textContent?.includes("Risk table item")
    );
    expect(row).toHaveTextContent("High");
  });

  it("supports column visibility, inline status edits, and saved table views", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    expect(screen.getByText("Labels")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Labels column" }));
    expect(screen.queryByText("Labels")).not.toBeInTheDocument();

    const row = Array.from(document.querySelectorAll("tbody tr")).find((entry) =>
      entry.textContent?.includes("Add your first task")
    )!;
    await userEvent.selectOptions(within(row).getByLabelText("Status for Add your first task"), "done");
    expect(
      useProjectStore.getState().bundle!.core.items.find((item) => item.title === "Add your first task")?.statusId
    ).toBe("done");

    await userEvent.type(screen.getByLabelText("Filter"), "Welcome");
    await userEvent.type(screen.getByLabelText("View name"), "Welcome table");
    await userEvent.click(screen.getByRole("button", { name: "Save view" }));

    const savedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    const saved = Object.values(savedViews).find((view) => (view as { name?: string }).name === "Welcome table") as {
      filter?: { query?: string };
      type?: string;
      visibleColumns?: string[];
    };
    expect(saved.type).toBe("table");
    expect(saved.filter?.query).toBe("Welcome");
    expect(saved.visibleColumns).not.toContain("labels");
  });

  it("preserves multi-value saved table filters and renders saved column order", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withDone = apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Done table task", statusId: "done" }).bundle;
    const withSaved = apply({
      type: "view.create",
      projectId: withDone.project.id,
      viewType: "table",
      name: "Ready and done table",
      config: {
        columnOrder: ["priority", "title", "status"],
        filter: { statusIds: ["ready", "done"] },
        order: 256,
        sort: { field: "priority", direction: "desc" },
        visibleColumns: ["priority", "title", "status"]
      }
    } as never).bundle;
    const savedView = Object.values((withSaved.modules["builtin.kanban"].data as { views?: Record<string, Parameters<typeof TableView>[0]["view"]> }).views ?? {})
      .find((entry) => entry.name === "Ready and done table")!;

    render(<MemoryRouter><TableView view={savedView} /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /welcome to your board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /done table task/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /add your first task/i })).not.toBeInTheDocument();

    const headers = Array.from(document.querySelectorAll("thead th")).map((header) => header.textContent?.trim());
    expect(headers.slice(0, 3)).toEqual(["Priority (desc)", "Title", "Status"]);

    await userEvent.click(screen.getByRole("button", { name: "Update view" }));

    const updatedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, { name?: string; columnOrder?: string[]; filter?: { statusIds?: string[] } }> }).views ?? {};
    const updated = Object.values(updatedViews).find((entry) => entry.name === "Ready and done table")!;
    expect(updated.filter?.statusIds).toEqual(["ready", "done"]);
    expect(updated.columnOrder).toEqual(["priority", "title", "status"]);
  });
});
