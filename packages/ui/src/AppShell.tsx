import { type MouseEventHandler, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  CalendarDays,
  ChartGantt,
  Download,
  FileText,
  FolderKanban,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Play,
  Save,
  Search,
  Settings,
  Sun,
  Table2,
  Trash2,
  UserRound,
  WifiOff,
  X
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { exportProjectJson, importProjectJson, validateProjectBundle, type ProjectBundle, type ProjectStoreAdapter, type StorageTrust, type WatchEvent } from "@gph/core";
import { useProjectStore } from "./store/project-store";
import { useTheme } from "./theme/theme-provider";
import { CommandPalette, registerCoreCommands } from "./commands/CommandPalette";
import { openPalette } from "./commands/palette-bus";
import { Button, ConfirmDialog, HelpTip, IconButton, InlineAlert, ToastProvider, useToast } from "./components";
import { PROJECT_NAV_ITEMS } from "./nav-config";
import { useWorkspaceStore } from "./store/workspace-store";
import { hasRegisteredSavedRoute, savedViewsForBundle, viewRoute } from "./views/planning/view-helpers";

export type AppShellProps = {
  appMode: "web" | "desktop";
  children: ReactNode;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type ExternalNotice = {
  error?: string;
  message: string;
  revision?: number | null;
  targetKey?: string | null;
};

function activeAdapter(): ProjectStoreAdapter | null {
  if (typeof window === "undefined") return null;
  return ((window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store) ?? null;
}

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

export function AppShell(props: AppShellProps) {
  return (
    <ToastProvider>
      <AppShellFrame {...props} />
    </ToastProvider>
  );
}

function AppShellFrame({ appMode, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const bundle = useProjectStore((s) => s.bundle);
  const storageKey = useProjectStore((s) => s.storageKey);
  const storagePath = useProjectStore((s) => s.storagePath);
  const storageTrust = useProjectStore((s) => s.storageTrust);
  const isDirty = useProjectStore((s) => s.isDirty);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const saveError = useProjectStore((s) => s.saveError);
  const setBundle = useProjectStore((s) => s.setBundle);
  const markSaving = useProjectStore((s) => s.markSaving);
  const markSaved = useProjectStore((s) => s.markSaved);
  const markSaveFailed = useProjectStore((s) => s.markSaveFailed);
  const markUnsaved = useProjectStore((s) => s.markUnsaved);
  const closeProject = useProjectStore((s) => s.closeProject);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);
  const { resolved, toggle } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [externalNotice, setExternalNotice] = useState<ExternalNotice | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const mobileNavOpenRef = useRef(false);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const dueToastKeyRef = useRef<string | null>(null);
  const { notify } = useToast();

  const setMobileNavSheetOpen = (open: boolean) => {
    mobileNavOpenRef.current = open;
    setMobileNavOpen(open);
  };

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
        if (mobileNavOpenRef.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setMobileNavSheetOpen(false);
          return;
        }
        window.dispatchEvent(new CustomEvent("gph:close-overlay"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileNavSheetOpen(false);
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

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (appMode !== "web") return;
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [appMode]);

  useEffect(() => {
    if (!bundle || !storageKey) return;
    const adapter = activeAdapter();
    if (!adapter?.watch) return;
    const describeEvent = (event: WatchEvent): ExternalNotice | null => {
      if (event.type === "externalChange" && event.key === storageKey) {
        return {
          message: "This project changed outside Grillo.",
          revision: event.newRevision,
          targetKey: event.key
        };
      }
      if (event.type === "deleted" && event.key === storageKey) {
        return {
          message: "The saved project file was removed or moved outside Grillo.",
          revision: null,
          targetKey: null
        };
      }
      if (event.type === "renamed" && event.oldKey === storageKey) {
        return {
          message: "The saved project file was renamed outside Grillo.",
          revision: null,
          targetKey: event.newKey
        };
      }
      return null;
    };
    return adapter.watch((event) => {
      const notice = describeEvent(event);
      if (notice) setExternalNotice(notice);
    });
  }, [bundle, storageKey]);

  useEffect(() => {
    if (!bundle) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const dueItems = bundle.core.items.filter((item) =>
      !item.archived &&
      !item.trashedAt &&
      item.dueDate != null &&
      item.dueDate <= today
    ).length;
    const dueReminders = bundle.core.reminders.filter((reminder) =>
      !reminder.archived &&
      Date.parse(reminder.remindAt) <= now
    ).length;
    if (dueItems === 0 && dueReminders === 0) return;
    const key = `${bundle.project.id}:${today}:${dueItems}:${dueReminders}`;
    if (dueToastKeyRef.current === key) return;
    dueToastKeyRef.current = key;
    const parts = [
      dueItems > 0 ? `${dueItems} due item${dueItems === 1 ? "" : "s"}` : null,
      dueReminders > 0 ? `${dueReminders} due reminder${dueReminders === 1 ? "" : "s"}` : null
    ].filter(Boolean);
    notify({ tone: "info", message: parts.join(" and ") });
  }, [bundle, notify]);

  const reloadExternalProject = useCallback(async () => {
    const reloadKey = externalNotice?.targetKey ?? storageKey;
    if (!reloadKey) return;
    const adapter = activeAdapter();
    if (!adapter) {
      setExternalNotice((current) => current ? { ...current, error: "No storage adapter is available." } : current);
      return;
    }
    try {
      const loaded = storageTrust === "folder" && adapter.loadFolderProject
        ? await adapter.loadFolderProject(reloadKey)
        : await adapter.load(reloadKey);
      if (!loaded) {
        throw new Error("The saved project could not be loaded from the current storage location.");
      }
      const imported = importProjectJson(loaded.json);
      validateProjectBundle(imported.bundle);
      setBundle(imported.bundle, {
        storageKey: loaded.metadata.key,
        storagePath: loaded.metadata.displayPath,
        storageTrust: loaded.metadata.trust
      });
      setExternalNotice(null);
    } catch (error) {
      setExternalNotice((current) => current ? { ...current, error: (error as Error).message } : current);
    }
  }, [externalNotice?.targetKey, setBundle, storageKey, storageTrust]);

  const keepLocalChanges = useCallback(() => {
    markUnsaved();
    setExternalNotice(null);
  }, [markUnsaved]);

  const saveCurrentProject = useCallback(async () => {
    if (!bundle) return;
    const adapter = activeAdapter();
    if (!adapter) {
      const message = "No storage adapter is available.";
      markSaveFailed(message);
      notify({ tone: "danger", message });
      return;
    }
      markSaving();
    try {
      const key = storageKey ?? bundle.project.id;
      const targetTrust = await trustForManualSave(adapter, storageTrust);
      const metadata = await adapter.save(key, exportProjectJson(withRuntimeStorageTrust(bundle, targetTrust)), null);
      markSaved(metadata.key, metadata.displayPath, metadata.trust);
      if (metadata.trust !== "unsaved") {
        recordRecent({
          key: metadata.key,
          name: bundle.project.name,
          storagePath: metadata.displayPath,
          trust: metadata.trust,
          lastOpenedAt: new Date().toISOString()
        });
      }
      notify({
        tone: "success",
        message: `Saved ${bundle.project.name} to ${metadata.trust === "folder" ? "folder" : "browser storage"}.`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      markSaveFailed(message);
      notify({ tone: "danger", message: `Save failed: ${message}` });
    }
  }, [bundle, markSaveFailed, markSaved, markSaving, notify, recordRecent, storageKey, storageTrust]);

  const confirmCloseProject = useCallback(() => {
    setCloseConfirmOpen(false);
    closeProject();
    navigate("/projects");
  }, [closeProject, navigate]);

  const closeCurrentProject = useCallback(() => {
    if (isDirty || storageTrust === "unsaved") {
      setCloseConfirmOpen(true);
      return;
    }
    confirmCloseProject();
  }, [confirmCloseProject, isDirty, storageTrust]);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }, [installPrompt]);

  const trust = storageTrust;
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
            onClick={() => setMobileNavSheetOpen(true)}
            ref={mobileTriggerRef}
          >
            <Menu aria-hidden="true" />
          </IconButton>
          {bundle ? (
            <>
              <strong>{bundle.project.name}</strong>
              <SaveStateIndicator
                isDirty={isDirty}
                lastSavedAt={lastSavedAt}
                saveError={saveError}
                saveStatus={saveStatus}
                storagePath={storagePath}
                trust={trust}
              />
              <HelpTip label="Storage trust">
                Folder projects write a `.pms.json` file in your selected folder. Browser-local projects only live in this browser until exported.
              </HelpTip>
              <span className="shell-project-actions">
                <Button
                  icon={<Save aria-hidden="true" />}
                  loading={saveStatus === "saving"}
                  loadingLabel="Saving..."
                  onClick={() => void saveCurrentProject()}
                  size="sm"
                  variant={saveStatus === "error" ? "danger" : "primary"}
                >
                  {saveStatus === "error" ? "Retry save" : "Save now"}
                </Button>
                <Button
                  icon={<FolderKanban aria-hidden="true" />}
                  onClick={() => navigate("/projects")}
                  size="sm"
                  variant="ghost"
                >
                  Switch project
                </Button>
                <IconButton aria-label="Close project" onClick={closeCurrentProject}>
                  <LogOut aria-hidden="true" />
                </IconButton>
              </span>
            </>
          ) : (
            <span className="text-muted">No project open</span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {!online ? (
            <span className="storage-badge shell-connectivity-badge" data-trust="offline">
              <WifiOff aria-hidden="true" size={14} />
              Offline
            </span>
          ) : null}
          {installPrompt ? (
            <Button
              size="sm"
              icon={<Download aria-hidden="true" />}
              onClick={() => void promptInstall()}
            >
              Install app
            </Button>
          ) : null}
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
        <div className="mobile-nav-backdrop" onMouseDown={() => setMobileNavSheetOpen(false)}>
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
                onClick={() => setMobileNavSheetOpen(false)}
                ref={mobileCloseRef}
              >
                <X aria-hidden="true" />
              </IconButton>
            </div>
            <nav className="mobile-nav-content" aria-label="Mobile workspace navigation">
              <ShellNavContent
                locationPathname={location.pathname}
                onNavigate={() => setMobileNavSheetOpen(false)}
                showBrand={false}
                visibleNavItems={visibleNavItems}
              />
            </nav>
          </aside>
        </div>
      ) : null}

      <main className="app-main">
        {saveError ? (
          <div className="shell-banner">
            <InlineAlert tone="danger">Save failed: {saveError}</InlineAlert>
          </div>
        ) : null}
        {externalNotice ? (
          <div className="shell-banner">
            <InlineAlert tone="warning">
              <div className="shell-banner-content">
                <span>
                  {externalNotice.message}
                  {externalNotice.revision != null ? ` Revision ${externalNotice.revision}.` : ""}
                </span>
                <span className="shell-banner-actions">
                  <Button size="sm" onClick={() => void reloadExternalProject()}>Reload from storage</Button>
                  <Button size="sm" variant="ghost" onClick={keepLocalChanges}>Keep my changes</Button>
                </span>
              </div>
              {externalNotice.error ? <div className="text-xs">{externalNotice.error}</div> : null}
            </InlineAlert>
          </div>
        ) : null}
        {isProjectRoute && bundle ? <ProjectViewTabs items={visibleNavItems} savedViews={savedPlanningViews} /> : null}
        <div className="view-content">{children}</div>
      </main>

      {closeConfirmOpen ? (
        <ConfirmDialog
          confirmLabel="Close without saving"
          destructive
          message={
            storageTrust === "unsaved"
              ? "This project has not been saved yet. Closing it will discard the in-memory workspace unless you save it first."
              : "This project has unsaved changes. Closing it will discard those changes unless you save first."
          }
          onCancel={() => setCloseConfirmOpen(false)}
          onConfirm={confirmCloseProject}
          title="Close project without saving?"
        />
      ) : null}

      <CommandPalette />
    </div>
  );
}

function SaveStateIndicator({
  isDirty,
  lastSavedAt,
  saveError,
  saveStatus,
  storagePath,
  trust
}: {
  isDirty: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  storagePath: string | null;
  trust: "folder" | "browser" | "unsaved";
}) {
  const destination = trust === "folder" ? "folder" : trust === "browser" ? "browser" : "unsaved project";
  const label = saveStatus === "error" || saveError
    ? `Save failed to ${destination}`
    : saveStatus === "saving"
      ? `Saving to ${destination}`
      : isDirty
        ? `Unsaved changes to ${destination}`
        : trust === "unsaved"
          ? "Not saved yet"
          : `Saved to ${destination}${lastSavedAt ? ` - ${formatSaveAge(lastSavedAt)}` : ""}`;

  return (
    <span
      aria-label={label}
      className="save-state-indicator storage-badge"
      data-status={saveStatus}
      data-trust={trust}
      role="status"
      title={storagePath ?? label}
    >
      <span className="storage-dot" />
      {label}
    </span>
  );
}

async function trustForManualSave(
  adapter: ProjectStoreAdapter,
  currentTrust: StorageTrust
): Promise<StorageTrust> {
  if (currentTrust === "folder" || currentTrust === "browser") return currentTrust;
  try {
    const folder = await adapter.getCurrentFolderDisplay?.();
    return folder ? "folder" : "browser";
  } catch {
    return "browser";
  }
}

function withRuntimeStorageTrust(bundle: ProjectBundle, storageTrust: StorageTrust): ProjectBundle {
  return {
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      storageTrust
    }
  };
}

function formatSaveAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";
  const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
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
