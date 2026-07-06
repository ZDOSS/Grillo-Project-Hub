import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  buildProjectFromTemplate,
  exportProjectJson,
  importProjectJson,
  listTemplates,
  validateProjectBundle,
  type ProjectBundle,
  type ProjectStoreAdapter,
  type StorageTrust,
  type TemplateId
} from "@gph/core";
import { EmptyState, HelpTip } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore, type RecentProject } from "../../store/workspace-store";

const DESKTOP_FOLDER_KEY = "gph.desktop.folder";

const TEMPLATE_PREVIEWS: Record<TemplateId, { included: string[]; bestFor: string }> = {
  "bug-tracker": {
    bestFor: "Intake-heavy products that need severity, repro steps, and verification lanes.",
    included: ["severity workflow", "bug triage board", "reproduction fields"]
  },
  "release-planner": {
    bestFor: "Milestone-led teams that need roadmap, docs, and clean release checkpoints.",
    included: ["milestones", "release docs", "roadmap planning"]
  },
  "simple-kanban": {
    bestFor: "Small projects that need a quiet three-column board without extra process.",
    included: ["three-column board", "starter tasks", "minimal sidebar"]
  },
  "software-project": {
    bestFor: "Product and engineering work that needs board, backlog, table, bugs, docs, and roadmap.",
    included: ["planning views", "sample docs", "milestones"]
  }
};

type TauriLike = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function isDesktopRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in (window as object);
}

function getTauri(): TauriLike | null {
  if (!isDesktopRuntime()) return null;
  return ((window as typeof window & { __TAURI__?: TauriLike }).__TAURI__) ?? null;
}

function getActiveAdapter(): ProjectStoreAdapter | null {
  return ((window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store) ?? null;
}

function normalizeRecentTrust(trust: "folder" | "browser" | "unsaved"): "folder" | "browser" {
  return trust === "folder" ? "folder" : "browser";
}

function withStorageTrust(bundle: ProjectBundle, storageTrust: StorageTrust): ProjectBundle {
  return {
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      storageTrust
    }
  };
}

function setDesktopFolderPath(path: string): void {
  if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") return;
  localStorage.setItem(DESKTOP_FOLDER_KEY, path);
}

function getDesktopFolderPath(): string {
  if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") return "";
  return localStorage.getItem(DESKTOP_FOLDER_KEY) ?? "";
}

function deriveFolderFromStoragePath(storagePath: string | null): string | null {
  if (!storagePath) return null;
  return storagePath.replace(/[\\/]?\.pm-suite[\\/][^\\/]+$/, "");
}

function folderRecentTarget(recent: RecentProject): string {
  return recent.storagePath ?? `${recent.name}'s folder-backed project file`;
}

function folderReconnectMessage(recent: RecentProject): string {
  return `Choose or reconnect the folder that contains ${folderRecentTarget(recent)}. Browsers can require folder access again after a reload, permission reset, or storage cleanup.`;
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && (error as { name?: string }).name === "AbortError";
}

type FolderReconnectResult = "selected" | "unavailable";

