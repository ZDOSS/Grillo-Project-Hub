import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { closeCreateItem, openCreateItem } from "../commands/palette-bus";
import { useProjectStore } from "../store/project-store";
import { CreateItemDialog } from "./CreateItemDialog";

describe("CreateItemDialog", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
    const bundle = buildProjectFromTemplate("software-project", "Create");
    useProjectStore.setState({ bundle });
  });

  it("refreshes type defaults when the project type registry changes while open", async () => {
    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );

    act(() => openCreateItem({ typeId: "task" }));

    expect(screen.getByLabelText("Status")).toHaveValue("inbox");

    await userEvent.type(screen.getByLabelText("Title"), "Keep my draft");
    await userEvent.type(screen.getByLabelText("Description"), "Do not clear this");

    const current = useProjectStore.getState().bundle!;
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          itemTypes: current.core.itemTypes.map((type) =>
            type.id === "task" ? { ...type, defaultStatusId: "ready" } : type
          )
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Status")).toHaveValue("ready");
    });
    expect(screen.getByLabelText("Title")).toHaveValue("Keep my draft");
    expect(screen.getByLabelText("Description")).toHaveValue("Do not clear this");
  });

  it("creates a work item with prefilled planning dates", async () => {
    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );

    act(() => openCreateItem({ typeId: "bug", startDate: "2026-07-09", dueDate: "2026-07-12" }));

    expect(screen.getByLabelText("Type")).toHaveValue("bug");
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-07-09");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-07-12");

    await userEvent.type(screen.getByLabelText("Title"), "Fix scheduled regression");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((item) => item.title === "Fix scheduled regression");
    expect(created).toMatchObject({
      typeId: "bug",
      startDate: "2026-07-09",
      dueDate: "2026-07-12"
    });
  });

  it("creates a work item with a prefilled milestone", async () => {
    const milestone = useProjectStore.getState().bundle!.core.milestones[0];
    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );

    act(() => openCreateItem({ typeId: "task", milestoneId: milestone.id }));

    expect(screen.getByLabelText("Milestone")).toHaveValue(milestone.id);

    await userEvent.type(screen.getByLabelText("Title"), "Scope milestone work");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    const created = useProjectStore.getState().bundle?.core.items.find((item) => item.title === "Scope milestone work");
    expect(created?.milestoneId).toBe(milestone.id);
  });

  it("excludes hidden milestones from new item assignments", () => {
    const current = useProjectStore.getState().bundle!;
    const hiddenMilestone = current.core.milestones[0];
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          milestones: current.core.milestones.map((milestone) =>
            milestone.id === hiddenMilestone.id ? { ...milestone, archived: true } : milestone
          )
        }
      }
    });

    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );
    act(() => openCreateItem({ milestoneId: hiddenMilestone.id }));

    const milestoneSelect = screen.getByLabelText("Milestone");
    expect(milestoneSelect).toHaveValue("");
    expect(within(milestoneSelect).queryByRole("option", { name: hiddenMilestone.name })).not.toBeInTheDocument();
  });

  it("falls back from hidden type and status prefills to visible workflow choices", async () => {
    const current = useProjectStore.getState().bundle!;
    const hiddenType = current.core.itemTypes.find((type) => type.id === "task")!;
    const hiddenStatus = current.core.statuses.find((status) => status.id === "inbox")!;
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          itemTypes: current.core.itemTypes.map((type) =>
            type.id === hiddenType.id ? { ...type, archived: true } : type
          ),
          statuses: current.core.statuses.map((status) =>
            status.id === hiddenStatus.id ? { ...status, archived: true } : status
          )
        }
      }
    });

    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );
    act(() => openCreateItem({ typeId: hiddenType.id, statusId: hiddenStatus.id }));

    const typeSelect = screen.getByLabelText("Type");
    const statusSelect = screen.getByLabelText("Status");
    expect(typeSelect).not.toHaveValue(hiddenType.id);
    expect(statusSelect).not.toHaveValue(hiddenStatus.id);
    expect(within(typeSelect).queryByRole("option", { name: hiddenType.name })).not.toBeInTheDocument();
    expect(within(statusSelect).queryByRole("option", { name: hiddenStatus.name })).not.toBeInTheDocument();

    const chosenStatus = current.core.statuses.find((status) => status.id !== hiddenStatus.id && status.id !== (statusSelect as HTMLSelectElement).value)!;
    await userEvent.selectOptions(statusSelect, chosenStatus.id);
    expect(statusSelect).toHaveValue(chosenStatus.id);
    expect(typeSelect).not.toHaveValue(hiddenType.id);
  });
});
