import { PROJECT_NAV_ITEMS } from "../../nav-config";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

const SIDEBAR_OPTIONS = PROJECT_NAV_ITEMS.map(({ id, label }) => ({ id, label }));

export function ViewsSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);

  if (!bundle) return null;

  const hiddenViewIds = bundle.projectSettings.hiddenViewIds ?? [];
  const toggleView = (viewId: string) => {
    const next = hiddenViewIds.includes(viewId)
      ? hiddenViewIds.filter((id) => id !== viewId)
      : [...hiddenViewIds, viewId];
    applyCommand({
      type: "project.updateSettings",
      projectId: bundle.project.id,
      patch: { hiddenViewIds: next }
    });
  };

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Views"
        description="Choose which built-in project views show in the left panel and view switcher. Hidden views stay in project data."
      />
      <div className="settings-table">
        <div className="settings-table-header">
          <span>View</span>
          <span>Visible</span>
          <span>Actions</span>
        </div>
        {SIDEBAR_OPTIONS.map((view) => {
          const visible = !hiddenViewIds.includes(view.id);
          return (
            <div key={view.id} className="settings-table-row settings-table-row-sidebar">
              <strong>{view.label}</strong>
              <span className={`tag ${visible ? "tag-ok" : "tag-warn"}`}>{visible ? "Shown" : "Hidden"}</span>
              <div className="settings-row-actions">
                <button className="btn btn-sm" onClick={() => toggleView(view.id)}>
                  {visible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
