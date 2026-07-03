import { useRef, useState } from "react";
import { FilePlus, Trash2 } from "lucide-react";
import { attachmentKindFor, type Attachment } from "@gph/core";
import { InlineAlert } from "../components";

type AttachmentPanelProps = {
  attachments: Attachment[];
  onAddAttachment: (input: {
    dataUri: string | null;
    filename: string;
    mediaType: string;
    size: number;
  }) => void;
  onDeleteAttachment: (attachmentId: string) => void;
};

export function AttachmentPanel({
  attachments,
  onAddAttachment,
  onDeleteAttachment
}: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const dataUri = await readFileAsDataUri(file);
        onAddAttachment({
          dataUri,
          filename: file.name,
          mediaType: file.type || "application/octet-stream",
          size: file.size
        });
      }
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not read attachment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="attachment-panel">
      <div className="attachment-upload-row">
        <label className="label attachment-upload-label">
          Upload attachment
          <input
            ref={inputRef}
            aria-label="Upload attachment"
            className="input"
            disabled={uploading}
            onChange={(event) => {
              void uploadFiles(event.target.files);
            }}
            type="file"
          />
        </label>
        <span className="text-xs text-muted">
          Browser projects store a data URI fallback; folder-backed storage can move the payload later.
        </span>
      </div>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {attachments.length === 0 ? (
        <div className="text-muted text-sm">No attachments</div>
      ) : (
        <div className="attachment-list">
          {attachments.map((attachment) => (
            <AttachmentCard
              attachment={attachment}
              key={attachment.id}
              onDelete={() => onDeleteAttachment(attachment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentCard({
  attachment,
  onDelete
}: {
  attachment: Attachment;
  onDelete: () => void;
}) {
  return (
    <div className="attachment-card">
      <div className="attachment-card-header">
        <div className="attachment-title">
          <FilePlus aria-hidden="true" size={16} />
          <div>
            <div className="text-sm">{attachment.filename}</div>
            <div className="text-xs text-muted">
              {attachment.mediaType || "application/octet-stream"} · {formatBytes(attachment.size)}
            </div>
          </div>
        </div>
        <button
          aria-label={`Delete attachment ${attachment.filename}`}
          className="btn btn-ghost btn-sm"
          onClick={onDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} />
          Delete
        </button>
      </div>
      <AttachmentPreview attachment={attachment} />
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const kind = attachmentKindFor(attachment.mediaType);
  if (kind === "image" && attachment.dataUri) {
    return (
      <div className="attachment-preview attachment-preview-image">
        <img alt={`Preview of ${attachment.filename}`} src={attachment.dataUri} />
      </div>
    );
  }
  if (kind === "text" && attachment.dataUri) {
    return (
      <div className="attachment-preview">
        <div className="attachment-preview-label">Text preview</div>
        <pre>{decodeTextDataUri(attachment.dataUri)}</pre>
      </div>
    );
  }
  if (kind === "pdf") {
    return (
      <div className="attachment-preview attachment-preview-metadata">
        <span className="tag tag-info">PDF metadata only</span>
        <span className="text-xs text-muted">{attachment.mediaType}</span>
      </div>
    );
  }
  return (
    <div className="attachment-preview attachment-preview-metadata">
      <span className="tag">No inline preview for this file type.</span>
      <span className="text-xs text-muted">{attachment.mediaType || "application/octet-stream"}</span>
    </div>
  );
}

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function decodeTextDataUri(dataUri: string): string {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) return "Text preview unavailable";
  const metadata = dataUri.slice(0, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  try {
    const decoded = metadata.includes(";base64")
      ? globalThis.atob(payload)
      : decodeURIComponent(payload);
    return decoded.length > 1200 ? `${decoded.slice(0, 1200)}...` : decoded;
  } catch {
    return "Text preview unavailable";
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