async function openSavedProject(
  recent: RecentProject,
  setBundle: ReturnType<typeof useProjectStore.getState>["setBundle"],
  recordRecent: ReturnType<typeof useWorkspaceStore.getState>["recordRecent"],
  options: {
    allowBrowserRecoveryWhenFolderAccessUnavailable?: boolean;
    reconnectFolderAfterMissingProject?: () => Promise<FolderReconnectResult>;
  } = {}
): Promise<void> {
  const adapter = getActiveAdapter();
  if (!adapter) {
    throw new Error("No storage adapter is available in this runtime.");
  }

  let loaded: Awaited<ReturnType<ProjectStoreAdapter["load"]>> = null;
  let allowBrowserRecovery = options.allowBrowserRecoveryWhenFolderAccessUnavailable ?? false;
  const folder = deriveFolderFromStoragePath(recent.storagePath);
  if (recent.trust === "folder") {
    if (isDesktopRuntime() && folder) {
      // DesktopAdapter.load() currently reads the active folder from localStorage on demand.
      // Restore the folder path before load() so folder-backed recents resolve correctly.
      setDesktopFolderPath(folder);
      loaded = await adapter.load(recent.key);
    } else if (!isDesktopRuntime() && adapter.loadFolderProject) {
      let folderLoadRejected = false;
      try {
        loaded = await adapter.loadFolderProject(recent.key);
      } catch {
        folderLoadRejected = true;
      }
      if (!loaded && !folderLoadRejected && !allowBrowserRecovery && options.reconnectFolderAfterMissingProject) {
        const reconnectResult = await options.reconnectFolderAfterMissingProject();
        if (reconnectResult === "selected") {
          try {
            loaded = await adapter.loadFolderProject(recent.key);
          } catch {
            folderLoadRejected = true;
          }
        } else {
          allowBrowserRecovery = true;
        }
      }
      if (!loaded && (folderLoadRejected || allowBrowserRecovery)) {
        loaded = await adapter.load(recent.key);
      }
      if (!loaded) {
        throw new Error(folderReconnectMessage(recent));
      }
    } else {
      loaded = await adapter.load(recent.key);
    }
  } else {
    loaded = await adapter.load(recent.key);
  }

  if (!loaded) {
    throw new Error("The saved project could not be found in local storage.");
  }

  const imported = importProjectJson(loaded.json);
  validateProjectBundle(imported.bundle);
  setBundle(imported.bundle, {
    storageKey: imported.bundle.project.id,
    storagePath: loaded.metadata.displayPath,
    storageTrust: loaded.metadata.trust
  });
  recordRecent({
    key: imported.bundle.project.id,
    name: imported.bundle.project.name,
    storagePath: loaded.metadata.displayPath,
    trust: normalizeRecentTrust(loaded.metadata.trust),
    lastOpenedAt: new Date().toISOString()
  });
}

async function deleteSavedProject(recent: RecentProject): Promise<void> {
  const adapter = getActiveAdapter();
  if (!adapter) {
    throw new Error("No storage adapter is available in this runtime.");
  }
  await adapter.delete(recent.key);
}

async function listDesktopProjectsInFolder(folder: string): Promise<string[]> {
  const tauri = getTauri();
  if (!tauri || !folder.trim()) return [];
  const result = await tauri.invoke("list_projects_in_folder", { folder: folder.trim() });
  return Array.isArray(result) ? result.filter((name): name is string => typeof name === "string") : [];
}

async function listAdapterFolderProjects(adapter: ProjectStoreAdapter | null): Promise<string[]> {
  if (!adapter?.listFolderProjects) return [];
  return adapter.listFolderProjects();
}

/**
 * Workspace launcher: shows recent projects and the app's storage/open options.
 */
