/**
 * Project state store. Single Zustand store shared by web and desktop.
 * Wraps a project bundle and a validated command dispatcher so any UI action goes
 * through the same path as AI/MCP/import.
 */

import { create } from "zustand";
import type { ProjectBundle } from "@gph/core";
import { dispatchCommand, envelopeFor, type CommandEnvelope, type CommandPayload, type CommandSource, type DispatchResult } from "@gph/core";
import { exportProjectJson } from "@gph/core";

export type ProjectStoreState = {
  bundle: ProjectBundle | null;
  storageKey: string | null;
  storagePath: string | null;
  storageTrust: "folder" | "browser" | "unsaved";
  isDirty: boolean;
  /** Last applied source for the most recent command (used by activity view). */
  lastSource: CommandSource | null;
  setBundle: (bundle: ProjectBundle, opts?: { storageKey?: string | null; storagePath?: string | null; storageTrust?: "folder" | "browser" | "unsaved" }) => void;
  applyCommand: (payload: CommandPayload, source?: CommandSource, actorId?: string | null) => DispatchResult;
  markSaved: (storageKey: string, storagePath: string | null, trust: "folder" | "browser" | "unsaved") => void;
  markUnsaved: () => void;
  /** Serialize the current bundle (e.g. for export or save). */
  serialize: () => string;
  closeProject: () => void;
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  bundle: null,
  storageKey: null,
  storagePath: null,
  storageTrust: "unsaved",
  isDirty: false,
  lastSource: null,
  setBundle: (bundle, opts) => set({
    bundle,
    storageKey: opts?.storageKey ?? get().storageKey,
    storagePath: opts?.storagePath ?? get().storagePath,
    storageTrust: opts?.storageTrust ?? get().storageTrust,
    isDirty: false
  }),
  applyCommand: (payload, source = "ui", actorId = null) => {
    const cur = get().bundle;
    if (!cur) throw new Error("No project loaded");
    const env: CommandEnvelope = envelopeFor(payload, source, actorId);
    const r = dispatchCommand(cur, env);
    set({ bundle: r.bundle, isDirty: true, lastSource: source });
    return r;
  },
  markSaved: (storageKey, storagePath, trust) => set({ storageKey, storagePath, storageTrust: trust, isDirty: false }),
  markUnsaved: () => set({ isDirty: true }),
  serialize: () => {
    const b = get().bundle;
    if (!b) throw new Error("No project loaded");
    return exportProjectJson(b);
  },
  closeProject: () => set({ bundle: null, storageKey: null, storagePath: null, storageTrust: "unsaved", isDirty: false })
}));
