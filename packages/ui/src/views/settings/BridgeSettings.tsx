import { SettingsPanelHeader } from "./settings-shared";

const IMPLEMENTED_COMMAND_COVERAGE = [
  ["Project settings", "rename projects, update plugin trust, manage visible views"],
  ["Work items", "create, update, move status, archive, trash, restore, duplicate, permanently delete"],
  ["Relationships", "create and delete blocks or relates-to links"],
  ["Documents", "create, update, move, template, section, trash, restore, permanently delete"],
  ["Metadata", "members, statuses, priorities, types, labels, milestones, custom fields"],
  ["Planning views", "create, update, delete, filter, sort, reorder saved views"],
  ["Reminders & attachments", "create/update/delete reminders and add/delete/restore attachments"],
  ["Automation & bug triage", "manage automation rules and bug intake guardrails"],
  ["Search", "run project search through the shared command envelope"]
];

const NOT_SHIPPED_YET = [
  "No installable bridge is shipped yet.",
  "No MCP server binary or client config is included in this repo.",
  "No external AI client permission prompt has been implemented.",
  "No background agent automation is enabled by this panel."
];

export function BridgeSettings() {
  return (
    <div className="settings-panel-stack settings-panel-wide">
      <SettingsPanelHeader
        title="AI bridge"
        description="The app has a validated command surface that a future local bridge can use. The bridge runtime itself is not packaged yet."
      />

      <div className="settings-truth-callout" role="status">
        <strong>Current status: future bridge capability</strong>
        <span>No installable bridge is shipped yet. This panel documents the real command coverage that exists today and the runtime pieces still missing.</span>
      </div>

      <div className="settings-bridge-grid">
        <section className="settings-section-card" aria-label="Core command coverage">
          <div className="settings-card-header">
            <h4>Core command coverage</h4>
            <p className="text-sm text-secondary">
              These capabilities are real in `@gph/core` through `CommandEnvelope`, `dispatchCommand`, import/export, and search helpers.
            </p>
          </div>
          <div className="settings-capability-list">
            {IMPLEMENTED_COMMAND_COVERAGE.map(([name, description]) => (
              <div className="settings-capability-row" key={name}>
                <span className="tag tag-ok">Implemented in core</span>
                <div>
                  <strong>{name}</strong>
                  <p className="text-sm text-secondary">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section-card" aria-label="Bridge runtime gaps">
          <div className="settings-card-header">
            <h4>Bridge runtime gaps</h4>
            <p className="text-sm text-secondary">
              These must be built before the UI can provide setup instructions for an MCP-compatible client.
            </p>
          </div>
          <div className="settings-capability-list">
            {NOT_SHIPPED_YET.map((description) => (
              <div className="settings-capability-row" key={description}>
                <span className="tag tag-warn">Not shipped</span>
                <p className="text-sm text-secondary">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
