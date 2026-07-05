import { type MouseEventHandler, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  CalendarDays,
  ChartGantt,
  FileText,
  FolderKanban,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Menu,
  Moon,
  Play,
  Search,
  Settings,
  Sun,
  Table2,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "./store/project-store";
import { useTheme } from "./theme/theme-provider";
import { CommandPalette, registerCoreCommands } from "./commands/CommandPalette";
import { openPalette } from "./commands/palette-bus";
import { Button, IconButton } from "./components";
import { PROJECT_NAV_ITEMS } from "./nav-config";
import { hasRegisteredSavedRoute, savedViewsForBundle, viewRoute } from "./views/planning/view-helpers";

export type AppShellProps = {
  appMode: "web" | "desktop";
  children: ReactNode;
};

// ── Shared shell icons ───────────────────────────────────────────────────────

// ── Logo mark ────────────────────────────────────────────────────────────────
const navIconProps = { size: 16, "aria-hidden": true, strokeWidth: 1.75 } as const;

// A minimal geometric cricket/G mark. Two arcs suggest antennae + body.

const GrilloLogo = () => (
  <svg
    className="sidebar-logo"
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    aria-label="Grillo"
  >
    {/* Body — rounded rect */}
    <rect x="6" y="9" width="10" height="8" rx="3" stroke="currentColor" strokeWidth="1.75"/>
    {/* Head */}
    <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.75"/>
    {/* Left antenna */}
    <path d="M9 5.5 C8 3.5 5.5 3 5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Right antenna */}
    <path d="M13 5.5 C14 3.5 16.5 3 17 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Legs — three per side, subtle */}
    <line x1="6" y1="12" x2="3" y2="11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <line x1="6" y1="14" x2="3" y2="14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <line x1="6" y1="16" x2="3" y2="17" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <line x1="16" y1="12" x2="19" y2="11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <line x1="16" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <line x1="16" y1="16" x2="19" y2="17" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
  </svg>
);

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ICONS = {
  overview: <LayoutDashboard {...navIconProps} />,
  board: <KanbanSquare {...navIconProps} />,
  backlog: <ListTodo {...navIconProps} />,
  table: <Table2 {...navIconProps} />,
  roadmap: <ChartGantt {...navIconProps} />,
  calendar: <CalendarDays {...navIconProps} />,
  docs: <FileText {...navIconProps} />,
  bugs: <Bug {...navIconProps} />,
  mywork: <UserRound {...navIconProps} />,
  trash: <Trash2 {...navIconProps} />,
  search: <Search {...navIconProps} />
} satisfies Record<(typeof PROJECT_NAV_ITEMS)[number]["id"], ReactNode>;

const NAV_ITEMS = PROJECT_NAV_ITEMS.map((item) => ({
  ...item,
  icon: NAV_ICONS[item.id]
}));

const SECONDARY = [
  { to: "/settings", label: "Settings", icon: <Settings {...navIconProps} /> },
];

// ── Shell ────────────────────────────────────────────────────────────────────

export function AppShell({ appMode, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const bundle = useProjectStore((s) => s.bundle);
  const { resolved, toggle } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => registerCoreCommands(), []);

  useEffect(() => {
    if (bundle && location.pathname === "/") {
      navigate("/overview", { replace: true });
    }
  }, [bundle, location.pathname, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        openPalette();
      } else if (
        !mod &&
        e.key === "c" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        const target = e.target as HTMLElement | null;
        if (target && target.isContentEditable) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("gph:open-create-item"));
      } else if (e.key === "Escape") {
        setMobileNavOpen(false);
        window.dispatchEvent(new CustomEvent("gph:close-overlay"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    requestAnimationFrame(() => mobileCloseRef.current?.focus());
    return () => {
      requestAnimationFrame(() => mobileTriggerRef.current?.focus());
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const onToggle = () => toggle();
    const onOpenCreate = () =>
      window.dispatchEvent(new CustomEvent("gph:open-create-item-shortcut"));
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
  const hiddenViewIds = bundle?.projectSettings.hiddenViewIds ?? [];
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !hiddenViewIds.includes(item.id)),
    [hiddenViewIds]
  );
  const savedPlanningViews = useMemo(
    () => bundle ? savedViewsForBundle(bundle).filter((view) => (
      view.id !== bundle.projectSettings.defaultViewId &&
      hasRegisteredSavedRoute(view)
    )) : [],
    [bundle]
  );
  const isProjectRoute = useMemo(
    () =>
      location.pathname !== "/" &&
      !location.pathname.startsWith("/projects") &&
      !location.pathname.startsWith("/open") &&
      !location.pathname.startsWith("/demo"),
    [location.pathname]
  );

  return (
    <div className="app-shell" data-mode={appMode} data-theme={resolved}>
      <nav className="app-sidebar" aria-label="Workspace">
        <ShellNavContent locationPathname={location.pathname} visibleNavItems={visibleNavItems} />
      </nav>

      <header className="app-header" aria-label="Grillo Project Hub">
        <div className="row" style={{ gap: 8 }}>
          <IconButton
            aria-label="Open workspace navigation"
            className="mobile-nav-trigger"
            onClick={() => setMobileNavOpen(true)}
            ref={mobileTriggerRef}
          >
            <Menu aria-hidden="true" />
          </IconButton>
          {bundle ? (
            <>
              <strong>{bundle.project.name}</strong>
              <span className="storage-badge" data-trust={trust}>
                <span className="storage-dot" />
                {trust === "folder"
                  ? "Folder"
                  : trust === "browser"
                  ? "Browser"
                  : "Unsaved"}
              </span>
            </>
          ) : (
            <span className="text-muted">No project open</span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            size="sm"
            icon={<Search aria-hidden="true" />}
            onClick={() => openPalette()}
          >
            Search commands <kbd className="kbd">Ctrl K</kbd>
          </Button>
          <IconButton
            onClick={toggle}
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolved === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </IconButton>
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="mobile-nav-backdrop" onMouseDown={() => setMobileNavOpen(false)}>
          <aside
            aria-label="Workspace navigation"
            aria-modal="true"
            className="mobile-nav-sheet"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mobile-nav-header">
              <div className="sidebar-brand mobile-nav-brand">
                <GrilloLogo />
                <span className="sidebar-brand-name">Grillo</span>
              </div>
              <IconButton
                aria-label="Close workspace navigation"
                onClick={() => setMobileNavOpen(false)}
                ref={mobileCloseRef}
              >
                <X aria-hidden="true" />
              </IconButton>
            </div>
            <nav className="mobile-nav-content" aria-label="Mobile workspace navigation">
              <ShellNavContent
                locationPathname={location.pathname}
                onNavigate={() => setMobileNavOpen(false)}
                showBrand={false}
                visibleNavItems={visibleNavItems}
              />
            </nav>
          </aside>
        </div>
      ) : null}

      <main className="app-main">
        {isProjectRoute && bundle ? <ProjectViewTabs items={visibleNavItems} savedViews={savedPlanningViews} /> : null}
        <div className="view-content">{children}</div>
      </main>

      <CommandPalette />
    </div>
  );
}

function ShellNavContent({
  locationPathname,
  onNavigate,
  showBrand = true,
  visibleNavItems
}: {
  locationPathname: string;
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
  showBrand?: boolean;
  visibleNavItems: typeof NAV_ITEMS;
}) {
  return (
    <>
      {showBrand ? (
        <div className="sidebar-brand">
          <GrilloLogo />
          <span className="sidebar-brand-name">Grillo</span>
        </div>
      ) : null}

      <div className="sidebar-section">
        <div className="sidebar-section-title">Workspace</div>
        <Link
          to="/projects"
          className="sidebar-link"
          aria-current={locationPathname === "/projects" ? "page" : undefined}
          onClick={onNavigate}
        >
          <FolderKanban {...navIconProps} /> Projects
        </Link>
        <Link
          to="/open"
          className="sidebar-link"
          aria-current={locationPathname === "/open" ? "page" : undefined}
          onClick={onNavigate}
        >
          <FolderOpen {...navIconProps} /> Open
        </Link>
        <Link
          to="/demo"
          className="sidebar-link"
          aria-current={locationPathname === "/demo" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Play {...navIconProps} /> Demo
        </Link>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Project</div>
        {visibleNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="sidebar-link"
            aria-current={
              locationPathname.startsWith(item.to) ? "page" : undefined
            }
            onClick={onNavigate}
          >
            {item.icon} {item.label}
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
            aria-current={
              locationPathname.startsWith(item.to) ? "page" : undefined
            }
            onClick={onNavigate}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}

function ProjectViewTabs({ items, savedViews }: { items: typeof NAV_ITEMS; savedViews: ReturnType<typeof savedViewsForBundle> }) {
  const location = useLocation();
  return (
    <div className="viewbar" role="tablist" aria-label="Project views">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          role="tab"
          aria-current={
            location.pathname.startsWith(item.to) ? "page" : undefined
          }
          className="viewbar-tab"
        >
          {item.label}
        </Link>
      ))}
      {savedViews.map((view) => {
        const to = viewRoute(view);
        return (
          <Link
            key={view.id}
            to={to}
            role="tab"
            aria-current={location.pathname === to ? "page" : undefined}
            className="viewbar-tab viewbar-tab-saved"
          >
            {view.name}
          </Link>
        );
      })}
    </div>
  );
}
