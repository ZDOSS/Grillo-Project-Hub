import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BacklogView } from "./BacklogView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";

describe("BacklogView", () => {
  beforeEach(() => {
    cleanup();
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
});
