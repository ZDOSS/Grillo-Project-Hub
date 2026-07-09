/**
 * Desktop storage adapter. In a Tauri build this would call the Rust backend to read/write
 * files in a user-chosen folder. In browser dev mode it falls back to localStorage.
 *
 * The Rust boundary is intentionally narrow: a few commands for save/load/choose folder
 * and watching external changes. Everything else stays in TypeScript.
 */

import {
  contentRevision,
  type PersistedStorageTrust,
  type ProjectStoreAdapter,
  type StorageMetadata,
  type WatchEvent
} from "@gph/core";

const NAMESPACE = "gph.desktop.project.";
const INDEX_KEY = "gph.desktop.index";
const FOLDER_KEY = "gph.desktop.folder";

type Tauri = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  event: { listen: (event: string, handler: (e: { payload: unknown }) => void) => Promise<() => void> };
};

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in (window as object);
}

function getTauri(): Tauri | null {
  if (!isTauri()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((window as any).__TAURI__ as Tauri) ?? null;
}

class DesktopAdapter implements ProjectStoreAdapter {
  capabilities = { folderBacked: true, fileWatch: true, attachments: true };

  async list(): Promise<StorageMetadata[]> {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as StorageMetadata[];
    } catch { return []; }
  }
  async has(key: string): Promise<boolean> {
    const tauri = getTauri();
    const folder = getFolder();
    if (tauri && folder) {
      return await tauri.invoke("project_exists", { path: projectPath(folder, key) }) as boolean;
    }
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(NAMESPACE + key) != null;
  }
  async load(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    const tauri = getTauri();
    const meta = this.listSync().find((m) => m.key === key);
    const folder = getFolder();
    const folderBackedPath = meta?.displayPath ?? (folder ? projectPath(folder, key) : null);
    if (tauri && folderBackedPath && (meta?.trust === "folder" || !meta)) {
      try {
        const json = await tauri.invoke("load_project", { path: folderBackedPath }) as string;
        return { json, metadata: { key, displayPath: folderBackedPath, externalRevision: contentRevision(json), trust: "folder" } };
      } catch {
        return null;
      }
    }
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(NAMESPACE + key);
    if (!raw) return null;
    return { json: raw, metadata: { key, displayPath: null, externalRevision: contentRevision(raw), trust: "browser" } };
  }
  async loadFolderProject(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    const tauri = getTauri();
    const folder = getFolder();
    if (!tauri || !folder) return null;
    const path = projectPath(folder, key);
    try {
      const json = await tauri.invoke("load_project", { path }) as string;
      return { json, metadata: { key, displayPath: path, externalRevision: contentRevision(json), trust: "folder" } };
    } catch {
      return null;
    }
  }
  async save(
    key: string,
    json: string,
    expectedRevision?: number | null,
    targetTrust?: PersistedStorageTrust
  ): Promise<StorageMetadata> {
    const existing = this.listSync().find((m) => m.key === key);
    const tauri = getTauri();
    const folder = getFolder();
    const resolvedTrust: PersistedStorageTrust = targetTrust
      ?? (existing?.trust === "browser" ? "browser" : tauri && folder ? "folder" : "browser");
    if (resolvedTrust === "folder" && (!tauri || !folder)) {
      throw new Error("Folder access is unavailable. Reconnect the project folder before saving.");
    }
    const revision = contentRevision(json);
    if (resolvedTrust === "folder" && tauri && folder) {
      const path = projectPath(folder, key);
      if (expectedRevision != null) {
        let current: string;
        try {
          current = await tauri.invoke("load_project", { path }) as string;
        } catch {
          throw new Error("External change detected; the project file is no longer available");
        }
        if (contentRevision(current) !== expectedRevision) {
          throw new Error("External change detected; refusing to save without explicit conflict resolution");
        }
      }
      await tauri.invoke("save_project", { path, contents: json });
      const meta: StorageMetadata = { key, displayPath: path, externalRevision: revision, trust: "folder" };
      if (typeof localStorage !== "undefined") {
        const next = [meta, ...this.listSync().filter((m) => m.key !== key)];
        localStorage.setItem(INDEX_KEY, JSON.stringify(next));
      }
      return meta;
    }
    if (typeof localStorage === "undefined") throw new Error("Storage unavailable");
    const current = localStorage.getItem(NAMESPACE + key);
    if (expectedRevision != null && (current == null || contentRevision(current) !== expectedRevision)) {
      throw new Error("External change detected; refusing to save without explicit conflict resolution");
    }
    localStorage.setItem(NAMESPACE + key, json);
    const meta: StorageMetadata = { key, displayPath: null, externalRevision: revision, trust: "browser" };
    const next = [meta, ...this.listSync().filter((m) => m.key !== key)];
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
    return meta;
  }
  async delete(key: string): Promise<void> {
    const tauri = getTauri();
    const existing = this.listSync().find((m) => m.key === key);
    if (tauri && existing?.trust === "folder" && existing.displayPath) {
      try {
        await tauri.invoke("delete_project", { path: existing.displayPath });
      } catch {
        // Keep recents cleanup running after unexpected filesystem failures;
        // NotFound is already handled by the Rust command.
      }
    }
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(NAMESPACE + key);
    localStorage.setItem(INDEX_KEY, JSON.stringify(this.listSync().filter((m) => m.key !== key)));
  }
  watch(key: string, handler: (event: WatchEvent) => void): () => void {
    const tauri = getTauri();
    if (!tauri) return () => undefined;
    const metadata = this.listSync().find((entry) => entry.key === key);
    if (metadata?.trust !== "folder" || !metadata.displayPath) return () => undefined;
    let disposed = false;
    let unlisten: (() => void) | null = null;
    tauri.event.listen("gph://external-change", (e) => {
      const payload = e.payload as WatchEvent;
      if (!payload || disposed) return;
      this.applyWatchMetadata(payload);
      handler(payload);
    }).then((u) => {
      if (disposed) u();
      else unlisten = u;
    });
    void tauri.invoke("watch_project", { path: metadata.displayPath, key });
    return () => {
      disposed = true;
      unlisten?.();
      void tauri.invoke("stop_project_watch");
    };
  }
  private applyWatchMetadata(event: WatchEvent): void {
    if (typeof localStorage === "undefined") return;
    const current = this.listSync();
    if (event.type === "externalChange") {
      localStorage.setItem(INDEX_KEY, JSON.stringify(current.map((entry) => (
        entry.key === event.key ? { ...entry, externalRevision: event.newRevision } : entry
      ))));
      return;
    }
    if (event.type === "renamed") {
      localStorage.setItem(INDEX_KEY, JSON.stringify(current.map((entry) => (
        entry.key === event.oldKey
          ? {
              ...entry,
              key: event.newKey,
              displayPath: entry.displayPath?.replace(/[^/\\]+\.pms\.json$/, `${event.newKey}.pms.json`) ?? null,
              externalRevision: event.newRevision
            }
          : entry
      ))));
    }
  }
  private listSync(): StorageMetadata[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as StorageMetadata[];
    } catch { return []; }
  }
}

function getFolder(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(FOLDER_KEY) ?? "";
}

function projectPath(folder: string, key: string): string {
  return `${folder}/.pm-suite/${key}.pms.json`;
}

export const DesktopStorageAdapter = {
  install(): void {
    if (typeof window === "undefined") return;
    (window as unknown as { __gph_store: ProjectStoreAdapter }).__gph_store = DesktopStorageAdapter.adapter;
  },
  adapter: new DesktopAdapter()
};
