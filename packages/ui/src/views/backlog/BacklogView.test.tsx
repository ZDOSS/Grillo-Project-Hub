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
});
