import type { Note } from "../types";

// Web shim — expo-sqlite's WASM worker doesn't resolve under Metro web bundler.
// All operations are no-ops; the app relies on API data on web.

const store = new Map<string, string>();

export function initDb() {}

export function getConfigValue(key: string): string | null {
  return store.get(key) ?? null;
}

export function setConfigValue(key: string, value: string) {
  store.set(key, value);
}

export function deleteConfigValue(key: string) {
  store.delete(key);
}

export function getLastSyncTime(): Date | null {
  const v = store.get("lastSyncAt");
  return v ? new Date(v) : null;
}

export function setLastSyncTime(d: Date) {
  store.set("lastSyncAt", d.toISOString());
}

export function getLocalNotes(_userId: string, _limit = 200): Note[] {
  return [];
}

export function saveNotesLocally(_notes: Note[]) {}

export function deleteLocalNote(_id: string) {}

export function deleteLocalUserData(_userId: string) {}
