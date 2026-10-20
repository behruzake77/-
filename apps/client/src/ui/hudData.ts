import { ITEMS_BY_ID, NPC_BY_ID, QUESTS_BY_ID, ZONES } from "@mir/shared";

export { ZONES, NPC_BY_ID, QUESTS_BY_ID };

export function itemName(id: string): string {
  return ITEMS_BY_ID[id]?.nameRu ?? id;
}

export function itemPrice(id: string): number | undefined {
  return ITEMS_BY_ID[id]?.price;
}
