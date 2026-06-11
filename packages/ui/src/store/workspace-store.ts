/**
 * Workspace store: tracks recent projects, theme, and the current local member.
 * Stored outside the project bundle because it is machine-local.
 */

import { create } from "zustand";

const STORAGE_KEY = "gph.workspace";

export type RecentProject = {
  key: string;
  name: string;
  storagePath: string | null;
  trust: "folder" | "browser";
  lastOpenedAt: string;
};

export type WorkspaceState = {
  localMemberId: string | null;
  recents: RecentProject[];
  setLocalMember: (memberId: string | null) => void;
  recordRecent: (entry: RecentProject) => void;
  removeRecent: (key: string) => void;
};

function loadFromStorage(): Partial<WorkspaceState> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<WorkspaceState>;
  } catch {
    return {};
  }
}

function saveToStorage(s: WorkspaceState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ localMemberId: s.localMemberId, recents: s.recents }));
  } catch {}
}

const initial = loadFromStorage();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  localMemberId: initial.localMemberId ?? null,
  recents: initial.recents ?? [],
  setLocalMember: (memberId) => {
    set({ localMemberId: memberId });
    saveToStorage({ ...get(), localMemberId: memberId });
  },
  recordRecent: (entry) => {
    const filtered = get().recents.filter((r) => r.key !== entry.key);
    const next = [entry, ...filtered].slice(0, 10);
    set({ recents: next });
    saveToStorage({ ...get(), recents: next });
  },
  removeRecent: (key) => {
    const next = get().recents.filter((r) => r.key !== key);
    set({ recents: next });
    saveToStorage({ ...get(), recents: next });
  }
}));
