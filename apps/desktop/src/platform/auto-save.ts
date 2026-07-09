import { useEffect, useRef } from "react";
import { useProjectStore } from "@gph/ui";
import { DesktopStorageAdapter } from "./storage/desktop-storage";

export function useAutoSave() {
  const bundle = useProjectStore((s) => s.bundle);
  const storageKey = useProjectStore((s) => s.storageKey);
  const storageTrust = useProjectStore((s) => s.storageTrust);
  const externalRevision = useProjectStore((s) => s.externalRevision);
  const isDirty = useProjectStore((s) => s.isDirty);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (!bundle || !storageKey || !isDirty) return;
    let active = true;
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (!active) return;
        const state = useProjectStore.getState();
        if (!state.bundle || !state.storageKey || !state.isDirty) return;
        const key = state.storageKey;
        const projectId = state.bundle.project.id;
        const json = state.serialize();
        const targetTrust = state.storageTrust === "folder" ? "folder" : "browser";
        state.markSaving();
        try {
          const meta = await DesktopStorageAdapter.adapter.save(
            key,
            json,
            state.externalRevision,
            targetTrust
          );
          const latest = useProjectStore.getState();
          if (!latest.bundle || latest.storageKey !== key || latest.bundle.project.id !== projectId) return;
          if (latest.serialize() === json) {
            latest.markSaved(key, meta.displayPath, meta.trust, meta.externalRevision);
          } else {
            latest.markUnsaved(meta.externalRevision);
          }
        } catch (err) {
          const latest = useProjectStore.getState();
          if (latest.storageKey === key) {
            latest.markSaveFailed(err instanceof Error ? err.message : "Auto-save failed.");
          }
          console.warn("Auto-save failed:", err);
        }
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [bundle, externalRevision, storageKey, storageTrust, isDirty]);
}
