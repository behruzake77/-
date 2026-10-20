import { z } from "zod";
import type { GameAction, GameState } from "./types.js";
import { ZONE_IDS } from "./types.js";

export const zoneSchema = z.enum(ZONE_IDS as [string, ...string[]]);
export const facingSchema = z.enum(["up", "down", "left", "right"]);
export const skillSchema = z.enum([
  "recognition",
  "listening",
  "reading",
  "recall",
  "production",
  "retention",
]);

export const supportSchema = z.object({
  translation: z.boolean().default(false),
  hint: z.boolean().default(false),
  audio: z.boolean().default(false),
  typed: z.boolean().default(false),
  aiAssist: z.boolean().optional(),
});

const id = z.string().min(1).max(80);
const _shortText = z.string().min(1).max(400);

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("BEGIN"), name: z.string().max(40).optional() }),
  z.object({ type: z.literal("ENTER_ZONE"), zone: zoneSchema, via: z.string().max(40).optional() }),
  z.object({
    type: z.literal("POSITION"),
    x: z.number().finite(),
    y: z.number().finite(),
    facing: facingSchema.optional(),
  }),
  z.object({ type: z.literal("TICK"), minutes: z.number().int().min(1).max(60) }),
  z.object({ type: z.literal("INTERACT"), targetId: id, support: supportSchema.optional() }),
  z.object({
    type: z.literal("CHOOSE"),
    dialogueId: id,
    nodeId: id,
    optionId: id,
    support: supportSchema.optional(),
  }),
  z.object({
    type: z.literal("TYPE"),
    dialogueId: id,
    nodeId: id,
    text: z.string().min(1).max(300),
    support: supportSchema.optional(),
  }),
  z.object({ type: z.literal("CLOSE_DIALOGUE") }),
  z.object({ type: z.literal("BUY"), itemId: id, qty: z.number().int().min(1).max(20).optional() }),
  z.object({ type: z.literal("SLEEP") }),
  z.object({
    type: z.literal("REVIEW"),
    vocab: z.string().min(1).max(80),
    skill: z.enum(["recall", "production", "retention"]),
    correct: z.boolean(),
    support: supportSchema.optional(),
  }),
]);

export const actionListSchema = z.array(gameActionSchema).max(2000);

export type ParsedAction = z.infer<typeof gameActionSchema>;

export const learningEvidenceSchema = z.object({
  id: z.string().min(1).max(160),
  vocab: z.string().min(1).max(80),
  skill: skillSchema,
  outcome: z.number().min(0).max(1),
  at: z.number().int().nonnegative(),
  source: z.string().max(160),
  support: supportSchema,
  note: z.string().max(400).optional(),
});

export const questStateSchema = z.object({
  id: z.string().min(1).max(80),
  status: z.enum(["active", "completed"]),
  step: z.number().int().min(0).max(50),
  startedAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative().optional(),
});

export const npcStateSchema = z.object({
  id: z.string().min(1).max(40),
  met: z.boolean(),
  relationship: z.number().min(0).max(100),
  talkCount: z.number().int().min(0).max(100000),
  lastTalkedAt: z.number().int().nonnegative().optional(),
  memories: z
    .array(
      z.object({
        textRu: z.string().max(300),
        textEn: z.string().max(300).optional(),
        kind: z.enum(["fact", "kindness", "promise", "mistake", "gift"]),
        at: z.number().int().nonnegative(),
      }),
    )
    .max(20),
});

export const journalEntrySchema = z.object({
  id: z.string().min(1).max(80),
  titleRu: z.string().max(160),
  titleEn: z.string().max(160),
  textRu: z.string().max(2000),
  textEn: z.string().max(2000),
  at: z.number().int().nonnegative(),
  day: z.number().int().min(1).max(100000),
});

export const gameStateSchema = z.object({
  schemaVersion: z.literal(1),
  saveId: z.string().min(1).max(80),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  started: z.boolean(),
  name: z.string().max(40),
  day: z.number().int().min(1).max(100000),
  minutes: z.number().int().min(0).max(1439),
  player: z.object({
    zone: zoneSchema,
    x: z.number().finite(),
    y: z.number().finite(),
    facing: facingSchema,
    money: z.number().min(0).max(1_000_000),
  }),
  inventory: z.record(z.string().max(80), z.number().int().min(0).max(1000)),
  quests: z.record(z.string().max(80), questStateSchema),
  npcs: z.record(z.string().max(40), npcStateSchema),
  flags: z.record(z.string().max(120), z.union([z.string().max(200), z.number(), z.boolean()])),
  knowledge: z.record(z.string().max(120), z.number()),
  notes: z.array(z.string().max(80)).max(100),
  journal: z.array(journalEntrySchema).max(60),
  language: z.object({ evidence: z.array(learningEvidenceSchema).max(1200) }),
  stats: z.object({
    interactions: z.number().int().min(0),
    dialogues: z.number().int().min(0),
    zonesVisited: z.array(zoneSchema).max(20),
  }),
  seenIntro: z.boolean(),
});

export function parseGameAction(input: unknown): GameAction | null {
  const result = gameActionSchema.safeParse(input);
  return result.success ? (result.data as GameAction) : null;
}

export function parseGameState(input: unknown): GameState | null {
  const result = gameStateSchema.safeParse(input);
  return result.success ? (result.data as GameState) : null;
}

export function parseActionList(input: unknown): GameAction[] | null {
  const result = actionListSchema.safeParse(input);
  return result.success ? (result.data as GameAction[]) : null;
}

export const sessionRequestSchema = z.object({
  deviceId: z.string().min(8).max(120),
  name: z.string().max(40).optional(),
});
