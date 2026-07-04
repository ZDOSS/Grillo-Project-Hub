import { useEffect } from "react";
import { useProjectStore } from "./store/project-store";
import { BoardView } from "./views/board/BoardView";
import { BacklogView } from "./views/backlog/BacklogView";
import { TableView } from "./views/table/TableView";
import { OverviewView } from "./views/overview/OverviewView";
import { DocsView } from "./views/docs/DocsView";
import { RoadmapView } from "./views/roadmap/RoadmapView";
import { CalendarView } from "./views/calendar/CalendarView";
import { BugTriageView } from "./views/bugs/BugTriageView";
import { MyWorkView } from "./views/mywork/MyWorkView";
import { TrashView } from "./views/trash/TrashView";
import { SearchView } from "./views/search/SearchView";
import { SettingsView } from "./views/settings/SettingsView";
import { WorkItemModal, CreateItemDialog } from "./work-item";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { openCreateItem } from "./commands/palette-bus";
import type { BacklogView as BacklogViewDef, BoardView as BoardViewDef, TableView as TableViewDef, View } from "@gph/core";
import { savedViewsForBundle } from "./views/planning/view-helpers";

/**
 * Routes that need a project. They guard against an empty bundle and prompt the user
 * to open or create a project.
 */
export function ProjectRouter() {
  const bundle = useProjectStore((s) => s.bundle);
  if (!bundle) {
    return (
      <div className="empty">
        <div className="empty-title">No project open</div>
        <div>Use the workspace launcher to reopen a saved project, import a bundle, or browse the demo.</div>
        <div className="row" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" to="/">Projects</Link>
          <Link className="btn" to="/open">Open / import</Link>
          <Link className="btn btn-ghost" to="/demo">Demo</Link>
        </div>
      </div>
    );
  }
  return <ProjectRoutes />;
}

function ProjectRoutes() {
  const bundle = useProjectStore((s) => s.bundle);
  const location = useLocation();
  const views = bundle ? savedViewsForBundle(bundle) : [];
  const boardView =
    views.find((v): v is BoardViewDef => v.id === bundle?.projectSettings.defaultViewId && v.type === "board") ??
    views.find((v): v is BoardViewDef => v.type === "board");
  const isItemRoute = location.pathname.startsWith("/item/");

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewView />} />
        <Route path="/board" element={boardView ? <BoardView view={boardView as BoardViewDef} /> : <BacklogView />} />
        <Route path="/board/view/:viewId" element={<SavedBoardRoute views={views} />} />
        <Route path="/backlog" element={<BacklogView />} />
        <Route path="/backlog/view/:viewId" element={<SavedBacklogRoute views={views} />} />
        <Route path="/table" element={<TableView />} />
        <Route path="/table/view/:viewId" element={<SavedTableRoute views={views} />} />
        <Route path="/docs" element={<DocsView />} />
        <Route path="/doc/:docId" element={<DocsView />} />
        <Route path="/roadmap" element={<RoadmapView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/bugs" element={<BugTriageView />} />
        <Route path="/mywork" element={<MyWorkView />} />
        <Route path="/trash" element={<TrashView />} />
        <Route path="/search" element={<SearchView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/item/:itemId" element={null} />
      </Routes>
      {isItemRoute ? (
        <Routes>
          <Route path="/item/:itemId" element={<WorkItemModal />} />
        </Routes>
      ) : null}
      <CreateItemDialogWithShortcut />
    </>
  );
}

function SavedBoardRoute({ views }: { views: View[] }) {
  const { viewId } = useParams();
  const view = views.find((entry): entry is BoardViewDef => entry.id === viewId && entry.type === "board");
  return view ? <BoardView view={view} /> : <Navigate to="/board" replace />;
}

function SavedBacklogRoute({ views }: { views: View[] }) {
  const { viewId } = useParams();
  const view = views.find((entry): entry is BacklogViewDef => entry.id === viewId && entry.type === "backlog");
  return view ? <BacklogView view={view} /> : <Navigate to="/backlog" replace />;
}

function SavedTableRoute({ views }: { views: View[] }) {
  const { viewId } = useParams();
  const view = views.find((entry): entry is TableViewDef => entry.id === viewId && entry.type === "table");
  return view ? <TableView view={view} /> : <Navigate to="/table" replace />;
}

function CreateItemDialogWithShortcut() {
  useEffect(() => {
    const onShortcut = () => openCreateItem();
    window.addEventListener("gph:open-create-item-shortcut", onShortcut);
    return () => window.removeEventListener("gph:open-create-item-shortcut", onShortcut);
  }, []);
  return <CreateItemDialog />;
}
