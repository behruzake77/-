import { describe, expect, it } from "vitest";
import {
  DIALOGUES_BY_ID,
  matchAnswer,
  normalizeRussian,
  stemRu,
  transliterateToCyrillic,
} from "@mir/shared";

const annaSlow = DIALOGUES_BY_ID.lidia_phone.nodes.anna_slow;
const lidiaHelp = DIALOGUES_BY_ID.lidia_phone.nodes.help;
const trial = DIALOGUES_BY_ID.kostya_trial.nodes.repeat;

describe("Russian text utilities", () => {
  it("normalises stress, ё and punctuation", () => {
    expect(normalizeRussian("  Ёлка,   ДОМ! ")).toBe("елка дом");
    expect(normalizeRussian("Где метро?")).toBe("где метро");
  });

  it("stems common inflections symmetrically", () => {
    expect(stemRu("дворе")).toBe(stemRu("двор"));
    expect(stemRu("молока")).toBe(stemRu("молоко"));
  });

  it("transliterates beginner latin input", () => {
    expect(transliterateToCyrillic("gde metro")).toContain("метро");
    expect(transliterateToCyrillic("izvinite mozhno pozvonit")).toBe("извините можно позвонит");
  });
});

describe("semantic answer matcher", () => {
  it("accepts several correct phrasings of the same intention", () => {
    for (const text of ["Я во дворе", "я в дворе", "Двор", "ВО ДВОРЕ"]) {
      const result = matchAnswer(text, annaSlow.options ?? []);
      expect(result.status, text).toBe("accepted");
      expect(result.option?.id).toBe("typed_courtyard");
    }
  });

  it("accepts a different valid intention", () => {
    const result = matchAnswer("Я дома", annaSlow.options ?? []);
    expect(result.status).toBe("accepted");
    expect(result.option?.id).toBe("typed_home");
  });

  it("accepts politeness variations when asking for a phone", () => {
    for (const text of [
      "Извините, можно позвонить?",
      "можно позвонить, пожалуйста",
      "Простите, разрешите позвонить",
    ]) {
      const result = matchAnswer(text, lidiaHelp.options ?? []);
      expect(result.status, text).toBe("accepted");
      expect(result.option?.id).toBe("ask_phone");
    }
  });

  it("prefers the price question when the learner asks about cost", () => {
    const result = matchAnswer("Сколько стоит телефон?", lidiaHelp.options ?? []);
    expect(result.option?.id).toBe("ask_price");
  });

  it("understands latin input and says so gently", () => {
    const result = matchAnswer("izvinite mozhno pozvonit", lidiaHelp.options ?? []);
    expect(result.status).toBe("accepted");
    expect(result.usedTransliteration).toBe(true);
    expect(result.corrections.some((note) => note.en.toLowerCase().includes("latin"))).toBe(true);
  });

  it("tolerates small typos", () => {
    const result = matchAnswer("извените, можна позванить?", lidiaHelp.options ?? []);
    expect(result.status).toBe("accepted");
    expect(result.option?.id).toBe("ask_phone");
  });

  it("accepts orders in any word order", () => {
    const options = trial.options ?? [];
    for (const text of [
      "Капучино и сырники, пожалуйста",
      "сырники и капучино",
      "капчино и сырники",
    ]) {
      const result = matchAnswer(text, options);
      expect(result.status, text).toBe("accepted");
      expect(result.option?.id).toBe("correct_order");
    }
  });

  it("does not accept an unrelated wish", () => {
    const result = matchAnswer("Я хочу спать", trial.options ?? []);
    expect(result.status).toBe("unclear");
  });

  it("is never case or stress sensitive", () => {
    const result = matchAnswer("я во дворе́", annaSlow.options ?? []);
    expect(result.status).toBe("accepted");
  });
});
