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
});
