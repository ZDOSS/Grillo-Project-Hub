import type { ViewId, ColumnId, StatusId, MemberId } from "./ids";
import { generateId } from "./ids";

/**
 * Views: per-project saved presentations of the same data model.
 *
 *  - BoardView groups items by columns, where each column groups one or more workflow statuses
 *    and declares one mapped default drop status.
 *  - Other view types (backlog, table, roadmap, docs, calendar, bugs) reuse the same underlying items.
 */

export type ViewType = "board" | "backlog" | "table" | "roadmap" | "docs" | "calendar" | "bugs" | "myWork";

export type ViewBase = {
  id: ViewId;
  type: ViewType;
  name: string;
  /** Saved view filters, e.g. for My Work. */
  filterMemberId?: MemberId | null;
  archived?: boolean;
};

export type BoardColumn = {
  id: ColumnId;
  name: string;
  /** Status IDs grouped by this column. A status maps to at most one column. */
  statusIds: StatusId[];
  /** Default drop status when an item is dropped on this column. */
  defaultDropStatusId: StatusId;
  /** WIP limit. Null/undefined = no limit. */
  wipLimit?: number | null;
  /** "warn" = visual warning; "hard" = reject moves that would exceed. */
  wipMode?: "warn" | "hard";
  order: number;
};

export type BoardView = ViewBase & {
  type: "board";
  columns: BoardColumn[];
  showSwimlanes?: boolean;
};

export type BacklogView = ViewBase & {
  type: "backlog";
  groupBy?: "priority" | "milestone" | "type" | "none";
};

export type TableView = ViewBase & {
  type: "table";
  visibleColumns?: string[];
};

export type RoadmapView = ViewBase & {
  type: "roadmap";
  zoom?: "week" | "month" | "quarter";
};

export type DocsView = ViewBase & { type: "docs" };
export type CalendarView = ViewBase & { type: "calendar" };
export type BugsView = ViewBase & { type: "bugs" };
export type MyWorkView = ViewBase & { type: "myWork"; filterMemberId: MemberId };

export type View = BoardView | BacklogView | TableView | RoadmapView | DocsView | CalendarView | BugsView | MyWorkView;

export function createBoardView(input: {
  name: string;
  columns: Array<Omit<BoardColumn, "id"> & { id?: string }>;
  id?: string;
}): BoardView {
  return {
    id: input.id ?? generateId("view"),
    type: "board",
    name: input.name,
    columns: input.columns.map((c, idx) => ({
      id: c.id ?? generateId("col"),
      name: c.name,
      statusIds: c.statusIds,
      defaultDropStatusId: c.defaultDropStatusId,
      wipLimit: c.wipLimit ?? null,
      wipMode: c.wipMode ?? "warn",
      order: c.order ?? idx * 1024
    }))
  };
}

export function createBacklogView(input: { name: string; groupBy?: BacklogView["groupBy"]; id?: string }): BacklogView {
  return { id: input.id ?? generateId("view"), type: "backlog", name: input.name, groupBy: input.groupBy ?? "priority" };
}

export function createTableView(input: { name: string; visibleColumns?: string[]; id?: string }): TableView {
  return { id: input.id ?? generateId("view"), type: "table", name: input.name, visibleColumns: input.visibleColumns ?? [] };
}

export function createRoadmapView(input: { name: string; zoom?: RoadmapView["zoom"]; id?: string }): RoadmapView {
  return { id: input.id ?? generateId("view"), type: "roadmap", name: input.name, zoom: input.zoom ?? "month" };
}

export function createDocsView(input: { name: string; id?: string }): DocsView {
  return { id: input.id ?? generateId("view"), type: "docs", name: input.name };
}

export function createCalendarView(input: { name: string; id?: string }): CalendarView {
  return { id: input.id ?? generateId("view"), type: "calendar", name: input.name };
}

export function createBugsView(input: { name: string; id?: string }): BugsView {
  return { id: input.id ?? generateId("view"), type: "bugs", name: input.name };
}

export function createMyWorkView(input: { name: string; memberId: MemberId; id?: string }): MyWorkView {
  return { id: input.id ?? generateId("view"), type: "myWork", name: input.name, filterMemberId: input.memberId };
}

/** Find the column that a status maps to in a board view. */
export function findColumnForStatus(board: BoardView, statusId: StatusId): BoardColumn | null {
  return board.columns.find((c) => c.statusIds.includes(statusId)) ?? null;
}

/** Validate that within one board, no status maps to more than one column. */
export function validateBoardStatusUniqueness(board: BoardView): void {
  const seen = new Set<StatusId>();
  for (const col of board.columns) {
    for (const s of col.statusIds) {
      if (seen.has(s)) {
        throw new Error(`Status ${s} appears in more than one column on board ${board.id}`);
      }
      seen.add(s);
    }
  }
}
