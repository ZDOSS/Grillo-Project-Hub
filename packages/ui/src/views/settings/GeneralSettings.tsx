import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

export function GeneralSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);

  if (!bundle) return null;

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="General"
        description="Name the project and keep its identity separate from storage, appearance, and workflow configuration."
      />
      <label className="label label-row">
        Project name
        <input
          className="input"
          value={bundle.project.name}
          onChange={(event) => applyCommand({ type: "project.rename", projectId: bundle.project.id, name: event.target.value })}
        />
      </label>
      <div className="workspace-inline-note">
        Project ID: <code>{bundle.project.id}</code>
      </div>
    </div>
  );
}
