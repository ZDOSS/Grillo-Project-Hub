import type { ProjectBundle } from "../domain/project";

/**
 * Export a project bundle to JSON, Markdown, or CSV.
 *
 *  - JSON: canonical, lossless, the primary interchange format.
 *  - Markdown: human-readable, inspectable, transformable.
 *  - CSV: bulk work-item export for spreadsheet/import flows.
 */

export function exportProjectJson(bundle: ProjectBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function exportProjectMarkdown(bundle: ProjectBundle): string {
  const lines: string[] = [];
  lines.push(`# ${bundle.project.name}`);
  if (bundle.project.description) {
    lines.push("");
    lines.push(bundle.project.description);
  }
  lines.push("");
  lines.push(`> Project ID: \`${bundle.project.id}\``);
  lines.push(`> Revision: ${bundle.project.revision}`);
  lines.push(`> Created: ${bundle.project.createdAt}`);
  lines.push(`> Updated: ${bundle.project.updatedAt}`);
  lines.push("");
  if (bundle.core.milestones.length) {
    lines.push("## Milestones");
    for (const m of bundle.core.milestones) {
      lines.push(`- **${m.name}**${m.targetDate ? ` (target ${m.targetDate})` : ""}`);
    }
    lines.push("");
  }
  if (bundle.core.documents.length) {
    lines.push("## Docs");
    for (const d of bundle.core.documents) {
      lines.push(`- [${d.title}](doc:${d.id})`);
    }
    lines.push("");
  }
  if (bundle.core.items.length) {
    lines.push("## Work items");
    for (const item of bundle.core.items) {
      const status = bundle.core.statuses.find((s) => s.id === item.statusId);
      const priority = bundle.core.priorities.find((p) => p.id === item.priorityId);
      const type = bundle.core.itemTypes.find((t) => t.id === item.typeId);
      const label = `[${type?.name ?? "Item"}] ${item.title}`;
      const meta = [
        status ? `status: ${status.name}` : null,
        priority ? `priority: ${priority.name}` : null,
        item.dueDate ? `due: ${item.dueDate}` : null
      ].filter(Boolean).join(" • ");
      lines.push(`- ${label}${meta ? ` — ${meta}` : ""}`);
      if (item.description) {
        for (const dline of item.description.split("\n")) {
          lines.push(`    ${dline}`);
        }
      }
    }
  }
  return lines.join("\n");
}

export function exportProjectCsv(bundle: ProjectBundle): string {
  const headers = [
    "id",
    "type",
    "title",
    "status",
    "priority",
    "assignee",
    "milestone",
    "labels",
    "startDate",
    "dueDate",
    "createdAt",
    "updatedAt",
    "description"
  ];
  const rows: string[][] = [headers];
  for (const item of bundle.core.items) {
    if (item.trashedAt) continue;
    const type = bundle.core.itemTypes.find((t) => t.id === item.typeId);
    const status = bundle.core.statuses.find((s) => s.id === item.statusId);
    const priority = bundle.core.priorities.find((p) => p.id === item.priorityId);
    const member = bundle.core.members.find((m) => m.id === item.assigneeId);
    const milestone = bundle.core.milestones.find((m) => m.id === item.milestoneId);
    const labels = item.labelIds
      .map((id) => bundle.core.labels.find((l) => l.id === id)?.name)
      .filter(Boolean)
      .join("|");
    rows.push([
      item.id,
      type?.name ?? "",
      item.title,
      status?.name ?? "",
      priority ? `${priority.name} (${priority.rank})` : "",
      member?.displayName ?? "",
      milestone?.name ?? "",
      labels,
      item.startDate ?? "",
      item.dueDate ?? "",
      item.createdAt,
      item.updatedAt,
      item.description
    ]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  if (value == null) return "";
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}
