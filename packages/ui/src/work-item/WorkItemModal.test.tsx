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

function addAttachment(itemId: string, input: {
  dataUri?: string | null;
  filename: string;
  mediaType: string;
  size: number;
}) {
  const projectId = useProjectStore.getState().bundle!.project.id;
  useProjectStore.getState().applyCommand({
    type: "attachment.add",
    projectId,
    itemId,
    filename: input.filename,
    mediaType: input.mediaType,
    size: input.size,
    dataUri: input.dataUri ?? null
  });
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

  it("adds and deletes item attachments with browser data URI fallback", async () => {
    const item = seedItem();

    renderModal(item.id);

    await userEvent.upload(
      screen.getByLabelText("Upload attachment"),
      new File(["Release notes"], "release-notes.txt", { type: "text/plain" })
    );

    await waitFor(() => {
      const attachment = useProjectStore.getState().bundle?.core.attachments[0];
      expect(attachment).toMatchObject({
        filename: "release-notes.txt",
        mediaType: "text/plain",
        itemId: item.id,
        storagePath: null
      });
      expect(attachment?.dataUri).toMatch(/^data:text\/plain;base64,/);
    });

    expect(screen.getByText("release-notes.txt")).toBeInTheDocument();
    expect(screen.getByText("Text preview")).toBeInTheDocument();
    expect(screen.getByText("Release notes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete attachment release-notes.txt" }));

    await waitFor(() => {
      expect(useProjectStore.getState().bundle?.core.attachments).toHaveLength(0);
    });
    expect(useProjectStore.getState().bundle?.core.trash.some((entry) => entry.recordType === "attachment")).toBe(true);
  });

  it("applies safe attachment preview rules by media type", () => {
    const item = seedItem();
    addAttachment(item.id, {
      filename: "screen.png",
      mediaType: "image/png",
      size: 68,
      dataUri: "data:image/png;base64,iVBORw0KGgo="
    });
    addAttachment(item.id, {
      filename: "brief.pdf",
      mediaType: "application/pdf",
      size: 2048,
      dataUri: "data:application/pdf;base64,JVBERi0xLjQ="
    });
    addAttachment(item.id, {
      filename: "package.bin",
      mediaType: "application/octet-stream",
      size: 4096,
      dataUri: "data:application/octet-stream;base64,AAAA"
    });

    renderModal(item.id);

    expect(screen.getByAltText("Preview of screen.png")).toHaveAttribute("src", "data:image/png;base64,iVBORw0KGgo=");
    expect(screen.getByText("PDF metadata only")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.getByText("No inline preview for this file type.")).toBeInTheDocument();
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(document.querySelector("object")).not.toBeInTheDocument();
    expect(document.querySelector("embed")).not.toBeInTheDocument();
  });

  it("creates, updates, deletes, and summarizes item reminders", async () => {
    const item = seedItem();

    renderModal(item.id);

    expect(screen.getByText("No reminders")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reminder time"), {
      target: { value: "2030-01-02T09:30" }
    });
    await userEvent.type(screen.getByLabelText("Reminder message"), "Prep release notes");
    await userEvent.click(screen.getByRole("button", { name: "Add reminder" }));

    await waitFor(() => {
      const reminder = useProjectStore.getState().bundle?.core.reminders[0];
      expect(reminder).toMatchObject({
        targetType: "workItem",
        targetId: item.id,
        message: "Prep release notes"
      });
      expect(Date.parse(reminder?.remindAt ?? "")).not.toBeNaN();
    });

    expect(screen.getByText(/Next reminder:/)).toBeInTheDocument();
    expect(screen.getAllByText("Prep release notes").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Reminder message for Prep release notes"), {
      target: { value: "Updated reminder" }
    });
    fireEvent.change(screen.getByLabelText("Reminder time for Prep release notes"), {
      target: { value: "2030-01-03T11:15" }
    });
    await userEvent.click(screen.getByRole("button", { name: "Save reminder Prep release notes" }));

    await waitFor(() => {
      const reminder = useProjectStore.getState().bundle?.core.reminders[0];
      expect(reminder?.message).toBe("Updated reminder");
      expect(new Date(reminder?.remindAt ?? "").toISOString()).toBe(new Date("2030-01-03T11:15").toISOString());
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete reminder Updated reminder" }));

    await waitFor(() => {
      expect(useProjectStore.getState().bundle?.core.reminders).toHaveLength(0);
    });
    expect(screen.getByText("No reminders")).toBeInTheDocument();
  });
});
