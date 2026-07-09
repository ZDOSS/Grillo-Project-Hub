import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, exportProjectJson } from "@gph/core";

type FakeFolder = {
  handle: FileSystemDirectoryHandle;
  files: Map<string, string>;
};

function createFakeFolder(name: string, seed: Record<string, string> = {}): FakeFolder {
  const files = new Map(Object.entries(seed));
  const projectDir = {
    kind: "directory",
    name: ".pm-suite",
    getFileHandle: async (filename: string, options?: FileSystemGetFileOptions) => {
      if (!files.has(filename) && !options?.create) {
        throw new Error(`${filename} was not found`);
      }
      if (!files.has(filename)) files.set(filename, "");
      return {
        kind: "file",
        name: filename,
        getFile: async () => ({
          text: async () => files.get(filename) ?? ""
        }),
        createWritable: async () => ({
          write: async (contents: FileSystemWriteChunkType) => {
            files.set(filename, typeof contents === "string" ? contents : String(contents));
          },
          close: async () => {}
        })
      };
    },
    removeEntry: async (filename: string) => {
      files.delete(filename);
    },
    values: async function* () {
      for (const filename of files.keys()) {
        yield { kind: "file", name: filename };
      }
    }
  };

  const handle = {
    kind: "directory",
    name,
    queryPermission: async () => "granted",
    requestPermission: async () => "granted",
    getDirectoryHandle: async (dirname: string, options?: FileSystemGetDirectoryOptions) => {
      if (dirname === ".pm-suite") return projectDir;
      if (options?.create) throw new Error("Only .pm-suite is supported by this test handle");
      throw new Error(`${dirname} was not found`);
    }
  } as unknown as FileSystemDirectoryHandle;

  return { handle, files };
}

async function getAdapter() {
  const module = await import("./web-storage");
  return module.WebStorageAdapter.adapter;
}

