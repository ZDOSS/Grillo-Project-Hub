import type { ProjectBundle } from "../domain/project";

/**
 * Local full-text search across items, docs, comments, and labels.
 *
 * Used by the in-app search bar and as the structured backend for the validated
 * search command, so UI and AI/MCP callers get the same results.
 */

export type SearchHit =
  | { type: "item"; id: string; title: string; snippet: string }
  | { type: "doc"; id: string; title: string; snippet: string }
  | { type: "comment"; id: string; title: string; snippet: string; itemId: string }
  | { type: "label"; id: string; title: string };

export type SearchOptions = {
  scope?: Array<"items" | "docs" | "comments" | "labels">;
  filters?: {
    typeIds?: string[];
    statusIds?: string[];
    assigneeIds?: string[];
    milestoneIds?: string[];
    labelIds?: string[];
  };
  limit?: number;
};

export function searchProject(bundle: ProjectBundle, query: string, options: SearchOptions = {}): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scope = options.scope ?? ["items", "docs", "comments", "labels"];
  const hits: SearchHit[] = [];
  const limit = options.limit ?? 50;

  if (scope.includes("items")) {
    for (const item of bundle.core.items) {
      if (item.trashedAt) continue;
      if (options.filters?.typeIds && !options.filters.typeIds.includes(item.typeId)) continue;
      if (options.filters?.statusIds && !options.filters.statusIds.includes(item.statusId)) continue;
      if (options.filters?.assigneeIds && !options.filters.assigneeIds.includes(item.assigneeId ?? "")) continue;
      if (options.filters?.milestoneIds && !options.filters.milestoneIds.includes(item.milestoneId ?? "")) continue;
      if (options.filters?.labelIds && !item.labelIds.some((l) => options.filters!.labelIds!.includes(l))) continue;
      if (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
        hits.push({ type: "item", id: item.id, title: item.title, snippet: snippet(item.description, q) });
        if (hits.length >= limit) return hits;
      }
    }
  }
  if (scope.includes("docs")) {
    for (const doc of bundle.core.documents) {
      if (doc.title.toLowerCase().includes(q) || doc.body.toLowerCase().includes(q)) {
        hits.push({ type: "doc", id: doc.id, title: doc.title, snippet: snippet(doc.body, q) });
        if (hits.length >= limit) return hits;
      }
    }
  }
  if (scope.includes("comments")) {
    for (const item of bundle.core.items) {
      for (const c of item.comments) {
        if (c.deleted) continue;
        if (c.body.toLowerCase().includes(q)) {
          hits.push({ type: "comment", id: c.id, title: `Comment on ${item.title}`, snippet: snippet(c.body, q), itemId: item.id });
          if (hits.length >= limit) return hits;
        }
      }
    }
  }
  if (scope.includes("labels")) {
    for (const l of bundle.core.labels) {
      if (l.name.toLowerCase().includes(q)) {
        hits.push({ type: "label", id: l.id, title: l.name });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

function snippet(text: string, q: string, len = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text.slice(0, len);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 120);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
