import type { DocumentId, FolderId, ItemId } from "./ids";
import { generateId } from "./ids";
import { type Timestamp, nowTimestamp } from "./dates";

/**
 * Documents: first-class project knowledge.
 *
 *  - Stable documentId; identity must not depend on title, folder, or path.
 *  - Markdown body, timestamps, optional folder/section placement.
 *  - Links to other documents and work items via stable IDs.
 *  - Backlinks are derived from links, not stored separately.
 *  - Support structured embeds (doc, item, attachment).
 */

export type DocLink = {
  /** Stable reference; resolves to a doc or work item by ID. */
  refId: string;
  refType: "document" | "workItem";
  /** Display text. */
  label: string;
  /** Position in the body where this link is rendered (for navigation order). */
  order: number;
};

export type DocEmbed = {
  refId: string;
  refType: "document" | "workItem" | "attachment";
  order: number;
};

export type Document = {
  id: DocumentId;
  title: string;
  body: string;
  folderId: FolderId | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived?: boolean;
};

export type Folder = {
  id: FolderId;
  name: string;
  parentFolderId: FolderId | null;
  archived?: boolean;
};

export function createDocument(input: {
  title: string;
  body?: string;
  folderId?: FolderId | null;
  id?: string;
  now?: Timestamp;
}): Document {
  const now = input.now ?? nowTimestamp();
  return {
    id: input.id ?? generateId("doc"),
    title: input.title,
    body: input.body ?? "",
    folderId: input.folderId ?? null,
    createdAt: now,
    updatedAt: now,
    archived: false
  };
}

export function createFolder(input: {
  name: string;
  parentFolderId?: FolderId | null;
  id?: string;
}): Folder {
  return {
    id: input.id ?? generateId("folder"),
    name: input.name,
    parentFolderId: input.parentFolderId ?? null,
    archived: false
  };
}

/** Parse [[wiki-style]] links and structured embeds from a document body. */
export function parseDocLinks(body: string): DocLink[] {
  const links: DocLink[] = [];
  const linkRegex = /\[\[([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = linkRegex.exec(body)) !== null) {
    const [, refType, refId, label] = m;
    if (refType === "doc" || refType === "document" || refType === "item" || refType === "workItem") {
      links.push({
        refId,
        refType: refType === "doc" || refType === "document" ? "document" : "workItem",
        label: label ?? refId,
        order: order++
      });
    }
  }
  return links;
}

export function parseDocEmbeds(body: string): DocEmbed[] {
  const embeds: DocEmbed[] = [];
  const embedRegex = /!\[\[([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]\]/g;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = embedRegex.exec(body)) !== null) {
    const [, refType, refId] = m;
    if (refType === "doc" || refType === "document") {
      embeds.push({ refType: "document", refId, order: order++ });
    } else if (refType === "item" || refType === "workItem") {
      embeds.push({ refType: "workItem", refId, order: order++ });
    } else if (refType === "attachment") {
      embeds.push({ refType: "attachment", refId, order: order++ });
    }
  }
  return embeds;
}

/** Derive backlinks across a corpus of documents. */
export function deriveBacklinks(documents: Document[]): Map<DocumentId, DocumentId[]> {
  const map = new Map<DocumentId, DocumentId[]>();
  for (const doc of documents) {
    const links = parseDocLinks(doc.body);
    for (const link of links) {
      if (link.refType === "document") {
        const arr = map.get(link.refId as DocumentId) ?? [];
        arr.push(doc.id);
        map.set(link.refId as DocumentId, arr);
      }
    }
  }
  return map;
}

/** Convert a structured link to a Markdown or sanitized representation. */
export function linkToMarkdown(link: DocLink): string {
  return `[${link.label}](#${link.refType}/${link.refId})`;
}
