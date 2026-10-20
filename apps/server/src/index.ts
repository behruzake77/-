import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/index.js";
import { createStore } from "./store.js";
import { createAiProvider } from "./ai/provider.js";
import { assertContentValid } from "@mir/shared";

const config = loadConfig();
assertContentValid();

const database = await createDatabase({
  databaseUrl: config.databaseUrl,
  pgliteDir: config.pgliteDir,
  log: (message) => console.log(`[db] ${message}`),
});

const store = createStore(database.db, database.mode, database.close);
const ai = createAiProvider(config.ai);
const app = await buildApp({
  store,
  ai,
  clientDir: config.staticDir,
  logger: true,
});

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(
    `MIR server on http://${config.host}:${config.port} (${database.mode})${ai ? " · AI layer on" : ""}`,
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await database.close();
    process.exit(0);
  });
}
