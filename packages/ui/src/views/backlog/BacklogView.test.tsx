import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BacklogView } from "./BacklogView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";

describe("BacklogView", () => {
  beforeEach(() => {
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
});
