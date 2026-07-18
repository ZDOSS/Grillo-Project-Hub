import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, type StorageMetadata } from "@gph/core";
import { useProjectStore } from "@gph/ui";
import { useAutoSave } from "./auto-save";
import { WebStorageAdapter } from "./storage/web-storage";

function AutoSaveHarness() {
  useAutoSave();
  return null;
}

describe("web auto-save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const bundle = buildProjectFromTemplate("software-project", "Auto-save target");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      externalRevision: 101,
      isDirty: true,
      saveStatus: "idle",
      saveError: null
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("ignores an in-flight result after the active storage target changes", async () => {
    let resolveSave!: (metadata: StorageMetadata) => void;
    const pendingSave = new Promise<StorageMetadata>((resolve) => {
      resolveSave = resolve;
    });
    const save = vi.spyOn(WebStorageAdapter.adapter, "save").mockReturnValue(pendingSave);
    const projectId = useProjectStore.getState().bundle!.project.id;

    render(<AutoSaveHarness />);

    await act(async () => {
      vi.advanceTimersByTime(251);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledOnce();

    const current = useProjectStore.getState().bundle!;
    act(() => {
      useProjectStore.setState({
        bundle: {
          ...current,
          projectSettings: { ...current.projectSettings, storageTrust: "folder" }
        },
        storagePath: `Client Work/.pm-suite/${projectId}.pms.json`,
        storageTrust: "folder",
        externalRevision: 909,
        isDirty: false,
        saveStatus: "saved"
      });
    });

    await act(async () => {
      resolveSave({
        key: projectId,
        displayPath: null,
        externalRevision: 202,
        trust: "browser"
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useProjectStore.getState()).toMatchObject({
      storagePath: `Client Work/.pm-suite/${projectId}.pms.json`,
      storageTrust: "folder",
      externalRevision: 909,
      isDirty: false,
      saveStatus: "saved"
    });
  });

  it("ignores an in-flight failure after the active storage target changes", async () => {
    let rejectSave!: (reason: Error) => void;
    const pendingSave = new Promise<StorageMetadata>((_resolve, reject) => {
      rejectSave = reject;
    });
    const save = vi.spyOn(WebStorageAdapter.adapter, "save").mockReturnValue(pendingSave);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const projectId = useProjectStore.getState().bundle!.project.id;

    render(<AutoSaveHarness />);

    await act(async () => {
      vi.advanceTimersByTime(251);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledOnce();

    const current = useProjectStore.getState().bundle!;
    act(() => {
      useProjectStore.setState({
        bundle: {
          ...current,
          projectSettings: { ...current.projectSettings, storageTrust: "folder" }
        },
        storagePath: `Client Work/.pm-suite/${projectId}.pms.json`,
        storageTrust: "folder",
        externalRevision: 909,
        isDirty: false,
        saveStatus: "saved",
        saveError: null
      });
    });

    await act(async () => {
      rejectSave(new Error("Old browser write failed"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useProjectStore.getState()).toMatchObject({
      storagePath: `Client Work/.pm-suite/${projectId}.pms.json`,
      storageTrust: "folder",
      externalRevision: 909,
      isDirty: false,
      saveStatus: "saved",
      saveError: null
    });
  });
});
