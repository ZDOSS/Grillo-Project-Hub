import { useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { useTheme } from "../../theme/theme-provider";
import { exportProjectJson, exportProjectMarkdown, exportProjectCsv } from "@gph/core";

/**
 * Settings view: theme, members, statuses, priorities, types, plugin trust, export/import.
 */
export function SettingsView() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<"general" | "members" | "statuses" | "priorities" | "types" | "labels" | "milestones" | "fields" | "automation" | "plugins" | "export" | "bridge">("general");
  const [memberName, setMemberName] = useState("");
  const [statusName, setStatusName] = useState("");
  const [statusCategory, setStatusCategory] = useState<"planned" | "active" | "completed" | "canceled">("planned");
  const [priorityName, setPriorityName] = useState("");
  const [priorityRank, setPriorityRank] = useState(150);
  const [typeName, setTypeName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  if (!bundle) return null;

  return (
    <div style={{ padding: 16, flex: 1, overflow: "auto" }}>
      <h2>Settings</h2>
      <div className="row" style={{ flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
        {([
          ["general", "General"],
          ["members", "Members"],
          ["statuses", "Statuses"],
          ["priorities", "Priorities"],
          ["types", "Work item types"],
          ["labels", "Labels"],
          ["milestones", "Milestones"],
          ["fields", "Custom fields"],
          ["automation", "Automation"],
          ["plugins", "Plugins & trust"],
          ["export", "Export & import"],
          ["bridge", "AI bridge"]
        ] as const).map(([k, label]) => (
          <button
            key={k}
            className={`btn btn-sm ${tab === k ? "btn-primary" : ""}`}
            onClick={() => setTab(k)}
          >{label}</button>
        ))}
      </div>

      {tab === "general" && (
        <div className="col" style={{ gap: 12, maxWidth: 600 }}>
          <label className="label label-row">
            Project name
            <input
              className="input"
              value={bundle.project.name}
              onChange={(e) => applyCommand({ type: "project.rename", projectId: bundle.project.id, name: e.target.value })}
            />
          </label>
          <label className="label label-row">
            Description
            <textarea className="textarea" value={bundle.project.description ?? ""} onChange={(e) => applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: "_project_", patch: { description: e.target.value } } as never)} />
          </label>
          <label className="label label-row">
            Theme
            <select className="select" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="row">
            <span className="storage-badge" data-trust={bundle.projectSettings.storageTrust}>
              <span className="storage-dot" /> {bundle.projectSettings.storageTrust === "folder" ? "Folder-backed" : bundle.projectSettings.storageTrust === "browser" ? "Browser-local" : "Unsaved"}
            </span>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Display name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
            <button className="btn btn-primary" onClick={() => {
              if (!memberName.trim()) return;
              applyCommand({ type: "member.create", projectId: bundle.project.id, displayName: memberName.trim() });
              setMemberName("");
            }}>Add member</button>
          </div>
          {bundle.core.members.map((m) => (
            <div key={m.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span>{m.displayName}</span>
              <span className="text-xs text-muted">#{m.id.slice(-6)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "statuses" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Name" value={statusName} onChange={(e) => setStatusName(e.target.value)} />
            <select className="select" value={statusCategory} onChange={(e) => setStatusCategory(e.target.value as "planned" | "active" | "completed" | "canceled")}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
            <button className="btn btn-primary" onClick={() => {
              if (!statusName.trim()) return;
              applyCommand({ type: "status.create", projectId: bundle.project.id, name: statusName.trim(), category: statusCategory });
              setStatusName("");
            }}>Add status</button>
          </div>
          {bundle.core.statuses.map((s) => (
            <div key={s.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span>{s.name}</span>
              <span className="tag">{s.category}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "priorities" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Name" value={priorityName} onChange={(e) => setPriorityName(e.target.value)} />
            <input className="input" type="number" placeholder="Rank" value={priorityRank} onChange={(e) => setPriorityRank(Number(e.target.value))} style={{ maxWidth: 100 }} />
            <button className="btn btn-primary" onClick={() => {
              if (!priorityName.trim()) return;
              applyCommand({ type: "priority.create", projectId: bundle.project.id, name: priorityName.trim(), rank: priorityRank });
              setPriorityName("");
            }}>Add priority</button>
          </div>
          {bundle.core.priorities.sort((a, b) => b.rank - a.rank).map((p) => (
            <div key={p.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span>{p.name}</span>
              <span className="tag">rank {p.rank}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "types" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Type name" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
            <button className="btn btn-primary" onClick={() => {
              if (!typeName.trim()) return;
              applyCommand({ type: "type.create", projectId: bundle.project.id, name: typeName.trim() });
              setTypeName("");
            }}>Add type</button>
          </div>
          {bundle.core.itemTypes.map((t) => (
            <div key={t.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span>{t.name}</span>
              <span className="text-xs text-muted">{t.icon ?? ""}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "labels" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Label name" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
            <select className="select" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
              <option value="purple">Purple</option>
              <option value="yellow">Yellow</option>
            </select>
            <button className="btn btn-primary" onClick={() => {
              if (!labelName.trim()) return;
              applyCommand({ type: "label.create", projectId: bundle.project.id, name: labelName.trim(), color: labelColor });
              setLabelName("");
            }}>Add label</button>
          </div>
          {bundle.core.labels.map((l) => (
            <div key={l.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="row" style={{ gap: 6 }}><span className="board-card-label" style={{ background: l.color ?? "var(--color-bg-muted)" }}>{l.name}</span></span>
              <span className="text-xs text-muted">{l.description ?? ""}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "milestones" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <div className="row">
            <input className="input" placeholder="Milestone name" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} />
            <input className="input" type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} />
            <button className="btn btn-primary" onClick={() => {
              if (!milestoneName.trim()) return;
              applyCommand({ type: "milestone.create", projectId: bundle.project.id, name: milestoneName.trim(), targetDate: milestoneDate || null });
              setMilestoneName(""); setMilestoneDate("");
            }}>Add milestone</button>
          </div>
          {bundle.core.milestones.map((m) => {
            const items = bundle.core.items.filter((i) => i.milestoneId === m.id && !i.trashedAt);
            const done = items.filter((i) => bundle.core.statuses.find((s) => s.id === i.statusId)?.category === "completed").length;
            return (
              <div key={m.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="col" style={{ gap: 2 }}>
                  <span>{m.name}</span>
                  <span className="text-xs text-muted">Target: {m.targetDate ?? "—"} · {done}/{items.length} complete</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "fields" && (
        <CustomFieldsTab />
      )}

      {tab === "automation" && (
        <div className="col" style={{ gap: 8, maxWidth: 600 }}>
          <p className="text-secondary text-sm">Automation rules are stored in the project bundle. The MVP exposes a simple trigger + conditions + actions builder. You can edit raw rules via the AI bridge.</p>
          <p className="text-xs text-muted">Open <a href="/settings/bridge">AI bridge</a> to view the JSON shape of automation rules.</p>
        </div>
      )}

      {tab === "plugins" && (
        <div className="col" style={{ gap: 12, maxWidth: 600 }}>
          <h3>Plugin trust mode</h3>
          <p className="text-sm text-secondary">
            First-party plugins are always safe. Curated/signed plugins verify package integrity before loading.
            Unrestricted local plugins are off by default and require explicit acknowledgment.
          </p>
          <div className="col" style={{ gap: 6 }}>
            <label className="row"><input type="radio" name="trust" checked /> First-party only (default)</label>
            <label className="row"><input type="radio" name="trust" disabled /> First-party + curated/signed</label>
            <label className="row"><input type="radio" name="trust" disabled /> Unrestricted local plugins (off by default)</label>
          </div>
        </div>
      )}

      {tab === "export" && (
        <ExportPanel />
      )}

      {tab === "bridge" && (
        <BridgePanel />
      )}
    </div>
  );
}

function CustomFieldsTab() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "number" | "select" | "multi-select" | "date" | "checkbox">("text");
  const [options, setOptions] = useState("");
  if (!bundle) return null;
  return (
    <div className="col" style={{ gap: 8, maxWidth: 600 }}>
      <div className="row">
        <input className="input" placeholder="Field name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="select" value={type} onChange={(e) => setType(e.target.value as "text" | "number" | "select" | "multi-select" | "date" | "checkbox")}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="multi-select">Multi-select</option>
          <option value="date">Date</option>
          <option value="checkbox">Checkbox</option>
        </select>
        {(type === "select" || type === "multi-select") && (
          <input className="input" placeholder="Options (comma separated)" value={options} onChange={(e) => setOptions(e.target.value)} />
        )}
        <button className="btn btn-primary" onClick={() => {
          if (!name.trim()) return;
          const opts = (type === "select" || type === "multi-select") ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
          applyCommand({ type: "customField.define", projectId: bundle.project.id, field: { name: name.trim(), type, options: opts } });
          setName(""); setOptions("");
        }}>Add field</button>
      </div>
      {bundle.core.customFields.map((f) => (
        <div key={f.id} className="row-between" style={{ padding: 8, borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className="col" style={{ gap: 2 }}>
            <span>{f.name}</span>
            <span className="text-xs text-muted">{f.type} {f.options ? `(${f.options.join(", ")})` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  if (!bundle) return null;
  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <h3>Export</h3>
      <p className="text-sm text-secondary">Export the project as a portable, inspectable bundle.</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => download(`${bundle.project.name}.pms.json`, exportProjectJson(bundle), "application/json")}>JSON (.pms.json)</button>
        <button className="btn" onClick={() => download(`${bundle.project.name}.md`, exportProjectMarkdown(bundle), "text/markdown")}>Markdown</button>
        <button className="btn" onClick={() => download(`${bundle.project.name}.csv`, exportProjectCsv(bundle), "text/csv")}>CSV</button>
      </div>
      <h3 style={{ marginTop: 16 }}>Import</h3>
      <p className="text-sm text-secondary">Replace the current project with a previously exported <code>project.pms.json</code>.</p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const mod = await import("@gph/core");
          try {
            const r = mod.importProjectJson(text);
            useProjectStore.getState().setBundle(r.bundle, { storageKey: null, storagePath: null, storageTrust: "browser" });
          } catch (err) {
            alert(`Import failed: ${(err as Error).message}`);
          }
        }}
      />
    </div>
  );
}

function BridgePanel() {
  const snippet = JSON.stringify({
    name: "grillo-project-hub",
    type: "stdio",
    command: "gph-bridge",
    env: {
      GPH_PROJECT_PATH: "<absolute path to .pm-suite/project.pms.json>"
    }
  }, null, 2);
  return (
    <div className="col" style={{ gap: 8, maxWidth: 720 }}>
      <h3>AI bridge (MCP-compatible)</h3>
      <p className="text-sm text-secondary">
        The bridge exposes the validated command surface to local AI/MCP clients. It runs on your machine
        and never makes network calls outside your trusted environment. It is opt-in and disabled by default.
      </p>
      <h4>Setup</h4>
      <ol className="text-sm text-secondary" style={{ paddingLeft: 20 }}>
        <li>Install the bridge: <code>npm i -g @gph/bridge</code> (placeholder)</li>
        <li>Start the bridge against your project: <code>gph-bridge --project /path/to/.pm-suite</code></li>
        <li>Paste the snippet below into your MCP-compatible client config.</li>
      </ol>
      <h4>Sample MCP config</h4>
      <pre style={{ background: "var(--color-bg-muted)", padding: 12, borderRadius: 8, overflow: "auto" }}>{snippet}</pre>
      <h4>Permissions</h4>
      <ul className="text-sm text-secondary" style={{ paddingLeft: 20 }}>
        <li>read_project_data</li>
        <li>write_project_data</li>
        <li>search_project</li>
        <li>create_items, update_items, move_items</li>
        <li>create_docs, update_docs</li>
      </ul>
    </div>
  );
}
