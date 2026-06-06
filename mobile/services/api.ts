/**
 * api.ts — HTTP client with automatic JWT refresh.
 *
 * Usage:
 *   1. Call configureApi(baseUrl) on app startup.
 *   2. After login/register, call setAccessToken(token).
 *   3. All requests automatically include Authorization: Bearer <token>.
 *   4. On 401, the client attempts one token refresh before throwing.
 */
import * as SecureStore from "expo-secure-store";
import { Note, AuthResponse, SyncResponse } from "../types";

// ── Config ────────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_KEY = "ministack_refresh_token";

let _baseUrl     = "";
let _accessToken = "";

export const configureApi    = (baseUrl: string) => { _baseUrl = baseUrl.replace(/\/$/, ""); };
export const setAccessToken  = (token: string)   => { _accessToken = token; };
export const clearAccessToken = ()               => { _accessToken = ""; };

// ── SecureStore helpers ───────────────────────────────────────────────────────

export const getStoredRefreshToken    = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
export const storeRefreshToken        = (t: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, t);
export const deleteStoredRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

// ── Token refresh ─────────────────────────────────────────────────────────────

/** Attempts a silent token refresh. Returns the new access token on success. */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${_baseUrl}/api/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh token is invalid or expired — force re-login
      await deleteStoredRefreshToken();
      return null;
    }

    const data: AuthResponse = await res.json();
    _accessToken = data.accessToken;
    await storeRefreshToken(data.refreshToken);

    // Notify the store so the in-memory auth state stays current
    const { useStore } = await import("../store/useStore");
    useStore.getState().updateAccessToken(data.accessToken);

    return data.accessToken;
  } catch {
    return null; // network error — don't clear the refresh token
  }
}

// ── Core request ──────────────────────────────────────────────────────────────

async function request<T>(
  method:  string,
  path:    string,
  body?:   unknown,
  isRetry = false,
): Promise<T> {
  const url = `${_baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    const newToken = await tryRefresh();
    if (newToken) return request<T>(method, path, body, true);
    // Refresh failed — bubble up a sentinel so the app can redirect to login
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${res.status}] ${text || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Notes API ─────────────────────────────────────────────────────────────────

export const fetchNotes = (): Promise<Note[]> =>
  request("GET", "/api/notes");

export const fetchNotesSince = (since: Date): Promise<SyncResponse> =>
  request("GET", `/api/notes/sync?since=${since.toISOString()}`);

export const createNote = (title: string, body?: string): Promise<Note> =>
  request("POST", "/api/notes", { title, body });

export const updateNote = (id: string, title: string, body?: string): Promise<Note> =>
  request("PUT", `/api/notes/${id}`, { title, body });

export const deleteNote = (id: string): Promise<void> =>
  request("DELETE", `/api/notes/${id}`);

// ── Health ────────────────────────────────────────────────────────────────────

export const checkHealth = async (): Promise<boolean> => {
  try { return (await fetch(`${_baseUrl}/health`)).ok; } catch { return false; }
};
