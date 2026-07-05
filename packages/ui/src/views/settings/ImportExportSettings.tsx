import { useState } from "react";
import { exportProjectCsv, exportProjectJson, exportProjectMarkdown, importProjectJson, validateProjectBundle } from "@gph/core";
import { InlineAlert } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

export function ImportExportSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const [importError, setImportError] = useState<string | null>(null);

  if (!bundle) return null;

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Import & export"
        description="Move project data through the portable JSON bundle, or export readable Markdown and CSV snapshots."
      />
      <section>
        <h4>Export</h4>
        <p className="text-sm text-secondary">Export the project as a portable, inspectable bundle.</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => download(`${bundle.project.name}.pms.json`, exportProjectJson(bundle), "application/json")}>JSON (.pms.json)</button>
          <button className="btn" onClick={() => download(`${bundle.project.name}.md`, exportProjectMarkdown(bundle), "text/markdown")}>Markdown</button>
          <button className="btn" onClick={() => download(`${bundle.project.name}.csv`, exportProjectCsv(bundle), "text/csv")}>CSV</button>
        </div>
      </section>
      <section>
        <h4>Import</h4>
        <p className="text-sm text-secondary">Replace the current project with a previously exported <code>project.pms.json</code>.</p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            setImportError(null);
            try {
              const result = importProjectJson(text);
              validateProjectBundle(result.bundle);
              useProjectStore.getState().setBundle(result.bundle, { storageKey: null, storagePath: null, storageTrust: "browser" });
            } catch (error) {
              setImportError(`Import failed: ${(error as Error).message}`);
            }
          }}
        />
        {importError ? <InlineAlert tone="danger">{importError}</InlineAlert> : null}
      </section>
    </div>
  );
}
