import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { RoadmapView } from "./RoadmapView";

describe("RoadmapView", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("shows milestone progress and dependency indicators", () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const milestone = bundle.core.milestones[0];
    apply({
      type: "milestone.update",
      projectId: bundle.project.id,
      milestoneId: milestone.id,
      patch: { targetDate: "2026-07-31" }
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Finished roadmap item",
      statusId: "done",
      milestoneId: milestone.id,
      startDate: "2026-07-01",
      dueDate: "2026-07-05"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Blocked roadmap item",
      statusId: "ready",
      milestoneId: milestone.id,
      startDate: "2026-07-06",
      dueDate: "2026-07-10"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Roadmap dependency",
      statusId: "in-progress",
      startDate: "2026-07-02",
      dueDate: "2026-07-04"
    });
    const current = useProjectStore.getState().bundle!;
    const blocked = current.core.items.find((item) => item.title === "Blocked roadmap item")!;
    const blocker = current.core.items.find((item) => item.title === "Roadmap dependency")!;
    apply({
      type: "relationship.create",
      projectId: current.project.id,
      relationshipType: "blocks",
      sourceItemId: blocker.id,
      targetItemId: blocked.id
    });

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);

    expect(screen.getByText("Target 2026-07-31")).toBeInTheDocument();
    expect(screen.getByText("1/2 complete")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Blocked by 1")).toBeInTheDocument();
  });

  it("updates dates and milestone from roadmap controls", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const firstMilestone = bundle.core.milestones[0];
    const secondMilestone = bundle.core.milestones[1];
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Moveable roadmap item",
      statusId: "ready",
      milestoneId: firstMilestone.id,
      startDate: "2026-07-01",
      dueDate: "2026-07-08"
    });

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Start date for Moveable roadmap item"), {
      target: { value: "2026-07-03" }
    });
    fireEvent.change(screen.getByLabelText("Due date for Moveable roadmap item"), {
      target: { value: "2026-07-12" }
    });
    await userEvent.selectOptions(
      screen.getByLabelText("Milestone for Moveable roadmap item"),
      secondMilestone.id
    );

    const updated = useProjectStore.getState().bundle!.core.items.find((item) =>
      item.title === "Moveable roadmap item"
    )!;
    expect(updated.startDate).toBe("2026-07-03");
    expect(updated.dueDate).toBe("2026-07-12");
    expect(updated.milestoneId).toBe(secondMilestone.id);
  });

  it("clears only the edited side of a roadmap date range", () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Clear start roadmap item",
      statusId: "ready",
      startDate: "2026-07-01",
      dueDate: "2026-07-08"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Clear due roadmap item",
      statusId: "ready",
      startDate: "2026-07-03",
      dueDate: "2026-07-10"
    });

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Start date for Clear start roadmap item"), {
      target: { value: "" }
    });
    fireEvent.change(screen.getByLabelText("Due date for Clear due roadmap item"), {
      target: { value: "" }
    });

    const updated = useProjectStore.getState().bundle!.core.items;
    expect(updated.find((item) => item.title === "Clear start roadmap item")).toMatchObject({
      startDate: null,
      dueDate: "2026-07-08"
    });
    expect(updated.find((item) => item.title === "Clear due roadmap item")).toMatchObject({
      startDate: "2026-07-03",
      dueDate: null
    });
  });
});
