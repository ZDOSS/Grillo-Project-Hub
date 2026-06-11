import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BoardView } from "./BoardView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";

const { navigateSpy } = vi.hoisted(() => ({
  navigateSpy: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateSpy
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("BoardView", () => {
  beforeEach(() => {
    useProjectStore.setState({ bundle: null });
    navigateSpy.mockReset();
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

  it("opens the work item when the card body is clicked", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const created = useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Open me",
      statusId: "ready"
    }).bundle;

    const item = created.core.items.find((entry) => entry.title === "Open me")!;
    const kanbanModule = created.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    render(<MemoryRouter><BoardView view={view} /></MemoryRouter>);

    const card = screen
      .getAllByRole("link")
      .find((entry) => entry.textContent?.includes("Open me"));
    expect(card).toBeDefined();
    const title = card?.querySelector(".board-card-title");
    expect(title).toBeTruthy();
    fireEvent.click(title!);

    expect(navigateSpy).toHaveBeenCalledWith(`/item/${item.id}`);
  });

  it("opens the work item from keyboard activation with link semantics", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const created = useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Keyboard open",
      statusId: "ready"
    }).bundle;

    const item = created.core.items.find((entry) => entry.title === "Keyboard open")!;
    const kanbanModule = created.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    render(<MemoryRouter><BoardView view={view} /></MemoryRouter>);

    const card = screen
      .getAllByRole("link")
      .find((entry) => entry.textContent?.includes("Keyboard open"));
    expect(card).toBeDefined();

    card!.focus();
    await userEvent.keyboard("{Enter}");

    expect(navigateSpy).toHaveBeenCalledWith(`/item/${item.id}`);
  });
});
