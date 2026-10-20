import {
  parseGameState,
  type GameAction,
  type GameState,
  type LearningSettings,
} from "@mir/shared";

const SAVE_KEY = "mir.save.v1";
const SETTINGS_KEY = "mir.settings.v1";
const LOG_KEY = "mir.actionlog.v1";
const DEVICE_KEY = "mir.device.v1";
const TOKEN_KEY = "mir.token.v1";
const SYNC_KEY = "mir.sync.v1";

export const DEFAULT_SETTINGS: LearningSettings = {
  translations: "auto",
  audioRate: 0.9,
  showTransliteration: false,
  hints: true,
};

export interface SyncMeta {
  userId: string;
  token: string;
  version: number;
  deviceId: string;
  mode: "pglite" | "postgres";
  ai: boolean;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be full or blocked — the game keeps running in memory */
  }
}

export function loadLocalState(): GameState | null {
  const raw = read<unknown>(SAVE_KEY);
  if (!raw) return null;
  return parseGameState(raw);
}

export function saveLocalState(state: GameState): void {
  write(SAVE_KEY, state);
}

export function clearLocalState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): LearningSettings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<LearningSettings>>(SETTINGS_KEY) ?? {}) };
}

export function saveSettings(settings: LearningSettings): void {
  write(SETTINGS_KEY, settings);
}

export function loadActionLog(): GameAction[] {
  return read<GameAction[]>(LOG_KEY) ?? [];
}

export function saveActionLog(actions: GameAction[]): void {
  write(LOG_KEY, actions);
}

export function deviceId(): string {
  let id = read<string>(DEVICE_KEY);
  if (typeof id !== "string" || id.length < 8) {
    id = `web-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    write(DEVICE_KEY, id);
  }
  return id;
}

export function loadSync(): SyncMeta | null {
  return read<SyncMeta>(SYNC_KEY);
}

export function saveSync(meta: SyncMeta | null): void {
  if (!meta) {
    try {
      localStorage.removeItem(SYNC_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  write(SYNC_KEY, meta);
  write(TOKEN_KEY, meta.token);
}

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function openSession(name?: string): Promise<SyncMeta | null> {
  const existing = loadSync();
  if (existing?.token) return existing;
  const payload = await api<{
    userId: string;
    token: string;
    mode: "pglite" | "postgres";
    ai: boolean;
  }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ deviceId: deviceId(), name }),
  });
  if (!payload) return null;
  const meta: SyncMeta = {
    userId: payload.userId,
    token: payload.token,
    version: 0,
    deviceId: deviceId(),
    mode: payload.mode,
    ai: payload.ai,
  };
  saveSync(meta);
  return meta;
}

export interface RemoteSave {
  version: number;
  state: GameState | null;
}

export async function pullRemote(meta: SyncMeta): Promise<RemoteSave | null> {
  const payload = await api<{ version: number; state: unknown }>("/api/save", {
    method: "GET",
    headers: { authorization: `Bearer ${meta.token}` },
  });
  if (!payload) return null;
  const state = payload.state ? parseGameState(payload.state) : null;
  return { version: payload.version, state };
}

/** Local-first push: the client owns the run, the server validates and archives it. */
export async function pushSnapshot(
  meta: SyncMeta,
  state: GameState,
  replace = false,
): Promise<{ ok: true; version: number } | { ok: false; conflict: boolean; status?: number }> {
  const response = await fetch("/api/save", {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${meta.token}` },
    body: JSON.stringify({ baseVersion: meta.version, state, replace }),
  }).catch(() => null);
  if (!response) return { ok: false, conflict: false };
  if (response.status === 409) return { ok: false, conflict: true, status: 409 };
  if (!response.ok) return { ok: false, conflict: false, status: response.status };
  const payload = (await response.json()) as { version: number };
  return { ok: true, version: payload.version };
}

export async function interpretWithServer(
  meta: SyncMeta,
  dialogueId: string,
  nodeId: string,
  text: string,
): Promise<{
  available: boolean;
  optionId: string | null;
  intent: string | null;
  confidence: number;
  accepted: boolean;
  note: string | null;
  source?: "ai" | "local";
  reason?: string;
} | null> {
  return api("/api/ai/interpret", {
    method: "POST",
    headers: { authorization: `Bearer ${meta.token}` },
    body: JSON.stringify({ dialogueId, nodeId, text }),
  });
}
