import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectFromTemplate, exportProjectJson } from "@gph/core";
import { WebStorageAdapter } from "./web-storage";

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

describe("WebStorageAdapter folder mode", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined });
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: undefined });
  });

  it("keeps a chosen folder active for create, list, and load when handle persistence is unavailable", async () => {
    const bundle = buildProjectFromTemplate("software-project", "Folder Project");
    const folder = createFakeFolder("Client Folder", {
      [`${bundle.project.id}.pms.json`]: exportProjectJson({
        ...bundle,
        projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
      })
    });
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn(async () => folder.handle)
    });

    await expect(WebStorageAdapter.adapter.chooseFolder()).resolves.toBe("Client Folder");

    const saved = await WebStorageAdapter.adapter.save(bundle.project.id, exportProjectJson({
      ...bundle,
      projectSettings: { ...bundle.projectSettings, storageTrust: "folder" }
    }), null);
    expect(saved).toMatchObject({
      displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
      trust: "folder"
    });
    expect(localStorage.getItem(`gph.project.${bundle.project.id}`)).toBeNull();

    await expect(WebStorageAdapter.adapter.listFolderProjects()).resolves.toEqual([
      `${bundle.project.id}.pms.json`
    ]);
    await expect(WebStorageAdapter.adapter.loadFolderProject?.(bundle.project.id)).resolves.toMatchObject({
      metadata: {
        displayPath: `Client Folder/.pm-suite/${bundle.project.id}.pms.json`,
        trust: "folder"
      }
    });
  });
});
