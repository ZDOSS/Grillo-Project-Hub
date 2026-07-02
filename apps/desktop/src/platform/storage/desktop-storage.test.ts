import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopStorageAdapter } from "./desktop-storage";

function installTauriMock() {
  const invoke = vi.fn(async (cmd: string) => {
    if (cmd === "load_project") return "{\"ok\":true}";
    if (cmd === "project_exists") return true;
    return null;
  });
  Object.defineProperty(window, "__TAURI__", {
    configurable: true,
    value: {
      invoke,
      event: { listen: vi.fn() }
    }
  });
  return invoke;
}

function installLocalStorageMock() {
  const data = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => {
      data.clear();
    })
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("DesktopStorageAdapter", () => {
  beforeEach(() => {
    installLocalStorageMock();
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    delete (window as unknown as { __gph_store?: unknown }).__gph_store;
  });

  it("installs the shared desktop adapter instance", () => {
    DesktopStorageAdapter.install();
    expect((window as unknown as { __gph_store?: unknown }).__gph_store).toBe(DesktopStorageAdapter.adapter);
  });

  it("uses the registered Rust storage commands for folder-backed saves, loads, existence checks, and deletes", async () => {
    const invoke = installTauriMock();
    localStorage.setItem("gph.desktop.folder", "C:\\Projects\\Demo");

    await DesktopStorageAdapter.adapter.save("project_1", "{\"name\":\"Demo\"}");
    await DesktopStorageAdapter.adapter.load("project_1");
    await DesktopStorageAdapter.adapter.has("project_1");
    await DesktopStorageAdapter.adapter.delete("project_1");

    expect(invoke).toHaveBeenCalledWith("save_project", {
      path: "C:\\Projects\\Demo/.pm-suite/project_1.pms.json",
      contents: "{\"name\":\"Demo\"}"
    });
    expect(invoke).toHaveBeenCalledWith("load_project", {
      path: "C:\\Projects\\Demo/.pm-suite/project_1.pms.json"
    });
    expect(invoke).toHaveBeenCalledWith("project_exists", {
      path: "C:\\Projects\\Demo/.pm-suite/project_1.pms.json"
    });
    expect(invoke).toHaveBeenCalledWith("delete_project", {
      path: "C:\\Projects\\Demo/.pm-suite/project_1.pms.json"
    });
  });
});
