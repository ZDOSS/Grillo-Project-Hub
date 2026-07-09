/**
 * Project state store. Single Zustand store shared by web and desktop.
 * Wraps a project bundle and a validated command dispatcher so any UI action goes
 * through the same path as AI/MCP/import.
 */

import { create } from "zustand";
import type { ProjectBundle, StorageTrust } from "@gph/core";
import { dispatchCommand, envelopeFor, importProjectJson, type CommandEnvelope, type CommandPayload, type CommandSource, type DispatchResult, type ProjectStoreAdapter, validateProjectBundle } from "@gph/core";
import { exportProjectJson } from "@gph/core";

const ACTIVE_PROJECT_KEY = "gph.active.project";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type SavedProjectSession = {
  storageKey: string;
  storagePath: string | null;
  storageTrust: StorageTrust;
};

function withRuntimeStorageTrust(bundle: ProjectBundle, storageTrust: StorageTrust): ProjectBundle {
  return {
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      storageTrust
    }
  };
}

function saveProjectSession(session: SavedProjectSession | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(session));
  } catch {}
}

function loadProjectSession(): SavedProjectSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProjectSession;
  } catch {
    return null;
  }
}

function activeAdapter(): ProjectStoreAdapter | null {
  if (typeof window === "undefined") return null;
  return ((window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store) ?? null;
}

export type ProjectStoreState = {
  bundle: ProjectBundle | null;
  storageKey: string | null;
  storagePath: string | null;
  storageTrust: StorageTrust;
  externalRevision: number | null;
  isDirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;
  /** Last applied source for the most recent command (used by activity view). */
  lastSource: CommandSource | null;
  setBundle: (bundle: ProjectBundle, opts?: {
    storageKey?: string | null;
    storagePath?: string | null;
    storageTrust?: StorageTrust;
    externalRevision?: number | null;
  }) => void;
  applyCommand: (payload: CommandPayload, source?: CommandSource, actorId?: string | null) => DispatchResult;
  markSaving: () => void;
  markSaved: (
    storageKey: string,
    storagePath: string | null,
    trust: StorageTrust,
    externalRevision: number | null
  ) => void;
  markSaveFailed: (message: string) => void;
  markUnsaved: (externalRevision?: number | null) => void;
  /** Serialize the current bundle (e.g. for export or save). */
  serialize: () => string;
  closeProject: () => void;
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  bundle: null,
  storageKey: null,
  storagePath: null,
  storageTrust: "unsaved",
  externalRevision: null,
  isDirty: false,
  saveStatus: "idle",
  lastSavedAt: null,
  saveError: null,
  lastSource: null,
  setBundle: (bundle, opts) => {
    const hasStorageKey = Object.prototype.hasOwnProperty.call(opts ?? {}, "storageKey");
    const hasStoragePath = Object.prototype.hasOwnProperty.call(opts ?? {}, "storagePath");
    const hasExternalRevision = Object.prototype.hasOwnProperty.call(opts ?? {}, "externalRevision");
    const nextStorageKey = hasStorageKey ? opts?.storageKey ?? null : get().storageKey ?? bundle.project.id;
    const nextStoragePath = hasStoragePath ? opts?.storagePath ?? null : get().storagePath;
    const nextStorageTrust = opts?.storageTrust ?? bundle.projectSettings.storageTrust ?? get().storageTrust;
    const nextExternalRevision = hasExternalRevision ? opts?.externalRevision ?? null : null;
    set({
      bundle: withRuntimeStorageTrust(bundle, nextStorageTrust),
      storageKey: nextStorageKey,
      storagePath: nextStoragePath,
      storageTrust: nextStorageTrust,
      externalRevision: nextExternalRevision,
      isDirty: !nextStorageKey,
      saveStatus: nextStorageKey ? "saved" : "idle",
      lastSavedAt: null,
      saveError: null
    });
    if (nextStorageKey) {
      saveProjectSession({
        storageKey: nextStorageKey,
        storagePath: nextStoragePath,
        storageTrust: nextStorageTrust
      });
    } else {
      saveProjectSession(null);
    }
  },
  applyCommand: (payload, source = "ui", actorId = null) => {
    const cur = get().bundle;
    if (!cur) throw new Error("No project loaded");
    const env: CommandEnvelope = envelopeFor(payload, source, actorId);
    const r = dispatchCommand(cur, env);
    set({ bundle: r.bundle, isDirty: true, saveStatus: "idle", saveError: null, lastSource: source });
    return r;
  },
  markSaving: () => set({ saveStatus: "saving", saveError: null }),
  markSaved: (storageKey, storagePath, trust, externalRevision) => {
    const current = get().bundle;
    set({
      bundle: current ? withRuntimeStorageTrust(current, trust) : current,
      storageKey,
      storagePath,
      storageTrust: trust,
      externalRevision,
      isDirty: false,
      saveStatus: "saved",
      lastSavedAt: new Date().toISOString(),
      saveError: null
    });
    saveProjectSession({ storageKey, storagePath, storageTrust: trust });
  },
  markSaveFailed: (message) => set({ saveStatus: "error", saveError: message }),
  markUnsaved: (externalRevision) => set((state) => ({
    externalRevision: externalRevision === undefined ? state.externalRevision : externalRevision,
    isDirty: true,
    saveStatus: "idle",
    saveError: null
  })),
  serialize: () => {
    const b = get().bundle;
    if (!b) throw new Error("No project loaded");
    return exportProjectJson(b);
  },
  closeProject: () => {
    set({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      externalRevision: null,
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });
    saveProjectSession(null);
  }
}));

export async function restoreLastProjectSession(): Promise<boolean> {
  const session = loadProjectSession();
  if (!session?.storageKey) return false;
  const adapter = activeAdapter();
  if (!adapter) return false;
  try {
    const loaded = session.storageTrust === "folder"
      ? await adapter.loadFolderProject?.(session.storageKey)
      : await adapter.load(session.storageKey);
    if (!loaded) {
      saveProjectSession(null);
      return false;
    }
    const imported = importProjectJson(loaded.json);
    validateProjectBundle(imported.bundle);
    useProjectStore.getState().setBundle(imported.bundle, {
      storageKey: loaded.metadata.key,
      storagePath: loaded.metadata.displayPath,
      storageTrust: loaded.metadata.trust,
      externalRevision: loaded.metadata.externalRevision
    });
    return true;
  } catch {
    saveProjectSession(null);
    return false;
  }
}
