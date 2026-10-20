import path from "node:path";

export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
  databaseUrl?: string;
  pgliteDir?: string;
  ai?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  staticDir?: string;
}

export function loadConfig(env = process.env): ServerConfig {
  const dataDir = path.resolve(env.DATA_DIR ?? "./data");
  const apiKey = env.AI_API_KEY?.trim();
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? "0.0.0.0",
    dataDir,
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    pgliteDir: env.PGLITE_DIR ? path.resolve(env.PGLITE_DIR) : path.join(dataDir, "pglite"),
    staticDir: path.resolve(env.STATIC_DIR ?? "dist/client"),
    ai: apiKey
      ? {
          apiKey,
          baseUrl: (env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
          model: env.AI_MODEL ?? "gpt-4o-mini",
        }
      : undefined,
  };
}
