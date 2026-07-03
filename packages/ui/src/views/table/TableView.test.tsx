import { cleanup, render, screen } from "@testing-library/react";
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
});
