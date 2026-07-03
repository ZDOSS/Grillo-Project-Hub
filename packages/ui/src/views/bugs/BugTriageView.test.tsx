import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";
import { BugTriageView } from "./BugTriageView";

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
});
