import { describe, expect, it } from "vitest";
import { InMemoryProjectStore } from "./store";
import { createProjectBundle } from "../domain/project";
import { exportProjectJson } from "../export/export-project";

describe("InMemoryProjectStore", () => {
  it("saves and reloads a project bundle", async () => {
    const store = new InMemoryProjectStore();
    const bundle = createProjectBundle({ name: "Demo" });
    const json = exportProjectJson(bundle);

    await store.save("k1", json);
    const loaded = await store.load("k1");
    expect(loaded?.json).toContain("\"name\": \"Demo\"");
  });

  it("rejects save when external revision mismatch", async () => {
    const store = new InMemoryProjectStore();
    const bundle = createProjectBundle({ name: "Demo" });
    const json = exportProjectJson(bundle);
    // First save (no existing revision, expectedRevision=0 succeeds and produces revision 1)
    await store.save("k1", json, 0);
    const meta = await store.save("k1", json, 1);
    expect(meta.externalRevision).toBe(2);
    // Now an old expectedRevision should be rejected
    await expect(store.save("k1", json, 0)).rejects.toThrow();
    // And an unknown key starts fresh
    await expect(store.save("k2", json)).resolves.toBeDefined();
  });

  it("lists metadata", async () => {
    const store = new InMemoryProjectStore();
    const bundle = createProjectBundle({ name: "Demo" });
    await store.save("k1", exportProjectJson(bundle));
    const list = await store.list();
    expect(list.find((m) => m.key === "k1")).toBeTruthy();
  });
});
