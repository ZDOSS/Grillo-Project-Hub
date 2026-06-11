import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  buildProjectFromTemplate,
  importProjectJson,
  listTemplates,
  type ProjectStoreAdapter,
  type TemplateId
} from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore, type RecentProject } from "../../store/workspace-store";

const DESKTOP_FOLDER_KEY = "gph.desktop.folder";

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

async function openSavedProject(
  recent: RecentProject,
  setBundle: ReturnType<typeof useProjectStore.getState>["setBundle"],
  recordRecent: ReturnType<typeof useWorkspaceStore.getState>["recordRecent"]
): Promise<void> {
  const adapter = getActiveAdapter();
  if (!adapter) {
    throw new Error("No storage adapter is available in this runtime.");
  }

  const folder = deriveFolderFromStoragePath(recent.storagePath);
  if (recent.trust === "folder" && folder) {
    // DesktopAdapter.load() currently reads the active folder from localStorage on demand.
    // Restore the folder path before load() so folder-backed recents resolve correctly.
    setDesktopFolderPath(folder);
  }

  const loaded = await adapter.load(recent.key);
  if (!loaded) {
    throw new Error("The saved project could not be found in local storage.");
  }

  const imported = importProjectJson(loaded.json);
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

/**
 * Workspace launcher: shows recent projects and the app's storage/open options.
 */
export function ProjectsListView() {
  const navigate = useNavigate();
  const recents = useWorkspaceStore((s) => s.recents);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);
  const [showNew, setShowNew] = useState(recents.length === 0);
  const [newName, setNewName] = useState("My Project");
  const [templateId, setTemplateId] = useState<TemplateId>("software-project");
  const [folderPath, setFolderPath] = useState(getDesktopFolderPath());
  const [busyRecentKey, setBusyRecentKey] = useState<string | null>(null);
  const [pendingDeleteRecentKey, setPendingDeleteRecentKey] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const setBundle = useProjectStore((s) => s.setBundle);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);
  const desktopRuntime = useMemo(() => isDesktopRuntime(), []);

  useEffect(() => {
    if (recents.length === 0) setShowNew(true);
  }, [recents.length]);

  const create = () => {
    const bundle = buildProjectFromTemplate(templateId, newName.trim() || "Untitled");
    const normalizedFolder = folderPath.trim();
    if (desktopRuntime && normalizedFolder) {
      setDesktopFolderPath(normalizedFolder);
    }
    const storagePath = desktopRuntime && normalizedFolder
      ? `${normalizedFolder.replace(/[\\/]$/, "")}/.pm-suite/${bundle.project.id}.pms.json`
      : null;
    const storageTrust = desktopRuntime && normalizedFolder ? "folder" : "browser";
    setBundle(bundle, { storageKey: bundle.project.id, storagePath, storageTrust });
    recordRecent({
      key: bundle.project.id,
      name: bundle.project.name,
      storagePath,
      trust: storageTrust,
      lastOpenedAt: new Date().toISOString()
    });
    setShowNew(false);
    navigate("/board");
  };

  const openRecentProject = async (recent: RecentProject) => {
    setWorkspaceError(null);
    setBusyRecentKey(recent.key);
    try {
      await openSavedProject(recent, setBundle, recordRecent);
      navigate("/board");
    } catch (error) {
      setWorkspaceError((error as Error).message);
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
            <div className="empty" style={{ minHeight: 180 }}>
              <div className="empty-title">Nothing saved yet</div>
              <div>{desktopRuntime ? "Create a new project or open a folder-backed one to start building your recent list." : "Create a project in browser storage or import a bundle to start working."}</div>
            </div>
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
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>New project</strong>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="col" style={{ gap: 12 }}>
                <label className="label label-row">
                  Name
                  <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </label>
                <label className="label label-row">
                  Template
                  <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value as TemplateId)}>
                    {listTemplates().map((t) => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
                  </select>
                </label>
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
                ) : (
                  <div className="workspace-inline-note">
                    The PWA stores this project in browser storage. Use export/import later if you want a portable file.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create}>Create</button>
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
  const [busy, setBusy] = useState(false);
  const [folderPath, setFolderPath] = useState(getDesktopFolderPath());
  const [folderFiles, setFolderFiles] = useState<string[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);
  const desktopRuntime = useMemo(() => isDesktopRuntime(), []);

  const onFile = async (file: File) => {
    setBusy(true);
    setOpenError(null);
    try {
      const text = await file.text();
      const r = importProjectJson(text);
      setBundle(r.bundle, { storageKey: r.bundle.project.id, storagePath: null, storageTrust: "browser" });
      recordRecent({ key: r.bundle.project.id, name: r.bundle.project.name, storagePath: null, trust: "browser", lastOpenedAt: new Date().toISOString() });
      navigate("/board");
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
      const files = await listDesktopProjectsInFolder(folderPath);
      setFolderFiles(files);
      if (folderPath.trim()) {
        setDesktopFolderPath(folderPath.trim());
      }
    } catch (error) {
      setOpenError(`Folder scan failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const openDesktopProject = async (filename: string) => {
    const adapter = getActiveAdapter();
    if (!adapter) {
      setOpenError("No storage adapter is available in this runtime.");
      return;
    }
    setBusy(true);
    setOpenError(null);
    try {
      const normalizedFolder = folderPath.trim();
      setDesktopFolderPath(normalizedFolder);
      const key = filename.replace(/\.pms\.json$/i, "");
      const loaded = await adapter.load(key);
      if (!loaded) {
        throw new Error(`No saved project found for ${filename}.`);
      }
      const imported = importProjectJson(loaded.json);
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
      navigate("/board");
    } catch (error) {
      setOpenError(`Open failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-grid">
        {desktopRuntime ? (
          <section className="workspace-card">
            <h2 style={{ marginTop: 0 }}>Open a folder-backed project</h2>
            <p className="text-sm text-secondary">
              Enter the project folder path, list the saved `.pm-suite` project files inside it, then open the one you want.
            </p>
            <div className="col" style={{ gap: 12 }}>
              <label className="label">
                Project folder path
                <input
                  className="input"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="C:\Projects\Grillo"
                />
              </label>
              <div className="row">
                <button className="btn btn-primary" onClick={() => void refreshFolderProjects()} disabled={!folderPath.trim() || busy}>
                  {busy ? "Scanning..." : "List saved projects"}
                </button>
              </div>
              {folderFiles.length > 0 ? (
                <div className="col" style={{ gap: 8 }}>
                  {folderFiles.map((filename) => (
                    <div key={filename} className="workspace-recent">
                      <div className="col" style={{ gap: 2 }}>
                        <strong>{filename}</strong>
                        <span className="text-xs text-muted">{folderPath}</span>
                      </div>
                      <button className="btn btn-sm btn-primary" onClick={() => void openDesktopProject(filename)} disabled={busy}>
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="workspace-inline-note">
                  {folderPath.trim()
                    ? "No saved `.pms.json` files found in that folder yet."
                    : "Add a folder path first if you want to reopen a folder-backed project."}
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
          <Link to="/" className="text-sm text-secondary">← Back to projects</Link>
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
    navigate("/board");
  };
  return (
    <div className="empty">
      <div className="empty-title">Open the demo project</div>
      <div>Browse a sample project with sample items, docs, milestones, and settings data.</div>
      <button className="btn btn-primary" onClick={onDemo}>Open demo</button>
    </div>
  );
}
