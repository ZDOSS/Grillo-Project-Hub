import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { TrashView } from "./TrashView";

function seedTrashRecords() {
  const bundle = buildProjectFromTemplate("simple-kanban", "Trash");
  useProjectStore.setState({ bundle });
  const apply = useProjectStore.getState().applyCommand;
  const itemBundle = apply({
    type: "item.create",
    projectId: bundle.project.id,
    typeId: "task",
    title: "Trashed task",
    statusId: "ready"
  }).bundle;
  const itemId = itemBundle.core.items.find((item) => item.title === "Trashed task")!.id;
  const docBundle = apply({
    type: "doc.create",
    projectId: bundle.project.id,
    title: "Trashed doc",
    body: "Archived context"
  }).bundle;
  const docId = docBundle.core.documents.find((doc) => doc.title === "Trashed doc")!.id;
  const attachmentBundle = apply({
    type: "attachment.add",
    projectId: bundle.project.id,
    itemId,
    filename: "trashed-evidence.txt",
    mediaType: "text/plain",
    size: 12,
    dataUri: "data:text/plain;base64,SGVsbG8="
  }).bundle;
  const attachmentId = attachmentBundle.core.attachments.find((attachment) => attachment.filename === "trashed-evidence.txt")!.id;

  apply({ type: "item.trash", projectId: bundle.project.id, itemId });
  apply({ type: "doc.delete", projectId: bundle.project.id, docId });
  apply({ type: "attachment.delete", projectId: bundle.project.id, attachmentId });

  return { attachmentId, docId, itemId };
}

describe("TrashView", () => {
  beforeEach(() => {
    cleanup();
    useProjectStore.setState({ bundle: null });
  });

  it("shows trashed work items, docs, and attachments with restore actions", async () => {
    const { attachmentId, docId, itemId } = seedTrashRecords();

    render(<MemoryRouter><TrashView /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Trash" })).toBeInTheDocument();
    expect(screen.getByText("Trashed task")).toBeInTheDocument();
    expect(screen.getByText("Trashed doc")).toBeInTheDocument();
    expect(screen.getByText("trashed-evidence.txt")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Restore Trashed task" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore Trashed doc" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore trashed-evidence.txt" }));

    await waitFor(() => {
      const current = useProjectStore.getState().bundle!;
      expect(current.core.items.find((item) => item.id === itemId)?.trashedAt).toBeNull();
      expect(current.core.documents.find((doc) => doc.id === docId)?.title).toBe("Trashed doc");
      expect(current.core.attachments.find((attachment) => attachment.id === attachmentId)?.filename).toBe("trashed-evidence.txt");
      expect(current.core.trash).toHaveLength(0);
    });
  });

  it("requires confirmation before permanently deleting a trashed document", async () => {
    const { docId } = seedTrashRecords();

    render(<MemoryRouter><TrashView /></MemoryRouter>);

    await userEvent.click(screen.getByRole("button", { name: "Permanently delete Trashed doc" }));

    expect(screen.getByRole("dialog", { name: "Permanently delete Trashed doc" })).toBeInTheDocument();
    expect(screen.getByText(/This removes the document from trash permanently/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useProjectStore.getState().bundle?.core.trash.some((entry) => entry.recordId === docId)).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Permanently delete Trashed doc" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => {
      const current = useProjectStore.getState().bundle!;
      expect(current.core.trash.some((entry) => entry.recordId === docId)).toBe(false);
      expect(current.core.documents.some((doc) => doc.id === docId)).toBe(false);
    });
  });

  it("bulk restores selected trash records", async () => {
    const { docId, itemId } = seedTrashRecords();

    render(<MemoryRouter><TrashView /></MemoryRouter>);

    await userEvent.click(screen.getByRole("checkbox", { name: "Select Trashed task" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Trashed doc" }));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restore selected" }));

    await waitFor(() => {
      const current = useProjectStore.getState().bundle!;
      expect(current.core.items.find((item) => item.id === itemId)?.trashedAt).toBeNull();
      expect(current.core.documents.find((doc) => doc.id === docId)?.title).toBe("Trashed doc");
      expect(current.core.trash.some((entry) => entry.recordId === itemId || entry.recordId === docId)).toBe(false);
    });
  });

  it("bulk permanently deletes selected trash records after confirmation", async () => {
    const { docId, itemId } = seedTrashRecords();

    render(<MemoryRouter><TrashView /></MemoryRouter>);

    await userEvent.click(screen.getByRole("checkbox", { name: "Select Trashed task" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Trashed doc" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete selected..." }));

    expect(screen.getByRole("dialog", { name: "Permanently delete 2 records" })).toBeInTheDocument();
    expect(screen.getByText(/This permanently removes 2 supported trash records/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => {
      const current = useProjectStore.getState().bundle!;
      expect(current.core.trash.some((entry) => entry.recordId === itemId || entry.recordId === docId)).toBe(false);
      expect(current.core.items.some((item) => item.id === itemId)).toBe(false);
      expect(current.core.documents.some((doc) => doc.id === docId)).toBe(false);
    });
  });

  it("clears the confirmation and surfaces feedback when permanent delete fails", async () => {
    seedTrashRecords();
    const originalApplyCommand = useProjectStore.getState().applyCommand;

    try {
      useProjectStore.setState({
        applyCommand: (() => {
          throw new Error("Linked target is missing");
        }) as typeof originalApplyCommand
      });

      render(<MemoryRouter><TrashView /></MemoryRouter>);

      await userEvent.click(screen.getByRole("button", { name: "Permanently delete Trashed doc" }));
      await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Permanently delete Trashed doc" })).not.toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Linked target is missing");
    } finally {
      useProjectStore.setState({ applyCommand: originalApplyCommand });
    }
  });
});
