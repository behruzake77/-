import type { NpcState } from "@mir/shared";
import { RELATION_LABELS } from "./relations";

export function formatTime(minutes: number): string {
  const safe = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatPartOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h < 5) return "ночь";
  if (h < 11) return "утро";
  if (h < 17) return "день";
  if (h < 22) return "вечер";
  return "ночь";
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

export function relationLabel(npc: NpcState | undefined): string {
  if (!npc?.met) return "не знакома";
  const band =
    npc.relationship >= 70
      ? "close"
      : npc.relationship >= 40
        ? "friend"
        : npc.relationship >= 15
          ? "acquaintance"
          : "stranger";
  return RELATION_LABELS[band];
}
