import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { BoardView } from "./BoardView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";

describe("BoardView", () => {
  beforeEach(() => {
    useProjectStore.setState({ bundle: null });
  });
  it("groups cards by status column", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Fix auth bug", statusId: "inbox" });
    apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Ship docs", statusId: "ready" });

    const updated = useProjectStore.getState().bundle!;
    const kanbanModule = updated.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((v) => v.type === "board")!;
    render(<MemoryRouter><BoardView view={view} /></MemoryRouter>);
    expect(screen.getByText(/To Do/i)).toBeInTheDocument();
    expect(screen.getByText(/Fix auth bug/i)).toBeInTheDocument();
    expect(screen.getByText(/Ship docs/i)).toBeInTheDocument();
  });
});
