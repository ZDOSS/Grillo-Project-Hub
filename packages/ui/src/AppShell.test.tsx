import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { AppShell } from "./AppShell";
import { ThemeProvider } from "./theme/theme-provider";
import { useProjectStore } from "./store/project-store";

describe("AppShell", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("renders the shared product frame", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/board"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByRole("banner", { name: /Grillo Project Hub/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search commands/i })).toBeInTheDocument();
  });

  it("shows saved planning views in the project view bar without ignoring hidden base views", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Project");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withSavedView = apply({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "backlog",
      name: "Ready backlog",
      config: { filter: { statusIds: ["ready"] }, order: 256 }
    } as never).bundle;
    useProjectStore.setState({
      bundle: {
        ...withSavedView,
        projectSettings: {
          ...withSavedView.projectSettings,
          hiddenViewIds: ["backlog"]
        }
      }
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/board"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.queryByRole("tab", { name: "Backlog" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ready backlog" })).toHaveAttribute("href", expect.stringMatching(/\/backlog\/view\//));
  });

  it("does not show saved planning views whose routes are not registered", () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Project");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withBugView = apply({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "bugs",
      name: "Saved bugs",
      config: { order: 256 }
    } as never).bundle;
    useProjectStore.setState({ bundle: withBugView });
    const withMyWorkView = useProjectStore.getState().applyCommand({
      type: "view.create",
      projectId: bundle.project.id,
      viewType: "myWork",
      name: "Saved my work",
      config: { memberId: "", order: 512 }
    } as never).bundle;
    useProjectStore.setState({ bundle: withMyWorkView });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/board"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.queryByRole("tab", { name: "Saved bugs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Saved my work" })).not.toBeInTheDocument();
  });
});
