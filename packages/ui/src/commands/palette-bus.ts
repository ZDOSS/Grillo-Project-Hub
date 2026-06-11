/**
 * Tiny event bus for opening and closing the command palette and other overlays.
 */

type Listener = (open: boolean) => void;

let paletteOpen = false;
let listeners = new Set<Listener>();

export function openPalette(): void {
  if (paletteOpen) return;
  paletteOpen = true;
  listeners.forEach((l) => l(true));
}

export function closePalette(): void {
  if (!paletteOpen) return;
  paletteOpen = false;
  listeners.forEach((l) => l(false));
}

export function isPaletteOpen(): boolean {
  return paletteOpen;
}

export function subscribePalette(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* Create item dialog */
let createItemOpen = false;
let createItemListeners = new Set<(open: boolean) => void>();
let createItemPrefill: { typeId?: string } | null = null;
let createItemPrefillListeners = new Set<(p: { typeId?: string } | null) => void>();

export function openCreateItem(prefill?: { typeId?: string }): void {
  createItemPrefill = prefill ?? null;
  createItemPrefillListeners.forEach((l) => l(createItemPrefill));
  if (createItemOpen) return;
  createItemOpen = true;
  createItemListeners.forEach((l) => l(true));
}

export function closeCreateItem(): void {
  if (!createItemOpen) return;
  createItemOpen = false;
  createItemListeners.forEach((l) => l(false));
}

export function isCreateItemOpen(): boolean {
  return createItemOpen;
}

export function getCreateItemPrefill(): { typeId?: string } | null {
  return createItemPrefill;
}

export function subscribeCreateItem(l: (open: boolean) => void): () => void {
  createItemListeners.add(l);
  return () => createItemListeners.delete(l);
}

export function subscribeCreateItemPrefill(l: (p: { typeId?: string } | null) => void): () => void {
  createItemPrefillListeners.add(l);
  return () => createItemPrefillListeners.delete(l);
}
