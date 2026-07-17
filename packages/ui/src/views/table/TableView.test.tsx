import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { TableView } from "./TableView";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";

function rowIndexFor(title: string) {
  const rows = Array.from(document.querySelectorAll("tbody tr"));
  return rows.findIndex((row) => row.textContent?.includes(title));
}

describe("TableView", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
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
    await userEvent.click(screen.getByText("Columns"));
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

  it("creates table items that match the active planning filters", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withMember = apply({ type: "member.create", projectId: bundle.project.id, displayName: "Ada" }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    const milestone = withMember.core.milestones[0];

    render(
      <MemoryRouter>
        <TableView />
        <CreateItemDialog />
      </MemoryRouter>
    );

    await userEvent.selectOptions(screen.getByLabelText("Type"), "bug");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "ready");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), member.id);
    await userEvent.selectOptions(screen.getByLabelText("Milestone"), milestone.id);
    await userEvent.click(screen.getByRole("button", { name: "New item" }));

    const dialog = screen.getByRole("dialog", { name: "Create work item" });
    expect(within(dialog).getByLabelText("Type")).toHaveValue("bug");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("ready");
    expect(within(dialog).getByLabelText("Priority")).toHaveValue("urgent");
    expect(within(dialog).getByLabelText("Assignee")).toHaveValue(member.id);
    expect(within(dialog).getByLabelText("Milestone")).toHaveValue(milestone.id);

    await userEvent.type(within(dialog).getByLabelText("Title"), "Filtered table bug");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((entry) => entry.title === "Filtered table bug");
    expect(created).toMatchObject({
      typeId: "bug",
      statusId: "ready",
      priorityId: "urgent",
      assigneeId: member.id,
      milestoneId: milestone.id
    });
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

  it("applies bulk status priority and assignee updates to selected rows", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withMember = apply({
      type: "member.create",
      projectId: bundle.project.id,
      displayName: "Ada"
    }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Bulk first",
      statusId: "inbox",
      priorityId: "low"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Bulk second",
      statusId: "inbox",
      priorityId: "medium"
    });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    expect(screen.queryByLabelText("Bulk status")).not.toBeInTheDocument();
    expect(screen.getByText("Select rows to edit them together.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Bulk first" }));
    expect(screen.getByLabelText("Bulk status")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Bulk second" }));
    await userEvent.selectOptions(screen.getByLabelText("Bulk status"), "ready");
    await userEvent.selectOptions(screen.getByLabelText("Bulk priority"), "urgent");
    await userEvent.selectOptions(screen.getByLabelText("Bulk assignee"), member.id);
    await userEvent.click(screen.getByRole("button", { name: "Apply bulk changes" }));

    const updated = useProjectStore.getState().bundle!.core.items.filter((item) =>
      item.title === "Bulk first" || item.title === "Bulk second"
    );
    expect(updated).toHaveLength(2);
    expect(updated.every((item) => item.statusId === "ready")).toBe(true);
    expect(updated.every((item) => item.priorityId === "urgent")).toBe(true);
    expect(updated.every((item) => item.assigneeId === member.id)).toBe(true);
    expect(screen.getByText("Updated 2 items.")).toBeInTheDocument();
    expect(screen.queryByText("2 selected")).not.toBeInTheDocument();
  });

  it("applies bulk edits to selected rows that are hidden by the current filter", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Hidden bulk first",
      statusId: "inbox"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Hidden bulk second",
      statusId: "inbox"
    });

    render(<MemoryRouter><TableView /></MemoryRouter>);

    await userEvent.click(screen.getByRole("checkbox", { name: "Select Hidden bulk first" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Hidden bulk second" }));
    await userEvent.type(screen.getByLabelText("Filter"), "Hidden bulk first");

    expect(screen.getByText("2 selected (1 visible)")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Bulk status"), "ready");
    await userEvent.click(screen.getByRole("button", { name: "Apply bulk changes" }));

    const updated = useProjectStore.getState().bundle!.core.items.filter((item) =>
      item.title === "Hidden bulk first" || item.title === "Hidden bulk second"
    );
    expect(updated).toHaveLength(2);
    expect(updated.every((item) => item.statusId === "ready")).toBe(true);
  });

  it("warns users when the visible table is large enough to need filtering", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Large Table");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    for (let index = 0; index < 105; index += 1) {
      apply({
        type: "item.create",
        projectId: bundle.project.id,
        typeId: "task",
        title: `Large table item ${index + 1}`,
        statusId: "ready"
      });
    }

    render(<MemoryRouter><TableView /></MemoryRouter>);

    expect(screen.getByText("Large table view")).toBeInTheDocument();
    expect(screen.getByText(/filters or saved views/i)).toBeInTheDocument();
  });
});
