import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { ValidationError } from "./errors.js";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import {
  CONTENT_VERSION,
  DIALOGUES_BY_ID,
  applyAction,
  createInitialState,
  gameActionSchema,
  gameStateSchema,
  learningSummary,
  matchAnswer,
  parseGameState,
  type GameAction,
  type GameState,
} from "@mir/shared";
import type { AiProvider } from "./ai/provider.js";
import type { Store, DialogueEventInput } from "./store.js";
import { bearerToken, hashToken, issueToken } from "./routes/helpers.js";

const sessionBody = z.object({
  deviceId: z.string().min(8).max(120),
  name: z.string().max(40).optional(),
});

const baseAction = z
  .object({
    type: z.string().min(1),
  })
  .passthrough();

const saveBody = z.object({
  baseVersion: z.number().int().min(0).max(1_000_000),
  /** Either a full snapshot (local-first default) or an action log (replayed by the server). */
  state: z.unknown().optional(),
  actions: z.array(baseAction).max(2000).optional(),
  /** Local-first clients may ask the server to rebuild from the full action log. */
  replace: z.boolean().optional(),
});

const interpretBody = z.object({
  dialogueId: z.string().min(1).max(80),
  nodeId: z.string().min(1).max(80),
  text: z.string().min(1).max(300),
});

export interface AppOptions {
  store: Store;
  ai?: AiProvider;
  clientDir?: string;
  logger?: boolean;
}

