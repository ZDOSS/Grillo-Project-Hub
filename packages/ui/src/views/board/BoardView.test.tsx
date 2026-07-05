import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BoardView } from "./BoardView";
import { useProjectStore } from "../../store/project-store";
import { buildProjectFromTemplate } from "@gph/core";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";

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
    closeCreateItem();
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

  it("opens the work item when the card link is clicked", async () => {
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

    const link = screen.getByRole("link", { name: /Open me\s+Ready/ });
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

    const link = screen.getByRole("link", { name: /Drag then open\s+Ready/ });
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

    const link = screen.getByRole("link", { name: /Keyboard open\s+Ready/ });
    link.focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/item/${item.id}`);
  });

  it("creates new board items in the first board column by default", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const kanbanModule = bundle.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, { id: string; type: string; name: string; columns: Array<{ id: string; name: string; statusIds: string[]; defaultDropStatusId: string; wipLimit?: number | null; wipMode?: "warn" | "hard"; order: number }> }> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    render(
      <MemoryRouter initialEntries={["/board"]}>
        <Routes>
          <Route
            path="/board"
            element={
              <>
                <BoardView view={view} />
                <CreateItemDialog />
              </>
            }
          />
          <Route path="/item/:id" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "New item" }));

    expect(screen.getByLabelText("Status")).toHaveValue("ready");

    await userEvent.type(screen.getByLabelText("Title"), "Board-created task");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((entry) => entry.title === "Board-created task");
    expect(created?.statusId).toBe("ready");
  });

  it("creates board items that match the active type and status filters", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const kanbanModule = bundle.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, Parameters<typeof BoardView>[0]["view"]> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    render(
      <MemoryRouter initialEntries={["/board"]}>
        <Routes>
          <Route
            path="/board"
            element={
              <>
                <BoardView view={view} />
                <CreateItemDialog />
              </>
            }
          />
          <Route path="/item/:id" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.selectOptions(screen.getByLabelText("Board type"), "bug");
    await userEvent.selectOptions(screen.getByLabelText("Board status"), "done");
    await userEvent.click(screen.getByRole("button", { name: "New item" }));

    const dialog = screen.getByRole("dialog", { name: "Create work item" });
    expect(within(dialog).getByLabelText("Type")).toHaveValue("bug");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("done");

    await userEvent.type(within(dialog).getByLabelText("Title"), "Filtered board bug");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((entry) => entry.title === "Filtered board bug");
    expect(created).toMatchObject({ typeId: "bug", statusId: "done" });
  });

  it("filters board cards by text and saves the filter as a named board view", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const updated = apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Fix auth bug", statusId: "inbox" }).bundle;
    apply({ type: "item.create", projectId: updated.project.id, typeId: "task", title: "Ship docs", statusId: "ready" });
    const current = useProjectStore.getState().bundle!;
    const kanbanModule = current.modules["builtin.kanban"];
    const views = (kanbanModule.data as { views?: Record<string, Parameters<typeof BoardView>[0]["view"]> }).views ?? {};
    const view = Object.values(views).find((entry) => entry.type === "board")!;

    renderBoard(view);

    await userEvent.type(screen.getByLabelText("Filter board"), "docs");

    expect(screen.queryByText("Fix auth bug")).not.toBeInTheDocument();
    expect(screen.getByText("Ship docs")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("View name"), "Docs board");
    await userEvent.click(screen.getByRole("button", { name: "Save view" }));

    const savedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    const saved = Object.values(savedViews).find((entry) => (entry as { name?: string }).name === "Docs board") as {
      filter?: { query?: string };
      type?: string;
    };
    expect(saved.type).toBe("board");
    expect(saved.filter?.query).toBe("docs");
  });

  it("preserves multi-status saved board filters when updating the view", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Test");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withDone = apply({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Done task", statusId: "done" }).bundle;
    const board = Object.values((withDone.modules["builtin.kanban"].data as { views?: Record<string, Parameters<typeof BoardView>[0]["view"]> }).views ?? {})
      .find((entry) => entry.type === "board")!;
    const withSaved = apply({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "board",
      name: "Ready and done",
      config: {
        columns: board.columns,
        filter: { statusIds: ["ready", "done"] },
        order: 256
      }
    } as never).bundle;
    const savedView = Object.values((withSaved.modules["builtin.kanban"].data as { views?: Record<string, Parameters<typeof BoardView>[0]["view"]> }).views ?? {})
      .find((entry) => entry.name === "Ready and done")!;

    renderBoard(savedView);

    expect(screen.getByText("Welcome to your board")).toBeInTheDocument();
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.queryByText("Add your first task")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Update view" }));

    const updatedViews = (useProjectStore.getState().bundle!.modules["builtin.kanban"].data as { views?: Record<string, { name?: string; filter?: { statusIds?: string[] } }> }).views ?? {};
    const updated = Object.values(updatedViews).find((entry) => entry.name === "Ready and done")!;
    expect(updated.filter?.statusIds).toEqual(["ready", "done"]);
  });
});
