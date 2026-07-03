import type { CreateItemPrefill } from "./palette-bus";

/**
 * Command registry: extensible list of named commands that the palette and shortcuts dispatch.
 * Modules register commands through this registry; commands ultimately resolve to
 * the validated command surface (or built-in actions like navigation).
 */

export type CommandContext = {
  navigate: (path: string) => void;
  openPalette: boolean;
  closePalette: () => void;
  openCreateItem: (prefill?: CreateItemPrefill) => void;
  openSearch?: () => void;
};

export type CommandEntry = {
  id: string;
  title: string;
  description?: string;
  shortcut?: string; // e.g. "Mod+K"
  group: "navigation" | "item" | "view" | "search" | "settings" | "project" | "automation";
  run: (ctx: CommandContext) => void | Promise<void>;
  /** Optional: when predicate returns false, the command is hidden from the palette. */
  available?: (ctx: CommandContext) => boolean;
};

let commands: CommandEntry[] = [];
let listeners = new Set<() => void>();

export function registerCommand(entry: CommandEntry): () => void {
  commands = [...commands.filter((c) => c.id !== entry.id), entry];
  listeners.forEach((l) => l());
  return () => {
    commands = commands.filter((c) => c.id !== entry.id);
    listeners.forEach((l) => l());
  };
}

export function listCommands(): CommandEntry[] {
  return commands;
}

export function searchCommands(query: string): CommandEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
}

export function subscribeCommands(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