interface User {
  id: string;
  name: string | null;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 3 * 1024 * 1024,
    trustProxy: true,
  });

  const { store, ai } = options;
  const aiUsage = new Map<string, number[]>();

  async function authenticate(request: import("fastify").FastifyRequest): Promise<User | null> {
    const token = bearerToken(request);
    if (!token) return null;
    const user = await store.findUserByTokenHash(hashToken(token));
    if (!user) return null;
    return { id: user.id, name: user.name };
  }

  app.get("/api/health", async () => ({
    ok: true,
    mode: store.mode,
    ai: Boolean(ai),
    contentVersion: CONTENT_VERSION,
    serverTime: new Date().toISOString(),
  }));

  app.get("/api/content", async () => ({
    version: CONTENT_VERSION,
    zones: 7,
    npcs: 9,
    quests: 7,
    dialogues: Object.keys(DIALOGUES_BY_ID).length,
  }));

  app.post("/api/session", async (request, reply) => {
    const parsed = sessionBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_session", issues: parsed.error.issues });
    }
    const token = issueToken();
    const user = await store.upsertUser(
      parsed.data.deviceId,
      parsed.data.name?.trim() || undefined,
      hashToken(token),
    );
    return reply.send({
      userId: user.id,
      token,
      name: user.name,
      mode: store.mode,
      ai: Boolean(ai),
      contentVersion: CONTENT_VERSION,
    });
  });

  app.get("/api/save", async (request, reply) => {
    const user = await authenticate(request);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const save = await store.getSave(user.id);
    if (!save) {
      return reply.send({ version: 0, state: null, updatedAt: null });
    }
    const state = parseGameState(save.state);
    if (!state) {
      return reply.code(500).send({ error: "save_corrupt" });
    }
    return reply.send({ version: save.version, state, updatedAt: save.updatedAt });
  });

  app.put("/api/save", async (request, reply) => {
    const user = await authenticate(request);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = saveBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    }
    if (!parsed.data.actions?.length && parsed.data.state === undefined) {
      return reply.code(400).send({ error: "empty_save" });
    }

    const existing = await store.getSave(user.id);
    const replace = parsed.data.replace === true;
    if (!replace && existing && existing.version !== parsed.data.baseVersion) {
      return reply.code(409).send({
        error: "version_conflict",
        version: existing.version,
        state: existing.state,
      });
    }
    if (!replace && !existing && parsed.data.baseVersion !== 0) {
      return reply.code(409).send({ error: "version_conflict", version: 0, state: null });
    }

    let nextState: GameState;
    const dialogueEvents: DialogueEventInput[] = [];

    if (parsed.data.state !== undefined) {
      const validated = gameStateSchema.safeParse(parsed.data.state);
      if (!validated.success) {
        return reply.code(422).send({ error: "invalid_state", issues: validated.error.issues });
      }
      nextState = validated.data as GameState;
      if (!nextState.started) {
        return reply.code(422).send({ error: "save_not_started" });
      }
    } else {
      const actions = parsed.data.actions as unknown as GameAction[];
      let state: GameState;
      if (existing && !replace) {
        const saved = parseGameState(existing.state);
        if (!saved) return reply.code(500).send({ error: "save_corrupt" });
        state = saved;
      } else {
        state = createInitialState(Date.now(), user.name ?? "");
      }
      const now = Date.now();
      actions.forEach((action, index) => {
        const schemaCheck = gameActionSchema.safeParse(action);
        if (!schemaCheck.success) {
          throw new ValidationError("invalid_action", schemaCheck.error.issues);
        }
        const result = applyAction(state, schemaCheck.data as GameAction, now + index);
        state = result.state;
        if (result.feedback && (action.type === "CHOOSE" || action.type === "TYPE")) {
          dialogueEvents.push({
            dialogueId: action.dialogueId,
            nodeId: action.nodeId,
            optionId: result.feedback.optionId,
            accepted: result.feedback.accepted,
            at: now + index,
          });
        }
      });
      const validated = gameStateSchema.safeParse(state);
      if (!validated.success) {
        request.log.error(validated.error.issues, "replayed state failed validation");
        return reply.code(422).send({ error: "invalid_state" });
      }
      nextState = validated.data as GameState;
    }

    const knownEvidence = new Set(
      (existing ? parseGameState(existing.state) : null)?.language.evidence.map(
        (item) => item.id,
      ) ?? [],
    );
    const nextVersion = (existing?.version ?? 0) + 1;
    const previousActions = existing && !replace ? existing.actions : [];
    const actionLog = [...previousActions, ...(parsed.data.actions ?? [])].slice(-1500);
    await store.putSave({
      userId: user.id,
      version: nextVersion,
      state: nextState,
      actions: actionLog,
    });

    const newEvidence = nextState.language.evidence.filter((item) => !knownEvidence.has(item.id));
    if (newEvidence.length) await store.insertEvidence(user.id, newEvidence);
    if (dialogueEvents.length) await store.insertDialogueEvents(user.id, dialogueEvents);
    if (nextState.name && nextState.name !== user.name) {
      await store.updateUserName(user.id, nextState.name);
    }

    return reply.send({
      version: nextVersion,
      state: nextState,
      updatedAt: new Date().toISOString(),
    });
  });

  app.get("/api/learning", async (request, reply) => {
    const user = await authenticate(request);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const save = await store.getSave(user.id);
    if (!save) return reply.send({ summary: null });
    const state = parseGameState(save.state);
    if (!state) return reply.code(500).send({ error: "save_corrupt" });
    return reply.send({ summary: learningSummary(state) });
  });

  app.post("/api/ai/interpret", async (request, reply) => {
    const user = await authenticate(request);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = interpretBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });
    }
    const { dialogueId, nodeId, text } = parsed.data;
    const node = DIALOGUES_BY_ID[dialogueId]?.nodes[nodeId];
    if (!node?.typed || !node.options?.length) {
      return reply.code(400).send({ error: "not_a_typed_node" });
    }
    const options = node.options;
    const local = matchAnswer(text, options);
    const localPayload = {
      available: Boolean(ai),
      source: "local" as const,
      optionId: local.status === "accepted" ? (local.option?.id ?? null) : null,
      intent: local.option?.intent ?? null,
      confidence: local.score,
      accepted: local.status === "accepted",
      note:
        local.corrections
          .map((item) => item.en)
          .join(" ")
          .slice(0, 240) || null,
    };

    if (!ai) {
      return reply.send({ ...localPayload, available: false, reason: "ai_not_configured" });
    }

    const stamps = (aiUsage.get(user.id) ?? []).filter(
      (stamp) => Date.now() - stamp < 60 * 60 * 1000,
    );
    if (stamps.length >= 30) {
      return reply.code(429).send({ ...localPayload, reason: "rate_limited" });
    }
    stamps.push(Date.now());
    aiUsage.set(user.id, stamps);

    const interpretation = await ai.interpret({
      text,
      options: options.map((option) => ({
        id: option.id,
        ru: option.ru,
        en: option.en,
        intent: option.intent,
      })),
      context: "A beginner Russian learner is talking to a character in a neighbourhood life-sim.",
    });
    if (!interpretation) {
      return reply.send({ ...localPayload, reason: "ai_unavailable" });
    }
    const option = options.find((candidate) => candidate.id === interpretation.optionId);
    if (!option) return reply.send({ ...localPayload, reason: "ai_invalid" });

    return reply.send({
      available: true,
      source: "ai" as const,
      optionId: option.id,
      intent: option.intent ?? null,
      confidence: interpretation.confidence,
      accepted: interpretation.confidence >= 0.55,
      note: interpretation.note ?? null,
      provider: ai.name,
    });
  });

  const clientIndex = options.clientDir ? path.join(options.clientDir, "index.html") : undefined;
  if (options.clientDir && clientIndex && fs.existsSync(clientIndex)) {
    await app.register(fastifyStatic, {
      root: options.clientDir,
      // Serve files that appeared after boot too (e.g. a rebuild during development),
      // while the SPA fallback below still handles client-side routes.
      wildcard: true,
      cacheControl: false,
      setHeaders: (response, filePath) => {
        if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(filePath)) {
          response.setHeader("cache-control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          response.setHeader("cache-control", "public, max-age=31536000, immutable");
        }
      },
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api")) {
        return reply.code(404).send({ error: "not_found" });
      }
      reply.header("cache-control", "no-cache");
      return reply.type("text/html").send(fs.createReadStream(clientIndex));
    });
  } else {
    app.get("/", async (_request, reply) => {
      return reply
        .type("text/html")
        .send(
          '<!doctype html><meta charset="utf-8"><title>MIR</title><body style="background:#141210;color:#e9dcc4;font-family:system-ui;padding:3rem"><h1>MIR — Мир без перевода</h1><p>The API is running. Start the game client with <code>npm run dev</code>, or build it with <code>npm run build</code> and restart.</p><p><a style="color:#d9a441" href="/api/health">/api/health</a></p></body>',
        );
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api")) return reply.code(404).send({ error: "not_found" });
      return reply.code(404).send({ error: "client_not_built" });
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
      return reply.code(400).send({ error: error.code, issues: error.issues });
    }
    request.log.error(error);
    if (reply.statusCode >= 500) {
      return reply.code(500).send({ error: "internal_error" });
    }
    return reply.send({ error: "request_failed" });
  });

  return app;
}
