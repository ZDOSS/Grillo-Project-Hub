import { useEffect } from "react";
import { useProjectStore } from "@gph/ui";
import { DesktopStorageAdapter } from "./storage/desktop-storage";

export function useAutoSave() {
  const bundle = useProjectStore((s) => s.bundle);
  const storageKey = useProjectStore((s) => s.storageKey);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markSaved = useProjectStore((s) => s.markSaved);

  useEffect(() => {
    if (!bundle || !storageKey || !isDirty) return;
    const json = useProjectStore.getState().serialize();
    let cancelled = false;
    DesktopStorageAdapter.adapter.save(storageKey, json, null).then((meta) => {
      if (cancelled) return;
      markSaved(storageKey, meta.displayPath, meta.trust);
    }).catch((err) => {
      console.warn("Auto-save failed:", err);
    });
    return () => { cancelled = true; };
  }, [bundle, storageKey, isDirty, markSaved]);
}
