import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, exportProjectJson, InMemoryProjectStore } from "@gph/core";
import { restoreLastProjectSession, useProjectStore } from "./project-store";

describe("project session restore", () => {
  beforeEach(() => {
    const storage = localStorage as Storage & { clear?: () => void };
    storage.clear?.();
    useProjectStore.setState({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,
      lastSource: null
    });
    delete (window as typeof window & { __gph_store?: unknown }).__gph_store;
  });

  it("restores the last saved browser project on reload", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Restored Project");
    const adapter = new InMemoryProjectStore();
    await adapter.save(bundle.project.id, exportProjectJson(bundle));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = adapter;
    const storage = localStorage as Storage & { setItem?: (key: string, value: string) => void };

    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser"
    }));

    const restored = await restoreLastProjectSession();

    expect(restored).toBe(true);
    expect(useProjectStore.getState().bundle?.project.name).toBe("Restored Project");
    expect(useProjectStore.getState().storageKey).toBe(bundle.project.id);
  });

  it("restores folder trust from adapter metadata when persisted JSON is stale", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Restored Folder Project");
    const load = vi.fn(async () => {
      throw new Error("generic load should not restore folder sessions");
    });
    const loadFolderProject = vi.fn(async () => ({
      json: exportProjectJson({
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
      }),
      metadata: {
        key: "folder-alias",
        displayPath: "Client Folder/.pm-suite/folder-alias.pms.json",
        externalRevision: 2,
        trust: "folder" as const
      }
    }));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => true,
      load,
      loadFolderProject,
      save: async () => {
        throw new Error("unused");
      },
      delete: async () => {}
    };
    const storage = localStorage as Storage & { setItem?: (key: string, value: string) => void };

    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: bundle.project.id,
      storagePath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder"
    }));

    const restored = await restoreLastProjectSession();

    expect(restored).toBe(true);
    expect(loadFolderProject).toHaveBeenCalledWith(bundle.project.id);
    expect(load).not.toHaveBeenCalled();
    expect(useProjectStore.getState().storageTrust).toBe("folder");
    expect(useProjectStore.getState().storageKey).toBe("folder-alias");
    expect(useProjectStore.getState().bundle?.projectSettings.storageTrust).toBe("folder");
    expect(useProjectStore.getState().storagePath).toBe("Client Folder/.pm-suite/folder-alias.pms.json");
  });

  it("treats an explicit null storage key as an unsaved imported project", () => {
    const current = buildProjectFromTemplate("software-project", "Current Folder Project");
    const imported = buildProjectFromTemplate("software-project", "Imported Bundle");
    const storage = localStorage as Storage & {
      getItem?: (key: string) => string | null;
      setItem?: (key: string, value: string) => void;
    };
    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: "current-folder-project",
      storagePath: "Client Folder/.pm-suite/current-folder-project.pms.json",
      storageTrust: "folder"
    }));
    useProjectStore.setState({
      bundle: current,
      storageKey: "current-folder-project",
      storagePath: "Client Folder/.pm-suite/current-folder-project.pms.json",
      storageTrust: "folder",
      isDirty: false,
      saveStatus: "saved",
      lastSavedAt: "2026-07-06T00:00:00.000Z",
      saveError: null
    });

    useProjectStore.getState().setBundle(imported, {
      storageKey: null,
      storagePath: null,
      storageTrust: "browser"
    });

    const state = useProjectStore.getState();
    expect(state.bundle?.project.name).toBe("Imported Bundle");
    expect(state.storageKey).toBeNull();
    expect(state.storagePath).toBeNull();
    expect(state.storageTrust).toBe("browser");
    expect(state.isDirty).toBe(true);
    expect(state.saveStatus).toBe("idle");
    expect(state.lastSavedAt).toBeNull();
    expect(storage.getItem?.("gph.active.project")).toBeNull();
  });

  it("does not silently restore a folder session as browser recovery", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Needs Reconnect");
    const loadFolderProject = vi.fn(async () => null);
    const load = vi.fn(async (key: string) => ({
      json: exportProjectJson({
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
      }),
      metadata: {
        key,
        displayPath: null,
        externalRevision: 3,
        trust: "browser" as const
      }
    }));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => true,
      load,
      loadFolderProject,
      save: async () => {
        throw new Error("unused");
      },
      delete: async () => {}
    };
    const storage = localStorage as Storage & {
      getItem?: (key: string) => string | null;
      setItem?: (key: string, value: string) => void;
    };

    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: bundle.project.id,
      storagePath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder"
    }));

    const restored = await restoreLastProjectSession();

    expect(restored).toBe(false);
    expect(loadFolderProject).toHaveBeenCalledWith(bundle.project.id);
    expect(load).not.toHaveBeenCalled();
    expect(useProjectStore.getState().bundle).toBeNull();
    expect(storage.getItem?.("gph.active.project")).toBeNull();
  });

  it("clears a folder session when the adapter has no folder-aware loader", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Missing Loader");
    const load = vi.fn(async (key: string) => ({
      json: exportProjectJson({
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
      }),
      metadata: {
        key,
        displayPath: null,
        externalRevision: 3,
        trust: "browser" as const
      }
    }));
    (window as typeof window & { __gph_store?: unknown }).__gph_store = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => true,
      load,
      save: async () => {
        throw new Error("unused");
      },
      delete: async () => {}
    };
    const storage = localStorage as Storage & {
      getItem?: (key: string) => string | null;
      setItem?: (key: string, value: string) => void;
    };

    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: bundle.project.id,
      storagePath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder"
    }));

    const restored = await restoreLastProjectSession();

    expect(restored).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(useProjectStore.getState().bundle).toBeNull();
    expect(storage.getItem?.("gph.active.project")).toBeNull();
  });

  it("clears the saved session when restore fails validation", async () => {
    (window as typeof window & { __gph_store?: unknown }).__gph_store = {
      capabilities: { folderBacked: false, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => true,
      load: async () => ({
        json: "{}",
        metadata: {
          key: "broken-project",
          displayPath: null,
          externalRevision: null,
          trust: "browser" as const
        }
      }),
      save: async () => {
        throw new Error("unused");
      },
      delete: async () => {}
    };
    const storage = localStorage as Storage & {
      getItem?: (key: string) => string | null;
      setItem?: (key: string, value: string) => void;
    };

    storage.setItem?.("gph.active.project", JSON.stringify({
      storageKey: "broken-project",
      storagePath: null,
      storageTrust: "browser"
    }));

    const restored = await restoreLastProjectSession();

    expect(restored).toBe(false);
    expect(storage.getItem?.("gph.active.project")).toBeNull();
    expect(useProjectStore.getState().bundle).toBeNull();
  });
});
