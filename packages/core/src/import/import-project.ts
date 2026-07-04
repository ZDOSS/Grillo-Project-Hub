import type { ProjectBundle } from "../domain/project";
import { validateProjectBundle } from "../domain/project";
import type { Relationship } from "../domain/work-item";
import type { BoardView, MyWorkView, View } from "../domain/view";
import type { Folder, Document } from "../domain/document";
import type { WorkItem } from "../domain/work-item";

/**
 * Import a project bundle from JSON.
 *
 *  - JSON path: validate the bundle structure and re-key IDs to ensure no collision with an existing project.
 *  - The default behavior is to import into a fresh project ID.
 *  - When `idPrefix` is supplied, every entity ID is prefixed AND every cross-reference field
 *    (parentId, statusId, typeId, labelIds, assigneeId, milestoneId, relationship endpoints,
 *    view column statusIds, project defaults, etc.) is remapped to the new IDs so the
 *    resulting bundle is internally consistent.
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

  if (!prefix) {
    // No re-keying: just rename the project and reset revision.
    return {
      bundle: {
        ...bundle,
        project: {
          ...bundle.project,
          id: options.projectId ?? bundle.project.id,
          name: options.name ?? bundle.project.name,
          revision: 0
        },
        core: { ...bundle.core, events: [] }
      },
      warnings
    };
  }

  // Build the id remap from the union of all old entity IDs.
  const oldIds = new Set<string>();
  const collect = (ids: Iterable<string | undefined | null>) => {
    for (const id of ids) if (id) oldIds.add(id);
  };
  collect(bundle.core.items.map((i) => i.id));
  collect(bundle.core.documents.map((d) => d.id));
  collect(bundle.core.milestones.map((m) => m.id));
  collect(bundle.core.labels.map((l) => l.id));
  collect(bundle.core.members.map((m) => m.id));
  collect(bundle.core.statuses.map((s) => s.id));
  collect(bundle.core.priorities.map((p) => p.id));
  collect(bundle.core.itemTypes.map((t) => t.id));
  collect(bundle.core.reminders.map((r) => r.id));
  collect(bundle.core.attachments.map((a) => a.id));
  collect(bundle.core.relationships.map((r) => r.id));
  collect(bundle.core.folders.map((f) => f.id));
  collect(bundle.core.customFields.map((c) => c.id));

  const remap = (id: string | null | undefined): string | null => {
    if (id === null || id === undefined) return id ?? null;
    return oldIds.has(id) ? `${prefix}${id}` : id;
  };
  const remapArr = (ids: string[] | null | undefined): string[] => {
    if (!ids) return [];
    return ids.map(remap) as string[];
  };

  const next: ProjectBundle = {
    ...bundle,
    project: {
      ...bundle.project,
      id: options.projectId ?? bundle.project.id,
      name: options.name ?? bundle.project.name,
      revision: 0,
      defaultTypeId: remap(bundle.project.defaultTypeId) ?? bundle.project.defaultTypeId,
      defaultInitialStatusId: remap(bundle.project.defaultInitialStatusId) ?? bundle.project.defaultInitialStatusId,
      defaultCompletedStatusId: remap(bundle.project.defaultCompletedStatusId) ?? bundle.project.defaultCompletedStatusId
    },
    core: {
      ...bundle.core,
      items: bundle.core.items.map((i) => remapItem(i, remap, remapArr)),
      documents: bundle.core.documents.map((d) => remapDocument(d, remap)),
      folders: bundle.core.folders.map((f) => remapFolder(f, remap)),
      milestones: bundle.core.milestones.map((m) => ({ ...m, id: `${prefix}${m.id}` })),
      labels: bundle.core.labels.map((l) => ({ ...l, id: `${prefix}${l.id}` })),
      members: bundle.core.members.map((m) => ({ ...m, id: `${prefix}${m.id}` })),
      statuses: bundle.core.statuses.map((s) => ({ ...s, id: `${prefix}${s.id}` })),
      priorities: bundle.core.priorities.map((p) => ({ ...p, id: `${prefix}${p.id}` })),
      itemTypes: bundle.core.itemTypes.map((t) => ({
        ...t,
        id: `${prefix}${t.id}`,
        defaultStatusId: remap(t.defaultStatusId ?? null) ?? null,
        defaultPriorityId: remap(t.defaultPriorityId ?? null) ?? null
      })),
      customFields: bundle.core.customFields.map((c) => ({
        ...c,
        id: `${prefix}${c.id}`,
        applicableTypeIds: c.applicableTypeIds ? c.applicableTypeIds.map(remap) as never : c.applicableTypeIds
      })),
      reminders: bundle.core.reminders.map((r) => {
        // Remap targetId only when the target is an entity in the old set;
        // for milestones/documents we always have those in the set, so remap unconditionally
        // (targetId is typed as string in the imported shape).
        const nextTargetId = oldIds.has(r.targetId) ? `${prefix}${r.targetId}` : r.targetId;
        return { ...r, id: `${prefix}${r.id}`, targetId: nextTargetId };
      }),
      attachments: bundle.core.attachments.map((a) => ({
        ...a,
        id: `${prefix}${a.id}`,
        itemId: remap(a.itemId ?? null),
        docId: remap(a.docId ?? null)
      })),
      relationships: bundle.core.relationships.map<Relationship>((r) => ({
        ...r,
        id: `${prefix}${r.id}`,
        sourceItemId: (remap(r.sourceItemId) ?? r.sourceItemId) as Relationship["sourceItemId"],
        targetItemId: (remap(r.targetItemId) ?? r.targetItemId) as Relationship["targetItemId"]
      })),
      events: []
    },
    modules: remapModules(bundle.modules, prefix, remap),
    projectSettings: {
      ...bundle.projectSettings,
      defaultViewId: bundle.projectSettings.defaultViewId
        ? (oldIds.has(bundle.projectSettings.defaultViewId)
            ? `${prefix}${bundle.projectSettings.defaultViewId}`
            : bundle.projectSettings.defaultViewId)
        : null
    }
  };

  // Validate that no cross-reference was left dangling. Walk the bundle and check that
  // every reference points at a known entity.
  validateRemappedBundle(next, warnings);

  return { bundle: next, warnings };
}

function remapItem(
  i: WorkItem,
  remap: (id: string | null | undefined) => string | null,
  remapArr: (ids: string[] | null | undefined) => string[]
): WorkItem {
  return {
    ...i,
    id: remap(i.id) ?? i.id,
    typeId: (remap(i.typeId) ?? i.typeId) as WorkItem["typeId"],
    statusId: (remap(i.statusId) ?? i.statusId) as WorkItem["statusId"],
    priorityId: (remap(i.priorityId ?? null) ?? null) as WorkItem["priorityId"],
    assigneeId: (remap(i.assigneeId ?? null) ?? null) as WorkItem["assigneeId"],
    reporterId: (remap(i.reporterId ?? null) ?? null) as WorkItem["reporterId"],
    labelIds: remapArr(i.labelIds) as WorkItem["labelIds"],
    milestoneId: (remap(i.milestoneId ?? null) ?? null) as WorkItem["milestoneId"],
    parentId: (remap(i.parentId ?? null) ?? null) as WorkItem["parentId"]
  };
}

function remapDocument(d: Document, remap: (id: string | null | undefined) => string | null): Document {
  return { ...d, id: remap(d.id) ?? d.id, folderId: (remap(d.folderId ?? null) ?? null) as Document["folderId"] };
}

function remapFolder(f: Folder, remap: (id: string | null | undefined) => string | null): Folder {
  return { ...f, id: remap(f.id) ?? f.id, parentFolderId: (remap(f.parentFolderId ?? null) ?? null) as Folder["parentFolderId"] };
}

type ModuleSection = ProjectBundle["modules"][string];

function remapModules(
  modules: ProjectBundle["modules"],
  prefix: string,
  remap: (id: string | null | undefined) => string | null
): ProjectBundle["modules"] {
  const next: ProjectBundle["modules"] = {};
  for (const [moduleId, section] of Object.entries(modules)) {
    if (moduleId === "builtin.kanban") {
      const data = section.data as { views?: Record<string, View> } | undefined;
      const views = data?.views ?? {};
      const nextViews: Record<string, View> = {};
      for (const [viewId, view] of Object.entries(views)) {
        nextViews[`${prefix}${viewId}`] = remapView(view, prefix, remap);
      }
      next[moduleId] = {
        ...section,
        data: { ...section.data, views: nextViews } as ModuleSection["data"]
      };
    } else {
      next[moduleId] = section;
    }
  }
  return next;
}

function remapView(view: View, prefix: string, remap: (id: string | null | undefined) => string | null): View {
  const common = {
    id: `${prefix}${view.id}` as View["id"],
    filter: remapViewFilter(view.filter, remap)
  };
  switch (view.type) {
    case "board": {
      const board: BoardView = {
        ...view,
        ...common,
        id: common.id as BoardView["id"],
        columns: view.columns.map((c) => ({
          ...c,
          statusIds: c.statusIds.map(remap) as BoardView["columns"][number]["statusIds"],
          defaultDropStatusId: (remap(c.defaultDropStatusId) ?? c.defaultDropStatusId) as BoardView["columns"][number]["defaultDropStatusId"]
        }))
      };
      return board;
    }
    case "myWork": {
      const mw: MyWorkView = {
        ...view,
        ...common,
        id: common.id as MyWorkView["id"],
        filterMemberId: (remap(view.filterMemberId) ?? view.filterMemberId) as MyWorkView["filterMemberId"]
      };
      return mw;
    }
    default:
      return { ...view, ...common };
  }
}

function remapViewFilter(filter: View["filter"], remap: (id: string | null | undefined) => string | null): View["filter"] {
  if (!filter) return undefined;
  const remapIds = (ids: string[] | undefined) => ids?.map((id) => remap(id) ?? id);
  return {
    ...filter,
    typeIds: remapIds(filter.typeIds),
    statusIds: remapIds(filter.statusIds),
    priorityIds: remapIds(filter.priorityIds),
    assigneeIds: remapIds(filter.assigneeIds),
    labelIds: remapIds(filter.labelIds),
    milestoneIds: remapIds(filter.milestoneIds)
  };
}

function validateRemappedBundle(bundle: ProjectBundle, warnings: string[]): void {
  const known = new Set<string>();
  for (const i of bundle.core.items) known.add(i.id);
  for (const d of bundle.core.documents) known.add(d.id);
  for (const m of bundle.core.milestones) known.add(m.id);
  for (const l of bundle.core.labels) known.add(l.id);
  for (const m of bundle.core.members) known.add(m.id);
  for (const s of bundle.core.statuses) known.add(s.id);
  for (const p of bundle.core.priorities) known.add(p.id);
  for (const t of bundle.core.itemTypes) known.add(t.id);
  for (const c of bundle.core.customFields) known.add(c.id);
  for (const f of bundle.core.folders) known.add(f.id);
  const kanban = bundle.modules["builtin.kanban"];
  const views = ((kanban?.data as { views?: Record<string, View> } | undefined)?.views) ?? {};
  for (const v of Object.values(views)) known.add(v.id);

  const dangling: string[] = [];
  for (const i of bundle.core.items) {
    for (const [field, value] of [
      ["typeId", i.typeId],
      ["statusId", i.statusId],
      ["priorityId", i.priorityId],
      ["assigneeId", i.assigneeId],
      ["reporterId", i.reporterId],
      ["milestoneId", i.milestoneId],
      ["parentId", i.parentId]
    ] as const) {
      if (value !== null && !known.has(value)) dangling.push(`item.${i.id}.${field} -> ${value}`);
    }
    for (const l of i.labelIds) if (!known.has(l)) dangling.push(`item.${i.id}.labelIds -> ${l}`);
  }
  for (const r of bundle.core.relationships) {
    if (!known.has(r.sourceItemId)) dangling.push(`relationship.${r.id}.sourceItemId -> ${r.sourceItemId}`);
    if (!known.has(r.targetItemId)) dangling.push(`relationship.${r.id}.targetItemId -> ${r.targetItemId}`);
  }
  for (const w of Object.values(views)) {
    if (w.filter) {
      for (const typeId of w.filter.typeIds ?? []) if (!known.has(typeId)) dangling.push(`view.${w.id}.filter.typeIds -> ${typeId}`);
      for (const statusId of w.filter.statusIds ?? []) if (!known.has(statusId)) dangling.push(`view.${w.id}.filter.statusIds -> ${statusId}`);
      for (const priorityId of w.filter.priorityIds ?? []) if (!known.has(priorityId)) dangling.push(`view.${w.id}.filter.priorityIds -> ${priorityId}`);
      for (const assigneeId of w.filter.assigneeIds ?? []) if (!known.has(assigneeId)) dangling.push(`view.${w.id}.filter.assigneeIds -> ${assigneeId}`);
      for (const labelId of w.filter.labelIds ?? []) if (!known.has(labelId)) dangling.push(`view.${w.id}.filter.labelIds -> ${labelId}`);
      for (const milestoneId of w.filter.milestoneIds ?? []) if (!known.has(milestoneId)) dangling.push(`view.${w.id}.filter.milestoneIds -> ${milestoneId}`);
    }
    if (w.type === "board") {
      for (const col of w.columns) {
        for (const s of col.statusIds) if (!known.has(s)) dangling.push(`view.${w.id}.column.${col.id}.statusIds -> ${s}`);
        if (!known.has(col.defaultDropStatusId)) dangling.push(`view.${w.id}.column.${col.id}.defaultDropStatusId -> ${col.defaultDropStatusId}`);
      }
    }
    if (w.type === "myWork" && w.filterMemberId && !known.has(w.filterMemberId)) {
      dangling.push(`view.${w.id}.filterMemberId -> ${w.filterMemberId}`);
    }
  }
  for (const d of dangling) warnings.push(`Dangling reference after import: ${d}`);
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
