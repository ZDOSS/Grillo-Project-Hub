/**
 * Storage adapter contract.
 *
 *  - All adapters implement save/load/list/delete/has of a project bundle keyed by project ID.
 *  - Bundles are JSON strings. The contract returns/accepts a string; serialization lives elsewhere.
 *  - Adapters MAY also surface a "watch" capability that emits events when the on-disk/in-storage
 *    bundle changes from outside the running app.
 */

export type StorageTrust = "folder" | "browser" | "unsaved";

export type StorageCapabilities = {
  folderBacked: boolean;
  fileWatch: boolean;
  /** True if the adapter can store arbitrary binary attachments. */
  attachments: boolean;
};

export type StorageMetadata = {
  /** Stable storage key. */
  key: string;
  /** Free-form display name for the storage location, e.g. "/Users/me/projects/foo/.pm-suite/project.pms.json". */
  displayPath: string | null;
  /** Stable fingerprint of the last loaded/saved JSON, used for stale-write detection. */
  externalRevision: number | null;
  trust: StorageTrust;
};

export type WatchEvent =
  | { type: "externalChange"; key: string; newRevision: number }
  | { type: "deleted"; key: string }
  | { type: "renamed"; oldKey: string; newKey: string; newRevision: number };

export type PersistedStorageTrust = Exclude<StorageTrust, "unsaved">;

/**
 * Produce the same compact content fingerprint in browser, Node, and Rust runtimes.
 * FNV-1a is not a security hash; it is a fast stale-write signal for project JSON.
 */
export function contentRevision(json: string): number {
  const bytes = new TextEncoder().encode(json);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export type ProjectStoreAdapter = {
  capabilities: StorageCapabilities;
  list(): Promise<StorageMetadata[]>;
  has(key: string): Promise<boolean>;
  load(key: string): Promise<{ json: string; metadata: StorageMetadata } | null>;
  /** Optional direct load for a project discovered in the currently selected folder. */
  loadFolderProject?(key: string): Promise<{ json: string; metadata: StorageMetadata } | null>;
  save(
    key: string,
    json: string,
    expectedRevision?: number | null,
    targetTrust?: PersistedStorageTrust
  ): Promise<StorageMetadata>;
  delete(key: string): Promise<void>;
  /** Optional folder-picking surface for runtimes that can bind a durable local directory. */
  chooseFolder?(): Promise<string | null>;
  /** Optional human-readable display name for the currently selected folder. */
  getCurrentFolderDisplay?(): Promise<string | null>;
  /** Optional reset that makes subsequent explicitly browser-local saves ignore a selected folder. */
  clearFolder?(): Promise<void>;
  /** Optional folder scan for runtimes that can enumerate `.pm-suite` contents. */
  listFolderProjects?(): Promise<string[]>;
  /** Optional file-watch subscription. */
  watch?(key: string, handler: (event: WatchEvent) => void): () => void;
};

/** In-memory store useful for tests and ephemeral browser-mode. */
export class InMemoryProjectStore implements ProjectStoreAdapter {
  capabilities: StorageCapabilities = { folderBacked: false, fileWatch: false, attachments: true };
  private data = new Map<string, { json: string; metadata: StorageMetadata }>();

  async list(): Promise<StorageMetadata[]> {
    return Array.from(this.data.values()).map((d) => d.metadata);
  }
  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }
  async load(key: string) {
    return this.data.get(key) ?? null;
  }
  async save(key: string, json: string, expectedRevision?: number | null): Promise<StorageMetadata> {
    if (expectedRevision != null) {
      const existing = this.data.get(key);
      const actualRevision = existing ? contentRevision(existing.json) : null;
      if (actualRevision !== expectedRevision) {
        throw new Error("External change detected; refusing to save without explicit conflict resolution");
      }
    }
    const revision = contentRevision(json);
    const metadata: StorageMetadata = {
      key,
      displayPath: null,
      externalRevision: revision,
      trust: "browser"
    };
    this.data.set(key, { json, metadata });
    return metadata;
  }
  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}
