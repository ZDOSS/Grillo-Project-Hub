import { useEffect } from "react";
import { restoreLastProjectSession, useProjectStore } from "./project-store";

/**
 * Reload bootstrap for the active project. If a previous browser or folder-backed
 * session exists, restore it once after the storage adapter is installed.
 */
export function useRestoreProjectSession() {
  const bundle = useProjectStore((s) => s.bundle);

  useEffect(() => {
    if (bundle) return;
    void restoreLastProjectSession();
  }, [bundle]);
}
