/**
 * Provider-agnostic interpretation layer.
 *
 * The model is only allowed to select one of the authored options for a
 * dialogue node and report confidence. It can never grant items, change
 * quests or unlock locations — the server only uses its answer as a
 * suggestion that the player must confirm.
 */
export interface AiOption {
  id: string;
  ru: string;
  en?: string;
  intent?: string;
}

export interface AiInterpretation {
  optionId: string;
  confidence: number;
  note?: string;
}

export interface AiProvider {
  readonly name: string;
  interpret(input: {
    text: string;
    options: AiOption[];
    context?: string;
  }): Promise<AiInterpretation | null>;
}

interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function createAiProvider(config: AiConfig | undefined): AiProvider | undefined {
  if (!config?.apiKey) return undefined;
  const { apiKey, baseUrl, model } = config;

  return {
    name: `openai-compatible:${model}`,
    async interpret({ text, options, context }) {
      if (!options.length) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 240,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: [
                  "You are a Russian-language interpretation layer inside a beginner language-learning game.",
                  "The learner typed a Russian sentence. Choose which authored answer option expresses their intended meaning.",
                  "Be tolerant of typos, missing case endings, word order and latin transliteration.",
                  "Never invent options, rewards, quests or world changes. Only choose from the provided ids.",
                  "If the meaning does not fit any option, return optionId null.",
                  'Reply with strict JSON: {"optionId": string|null, "confidence": number between 0 and 1, "note": short English note explaining the meaning}.',
                  context ? `Scene context: ${context}` : "",
                ]
                  .filter(Boolean)
                  .join(" "),
              },
              {
                role: "user",
                content: JSON.stringify({
                  learnerText: text,
                  options: options.map((option) => ({
                    id: option.id,
                    russian: option.ru,
                    english: option.en,
                    intent: option.intent,
                  })),
                }),
              },
            ],
          }),
        });
        if (!response.ok) return null;
        const payload = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) return null;
        const parsed = JSON.parse(content.replace(/^```json\s*|```$/g, "").trim()) as {
          optionId?: unknown;
          confidence?: unknown;
          note?: unknown;
        };
        if (typeof parsed.optionId !== "string") return null;
        if (!options.some((option) => option.id === parsed.optionId)) return null;
        const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
        return {
          optionId: parsed.optionId,
          confidence: Math.max(0, Math.min(1, confidence)),
          note: typeof parsed.note === "string" ? parsed.note.slice(0, 240) : undefined,
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
