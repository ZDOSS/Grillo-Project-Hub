import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildProjectFromTemplate, exportProjectJson, importProjectJson, type ProjectStoreAdapter, type WatchEvent } from "@gph/core";
import { AppShell } from "./AppShell";
import { ThemeProvider } from "./theme/theme-provider";
import { useProjectStore } from "./store/project-store";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("AppShell", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useProjectStore.setState({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false,
      lastSource: null,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });
    delete (window as typeof window & { __gph_store?: unknown }).__gph_store;
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

  it("routes an open project from the app root to overview while keeping Projects as a launcher link", async () => {
    const bundle = buildProjectFromTemplate("simple-kanban", "Project");
    useProjectStore.setState({ bundle });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <AppShell appMode="web">
            <Routes>
              <Route path="/" element={<LocationProbe />} />
              <Route path="/overview" element={<LocationProbe />} />
              <Route path="/projects" element={<LocationProbe />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(screen.getByRole("link", { name: /Projects/i })).toHaveAttribute("href", "/projects");
  });

  it("exposes project navigation through a mobile sheet", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Project");
    useProjectStore.setState({ bundle });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Open workspace navigation" }));

    const sheet = screen.getByRole("dialog", { name: "Workspace navigation" });
    expect(within(sheet).getByRole("navigation", { name: "Mobile workspace navigation" })).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: /Calendar/i })).toHaveAttribute("href", "/calendar");

    await userEvent.click(within(sheet).getByRole("button", { name: "Close workspace navigation" }));
    expect(screen.queryByRole("dialog", { name: "Workspace navigation" })).not.toBeInTheDocument();
  });

  it("claims Escape when the mobile sheet closes above another overlay", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Project");
    useProjectStore.setState({ bundle });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Open workspace navigation" }));
    expect(screen.getByRole("dialog", { name: "Workspace navigation" })).toBeInTheDocument();

    const underlyingOverlayClose = vi.fn();
    window.addEventListener("keydown", underlyingOverlayClose);
    try {
      await userEvent.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Workspace navigation" })).not.toBeInTheDocument()
      );
      expect(underlyingOverlayClose).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", underlyingOverlayClose);
    }
  });

  it("shows save destination, last save time, and unsaved state in the header", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Saved Project");
    useProjectStore.setState({
      bundle: {
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
      },
      storageKey: bundle.project.id,
      storagePath: `Client/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder",
      isDirty: false,
      saveStatus: "saved",
      lastSavedAt: new Date().toISOString(),
      saveError: null
    });

    const { rerender } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole("status", { name: /saved to folder - just now/i })).toBeInTheDocument();

    useProjectStore.setState({
      ...useProjectStore.getState(),
      isDirty: true,
      saveStatus: "idle"
    });
    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole("status", { name: /unsaved changes to folder/i })).toBeInTheDocument();
  });

  it("surfaces auto-save failures from the project store", () => {
    const bundle = buildProjectFromTemplate("software-project", "Save Error Project");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      isDirty: true,
      saveStatus: "error",
      saveError: "Disk permission denied"
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole("status", { name: /save failed/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Disk permission denied");
  });

  it("lets users manually save, switch projects, and close the current project from the header", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Unsaved Import");
    const save = vi.fn(async (key: string, json: string) => ({
      key,
      displayPath: null,
      externalRevision: 1,
      trust: "browser" as const
    }));
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: false, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => false,
      load: async () => null,
      save,
      delete: async () => {}
    };
    (window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store = adapter;
    useProjectStore.setState({
      bundle,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: true,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <Routes>
              <Route path="/overview" element={<LocationProbe />} />
              <Route path="/projects" element={<LocationProbe />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledOnce();
    });
    expect(save).toHaveBeenCalledWith(bundle.project.id, expect.any(String), null);
    expect(useProjectStore.getState()).toMatchObject({
      storageKey: bundle.project.id,
      storageTrust: "browser",
      isDirty: false,
      saveStatus: "saved"
    });

    await userEvent.click(screen.getByRole("button", { name: "Switch project" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/projects");

    await userEvent.click(screen.getByRole("button", { name: "Close project" }));
    expect(useProjectStore.getState().bundle).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("requires confirmation before closing a dirty project", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Dirty Project");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      isDirty: true,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <Routes>
              <Route path="/overview" element={<LocationProbe />} />
              <Route path="/projects" element={<LocationProbe />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Close project" }));

    expect(screen.getByRole("dialog", { name: "Close project without saving?" })).toBeInTheDocument();
    expect(useProjectStore.getState().bundle).not.toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/overview");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Close project without saving?" })).not.toBeInTheDocument();
    expect(useProjectStore.getState().bundle).not.toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/overview");

    await userEvent.click(screen.getByRole("button", { name: "Close project" }));
    await userEvent.click(screen.getByRole("button", { name: "Close without saving" }));

    expect(useProjectStore.getState().bundle).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });

  it("requires confirmation before closing an unsaved in-memory project", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Imported Project");
    useProjectStore.setState({
      bundle,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <Routes>
              <Route path="/overview" element={<LocationProbe />} />
              <Route path="/projects" element={<LocationProbe />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Close project" }));

    expect(screen.getByRole("dialog", { name: "Close project without saving?" })).toHaveTextContent(
      "This project has not been saved yet."
    );
    expect(useProjectStore.getState().bundle).not.toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/overview");
  });

  it("writes manual save payloads with the adapter destination trust", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Import");
    const save = vi.fn(async (key: string) => ({
      key,
      displayPath: `Client/.pm-suite/${key}.pms.json`,
      externalRevision: 1,
      trust: "folder" as const
    }));
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => false,
      load: async () => null,
      save,
      delete: async () => {},
      getCurrentFolderDisplay: async () => "Client"
    };
    (window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store = adapter;
    useProjectStore.getState().setBundle(bundle, {
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved"
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledOnce();
    });
    const savedJson = save.mock.calls[0][1];
    expect(importProjectJson(savedJson).bundle.projectSettings.storageTrust).toBe("folder");
    expect(useProjectStore.getState().storageTrust).toBe("folder");
  });

  it("offers explicit conflict actions when the active project changes externally", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Original Project");
    const reloaded = {
      ...bundle,
      project: { ...bundle.project, name: "Reloaded Project" },
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" as const }
    };
    let watchHandler: ((event: WatchEvent) => void) | null = null;
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: true, fileWatch: true, attachments: true },
      list: async () => [],
      has: async () => true,
      load: async (key) => ({
        json: exportProjectJson(reloaded),
        metadata: {
          key: "folder-alias",
          displayPath: "Client/.pm-suite/folder-alias.pms.json",
          externalRevision: 2,
          trust: "folder"
        }
      }),
      save: async (key) => ({ key, displayPath: null, externalRevision: 1, trust: "browser" }),
      delete: async () => {},
      watch: (handler) => {
        watchHandler = handler;
        return () => undefined;
      }
    };
    (window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store = adapter;
    useProjectStore.setState({
      bundle: {
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
      },
      storageKey: bundle.project.id,
      storagePath: `Client/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder"
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => watchHandler?.({ type: "externalChange", key: bundle.project.id, newRevision: 2 }));

    expect(await screen.findByText(/changed outside Grillo/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload from storage" }));

    await waitFor(() => {
      expect(useProjectStore.getState().bundle?.project.name).toBe("Reloaded Project");
    });
    expect(useProjectStore.getState().storageKey).toBe("folder-alias");
    expect(useProjectStore.getState().storagePath).toBe("Client/.pm-suite/folder-alias.pms.json");
    expect(screen.queryByText(/changed outside Grillo/i)).not.toBeInTheDocument();
  });

  it("reloads renamed external projects from the watcher new key", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Original Project");
    const renamedBundle = {
      ...bundle,
      project: { ...bundle.project, name: "Renamed Project" },
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" as const }
    };
    let watchHandler: ((event: WatchEvent) => void) | null = null;
    const loadFolderProject = vi.fn(async (key: string) => {
      if (key !== "renamed-project") return null;
      return {
        json: exportProjectJson(renamedBundle),
        metadata: {
          key,
          displayPath: "Client/.pm-suite/renamed-project.pms.json",
          externalRevision: 3,
          trust: "folder" as const
        }
      };
    });
    const adapter: ProjectStoreAdapter = {
      capabilities: { folderBacked: true, fileWatch: true, attachments: true },
      list: async () => [],
      has: async () => true,
      load: async () => null,
      loadFolderProject,
      save: async (key) => ({ key, displayPath: null, externalRevision: 1, trust: "browser" }),
      delete: async () => {},
      watch: (handler) => {
        watchHandler = handler;
        return () => undefined;
      }
    };
    (window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store = adapter;
    useProjectStore.setState({
      bundle: {
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
      },
      storageKey: bundle.project.id,
      storagePath: `Client/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder"
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => watchHandler?.({ type: "renamed", oldKey: bundle.project.id, newKey: "renamed-project" }));

    expect(await screen.findByText(/renamed outside Grillo/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload from storage" }));

    await waitFor(() => {
      expect(useProjectStore.getState().bundle?.project.name).toBe("Renamed Project");
    });
    expect(loadFolderProject).toHaveBeenCalledWith("renamed-project");
    expect(useProjectStore.getState().storageKey).toBe("renamed-project");
    expect(useProjectStore.getState().storagePath).toBe("Client/.pm-suite/renamed-project.pms.json");
  });

  it("shows offline and install affordances when the browser reports them", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const bundle = buildProjectFromTemplate("software-project", "Offline Project");
    useProjectStore.setState({ bundle, storageKey: bundle.project.id, storageTrust: "browser" });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();

    const prompt = vi.fn(async () => undefined);
    act(() => {
      window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), {
        preventDefault: vi.fn(),
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted" })
      }));
    });

    await userEvent.click(await screen.findByRole("button", { name: "Install app" }));
    expect(prompt).toHaveBeenCalledOnce();
  });
});
