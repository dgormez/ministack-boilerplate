// ── Note ─────────────────────────────────────────────────────────────────────
export interface Note {
  id:        string;
  userId:    string;
  title:     string;
  body?:     string | null;
  createdAt: string;
  updatedAt: string;
  _synced?:  boolean; // 1 = from server, 0 = pending local write
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthState {
  userId:      string;
  email:       string;
  accessToken: string; // in-memory only; refreshed automatically
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user: {
    id:    string;
    email: string;
  };
}

export interface SyncResponse {
  notes:    Note[];
  syncedAt: string;
}
