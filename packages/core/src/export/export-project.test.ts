import { describe, expect, it } from "vitest";
import { createProjectBundle } from "../domain/project";
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
});
