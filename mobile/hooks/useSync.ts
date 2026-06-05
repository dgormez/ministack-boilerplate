import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { checkHealth, fetchNotesSince, fetchNotes } from "../services/api";
import { saveNotesLocally, getLastSyncTime, setLastSyncTime } from "../services/localDb";

/**
 * useSync — incremental background sync.
 *
 * Strategy:
 *   1. Health check — bail early if offline.
 *   2. First sync: fetch all notes.
 *   3. Subsequent syncs: fetch only notes updated after `lastSyncAt`.
 *   4. Persist to SQLite, update Zustand store.
 */
export function useSync() {
  const { setNotes, updateNote, addNote, setSyncing, setOnline, setLastSyncAt, notes } = useStore();

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const online = await checkHealth();
      setOnline(online);
      if (!online) return;

      const lastSync = getLastSyncTime();

      if (!lastSync) {
        // First-ever sync — fetch everything
        const allNotes = await fetchNotes();
        saveNotesLocally(allNotes);
        setNotes(allNotes);
      } else {
        // Incremental sync — only changed records
        const { notes: changed, syncedAt } = await fetchNotesSince(lastSync);

        if (changed.length > 0) {
          saveNotesLocally(changed);

          const currentIds = new Set(notes.map((n) => n.id));
          for (const note of changed) {
            if (currentIds.has(note.id)) updateNote(note);
            else addNote(note);
          }
        }

        const syncDate = new Date(syncedAt);
        setLastSyncTime(syncDate);
        setLastSyncAt(syncDate);
        return;
      }

      const syncDate = new Date();
      setLastSyncTime(syncDate);
      setLastSyncAt(syncDate);
    } catch (err: unknown) {
      // SESSION_EXPIRED is handled by the root layout via the store
      if ((err as Error).message === "SESSION_EXPIRED") {
        useStore.getState().resetAuth();
      } else {
        console.warn("[sync] failed:", err);
      }
    } finally {
      setSyncing(false);
    }
  }, [notes, setNotes, updateNote, addNote, setSyncing, setOnline, setLastSyncAt]);

  return { sync };
}
