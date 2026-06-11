import { Link } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { getBugData, type WorkItem } from "@gph/core";
import { openCreateItem } from "../../commands/palette-bus";

/**
 * Bug triage view. Three columns: Intake, Ready, In Progress.
 * Cards emphasize severity and reproduction-step count.
 */
export function BugTriageView() {
  const bundle = useProjectStore((s) => s.bundle);
  if (!bundle) return null;
  const bugModule = bundle.modules["builtin.bugs"];
  const applicableTypeIds: string[] = (bugModule?.config?.applicableTypeIds as string[]) ?? [];
  const severities = (bugModule?.config?.severities as Array<{ id: string; name: string; rank: number; color?: string | null }>) ?? [];
  const statuses = bundle.core.statuses;

  const isBug = (i: WorkItem) => applicableTypeIds.includes(i.typeId) && !i.trashedAt && !i.archived;

  const columns: Array<{ id: string; title: string; statusIds: string[] }> = [
    { id: "intake", title: "Intake", statusIds: ["new", "confirmed"] },
    { id: "ready", title: "Ready", statusIds: ["ready"] },
    { id: "in-progress", title: "In Progress", statusIds: ["in-progress"] }
  ];

  return (
    <div className="bugs">
      {columns.map((col) => {
        const items = bundle.core.items.filter((i) => isBug(i) && col.statusIds.includes(i.statusId));
        return (
          <div key={col.id} className="bugs-column">
            <div className="row-between">
              <strong>{col.title}</strong>
              <div className="row">
                {col.id === "intake" ? (
                  <button className="btn btn-sm btn-primary" onClick={() => openCreateItem({ typeId: "bug" })}>
                    New bug
                  </button>
                ) : null}
                <span className="text-xs text-muted">{items.length}</span>
              </div>
            </div>
            {items.length === 0 && <div className="text-muted text-xs">No bugs</div>}
            {items.map((item) => {
              const data = getBugData(item);
              const sev = severities.find((s) => s.id === data?.severityId);
              return (
                <Link key={item.id} to={`/item/${item.id}`} className="bugs-card" style={{ color: "inherit", textDecoration: "none" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{item.title}</strong>
                    {sev && <span className="bugs-severity" style={{ background: sevColor(sev.color) }}>{sev.name}</span>}
                  </div>
                  <div className="text-xs text-muted">{data?.reproductionSteps?.length ?? 0} reproduction steps</div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function sevColor(c?: string | null): string {
  const palette: Record<string, string> = {
    blue: "rgba(91, 144, 191, 0.2)",
    orange: "rgba(210, 138, 58, 0.25)",
    red: "rgba(177, 58, 58, 0.25)",
    "dark-red": "rgba(120, 30, 30, 0.3)"
  };
  return palette[c ?? ""] ?? "var(--color-bg-muted)";
}
