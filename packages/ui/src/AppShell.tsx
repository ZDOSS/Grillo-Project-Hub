import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "./store/project-store";
import { useTheme } from "./theme/theme-provider";
import { CommandPalette, registerCoreCommands } from "./commands/CommandPalette";
import { openPalette } from "./commands/palette-bus";

/**
 * Shared application shell for web and desktop. The same component is rendered by both targets;
 * differences (folder-backed storage, file watch, OS notifications) live behind platform adapters.
 */
export type AppShellProps = {
  appMode: "web" | "desktop";
  children: ReactNode;
};

const NAV_ITEMS = [
  { to: "/board", label: "Board", icon: "▦" },
  { to: "/backlog", label: "Backlog", icon: "≡" },
  { to: "/table", label: "Table", icon: "▤" },
  { to: "/roadmap", label: "Roadmap", icon: "📅" },
  { to: "/calendar", label: "Calendar", icon: "🗓" },
  { to: "/docs", label: "Docs", icon: "📄" },
  { to: "/bugs", label: "Bug triage", icon: "🐞" },
  { to: "/mywork", label: "My work", icon: "★" },
  { to: "/search", label: "Search", icon: "🔍" }
];

const SECONDARY = [
  { to: "/settings", label: "Settings", icon: "⚙" }
];

export function AppShell({ appMode, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const bundle = useProjectStore((s) => s.bundle);
  const { resolved, toggle } = useTheme();

  useEffect(() => registerCoreCommands(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        openPalette();
      } else if (!mod && e.key === "c" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        const target = e.target as HTMLElement | null;
        if (target && target.isContentEditable) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("gph:open-create-item"));
      } else if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("gph:close-overlay"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onToggle = () => toggle();
    const onOpenCreate = () => window.dispatchEvent(new CustomEvent("gph:open-create-item-shortcut"));
    const onNavigate = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      navigate(path);
    };
    window.addEventListener("gph:toggle-theme", onToggle);
    window.addEventListener("gph:open-create-item", onOpenCreate);
    window.addEventListener("gph:navigate", onNavigate as EventListener);
    return () => {
      window.removeEventListener("gph:toggle-theme", onToggle);
      window.removeEventListener("gph:open-create-item", onOpenCreate);
      window.removeEventListener("gph:navigate", onNavigate as EventListener);
    };
  }, [toggle, navigate]);

  const trust = bundle?.projectSettings.storageTrust ?? "unsaved";
  const isProjectRoute = useMemo(() => location.pathname !== "/" && !location.pathname.startsWith("/open") && !location.pathname.startsWith("/demo"), [location.pathname]);

  return (
    <div className="app-shell" data-mode={appMode} data-theme={resolved}>
      <aside className="app-sidebar" aria-label="Primary Navigation">
        <h1>Grillo Project Hub</h1>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Workspace</div>
          <Link to="/" className="sidebar-link" aria-current={location.pathname === "/" ? "page" : undefined}>
            <span>📁</span> Projects
          </Link>
          <Link to="/open" className="sidebar-link" aria-current={location.pathname === "/open" ? "page" : undefined}>
            <span>📂</span> Open
          </Link>
          <Link to="/demo" className="sidebar-link" aria-current={location.pathname === "/demo" ? "page" : undefined}>
            <span>✨</span> Demo
          </Link>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Project</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="sidebar-link"
              aria-current={location.pathname.startsWith(item.to) ? "page" : undefined}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">App</div>
          {SECONDARY.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="sidebar-link"
              aria-current={location.pathname.startsWith(item.to) ? "page" : undefined}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <header className="app-header" aria-label="Grillo Project Hub">
        <div className="row" style={{ gap: 8 }}>
          {bundle ? (
            <>
              <strong>{bundle.project.name}</strong>
              <span className="storage-badge" data-trust={trust}>
                <span className="storage-dot" />
                {trust === "folder" ? "Folder" : trust === "browser" ? "Browser" : "Unsaved"}
              </span>
            </>
          ) : (
            <span className="text-muted">No project open</span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => openPalette()}>Search / Commands <span className="mono text-xs">Ctrl K</span></button>
          <button className="btn btn-sm" onClick={toggle} aria-label="Toggle theme">
            {resolved === "dark" ? "☾" : "☀"}
          </button>
        </div>
      </header>

      <main className="app-main">
        {isProjectRoute && bundle ? <ProjectViewTabs /> : null}
        <div className="view-content">{children}</div>
      </main>

      <CommandPalette />
    </div>
  );
}

function ProjectViewTabs() {
  const location = useLocation();
  return (
    <div className="viewbar" role="tablist" aria-label="Project views">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          role="tab"
          aria-current={location.pathname.startsWith(item.to)}
          className="viewbar-tab"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
