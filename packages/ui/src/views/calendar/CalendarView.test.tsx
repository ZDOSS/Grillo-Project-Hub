import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { CalendarView } from "./CalendarView";

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

describe("CalendarView", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("renders an agenda of upcoming due dates and reminders", () => {
    const bundle = buildProjectFromTemplate("software-project", "Calendar");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Calendar due task",
      statusId: "ready",
      dueDate: datePlus(4)
    });
    const item = useProjectStore.getState().bundle!.core.items.find((entry) =>
      entry.title === "Calendar due task"
    )!;
    apply({
      type: "reminder.create",
      projectId: bundle.project.id,
      targetType: "workItem",
      targetId: item.id,
      remindAt: timestampPlus(2),
      timeZone: "UTC",
      message: "Prepare calendar review"
    });

    render(<MemoryRouter><CalendarView /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar due task" })).toBeInTheDocument();
    expect(screen.getByText("Prepare calendar review")).toBeInTheDocument();
  });
});
