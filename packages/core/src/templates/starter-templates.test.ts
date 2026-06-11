import { describe, expect, it } from "vitest";
import { dispatchCommand, envelopeFor } from "../commands/dispatcher";
import { buildProjectFromTemplate } from "./starter-templates";

describe("starter templates", () => {
  it("creates bugs successfully in the software-project template", () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");

    const result = dispatchCommand(
      bundle,
      envelopeFor(
        {
          type: "item.create",
          projectId: bundle.project.id,
          typeId: "bug",
          title: "Bug from software template"
        },
        "ui",
        null
      )
    );

    expect(result.bundle.core.items.at(-1)?.statusId).toBe("inbox");
  });

  it("ships template-specific left-panel defaults", () => {
    const kanban = buildProjectFromTemplate("simple-kanban", "Kanban");
    const bugTracker = buildProjectFromTemplate("bug-tracker", "Bugs");

    expect(kanban.projectSettings.hiddenViewIds).toContain("bugs");
    expect(kanban.projectSettings.hiddenViewIds).toContain("docs");
    expect(bugTracker.projectSettings.hiddenViewIds).toContain("roadmap");
    expect(bugTracker.project.defaultTypeId).toBe("bug");
  });
});
