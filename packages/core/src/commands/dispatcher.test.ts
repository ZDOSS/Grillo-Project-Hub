import { describe, expect, it } from "vitest";
import { createProjectBundle, validateProjectBundle } from "../domain/project";
import { buildProjectFromTemplate } from "../templates/starter-templates";
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

  it("rejects item commands that would create dangling references", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withItem = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Tracked" }, "ui", null)
    ).bundle;
    const itemId = withItem.core.items[0].id;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "item.create",
            projectId: bundle.project.id,
            typeId: "task",
            title: "Bad priority",
            priorityId: "priority_missing"
          },
          "ui",
          null
        )
      )
    ).toThrow(/Priority not found/);

    expect(() =>
      dispatchCommand(
        withItem,
        envelopeFor(
          {
            type: "item.update",
            projectId: withItem.project.id,
            itemId,
            patch: { statusId: "status_missing" }
          },
          "ui",
          null
        )
      )
    ).toThrow(/Status not found/);

    expect(() =>
      dispatchCommand(
        withItem,
        envelopeFor(
          {
            type: "item.update",
            projectId: withItem.project.id,
            itemId,
            patch: { labelIds: ["label_missing"] }
          },
          "ui",
          null
        )
      )
    ).toThrow(/Label not found/);
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

  it("rejects partial checklist reorders instead of dropping entries", () => {
    let bundle = createProjectBundle({ name: "P" });
    bundle = dispatchCommand(bundle, envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Parent" }, "ui", null)).bundle;
    const itemId = bundle.core.items[0].id;
    bundle = dispatchCommand(bundle, envelopeFor({ type: "item.addChecklistEntry", projectId: bundle.project.id, itemId, text: "One" }, "ui", null)).bundle;
    bundle = dispatchCommand(bundle, envelopeFor({ type: "item.addChecklistEntry", projectId: bundle.project.id, itemId, text: "Two" }, "ui", null)).bundle;
    const [firstEntry] = bundle.core.items[0].checklist;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "item.reorderChecklist", projectId: bundle.project.id, itemId, orderedIds: [firstEntry.id] }, "ui", null)
      )
    ).toThrow(/include every checklist entry/);
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

  it("creates saved planning views with shared filters, sort, and ordering", () => {
    let bundle = createProjectBundle({ name: "P" });
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "member.create", projectId: bundle.project.id, displayName: "Maya" }, "ui", null)
    ).bundle;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "label.create", projectId: bundle.project.id, name: "frontend" }, "ui", null)
    ).bundle;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "milestone.create", projectId: bundle.project.id, name: "v1" }, "ui", null)
    ).bundle;
    const memberId = bundle.core.members[0].id;
    const labelId = bundle.core.labels[0].id;
    const milestoneId = bundle.core.milestones[0].id;
    const statusId = bundle.core.statuses[0].id;
    const priorityId = bundle.core.priorities[0].id;
    const typeId = bundle.core.itemTypes[0].id;

    const result = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "view.create",
          projectId: bundle.project.id,
          viewType: "backlog",
          name: "Current release",
          config: {
            order: 512,
            groupBy: "status",
            filter: {
              query: "auth",
              typeIds: [typeId],
              statusIds: [statusId],
              priorityIds: [priorityId],
              assigneeIds: [memberId],
              labelIds: [labelId],
              milestoneIds: [milestoneId]
            },
            sort: { field: "dueDate", direction: "asc" }
          }
        } as never,
        "ui",
        null
      )
    );
    const views = (result.bundle.modules["builtin.kanban"].data as { views?: Record<string, unknown> }).views ?? {};
    const saved = Object.values(views).find((view) => (view as { name?: string }).name === "Current release") as {
      filter?: {
        query?: string;
        typeIds?: string[];
        statusIds?: string[];
        priorityIds?: string[];
        assigneeIds?: string[];
        labelIds?: string[];
        milestoneIds?: string[];
      };
      groupBy?: string;
      order?: number;
      sort?: { field?: string; direction?: string };
    };

    expect(saved.order).toBe(512);
    expect(saved.groupBy).toBe("status");
    expect(saved.filter?.query).toBe("auth");
    expect(saved.filter?.typeIds).toEqual([typeId]);
    expect(saved.filter?.statusIds).toEqual([statusId]);
    expect(saved.filter?.priorityIds).toEqual([priorityId]);
    expect(saved.filter?.assigneeIds).toEqual([memberId]);
    expect(saved.filter?.labelIds).toEqual([labelId]);
    expect(saved.filter?.milestoneIds).toEqual([milestoneId]);
    expect(saved.sort).toEqual({ field: "dueDate", direction: "asc" });
  });

  it("rejects saved view filters with dangling references", () => {
    const bundle = createProjectBundle({ name: "P" });

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "view.create",
            projectId: bundle.project.id,
            viewType: "table",
            name: "Broken table",
            config: { filter: { statusIds: ["status_missing"] } }
          } as never,
          "ui",
          null
        )
      )
    ).toThrow(/View filter status not found/);
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

  it("restores and permanently removes trashed documents through the command surface", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withDoc = dispatchCommand(
      bundle,
      envelopeFor({ type: "doc.create", projectId: bundle.project.id, title: "Recovery doc", body: "Keep this" }, "ui", null)
    ).bundle;
    const docId = withDoc.core.documents[0].id;
    const trashed = dispatchCommand(
      withDoc,
      envelopeFor({ type: "doc.delete", projectId: withDoc.project.id, docId }, "ui", null)
    ).bundle;

    const restored = dispatchCommand(
      trashed,
      envelopeFor({ type: "doc.restore", projectId: trashed.project.id, docId }, "ui", null)
    ).bundle;

    expect(restored.core.documents.find((doc) => doc.id === docId)?.title).toBe("Recovery doc");
    expect(restored.core.trash.find((entry) => entry.recordType === "document" && entry.recordId === docId)).toBeUndefined();

    const trashedAgain = dispatchCommand(
      restored,
      envelopeFor({ type: "doc.delete", projectId: restored.project.id, docId }, "ui", null)
    ).bundle;
    const permanentlyDeleted = dispatchCommand(
      trashedAgain,
      envelopeFor({ type: "doc.permanentlyDelete", projectId: trashedAgain.project.id, docId }, "ui", null)
    ).bundle;

    expect(permanentlyDeleted.core.documents.find((doc) => doc.id === docId)).toBeUndefined();
    expect(permanentlyDeleted.core.trash.find((entry) => entry.recordType === "document" && entry.recordId === docId)).toBeUndefined();
  });

  it("trashes a document without leaving active dependent references dangling", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withDoc = dispatchCommand(
      bundle,
      envelopeFor({ type: "doc.create", projectId: bundle.project.id, title: "Spec", body: "Details" }, "ui", null)
    ).bundle;
    const docId = withDoc.core.documents[0].id;
    const withAttachment = dispatchCommand(
      withDoc,
      envelopeFor({
        type: "attachment.add",
        projectId: withDoc.project.id,
        filename: "spec.png",
        mediaType: "image/png",
        size: 100,
        docId
      }, "ui", null)
    ).bundle;
    const attachmentId = withAttachment.core.attachments[0].id;
    const withReminder = dispatchCommand(
      withAttachment,
      envelopeFor({
        type: "reminder.create",
        projectId: withAttachment.project.id,
        targetType: "document",
        targetId: docId,
        remindAt: "2030-01-01T00:00:00.000Z",
        timeZone: "UTC"
      }, "ui", null)
    ).bundle;
    const reminderId = withReminder.core.reminders[0].id;

    const trashed = dispatchCommand(
      withReminder,
      envelopeFor({ type: "doc.delete", projectId: withReminder.project.id, docId }, "ui", null)
    ).bundle;

    expect(trashed.core.documents.some((doc) => doc.id === docId)).toBe(false);
    expect(trashed.core.attachments.some((attachment) => attachment.docId === docId)).toBe(false);
    expect(trashed.core.reminders.some((reminder) => reminder.targetType === "document" && reminder.targetId === docId)).toBe(false);
    expect(trashed.core.trash.some((entry) => entry.recordType === "attachment" && entry.recordId === attachmentId)).toBe(true);
    expect(() => validateProjectBundle(trashed)).not.toThrow();

    const restored = dispatchCommand(
      trashed,
      envelopeFor({ type: "doc.restore", projectId: trashed.project.id, docId }, "ui", null)
    ).bundle;

    expect(restored.core.documents.some((doc) => doc.id === docId)).toBe(true);
    expect(restored.core.reminders.some((reminder) => reminder.id === reminderId)).toBe(true);
    expect(restored.core.attachments.some((attachment) => attachment.id === attachmentId)).toBe(false);
    expect(restored.core.trash.some((entry) => entry.recordType === "attachment" && entry.recordId === attachmentId)).toBe(true);
    expect(() => validateProjectBundle(restored)).not.toThrow();
  });

  it("permanently deletes a document and removes document-scoped dependents", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withDoc = dispatchCommand(
      bundle,
      envelopeFor({ type: "doc.create", projectId: bundle.project.id, title: "Decision record", body: "Context" }, "ui", null)
    ).bundle;
    const docId = withDoc.core.documents[0].id;
    const withAttachment = dispatchCommand(
      withDoc,
      envelopeFor({
        type: "attachment.add",
        projectId: withDoc.project.id,
        filename: "decision.png",
        mediaType: "image/png",
        size: 100,
        docId
      }, "ui", null)
    ).bundle;
    const attachmentId = withAttachment.core.attachments[0].id;
    const withReminder = dispatchCommand(
      withAttachment,
      envelopeFor({
        type: "reminder.create",
        projectId: withAttachment.project.id,
        targetType: "document",
        targetId: docId,
        remindAt: "2030-01-01T00:00:00.000Z",
        timeZone: "UTC"
      }, "ui", null)
    ).bundle;
    const trashedAttachment = dispatchCommand(
      withReminder,
      envelopeFor({ type: "attachment.delete", projectId: withReminder.project.id, attachmentId }, "ui", null)
    ).bundle;
    const trashedDoc = dispatchCommand(
      trashedAttachment,
      envelopeFor({ type: "doc.delete", projectId: trashedAttachment.project.id, docId }, "ui", null)
    ).bundle;

    const permanentlyDeleted = dispatchCommand(
      trashedDoc,
      envelopeFor({ type: "doc.permanentlyDelete", projectId: trashedDoc.project.id, docId }, "ui", null)
    ).bundle;

    expect(permanentlyDeleted.core.documents.some((doc) => doc.id === docId)).toBe(false);
    expect(permanentlyDeleted.core.attachments.some((attachment) => attachment.docId === docId)).toBe(false);
    expect(permanentlyDeleted.core.reminders.some((reminder) => reminder.targetType === "document" && reminder.targetId === docId)).toBe(false);
    expect(permanentlyDeleted.core.trash.some((entry) => entry.recordType === "attachment" && entry.recordId === attachmentId)).toBe(false);
    expect(() => validateProjectBundle(permanentlyDeleted)).not.toThrow();
  });

  it("creates document sections and moves documents into them through commands", () => {
    let bundle = createProjectBundle({ name: "P" });
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "docFolder.create", projectId: bundle.project.id, name: "Decisions" } as never, "ui", null)
    ).bundle;
    const folder = bundle.core.folders.find((entry) => entry.name === "Decisions")!;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "doc.create", projectId: bundle.project.id, title: "Architecture decision", folderId: folder.id }, "ui", null)
    ).bundle;
    const doc = bundle.core.documents.find((entry) => entry.title === "Architecture decision")!;

    expect(doc.folderId).toBe(folder.id);
    expect(() => validateProjectBundle(bundle)).not.toThrow();

    const renamed = dispatchCommand(
      bundle,
      envelopeFor({ type: "docFolder.update", projectId: bundle.project.id, folderId: folder.id, patch: { name: "Decision records" } } as never, "ui", null)
    ).bundle;
    expect(renamed.core.folders.find((entry) => entry.id === folder.id)?.name).toBe("Decision records");

    expect(() =>
      dispatchCommand(
        renamed,
        envelopeFor({ type: "doc.move", projectId: renamed.project.id, docId: doc.id, toFolderId: "folder_missing" }, "ui", null)
      )
    ).toThrow(/Folder not found/);
  });

  it("rejects document section parent cycles", () => {
    let bundle = createProjectBundle({ name: "P" });
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "docFolder.create", projectId: bundle.project.id, name: "Parent" } as never, "ui", null)
    ).bundle;
    const parent = bundle.core.folders.find((entry) => entry.name === "Parent")!;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "docFolder.create", projectId: bundle.project.id, name: "Child", parentFolderId: parent.id } as never, "ui", null)
    ).bundle;
    const child = bundle.core.folders.find((entry) => entry.name === "Child")!;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "docFolder.update", projectId: bundle.project.id, folderId: parent.id, patch: { parentFolderId: child.id } } as never, "ui", null)
      )
    ).toThrow(/cycle/i);
  });

  it("creates documents from knowledge templates with useful default content", () => {
    const bundle = createProjectBundle({ name: "P" });

    const created = dispatchCommand(
      bundle,
      envelopeFor({ type: "doc.create", projectId: bundle.project.id, templateId: "decision" } as never, "ui", null)
    ).bundle;
    const doc = created.core.documents.at(-1)!;

    expect(doc.title).toBe("Decision Record");
    expect(doc.body).toContain("## Decision");
    expect(doc.body).toContain("## Consequences");
    expect(() => validateProjectBundle(created)).not.toThrow();

    expect(() =>
      dispatchCommand(
        created,
        envelopeFor({ type: "doc.create", projectId: created.project.id, templateId: "unknown-template" } as never, "ui", null)
      )
    ).toThrow(/Document template not found/);
  });

  it("restores and permanently removes trashed attachments through the command surface", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withItem = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Attachment owner" }, "ui", null)
    ).bundle;
    const itemId = withItem.core.items[0].id;
    const withAttachment = dispatchCommand(
      withItem,
      envelopeFor({
        type: "attachment.add",
        projectId: withItem.project.id,
        filename: "evidence.txt",
        mediaType: "text/plain",
        size: 12,
        itemId
      }, "ui", null)
    ).bundle;
    const attachmentId = withAttachment.core.attachments[0].id;
    const trashed = dispatchCommand(
      withAttachment,
      envelopeFor({ type: "attachment.delete", projectId: withAttachment.project.id, attachmentId }, "ui", null)
    ).bundle;

    const restored = dispatchCommand(
      trashed,
      envelopeFor({ type: "attachment.restore", projectId: trashed.project.id, attachmentId }, "ui", null)
    ).bundle;

    expect(restored.core.attachments.find((attachment) => attachment.id === attachmentId)?.filename).toBe("evidence.txt");
    expect(restored.core.trash.find((entry) => entry.recordType === "attachment" && entry.recordId === attachmentId)).toBeUndefined();

    const trashedAgain = dispatchCommand(
      restored,
      envelopeFor({ type: "attachment.delete", projectId: restored.project.id, attachmentId }, "ui", null)
    ).bundle;
    const permanentlyDeleted = dispatchCommand(
      trashedAgain,
      envelopeFor({ type: "attachment.permanentlyDelete", projectId: trashedAgain.project.id, attachmentId }, "ui", null)
    ).bundle;

    expect(permanentlyDeleted.core.attachments.find((attachment) => attachment.id === attachmentId)).toBeUndefined();
    expect(permanentlyDeleted.core.trash.find((entry) => entry.recordType === "attachment" && entry.recordId === attachmentId)).toBeUndefined();
  });

  it("validates custom field values when item updates include custom fields", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withFields = dispatchCommand(
      bundle,
      envelopeFor({
        type: "customField.define",
        projectId: bundle.project.id,
        field: {
          name: "Risk",
          type: "select",
          options: ["Low", "High"],
          required: true
        }
      }, "ui", null)
    ).bundle;
    const fieldId = withFields.core.customFields[0].id;
    const withItem = dispatchCommand(
      withFields,
      envelopeFor({ type: "item.create", projectId: withFields.project.id, typeId: "task", title: "Risky work" }, "ui", null)
    ).bundle;
    const itemId = withItem.core.items[0].id;

    expect(() =>
      dispatchCommand(
        withItem,
        envelopeFor({
          type: "item.update",
          projectId: withItem.project.id,
          itemId,
          patch: { customFields: { [fieldId]: "Medium" } }
        }, "ui", null)
      )
    ).toThrow(/unknown option/i);

    expect(() =>
      dispatchCommand(
        withItem,
        envelopeFor({
          type: "item.update",
          projectId: withItem.project.id,
          itemId,
          patch: { customFields: { [fieldId]: null } }
        }, "ui", null)
      )
    ).toThrow(/required/i);

    const updated = dispatchCommand(
      withItem,
      envelopeFor({
        type: "item.update",
        projectId: withItem.project.id,
        itemId,
        patch: { customFields: { [fieldId]: "High" } }
      }, "ui", null)
    ).bundle;

    expect(updated.core.items[0].customFields?.[fieldId]).toBe("High");
  });

  it("rejects new custom field values that do not apply to the item type", () => {
    const bundle = createProjectBundle({ name: "P" });
    const withFields = dispatchCommand(
      bundle,
      envelopeFor({
        type: "customField.define",
        projectId: bundle.project.id,
        field: {
          name: "Bug risk",
          type: "select",
          options: ["Low", "High"],
          applicableTypeIds: ["bug"]
        }
      }, "ui", null)
    ).bundle;
    const withGlobalField = dispatchCommand(
      withFields,
      envelopeFor({
        type: "customField.define",
        projectId: withFields.project.id,
        field: {
          name: "Owner note",
          type: "text"
        }
      }, "ui", null)
    ).bundle;
    const bugOnlyFieldId = withGlobalField.core.customFields.find((field) => field.name === "Bug risk")!.id;
    const globalFieldId = withGlobalField.core.customFields.find((field) => field.name === "Owner note")!.id;
    const withTask = dispatchCommand(
      withGlobalField,
      envelopeFor({ type: "item.create", projectId: withGlobalField.project.id, typeId: "task", title: "Task work" }, "ui", null)
    ).bundle;
    const taskId = withTask.core.items[0].id;

    expect(() =>
      dispatchCommand(
        withTask,
        envelopeFor({
          type: "item.update",
          projectId: withTask.project.id,
          itemId: taskId,
          patch: { customFields: { [bugOnlyFieldId]: "High" } }
        }, "ui", null)
      )
    ).toThrow(/does not apply/i);

    const withBug = dispatchCommand(
      withGlobalField,
      envelopeFor({ type: "item.create", projectId: withGlobalField.project.id, typeId: "bug", title: "Bug work" }, "ui", null)
    ).bundle;
    const bugId = withBug.core.items[0].id;
    const bugWithValue = dispatchCommand(
      withBug,
      envelopeFor({
        type: "item.update",
        projectId: withBug.project.id,
        itemId: bugId,
        patch: { customFields: { [bugOnlyFieldId]: "High" } }
      }, "ui", null)
    ).bundle;
    const taskWithHiddenValue = dispatchCommand(
      bugWithValue,
      envelopeFor({
        type: "item.update",
        projectId: bugWithValue.project.id,
        itemId: bugId,
        patch: { typeId: "task" }
      }, "ui", null)
    ).bundle;

    const editedWithHiddenValue = dispatchCommand(
      taskWithHiddenValue,
      envelopeFor({
        type: "item.update",
        projectId: taskWithHiddenValue.project.id,
        itemId: bugId,
        patch: { customFields: { [bugOnlyFieldId]: "High", [globalFieldId]: "Still editable" } }
      }, "ui", null)
    ).bundle;

    expect(editedWithHiddenValue.core.items.find((item) => item.id === bugId)?.customFields).toMatchObject({
      [bugOnlyFieldId]: "High",
      [globalFieldId]: "Still editable"
    });
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

  it("rejects unknown targets for registry and document mutations", () => {
    const bundle = createProjectBundle({ name: "P" });

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "status.update", projectId: bundle.project.id, statusId: "status_missing", patch: { name: "Missing" } }, "ui", null)
      )
    ).toThrow(/Status not found/);

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "label.update", projectId: bundle.project.id, labelId: "label_missing", patch: { name: "Missing" } }, "ui", null)
      )
    ).toThrow(/Label not found/);

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "doc.update", projectId: bundle.project.id, docId: "doc_missing", patch: { title: "Missing" } }, "ui", null)
      )
    ).toThrow(/Document not found/);

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "relationship.delete", projectId: bundle.project.id, relationshipId: "rel_missing" }, "ui", null)
      )
    ).toThrow(/Relationship not found/);
  });

  it("rejects reminder updates that would leave dangling targets", () => {
    let bundle = createProjectBundle({ name: "P" });
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Reminder target" }, "ui", null)
    ).bundle;
    const itemId = bundle.core.items[0].id;
    bundle = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "reminder.create",
          projectId: bundle.project.id,
          targetType: "workItem",
          targetId: itemId,
          remindAt: "2024-01-01T00:00:00.000Z",
          timeZone: "UTC"
        },
        "ui",
        null
      )
    ).bundle;
    const reminderId = bundle.core.reminders[0].id;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "reminder.update",
            projectId: bundle.project.id,
            reminderId,
            patch: { targetId: "item_missing" }
          },
          "ui",
          null
        )
      )
    ).toThrow(/Reminder item not found/);
  });

  it("rejects created saved board views with dangling status references", () => {
    const bundle = createProjectBundle({ name: "P" });
    const validStatusId = bundle.project.defaultInitialStatusId;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "view.create",
            projectId: bundle.project.id,
            viewType: "board",
            name: "Bad board",
            config: {
              columns: [
                {
                  name: "Broken",
                  statusIds: ["status_missing"],
                  defaultDropStatusId: validStatusId,
                  order: 1024
                }
              ]
            }
          } as never,
          "ui",
          null
        )
      )
    ).toThrow(/Board column status not found/);
  });

  it("rejects patched saved views with dangling references", () => {
    let bundle = createProjectBundle({ name: "P" });
    const views = ((bundle.modules["builtin.kanban"].data as { views?: Record<string, { id: string; type: string }> }).views) ?? {};
    const boardView = Object.values(views).find((view) => view.type === "board")!;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "view.update",
            projectId: bundle.project.id,
            viewId: boardView.id,
            patch: {
              columns: [
                {
                  id: "col_broken",
                  name: "Broken",
                  statusIds: [bundle.project.defaultInitialStatusId],
                  defaultDropStatusId: "status_missing",
                  order: 1024
                }
              ]
            }
          },
          "ui",
          null
        )
      )
    ).toThrow(/Board default drop status not found/);

    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "member.create", projectId: bundle.project.id, displayName: "Maya" }, "ui", null)
    ).bundle;
    const memberId = bundle.core.members[0].id;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "view.create", projectId: bundle.project.id, viewType: "myWork", name: "Mine", config: { memberId } }, "ui", null)
    ).bundle;
    const nextViews = ((bundle.modules["builtin.kanban"].data as { views?: Record<string, { id: string; type: string }> }).views) ?? {};
    const myWorkView = Object.values(nextViews).find((view) => view.type === "myWork")!;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "view.update",
            projectId: bundle.project.id,
            viewId: myWorkView.id,
            patch: { filterMemberId: "member_missing" }
          },
          "ui",
          null
        )
      )
    ).toThrow(/My Work member not found/);
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

  it("rejects project settings updates for a different project", () => {
    const bundle = createProjectBundle({ name: "P" });

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor(
          {
            type: "project.updateSettings",
            projectId: "project_other",
            patch: { pluginTrustMode: "unrestricted" }
          },
          "ui",
          null
        )
      )
    ).toThrow(/Project mismatch/);
  });

  it("stores edits previews disables and deletes automation rules", () => {
    let bundle = buildProjectFromTemplate("software-project", "Automation");
    const label = bundle.core.labels.find((entry) => entry.name === "frontend")!;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "task", title: "Preview target" }, "ui", null)
    ).bundle;
    const item = bundle.core.items.find((entry) => entry.title === "Preview target")!;

    const created = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "automationRule.create",
          projectId: bundle.project.id,
          rule: {
            name: "Label new tasks",
            trigger: { type: "item.created" },
            conditions: [{ type: "type.isOneOf", typeIds: ["task"] }],
            actions: [{ type: "addLabel", labelId: label.id }]
          }
        } as never,
        "ui",
        null
      )
    ).bundle;
    const rules = ((created.modules["builtin.automation"].data as { rules?: Array<{ id: string; name: string; enabled: boolean }> }).rules) ?? [];
    const rule = rules.find((entry) => entry.name === "Label new tasks")!;
    expect(rule.enabled).toBe(true);

    const preview = dispatchCommand(
      created,
      envelopeFor(
        {
          type: "automationRule.dryRun",
          projectId: created.project.id,
          ruleId: rule.id,
          itemId: item.id
        } as never,
        "ui",
        null
      )
    );
    expect(preview.bundle.project.revision).toBe(created.project.revision);
    expect(preview.output).toMatchObject({
      matched: true,
      actions: [{ type: "addLabel", summary: expect.stringContaining("frontend") }]
    });

    const disabled = dispatchCommand(
      created,
      envelopeFor({ type: "automationRule.setEnabled", projectId: created.project.id, ruleId: rule.id, enabled: false } as never, "ui", null)
    ).bundle;
    const disabledRule = ((disabled.modules["builtin.automation"].data as { rules?: Array<{ id: string; enabled: boolean }> }).rules)![0];
    expect(disabledRule.enabled).toBe(false);

    const renamed = dispatchCommand(
      disabled,
      envelopeFor({ type: "automationRule.update", projectId: disabled.project.id, ruleId: rule.id, patch: { name: "Label created tasks" } } as never, "ui", null)
    ).bundle;
    expect(((renamed.modules["builtin.automation"].data as { rules?: Array<{ name: string }> }).rules)![0].name).toBe("Label created tasks");

    const deleted = dispatchCommand(
      renamed,
      envelopeFor({ type: "automationRule.delete", projectId: renamed.project.id, ruleId: rule.id } as never, "ui", null)
    ).bundle;
    expect(((deleted.modules["builtin.automation"].data as { rules?: unknown[] }).rules) ?? []).toEqual([]);
  });

  it("executes enabled automation rules through validated commands", () => {
    let bundle = buildProjectFromTemplate("software-project", "Automation");
    const label = bundle.core.labels.find((entry) => entry.name === "frontend")!;
    bundle = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "automationRule.create",
          projectId: bundle.project.id,
          rule: {
            name: "Label bugs",
            trigger: { type: "item.created" },
            conditions: [{ type: "type.isOneOf", typeIds: ["bug"] }],
            actions: [
              { type: "addLabel", labelId: label.id },
              { type: "createSubtask", title: "Verify fix" },
              { type: "generateDoc", title: "Bug note" }
            ]
          }
        } as never,
        "ui",
        null
      )
    ).bundle;

    const created = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "bug", title: "Automated bug", statusId: "inbox" }, "ui", null)
    ).bundle;

    const bug = created.core.items.find((entry) => entry.title === "Automated bug")!;
    expect(bug.labelIds).toContain(label.id);
    expect(created.core.items.some((entry) => entry.parentId === bug.id && entry.title === "Verify fix")).toBe(true);
    expect(created.core.documents.some((entry) => entry.title === "Bug note" && entry.body.includes(`[[item:${bug.id}]]`))).toBe(true);
    expect(created.core.events.some((event) => event.type === "item.updated" && event.itemId === bug.id && event.source === "automation")).toBe(true);
    expect(created.core.events.some((event) => event.type === "automation.executed" && event.source === "automation")).toBe(true);
  });

  it("keeps the originating item command when an automation action fails validation", () => {
    let bundle = buildProjectFromTemplate("software-project", "Automation");
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "bugTriage.updateConfig", projectId: bundle.project.id, patch: { requireSeverityOrPriority: true } } as never, "ui", null)
    ).bundle;
    bundle = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "automationRule.create",
          projectId: bundle.project.id,
          rule: {
            name: "Move new bugs to ready",
            trigger: { type: "item.created" },
            conditions: [{ type: "type.isOneOf", typeIds: ["bug"] }],
            actions: [{ type: "moveToStatus", statusId: "ready" }]
          }
        } as never,
        "ui",
        null
      )
    ).bundle;

    const created = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "bug", title: "Ungraded automation bug", statusId: "inbox" }, "ui", null)
    ).bundle;

    const bug = created.core.items.find((entry) => entry.title === "Ungraded automation bug")!;
    expect(bug.statusId).toBe("inbox");
    expect(created.core.events.some((event) => event.type === "item.created" && event.itemId === bug.id)).toBe(true);
    expect(created.core.events).toContainEqual(
      expect.objectContaining({
        type: "automation.executed",
        itemId: bug.id,
        source: "automation",
        data: expect.objectContaining({
          ruleName: "Move new bugs to ready",
          actionCount: 0,
          failedActionCount: 1
        })
      })
    );
  });

  it("enforces configured bug intake severity or priority gates in the dispatcher", () => {
    let bundle = buildProjectFromTemplate("software-project", "Bugs");
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "bugTriage.updateConfig", projectId: bundle.project.id, patch: { requireSeverityOrPriority: true } } as never, "ui", null)
    ).bundle;
    bundle = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.create", projectId: bundle.project.id, typeId: "bug", title: "Ungraded bug", statusId: "inbox" }, "ui", null)
    ).bundle;
    const item = bundle.core.items.find((entry) => entry.title === "Ungraded bug")!;

    expect(() =>
      dispatchCommand(
        bundle,
        envelopeFor({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch: { statusId: "ready" } }, "ui", null)
      )
    ).toThrow(/severity or priority/i);

    const graded = dispatchCommand(
      bundle,
      envelopeFor({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch: { priorityId: "high" } }, "ui", null)
    ).bundle;
    const accepted = dispatchCommand(
      graded,
      envelopeFor({ type: "item.update", projectId: graded.project.id, itemId: item.id, patch: { statusId: "ready" } }, "ui", null)
    ).bundle;
    expect(accepted.core.items.find((entry) => entry.id === item.id)?.statusId).toBe("ready");
  });
});
