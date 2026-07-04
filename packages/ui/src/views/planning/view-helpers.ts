import type {
  ProjectBundle,
  View,
  ViewSort,
  WorkItem,
  WorkItemFilter
} from "@gph/core";

export const BASE_TABLE_COLUMNS = ["title", "type", "status", "priority", "assignee", "milestone", "labels", "dueDate", "updatedAt"] as const;
export const MULTI_FILTER_VALUE = "__gph_multi_filter__";

export type BaseTableColumnId = (typeof BASE_TABLE_COLUMNS)[number];

export function savedViewsForBundle(bundle: ProjectBundle): View[] {
  const views = ((bundle.modules["builtin.kanban"]?.data as { views?: Record<string, View> } | undefined)?.views) ?? {};
  return Object.values(views)
    .filter((view) => !view.archived)
    .sort((a, b) => (a.order ?? 10_000) - (b.order ?? 10_000) || a.name.localeCompare(b.name));
}

export function hasRegisteredSavedRoute(view: View): boolean {
  return view.type === "board" || view.type === "backlog" || view.type === "table";
}

export function viewRoute(view: View): string {
  const base = view.type === "myWork" ? "mywork" : view.type;
  return `/${base}/view/${view.id}`;
}

export function nextViewOrder(bundle: ProjectBundle): number {
  const views = savedViewsForBundle(bundle);
  const last = views.reduce((max, view) => Math.max(max, view.order ?? 0), 0);
  return last + 1024;
}

export function cleanWorkItemFilter(filter: WorkItemFilter): WorkItemFilter | undefined {
  const next: WorkItemFilter = {};
  const query = filter.query?.trim();
  if (query) next.query = query;
  if (filter.typeIds?.length) next.typeIds = [...filter.typeIds];
  if (filter.statusIds?.length) next.statusIds = [...filter.statusIds];
  if (filter.priorityIds?.length) next.priorityIds = [...filter.priorityIds];
  if (filter.assigneeIds?.length) next.assigneeIds = [...filter.assigneeIds];
  if (filter.labelIds?.length) next.labelIds = [...filter.labelIds];
  if (filter.milestoneIds?.length) next.milestoneIds = [...filter.milestoneIds];
  return Object.keys(next).length > 0 ? next : undefined;
}

export function selectValueForFilterIds(ids: string[]): string {
  if (ids.length === 0) return "";
  if (ids.length === 1) return ids[0];
  return MULTI_FILTER_VALUE;
}

export function filterIdsFromSelectValue(value: string): string[] {
  if (!value || value === MULTI_FILTER_VALUE) return [];
  return [value];
}

export function itemMatchesFilter(item: WorkItem, filter: WorkItemFilter | undefined): boolean {
  if (!filter) return true;
  const query = filter.query?.trim().toLowerCase();
  if (query && !item.title.toLowerCase().includes(query) && !item.description.toLowerCase().includes(query)) return false;
  if (filter.typeIds?.length && !filter.typeIds.includes(item.typeId)) return false;
  if (filter.statusIds?.length && !filter.statusIds.includes(item.statusId)) return false;
  if (filter.priorityIds?.length && (!item.priorityId || !filter.priorityIds.includes(item.priorityId))) return false;
  if (filter.assigneeIds?.length && (!item.assigneeId || !filter.assigneeIds.includes(item.assigneeId))) return false;
  if (filter.milestoneIds?.length && (!item.milestoneId || !filter.milestoneIds.includes(item.milestoneId))) return false;
  if (filter.labelIds?.length && !filter.labelIds.every((labelId) => item.labelIds.includes(labelId))) return false;
  return true;
}

export function compareItemsBySort(a: WorkItem, b: WorkItem, bundle: ProjectBundle, sort: ViewSort | undefined): number {
  if (!sort) return 0;
  let value = 0;
  switch (sort.field) {
    case "title":
      value = a.title.localeCompare(b.title);
      break;
    case "status":
      value = statusOrder(a.statusId, bundle) - statusOrder(b.statusId, bundle);
      break;
    case "priority":
      value = priorityRank(a.priorityId, bundle) - priorityRank(b.priorityId, bundle);
      break;
    case "type":
      value = typeOrder(a.typeId, bundle) - typeOrder(b.typeId, bundle);
      break;
    case "dueDate":
      value = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      break;
    case "createdAt":
      value = a.createdAt.localeCompare(b.createdAt);
      break;
    case "updatedAt":
      value = a.updatedAt.localeCompare(b.updatedAt);
      break;
  }
  return sort.direction === "asc" ? value : -value;
}

function priorityRank(priorityId: string | null, bundle: ProjectBundle): number {
  if (priorityId === null) return Number.NEGATIVE_INFINITY;
  return bundle.core.priorities.find((priority) => priority.id === priorityId)?.rank ?? Number.NEGATIVE_INFINITY;
}

function statusOrder(statusId: string, bundle: ProjectBundle): number {
  return bundle.core.statuses.find((status) => status.id === statusId)?.order ?? 0;
}

function typeOrder(typeId: string, bundle: ProjectBundle): number {
  return bundle.core.itemTypes.find((type) => type.id === typeId)?.order ?? 0;
}
