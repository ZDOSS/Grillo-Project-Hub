import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, type CustomFieldValue } from "@gph/core";
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

function defineCustomField(field: {
  name: string;
  type: "text" | "number" | "select" | "multi-select" | "date" | "checkbox";
  options?: string[];
  applicableTypeIds?: string[] | null;
  required?: boolean;
}) {
  const projectId = useProjectStore.getState().bundle!.project.id;
  const result = useProjectStore.getState().applyCommand({
    type: "customField.define",
    projectId,
    field
  });
  return result.bundle.core.customFields.find((entry) => entry.name === field.name)!;
}

function setCustomFieldValue(itemId: string, fieldId: string, value: CustomFieldValue) {
  const bundle = useProjectStore.getState().bundle!;
  const item = bundle.core.items.find((entry) => entry.id === itemId)!;
  useProjectStore.getState().applyCommand({
    type: "item.update",
    projectId: bundle.project.id,
    itemId,
    patch: { customFields: { ...(item.customFields ?? {}), [fieldId]: value } }
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

  it("edits applicable custom fields in the work item detail", async () => {
    const item = seedItem();
    const risk = defineCustomField({
      name: "Risk",
      type: "select",
      options: ["Low", "High"],
      applicableTypeIds: ["task"],
      required: true
    });
    const effort = defineCustomField({ name: "Effort", type: "number" });

    renderModal(item.id);

    expect(screen.getByRole("heading", { name: "Custom fields" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Risk"), "High");
    fireEvent.change(screen.getByLabelText("Effort"), { target: { value: "5" } });
    fireEvent.blur(screen.getByLabelText("Effort"));

    await waitFor(() => {
      const updated = useProjectStore
        .getState()
        .bundle?.core.items.find((entry) => entry.id === item.id);
      expect(updated?.customFields?.[risk.id]).toBe("High");
      expect(updated?.customFields?.[effort.id]).toBe(5);
    });
  });

  it("preserves hidden custom field values when the item type changes", async () => {
    const item = seedItem();
    const taskOnly = defineCustomField({
      name: "Task-only note",
      type: "text",
      applicableTypeIds: ["task"]
    });
    setCustomFieldValue(item.id, taskOnly.id, "Keep this note");

    renderModal(item.id);

    expect(screen.getByLabelText("Task-only note")).toHaveValue("Keep this note");

    await userEvent.selectOptions(screen.getByLabelText("Type"), "bug");

    await waitFor(() => {
      const updated = useProjectStore
        .getState()
        .bundle?.core.items.find((entry) => entry.id === item.id);
      expect(updated?.typeId).toBe("bug");
      expect(updated?.customFields?.[taskOnly.id]).toBe("Keep this note");
    });
    expect(screen.queryByLabelText("Task-only note")).not.toBeInTheDocument();
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

  it("rejects oversized attachment uploads before reading them into memory", async () => {
    const item = seedItem();
    const oversized = new File(["small fixture"], "oversized.bin", {
      type: "application/octet-stream"
    });
    Object.defineProperty(oversized, "size", { value: 5 * 1024 * 1024 + 1 });

    renderModal(item.id);

    await userEvent.upload(screen.getByLabelText("Upload attachment"), oversized);

    expect(screen.getByText("Attachments must be 5 MB or smaller.")).toBeInTheDocument();
    expect(useProjectStore.getState().bundle?.core.attachments).toHaveLength(0);
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
      filename: "resume.txt",
      mediaType: "text/plain",
      size: 13,
      dataUri: "data:text/plain;base64,UsOpc3Vtw6kg4pyF"
    });
    addAttachment(item.id, {
      filename: "package.bin",
      mediaType: "application/octet-stream",
      size: 4096,
      dataUri: "data:application/octet-stream;base64,AAAA"
    });

    renderModal(item.id);

    expect(screen.getByAltText("Preview of screen.png")).toHaveAttribute("src", "data:image/png;base64,iVBORw0KGgo=");
    expect(screen.getByText("Résumé ✅")).toBeInTheDocument();
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

  it("previews saved automation rules that apply to the current item", () => {
    const item = seedItem();
    const bundle = useProjectStore.getState().bundle!;
    const doneStatus = bundle.core.statuses.find((status) => status.id === "done")!;
    useProjectStore.getState().applyCommand({
      type: "automationRule.create",
      projectId: bundle.project.id,
      rule: {
        name: "Move tasks when ready",
        trigger: { type: "item.updated" },
        conditions: [{ type: "type.isOneOf", typeIds: [item.typeId] }],
        actions: [{ type: "moveToStatus", statusId: doneStatus.id }]
      }
    } as never);

    renderModal(item.id);

    expect(screen.getByRole("heading", { name: "Automation preview" })).toBeInTheDocument();
    expect(screen.getByText("Move tasks when ready")).toBeInTheDocument();
    expect(screen.getByText("Would move to Done.")).toBeInTheDocument();
  });

  it("does not promote past reminders as the next scheduled reminder", () => {
    const item = seedItem();
    const projectId = useProjectStore.getState().bundle!.project.id;
    useProjectStore.getState().applyCommand({
      type: "reminder.create",
      projectId,
      targetType: "workItem",
      targetId: item.id,
      remindAt: "2000-01-01T09:30:00.000Z",
      timeZone: "UTC",
      message: "Past follow-up"
    });

    renderModal(item.id);

    expect(screen.getByText("No reminder scheduled")).toBeInTheDocument();
    expect(screen.queryByText(/Next reminder:/)).not.toBeInTheDocument();
    expect(screen.getByText("Past follow-up")).toBeInTheDocument();
  });

  it("renders readable activity instead of raw event type strings", () => {
    const item = seedItem();
    useProjectStore.getState().applyCommand({
      type: "comment.create",
      projectId: useProjectStore.getState().bundle!.project.id,
      itemId: item.id,
      body: "Activity comment"
    });

    renderModal(item.id);

    expect(screen.getByText("Item created")).toBeInTheDocument();
    expect(screen.getByText("Comment added")).toBeInTheDocument();
    expect(screen.queryByText("item.created")).not.toBeInTheDocument();
    expect(screen.queryByText("item.commented")).not.toBeInTheDocument();
  });
});
