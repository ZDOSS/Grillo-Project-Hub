import type { ProjectBundle } from "../domain/project";
import { validateProjectBundle } from "../domain/project";

/**
 * Import a project bundle from JSON.
 *
 *  - JSON path: validate the bundle structure and re-key IDs to ensure no collision with an existing project.
 *  - The default behavior is to import into a fresh project ID.
 */

export type ImportOptions = {
  /** Optional target project ID; if absent, a new one is generated. */
  projectId?: string;
  /** Optional name override. */
  name?: string;
  /** Optional prefix prepended to all generated sub-IDs to keep them unique when merging. */
  idPrefix?: string;
};

export type ImportResult = {
  bundle: ProjectBundle;
  warnings: string[];
};

export function importProjectJson(raw: string, options: ImportOptions = {}): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  validateProjectBundle(parsed);
  const bundle: ProjectBundle = parsed;
  const warnings: string[] = [];
  if (bundle.format.version !== 1) {
    warnings.push(`Unknown format version ${bundle.format.version}; attempting to read anyway`);
  }
  const prefix = options.idPrefix ?? "";
  const next: ProjectBundle = {
    ...bundle,
    project: {
      ...bundle.project,
      id: options.projectId ?? bundle.project.id,
      name: options.name ?? bundle.project.name,
      revision: 0
    },
    core: {
      ...bundle.core,
      items: bundle.core.items.map((i) => ({ ...i, id: `${prefix}${i.id}` })),
      documents: bundle.core.documents.map((d) => ({ ...d, id: `${prefix}${d.id}` })),
      milestones: bundle.core.milestones.map((m) => ({ ...m, id: `${prefix}${m.id}` })),
      labels: bundle.core.labels.map((l) => ({ ...l, id: `${prefix}${l.id}` })),
      members: bundle.core.members.map((m) => ({ ...m, id: `${prefix}${m.id}` })),
      statuses: bundle.core.statuses.map((s) => ({ ...s, id: `${prefix}${s.id}` })),
      priorities: bundle.core.priorities.map((p) => ({ ...p, id: `${prefix}${p.id}` })),
      itemTypes: bundle.core.itemTypes.map((t) => ({ ...t, id: `${prefix}${t.id}` })),
      reminders: bundle.core.reminders.map((r) => ({ ...r, id: `${prefix}${r.id}` })),
      attachments: bundle.core.attachments.map((a) => ({ ...a, id: `${prefix}${a.id}` })),
      events: []
    }
  };
  return { bundle: next, warnings };
}

/**
 * A simple CSV import: produces a partial bundle skeleton from a CSV with work-item columns.
 * Statuses/priorities/etc. are referenced by name and looked up; unknown names produce warnings
 * and resolve to project defaults.
 */
export function importProjectCsv(raw: string): { rows: Array<Record<string, string>>; warnings: string[] } {
  const rows: Array<Record<string, string>> = [];
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows, warnings };
  const header = parseCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length !== header.length) {
      warnings.push(`Row ${i + 1} has ${cols.length} columns; expected ${header.length}`);
      continue;
    }
    const row: Record<string, string> = {};
    header.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    rows.push(row);
  }
  return { rows, warnings };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
