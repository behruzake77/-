import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { createDatabase, type DatabaseHandle } from "../src/db/index.js";
import { createStore, type Store } from "../src/store.js";

let app: FastifyInstance;
let database: DatabaseHandle;
let store: Store;

const device = "device-test-0001";

async function session(deviceId = device) {
  const response = await app.inject({
    method: "POST",
    url: "/api/session",
    payload: { deviceId },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { token: string; userId: string };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  database = await createDatabase({ pgliteDir: "memory://" });
  store = createStore(database.db, database.mode, database.close);
  app = await buildApp({ store, clientDir: "/tmp/mir-no-client" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await database.close();
});

describe("MIR API", () => {
  it("reports health and the embedded database mode", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("pglite");
    expect(body.ai).toBe(false);
  });

  it("creates a stable anonymous profile from a device id", async () => {
    const first = await session("device-test-stable");
    const second = await session("device-test-stable");
    expect(second.userId).toBe(first.userId);
    expect(second.token).not.toBe(first.token);
  });

  it("requires a token to sync saves", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/save",
      payload: { baseVersion: 0, actions: [] },
    });
    expect(response.statusCode).toBe(401);
  });

  it("replays validated actions and stores the authoritative state", async () => {
    const { token } = await session("device-test-save");
    const response = await app.inject({
      method: "PUT",
      url: "/api/save",
      headers: auth(token),
      payload: {
        baseVersion: 0,
        actions: [
          { type: "BEGIN", name: "Алекс" },
          { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" },
          { type: "INTERACT", targetId: "apartment.note" },
        ],
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.version).toBe(1);
    expect(body.state.started).toBe(true);
    expect(body.state.flags["apt.note_read"]).toBe(true);
    expect(body.state.quests.q_arrival.step).toBe(2);
    expect(body.state.journal.length).toBeGreaterThan(0);

    const read = await app.inject({
      method: "GET",
      url: "/api/save",
      headers: auth(token),
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().state.flags["apt.note_read"]).toBe(true);
    expect(read.json().version).toBe(1);
  });

  it("rejects unknown action types", async () => {
    const { token } = await session("device-test-invalid");
    const response = await app.inject({
      method: "PUT",
      url: "/api/save",
      headers: auth(token),
      payload: { baseVersion: 0, actions: [{ type: "GIVE_ME_MONEY", amount: 99999 }] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("detects version conflicts instead of overwriting silently", async () => {
    const { token } = await session("device-test-conflict");
    await app.inject({
      method: "PUT",
      url: "/api/save",
      headers: auth(token),
      payload: { baseVersion: 0, actions: [{ type: "BEGIN", name: "Тест" }] },
    });
    const response = await app.inject({
      method: "PUT",
      url: "/api/save",
      headers: auth(token),
      payload: { baseVersion: 0, actions: [{ type: "TICK", minutes: 5 }] },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe("version_conflict");
    expect(response.json().version).toBe(1);
  });

  it("records real learning evidence produced by typed answers", async () => {
    const { token } = await session("device-test-learning");
    const response = await app.inject({
      method: "PUT",
      url: "/api/save",
      headers: auth(token),
      payload: {
        baseVersion: 0,
        actions: [
          { type: "BEGIN", name: "Лена" },
          {
            type: "TYPE",
            dialogueId: "lidia_phone",
            nodeId: "anna_slow",
            text: "я во дворе",
            support: { translation: false, hint: false, audio: false, typed: true },
          },
        ],
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().state.language.evidence.length).toBeGreaterThan(0);
    const summary = await app.inject({ method: "GET", url: "/api/learning", headers: auth(token) });
    expect(summary.statusCode).toBe(200);
    expect(summary.json().summary.evidenceCount).toBeGreaterThan(0);
    expect(summary.json().summary.wordsPracticed).toBeGreaterThan(0);
  });

  it("falls back to deterministic interpretation when no AI is configured", async () => {
    const { token } = await session("device-test-ai");
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/interpret",
      headers: auth(token),
      payload: { dialogueId: "lidia_phone", nodeId: "anna_slow", text: "двор" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.available).toBe(false);
    expect(body.source).toBe("local");
    expect(body.optionId).toBe("typed_courtyard");
  });

  it("exposes a content manifest for client/server compatibility checks", async () => {
    const response = await app.inject({ method: "GET", url: "/api/content" });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBeDefined();
    expect(response.json().zones).toBe(7);
  });
});
