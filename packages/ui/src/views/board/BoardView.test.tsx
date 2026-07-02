import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BoardView } from "./BoardView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderBoard(view: Parameters<typeof BoardView>[0]["view"]) {
  render(
    <MemoryRouter initialEntries={["/board"]}>
      <Routes>
        <Route
          path="/board"
          element={
            <>
              <BoardView view={view} />
              <LocationProbe />
            </>
          }
        />
        <Route path="/item/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BoardView", () => {
  beforeEach(() => {
    cleanup();
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
    renderBoard(view);
    expect(screen.getByText(/To Do/i)).toBeInTheDocument();
    expect(screen.getByText(/Fix auth bug/i)).toBeInTheDocument();
    expect(screen.getByText(/Ship docs/i)).toBeInTheDocument();
  });

  it("opens the work item when the card title link is clicked", async () => {
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

    renderBoard(view);

    const link = screen.getByRole("link", { name: "Open me" });
    expect(link).toHaveAttribute("href", `/item/${item.id}`);

    await userEvent.click(link);

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/item/${item.id}`);
  });

  it("opens the work item when the card body is clicked", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const created = useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Whole card",
      statusId: "ready"
    }).bundle;

    const item = created.core.items.find((entry) => entry.title === "Whole card")!;
    const kanbanModule = created.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    renderBoard(view);

    const link = screen.getByRole("link", { name: /Whole card/ });
    const card = link.closest(".board-card");
    expect(card).toBeTruthy();

    await userEvent.click(card!);

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/item/${item.id}`);
  });

  it("opens the work item on the first click after a drag ends without navigation", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const created = useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Drag then open",
      statusId: "ready"
    }).bundle;

    const item = created.core.items.find((entry) => entry.title === "Drag then open")!;
    const kanbanModule = created.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    renderBoard(view);

    const link = screen.getByRole("link", { name: "Drag then open" });
    const card = link.closest(".board-card");
    expect(card).toBeTruthy();

    fireEvent.dragStart(card!, {
      dataTransfer: {
        setData: () => {},
        effectAllowed: "move"
      }
    });
    fireEvent.dragEnd(card!);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    await userEvent.click(link);

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/item/${item.id}`);
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

    renderBoard(view);

    const link = screen.getByRole("link", { name: "Keyboard open" });
    link.focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/item/${item.id}`);
  });
});
