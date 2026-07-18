/**
 * Web storage adapter. Persists project bundles to localStorage as a fallback
 * and exposes an in-memory snapshot for fast load. Designed so the same UI works
 * with browser File System Access API when available, and otherwise uses
 * localStorage as a compatibility layer.
 */

import type { PersistedStorageTrust, ProjectStoreAdapter, StorageMetadata, WatchEvent } from "@gph/core";
import { contentRevision, exportProjectJson, importProjectJson, type ProjectBundle, validateProjectBundle } from "@gph/core";

const NAMESPACE = "gph.project.";
const RECOVERY_BASE_NAMESPACE = "gph.project.folderBase.";
const INDEX_KEY = "gph.project.index";
const FS_DB_NAME = "gph.web.fs";
const FS_STORE_NAME = "handles";
const FS_FOLDER_HANDLE_KEY = "project-folder";

let activeFolderHandle: FileSystemDirectoryHandle | null = null;

function getKey(id: string): string {
  return NAMESPACE + id;
}

function getRecoveryBaseKey(id: string): string {
  return RECOVERY_BASE_NAMESPACE + id;
}

function supportsFolderAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
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

function upsertIndexEntry(meta: StorageMetadata): void {
  writeIndex([meta, ...readIndex().filter((entry) => entry.key !== meta.key)]);
}

function openHandlesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FS_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open folder-handle database"));
  });
}

async function readStoredFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (activeFolderHandle) return activeFolderHandle;
  if (typeof indexedDB === "undefined") return null;
  const db = await openHandlesDb();
  return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(FS_STORE_NAME, "readonly");
    const request = tx.objectStore(FS_STORE_NAME).get(FS_FOLDER_HANDLE_KEY);
    request.onsuccess = () => {
      const value = request.result;
      const handle = value == null ? null : (value as FileSystemDirectoryHandle);
      activeFolderHandle = handle;
      resolve(handle);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read folder handle"));
  }).finally(() => db.close());
}

async function writeStoredFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openHandlesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FS_STORE_NAME, "readwrite");
    tx.objectStore(FS_STORE_NAME).put(handle, FS_FOLDER_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not persist folder handle"));
  }).finally(() => db.close());
}

async function deleteStoredFolderHandle(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openHandlesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FS_STORE_NAME, "readwrite");
    tx.objectStore(FS_STORE_NAME).delete(FS_FOLDER_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not clear the saved folder handle"));
  }).finally(() => db.close());
}

async function ensureFolderPermission(
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite",
  allowPrompt: boolean
): Promise<boolean> {
  const descriptor = { mode } as FileSystemHandlePermissionDescriptor;
  if (await handle.queryPermission(descriptor) === "granted") return true;
  if (!allowPrompt) return false;
  return (await handle.requestPermission(descriptor)) === "granted";
}

async function getBoundFolderHandle(options?: { mode?: "read" | "readwrite"; allowPrompt?: boolean }): Promise<FileSystemDirectoryHandle | null> {
  const handle = await readStoredFolderHandle();
  if (!handle) return null;
  const mode = options?.mode ?? "read";
  const allowed = await ensureFolderPermission(handle, mode, options?.allowPrompt ?? false);
  return allowed ? handle : null;
}

async function getProjectDirectory(
  handle: FileSystemDirectoryHandle,
  create: boolean
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await handle.getDirectoryHandle(".pm-suite", { create });
  } catch {
    return null;
  }
}

