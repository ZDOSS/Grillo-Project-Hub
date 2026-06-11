import { describe, expect, it } from "vitest";
import { createProjectBundle } from "../domain/project";
import { dispatchCommand, envelopeFor } from "./dispatcher";

describe("command dispatcher", () => {
  it("creates an item and bumps revision", () => {
    const bundle = createProjectBundle({ name: "P" });
    const env = envelopeFor({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Hello"
    }, "ui", null);
    const r = dispatchCommand(bundle, env);
    expect(r.bundle.core.items.length).toBe(1);
    expect(r.bundle.core.items[0].title).toBe("Hello");
    expect(r.bundle.project.revision).toBe(1);
  });

  it("rejects unknown command types", () => {
    const bundle = createProjectBundle({ name: "P" });
    expect(() => dispatchCommand(bundle, { type: "nope", payload: { type: "nope" } as never, source: "ui", actorId: null, idempotencyKey: "x", issuedAt: "now" })).toThrow();
  });

  it("enforces MVP one-level hierarchy", () => {
    const bundle = createProjectBundle({ name: "P" });
    const a = dispatchCommand(bundle, envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "A" }, "ui", null)).bundle;
    const b = dispatchCommand(a, envelopeFor({ type: "item.create", projectId: a.project.id, typeId: "task", title: "B", parentId: a.core.items[0].id }, "ui", null)).bundle;
    // Now b has a child of a; trying to make a a child of b should fail because a is now a parent of root.
    const aId = a.core.items[0].id;
    const bId = b.core.items[1].id;
    expect(() => dispatchCommand(b, envelopeFor({ type: "item.moveParent", projectId: b.project.id, itemId: aId, toParentId: bId }, "ui", null))).toThrow();
  });

  it("converts a checklist entry into a subtask atomically", () => {
    const bundle = createProjectBundle({ name: "P" });
    let b = bundle;
    b = dispatchCommand(b, envelopeFor({ type: "item.create", projectId: b.project.id, typeId: "task", title: "Parent" }, "ui", null)).bundle;
    const itemId = b.core.items[0].id;
    b = dispatchCommand(b, envelopeFor({ type: "item.addChecklistEntry", projectId: b.project.id, itemId, text: "Sub" }, "ui", null)).bundle;
    const entryId = b.core.items[0].checklist[0].id;
    b = dispatchCommand(b, envelopeFor({ type: "item.convertChecklistToSubtask", projectId: b.project.id, itemId, entryId }, "ui", null)).bundle;
    expect(b.core.items.length).toBe(2);
    expect(b.core.items[0].checklist.length).toBe(0);
    expect(b.core.items[1].parentId).toBe(itemId);
  });
});
