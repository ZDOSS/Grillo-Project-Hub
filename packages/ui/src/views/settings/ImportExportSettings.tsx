import { useState } from "react";
import { exportProjectCsv, exportProjectJson, exportProjectMarkdown, importProjectJson, validateProjectBundle } from "@gph/core";
import { HelpTip, InlineAlert, useToast } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { SettingsPanelHeader } from "./settings-shared";

export function ImportExportSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [exportSummary, setExportSummary] = useState<string | null>(null);
  const { notify } = useToast();

  if (!bundle) return null;

  const activeItems = bundle.core.items.filter((item) => !item.trashedAt && !item.archived).length;
  const activeDocs = bundle.core.documents.filter((document) => !document.archived).length;

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFormat = (format: "json" | "markdown" | "csv") => {
    if (format === "json") {
      download(`${bundle.project.name}.pms.json`, exportProjectJson(bundle), "application/json");
      setExportSummary(`Exported portable JSON bundle for ${bundle.project.name}.`);
      notify({ tone: "success", message: "JSON bundle exported." });
      return;
    }
    if (format === "markdown") {
      download(`${bundle.project.name}.md`, exportProjectMarkdown(bundle), "text/markdown");
      setExportSummary(`Exported Markdown snapshot for ${bundle.project.name}.`);
      notify({ tone: "success", message: "Markdown snapshot exported." });
      return;
    }
    download(`${bundle.project.name}.csv`, exportProjectCsv(bundle), "text/csv");
    setExportSummary(`Exported CSV work-item snapshot with ${activeItems} active items.`);
    notify({ tone: "success", message: "CSV snapshot exported." });
  };

  const printCleanPreview = () => {
    setExportSummary("Opened clean print preview for the current browser view.");
    notify({ tone: "info", message: "Print preview opened." });
    window.print?.();
  };

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Import & export"
        description="Move project data through the portable JSON bundle, or export readable Markdown and CSV snapshots."
      />
      <section className="settings-section-card">
        <div className="settings-card-header">
          <h4>Export</h4>
          <p className="text-sm text-secondary">
            Export {activeItems} active work items and {activeDocs} docs from this project.
          </p>
        </div>
        <div className="import-export-grid">
          <div className="import-export-card">
            <strong>Portable JSON bundle</strong>
            <span className="text-sm text-secondary">Full `.pms.json` project backup for recovery, migration, and folder handoff.</span>
            <button className="btn" onClick={() => exportFormat("json")}>Export JSON</button>
          </div>
          <div className="import-export-card">
            <strong>Readable Markdown</strong>
            <span className="text-sm text-secondary">Human-readable project summary for status updates or review packets.</span>
            <button className="btn" onClick={() => exportFormat("markdown")}>Export Markdown</button>
          </div>
          <div className="import-export-card">
            <strong>Work-item CSV</strong>
            <span className="text-sm text-secondary">Flat work snapshot for spreadsheets, triage, or reporting.</span>
            <button className="btn" onClick={() => exportFormat("csv")}>Export CSV</button>
          </div>
          <div className="import-export-card">
            <strong>Clean print preview</strong>
            <span className="text-sm text-secondary">Use the browser print dialog for a clean copy of the current settings context.</span>
            <button className="btn" onClick={printCleanPreview}>Print preview</button>
          </div>
        </div>
        {exportSummary ? <InlineAlert tone="success">{exportSummary}</InlineAlert> : null}
      </section>
      <section className="settings-section-card">
        <div className="settings-card-header">
          <h4>
            Import
            <HelpTip label="Import project bundle">
              Import replaces the currently open project in memory and marks it browser-local until you save or export it again.
            </HelpTip>
          </h4>
          <p className="text-sm text-secondary">Replace the current project with a previously exported <code>project.pms.json</code>.</p>
        </div>
        <label className="btn btn-primary" style={{ cursor: "pointer", width: "fit-content" }}>
          Import project bundle
          <input
            aria-label="Import project bundle"
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await readFileText(file);
              setImportError(null);
              setImportSummary(null);
              try {
                const result = importProjectJson(text);
                validateProjectBundle(result.bundle);
                useProjectStore.getState().setBundle(result.bundle, { storageKey: null, storagePath: null, storageTrust: "browser" });
                const itemCount = result.bundle.core.items.filter((item) => !item.trashedAt && !item.archived).length;
                const docCount = result.bundle.core.documents.filter((document) => !document.archived).length;
                const summary = `Imported ${result.bundle.project.name}: ${itemCount} active work items, ${docCount} docs.`;
                setImportSummary(summary);
                notify({ tone: "success", message: summary });
              } catch (error) {
                setImportError(`Import failed: ${(error as Error).message}`);
              }
            }}
          />
        </label>
        {importError ? <InlineAlert tone="danger">{importError}</InlineAlert> : null}
        {importSummary ? <InlineAlert tone="success">{importSummary}</InlineAlert> : null}
      </section>
    </div>
  );
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read import file."));
    reader.readAsText(file);
  });
}
