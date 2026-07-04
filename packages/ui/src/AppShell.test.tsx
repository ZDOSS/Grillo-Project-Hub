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
});
