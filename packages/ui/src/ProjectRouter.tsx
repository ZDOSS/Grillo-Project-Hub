import { useEffect } from "react";
import { useProjectStore } from "./store/project-store";
import { BoardView } from "./views/board/BoardView";
import { BacklogView } from "./views/backlog/BacklogView";
import { TableView } from "./views/table/TableView";
import { DocsView } from "./views/docs/DocsView";
import { RoadmapView } from "./views/roadmap/RoadmapView";
import { CalendarView } from "./views/calendar/CalendarView";
import { BugTriageView } from "./views/bugs/BugTriageView";
import { MyWorkView } from "./views/mywork/MyWorkView";
import { SearchView } from "./views/search/SearchView";
import { SettingsView } from "./views/settings/SettingsView";
import { WorkItemDrawer, CreateItemDialog } from "./work-item";
import { useNavigate, useParams, useLocation, Route, Routes } from "react-router-dom";
import { openCreateItem, subscribeCreateItem } from "./commands/palette-bus";
import { useState } from "react";

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
        <div>Use the sidebar to create a new project, open a file, or browse the demo.</div>
      </div>
    );
  }
  return <ProjectRoutes />;
}

function ProjectRoutes() {
  const kanbanModule = useProjectStore((s) => s.bundle?.modules["builtin.kanban"]);
  const views = (kanbanModule?.data as { views?: Record<string, { id: string; type: string; name: string }> })?.views ?? {};
  const boardView = Object.values(views).find((v) => v.type === "board") ?? Object.values(views)[0];

  return (
    <>
      <Routes>
        <Route path="/board" element={boardView ? <BoardView view={boardView as never} /> : <BacklogView />} />
        <Route path="/backlog" element={<BacklogView />} />
        <Route path="/table" element={<TableView />} />
        <Route path="/docs" element={<DocsView />} />
        <Route path="/doc/:docId" element={<DocsView />} />
        <Route path="/roadmap" element={<RoadmapView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/bugs" element={<BugTriageView />} />
        <Route path="/mywork" element={<MyWorkView />} />
        <Route path="/search" element={<SearchView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
      <Routes>
        <Route path="/item/:itemId" element={<WorkItemDrawer />} />
      </Routes>
      <CreateItemDialogWithShortcut />
    </>
  );
}

function CreateItemDialogWithShortcut() {
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeCreateItem(setOpen), []);
  useEffect(() => {
    const onShortcut = () => openCreateItem();
    window.addEventListener("gph:open-create-item-shortcut", onShortcut);
    return () => window.removeEventListener("gph:open-create-item-shortcut", onShortcut);
  }, []);
  return <CreateItemDialog />;
}
