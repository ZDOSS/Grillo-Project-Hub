import { Link } from "react-router-dom";
import {
  getBugData,
  milestoneProgress,
  relationshipsForItem,
  type EventRecord,
  type Milestone,
  type ProjectBundle,
  type WorkItem
} from "@gph/core";
import { EmptyState, MetadataBadge } from "../../components";
import { useProjectStore } from "../../store/project-store";

type DatedEntry = {
  id: string;
  date: string;
  label: string;
  title: string;
  itemId?: string;
};

export function OverviewView() {
  const bundle = useProjectStore((state) => state.bundle);
  const storageTrust = useProjectStore((state) => state.storageTrust);
  const isDirty = useProjectStore((state) => state.isDirty);

  if (!bundle) return null;

  const statusById = new Map(bundle.core.statuses.map((status) => [status.id, status]));
  const visibleItems = bundle.core.items.filter((item) => !item.trashedAt && !item.archived);
  const activeItems = visibleItems.filter((item) => {
    const category = statusById.get(item.statusId)?.category;
    return category !== "completed" && category !== "canceled";
  });
  const blockedItems = activeItems.filter((item) =>
    relationshipsForItem(bundle.core.relationships, item.id).blockedBy.length > 0
  );
  const activeMilestone = pickActiveMilestone(bundle, visibleItems);
  const activeMilestoneItems = activeMilestone
    ? visibleItems.filter((item) => item.milestoneId === activeMilestone.id)
    : [];
  const activeMilestoneDone = activeMilestoneItems.filter((item) =>
    statusById.get(item.statusId)?.category === "completed"
  ).length;
  const progress = activeMilestone
    ? milestoneProgress(activeMilestone, activeMilestoneItems.length, activeMilestoneDone)
    : null;
  const upcoming = upcomingEntries(bundle, visibleItems).slice(0, 6);
  const intakeBugs = bugIntakeItems(bundle, visibleItems).slice(0, 5);
  const recentEvents = [...bundle.core.events].slice(-5).reverse();

  return (
    <div className="overview-view">
      <div className="overview-header">
        <div>
          <h1>Overview</h1>
          <p className="text-sm text-muted">{bundle.project.name}</p>
        </div>
        <div className="overview-badges" aria-label="Project storage state">
          <MetadataBadge>{storageLabel(storageTrust)}</MetadataBadge>
          <MetadataBadge tone={isDirty ? "warning" : "success"}>
            {isDirty ? "Unsaved changes" : "Saved"}
          </MetadataBadge>
        </div>
      </div>

      <div className="overview-actions" aria-label="Primary planning links">
        <Link className="btn btn-sm" to="/roadmap">Roadmap</Link>
        <Link className="btn btn-sm" to="/calendar">Calendar</Link>
        <Link className="btn btn-sm" to="/bugs">Bug triage</Link>
        <Link className="btn btn-sm" to="/table">Table</Link>
      </div>

      <section className="overview-metrics" aria-label="Project metrics">
        <MetricCard label="Active work" value={activeItems.length} />
        <MetricCard label="Blocked" value={blockedItems.length} tone={blockedItems.length ? "danger" : undefined} />
        <MetricCard label="Upcoming" value={upcoming.length} />
        <MetricCard label="Bug intake" value={intakeBugs.length} tone={intakeBugs.length ? "warning" : undefined} />
      </section>

      <div className="overview-grid">
        <section className="overview-panel" aria-label="Milestone progress">
          <PanelHeader title="Milestone progress" to="/roadmap" />
          {activeMilestone && progress ? (
            <div className="overview-stack">
              <div className="row-between">
                <strong>{activeMilestone.name}</strong>
                {activeMilestone.targetDate ? (
                  <span className="text-xs text-muted">Target {activeMilestone.targetDate}</span>
                ) : null}
              </div>
              <div className="overview-progress-bar" aria-label={`${progress.percent}% complete`}>
                <span style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="row-between text-xs text-muted">
                <span>{progress.completed}/{progress.total} complete</span>
                <span>{progress.percent}%</span>
              </div>
              <ItemList items={activeMilestoneItems.slice(0, 4)} />
            </div>
          ) : (
            <EmptyState title="No milestone work" description="Add milestones and dated work to see release progress." />
          )}
        </section>

        <section className="overview-panel" aria-label="Blocked work">
          <PanelHeader title="Blocked work" to="/table" />
          {blockedItems.length ? <ItemList items={blockedItems.slice(0, 5)} /> : (
            <EmptyState title="No blocked work" description="Blocking relationships will appear here." />
          )}
        </section>

        <section className="overview-panel" aria-label="Upcoming agenda">
          <PanelHeader title="Upcoming agenda" to="/calendar" />
          {upcoming.length ? (
            <div className="overview-stack">
              {upcoming.map((entry) => (
                <div key={entry.id} className="overview-agenda-row">
                  <MetadataBadge>{entry.label}</MetadataBadge>
                  <span className="text-xs text-muted">{entry.date}</span>
                  {entry.itemId ? (
                    <Link to={`/item/${entry.itemId}`}>{entry.title}</Link>
                  ) : (
                    <span>{entry.title}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming dates" description="Due dates and reminders will appear here." />
          )}
        </section>

        <section className="overview-panel" aria-label="Bug intake">
          <PanelHeader title="Bug intake" to="/bugs" />
          {intakeBugs.length ? <ItemList items={intakeBugs} /> : (
            <EmptyState title="No intake bugs" description="New bug reports are clear." />
          )}
        </section>

        <section className="overview-panel overview-panel-wide" aria-label="Recent activity">
          <PanelHeader title="Recent activity" to="/search" />
          {recentEvents.length ? <EventList events={recentEvents} bundle={bundle} /> : (
            <EmptyState title="No activity yet" description="Project commands will build an activity timeline." />
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  return (
    <div className="overview-metric" data-tone={tone ?? "default"}>
      <span className="overview-metric-value">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function PanelHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="row-between">
      <h2>{title}</h2>
      <Link className="text-xs" to={to}>Open</Link>
    </div>
  );
}

function ItemList({ items }: { items: WorkItem[] }) {
  return (
    <div className="overview-stack">
      {items.map((item) => (
        <Link key={item.id} className="overview-item-link" to={`/item/${item.id}`}>
          {item.title}
        </Link>
      ))}
    </div>
  );
}

function EventList({ events, bundle }: { events: EventRecord[]; bundle: ProjectBundle }) {
  return (
    <div className="overview-stack">
      {events.map((event) => {
        const item = event.itemId ? bundle.core.items.find((entry) => entry.id === event.itemId) : null;
        return (
          <div key={event.id} className="overview-event-row">
            <MetadataBadge>{event.type}</MetadataBadge>
            {item ? <Link to={`/item/${item.id}`}>{item.title}</Link> : <span>{bundle.project.name}</span>}
            <span className="text-xs text-muted">{new Date(event.at).toLocaleDateString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function pickActiveMilestone(bundle: ProjectBundle, items: WorkItem[]): Milestone | null {
  const withWork = bundle.core.milestones.find((milestone) =>
    items.some((item) => item.milestoneId === milestone.id)
  );
  return withWork ?? bundle.core.milestones[0] ?? null;
}

function upcomingEntries(bundle: ProjectBundle, items: WorkItem[]): DatedEntry[] {
  const rows: DatedEntry[] = [];
  for (const item of items) {
    if (item.dueDate) {
      rows.push({ id: `due-${item.id}`, date: item.dueDate, label: "Due", title: item.title, itemId: item.id });
    }
    if (item.startDate) {
      rows.push({ id: `start-${item.id}`, date: item.startDate, label: "Start", title: item.title, itemId: item.id });
    }
  }
  for (const reminder of bundle.core.reminders.filter((entry) => !entry.archived)) {
    const date = reminder.remindAt.slice(0, 10);
    const target = reminder.targetType === "workItem"
      ? items.find((item) => item.id === reminder.targetId)
      : null;
    rows.push({
      id: `reminder-${reminder.id}`,
      date,
      label: "Reminder",
      title: reminder.message || target?.title || "Reminder",
      itemId: target?.id
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function bugIntakeItems(bundle: ProjectBundle, items: WorkItem[]): WorkItem[] {
  const bugModule = bundle.modules["builtin.bugs"];
  const applicableTypeIds = (bugModule?.config?.applicableTypeIds as string[]) ?? [];
  return items.filter((item) => {
    if (!applicableTypeIds.includes(item.typeId)) return false;
    const category = bundle.core.statuses.find((status) => status.id === item.statusId)?.category;
    const hasBugData = getBugData(item) !== null || item.typeId === "bug";
    return hasBugData && category === "planned";
  });
}

function storageLabel(value: "folder" | "browser" | "unsaved") {
  if (value === "folder") return "Folder-backed";
  if (value === "browser") return "Browser-local";
  return "Unsaved";
}
