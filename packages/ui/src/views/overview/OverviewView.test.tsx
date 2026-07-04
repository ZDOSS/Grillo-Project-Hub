import { cleanup, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { OverviewView } from "./OverviewView";

function datePlus(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timestampPlus(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

describe("OverviewView", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false
    });
  });

  it("summarizes project health and links into planning surfaces", () => {
    const bundle = buildProjectFromTemplate("software-project", "Overview");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      isDirty: true
    });
    const apply = useProjectStore.getState().applyCommand;
    const milestone = bundle.core.milestones[0];
    apply({
      type: "milestone.update",
      projectId: bundle.project.id,
      milestoneId: milestone.id,
      patch: { targetDate: datePlus(14) }
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Completed milestone task",
      statusId: "done",
      milestoneId: milestone.id,
      startDate: datePlus(1),
      dueDate: datePlus(5)
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Blocked API",
      statusId: "ready",
      milestoneId: milestone.id,
      dueDate: datePlus(3)
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Auth dependency",
      statusId: "in-progress",
      dueDate: datePlus(2)
    });
    const current = useProjectStore.getState().bundle!;
    const blocked = current.core.items.find((item) => item.title === "Blocked API")!;
    const blocker = current.core.items.find((item) => item.title === "Auth dependency")!;
    apply({
      type: "relationship.create",
      projectId: current.project.id,
      relationshipType: "blocks",
      sourceItemId: blocker.id,
      targetItemId: blocked.id
    });
    apply({
      type: "item.create",
      projectId: current.project.id,
      typeId: "bug",
      title: "Unhandled intake bug",
      statusId: "inbox",
      priorityId: "urgent",
      moduleData: {
        bug: {
          severityId: "critical",
          reproductionSteps: [],
          expectedBehavior: "",
          actualBehavior: "",
          environment: "",
          affectedVersion: null
        }
      }
    } as never);
    apply({
      type: "reminder.create",
      projectId: current.project.id,
      targetType: "workItem",
      targetId: blocked.id,
      remindAt: timestampPlus(2),
      timeZone: "UTC",
      message: "Follow up on dependency"
    });

    render(
      <MemoryRouter>
        <OverviewView />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Browser-local")).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getAllByText("Completed milestone task").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blocked API").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unhandled intake bug").length).toBeGreaterThan(0);
    expect(screen.getByText("Follow up on dependency")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/roadmap");
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/calendar");
    expect(screen.getByRole("link", { name: "Bug triage" })).toHaveAttribute("href", "/bugs");
    expect(screen.getByRole("link", { name: "Table" })).toHaveAttribute("href", "/table");
  });

  it("counts only triage-lane bugs as overview intake pressure", () => {
    const bundle = buildProjectFromTemplate("software-project", "Overview");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Fresh intake bug",
      statusId: "inbox",
      moduleData: {
        bug: {
          severityId: "major",
          reproductionSteps: [],
          expectedBehavior: "",
          actualBehavior: "",
          environment: "",
          affectedVersion: null
        }
      }
    } as never);
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Accepted ready bug",
      statusId: "ready",
      moduleData: {
        bug: {
          severityId: "major",
          reproductionSteps: [],
          expectedBehavior: "",
          actualBehavior: "",
          environment: "",
          affectedVersion: null
        }
      }
    } as never);

    render(
      <MemoryRouter>
        <OverviewView />
      </MemoryRouter>
    );

    const intakePanel = screen.getByRole("region", { name: "Bug intake" });
    expect(within(intakePanel).getByText("Fresh intake bug")).toBeInTheDocument();
    expect(within(intakePanel).queryByText("Accepted ready bug")).not.toBeInTheDocument();
  });

  it("keeps stale reminders from hiding upcoming agenda work", () => {
    const bundle = buildProjectFromTemplate("software-project", "Overview");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Reminder target",
      statusId: "ready"
    });
    const item = useProjectStore.getState().bundle!.core.items.find((entry) =>
      entry.title === "Reminder target"
    )!;

    for (let index = 0; index < 7; index += 1) {
      apply({
        type: "reminder.create",
        projectId: bundle.project.id,
        targetType: "workItem",
        targetId: item.id,
        remindAt: timestampPlus(-10 - index),
        timeZone: "UTC",
        message: `Past reminder ${index}`
      });
    }
    apply({
      type: "reminder.create",
      projectId: bundle.project.id,
      targetType: "workItem",
      targetId: item.id,
      remindAt: timestampPlus(2),
      timeZone: "UTC",
      message: "Future reminder"
    });

    render(
      <MemoryRouter>
        <OverviewView />
      </MemoryRouter>
    );

    const agendaPanel = screen.getByRole("region", { name: "Upcoming agenda" });
    expect(within(agendaPanel).getByText("Future reminder")).toBeInTheDocument();
    expect(within(agendaPanel).queryByText("Past reminder 0")).not.toBeInTheDocument();
  });
});
