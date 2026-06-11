/**
 * Web storage adapter. Persists project bundles to localStorage as a fallback
 * and exposes an in-memory snapshot for fast load. Designed so the same UI works
 * with browser File System Access API when available, and otherwise uses
 * localStorage as a compatibility layer.
 */

import type { ProjectStoreAdapter, StorageMetadata, WatchEvent } from "@gph/core";
import { exportProjectJson, importProjectJson, type ProjectBundle, validateProjectBundle } from "@gph/core";

const NAMESPACE = "gph.project.";
const INDEX_KEY = "gph.project.index";

function getKey(id: string): string {
  return NAMESPACE + id;
}

function readIndex(): StorageMetadata[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StorageMetadata[];
  } catch {
    return [];
  }
}

function writeIndex(meta: StorageMetadata[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(meta));
  } catch {}
}

class WebLocalStorageAdapter implements ProjectStoreAdapter {
  capabilities = { folderBacked: false, fileWatch: false, attachments: true };

  async list(): Promise<StorageMetadata[]> {
    return readIndex();
  }
  async has(key: string): Promise<boolean> {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(getKey(key)) != null;
  }
  async load(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return null;
    const meta = readIndex().find((m) => m.key === key);
    if (!meta) return null;
    return { json: raw, metadata: meta };
  }
  async save(key: string, json: string, expectedRevision?: number | null): Promise<StorageMetadata> {
    if (typeof localStorage === "undefined") throw new Error("localStorage unavailable");
    if (expectedRevision != null) {
      const existing = readIndex().find((m) => m.key === key);
      if (existing && existing.externalRevision != null && existing.externalRevision !== expectedRevision) {
        throw new Error("External change detected; refusing to save without explicit conflict resolution");
      }
    }
    const revision = (readIndex().find((m) => m.key === key)?.externalRevision ?? 0) + 1;
    const meta: StorageMetadata = {
      key,
      displayPath: null,
      externalRevision: revision,
      trust: "browser"
    };
    localStorage.setItem(getKey(key), json);
    const next = [meta, ...readIndex().filter((m) => m.key !== key)];
    writeIndex(next);
    return meta;
  }
  async delete(key: string): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(getKey(key));
    writeIndex(readIndex().filter((m) => m.key !== key));
  }
}

export const WebStorageAdapter = {
  install(): void {
    // Hook the project store to auto-save changes. The current model is browser-local,
    // labeled as a "browser" trust badge.
    if (typeof window === "undefined") return;
    const adapter = new WebLocalStorageAdapter();
    (window as unknown as { __gph_store: ProjectStoreAdapter }).__gph_store = adapter;
  },
  adapter: new WebLocalStorageAdapter()
};

export async function saveActiveProject(key: string, bundle: ProjectBundle): Promise<void> {
  await WebStorageAdapter.adapter.save(key, exportProjectJson(bundle));
}

export async function loadProjectBundle(key: string): Promise<ProjectBundle | null> {
  const res = await WebStorageAdapter.adapter.load(key);
  if (!res) return null;
  const r = importProjectJson(res.json);
  validateProjectBundle(r.bundle);
  return r.bundle;
}

export type { WatchEvent };
