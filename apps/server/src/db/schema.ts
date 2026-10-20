import { boolean, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Minimal, privacy-conscious persistence. There is no email, no password and
 * no display name beyond an optional nickname chosen by the player.
 */
export const users = pgTable("mir_users", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  name: text("name"),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saves = pgTable("mir_saves", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(0),
  state: jsonb("state").notNull(),
  actions: jsonb("actions").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningEvents = pgTable("mir_learning_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vocab: text("vocab").notNull(),
  skill: text("skill").notNull(),
  outcome: real("outcome").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  source: text("source"),
  support: jsonb("support").notNull(),
});

export const dialogueEvents = pgTable("mir_dialogue_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dialogueId: text("dialogue_id").notNull(),
  nodeId: text("node_id").notNull(),
  optionId: text("option_id"),
  accepted: boolean("accepted").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
});
