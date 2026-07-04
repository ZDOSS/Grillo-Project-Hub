import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";
import { BugTriageView } from "./BugTriageView";

const NO_REPRO_BUG_DATA = {
  severityId: "major",
  reproductionSteps: [],
  expectedBehavior: "",
  actualBehavior: "",
  environment: "",
  affectedVersion: null
};

function renderBugTriage() {
  render(
    <MemoryRouter initialEntries={["/bugs"]}>
      <Routes>
        <Route
          path="/bugs"
          element={
            <>
              <BugTriageView />
              <CreateItemDialog />
            </>
          }
        />
        <Route path="/item/:itemId" element={<div>Item detail</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BugTriageView", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
    useProjectStore.setState({ bundle: null });
  });

  it("shows inbox bugs in intake when the project uses the software workflow", () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");
    useProjectStore.setState({ bundle });
    useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Inbox bug",
      statusId: "inbox"
    });

    renderBugTriage();

    expect(screen.getByText("Intake")).toBeInTheDocument();
    expect(screen.getByText("Inbox bug")).toBeInTheDocument();
  });

  it("creates new intake bugs with the intake status preselected", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");
    useProjectStore.setState({ bundle });

    renderBugTriage();

    await userEvent.click(screen.getByRole("button", { name: "New bug" }));

    expect(screen.getByLabelText("Type")).toHaveValue("bug");
    expect(screen.getByLabelText("Status")).toHaveValue("inbox");

    await userEvent.type(screen.getByLabelText("Title"), "Created from intake");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const created = useProjectStore.getState().bundle?.core.items.find((item) => item.title === "Created from intake");
      expect(created).toMatchObject({ typeId: "bug", statusId: "inbox" });
    });
  });

  it("does not let intake fallback consume every planned status", () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");
    useProjectStore.setState({
      bundle: {
        ...bundle,
        core: {
          ...bundle.core,
          statuses: [
            { id: "triage", name: "Triage", category: "planned", order: 1024, archived: false },
            { id: "next-up", name: "Next Up", category: "planned", order: 2048, archived: false },
            { id: "building", name: "Building", category: "active", order: 3072, archived: false }
          ]
        },
        project: {
          ...bundle.project,
          defaultInitialStatusId: "triage"
        }
      }
    });
    useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Ready lane bug",
      statusId: "next-up"
    });

    renderBugTriage();

    const readyColumn = screen.getByText("Ready").closest(".bugs-column");
    expect(readyColumn).toBeTruthy();
    expect(within(readyColumn as HTMLElement).getByText("Ready lane bug")).toBeInTheDocument();
  });

  it("filters intake bugs by triage state", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withMember = apply({
      type: "member.create",
      projectId: bundle.project.id,
      displayName: "Ada"
    }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Needs reproduction",
      statusId: "inbox"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Has reproduction",
      statusId: "inbox",
      assigneeId: member.id
    });
    const current = useProjectStore.getState().bundle!;
    const needsRepro = current.core.items.find((item) => item.title === "Needs reproduction")!;
    const hasRepro = current.core.items.find((item) => item.title === "Has reproduction")!;
    apply({
      type: "item.update",
      projectId: current.project.id,
      itemId: needsRepro.id,
      patch: { moduleData: { bug: NO_REPRO_BUG_DATA } }
    });
    apply({
      type: "item.update",
      projectId: current.project.id,
      itemId: hasRepro.id,
      patch: {
        moduleData: {
          bug: {
            ...NO_REPRO_BUG_DATA,
            severityId: "minor",
            reproductionSteps: [{ id: "step-1", text: "Open the page", order: 1024 }]
          }
        }
      }
    });

    renderBugTriage();

    await userEvent.selectOptions(screen.getByLabelText("Bug filter"), "needs-repro");

    expect(screen.getByRole("article", { name: "Needs reproduction" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Has reproduction" })).not.toBeInTheDocument();
  });

  it("runs accept decline snooze assign and duplicate actions", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Software");
    useProjectStore.setState({ bundle });
    const apply = useProjectStore.getState().applyCommand;
    const withMember = apply({
      type: "member.create",
      projectId: bundle.project.id,
      displayName: "Ada"
    }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Action bug",
      statusId: "inbox"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Duplicate target bug",
      statusId: "inbox"
    });
    apply({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Decline bug",
      statusId: "inbox"
    });
    const initial = useProjectStore.getState().bundle!;
    const actionBug = initial.core.items.find((item) => item.title === "Action bug")!;
    const duplicateTarget = initial.core.items.find((item) => item.title === "Duplicate target bug")!;
    const declineBug = initial.core.items.find((item) => item.title === "Decline bug")!;
    for (const item of [actionBug, duplicateTarget, declineBug]) {
      apply({
        type: "item.update",
        projectId: initial.project.id,
        itemId: item.id,
        patch: { moduleData: { bug: NO_REPRO_BUG_DATA } }
      });
    }

    renderBugTriage();

    const actionCard = screen.getByRole("article", { name: "Action bug" });
    await userEvent.click(within(actionCard).getByRole("button", { name: "Accept Action bug" }));
    const acceptedCard = screen.getByRole("article", { name: "Action bug" });
    await userEvent.selectOptions(within(acceptedCard).getByLabelText("Assign owner for Action bug"), member.id);
    await userEvent.click(within(acceptedCard).getByRole("button", { name: "Snooze Action bug" }));
    await userEvent.selectOptions(within(acceptedCard).getByLabelText("Duplicate target for Action bug"), duplicateTarget.id);
    await userEvent.click(within(acceptedCard).getByRole("button", { name: "Link duplicate for Action bug" }));

    const declineCard = screen.getByRole("article", { name: "Decline bug" });
    await userEvent.click(within(declineCard).getByRole("button", { name: "Decline Decline bug" }));

    const updated = useProjectStore.getState().bundle!;
    const accepted = updated.core.items.find((item) => item.id === actionBug.id)!;
    const declined = updated.core.items.find((item) => item.title === "Decline bug")!;
    expect(accepted.statusId).toBe("ready");
    expect(accepted.assigneeId).toBe(member.id);
    expect(updated.core.reminders.some((reminder) => reminder.targetId === actionBug.id)).toBe(true);
    expect(updated.core.relationships.some((relationship) =>
      relationship.type === "relatesTo" &&
      [relationship.sourceItemId, relationship.targetItemId].includes(actionBug.id) &&
      [relationship.sourceItemId, relationship.targetItemId].includes(duplicateTarget.id)
    )).toBe(true);
    expect(declined.statusId).toBe("wont-fix");
  });
});
