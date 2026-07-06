import { useEffect, useMemo, useState } from "react";
import type { Attachment, Document, TrashRecord, WorkItem } from "@gph/core";
import { ConfirmDialog, EmptyState, InlineAlert } from "../../components";
import { useProjectStore } from "../../store/project-store";

type TrashAction = {
  records: TrashRecord[];
  title: string;
} | null;

export function TrashView() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [pendingDelete, setPendingDelete] = useState<TrashAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const rows = useMemo(() => {
    if (!bundle) return [];
    return [...bundle.core.trash]
      .sort((a, b) => b.trashedAt.localeCompare(a.trashedAt))
      .map((record) => ({
        key: trashRecordKey(record),
        record,
        detail: describeTrashRecord(record, bundle.core.items)
      }));
  }, [bundle]);

  useEffect(() => {
    const rowKeys = new Set(rows.map((row) => row.key));
    setSelectedKeys((current) => {
      const next = current.filter((key) => rowKeys.has(key));
      return next.length === current.length ? current : next;
    });
  }, [rows]);

  if (!bundle) return null;

  const selectedRows = rows.filter((row) => selectedKeys.includes(row.key));
  const supportedSelectedRows = selectedRows.filter((row) => row.detail.supported);
  const selectedCount = supportedSelectedRows.length;

  const toggleSelection = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  };

  const restoreRecords = (records: TrashRecord[]) => {
    setActionError(null);
    try {
      for (const record of records) {
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
      }
      setSelectedKeys((current) => current.filter((key) => !records.some((record) => trashRecordKey(record) === key)));
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const permanentlyDeleteRecords = (records: TrashRecord[]) => {
    setActionError(null);
    try {
      for (const record of records) {
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
      }
      setSelectedKeys((current) => current.filter((key) => !records.some((record) => trashRecordKey(record) === key)));
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
        <>
          <div className="trash-bulk-toolbar" aria-label="Bulk trash actions">
            <span className="text-sm text-secondary">
              {selectedCount > 0 ? `${selectedCount} selected` : "Select records to restore or delete together."}
            </span>
            <button
              className="btn btn-sm"
              disabled={selectedCount === 0}
              onClick={() => restoreRecords(supportedSelectedRows.map((row) => row.record))}
            >
              Restore selected
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={selectedCount === 0}
              onClick={() => setPendingDelete({
                records: supportedSelectedRows.map((row) => row.record),
                title: selectedCount === 1
                  ? supportedSelectedRows[0].detail.title
                  : `Permanently delete ${selectedCount} records`
              })}
            >
              Delete selected...
            </button>
            {selectedKeys.length > 0 ? (
              <button className="btn btn-sm btn-ghost" onClick={() => setSelectedKeys([])}>Clear selection</button>
            ) : null}
          </div>
          <div className="trash-list" aria-label="Trash records">
          {rows.map(({ detail, key, record }) => (
            <article key={`${record.recordType}:${record.recordId}:${record.trashedAt}`} className="trash-card">
              <div className="trash-card-main">
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {detail.supported ? (
                    <input
                      aria-label={`Select ${detail.title}`}
                      checked={selectedKeys.includes(key)}
                      onChange={() => toggleSelection(key)}
                      type="checkbox"
                    />
                  ) : null}
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
                  <button className="btn btn-sm" onClick={() => restoreRecords([record])}>
                    Restore {detail.title}
                  </button>
                ) : (
                  <span className="tag tag-warn">Restore unavailable</span>
                )}
                {detail.supported ? (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setPendingDelete({ records: [record], title: detail.title })}
                  >
                    Permanently delete {detail.title}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          </div>
        </>
      )}

      {pendingDelete ? (
        <ConfirmDialog
          destructive
          title={pendingDelete.records.length === 1 ? `Permanently delete ${pendingDelete.title}` : pendingDelete.title}
          message={permanentDeleteMessage(pendingDelete.records)}
          confirmLabel="Delete permanently"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => permanentlyDeleteRecords(pendingDelete.records)}
        />
      ) : null}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Trash action failed";
}

function trashRecordKey(record: TrashRecord): string {
  return `${record.recordType}:${record.recordId}:${record.trashedAt}`;
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

function permanentDeleteMessage(records: TrashRecord[]): string {
  if (records.length > 1) {
    return `This permanently removes ${records.length} supported trash records. Work items may also remove linked comments, relationships, reminders, attachments, and document links. This cannot be undone.`;
  }
  const record = records[0];
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
