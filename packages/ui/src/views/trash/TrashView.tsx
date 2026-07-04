import { useMemo, useState } from "react";
import type { Attachment, Document, TrashRecord, WorkItem } from "@gph/core";
import { ConfirmDialog, EmptyState, InlineAlert } from "../../components";
import { useProjectStore } from "../../store/project-store";

type TrashAction = {
  record: TrashRecord;
  title: string;
} | null;

export function TrashView() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [pendingDelete, setPendingDelete] = useState<TrashAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!bundle) return [];
    return [...bundle.core.trash]
      .sort((a, b) => b.trashedAt.localeCompare(a.trashedAt))
      .map((record) => ({
        record,
        detail: describeTrashRecord(record, bundle.core.items)
      }));
  }, [bundle]);

  if (!bundle) return null;

  const restore = (record: TrashRecord) => {
    setActionError(null);
    try {
      switch (record.recordType) {
        case "workItem":
          applyCommand({ type: "item.restore", projectId: bundle.project.id, itemId: record.recordId });
          break;
        case "document":
          applyCommand({ type: "doc.restore", projectId: bundle.project.id, docId: record.recordId });
          break;
        case "attachment":
          applyCommand({ type: "attachment.restore", projectId: bundle.project.id, attachmentId: record.recordId });
          break;
      }
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const permanentlyDelete = (record: TrashRecord) => {
    setActionError(null);
    try {
      switch (record.recordType) {
        case "workItem":
          applyCommand({ type: "item.permanentlyDelete", projectId: bundle.project.id, itemId: record.recordId });
          break;
        case "document":
          applyCommand({ type: "doc.permanentlyDelete", projectId: bundle.project.id, docId: record.recordId });
          break;
        case "attachment":
          applyCommand({ type: "attachment.permanentlyDelete", projectId: bundle.project.id, attachmentId: record.recordId });
          break;
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="trash-view">
      <div className="trash-header">
        <div>
          <h1>Trash</h1>
          <p className="text-sm text-secondary">
            Restore recent removals or permanently delete records after reviewing impact.
          </p>
        </div>
        <span className="tag tag-info">{rows.length} records</span>
      </div>

      {actionError ? <InlineAlert tone="danger">{actionError}</InlineAlert> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          description="Deleted work items, documents, and attachments will appear here before permanent removal."
        />
      ) : (
        <div className="trash-list" aria-label="Trash records">
          {rows.map(({ detail, record }) => (
            <article key={`${record.recordType}:${record.recordId}:${record.trashedAt}`} className="trash-card">
              <div className="trash-card-main">
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="tag">{detail.typeLabel}</span>
                  <strong>{detail.title}</strong>
                </div>
                <div className="text-sm text-secondary">{detail.description}</div>
                <div className="text-xs text-muted">
                  Trashed {new Date(record.trashedAt).toLocaleString()}
                </div>
              </div>
              <div className="trash-card-actions">
                {detail.supported ? (
                  <button className="btn btn-sm" onClick={() => restore(record)}>
                    Restore {detail.title}
                  </button>
                ) : (
                  <span className="tag tag-warn">Restore unavailable</span>
                )}
                {detail.supported ? (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setPendingDelete({ record, title: detail.title })}
                  >
                    Permanently delete {detail.title}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete ? (
        <ConfirmDialog
          destructive
          title={`Permanently delete ${pendingDelete.title}`}
          message={permanentDeleteMessage(pendingDelete.record)}
          confirmLabel="Delete permanently"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => permanentlyDelete(pendingDelete.record)}
        />
      ) : null}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Trash action failed";
}

function describeTrashRecord(record: TrashRecord, activeItems: WorkItem[]) {
  switch (record.recordType) {
    case "workItem": {
      const payload = record.payload as WorkItem;
      const active = activeItems.find((item) => item.id === record.recordId);
      const title = active?.title ?? payload.title ?? record.recordId;
      return {
        description: "Restoring returns this item to project views. Permanent deletion also removes related reminders, relationships, attachments, and document links.",
        supported: true,
        title,
        typeLabel: "Work item"
      };
    }
    case "document": {
      const payload = documentFromTrashPayload(record.payload);
      return {
        description: "Restoring returns this document to Docs. Permanent deletion removes this trash record permanently.",
        supported: true,
        title: payload.title ?? record.recordId,
        typeLabel: "Document"
      };
    }
    case "attachment": {
      const payload = record.payload as Attachment;
      return {
        description: "Restoring returns this attachment to its linked item or document if that target still exists.",
        supported: true,
        title: payload.filename ?? record.recordId,
        typeLabel: "Attachment"
      };
    }
    default:
      return {
        description: "This record type is preserved in trash, but this version does not yet include a restore command for it.",
        supported: false,
        title: record.recordId,
        typeLabel: record.recordType
      };
  }
}

function documentFromTrashPayload(payload: unknown): Document {
  if (typeof payload === "object" && payload !== null && "document" in payload) {
    return (payload as { document: Document }).document;
  }
  return payload as Document;
}

function permanentDeleteMessage(record: TrashRecord): string {
  switch (record.recordType) {
    case "workItem":
      return "This removes the work item permanently, including comments, relationships, reminders, attachments, and document links. This cannot be undone.";
    case "document":
      return "This removes the document from trash permanently. This cannot be undone.";
    case "attachment":
      return "This removes the attachment from trash permanently. This cannot be undone.";
    default:
      return "This removes the trash record permanently. This cannot be undone.";
  }
}
