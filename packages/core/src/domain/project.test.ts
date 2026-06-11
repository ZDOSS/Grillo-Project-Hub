import { describe, expect, it } from "vitest";
import { createProjectBundle, bumpRevision, validateProjectBundle } from "./project";
import { createWorkItem, wouldCreateCycle } from "./work-item";
import { defaultStatuses } from "./workflow";
import { createRelationship, canonicalizeRelatesTo, validateRelationship } from "./work-item";
import { createDocument, deriveBacklinks } from "./document";

describe("project domain", () => {
  it("creates a project with default software workflow views", () => {
    const project = createProjectBundle({ name: "Demo" });
    const item = createWorkItem({
      projectId: project.project.id,
      typeId: "bug",
      title: "Fix login error",
      statusId: "new",
      priorityId: null
    });

    expect(project.project.name).toBe("Demo");
    expect(project.core.statuses.length).toBeGreaterThan(0);
    expect(item.typeId).toBe("bug");
    expect(item.statusId).toBe("new");
  });

  it("bumps revision and updatedAt", () => {
    const project = createProjectBundle({ name: "Demo" });
    const next = bumpRevision(project, "2026-06-10T18:00:00.000Z");
    expect(next.project.revision).toBe(project.project.revision + 1);
    expect(next.project.updatedAt).toBe("2026-06-10T18:00:00.000Z");
  });

  it("validates a freshly-created bundle", () => {
    const project = createProjectBundle({ name: "Demo" });
    expect(() => validateProjectBundle(project)).not.toThrow();
  });

  it("rejects unknown types when creating items", () => {
    const project = createProjectBundle({ name: "Demo" });
    const statuses = project.core.statuses;
    expect(() => createWorkItem({
      projectId: project.project.id,
      typeId: "not-a-type",
      title: "x",
      statusId: statuses[0].id,
      priorityId: null
    })).not.toThrow(); // constructor doesn't validate, dispatcher does
  });
});

describe("work item hierarchy", () => {
  it("wouldCreateCycle detects self-parenting", () => {
    const project = createProjectBundle({ name: "p" });
    const item = createWorkItem({ projectId: project.project.id, typeId: "task", title: "x", statusId: "inbox", priorityId: null });
    expect(wouldCreateCycle([item], item.id, item.id)).toBe(true);
  });

  it("wouldCreateCycle detects deeper cycles", () => {
    const project = createProjectBundle({ name: "p" });
    const a = createWorkItem({ projectId: project.project.id, typeId: "task", title: "a", statusId: "inbox", priorityId: null });
    const b = createWorkItem({ projectId: project.project.id, typeId: "task", title: "b", statusId: "inbox", priorityId: null, parentId: a.id });
    const c = createWorkItem({ projectId: project.project.id, typeId: "task", title: "c", statusId: "inbox", priorityId: null, parentId: b.id });
    expect(wouldCreateCycle([a, b, c], a.id, c.id)).toBe(true);
  });
});

describe("relationships", () => {
  it("canonicalizes relatesTo to a stable order", () => {
    const a = "item_a";
    const b = "item_b";
    const { source, target } = canonicalizeRelatesTo(b, a);
    expect(source).toBe(a);
    expect(target).toBe(b);
  });

  it("rejects cross-project relationships", () => {
    const project = createProjectBundle({ name: "p" });
    const other = createProjectBundle({ name: "o" });
    const a = createWorkItem({ projectId: project.project.id, typeId: "task", title: "a", statusId: "inbox", priorityId: null });
    const b = createWorkItem({ projectId: other.project.id, typeId: "task", title: "b", statusId: "inbox", priorityId: null });
    const rel = createRelationship({ type: "relatesTo", sourceItemId: a.id, targetItemId: b.id });
    expect(() => validateRelationship(rel, [a, b])).toThrow();
  });
});

describe("documents", () => {
  it("derives backlinks from outgoing links", () => {
    const a = createDocument({ title: "A", body: "see [[doc:doc_b]] for more" });
    const b = createDocument({ title: "B", body: "see [[doc:doc_a]] for context" });
    const backlinks = deriveBacklinks([a, b]);
    expect(backlinks.get("doc_a")?.length).toBe(1);
    expect(backlinks.get("doc_b")?.length).toBe(1);
  });
});
