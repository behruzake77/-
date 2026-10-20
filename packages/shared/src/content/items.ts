import type { GiftItemDefinition, NoteEntry } from "../types.js";

export const ITEMS: GiftItemDefinition[] = [
  {
    id: "bread",
    nameRu: "батон",
    nameEn: "white loaf",
    price: 45,
    unitRu: "шт.",
    descriptionRu: "Мягкий батон. Ещё тёплый.",
    descriptionEn: "A soft white loaf. Still warm.",
    icon: "bread",
    shop: true,
  },
  {
    id: "milk",
    nameRu: "молоко",
    nameEn: "milk",
    price: 89,
    unitRu: "бутылка",
    descriptionRu: "Бутылка молока, два с половиной процента.",
    descriptionEn: "A bottle of milk, 2.5%.",
    icon: "milk",
    shop: true,
  },
  {
    id: "tea",
    nameRu: "чай",
    nameEn: "tea",
    price: 140,
    unitRu: "пачка",
    descriptionRu: "Чёрный чай в жестяной банке.",
    descriptionEn: "Black tea in a tin.",
    icon: "tea",
    shop: true,
  },
  {
    id: "apple",
    nameRu: "яблоко",
    nameEn: "apple",
    price: 30,
    descriptionRu: "Яблоко из сада Лидии Петровны.",
    descriptionEn: "An apple from Lidia Petrovna’s garden.",
    icon: "apple",
  },
  {
    id: "ball",
    nameRu: "мяч",
    nameEn: "ball",
    price: 0,
    descriptionRu: "Красный мяч Саши.",
    descriptionEn: "Sasha’s red ball.",
    icon: "ball",
  },
  {
    id: "key",
    nameRu: "ключ",
    nameEn: "key",
    price: 0,
    descriptionRu: "Ключ от квартиры 27.",
    descriptionEn: "The key to flat 27.",
    icon: "key",
  },
  {
    id: "phone",
    nameRu: "телефон",
    nameEn: "phone",
    price: 0,
    descriptionRu: "Твой телефон. Батарея почти пустая.",
    descriptionEn: "Your phone. The battery is nearly empty.",
    icon: "phone",
  },
  {
    id: "drawing",
    nameRu: "рисунок",
    nameEn: "drawing",
    price: 0,
    descriptionRu: "Саша нарисовал тебя, метро и кошку. Ты получился(ась) очень высоким.",
    descriptionEn: "Sasha drew you, the metro and the cat. You came out very tall.",
    icon: "note",
  },
  {
    id: "bag",
    nameRu: "пакет",
    nameEn: "carrier bag",
    price: 5,
    descriptionRu: "Простой пакет из магазина.",
    descriptionEn: "A plain shop bag.",
    icon: "bag",
    shop: true,
  },
];

export const ITEMS_BY_ID: Record<string, GiftItemDefinition> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);

export const STARTING_MONEY = 1800;

export const NOTES: NoteEntry[] = [
  {
    id: "note_anna",
    titleRu: "Записка от Анны",
    titleEn: "Note from Anna",
    zone: "apartment",
    textRu:
      "Привет! Я взяла ключ у тёти Тани, он под ковриком. Я на работе до шести, потом буду в «Тёплом угле». Позвони мне: 8 911 402 71 06. Чай на верхней полке. Не скучай! Анна",
    textEn:
      "Hi! I took the key from Aunt Tanya — it’s under the doormat. I’m at work until six, then I’ll be at “Тёплый угол”. Call me: 8 911 402 71 06. Tea is on the top shelf. Don’t be bored! Anna",
  },
  {
    id: "note_job",
    titleRu: "Объявление на доске",
    titleEn: "Notice on the board",
    zone: "dombyta",
    textRu:
      "Кофейня «Тёплый угол» приглашает помощника. Смена 10:00–16:00. Без опыта — научим. Спросить Костю.",
    textEn:
      "The café “Тёплый угол” is looking for an assistant. Shift 10:00–16:00. No experience needed — we’ll teach you. Ask for Kostya.",
  },
  {
    id: "note_metro",
    titleRu: "Схема метро",
    titleEn: "Metro map",
    zone: "metro",
    textRu:
      "Станция «Площадь Мира». До «Театральной» — две остановки. Выход к кафе «Тёплый угол» — налево, потом прямо через двор.",
    textEn:
      "Station “Площадь Мира”. Two stops to “Театральная”. Exit towards café “Тёплый угол” — left, then straight across the courtyard.",
  },
  {
    id: "note_menu",
    titleRu: "Меню «Тёплого угла»",
    titleEn: "Menu of “Тёплый угол”",
    zone: "cafe",
    textRu: "Капучино — 220 ₽. Чай с лимоном — 180 ₽. Сырники — 260 ₽. Хлеб с маслом — 90 ₽.",
    textEn: "Cappuccino — 220 ₽. Tea with lemon — 180 ₽. Syrniki — 260 ₽. Bread and butter — 90 ₽.",
  },
  {
    id: "note_shop_list",
    titleRu: "Список покупок",
    titleEn: "Shopping list",
    zone: "apartment",
    textRu: "Хлеб. Молоко. Чай.",
    textEn: "Bread. Milk. Tea.",
  },
];

export const NOTES_BY_ID: Record<string, NoteEntry> = Object.fromEntries(
  NOTES.map((note) => [note.id, note]),
);
