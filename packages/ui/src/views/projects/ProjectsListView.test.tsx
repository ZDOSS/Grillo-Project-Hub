import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildProjectFromTemplate, exportProjectJson, InMemoryProjectStore } from "@gph/core";
import { ProjectsListView } from "./ProjectsListView";
import { useWorkspaceStore } from "../../store/workspace-store";
import { useProjectStore } from "../../store/project-store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("ProjectsListView", () => {
  beforeEach(() => {
    const storage = localStorage as Storage & { clear?: () => void };
    storage.clear?.();
    storage.removeItem?.("gph.workspace");
    storage.removeItem?.("gph.desktop.folder");
    useProjectStore.setState({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false,
      lastSource: null
    });
    useWorkspaceStore.setState({
      localMemberId: null,
      recents: [],
      setLocalMember: useWorkspaceStore.getState().setLocalMember,
      recordRecent: useWorkspaceStore.getState().recordRecent,
      removeRecent: useWorkspaceStore.getState().removeRecent
    });
    delete (window as typeof window & { __gph_store?: unknown }).__gph_store;
  });

  it("reopens a recent saved project from the active storage adapter", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Saved Project");
    const adapter = new InMemoryProjectStore();
    await adapter.save(bundle.project.id, exportProjectJson(bundle));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;

    useWorkspaceStore.setState({
      ...useWorkspaceStore.getState(),
      recents: [
        {
          key: bundle.project.id,
          name: bundle.project.name,
          storagePath: null,
          trust: "browser",
          lastOpenedAt: new Date("2026-06-11T12:00:00.000Z").toISOString()
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProjectsListView />} />
          <Route path="/board" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: /open/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/board");
    });
    expect(useProjectStore.getState().bundle?.project.name).toBe("Saved Project");
  });

  it("uses inline confirmation before deleting a saved browser project", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Delete Me");
    const adapter = new InMemoryProjectStore();
    await adapter.save(bundle.project.id, exportProjectJson(bundle));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;

    useWorkspaceStore.setState({
      ...useWorkspaceStore.getState(),
      recents: [
        {
          key: bundle.project.id,
          name: bundle.project.name,
          storagePath: null,
          trust: "browser",
          lastOpenedAt: new Date("2026-06-11T12:00:00.000Z").toISOString()
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProjectsListView />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText(/Delete this saved browser project/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    await waitFor(async () => {
      expect(await adapter.load(bundle.project.id)).toBeNull();
    });
  });
});
