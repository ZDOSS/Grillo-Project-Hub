/**
 * Desktop storage adapter. In a Tauri build this would call the Rust backend to read/write
 * files in a user-chosen folder. In browser dev mode it falls back to localStorage.
 *
 * The Rust boundary is intentionally narrow: a few commands for save/load/choose folder
 * and watching external changes. Everything else stays in TypeScript.
 */

import type { ProjectStoreAdapter, StorageMetadata, WatchEvent } from "@gph/core";

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
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(NAMESPACE + key) != null;
  }
  async load(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    const tauri = getTauri();
    if (tauri) {
      const path = `${getFolder()}/.pm-suite/${key}.pms.json`;
      try {
        const json = await tauri.invoke("plugin:fs|read_text_file", { path }) as string;
        return { json, metadata: { key, displayPath: path, externalRevision: null, trust: "folder" } };
      } catch {
        return null;
      }
    }
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(NAMESPACE + key);
    if (!raw) return null;
    return { json: raw, metadata: { key, displayPath: null, externalRevision: null, trust: "browser" } };
  }
  async save(key: string, json: string): Promise<StorageMetadata> {
    const tauri = getTauri();
    if (tauri) {
      const folder = getFolder();
      const path = `${folder}/.pm-suite/${key}.pms.json`;
      try {
        await tauri.invoke("plugin:fs|write_text_file", { path, contents: json });
      } catch (e) {
        // Fall back to localStorage if FS not available.
        console.warn("Tauri fs write failed, using localStorage", e);
        if (typeof localStorage !== "undefined") localStorage.setItem(NAMESPACE + key, json);
      }
      const meta: StorageMetadata = { key, displayPath: path, externalRevision: this.nextRevisionFor(key), trust: "folder" };
      if (typeof localStorage !== "undefined") {
        const next = [meta, ...this.listSync().filter((m) => m.key !== key)];
        localStorage.setItem(INDEX_KEY, JSON.stringify(next));
      }
      return meta;
    }
    if (typeof localStorage === "undefined") throw new Error("Storage unavailable");
    localStorage.setItem(NAMESPACE + key, json);
    const meta: StorageMetadata = { key, displayPath: null, externalRevision: this.nextRevisionFor(key), trust: "browser" };
    const next = [meta, ...this.listSync().filter((m) => m.key !== key)];
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
    return meta;
  }
  async delete(key: string): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(NAMESPACE + key);
    localStorage.setItem(INDEX_KEY, JSON.stringify(this.listSync().filter((m) => m.key !== key)));
  }
  watch(handler: (event: WatchEvent) => void): () => void {
    const tauri = getTauri();
    if (!tauri) return () => undefined;
    let disposed = false;
    let unlisten: (() => void) | null = null;
    tauri.event.listen("gph://external-change", (e) => {
      const payload = e.payload as { key: string; newRevision?: number };
      if (payload?.key) handler({ type: "externalChange", key: payload.key, newRevision: payload.newRevision ?? this.nextRevisionFor(payload.key) });
    }).then((u) => {
      if (disposed) u();
      else unlisten = u;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }
  private nextRevisionFor(key: string): number {
    const existing = this.listSync().find((m) => m.key === key);
    return (existing?.externalRevision ?? 0) + 1;
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

export const DesktopStorageAdapter = {
  install(): void {
    if (typeof window === "undefined") return;
    (window as unknown as { __gph_store: ProjectStoreAdapter }).__gph_store = new DesktopAdapter();
  },
  adapter: new DesktopAdapter()
};
