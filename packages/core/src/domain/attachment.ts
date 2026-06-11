import type { AttachmentId, ItemId, DocumentId, ProjectId } from "./ids";
import { generateId } from "./ids";
import { type Timestamp, nowTimestamp } from "./dates";

/**
 * Attachment metadata lives in the project model. Binary payloads live in a sibling
 * `.pm-suite/attachments/` folder for folder-backed projects. Both metadata and payload are
 * preserved through import/export.
 *
 * Preview rules:
 *  - safely preview common images, plain text, and PDFs where platform capabilities allow
 *  - open unsupported types externally or via download flow
 *  - never execute or render active/unknown content as trusted inline
 */

export type AttachmentKind = "image" | "text" | "pdf" | "binary" | "unknown";

export type Attachment = {
  id: AttachmentId;
  projectId: ProjectId;
  filename: string;
  mediaType: string;
  size: number;
  /** Path relative to the project's .pm-suite/attachments/ folder, or null for browser storage. */
  storagePath: string | null;
  /** Base64-encoded data URI fallback for browser-only persistence. */
  dataUri?: string | null;
  createdAt: Timestamp;
  itemId?: ItemId | null;
  docId?: DocumentId | null;
  archived?: boolean;
};

export function createAttachment(input: {
  projectId: ProjectId;
  filename: string;
  mediaType: string;
  size: number;
  storagePath?: string | null;
  dataUri?: string | null;
  itemId?: ItemId | null;
  docId?: DocumentId | null;
  id?: string;
}): Attachment {
  return {
    id: input.id ?? generateId("att"),
    projectId: input.projectId,
    filename: input.filename,
    mediaType: input.mediaType,
    size: input.size,
    storagePath: input.storagePath ?? null,
    dataUri: input.dataUri ?? null,
    createdAt: nowTimestamp(),
    itemId: input.itemId ?? null,
    docId: input.docId ?? null,
    archived: false
  };
}

export function attachmentKindFor(mediaType: string): AttachmentKind {
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("text/")) return "text";
  if (mediaType === "application/pdf") return "pdf";
  if (mediaType === "application/octet-stream" || mediaType === "") return "binary";
  return "unknown";
}

export function isSafeToPreview(mediaType: string): boolean {
  const kind = attachmentKindFor(mediaType);
  return kind === "image" || kind === "text" || kind === "pdf";
}
