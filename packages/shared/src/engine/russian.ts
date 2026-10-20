/**
 * Small, dependency-free Russian text utilities.
 * Deliberately conservative: we would rather accept a variant than reject a
 * learner who expressed the right meaning with imperfect morphology.
 */

const STRESS = /[\u0300-\u0301\u0483-\u0489]/g;

export function normalizeRussian(input: string): string {
  return input
    .normalize("NFD")
    .replace(STRESS, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'“”„`]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export function hasLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

const TRANSLIT_PAIRS: Array<[RegExp, string]> = [
  [/shch/g, "щ"],
  [/sch/g, "щ"],
  [/zh/g, "ж"],
  [/kh/g, "х"],
  [/ts/g, "ц"],
  [/ch/g, "ч"],
  [/sh/g, "ш"],
  [/yu/g, "ю"],
  [/ju/g, "ю"],
  [/ya/g, "я"],
  [/ja/g, "я"],
  [/yo/g, "е"],
  [/jo/g, "е"],
  [/ye/g, "е"],
  [/je/g, "е"],
  [/iy/g, "ий"],
  [/yy/g, "ы"],
  [/a/g, "а"],
  [/b/g, "б"],
  [/v/g, "в"],
  [/g/g, "г"],
  [/d/g, "д"],
  [/e/g, "е"],
  [/z/g, "з"],
  [/i/g, "и"],
  [/k/g, "к"],
  [/l/g, "л"],
  [/m/g, "м"],
  [/n/g, "н"],
  [/o/g, "о"],
  [/p/g, "п"],
  [/r/g, "р"],
  [/s/g, "с"],
  [/t/g, "т"],
  [/u/g, "у"],
  [/f/g, "ф"],
  [/h/g, "х"],
  [/c/g, "к"],
  [/y/g, "ы"],
  [/w/g, "в"],
  [/x/g, "кс"],
  [/'/g, "ь"],
];

/** Best-effort latin->cyrillic for beginners who type `gde metro`. */
export function transliterateToCyrillic(input: string): string {
  let out = input.toLowerCase();
  for (const [re, cyr] of TRANSLIT_PAIRS) out = out.replace(re, cyr);
  return out;
}

/**
 * Very light Russian stemmer. Only removes common inflectional endings and
 * never touches words shorter than five letters. Both sides of a comparison
 * are stemmed, so aggressive-but-consistent behaviour is fine.
 */
const ENDINGS = [
  "иями",
  "ями",
  "ами",
  "ией",
  "иях",
  "ях",
  "ах",
  "ами",
  "ыми",
  "ими",
  "ого",
  "его",
  "ому",
  "ему",
  "ые",
  "ая",
  "ое",
  "ий",
  "ый",
  "ой",
  "ей",
  "ов",
  "ев",
  "ам",
  "ям",
  "ом",
  "ем",
  "ах",
  "ях",
  "ию",
  "ия",
  "ие",
  "ии",
  "у",
  "ю",
  "а",
  "я",
  "ы",
  "и",
  "е",
  "о",
  "ь",
  "ться",
  "ешь",
  "ишь",
  "ете",
  "ите",
  "ует",
  "уют",
  "ать",
  "ять",
  "ить",
  "еть",
  "ал",
  "ял",
  "ил",
  "ел",
  "ла",
  "ло",
  "ли",
  "л",
];

export function stemRu(word: string): string {
  const w = normalizeRussian(word);
  if (w.length <= 4) return w;
  for (const ending of ENDINGS) {
    if (w.length - ending.length >= 4 && w.endsWith(ending)) {
      return w.slice(0, w.length - ending.length);
    }
  }
  return w;
}

export function tokenizeRu(text: string): string[] {
  const n = normalizeRussian(text);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

/** Fuzzy token equality: exact stem, small typo, or shared stem prefix. */
export function tokenMatches(a: string, b: string): boolean {
  const sa = stemRu(a);
  const sb = stemRu(b);
  if (sa === sb) return true;
  if (sa.length >= 4 && sb.length >= 4 && (sa.startsWith(sb) || sb.startsWith(sa))) return true;
  return similarity(sa, sb) >= 0.78;
}

/** Token-set F1, order independent. */
export function tokenSetScore(aTokens: string[], bTokens: string[]): number {
  if (!aTokens.length || !bTokens.length) return 0;
  const b = [...bTokens];
  let hits = 0;
  for (const token of aTokens) {
    const index = b.findIndex((candidate) => tokenMatches(token, candidate));
    if (index >= 0) {
      hits++;
      b.splice(index, 1);
    }
  }
  return hits / Math.max(aTokens.length, bTokens.length);
}

export function capitalizeRu(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ruinPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Light pronunciation aid shown only if the learner asks for it. */
export function transliterateCyrillic(input: string): string {
  return [...input.toLowerCase()].map((char) => CYR_TO_LAT[char] ?? char).join("");
}
