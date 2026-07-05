import { useEffect, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

export function PluginsSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const applyCommand = useProjectStore((state) => state.applyCommand);
  const [trustMode, setTrustMode] = useState(bundle?.projectSettings.pluginTrustMode ?? "first-party");

  useEffect(() => {
    if (bundle) setTrustMode(bundle.projectSettings.pluginTrustMode);
  }, [bundle?.projectSettings.pluginTrustMode]);

  if (!bundle) return null;

  const dirty = trustMode !== bundle.projectSettings.pluginTrustMode;

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Plugins & trust"
        description="Set the project trust posture without implying unrestricted third-party plugin execution is ready."
      />
      <p className="text-sm text-secondary">
        These modes are project settings. The UI is editable, but only first-party plugins are fully exercised in this MVP.
      </p>
      <div className="col" style={{ gap: 6 }}>
        {([
          ["first-party", "First-party only", "Safest option for local-first workspaces."],
          ["curated", "First-party + curated/signed", "Allows vetted plugins once package verification is available."],
          ["unrestricted", "Unrestricted local plugins", "Highest flexibility, highest risk. Intended for power users."]
        ] as const).map(([value, label, description]) => (
          <label key={value} className="workspace-source">
            <span className="row" style={{ alignItems: "center" }}>
              <input
                type="radio"
                name="trust"
                checked={trustMode === value}
                onChange={() => setTrustMode(value)}
              />
              <strong>{label}</strong>
            </span>
            <span className="text-sm text-secondary">{description}</span>
          </label>
        ))}
      </div>
      <div className="row">
        <button
          className="btn btn-primary"
          onClick={() => applyCommand({
            type: "project.updateSettings",
            projectId: bundle.project.id,
            patch: { pluginTrustMode: trustMode }
          })}
          disabled={!dirty}
        >
          Save
        </button>
        <button className="btn" onClick={() => setTrustMode(bundle.projectSettings.pluginTrustMode)} disabled={!dirty}>
          Cancel
        </button>
        {dirty ? <span className="tag tag-warn">Unsaved changes</span> : <span className="tag tag-ok">Saved</span>}
      </div>
    </div>
  );
}