async function readFolderProjectJson(handle: FileSystemDirectoryHandle, key: string): Promise<string | null> {
  const dir = await getProjectDirectory(handle, false);
  if (!dir) return null;
  try {
    const fileHandle = await dir.getFileHandle(`${key}.pms.json`);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function writeFolderProjectJson(handle: FileSystemDirectoryHandle, key: string, json: string): Promise<void> {
  const dir = await getProjectDirectory(handle, true);
  if (!dir) throw new Error("Could not access the selected local folder.");
  const fileHandle = await dir.getFileHandle(`${key}.pms.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();
}

async function deleteFolderProjectJson(handle: FileSystemDirectoryHandle, key: string): Promise<void> {
  const dir = await getProjectDirectory(handle, false);
  if (!dir) return;
  try {
    await dir.removeEntry(`${key}.pms.json`);
  } catch {
    // Keep index cleanup even if the file no longer exists.
  }
}

async function listFolderProjectFiles(handle: FileSystemDirectoryHandle): Promise<string[]> {
  const dir = await getProjectDirectory(handle, false);
  if (!dir) return [];
  const files: string[] = [];
  // TS knows async iteration on FileSystemDirectoryHandle in modern DOM libs.
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && entry.name.endsWith(".pms.json")) {
      files.push(entry.name);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function folderDisplayPath(handle: FileSystemDirectoryHandle, key: string): string {
  return `${handle.name}/.pm-suite/${key}.pms.json`;
}

class WebLocalStorageAdapter implements ProjectStoreAdapter {
  capabilities = { folderBacked: supportsFolderAccess(), fileWatch: false, attachments: true };
  private previousFolderHandle: FileSystemDirectoryHandle | null | undefined;

  async list(): Promise<StorageMetadata[]> {
    return readIndex();
  }
  async has(key: string): Promise<boolean> {
    const folderHandle = await getBoundFolderHandle({ mode: "read", allowPrompt: false });
    if (folderHandle) {
      const json = await readFolderProjectJson(folderHandle, key);
      if (json != null) return true;
    }
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(getKey(key)) != null;
  }
  async load(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    const meta = readIndex().find((m) => m.key === key);
    const folderHandle = await getBoundFolderHandle({ mode: "read", allowPrompt: false });
    if (meta?.trust === "folder" && folderHandle) {
      const json = await readFolderProjectJson(folderHandle, key);
      if (json) {
        return {
          json,
          metadata: {
            key,
            displayPath: meta.displayPath ?? folderDisplayPath(folderHandle, key),
            externalRevision: contentRevision(json),
            trust: "folder"
          }
        };
      }
    }

    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return null;

    const fallbackMeta: StorageMetadata = meta?.trust === "folder" ? {
      key,
      displayPath: null,
      externalRevision: contentRevision(raw),
      trust: "browser"
    } : {
      ...(meta ?? { key, displayPath: null }),
      externalRevision: contentRevision(raw),
      trust: "browser"
    };
    if (!meta) {
      writeIndex([fallbackMeta, ...readIndex().filter((entry) => entry.key !== key)]);
    }
    return { json: raw, metadata: fallbackMeta };
  }
  async loadFolderProject(key: string): Promise<{ json: string; metadata: StorageMetadata } | null> {
    const folderHandle = await getBoundFolderHandle({ mode: "read", allowPrompt: true });
    if (!folderHandle) return null;
    const existing = readIndex().find((m) => m.key === key);
    const recoveredJson = typeof localStorage === "undefined" ? null : localStorage.getItem(getKey(key));
    const recoveryBaseJson = typeof localStorage === "undefined" ? null : localStorage.getItem(getRecoveryBaseKey(key));
    const folderJson = await readFolderProjectJson(folderHandle, key);
    if (existing?.trust === "browser" && recoveredJson) {
      const metadata: StorageMetadata = {
        key,
        displayPath: folderDisplayPath(folderHandle, key),
        externalRevision: contentRevision(recoveredJson),
        trust: "folder"
      };
      if (folderJson && (!recoveryBaseJson || (folderJson !== recoveryBaseJson && folderJson !== recoveredJson))) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(getKey(key), folderJson);
          localStorage.setItem(getRecoveryBaseKey(key), folderJson);
        }
        const externalMetadata = {
          ...metadata,
          externalRevision: contentRevision(folderJson)
        };
        upsertIndexEntry(externalMetadata);
        return { json: folderJson, metadata: externalMetadata };
      }
      const writableFolderHandle = await getBoundFolderHandle({ mode: "readwrite", allowPrompt: true });
      if (!writableFolderHandle) return null;
      await writeFolderProjectJson(writableFolderHandle, key, recoveredJson);
      const promotedMetadata: StorageMetadata = {
        ...metadata,
        displayPath: folderDisplayPath(writableFolderHandle, key)
      };
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(getRecoveryBaseKey(key), recoveredJson);
      }
      upsertIndexEntry(promotedMetadata);
      return { json: recoveredJson, metadata: promotedMetadata };
    }

    if (!folderJson) return null;
    const metadata: StorageMetadata = {
      key,
      displayPath: folderDisplayPath(folderHandle, key),
      externalRevision: contentRevision(folderJson),
      trust: "folder"
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(getKey(key), folderJson);
      localStorage.setItem(getRecoveryBaseKey(key), folderJson);
    }
    upsertIndexEntry(metadata);
    return { json: folderJson, metadata };
  }
  async save(
    key: string,
    json: string,
    expectedRevision?: number | null,
    targetTrust?: PersistedStorageTrust
  ): Promise<StorageMetadata> {
    if (typeof localStorage === "undefined") throw new Error("localStorage unavailable");
    const index = readIndex();
    const existing = index.find((m) => m.key === key);
    const availableFolder = await getBoundFolderHandle({ mode: "readwrite", allowPrompt: false });
    const resolvedTrust: PersistedStorageTrust = targetTrust
      ?? (existing?.trust === "browser" ? "browser" : availableFolder ? "folder" : "browser");
    const folderHandle = resolvedTrust === "folder" ? availableFolder : null;
    if (resolvedTrust === "folder" && !folderHandle) {
      throw new Error("Folder access is unavailable. Reconnect the project folder before saving.");
    }
    const currentJson = folderHandle
      ? await readFolderProjectJson(folderHandle, key)
      : localStorage.getItem(getKey(key));
    if (expectedRevision != null && (currentJson == null || contentRevision(currentJson) !== expectedRevision)) {
      throw new Error("External change detected; refusing to save without explicit conflict resolution");
    }
    const revision = contentRevision(json);
    if (folderHandle) {
      await writeFolderProjectJson(folderHandle, key, json);
      const meta: StorageMetadata = {
        key,
        displayPath: folderDisplayPath(folderHandle, key),
        externalRevision: revision,
        trust: "folder"
      };
      writeIndex([meta, ...index.filter((m) => m.key !== key)]);
      localStorage.setItem(getKey(key), json);
      localStorage.setItem(getRecoveryBaseKey(key), json);
      return meta;
    }

    const meta: StorageMetadata = {
      key,
      displayPath: null,
      externalRevision: revision,
      trust: "browser"
    };
    localStorage.setItem(getKey(key), json);
    writeIndex([meta, ...index.filter((m) => m.key !== key)]);
    return meta;
  }
  async delete(key: string): Promise<void> {
    const meta = readIndex().find((m) => m.key === key);
    if (meta?.trust === "folder") {
      const folderHandle = await getBoundFolderHandle({ mode: "readwrite", allowPrompt: false });
      if (folderHandle) {
        await deleteFolderProjectJson(folderHandle, key);
      }
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(getKey(key));
      localStorage.removeItem(getRecoveryBaseKey(key));
    }
    writeIndex(readIndex().filter((m) => m.key !== key));
  }
  async chooseFolder(): Promise<string | null> {
    const picker = supportsFolderAccess() ? window.showDirectoryPicker : undefined;
    if (!picker) return null;
    const previousHandle = await readStoredFolderHandle();
    const handle = await picker.call(window, { mode: "readwrite" });
    const granted = await ensureFolderPermission(handle, "readwrite", true);
    if (!granted) return null;
    this.previousFolderHandle = previousHandle;
    activeFolderHandle = handle;
    try {
      await writeStoredFolderHandle(handle);
    } catch {
      // Folder handle persistence is best-effort; the active handle should still work this session.
    }
    return handle.name;
  }
  async restorePreviousFolder(): Promise<void> {
    if (this.previousFolderHandle === undefined) return;
    const previousHandle = this.previousFolderHandle;
    this.previousFolderHandle = undefined;
    activeFolderHandle = previousHandle;
    try {
      if (previousHandle) await writeStoredFolderHandle(previousHandle);
      else await deleteStoredFolderHandle();
    } catch {
      // Restoring the in-memory handle keeps this session on the accepted folder;
      // durable handle persistence remains best-effort, matching chooseFolder().
    }
  }
  async getCurrentFolderDisplay(): Promise<string | null> {
    const handle = await readStoredFolderHandle();
    return handle?.name ?? null;
  }
  async clearFolder(): Promise<void> {
    this.previousFolderHandle = undefined;
    activeFolderHandle = null;
    try {
      await deleteStoredFolderHandle();
    } catch {
      // Clearing the active in-memory handle is sufficient for this session.
    }
  }
  async listFolderProjects(): Promise<string[]> {
    const handle = await getBoundFolderHandle({ mode: "read", allowPrompt: true });
    if (!handle) return [];
    return listFolderProjectFiles(handle);
  }
}

export const WebStorageAdapter = {
  install(): void {
    // Hook the project store to auto-save changes. The current model is browser-local,
    // labeled as a "browser" trust badge.
    if (typeof window === "undefined") return;
    (window as unknown as { __gph_store: ProjectStoreAdapter }).__gph_store = WebStorageAdapter.adapter;
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
