import { type KeyboardEvent, useRef, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { AppearanceSettings } from "./AppearanceSettings";
import { AutomationSettings } from "./AutomationSettings";
import { BridgeSettings } from "./BridgeSettings";
import { CustomFieldsSettings } from "./CustomFieldsSettings";
import { GeneralSettings } from "./GeneralSettings";
import { ImportExportSettings } from "./ImportExportSettings";
import { LabelsMilestonesSettings } from "./LabelsMilestonesSettings";
import { MembersSettings } from "./MembersSettings";
import { PluginsSettings } from "./PluginsSettings";
import { StorageSettings } from "./StorageSettings";
import { ViewsSettings } from "./ViewsSettings";
import { WorkflowSettings } from "./WorkflowSettings";

type SettingsTabId =
  | "general"
  | "appearance"
  | "storage"
  | "views"
  | "members"
  | "workflow"
  | "labels-milestones"
  | "fields"
  | "plugins"
  | "automation"
  | "import-export"
  | "bridge";

type SettingsTabDefinition = {
  id: SettingsTabId;
  label: string;
  summary: string;
};

type SettingsGroup = {
  label: string;
  tabs: SettingsTabDefinition[];
};

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: "Workspace",
    tabs: [
      { id: "general", label: "General", summary: "Project identity" },
      { id: "appearance", label: "Appearance", summary: "Theme preference" },
      { id: "storage", label: "Storage", summary: "Current data trust" },
      { id: "views", label: "Views", summary: "Visible project surfaces" }
    ]
  },
  {
    label: "People & workflow",
    tabs: [
      { id: "members", label: "Members", summary: "Assignments and access" },
      { id: "workflow", label: "Workflow", summary: "Statuses, priorities, types" },
      { id: "labels-milestones", label: "Labels & milestones", summary: "Classification and releases" },
      { id: "fields", label: "Custom fields", summary: "Structured item metadata" }
    ]
  },
  {
    label: "Extensions & data",
    tabs: [
      { id: "plugins", label: "Plugins & trust", summary: "Plugin posture" },
      { id: "automation", label: "Automation", summary: "Rules and previews" },
      { id: "import-export", label: "Import & export", summary: "Portable project data" },
      { id: "bridge", label: "AI bridge", summary: "Future bridge readiness" }
    ]
  }
];

const SETTINGS_TABS = SETTINGS_GROUPS.flatMap((group) => group.tabs);

function tabId(tab: SettingsTabId) {
  return `settings-tab-${tab}`;
}

function panelId(tab: SettingsTabId) {
  return `settings-panel-${tab}`;
}

function renderPanel(tab: SettingsTabId) {
  switch (tab) {
    case "general":
      return <GeneralSettings />;
    case "appearance":
      return <AppearanceSettings />;
    case "storage":
      return <StorageSettings />;
    case "views":
      return <ViewsSettings />;
    case "members":
      return <MembersSettings />;
    case "workflow":
      return <WorkflowSettings />;
    case "labels-milestones":
      return <LabelsMilestonesSettings />;
    case "fields":
      return <CustomFieldsSettings />;
    case "plugins":
      return <PluginsSettings />;
    case "automation":
      return <AutomationSettings />;
    case "import-export":
      return <ImportExportSettings />;
    case "bridge":
      return <BridgeSettings />;
  }
}

/**
 * Settings shell: navigation and accessibility live here; each settings surface
 * owns its own command wiring inside a focused panel component.
 */
export function SettingsView() {
  const bundle = useProjectStore((state) => state.bundle);
  const [tab, setTab] = useState<SettingsTabId>("general");
  const tabRefs = useRef<Record<SettingsTabId, HTMLButtonElement | null>>({} as Record<SettingsTabId, HTMLButtonElement | null>);

  if (!bundle) return null;

  const activeIndex = SETTINGS_TABS.findIndex((entry) => entry.id === tab);
  const activeTab = SETTINGS_TABS[activeIndex] ?? SETTINGS_TABS[0];

  const activateTab = (next: SettingsTabId) => {
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const activateByIndex = (nextIndex: number) => {
    const wrappedIndex = (nextIndex + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    activateTab(SETTINGS_TABS[wrappedIndex].id);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        activateByIndex(activeIndex + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        activateByIndex(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        activateTab(SETTINGS_TABS[0].id);
        break;
      case "End":
        event.preventDefault();
        activateTab(SETTINGS_TABS[SETTINGS_TABS.length - 1].id);
        break;
    }
  };

  return (
    <div className="settings-view">
      <header className="settings-page-header">
        <div>
          <h2>Settings</h2>
          <p className="text-sm text-secondary">
            Configure workspace behavior, workflow rules, data movement, and future integration readiness from focused sections.
          </p>
        </div>
      </header>

      <div className="settings-shell">
        <aside className="settings-nav" aria-label="Settings navigation">
          <div
            role="tablist"
            aria-label="Settings sections"
            aria-orientation="vertical"
            className="settings-tablist"
            onKeyDown={handleTabKeyDown}
          >
            {SETTINGS_GROUPS.map((group) => (
              <div className="settings-nav-group" key={group.label}>
                <div className="settings-nav-group-title">{group.label}</div>
                {group.tabs.map((entry) => {
                  const selected = tab === entry.id;
                  return (
                    <button
                      aria-describedby={`${tabId(entry.id)}-summary`}
                      aria-label={entry.label}
                      aria-controls={panelId(entry.id)}
                      aria-selected={selected}
                      className={`settings-tab ${selected ? "settings-tab-active" : ""}`}
                      id={tabId(entry.id)}
                      key={entry.id}
                      onClick={() => setTab(entry.id)}
                      ref={(node) => {
                        tabRefs.current[entry.id] = node;
                      }}
                      role="tab"
                      tabIndex={selected ? 0 : -1}
                      type="button"
                    >
                      <span>{entry.label}</span>
                      <small id={`${tabId(entry.id)}-summary`}>{entry.summary}</small>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <section
          aria-labelledby={tabId(activeTab.id)}
          className="settings-content-panel"
          id={panelId(activeTab.id)}
          role="tabpanel"
          tabIndex={0}
        >
          {renderPanel(activeTab.id)}
        </section>
      </div>
    </div>
  );
}
