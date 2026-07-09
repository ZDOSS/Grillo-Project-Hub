import { describe, expect, it } from "vitest";
import { contentRevision, InMemoryProjectStore } from "./store";
import { createProjectBundle } from "../domain/project";
import { exportProjectJson } from "../export/export-project";

describe("InMemoryProjectStore", () => {
  it("uses the cross-runtime content fingerprint", () => {
    expect(contentRevision("hello")).toBe(1_335_831_723);
  });

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
    const first = await store.save("k1", json);
    expect(first.externalRevision).toBe(contentRevision(json));
    const externalJson = exportProjectJson({
      ...bundle,
      project: { ...bundle.project, name: "Changed elsewhere" }
    });
    await store.save("k1", externalJson);
    await expect(store.save("k1", json, first.externalRevision)).rejects.toThrow();
    await expect(store.save("missing", json, first.externalRevision)).rejects.toThrow();
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
