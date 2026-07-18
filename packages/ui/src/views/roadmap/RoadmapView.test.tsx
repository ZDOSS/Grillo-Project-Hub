import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { closeCreateItem } from "../../commands/palette-bus";
import { useProjectStore } from "../../store/project-store";
import { CreateItemDialog } from "../../work-item";
import { RoadmapView } from "./RoadmapView";

class MockPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? true;
  }
}

vi.stubGlobal("PointerEvent", MockPointerEvent);

describe("RoadmapView", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
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
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Adjust due date for Moveable roadmap item" }),
      { key: "ArrowRight", shiftKey: true }
    );

    const updated = useProjectStore.getState().bundle!.core.items.find((item) =>
      item.title === "Moveable roadmap item"
    )!;
    expect(updated.startDate).toBe("2026-07-03");
    expect(updated.dueDate).toBe("2026-07-19");
    expect(updated.milestoneId).toBe(secondMilestone.id);
  });

  it("keeps the rendered bar width synchronized with the inclusive date range", () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap geometry");
    useProjectStore.setState({ bundle });
    useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Resizable roadmap item",
      statusId: "ready",
      startDate: "2026-07-01",
      dueDate: "2026-07-10"
    });

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Anchor"), { target: { value: "2026-07" } });

    const bar = screen.getByRole("group", { name: /Resizable roadmap item timeline/ });
    const grid = bar.closest<HTMLElement>(".roadmap-grid")!;
    expect(grid.style.gridTemplateColumns).toBe("220px 31fr 31fr 30fr 31fr 30fr 31fr");
    expect(parseFloat(bar.style.width)).toBeCloseTo((10 / 184) * 100);

    fireEvent.change(screen.getByLabelText("Due date for Resizable roadmap item"), {
      target: { value: "2026-07-20" }
    });

    expect(parseFloat(bar.style.width)).toBeCloseTo((20 / 184) * 100);
    expect(bar).toHaveAttribute("data-due-date", "2026-07-20");
  });

  it("moves and resizes with the measured timeline scale and pointer capture", () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap pointers");
    useProjectStore.setState({ bundle });
    useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Pointer roadmap item",
      statusId: "ready",
      startDate: "2026-07-01",
      dueDate: "2026-07-10"
    });

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Anchor"), { target: { value: "2026-07" } });

    const bar = screen.getByRole("group", { name: /Pointer roadmap item timeline/ });
    const timeline = bar.parentElement!;
    vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
      bottom: 88,
      height: 88,
      left: 0,
      right: 1840,
      top: 0,
      width: 1840,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.assign(bar, {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture,
      setPointerCapture
    });

    fireEvent.pointerDown(bar, { button: 0, clientX: 100, isPrimary: true, pointerId: 7 });
    fireEvent.pointerMove(bar, { clientX: 130, isPrimary: true, pointerId: 7 });
    fireEvent.pointerUp(bar, { clientX: 130, isPrimary: true, pointerId: 7 });

    let updated = useProjectStore.getState().bundle!.core.items.find((item) =>
      item.title === "Pointer roadmap item"
    )!;
    expect(updated).toMatchObject({ startDate: "2026-07-04", dueDate: "2026-07-13" });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);

    const resizeHandle = screen.getByRole("button", { name: "Adjust due date for Pointer roadmap item" });
    fireEvent.pointerDown(resizeHandle, { button: 0, clientX: 200, isPrimary: true, pointerId: 8 });
    fireEvent.pointerMove(bar, { clientX: 270, isPrimary: true, pointerId: 8 });
    fireEvent.pointerUp(bar, { clientX: 270, isPrimary: true, pointerId: 8 });

    updated = useProjectStore.getState().bundle!.core.items.find((item) =>
      item.title === "Pointer roadmap item"
    )!;
    expect(updated).toMatchObject({ startDate: "2026-07-04", dueDate: "2026-07-20" });
    expect(screen.getByRole("group", { name: /Pointer roadmap item timeline/ })).toHaveAttribute(
      "data-due-date",
      "2026-07-20"
    );
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

  it("shows a density hint when the roadmap has many dated items", () => {
    const bundle = buildProjectFromTemplate("software-project", "Large Roadmap");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    for (let index = 0; index < 90; index += 1) {
      apply({
        type: "item.create",
        projectId: bundle.project.id,
        typeId: "task",
        title: `Large roadmap item ${index + 1}`,
        statusId: "ready",
        startDate: "2026-07-01",
        dueDate: "2026-07-05"
      });
    }

    render(<MemoryRouter><RoadmapView /></MemoryRouter>);

    expect(screen.getByText("Large roadmap view")).toBeInTheDocument();
    expect(screen.getByText(/zoom and milestone lanes/i)).toBeInTheDocument();
  });

  it("opens the create item dialog from the roadmap with the anchor date prefilled", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Roadmap Create");
    useProjectStore.setState({ bundle });

    render(
      <MemoryRouter>
        <RoadmapView />
        <CreateItemDialog />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Anchor"), {
      target: { value: "2026-09" }
    });
    await userEvent.click(screen.getByRole("button", { name: "New item" }));

    expect(screen.getByRole("dialog", { name: "Create work item" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-09-01");

    await userEvent.type(screen.getByLabelText("Title"), "Plan launch window");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((item) =>
      item.title === "Plan launch window"
    );
    expect(created?.startDate).toBe("2026-09-01");
  });
});
