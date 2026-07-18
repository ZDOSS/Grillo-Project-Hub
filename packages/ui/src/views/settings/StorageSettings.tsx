import { useState } from "react";
import {
  exportProjectJson,
  type PersistedStorageTrust,
  type ProjectBundle,
  type ProjectStoreAdapter
} from "@gph/core";
import { InlineAlert, useToast, type InlineAlertTone } from "../../components";
import { useProjectStore } from "../../store/project-store";
import { useWorkspaceStore } from "../../store/workspace-store";
import { SettingsPanelHeader, SettingsSectionCard } from "./settings-shared";

type StorageOperation = PersistedStorageTrust | null;

type StorageFeedback = {
  message: string;
  tone: InlineAlertTone;
};

function activeAdapter(): ProjectStoreAdapter | null {
  if (typeof window === "undefined") return null;
  return ((window as typeof window & { __gph_store?: ProjectStoreAdapter }).__gph_store) ?? null;
}

function withStorageTrust(bundle: ProjectBundle, storageTrust: PersistedStorageTrust): ProjectBundle {
  return {
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      storageTrust
    }
  };
}

function isFolderPickerDismissal(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isCurrentFolderTarget(
  storagePath: string | null,
  folderName: string,
  projectKey: string
): boolean {
  if (!storagePath) return false;
  const normalized = storagePath.replace(/\\/g, "/");
  const expected = `${folderName}/.pm-suite/${projectKey}.pms.json`;
  return normalized === expected || normalized.endsWith(`/${expected}`);
}

export function StorageSettings() {
  const bundle = useProjectStore((state) => state.bundle);
  const storagePath = useProjectStore((state) => state.storagePath);
  const storageTrust = useProjectStore((state) => state.storageTrust);
  const isDirty = useProjectStore((state) => state.isDirty);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const markSaving = useProjectStore((state) => state.markSaving);
  const markSaved = useProjectStore((state) => state.markSaved);
  const markSaveFailed = useProjectStore((state) => state.markSaveFailed);
  const recordRecent = useWorkspaceStore((state) => state.recordRecent);
  const [operation, setOperation] = useState<StorageOperation>(null);
  const [feedback, setFeedback] = useState<StorageFeedback | null>(null);
  const { notify } = useToast();

  if (!bundle) return null;

  const adapter = activeAdapter();
  const canChooseFolder = Boolean(adapter?.capabilities.folderBacked && adapter.chooseFolder);
  const busy = operation !== null || saveStatus === "saving";
  const mustSaveBeforeChangingFolder = storageTrust === "folder" && isDirty;

  const storageCopy =
    storageTrust === "folder"
      ? "This project is attached to a local folder and auto-saves there. A browser recovery copy is retained."
      : storageTrust === "browser"
      ? "This project is saved in this browser profile. You can move the current project into a local folder without recreating it."
      : "This project has not been saved yet.";

  const showFailure = (message: string) => {
    setFeedback({ message, tone: "danger" });
    notify({ tone: "danger", message });
  };

  const persistTo = async (targetTrust: PersistedStorageTrust, folderName?: string): Promise<boolean> => {
    const current = useProjectStore.getState();
    const currentBundle = current.bundle;
    if (!adapter || !currentBundle) {
      const message = "No storage adapter is available for this project.";
      markSaveFailed(message);
      showFailure(message);
      return false;
    }

    markSaving();
    try {
      const key = current.storageKey ?? currentBundle.project.id;
      const metadata = await adapter.save(
        key,
        exportProjectJson(withStorageTrust(currentBundle, targetTrust)),
        null,
        targetTrust
      );
      markSaved(metadata.key, metadata.displayPath, metadata.trust, metadata.externalRevision);
      if (metadata.trust !== "unsaved") {
        recordRecent({
          key: metadata.key,
          name: currentBundle.project.name,
          storagePath: metadata.displayPath,
          trust: metadata.trust,
          lastOpenedAt: new Date().toISOString()
        });
      }
      const destination = targetTrust === "folder"
        ? `local folder${folderName ? ` ${folderName}` : ""}`
        : "browser storage";
      const message = `Saved ${currentBundle.project.name} to ${destination}.`;
      setFeedback({ message, tone: "success" });
      notify({ tone: "success", message });
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The save did not complete.";
      const message = `Storage change failed: ${detail}`;
      markSaveFailed(detail);
      showFailure(message);
      return false;
    }
  };

  const saveToLocalFolder = async () => {
    if (!adapter?.chooseFolder) return;
    setOperation("folder");
    setFeedback(null);
    try {
      const folderName = await adapter.chooseFolder();
      if (!folderName) {
        setFeedback({
          message: "Folder access was not granted. The project remains in its current storage location.",
          tone: "warning"
        });
        return;
      }

      const current = useProjectStore.getState();
      const key = current.storageKey ?? current.bundle?.project.id ?? bundle.project.id;
      const folderFiles = await adapter.listFolderProjects?.();
      const projectAlreadyExists = folderFiles?.some(
        (filename) => filename.toLowerCase() === `${key}.pms.json`.toLowerCase()
      );
      const currentTarget = current.storageTrust === "folder" && isCurrentFolderTarget(current.storagePath, folderName, key);
      if (projectAlreadyExists && !currentTarget) {
        setFeedback({
          message: `That folder already contains ${key}.pms.json. Grillo did not overwrite it; open that project from the workspace launcher or choose a different folder.`,
          tone: "warning"
        });
        return;
      }

      await persistTo("folder", folderName);
    } catch (error) {
      if (isFolderPickerDismissal(error)) return;
      const detail = error instanceof Error ? error.message : "Folder access did not complete.";
      showFailure(`Folder access failed: ${detail}`);
    } finally {
      setOperation(null);
    }
  };

  const saveToBrowser = async () => {
    setOperation("browser");
    setFeedback(null);
    try {
      await persistTo("browser");
    } finally {
      setOperation(null);
    }
  };

  return (
    <div className="settings-panel-stack">
      <SettingsPanelHeader
        title="Storage"
        description="See and change where the current project is saved. Switching locations writes a fresh copy before the active save target changes."
      />
      <SettingsSectionCard title="Current location" description={storageCopy}>
        <div className="settings-simple-row storage-settings-location">
          <span className="storage-badge" data-trust={storageTrust}>
            <span className="storage-dot" />{" "}
            {storageTrust === "folder"
              ? "Folder-backed"
              : storageTrust === "browser"
              ? "Browser-local"
              : "Unsaved"}
          </span>
          <span className="text-xs text-secondary storage-settings-path">{storagePath ?? "This browser profile"}</span>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Change storage location"
        description="Move the active project without importing or rebuilding it. Grillo leaves the previous copy in place as a recovery point."
      >
        {canChooseFolder ? (
          <div className="row settings-inline-form">
            <button
              className="btn btn-primary"
              disabled={busy || mustSaveBeforeChangingFolder}
              onClick={() => void saveToLocalFolder()}
              type="button"
            >
              {operation === "folder"
                ? "Saving to folder..."
                : storageTrust === "folder"
                ? "Change folder"
                : "Save to local folder"}
            </button>
            {storageTrust === "folder" ? (
              <button
                className="btn"
                disabled={busy}
                onClick={() => void saveToBrowser()}
                type="button"
              >
                {operation === "browser" ? "Switching..." : "Use browser storage"}
              </button>
            ) : null}
          </div>
        ) : (
          <InlineAlert tone="info">
            Local-folder access is unavailable in this runtime. Browser-local saves and portable JSON export remain available.
          </InlineAlert>
        )}
        <p className="text-xs text-secondary">
          Folder saves use the browser&apos;s directory picker and write <code>.pm-suite/{bundle.project.id}.pms.json</code>. Moving back to browser storage does not delete the folder copy.
        </p>
        {mustSaveBeforeChangingFolder ? (
          <InlineAlert tone="warning">
            Save the current folder copy before choosing a different folder. You can still use browser storage to preserve the current changes.
          </InlineAlert>
        ) : null}
        {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}
      </SettingsSectionCard>
    </div>
  );
}
