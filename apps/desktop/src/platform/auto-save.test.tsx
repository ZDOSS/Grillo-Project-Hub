import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, type StorageMetadata } from "@gph/core";
import { useProjectStore } from "@gph/ui";
import { useAutoSave } from "./auto-save";
import { DesktopStorageAdapter } from "./storage/desktop-storage";

function AutoSaveHarness() {
  useAutoSave();
  return null;
}

describe("desktop auto-save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const original = buildProjectFromTemplate("software-project", "Auto-save target");
    const bundle = {
      ...original,
      projectSettings: { ...original.projectSettings, storageTrust: "folder" as const }
    };
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: `Client Work/.pm-suite/${bundle.project.id}.pms.json`,
      storageTrust: "folder",
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

  it("ignores an in-flight failure after the active storage target changes", async () => {
    let rejectSave!: (reason: Error) => void;
    const pendingSave = new Promise<StorageMetadata>((_resolve, reject) => {
      rejectSave = reject;
    });
    const save = vi.spyOn(DesktopStorageAdapter.adapter, "save").mockReturnValue(pendingSave);
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
          projectSettings: { ...current.projectSettings, storageTrust: "browser" }
        },
        storagePath: null,
        storageTrust: "browser",
        externalRevision: 909,
        isDirty: false,
        saveStatus: "saved",
        saveError: null
      });
    });

    await act(async () => {
      rejectSave(new Error("Old folder write failed"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useProjectStore.getState()).toMatchObject({
      storagePath: null,
      storageTrust: "browser",
      externalRevision: 909,
      isDirty: false,
      saveStatus: "saved",
      saveError: null
    });
  });
});
