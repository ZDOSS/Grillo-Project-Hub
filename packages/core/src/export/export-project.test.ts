import { describe, expect, it } from "vitest";
import { createProjectBundle } from "../domain/project";
import { createDocument, createFolder } from "../domain/document";
import { exportProjectJson, exportProjectMarkdown, exportProjectCsv } from "./export-project";
import { importProjectJson } from "../import/import-project";

describe("export", () => {
  it("exports JSON", () => {
    const project = createProjectBundle({ name: "Demo" });
    const json = exportProjectJson(project);
    expect(json).toContain("\"name\": \"Demo\"");
  });

  it("exports Markdown", () => {
    const project = createProjectBundle({ name: "Demo" });
    const md = exportProjectMarkdown(project);
    expect(md).toContain("# Demo");
  });

  it("exports Markdown docs grouped by section", () => {
    const project = createProjectBundle({ name: "Demo" });
    const folder = createFolder({ id: "folder_decisions", name: "Decisions" });
    const sectionDoc = createDocument({ id: "doc_decision", title: "ADR 001", folderId: folder.id });
    const unfiledDoc = createDocument({ id: "doc_unfiled", title: "Loose notes" });
    const withDocs = {
      ...project,
      core: {
        ...project.core,
        folders: [folder],
        documents: [sectionDoc, unfiledDoc]
      }
    };

    const md = exportProjectMarkdown(withDocs);

    expect(md).toContain("### Decisions");
    expect(md).toContain("- [ADR 001](doc:doc_decision)");
    expect(md).toContain("### Unfiled");
    expect(md).toContain("- [Loose notes](doc:doc_unfiled)");
  });

  it("exports CSV with header row", () => {
    const project = createProjectBundle({ name: "Demo" });
    const csv = exportProjectCsv(project);
    expect(csv.split("\n")[0]).toContain("title");
  });
});

describe("import", () => {
  it("round-trips through JSON", () => {
    const project = createProjectBundle({ name: "Demo" });
    const json = exportProjectJson(project);
    const r = importProjectJson(json);
    expect(r.bundle.project.name).toBe("Demo");
    expect(r.bundle.project.revision).toBe(0);
  });

  it("rejects invalid JSON", () => {
    expect(() => importProjectJson("{not-json")).toThrow();
  });

  it("rejects JSON bundles with dangling references", () => {
    const project = createProjectBundle({ name: "Demo" });
    const parsed = JSON.parse(exportProjectJson(project));
    parsed.core.items = [
      {
        id: "item_bad",
        projectId: parsed.project.id,
        typeId: "task",
        title: "Bad item",
        description: "",
        statusId: "status_missing",
        priorityId: null,
        assigneeId: null,
        reporterId: null,
        labelIds: [],
        milestoneId: null,
        parentId: null,
        startDate: null,
        dueDate: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        checklist: [],
        comments: []
      }
    ];

    expect(() => importProjectJson(JSON.stringify(parsed))).toThrow(/Status not found/);
  });

  it("remaps every cross-reference when idPrefix is supplied", () => {
    const project = createProjectBundle({ name: "Demo" });
    // Add a child item with full cross-refs and a relationship + a board view status ref.
    const json = exportProjectJson(project);
    const parsed = JSON.parse(json);
    const firstType = parsed.core.itemTypes[0];
    const firstStatus = parsed.core.statuses[0];
    // Add a label and a milestone to the parsed bundle before creating items,
    // so we can verify their IDs are remapped.
    parsed.core.labels = [{ id: "lbl_x", name: "Tag", color: null }];
    parsed.core.milestones = [{ id: "ms_x", name: "M1", description: null, targetDate: null, archived: false }];
    const parent = {
      id: "parent_x",
      projectId: parsed.project.id,
      typeId: firstType.id,
      title: "Parent",
      description: "",
      statusId: firstStatus.id,
      priorityId: null,
      assigneeId: null,
      reporterId: null,
      labelIds: ["lbl_x"],
      milestoneId: "ms_x",
      parentId: null,
      startDate: null,
      dueDate: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      checklist: [],
      comments: []
    };
    const child = {
      ...parent,
      id: "child_x",
      title: "Child",
      parentId: "parent_x"
    };
    parsed.core.items = [parent, child];
    parsed.core.relationships = [
      { id: "rel_x", type: "blocks", sourceItemId: "parent_x", targetItemId: "child_x" }
    ];
    const r = importProjectJson(JSON.stringify(parsed), { idPrefix: "imp_" });

    const findItem = (id: string) => r.bundle.core.items.find((i) => i.id === id);
    const parentAfter = findItem("imp_parent_x");
    const childAfter = findItem("imp_child_x");
    expect(parentAfter).toBeDefined();
    expect(childAfter).toBeDefined();
    expect(childAfter!.parentId).toBe("imp_parent_x");
    expect(childAfter!.statusId).toBe(`imp_${firstStatus.id}`);
    expect(childAfter!.typeId).toBe(`imp_${firstType.id}`);
    expect(childAfter!.labelIds).toEqual(["imp_lbl_x"]);
    expect(childAfter!.milestoneId).toBe("imp_ms_x");
    expect(r.bundle.core.relationships[0].sourceItemId).toBe("imp_parent_x");
    expect(r.bundle.core.relationships[0].targetItemId).toBe("imp_child_x");
    expect(r.bundle.core.relationships[0].id).toBe("imp_rel_x");
    expect(r.bundle.project.defaultTypeId).toBe(`imp_${firstType.id}`);
    expect(r.bundle.project.defaultInitialStatusId).toBe(`imp_${firstStatus.id}`);
    // View column defaultDropStatusId is also remapped
    const kanban = r.bundle.modules["builtin.kanban"];
    const views = (kanban.data as { views?: Record<string, { type: string; columns?: { defaultDropStatusId: string; statusIds: string[] }[] }> }).views ?? {};
    for (const v of Object.values(views)) {
      if (v.type !== "board" || !v.columns) continue;
      for (const col of v.columns) {
        expect(col.defaultDropStatusId.startsWith("imp_") || col.defaultDropStatusId === firstStatus.id).toBe(true);
      }
    }
    // No dangling warnings
    const dangling = r.warnings.filter((w) => w.startsWith("Dangling"));
    expect(dangling).toEqual([]);
  });
});
