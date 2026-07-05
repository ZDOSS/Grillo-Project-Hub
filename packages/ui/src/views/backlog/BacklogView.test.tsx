import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BacklogView } from "./BacklogView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";

describe("BacklogView", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
    useProjectStore.setState({ bundle: null });
  });
  it("renders items in priority order", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Unranked note", statusId: "inbox", priorityId: null });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Later task", statusId: "inbox", priorityId: "low" });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Urgent bug", statusId: "inbox", priorityId: "urgent" });
    render(<MemoryRouter><BacklogView /></MemoryRouter>);
    const rows = Array.from(document.querySelectorAll(".backlog-row"));
    const urgentIdx = rows.findIndex((r) => r.textContent?.includes("Urgent bug"));
    const unrankedIdx = rows.findIndex((r) => r.textContent?.includes("Unranked note"));
    const laterIdx = rows.findIndex((r) => r.textContent?.includes("Later task"));
    expect(urgentIdx).toBeGreaterThanOrEqual(0);
    expect(unrankedIdx).toBeGreaterThanOrEqual(0);
    expect(urgentIdx).toBeLessThan(laterIdx);
    expect(laterIdx).toBeLessThan(unrankedIdx);
  });

  it("shows custom field metadata on backlog rows", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Risk backlog item", statusId: "inbox" });
    const withField = apply({
      type: "customField.define",
      projectId: bundle.project.id,
      field: { name: "Risk", type: "select", options: ["Low", "High"], applicableTypeIds: ["task"] }
    }).bundle;
    const item = withField.core.items.find((entry) => entry.title === "Risk backlog item")!;
    const field = withField.core.customFields.find((entry) => entry.name === "Risk")!;
    apply({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { customFields: { [field.id]: "High" } }
    });

    render(<MemoryRouter><BacklogView /></MemoryRouter>);

    const row = Array.from(document.querySelectorAll(".backlog-row")).find((entry) =>
      entry.textContent?.includes("Risk backlog item")
    );
    expect(row).toHaveTextContent("Risk: High");
  });

  it("filters backlog items by status and saves the filter as a named view", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });

    render(<MemoryRouter><BacklogView /></MemoryRouter>);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "ready");

    expect(screen.getByRole("link", { name: /welcome to your board/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /add your first task/i })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("View name"), "Ready backlog");
    await userEvent.click(screen.getByRole("button", { name: "Save view" }));

    const savedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    const saved = Object.values(savedViews).find((view) => (view as { name?: string }).name === "Ready backlog") as {
      filter?: { statusIds?: string[] };
      type?: string;
    };
    expect(saved.type).toBe("backlog");
    expect(saved.filter?.statusIds).toEqual(["ready"]);
  });

  it("creates backlog items that match the active planning filters", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Backlog");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withMember = apply({ type: "member.create", projectId: bundle.project.id, displayName: "Ada" }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    const milestone = withMember.core.milestones[0];

    render(
      <MemoryRouter>
        <BacklogView />
        <CreateItemDialog />
      </MemoryRouter>
    );

    await userEvent.selectOptions(screen.getByLabelText("Type"), "bug");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "ready");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), member.id);
    await userEvent.selectOptions(screen.getByLabelText("Milestone"), milestone.id);
    await userEvent.click(screen.getAllByRole("button", { name: "New item" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Create work item" });
    expect(within(dialog).getByLabelText("Type")).toHaveValue("bug");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("ready");
    expect(within(dialog).getByLabelText("Priority")).toHaveValue("urgent");
    expect(within(dialog).getByLabelText("Assignee")).toHaveValue(member.id);
    expect(within(dialog).getByLabelText("Milestone")).toHaveValue(milestone.id);

    await userEvent.type(within(dialog).getByLabelText("Title"), "Filtered backlog bug");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((entry) => entry.title === "Filtered backlog bug");
    expect(created).toMatchObject({
      typeId: "bug",
      statusId: "ready",
      priorityId: "urgent",
      assigneeId: member.id,
      milestoneId: milestone.id
    });
  });

  it("preserves multi-value saved backlog filters when updating the view", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withDone = apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Done backlog task", statusId: "done" }).bundle;
    const withSaved = apply({
      type: "view.create",
      projectId: withDone.project.id,
      viewType: "backlog",
      name: "Ready and done backlog",
      config: {
        filter: { statusIds: ["ready", "done"] },
        order: 256,
        sort: { field: "title", direction: "asc" }
      }
    } as never).bundle;
    const savedView = Object.values((withSaved.modules["builtin.kanban"].data as { views?: Record<string, Parameters<typeof BacklogView>[0]["view"]> }).views ?? {})
      .find((entry) => entry.name === "Ready and done backlog")!;

    render(<MemoryRouter><BacklogView view={savedView} /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /welcome to your board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /done backlog task/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /add your first task/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Update view" }));

    const updatedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, { name?: string; filter?: { statusIds?: string[] } }> }).views ?? {};
    const updated = Object.values(updatedViews).find((entry) => entry.name === "Ready and done backlog")!;
    expect(updated.filter?.statusIds).toEqual(["ready", "done"]);
  });
});
