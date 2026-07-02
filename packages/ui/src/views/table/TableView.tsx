import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  comparePriority,
  type Label,
  type PriorityDefinition,
  type StatusDefinition,
  type WorkItem,
  type WorkItemTypeDefinition
} from "@gph/core";
import {
  DataTable,
  EmptyState,
  MetadataBadge,
  SelectField,
  TextField,
  ViewToolbar,
  type DataTableColumn
} from "../../components";
import { useProjectStore } from "../../store/project-store";

type SortKey = "title" | "status" | "priority" | "type" | "due" | "updated";

type Row = {
  item: WorkItem;
  labels: Label[];
  priority?: PriorityDefinition;
  status?: StatusDefinition;
  type?: WorkItemTypeDefinition;
};

export function TableView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const rows: Row[] = useMemo(() => {
    if (!bundle) return [];
    const out: Row[] = [];
    const q = filterText.toLowerCase();
    for (const item of bundle.core.items) {
      if (item.trashedAt || item.archived) continue;
      if (typeFilter && item.typeId !== typeFilter) continue;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q)
      ) {
        continue;
      }
      out.push({
        item,
        status: bundle.core.statuses.find((s) => s.id === item.statusId),
        priority: bundle.core.priorities.find((p) => p.id === item.priorityId),
        type: bundle.core.itemTypes.find((t) => t.id === item.typeId),
        labels: item.labelIds
          .map((id) => bundle.core.labels.find((l) => l.id === id))
          .filter(Boolean) as Label[]
      });
    }
    out.sort((a, b) => {
      let value = 0;
      switch (sortKey) {
        case "title":
          value = a.item.title.localeCompare(b.item.title);
          break;
        case "status":
          value = (a.status?.order ?? 0) - (b.status?.order ?? 0);
          break;
        case "priority":
          value = comparePriority(
            a.item.priorityId,
            b.item.priorityId,
            bundle.core.priorities
          );
          break;
        case "type":
          value = (a.type?.order ?? 0) - (b.type?.order ?? 0);
          break;
        case "due":
          value = (a.item.dueDate ?? "9999").localeCompare(
            b.item.dueDate ?? "9999"
          );
          break;
        case "updated":
          value = b.item.updatedAt.localeCompare(a.item.updatedAt);
          break;
      }
      return sortDir === "asc" ? value : -value;
    });
    return out;
  }, [bundle, filterText, sortDir, sortKey, typeFilter]);

  if (!bundle) return null;

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const header = (key: SortKey, label: string) =>
    sortKey === key ? `${label} (${sortDir})` : label;

  const columns: Array<DataTableColumn<Row>> = [
    {
      id: "title",
      header: header("title", "Title"),
      onSort: () => setSort("title"),
      sortButtonLabel: "Sort by title",
      render: ({ item }) => (
        <Link
          to={`/item/${item.id}`}
          style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}
        >
          {item.title}
        </Link>
      )
    },
    {
      id: "type",
      header: header("type", "Type"),
      onSort: () => setSort("type"),
      sortButtonLabel: "Sort by type",
      render: ({ type }) => <MetadataBadge>{type?.name ?? "None"}</MetadataBadge>
    },
    {
      id: "status",
      header: header("status", "Status"),
      onSort: () => setSort("status"),
      sortButtonLabel: "Sort by status",
      render: ({ status }) => status?.name ?? "None"
    },
    {
      id: "priority",
      header: header("priority", "Priority"),
      onSort: () => setSort("priority"),
      sortButtonLabel: "Sort by priority",
      render: ({ priority }) => (
        <MetadataBadge tone={priority ? "info" : "neutral"}>
          {priority?.name ?? "None"}
        </MetadataBadge>
      )
    },
    {
      id: "assignee",
      header: "Assignee",
      render: ({ item }) =>
        bundle.core.members.find((member) => member.id === item.assigneeId)
          ?.displayName ?? "None"
    },
    {
      id: "labels",
      header: "Labels",
      render: ({ labels }) => (
        <div className="board-card-labels">
          {labels.map((label) => (
            <span key={label.id} className="board-card-label">
              {label.name}
            </span>
          ))}
        </div>
      )
    },
    {
      id: "due",
      header: header("due", "Due"),
      onSort: () => setSort("due"),
      sortButtonLabel: "Sort by due date",
      render: ({ item }) => item.dueDate ?? "None"
    },
    {
      id: "updated",
      header: header("updated", "Updated"),
      onSort: () => setSort("updated"),
      sortButtonLabel: "Sort by updated date",
      render: ({ item }) => (
        <span className="text-xs text-muted">
          {new Date(item.updatedAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <div className="table-view">
      <ViewToolbar>
        <TextField
          label="Filter"
          placeholder="Filter items"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
        />
        <SelectField
          label="Type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="">All types</option>
          {bundle.core.itemTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </SelectField>
      </ViewToolbar>
      <div className="table-wrap">
        <DataTable
          label="Work items table"
          rows={rows}
          columns={columns}
          empty={
            <EmptyState
              title="No items match"
              description="Adjust the filter or type selection to show more work."
            />
          }
        />
      </div>
    </div>
  );
}
