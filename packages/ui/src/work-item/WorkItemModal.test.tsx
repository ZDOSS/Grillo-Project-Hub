import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { buildProjectFromTemplate } from "@gph/core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useProjectStore } from "../store/project-store";
import { WorkItemModal } from "./WorkItemModal";

function seedItem() {
  const bundle = buildProjectFromTemplate("simple-kanban", "Test");
  useProjectStore.setState({ bundle });
  const created = useProjectStore.getState().applyCommand({
    type: "item.create",
    projectId: bundle.project.id,
    typeId: "task",
    title: "Seed item",
    statusId: "ready"
  }).bundle;
  useProjectStore.setState({ bundle: created });
  return created.core.items.find((item) => item.title === "Seed item")!;
}

function renderModal(itemId: string) {
  render(
    <MemoryRouter initialEntries={[`/item/${itemId}`]}>
      <Routes>
        <Route path="/item/:itemId" element={<WorkItemModal />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("WorkItemModal", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("renders work item detail through the shared modal chrome", () => {
    const item = seedItem();

    renderModal(item.id);

    const dialog = screen.getByRole("dialog", { name: /work item: seed item/i });
    expect(dialog).toHaveClass("gph-modal", "gph-modal-work-item");
    expect(document.querySelector(".drawer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Seed item");
  });

  it("keeps destructive and completion actions in the pinned modal footer", () => {
    const item = seedItem();

    renderModal(item.id);

    const footer = document.querySelector(".gph-modal-footer");
    const body = document.querySelector(".gph-modal-body");
    expect(footer).toContainElement(screen.getByRole("button", { name: "Archive" }));
    expect(footer).toContainElement(screen.getByRole("button", { name: "Done" }));
    expect(body).not.toContainElement(screen.getByRole("button", { name: "Done" }));
  });

  it("preserves title edits through the project command dispatcher", async () => {
    const item = seedItem();

    renderModal(item.id);

    const titleInput = screen.getByLabelText("Title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Renamed item");
    fireEvent.blur(titleInput);

    await waitFor(() => {
      const updated = useProjectStore
        .getState()
        .bundle?.core.items.find((entry) => entry.id === item.id);
      expect(updated?.title).toBe("Renamed item");
    });
  });
});
