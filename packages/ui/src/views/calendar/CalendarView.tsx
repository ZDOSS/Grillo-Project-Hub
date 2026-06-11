import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import type { WorkItem } from "@gph/core";

/**
 * Calendar view. Lightweight month grid showing items by start/due date.
 * Drag-to-reschedule is intentionally out of MVP; the roadmap view is for that.
 */
export function CalendarView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [anchor, setAnchor] = useState<string>(new Date().toISOString().slice(0, 10));

  if (!bundle) return null;
  const items = bundle.core.items.filter((i) => !i.trashedAt && !i.archived && (i.startDate || i.dueDate));

  const { weeks, label } = useMemo(() => {
    const start = new Date(anchor + "T00:00:00Z");
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const firstWeekday = first.getUTCDay();
    const gridStart = new Date(first);
    gridStart.setUTCDate(first.getUTCDate() - firstWeekday);
    const days: { date: string; other: boolean; today: boolean }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setUTCDate(gridStart.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, other: d.getUTCMonth() !== first.getUTCMonth(), today: iso === today });
    }
    return {
      weeks: chunk(days, 7),
      label: first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    };
  }, [anchor]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of items) {
      if (item.startDate) {
        const arr = map.get(item.startDate) ?? [];
        arr.push(item);
        map.set(item.startDate, arr);
      }
      if (item.dueDate && item.dueDate !== item.startDate) {
        const arr = map.get(item.dueDate) ?? [];
        arr.push(item);
        map.set(item.dueDate, arr);
      }
    }
    return map;
  }, [items]);

  return (
    <div className="calendar">
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn btn-sm" onClick={() => shiftMonth(setAnchor, anchor, -1)}>‹</button>
        <strong style={{ minWidth: 160, textAlign: "center" }}>{label}</strong>
        <button className="btn btn-sm" onClick={() => shiftMonth(setAnchor, anchor, 1)}>›</button>
        <button className="btn btn-sm" onClick={() => setAnchor(new Date().toISOString().slice(0, 10))}>Today</button>
      </div>
      <div className="calendar-grid" role="grid" aria-label="Calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="roadmap-month" style={{ textAlign: "left" }}>{d}</div>
        ))}
        {weeks.flat().map((d) => (
          <div key={d.date} className="calendar-day" data-other-month={d.other} data-today={d.today}>
            <div className="calendar-day-num">{Number(d.date.slice(-2))}</div>
            {(itemsByDate.get(d.date) ?? []).map((item) => (
              <Link key={item.id} to={`/item/${item.id}`} className="calendar-pill">{item.title}</Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function shiftMonth(set: (v: string) => void, anchor: string, dir: number) {
  const d = new Date(anchor + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + dir);
  set(d.toISOString().slice(0, 10));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
