/**
 * localDb.ts — SQLite persistence layer (expo-sqlite).
 *
 * Schema:
 *   config  — key/value store for auth state, preferences, last-sync timestamp
 *   notes   — local copy of the user's notes (synced from the API)
 */
import * as SQLite from "expo-sqlite";
import type { Note } from "../types";

const db = SQLite.openDatabaseSync("twinstack.db");

// ── Schema ────────────────────────────────────────────────────────────────────

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id        TEXT PRIMARY KEY,
      userId    TEXT NOT NULL,
      title     TEXT NOT NULL,
      body      TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      _synced   INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_notes_user      ON notes(userId, updatedAt DESC);
  `);
}

// ── Config ────────────────────────────────────────────────────────────────────

export function getConfigValue(key: string): string | null {
  return db.getFirstSync<{ value: string }>(
    "SELECT value FROM config WHERE key = ?", [key]
  )?.value ?? null;
}

export function setConfigValue(key: string, value: string) {
  db.runSync("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, value]);
}

export function deleteConfigValue(key: string) {
  db.runSync("DELETE FROM config WHERE key = ?", [key]);
}

// ── Sync timestamp ────────────────────────────────────────────────────────────

export function getLastSyncTime(): Date | null {
  const v = getConfigValue("lastSyncAt");
  return v ? new Date(v) : null;
}

export function setLastSyncTime(d: Date) {
  setConfigValue("lastSyncAt", d.toISOString());
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function getLocalNotes(userId: string, limit = 200): Note[] {
  return db.getAllSync<Note>(
    "SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC LIMIT ?",
    [userId, limit]
  );
}

export function saveNotesLocally(notes: Note[]) {
  const stmt = db.prepareSync(
    "INSERT OR REPLACE INTO notes (id, userId, title, body, createdAt, updatedAt, _synced) VALUES (?,?,?,?,?,?,?)"
  );
  try {
    for (const n of notes)
      stmt.executeSync([n.id, n.userId, n.title, n.body ?? null, n.createdAt, n.updatedAt, 1]);
  } finally {
    stmt.finalizeSync();
  }
}

export function deleteLocalNote(id: string) {
  db.runSync("DELETE FROM notes WHERE id = ?", [id]);
}

/** Wipes all notes for a user — called on logout. */
export function deleteLocalUserData(userId: string) {
  db.runSync("DELETE FROM notes WHERE userId = ?", [userId]);
}
