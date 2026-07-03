import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore } from "../../store/workspace-store";
import { closeCreateItem } from "../../commands/palette-bus";
import { CreateItemDialog } from "../../work-item";
import { MyWorkView } from "./MyWorkView";

describe("MyWorkView", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
    useProjectStore.setState({ bundle: null });
    useWorkspaceStore.setState({ localMemberId: null, recents: [] });
  });

  it("creates new work assigned to the selected local member", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Mine");
    useProjectStore.setState({ bundle });
    const withMember = useProjectStore.getState().applyCommand({
      type: "member.create",
      projectId: bundle.project.id,
      displayName: "Ada"
    }).bundle;
    const member = withMember.core.members.find((entry) => entry.displayName === "Ada")!;
    useWorkspaceStore.getState().setLocalMember(member.id);

    render(
      <MemoryRouter initialEntries={["/mywork"]}>
        <Routes>
          <Route
            path="/mywork"
            element={
              <>
                <MyWorkView />
                <CreateItemDialog />
              </>
            }
          />
          <Route path="/item/:itemId" element={<div>Item detail</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "New assigned item" }));
    expect(screen.getByLabelText("Assignee")).toHaveValue(member.id);

    await userEvent.type(screen.getByLabelText("Title"), "Follow up");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const created = useProjectStore.getState().bundle?.core.items.find((entry) => entry.title === "Follow up");
      expect(created?.assigneeId).toBe(member.id);
    });
  });
});
