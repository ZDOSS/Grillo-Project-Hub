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

  it("rejects a blocks relationship that would create a cycle", () => {
    const bundle = createProjectBundle({ name: "P" });
    let b = bundle;
    const a = dispatchCommand(b, envelopeFor({ type: "item.create", projectId: b.project.id, typeId: "task", title: "A" }, "ui", null)).bundle;
    const aId = a.core.items[0].id;
    const bb = dispatchCommand(a, envelopeFor({ type: "item.create", projectId: a.project.id, typeId: "task", title: "B" }, "ui", null)).bundle;
    const bId = bb.core.items[1].id;
    // A blocks B
    const ab = dispatchCommand(bb, envelopeFor({ type: "relationship.create", projectId: bb.project.id, relationshipType: "blocks", sourceItemId: aId, targetItemId: bId }, "ui", null)).bundle;
    // B blocks A should be rejected
    expect(() => dispatchCommand(ab, envelopeFor({ type: "relationship.create", projectId: ab.project.id, relationshipType: "blocks", sourceItemId: bId, targetItemId: aId }, "ui", null))).toThrow(/cycle/);
  });

  it("view commands do not mutate the input bundle", () => {
    const bundle = createProjectBundle({ name: "P" });
    const beforeViews = JSON.parse(JSON.stringify((bundle.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views));
    const r = dispatchCommand(bundle, envelopeFor({ type: "view.create", projectId: bundle.project.id, viewType: "backlog", name: "My Backlog" }, "ui", null));
    // Original bundle reference is unchanged
    const afterViews = (bundle.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    expect(Object.keys(afterViews).length).toBe(Object.keys(beforeViews).length);
    // New bundle has the new view
    const newViews = (r.bundle.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    expect(Object.keys(newViews).length).toBe(Object.keys(beforeViews).length + 1);
  });

  it("permanently deletes an item and cascades to relationships, reminders, attachments, and doc links", () => {
    const bundle = createProjectBundle({ name: "P" });
    let b = bundle;
    // Create two items.
    const a = dispatchCommand(b, envelopeFor({ type: "item.create", projectId: b.project.id, typeId: "task", title: "A" }, "ui", null)).bundle;
    const aId = a.core.items[0].id;
    const bb = dispatchCommand(a, envelopeFor({ type: "item.create", projectId: a.project.id, typeId: "task", title: "B" }, "ui", null)).bundle;
    const bId = bb.core.items[1].id;
    // Relationship A blocks B.
    const withRel = dispatchCommand(bb, envelopeFor({ type: "relationship.create", projectId: bb.project.id, relationshipType: "blocks", sourceItemId: aId, targetItemId: bId }, "ui", null)).bundle;
    // Reminder and attachment on A.
    const withRem = dispatchCommand(withRel, envelopeFor({ type: "reminder.create", projectId: withRel.project.id, targetType: "workItem", targetId: aId, remindAt: "2030-01-01T00:00:00.000Z", timeZone: "UTC", message: "hi" }, "ui", null)).bundle;
    const withAtt = dispatchCommand(withRem, envelopeFor({ type: "attachment.add", projectId: withRem.project.id, filename: "f.txt", mediaType: "text/plain", size: 1, itemId: aId }, "ui", null)).bundle;
    // Doc body with a link to A and an embed of A.
    const docBody = `Before [[item:${aId}|link]] and ![[item:${aId}]] after.`;
    const withDoc = dispatchCommand(withAtt, envelopeFor({ type: "doc.create", projectId: withAtt.project.id, title: "Doc", body: docBody }, "ui", null)).bundle;
    // Trash A first.
    const trashed = dispatchCommand(withDoc, envelopeFor({ type: "item.trash", projectId: withDoc.project.id, itemId: aId }, "ui", null)).bundle;
    // Now permanently delete A.
    const r = dispatchCommand(trashed, envelopeFor({ type: "item.permanentlyDelete", projectId: trashed.project.id, itemId: aId }, "ui", null));

    // Item gone
    expect(r.bundle.core.items.find((i) => i.id === aId)).toBeUndefined();
    // Trash entry gone
    expect(r.bundle.core.trash.find((t) => t.recordType === "workItem" && t.recordId === aId)).toBeUndefined();
    // Relationship gone
    expect(r.bundle.core.relationships).toEqual([]);
    // Reminder gone
    expect(r.bundle.core.reminders.find((rm) => rm.targetId === aId)).toBeUndefined();
    // Attachment gone
    expect(r.bundle.core.attachments.find((at) => at.itemId === aId)).toBeUndefined();
    // Doc body stripped of the dangling reference and embed
    const doc = r.bundle.core.documents[r.bundle.core.documents.length - 1];
    expect(doc.body).not.toContain(`[[item:${aId}`);
    expect(doc.body).toContain("(deleted item)");
  });

  it("updates project settings through the command surface", () => {
    const bundle = createProjectBundle({ name: "P" });
    const r = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "project.updateSettings",
          projectId: bundle.project.id,
          patch: {
            pluginTrustMode: "curated",
            hiddenViewIds: ["docs", "calendar"]
          }
        } as never,
        "ui",
        null
      )
    );

    expect(r.bundle.projectSettings.pluginTrustMode).toBe("curated");
    expect((r.bundle.projectSettings as typeof r.bundle.projectSettings & { hiddenViewIds?: string[] }).hiddenViewIds).toEqual(["docs", "calendar"]);
  });

  it("archives a member and unassigns their items", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withMember = dispatchCommand(
      bundle,
      envelopeFor({ type: "member.create", projectId: bundle.project.id, displayName: "Ada" }, "ui", null)
    ).bundle;
    const memberId = withMember.core.members[0].id;
    const withItem = dispatchCommand(
      withMember,
      envelopeFor(
        {
          type: "item.create",
          projectId: withMember.project.id,
          typeId: "task",
          title: "Assigned item",
          assigneeId: memberId
        },
        "ui",
        null
      )
    ).bundle;

    const r = dispatchCommand(
      withItem,
      envelopeFor(
        {
          type: "member.delete",
          projectId: withItem.project.id,
          memberId
        } as never,
        "ui",
        null
      )
    );

    expect(r.bundle.core.members[0].archived).toBe(true);
    expect(r.bundle.core.items[0].assigneeId).toBeNull();
  });

  it("rejects member updates for unknown members", () => {
    const bundle = createProjectBundle({ name: "P" });
    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "member.update",
            projectId: bundle.project.id,
            memberId: "member_missing",
            patch: { displayName: "Nope" }
          } as never,
          "ui",
          null
        )
      )
    ).toThrow(/Member not found/);
  });

  it("preserves an empty hiddenViewIds array for legacy bundles", () => {
    const bundle = createProjectBundle({ name: "Legacy" });
    const legacy = {
      ...bundle,
      projectSettings: {
        ...bundle.projectSettings,
        hiddenViewIds: undefined as unknown as string[]
      }
    };

    const r = dispatchCommand(
      legacy,
      envelopeFor(
        {
          type: "project.updateSettings",
          projectId: legacy.project.id,
          patch: { pluginTrustMode: "curated" }
        } as never,
        "ui",
        null
      )
    );

    expect(r.bundle.projectSettings.hiddenViewIds).toEqual([]);
  });
});
