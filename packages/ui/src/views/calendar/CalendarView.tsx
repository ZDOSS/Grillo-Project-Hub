import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { WorkItem } from "@gph/core";
import { Button, IconButton, ViewToolbar } from "../../components";
import { useProjectStore } from "../../store/project-store";

/**
 * Calendar view. Lightweight month grid showing items by start/due date.
 * Drag-to-reschedule is intentionally out of MVP; the roadmap view is for that.
 */
export function CalendarView() {
  const bundle = useProjectStore((s) => s.bundle);
  const [anchor, setAnchor] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  if (!bundle) return null;
  const items = bundle.core.items.filter(
    (item) => !item.trashedAt && !item.archived && (item.startDate || item.dueDate)
  );

  const { weeks, label } = useMemo(() => {
    const start = new Date(anchor + "T00:00:00Z");
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const firstWeekday = first.getUTCDay();
    const gridStart = new Date(first);
    gridStart.setUTCDate(first.getUTCDate() - firstWeekday);
    const days: { date: string; other: boolean; today: boolean }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setUTCDate(gridStart.getUTCDate() + index);
      const iso = day.toISOString().slice(0, 10);
      days.push({
        date: iso,
        other: day.getUTCMonth() !== first.getUTCMonth(),
        today: iso === today
      });
    }
    return {
      weeks: chunk(days, 7),
      label: first.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      })
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
      <ViewToolbar>
        <IconButton
          aria-label="Previous month"
          onClick={() => shiftMonth(setAnchor, anchor, -1)}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        <strong style={{ minWidth: 160, textAlign: "center" }}>{label}</strong>
        <IconButton
          aria-label="Next month"
          onClick={() => shiftMonth(setAnchor, anchor, 1)}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
        <Button size="sm" onClick={() => setAnchor(new Date().toISOString().slice(0, 10))}>
          Today
        </Button>
      </ViewToolbar>
      <div className="calendar-grid" role="grid" aria-label="Calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="roadmap-month" style={{ textAlign: "left" }}>
            {day}
          </div>
        ))}
        {weeks.flat().map((day) => (
          <div
            key={day.date}
            className="calendar-day"
            data-other-month={day.other}
            data-today={day.today}
          >
            <div className="calendar-day-num">{Number(day.date.slice(-2))}</div>
            {(itemsByDate.get(day.date) ?? []).map((item) => (
              <Link key={item.id} to={`/item/${item.id}`} className="calendar-pill">
                {item.title}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function shiftMonth(set: (value: string) => void, anchor: string, dir: number) {
  const date = new Date(anchor + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + dir);
  set(date.toISOString().slice(0, 10));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < arr.length; index += size) {
    out.push(arr.slice(index, index + size));
  }
  return out;
}