export function ProjectsListView() {
  const navigate = useNavigate();
  const adapter = useMemo(() => getActiveAdapter(), []);
  const recents = useWorkspaceStore((s) => s.recents);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);
  const [showNew, setShowNew] = useState(recents.length === 0);
  const [newName, setNewName] = useState("My Project");
  const [templateId, setTemplateId] = useState<TemplateId>("software-project");
  const [folderPath, setFolderPath] = useState(getDesktopFolderPath());
  const [browserFolderLabel, setBrowserFolderLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyRecentKey, setBusyRecentKey] = useState<string | null>(null);
  const [pendingDeleteRecentKey, setPendingDeleteRecentKey] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const setBundle = useProjectStore((s) => s.setBundle);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);
  const desktopRuntime = useMemo(() => isDesktopRuntime(), []);
  const browserFolderCapable = !desktopRuntime && Boolean(adapter?.chooseFolder);
  const templates = useMemo(() => listTemplates(), []);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const selectedTemplatePreview = TEMPLATE_PREVIEWS[templateId];

  useEffect(() => {
    if (recents.length === 0) setShowNew(true);
  }, [recents.length]);

  useEffect(() => {
    if (!adapter?.getCurrentFolderDisplay) return;
    void adapter.getCurrentFolderDisplay().then((label) => setBrowserFolderLabel(label ?? ""));
  }, [adapter]);

  const chooseBrowserFolder = async () => {
    if (!adapter?.chooseFolder) return;
    setWorkspaceError(null);
    try {
      const label = await adapter.chooseFolder();
      setBrowserFolderLabel(label ?? "");
    } catch (error) {
      if (isAbortError(error)) return;
      setWorkspaceError((error as Error).message);
    }
  };

  const create = async () => {
    const activeAdapter = getActiveAdapter();
    if (!activeAdapter) {
      setWorkspaceError("No storage adapter is available in this runtime.");
      return;
    }
    setCreating(true);
    setWorkspaceError(null);
    try {
      const normalizedFolder = folderPath.trim();
      if (desktopRuntime && normalizedFolder) {
        setDesktopFolderPath(normalizedFolder);
      }
      const folderDisplay = desktopRuntime ? normalizedFolder : browserFolderLabel.trim();
      const intendedTrust: StorageTrust = folderDisplay ? "folder" : "browser";
      const bundle = withStorageTrust(
        buildProjectFromTemplate(templateId, newName.trim() || "Untitled"),
        intendedTrust
      );
      const metadata = await activeAdapter.save(bundle.project.id, exportProjectJson(bundle), null);
      const savedBundle = withStorageTrust(bundle, metadata.trust);
      setBundle(savedBundle, {
        storageKey: savedBundle.project.id,
        storagePath: metadata.displayPath,
        storageTrust: metadata.trust
      });
      recordRecent({
        key: savedBundle.project.id,
        name: savedBundle.project.name,
        storagePath: metadata.displayPath,
        trust: normalizeRecentTrust(metadata.trust),
        lastOpenedAt: new Date().toISOString()
      });
      setShowNew(false);
      navigate("/overview");
    } catch (error) {
      setWorkspaceError(`Create failed: ${(error as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const openRecentProject = async (recent: RecentProject) => {
    setWorkspaceError(null);
    setBusyRecentKey(recent.key);
    try {
      let allowBrowserRecoveryWhenFolderAccessUnavailable = false;
      const reconnectBrowserFolder = async (): Promise<FolderReconnectResult> => {
        if (!adapter?.chooseFolder) return "unavailable";
        try {
          const label = await adapter.chooseFolder();
          if (label) {
            setBrowserFolderLabel(label);
            return "selected";
          }
          return "unavailable";
        } catch (error) {
          if (!isAbortError(error)) throw error;
          return "unavailable";
        }
      };
      if (
        recent.trust === "folder" &&
        !desktopRuntime &&
        !browserFolderLabel.trim() &&
        adapter?.chooseFolder &&
        adapter?.loadFolderProject
      ) {
        const reconnectResult = await reconnectBrowserFolder();
        if (reconnectResult === "unavailable") {
          allowBrowserRecoveryWhenFolderAccessUnavailable = true;
        }
      }
      const shouldRetryRestoredFolder =
        recent.trust === "folder" &&
        !desktopRuntime &&
        Boolean(browserFolderLabel.trim()) &&
        Boolean(adapter?.chooseFolder && adapter?.loadFolderProject);
      await openSavedProject(recent, setBundle, recordRecent, {
        allowBrowserRecoveryWhenFolderAccessUnavailable,
        reconnectFolderAfterMissingProject: shouldRetryRestoredFolder ? reconnectBrowserFolder : undefined
      });
      navigate("/overview");
    } catch (error) {
      setWorkspaceError(isAbortError(error) && recent.trust === "folder" ? folderReconnectMessage(recent) : (error as Error).message);
    } finally {
      setBusyRecentKey(null);
    }
  };

  const handleDeleteProject = async (recent: RecentProject) => {
    try {
      // Folder-backed recents remove the launcher shortcut only; deleting the actual file is a
      // separate filesystem action and should never happen from this UI affordance.
      if (recent.trust === "browser") {
        await deleteSavedProject(recent);
      }
      removeRecent(recent.key);
      setPendingDeleteRecentKey(null);
    } catch (error) {
      setWorkspaceError((error as Error).message);
    }
  };

  return (
    <div className="workspace-page">
      <div className="row-between" style={{ marginBottom: 16, alignItems: "flex-start" }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 style={{ margin: 0 }}>Grillo Project Hub</h1>
          <p className="text-sm text-secondary" style={{ margin: 0, maxWidth: 760 }}>
            {desktopRuntime
              ? "Desktop mode can keep projects browser-local or save them to a folder you choose. Reopen recents directly from here instead of hunting for a JSON file."
              : browserFolderCapable
              ? "The PWA can keep projects browser-local or save them into a local folder you choose. Reopen saved projects here instead of relying on manual JSON imports."
              : "The PWA keeps projects in browser storage. You can reopen saved browser projects here or import/export JSON bundles when you need to move data around."}
          </p>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>New project</button>
          <Link className="btn" to="/open">Open / import</Link>
          <Link className="btn btn-ghost" to="/demo">Demo</Link>
        </div>
      </div>

      {workspaceError ? <div className="workspace-alert">{workspaceError}</div> : null}

      <div className="workspace-grid">
        <section className="workspace-card">
          <div className="row-between">
            <h2 style={{ margin: 0 }}>Saved projects</h2>
            <span className="text-xs text-muted">{recents.length} recent</span>
          </div>
          {recents.length === 0 ? (
            <EmptyState
              title="Create your first project"
              description={desktopRuntime
                ? "Start with a template, connect a folder when you want real project files, or open an existing bundle."
                : "Start with a template, choose a local folder when the browser allows it, or import a portable bundle."}
              actions={(
                <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" type="button" onClick={() => setShowNew(true)}>New project</button>
                  <Link className="btn" to="/open">Open / import</Link>
                  <Link className="btn btn-ghost" to="/demo">Demo</Link>
                </div>
              )}
            />
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {recents.map((r) => (
                <div key={r.key} className="workspace-recent">
                  <div className="col" style={{ gap: 4, minWidth: 0 }}>
                    <strong>{r.name}</strong>
                    <span className="text-xs text-muted" style={{ wordBreak: "break-word" }}>
                      {r.storagePath ?? "(browser storage)"} · {new Date(r.lastOpenedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className="storage-badge" data-trust={r.trust}>
                      <span className="storage-dot" />
                      {r.trust === "folder" ? "Folder" : "Browser"}
                    </span>
                    {pendingDeleteRecentKey === r.key ? (
                      <>
                        <span className="text-xs text-muted">
                          {r.trust === "folder" ? "Remove this recent shortcut?" : "Delete this saved browser project?"}
                        </span>
                        <button className="btn btn-sm btn-danger" onClick={() => void handleDeleteProject(r)}>
                          {r.trust === "folder" ? "Remove recent" : "Delete project"}
                        </button>
                        <button className="btn btn-sm" onClick={() => setPendingDeleteRecentKey(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => void openRecentProject(r)}
                          disabled={busyRecentKey === r.key}
                        >
                          {busyRecentKey === r.key ? "Opening..." : "Open"}
                        </button>
                        <button className="btn btn-sm" onClick={() => setPendingDeleteRecentKey(r.key)}>
                          {r.trust === "folder" ? "Remove recent" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="workspace-card">
          <h2 style={{ marginTop: 0 }}>How projects open here</h2>
          <div className="workspace-source-list">
            <div className="workspace-source">
              <strong>{desktopRuntime ? "Folder-backed projects" : "Browser-local projects"}</strong>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                {desktopRuntime
                  ? "Create a new project with a folder path, or use Open / import to connect an existing `.pm-suite` folder. Once saved, it will show up in recents for one-click reopen."
                  : browserFolderCapable
                  ? "The PWA can save in browser storage or into a local folder selected with the browser file-system picker. Use recents to reopen either mode after reloads."
                  : "The PWA saves projects inside this browser. Use export/import when you want to move them somewhere else, and use recents to reopen them after reloads."}
              </p>
            </div>
            <div className="workspace-source">
              <strong>Portable JSON bundles</strong>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                Import a `project.pms.json` bundle from disk when you need to recover, migrate, or share a project snapshot.
              </p>
            </div>
            <div className="workspace-source">
              <strong>Demo project</strong>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                Open a sample workspace to inspect the board, docs, roadmap, and settings flows without touching your own data.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showNew && (
        <div className="modal-backdrop">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>New project</strong>
            </div>
            <div className="modal-body">
              <div className="col" style={{ gap: 12 }}>
                <label className="label label-row">
                  Name
                  <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </label>
                <div className="label">
                  <span className="row" style={{ alignItems: "center" }}>
                    Template
                    <HelpTip label="Project templates">
                      Templates only shape the starting views, sample data, and defaults. You can change statuses, types, fields, and views later.
                    </HelpTip>
                  </span>
                  <div className="template-preview-grid" role="list" aria-label="Project templates">
                    {templates.map((template) => {
                      const preview = TEMPLATE_PREVIEWS[template.id];
                      return (
                        <button
                          aria-label={`${template.name} template`}
                          aria-pressed={template.id === templateId}
                          className="template-preview-card"
                          data-selected={template.id === templateId}
                          key={template.id}
                          onClick={() => setTemplateId(template.id)}
                          type="button"
                        >
                          <strong>{template.name} template</strong>
                          <span>{template.description}</span>
                          <span className="text-xs text-muted">Best for: {preview.bestFor}</span>
                          <span className="text-xs">Included: {preview.included.join(", ")}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="workspace-inline-note">
                    <strong>{selectedTemplate.name}</strong>: {selectedTemplatePreview.bestFor}
                  </div>
                </div>
                {desktopRuntime ? (
                  <label className="label">
                    Local folder path (optional)
                    <input
                      className="input"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="C:\Projects\Grillo"
                    />
                    <span className="text-xs text-muted">
                      Leave blank to keep the project browser-local inside the desktop shell. Add a folder path to save `.pm-suite/project-id.pms.json` there.
                    </span>
                  </label>
                ) : browserFolderCapable ? (
                  <div className="workspace-source">
                    <strong>Local folder (optional)</strong>
                    <p className="text-xs text-muted" style={{ margin: "6px 0 0" }}>
                      {browserFolderLabel
                        ? `Selected folder: ${browserFolderLabel}. New projects will save into .pm-suite there.`
                        : "Leave this unset to keep the project browser-local, or choose a folder so the PWA writes real .pm-suite files there."}
                    </p>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn btn-sm" type="button" onClick={() => void chooseBrowserFolder()}>
                        {browserFolderLabel ? "Change folder" : "Choose folder"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="workspace-inline-note">
                    The PWA stores this project in browser storage. Use export/import later if you want a portable file.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNew(false)} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void create()} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OpenProjectView() {
  const setBundle = useProjectStore((s) => s.setBundle);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);
  const navigate = useNavigate();
  const adapter = useMemo(() => getActiveAdapter(), []);
  const [busy, setBusy] = useState(false);
  const [folderPath, setFolderPath] = useState(getDesktopFolderPath());
  const [browserFolderLabel, setBrowserFolderLabel] = useState("");
  const [folderFiles, setFolderFiles] = useState<string[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);
  const desktopRuntime = useMemo(() => isDesktopRuntime(), []);
  const browserFolderCapable = !desktopRuntime && Boolean(adapter?.chooseFolder && adapter?.listFolderProjects);

  useEffect(() => {
    if (!adapter?.getCurrentFolderDisplay) return;
    void adapter.getCurrentFolderDisplay().then((label) => setBrowserFolderLabel(label ?? ""));
  }, [adapter]);

  const onFile = async (file: File) => {
    setBusy(true);
    setOpenError(null);
    try {
      const text = await file.text();
      const r = importProjectJson(text);
      validateProjectBundle(r.bundle);
      setBundle(r.bundle, { storageKey: r.bundle.project.id, storagePath: null, storageTrust: "browser" });
      recordRecent({ key: r.bundle.project.id, name: r.bundle.project.name, storagePath: null, trust: "browser", lastOpenedAt: new Date().toISOString() });
      navigate("/overview");
    } catch (e) {
      setOpenError(`Open failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const refreshFolderProjects = async () => {
    setBusy(true);
    setOpenError(null);
    try {
      const files = desktopRuntime
        ? await listDesktopProjectsInFolder(folderPath)
        : await listAdapterFolderProjects(adapter);
      setFolderFiles(files);
      if (desktopRuntime && folderPath.trim()) {
        setDesktopFolderPath(folderPath.trim());
      }
      if (!desktopRuntime && adapter?.getCurrentFolderDisplay) {
        setBrowserFolderLabel((await adapter.getCurrentFolderDisplay()) ?? "");
      }
    } catch (error) {
      setOpenError(`Folder scan failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const openFolderProject = async (filename: string) => {
    const activeAdapter = getActiveAdapter();
    if (!activeAdapter) {
      setOpenError("No storage adapter is available in this runtime.");
      return;
    }
    setBusy(true);
    setOpenError(null);
    try {
      const normalizedFolder = folderPath.trim();
      if (desktopRuntime) {
        setDesktopFolderPath(normalizedFolder);
      }
      const key = filename.replace(/\.pms\.json$/i, "");
      const loaded = activeAdapter.loadFolderProject
        ? await activeAdapter.loadFolderProject(key)
        : await activeAdapter.load(key);
      if (!loaded) {
        throw new Error(`No saved project found for ${filename}.`);
      }
      const imported = importProjectJson(loaded.json);
      validateProjectBundle(imported.bundle);
      const openedBundle = withStorageTrust(imported.bundle, loaded.metadata.trust);
      setBundle(openedBundle, {
        storageKey: imported.bundle.project.id,
        storagePath: loaded.metadata.displayPath,
        storageTrust: loaded.metadata.trust
      });
      recordRecent({
        key: imported.bundle.project.id,
        name: imported.bundle.project.name,
        storagePath: loaded.metadata.displayPath,
        trust: normalizeRecentTrust(loaded.metadata.trust),
        lastOpenedAt: new Date().toISOString()
      });
      navigate("/overview");
    } catch (error) {
      setOpenError(`Open failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const chooseBrowserFolder = async () => {
    if (!adapter?.chooseFolder) return;
    setBusy(true);
    setOpenError(null);
    try {
      const label = await adapter.chooseFolder();
      setBrowserFolderLabel(label ?? "");
      setFolderFiles([]);
    } catch (error) {
      if (isAbortError(error)) return;
      setOpenError(`Folder access failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-grid">
        {desktopRuntime || browserFolderCapable ? (
          <section className="workspace-card">
            <h2 style={{ marginTop: 0 }}>{desktopRuntime ? "Open a folder-backed project" : "Open a local-folder project"}</h2>
            <p className="text-sm text-secondary">
              {desktopRuntime
                ? "Enter the project folder path, list the saved `.pm-suite` project files inside it, then open the one you want."
                : "Choose a local folder, list the `.pm-suite` project files inside it, then open the one you want."}
            </p>
            <div className="col" style={{ gap: 12 }}>
              {desktopRuntime ? (
                <label className="label">
                  Project folder path
                  <input
                    className="input"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="C:\Projects\Grillo"
                  />
                </label>
              ) : (
                <div className="workspace-source">
                  <strong>{browserFolderLabel ? `Selected folder: ${browserFolderLabel}` : "No local folder selected"}</strong>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn btn-sm" onClick={() => void chooseBrowserFolder()} disabled={busy}>
                      {browserFolderLabel ? "Change folder" : "Choose folder"}
                    </button>
                  </div>
                </div>
              )}
              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={() => void refreshFolderProjects()}
                  disabled={(desktopRuntime ? !folderPath.trim() : !browserFolderLabel) || busy}
                >
                  {busy ? "Scanning..." : "List saved projects"}
                </button>
              </div>
              {folderFiles.length > 0 ? (
                <div className="col" style={{ gap: 8 }}>
                  {folderFiles.map((filename) => (
                    <div key={filename} className="workspace-recent">
                      <div className="col" style={{ gap: 2 }}>
                        <strong>{filename}</strong>
                        <span className="text-xs text-muted">{desktopRuntime ? folderPath : browserFolderLabel}</span>
                      </div>
                      <button className="btn btn-sm btn-primary" onClick={() => void openFolderProject(filename)} disabled={busy}>
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="workspace-inline-note">
                  {desktopRuntime
                    ? (folderPath.trim()
                      ? "No saved `.pms.json` files found in that folder yet."
                      : "Add a folder path first if you want to reopen a folder-backed project.")
                    : (browserFolderLabel
                      ? "No saved `.pms.json` files found in that folder yet."
                      : "Choose a local folder first if you want to reopen a folder-backed project.")}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="workspace-card">
          <h2 style={{ marginTop: 0 }}>Import a JSON bundle</h2>
          <p className="text-sm text-secondary">Choose a <code>project.pms.json</code> file from your disk.</p>
          <label className="btn btn-primary" style={{ cursor: "pointer", width: "fit-content" }}>
            Choose file
            <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
          </label>
          {busy && <div className="text-xs text-muted">Loading...</div>}
          {openError ? <div className="workspace-alert">{openError}</div> : null}
          <Link to="/projects" className="text-sm text-secondary">← Back to projects</Link>
        </section>
      </div>
    </div>
  );
}

export function DemoFolderView() {
  const setBundle = useProjectStore((s) => s.setBundle);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);
  const navigate = useNavigate();
  const onDemo = () => {
    const bundle = buildProjectFromTemplate("software-project", "Demo Project");
    setBundle(bundle, { storageKey: bundle.project.id, storagePath: null, storageTrust: "browser" });
    recordRecent({ key: bundle.project.id, name: bundle.project.name, storagePath: null, trust: "browser", lastOpenedAt: new Date().toISOString() });
    navigate("/overview");
  };
  return (
    <div className="empty">
      <div className="empty-title">Open the demo project</div>
      <div>Browse a sample project with sample items, docs, milestones, and settings data.</div>
      <button className="btn btn-primary" onClick={onDemo}>Open demo</button>
    </div>
  );
}
