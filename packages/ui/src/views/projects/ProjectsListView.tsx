import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore } from "../../store/workspace-store";
import { listTemplates, buildProjectFromTemplate, type TemplateId } from "@gph/core";

/**
 * Workspace launcher: shows recent projects and a "New project" button.
 * The first-run modal flow lives here.
 */
export function ProjectsListView() {
  const navigate = useNavigate();
  const recents = useWorkspaceStore((s) => s.recents);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);
  const [showNew, setShowNew] = useState(recents.length === 0);
  const [newName, setNewName] = useState("My Project");
  const [templateId, setTemplateId] = useState<TemplateId>("software-project");
  const setBundle = useProjectStore((s) => s.setBundle);
  const recordRecent = useWorkspaceStore((s) => s.recordRecent);

  useEffect(() => {
    if (recents.length === 0) setShowNew(true);
  }, [recents.length]);

  const create = () => {
    const bundle = buildProjectFromTemplate(templateId, newName.trim() || "Untitled");
    setBundle(bundle, { storageKey: bundle.project.id, storagePath: null, storageTrust: "browser" });
    recordRecent({ key: bundle.project.id, name: bundle.project.name, storagePath: null, trust: "browser", lastOpenedAt: new Date().toISOString() });
    setShowNew(false);
    navigate("/board");
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", flex: 1, overflow: "auto" }}>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h1>Grillo Project Hub</h1>
        <div className="row">
          <button className="btn" onClick={() => setShowNew(true)}>New project</button>
        </div>
      </div>

      {recents.length === 0 ? (
        <div className="empty">
          <div className="empty-title">Welcome</div>
          <div>Start your first project to begin planning work.</div>
        </div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          <h2>Recent projects</h2>
          {recents.map((r) => (
            <div key={r.key} className="row-between" style={{ padding: 12, border: "1px solid var(--color-border-subtle)", borderRadius: 8, background: "var(--color-bg-surface)" }}>
              <div className="col" style={{ gap: 2 }}>
                <strong>{r.name}</strong>
                <span className="text-xs text-muted">{r.storagePath ?? "(browser storage)"} · {new Date(r.lastOpenedAt).toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="storage-badge" data-trust={r.trust}><span className="storage-dot" />{r.trust === "folder" ? "Folder" : "Browser"}</span>
                <button className="btn btn-sm" onClick={() => removeRecent(r.key)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>New project</strong>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>✕</button>
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

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const mod = await import("@gph/core");
      const r = mod.importProjectJson(text);
      setBundle(r.bundle, { storageKey: r.bundle.project.id, storagePath: null, storageTrust: "browser" });
      recordRecent({ key: r.bundle.project.id, name: r.bundle.project.name, storagePath: null, trust: "browser", lastOpenedAt: new Date().toISOString() });
      navigate("/board");
    } catch (e) {
      alert(`Open failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="empty">
      <div className="empty-title">Open project</div>
      <div>Choose a <code>project.pms.json</code> file from your disk.</div>
      <label className="btn btn-primary" style={{ cursor: "pointer" }}>
        Choose file
        <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {busy && <div className="text-xs text-muted">Loading…</div>}
      <Link to="/" className="text-sm text-secondary">← Back to projects</Link>
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
      <div className="empty-title">Open the demo folder</div>
      <div>Browse a sample project with sample items, docs, and milestones.</div>
      <button className="btn btn-primary" onClick={onDemo}>Open demo</button>
    </div>
  );
}
