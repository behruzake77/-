import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { GameState, LearningEvidence } from "@mir/shared";
import { executeRows, type MirDatabase } from "./db/index.js";

export interface UserRow {
  id: string;
  deviceId: string;
  name: string | null;
  tokenHash: string;
  createdAt: string;
}

export interface SaveRow {
  userId: string;
  version: number;
  state: GameState;
  actions: unknown[];
  updatedAt: string;
}

export interface DialogueEventInput {
  dialogueId: string;
  nodeId: string;
  optionId?: string;
  accepted: boolean;
  at: number;
}

export interface Store {
  mode: "postgres" | "pglite";
  upsertUser(deviceId: string, name: string | undefined, tokenHash: string): Promise<UserRow>;
  findUserByTokenHash(tokenHash: string): Promise<UserRow | undefined>;
  updateUserName(userId: string, name: string): Promise<void>;
  getSave(userId: string): Promise<SaveRow | undefined>;
  putSave(input: {
    userId: string;
    version: number;
    state: GameState;
    actions: unknown[];
  }): Promise<void>;
  insertEvidence(userId: string, evidence: LearningEvidence[]): Promise<void>;
  insertDialogueEvents(userId: string, events: DialogueEventInput[]): Promise<void>;
  close(): Promise<void>;
}

function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    name: row.name === null || row.name === undefined ? null : String(row.name),
    tokenHash: String(row.token_hash),
    createdAt: String(row.created_at),
  };
}

export function createStore(
  db: MirDatabase,
  mode: "postgres" | "pglite",
  close: () => Promise<void>,
): Store {
  return {
    mode,
    async upsertUser(deviceId, name, tokenHash) {
      const id = `usr_${randomUUID()}`;
      const rows = await executeRows<Record<string, unknown>>(
        db,
        sql`insert into mir_users (id, device_id, name, token_hash, created_at)
            values (${id}, ${deviceId}, ${name ?? null}, ${tokenHash}, now())
            on conflict (device_id) do update set
              token_hash = excluded.token_hash,
              name = coalesce(excluded.name, mir_users.name)
            returning *`,
      );
      return mapUser(rows[0]);
    },
    async findUserByTokenHash(tokenHash) {
      const rows = await executeRows<Record<string, unknown>>(
        db,
        sql`select * from mir_users where token_hash = ${tokenHash} limit 1`,
      );
      return rows[0] ? mapUser(rows[0]) : undefined;
    },
    async updateUserName(userId, name) {
      await executeRows(db, sql`update mir_users set name = ${name} where id = ${userId}`);
    },
    async getSave(userId) {
      const rows = await executeRows<Record<string, unknown>>(
        db,
        sql`select * from mir_saves where user_id = ${userId} limit 1`,
      );
      const row = rows[0];
      if (!row) return undefined;
      return {
        userId: String(row.user_id),
        version: Number(row.version),
        state: row.state as GameState,
        actions: Array.isArray(row.actions) ? (row.actions as unknown[]) : [],
        updatedAt: String(row.updated_at),
      };
    },
    async putSave({ userId, version, state, actions }) {
      await executeRows(
        db,
        sql`insert into mir_saves (user_id, version, state, actions, updated_at)
            values (${userId}, ${version}, ${JSON.stringify(state)}::jsonb, ${JSON.stringify(actions)}::jsonb, now())
            on conflict (user_id) do update set
              version = excluded.version,
              state = excluded.state,
              actions = excluded.actions,
              updated_at = now()`,
      );
    },
    async insertEvidence(userId, evidence) {
      for (const item of evidence) {
        await executeRows(
          db,
          sql`insert into mir_learning_events (id, user_id, vocab, skill, outcome, at, source, support)
              values (${item.id}, ${userId}, ${item.vocab}, ${item.skill}, ${item.outcome},
                      ${new Date(item.at).toISOString()}::timestamptz, ${item.source},
                      ${JSON.stringify(item.support)}::jsonb)
              on conflict (id) do nothing`,
        );
      }
    },
    async insertDialogueEvents(userId, events) {
      for (const event of events) {
        await executeRows(
          db,
          sql`insert into mir_dialogue_events (id, user_id, dialogue_id, node_id, option_id, accepted, at)
              values (${`dlg_${randomUUID()}`}, ${userId}, ${event.dialogueId}, ${event.nodeId},
                      ${event.optionId ?? null}, ${event.accepted},
                      ${new Date(event.at).toISOString()}::timestamptz)`,
        );
      }
    },
    close,
  };
}