describe("WebStorageAdapter folder mode", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined });
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: undefined });
  });

  it("keeps a chosen folder active for create, list, and load when handle persistence is unavailable", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Project");
    const serializedBundle = exportProjectJson({
      ...bundle,
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    });
    const folder = createFakeFolder("Client Folder", {
      [`${bundle.project.id}.pms.json`]: serializedBundle
    });
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await expect(adapter.chooseFolder()).resolves.toBe("Client Folder");

    const saved = await adapter.save(bundle.project.id, serializedBundle, null);
    expect(saved).toMatchObject({
      displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      trust: "folder"
    });
    expect(localStorage.getItem(`gph.project.${bundle.project.id}`)).toBe(serializedBundle);

    await expect(adapter.listFolderProjects()).resolves.toEqual([
      `${bundle.project.id}.pms.json`
    ]);
    await expect(adapter.loadFolderProject?.(bundle.project.id)).resolves.toMatchObject({
      metadata: {
        displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
        trust: "folder"
      }
    });
  });

  it("keeps browser-local projects out of an active folder and lets users clear the folder", async () => {
    const folderProject = buildProjectFromTemplate("software-project", "Folder Project");
    const browserProject = buildProjectFromTemplate("software-project", "Browser Project");
    const folder = createFakeFolder("Client Folder");
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await adapter.chooseFolder?.();
    await adapter.save(folderProject.project.id, exportProjectJson(folderProject), null, "folder");
    await adapter.save(browserProject.project.id, exportProjectJson(browserProject), null, "browser");

    expect(folder.files.has(`${folderProject.project.id}.pms.json`)).toBe(true);
    expect(folder.files.has(`${browserProject.project.id}.pms.json`)).toBe(false);
    expect(localStorage.getItem(`gph.project.${browserProject.project.id}`)).not.toBeNull();

    await adapter.clearFolder?.();
    await expect(adapter.getCurrentFolderDisplay?.()).resolves.toBeNull();
  });

  it("rejects a stale folder save after the project file changes externally", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Original");
    const originalJson = exportProjectJson(bundle);
    const externalJson = exportProjectJson({
      ...bundle,
      project: { ...bundle.project, name: "Changed elsewhere" }
    });
    const folder = createFakeFolder("Client Folder");
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await adapter.chooseFolder?.();
    const saved = await adapter.save(bundle.project.id, originalJson, null, "folder");
    folder.files.set(`${bundle.project.id}.pms.json`, externalJson);

    await expect(adapter.save(
      bundle.project.id,
      originalJson,
      saved.externalRevision,
      "folder"
    )).rejects.toThrow(/External change detected/);

    folder.files.delete(`${bundle.project.id}.pms.json`);
    await expect(adapter.save(
      bundle.project.id,
      originalJson,
      saved.externalRevision,
      "folder"
    )).rejects.toThrow(/External change detected/);
  });

  it("restores a browser recovery copy after reload when the folder handle was not durable", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Recovered Folder Project");
    const serializedBundle = exportProjectJson({
      ...bundle,
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    });
    const folder = createFakeFolder("Client Folder");
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await adapter.chooseFolder();
    await adapter.save(bundle.project.id, serializedBundle, null);
    expect(folder.files.get(`${bundle.project.id}.pms.json`)).toBe(serializedBundle);

    vi.resetModules();
    const reloadedAdapter = await getAdapter();
    const loaded = await reloadedAdapter.load(bundle.project.id);

    expect(loaded?.json).toBe(serializedBundle);
    expect(loaded?.metadata).toMatchObject({
      displayPath: null,
      trust: "browser"
    });
    await expect(reloadedAdapter.has(bundle.project.id)).resolves.toBe(true);
    await expect(reloadedAdapter.listFolderProjects()).resolves.toEqual([]);
  });

  it("promotes newer browser recovery edits when a folder project is reopened", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Original");
    const folderJson = exportProjectJson({
      ...bundle,
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    });
    const recoveredJson = exportProjectJson({
      ...bundle,
      project: { ...bundle.project, name: "Recovered Newer" },
      projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
    });
    const folder = createFakeFolder("Client Folder");
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await adapter.chooseFolder();
    await adapter.save(bundle.project.id, folderJson, null);
    expect(folder.files.get(`${bundle.project.id}.pms.json`)).toBe(folderJson);

    vi.resetModules();
    const recoveryAdapter = await getAdapter();
    await recoveryAdapter.save(bundle.project.id, recoveredJson, null);
    expect(folder.files.get(`${bundle.project.id}.pms.json`)).toBe(folderJson);

    await recoveryAdapter.chooseFolder();
    const reopened = await recoveryAdapter.loadFolderProject?.(bundle.project.id);

    expect(reopened?.json).toBe(recoveredJson);
    expect(reopened?.metadata).toMatchObject({
      displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      trust: "folder"
    });
    expect(folder.files.get(`${bundle.project.id}.pms.json`)).toBe(recoveredJson);
  });

  it("does not promote browser recovery when the folder file changed externally", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Original");
    const folderJson = exportProjectJson({
      ...bundle,
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    });
    const recoveredJson = exportProjectJson({
      ...bundle,
      project: { ...bundle.project, name: "Recovered Stale" },
      projectSettings: { ...bundle.projectSettings, storageTrust: "browser" }
    });
    const externalFolderJson = exportProjectJson({
      ...bundle,
      project: { ...bundle.project, name: "External Folder Newer" },
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    });
    const folder = createFakeFolder("Client Folder");
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });
    const adapter = await getAdapter();

    await adapter.chooseFolder();
    await adapter.save(bundle.project.id, folderJson, null);

    vi.resetModules();
    const recoveryAdapter = await getAdapter();
    await recoveryAdapter.save(bundle.project.id, recoveredJson, null);
    folder.files.set(`${bundle.project.id}.pms.json`, externalFolderJson);

    await recoveryAdapter.chooseFolder();
    const reopened = await recoveryAdapter.loadFolderProject?.(bundle.project.id);

    expect(reopened?.json).toBe(externalFolderJson);
    expect(reopened?.metadata).toMatchObject({
      displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      trust: "folder"
    });
    expect(folder.files.get(`${bundle.project.id}.pms.json`)).toBe(externalFolderJson);
    expect(localStorage.getItem(`gph.project.${bundle.project.id}`)).toBe(externalFolderJson);
  });
});
