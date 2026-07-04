import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
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

  it("places reminder agenda rows on their configured timezone day", () => {
    const bundle = buildProjectFromTemplate("software-project", "Calendar");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "Timezone reminder target",
      statusId: "ready"
    });
    const item = useProjectStore.getState().bundle!.core.items.find((entry) =>
      entry.title === "Timezone reminder target"
    )!;
    const expectedLocalDate = datePlus(0);
    apply({
      type: "reminder.create",
      projectId: bundle.project.id,
      targetType: "workItem",
      targetId: item.id,
      remindAt: `${datePlus(-1)}T23:30:00.000Z`,
      timeZone: "Asia/Tokyo",
      message: "Tokyo reminder"
    });

    render(<MemoryRouter><CalendarView /></MemoryRouter>);

    const row = screen.getByText("Tokyo reminder").closest(".calendar-agenda-row");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText(expectedLocalDate)).toBeInTheDocument();
  });

  it("keeps timezone-local reminders visible when their display day is before the UTC anchor day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T02:30:00.000Z"));

    const bundle = buildProjectFromTemplate("software-project", "Calendar");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "task",
      title: "New York reminder target",
      statusId: "ready"
    });
    const item = useProjectStore.getState().bundle!.core.items.find((entry) =>
      entry.title === "New York reminder target"
    )!;
    apply({
      type: "reminder.create",
      projectId: bundle.project.id,
      targetType: "workItem",
      targetId: item.id,
      remindAt: "2026-07-05T02:00:00.000Z",
      timeZone: "America/New_York",
      message: "New York local reminder"
    });

    render(<MemoryRouter><CalendarView /></MemoryRouter>);

    const row = screen.getByText("New York local reminder").closest(".calendar-agenda-row");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("2026-07-04")).toBeInTheDocument();
  });
});
