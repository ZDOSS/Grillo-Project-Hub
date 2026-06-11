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
});
