import { type ReactNode } from "react";

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  render: (row: Row) => ReactNode;
  sortButtonLabel?: string;
  onSort?: () => void;
};

export function DataTable<Row>({
  columns,
  empty,
  label,
  rows
}: {
  columns: Array<DataTableColumn<Row>>;
  empty?: ReactNode;
  label: string;
  rows: Row[];
}) {
  return (
    <table className="table gph-data-table" role="grid" aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id}>
              {column.onSort ? (
                <button
                  className="gph-table-sort"
                  type="button"
                  onClick={column.onSort}
                  aria-label={column.sortButtonLabel ?? `Sort by ${column.header}`}
                >
                  {column.header}
                </button>
              ) : (
                column.header
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>{empty ?? "No rows"}</td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.id}>{column.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
