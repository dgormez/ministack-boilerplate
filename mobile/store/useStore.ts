import { create } from "zustand";
import type { AuthState, Note } from "../types";

interface AppState {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: AuthState | null;

  // ── Data ──────────────────────────────────────────────────────────────────
  notes: Note[];

  // ── UI ────────────────────────────────────────────────────────────────────
  isSyncing:  boolean;
  lastSyncAt: Date | null;
  isOnline:   boolean;

  // ── Auth actions ──────────────────────────────────────────────────────────
  setAuth:           (auth: AuthState) => void;
  updateAccessToken: (token: string) => void;
  resetAuth:         () => void;

  // ── Notes actions ─────────────────────────────────────────────────────────
  setNotes:    (notes: Note[]) => void;
  addNote:     (note: Note) => void;
  updateNote:  (note: Note) => void;
  removeNote:  (id: string) => void;

  // ── UI actions ────────────────────────────────────────────────────────────
  setSyncing:    (v: boolean) => void;
  setLastSyncAt: (date: Date) => void;
  setOnline:     (v: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  auth:       null,
  notes:      [],
  isSyncing:  false,
  lastSyncAt: null,
  isOnline:   true,

  // Auth
  setAuth: (auth) => set({ auth }),
  updateAccessToken: (accessToken) => {
    const { auth } = get();
    if (auth) set({ auth: { ...auth, accessToken } });
  },
  resetAuth: () => set({ auth: null, notes: [], lastSyncAt: null }),

  // Notes
  setNotes:   (notes)  => set({ notes }),
  addNote:    (note)   => set((s) => ({ notes: [note, ...s.notes] })),
  updateNote: (note)   => set((s) => ({ notes: s.notes.map((n) => n.id === note.id ? note : n) })),
  removeNote: (id)     => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  // UI
  setSyncing:    (isSyncing)  => set({ isSyncing }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setOnline:     (isOnline)   => set({ isOnline }),
}));
