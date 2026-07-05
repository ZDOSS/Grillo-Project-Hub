import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

export function StorageSettings() {
  const bundle = useProjectStore((state) => state.bundle);

  if (!bundle) return null;

  const storageCopy =
    bundle.projectSettings.storageTrust === "folder"
      ? "This project is attached to a local folder and will auto-save there."
      : bundle.projectSettings.storageTrust === "browser"
      ? "This project is currently browser-local. Reopen it from the workspace recents, or export/import a bundle when moving machines."
      : "This project has not been saved yet.";

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Storage"
        description="Show where project data is currently trusted to live. This panel reports state; save/open actions stay in the workspace launcher and import/export panel."
      />
      <div className="workspace-inline-note">{storageCopy}</div>
      <div className="row">
        <span className="storage-badge" data-trust={bundle.projectSettings.storageTrust}>
          <span className="storage-dot" />{" "}
          {bundle.projectSettings.storageTrust === "folder"
            ? "Folder-backed"
            : bundle.projectSettings.storageTrust === "browser"
            ? "Browser-local"
            : "Unsaved"}
        </span>
      </div>
    </div>
  );
}
