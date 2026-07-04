import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate, type BoardView } from "@gph/core";
import { ProjectRouter } from "./ProjectRouter";
import { useProjectStore } from "./store/project-store";

function boardViews(bundle: ReturnType<typeof buildProjectFromTemplate>): Record<string, BoardView> {
  return ((bundle.modules["builtin.kanban"].data as { views?: Record<string, BoardView> }).views) ?? {};
}

describe("ProjectRouter", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("keeps the base board route on the project default board when saved boards have earlier ordering", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Project");
    useProjectStore.setState({ bundle });
    const defaultBoard = Object.values(boardViews(bundle)).find((view) => view.type === "board")!;

    const savedBundle = useProjectStore.getState().applyCommand({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "board",
      name: "Saved board",
      config: {
        columns: defaultBoard.columns,
        filter: { query: "saved-only" },
        order: 1
      }
    } as never).bundle;
    useProjectStore.setState({ bundle: savedBundle });

    render(
      <MemoryRouter initialEntries={["/board"]}>
        <ProjectRouter />
      </MemoryRouter>
    );

    expect(screen.getByRole("region", { name: "Board board" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Saved board board" })).not.toBeInTheDocument();
  });

  it("routes the project root to overview", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Project");
    useProjectStore.setState({ bundle });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProjectRouter />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });
});
