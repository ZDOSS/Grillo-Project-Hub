import { beforeEach, describe, expect, it } from "vitest";
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
    (window as typeof window & { __gph_store?: unknown }).__gph_store = {
      capabilities: { folderBacked: true, fileWatch: false, attachments: true },
      list: async () => [],
      has: async () => true,
      load: async () => ({
        json: exportProjectJson({
          ...bundle,
          projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
        }),
        metadata: {
          key: bundle.project.id,
          displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
          externalRevision: 2,
          trust: "folder" as const
        }
      }),
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
    expect(useProjectStore.getState().storageTrust).toBe("folder");
    expect(useProjectStore.getState().bundle?.projectSettings.storageTrust).toBe("folder");
    expect(useProjectStore.getState().storagePath).toBe(`Client Folder/.pm-suite/${bundle.project.id}.pms.json`);
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
