import { useTheme } from "../../theme/theme-provider";
import { SettingsPanelHeader } from "./settings-shared";

export function AppearanceSettings() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Appearance"
        description="Keep the workspace readable in light, dark, or system-controlled mode."
      />
      <label className="label label-row">
        Theme
        <select className="select" value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  );
}
