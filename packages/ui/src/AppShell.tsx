import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "./store/project-store";
import { useTheme } from "./theme/theme-provider";
import { CommandPalette, registerCoreCommands } from "./commands/CommandPalette";
import { openPalette } from "./commands/palette-bus";
import { PROJECT_NAV_ITEMS } from "./nav-config";

export type AppShellProps = {
  appMode: "web" | "desktop";
  children: ReactNode;
};

// ── Inline SVG icons ────────────────────────────────────────────────────────
// All icons are 16×16, stroke-based, currentColor.

const IconBoard = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="1" width="6" height="6" rx="1"/>
    <rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);

const IconBacklog = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="4" x2="13" y2="4"/>
    <line x1="3" y1="8" x2="13" y2="8"/>
    <line x1="3" y1="12" x2="10" y2="12"/>
  </svg>
);

const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="1" width="14" height="14" rx="1.5"/>
    <line x1="1" y1="5.5" x2="15" y2="5.5"/>
    <line x1="6" y1="5.5" x2="6" y2="15"/>
  </svg>
);

const IconRoadmap = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="3" width="6" height="3" rx="1"/>
    <rect x="5" y="7" width="7" height="3" rx="1"/>
    <rect x="3" y="11" width="9" height="3" rx="1"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="3" width="14" height="12" rx="1.5"/>
    <line x1="1" y1="7" x2="15" y2="7"/>
    <line x1="5" y1="1" x2="5" y2="5"/>
    <line x1="11" y1="1" x2="11" y2="5"/>
  </svg>
);

const IconDocs = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 1h7l3 3v11H3V1z"/>
    <polyline points="10,1 10,4 13,4"/>
    <line x1="5" y1="8" x2="11" y2="8"/>
    <line x1="5" y1="11" x2="9" y2="11"/>
  </svg>
);

const IconBug = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="8" cy="9" rx="4" ry="5"/>
    <path d="M5 6c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
    <line x1="1" y1="9" x2="4" y2="9"/>
    <line x1="12" y1="9" x2="15" y2="9"/>
    <line x1="1" y1="6" x2="4" y2="7"/>
    <line x1="12" y1="7" x2="15" y2="6"/>
    <line x1="1" y1="12" x2="4" y2="11"/>
    <line x1="12" y1="11" x2="15" y2="12"/>
  </svg>
);

const IconMyWork = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="5" r="3"/>
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5"/>
    <line x1="10.5" y1="10.5" x2="14" y2="14"/>
  </svg>
);

const IconProjects = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 4l3-3h4l3 3"/>
    <rect x="1" y="4" width="14" height="10" rx="1.5"/>
    <line x1="5" y1="9" x2="11" y2="9"/>
  </svg>
);

const IconOpen = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 5l3-3h3l2 2h6v9H1V5z"/>
    <line x1="5" y1="10" x2="11" y2="10"/>
  </svg>
);

const IconDemo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="4,2 14,8 4,14"/>
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/>
  </svg>
);

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="8" r="3"/>
    <line x1="8" y1="1" x2="8" y2="3"/>
    <line x1="8" y1="13" x2="8" y2="15"/>
    <line x1="1" y1="8" x2="3" y2="8"/>
    <line x1="13" y1="8" x2="15" y2="8"/>
    <line x1="3.05" y1="3.05" x2="4.46" y2="4.46"/>
    <line x1="11.54" y1="11.54" x2="12.95" y2="12.95"/>
    <line x1="12.95" y1="3.05" x2="11.54" y2="4.46"/>
    <line x1="4.46" y1="11.54" x2="3.05" y2="12.95"/>
  </svg>
);

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/>
  </svg>
);

// ── Logo mark ────────────────────────────────────────────────────────────────
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
  board: <IconBoard />,
  backlog: <IconBacklog />,
  table: <IconTable />,
  roadmap: <IconRoadmap />,
  calendar: <IconCalendar />,
  docs: <IconDocs />,
  bugs: <IconBug />,
  mywork: <IconMyWork />,
  search: <IconSearch />
} satisfies Record<(typeof PROJECT_NAV_ITEMS)[number]["id"], ReactNode>;

const NAV_ITEMS = PROJECT_NAV_ITEMS.map((item) => ({
  ...item,
  icon: NAV_ICONS[item.id]
}));

const SECONDARY = [
  { to: "/settings", label: "Settings", icon: <IconSettings /> },
];

// ── Shell ────────────────────────────────────────────────────────────────────

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
        window.dispatchEvent(new CustomEvent("gph:close-overlay"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
  const isProjectRoute = useMemo(
    () =>
      location.pathname !== "/" &&
      !location.pathname.startsWith("/open") &&
      !location.pathname.startsWith("/demo"),
    [location.pathname]
  );

  return (
    <div className="app-shell" data-mode={appMode} data-theme={resolved}>
      <aside className="app-sidebar" aria-label="Primary Navigation">
        <div className="sidebar-brand">
          <GrilloLogo />
          <span className="sidebar-brand-name">Grillo</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Workspace</div>
          <Link
            to="/"
            className="sidebar-link"
            aria-current={location.pathname === "/" ? "page" : undefined}
          >
            <IconProjects /> Projects
          </Link>
          <Link
            to="/open"
            className="sidebar-link"
            aria-current={location.pathname === "/open" ? "page" : undefined}
          >
            <IconOpen /> Open
          </Link>
          <Link
            to="/demo"
            className="sidebar-link"
            aria-current={location.pathname === "/demo" ? "page" : undefined}
          >
            <IconDemo /> Demo
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
                location.pathname.startsWith(item.to) ? "page" : undefined
              }
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
                location.pathname.startsWith(item.to) ? "page" : undefined
              }
            >
              {item.icon} {item.label}
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
          <button className="btn btn-sm" onClick={() => openPalette()}>
            Search / Commands <kbd className="kbd">Ctrl K</kbd>
          </button>
          <button
            className="btn btn-sm btn-ghost icon-btn"
            onClick={toggle}
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolved === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <main className="app-main">
        {isProjectRoute && bundle ? <ProjectViewTabs items={visibleNavItems} /> : null}
        <div className="view-content">{children}</div>
      </main>

      <CommandPalette />
    </div>
  );
}

function ProjectViewTabs({ items }: { items: typeof NAV_ITEMS }) {
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
    </div>
  );
}
