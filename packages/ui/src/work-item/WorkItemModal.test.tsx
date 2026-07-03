import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function seedItemWithComment() {
  const item = seedItem();
  useProjectStore.getState().applyCommand({
    type: "comment.create",
    projectId: useProjectStore.getState().bundle!.project.id,
    itemId: item.id,
    body: "Original comment"
  });
  return useProjectStore
    .getState()
    .bundle!.core.items.find((entry) => entry.id === item.id)!;
}

function seedRelatedItems() {
  const primary = seedItem();
  const created = useProjectStore.getState().applyCommand({
    type: "item.create",
    projectId: useProjectStore.getState().bundle!.project.id,
    typeId: "task",
    title: "Dependency item",
    statusId: "ready"
  }).bundle;

  return {
    primary: created.core.items.find((entry) => entry.id === primary.id)!,
    dependency: created.core.items.find((entry) => entry.title === "Dependency item")!
  };
}

function renderModal(itemId: string, initialEntries = [`/item/${itemId}`]) {
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/" element={<div>Project home</div>} />
        <Route path="/item/:itemId" element={<WorkItemModal />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("WorkItemModal", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useProjectStore.setState({ bundle: null });
  });

  it("renders work item detail through the shared modal chrome", () => {
    const item = seedItem();

    renderModal(item.id);

    const dialog = screen.getByRole("dialog", { name: /work item: seed item/i });
    expect(dialog).toHaveClass("gph-modal", "gph-modal-work-item");
    expect(document.querySelector(".drawer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Seed item");
    expect(screen.getByLabelText("New comment")).toBeInTheDocument();
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

  it("edits comments inline without native prompts", async () => {
    const item = seedItemWithComment();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Native prompt value");

    renderModal(item.id);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(promptSpy).not.toHaveBeenCalled();
    const editor = screen.getByLabelText("Edit comment");
    expect(editor).toHaveValue("Original comment");
    expect(screen.getByRole("button", { name: "Save comment" })).toBeDisabled();

    await userEvent.clear(editor);
    await userEvent.type(editor, "Updated comment");
    expect(screen.getByRole("button", { name: "Save comment" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Save comment" }));

    await waitFor(() => {
      const updated = useProjectStore
        .getState()
        .bundle?.core.items.find((entry) => entry.id === item.id);
      expect(updated?.comments[0]?.body).toBe("Updated comment");
    });
  });

  it("uses app confirmation for permanent delete instead of native confirm", async () => {
    const item = seedItem();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal(item.id);

    await userEvent.click(screen.getByRole("button", { name: "Delete..." }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Permanently delete work item" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useProjectStore.getState().bundle?.core.items.some((entry) => entry.id === item.id)).toBe(true);
  });

  it("keeps the item detail open when Escape cancels permanent delete confirmation", async () => {
    const item = seedItem();

    renderModal(item.id, ["/", `/item/${item.id}`]);

    const newComment = screen.getByLabelText("New comment");
    await userEvent.type(newComment, "Unsaved comment draft");
    await userEvent.click(screen.getByRole("button", { name: "Delete..." }));

    expect(screen.getByRole("dialog", { name: "Permanently delete work item" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Permanently delete work item" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog", { name: /work item: seed item/i })).toBeInTheDocument();
    expect(screen.getByLabelText("New comment")).toHaveValue("Unsaved comment draft");
    expect(screen.queryByText("Project home")).not.toBeInTheDocument();
  });

  it("adds and removes relationships from the work item detail", async () => {
    const { primary, dependency } = seedRelatedItems();

    renderModal(primary.id);

    expect(screen.getByRole("heading", { name: "Relationships" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Relationship type"), "blocks");
    await userEvent.selectOptions(screen.getByLabelText("Relationship target"), dependency.id);
    await userEvent.click(screen.getByRole("button", { name: "Add relationship" }));

    await waitFor(() => {
      const relationship = useProjectStore.getState().bundle?.core.relationships[0];
      expect(relationship).toMatchObject({
        type: "blocks",
        sourceItemId: primary.id,
        targetItemId: dependency.id
      });
    });

    expect(screen.getByRole("link", { name: "Dependency item" })).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove relationship to Dependency item" })
    );

    await waitFor(() => {
      expect(useProjectStore.getState().bundle?.core.relationships).toHaveLength(0);
    });
  });
});
