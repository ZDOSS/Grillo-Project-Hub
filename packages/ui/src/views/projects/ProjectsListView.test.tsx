import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildProjectFromTemplate, exportProjectJson, importProjectJson, InMemoryProjectStore, type ProjectStoreAdapter } from "@gph/core";
import { OpenProjectView, ProjectsListView } from "./ProjectsListView";
import { useWorkspaceStore } from "../../store/workspace-store";
import { useProjectStore } from "../../store/project-store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("ProjectsListView", () => {
  beforeEach(() => {
    cleanup();
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
          <Route path="/overview" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: /open/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(useProjectStore.getState().bundle?.project.name).toBe("Saved Project");
  });

  it("creates new projects into the overview landing surface", async () => {
    (window as typeof window & { __gph_store?: unknown }).__gph_store = new InMemoryProjectStore();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProjectsListView />} />
          <Route path="/overview" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(useProjectStore.getState().bundle?.project.name).toBe("My Project");
  });

  it("persists new folder-backed PWA projects immediately on create", async () => {
    const saves: Array<{ key: string; json: string }> = [];
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => false,
      load: async () => null,
      save: async (key, json) => {
        saves.push({ key, json });
        return {
          key,
          displayPath: `Client Folder/.pm-suite/${key}.pms.json`,
          externalRevision: 1,
          trust: "folder"
        };
      },
      delete: async () => {},
      chooseFolder: async () => "Client Folder",
      getCurrentFolderDisplay: async () => "Client Folder"
    };
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProjectsListView />} />
          <Route path="/overview" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    await screen.findByText(/Selected folder: Client Folder/i);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(saves).toHaveLength(1);
    expect(importProjectJson(saves[0].json).bundle.project.name).toBe("My Project");
    expect(importProjectJson(saves[0].json).bundle.projectSettings.storageTrust).toBe("folder");
    expect(useProjectStore.getState().storageTrust).toBe("folder");
    expect(useProjectStore.getState().bundle?.projectSettings.storageTrust).toBe("folder");
    expect(useWorkspaceStore.getState().recents[0]).toMatchObject({
      key: saves[0].key,
      storagePath: `Client Folder/.pm-suite/${saves[0].key}.pms.json`,
      trust: "folder"
    });
  });

  it("keeps the new project modal open when the backdrop is clicked", async () => {
    (window as typeof window & { __gph_store?: unknown }).__gph_store = new InMemoryProjectStore();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProjectsListView />
      </MemoryRouter>
    );

    const backdrop = document.querySelector(".modal-backdrop");
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop!);

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
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

  it("ignores a cancelled folder picker in the PWA flow", async () => {
    const cancelError = Object.assign(new Error("The user aborted a request."), { name: "AbortError" });
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => false,
      load: async () => null,
      save: async () => ({ key: "unused", displayPath: null, externalRevision: 1, trust: "browser" }),
      delete: async () => {},
      chooseFolder: async () => {
        throw cancelError;
      }
    };
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProjectsListView />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(screen.queryByText("The user aborted a request.")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens a listed folder project without requiring browser-local index metadata", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Project");
    const loadFolderProject = vi.fn(async (key: string) => ({
      json: exportProjectJson({ ...bundle, projectSettings: { ...bundle.projectSettings, storageTrust: "browser" } }),
      metadata: {
        key,
        displayPath: `Client Folder/.pm-suite/${key}.pms.json`,
        externalRevision: 7,
        trust: "folder" as const
      }
    }));
    const load = vi.fn(async () => null);
    const adapter: ProjectStoreAdapter & {
      loadFolderProject: typeof loadFolderProject;
    } = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => false,
      load,
      save: async (key) => ({ key, displayPath: null, externalRevision: 1, trust: "browser" }),
      delete: async () => {},
      chooseFolder: async () => "Client Folder",
      getCurrentFolderDisplay: async () => "Client Folder",
      listFolderProjects: async () => [`${bundle.project.id}.pms.json`],
      loadFolderProject
    };
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;

    render(
      <MemoryRouter initialEntries={["/open"]}>
        <Routes>
          <Route path="/open" element={<OpenProjectView />} />
          <Route path="/overview" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    await userEvent.click(screen.getByRole("button", { name: "List saved projects" }));
    await screen.findByText(`${bundle.project.id}.pms.json`);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(loadFolderProject).toHaveBeenCalledWith(bundle.project.id);
    expect(load).not.toHaveBeenCalled();
    expect(useProjectStore.getState().bundle?.project.name).toBe("Folder Project");
    expect(useProjectStore.getState().storageTrust).toBe("folder");
    expect(useProjectStore.getState().bundle?.projectSettings.storageTrust).toBe("folder");
  });
});
