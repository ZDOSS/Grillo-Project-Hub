/**
 * Auto-save bridge: when the active project changes, persist the bundle to localStorage.
 * The browser environment cannot reliably reach the filesystem, so it labels the storage
 * trust as "browser" and surfaces that badge in the UI.
 */

import { useEffect } from "react";
import { useProjectStore } from "@gph/ui";
import { WebStorageAdapter } from "./storage/web-storage";

export function useAutoSave() {
  const bundle = useProjectStore((s) => s.bundle);
  const storageKey = useProjectStore((s) => s.storageKey);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markSaved = useProjectStore((s) => s.markSaved);

  useEffect(() => {
    if (!bundle || !storageKey || !isDirty) return;
    const json = useProjectStore.getState().serialize();
    let cancelled = false;
    WebStorageAdapter.adapter.save(storageKey, json, null).then((meta) => {
      if (cancelled) return;
      markSaved(storageKey, null, "browser");
    }).catch((err) => {
      console.warn("Auto-save failed:", err);
    });
    return () => { cancelled = true; };
  }, [bundle, storageKey, isDirty, markSaved]);
}
